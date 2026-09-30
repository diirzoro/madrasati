// modules/identity/repository.js
// OWNING MODULE: identity
// Data access for users, roles, permissions, role_permissions, user_profiles.
// Table ownership: users, roles, permissions, role_permissions, user_profiles
// Dependent on: locations (via user_profiles.location refs are deferred)

const { query, getClient } = require('../common/pool');

// ---------- users ----------
async function findUserById(id) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role_id, u.status, u.password_hash,
            u.metadata, u.is_protected, u.created_at, u.updated_at, u.deleted_at,
            r.name AS role
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role_id, u.status, u.password_hash,
            u.metadata, u.created_at, u.updated_at, u.deleted_at,
            r.name AS role
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );
  return rows[0] || null;
}

async function findUserByPhone(phone) {
  if (!phone) return null;
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone
     FROM users u
     WHERE u.phone = $1 AND u.deleted_at IS NULL`,
    [phone]
  );
  return rows[0] || null;
}

// Normalized-phone lookup across ALL live statuses (active/pending/
// suspended). Only soft-deleted rows are excluded so a deleted account's
// number can be recycled while every live account blocks duplicates.
async function findUserByPhoneNormalized(e164) {
  if (!e164) return null;
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.status
     FROM users u
     WHERE u.phone_normalized = $1 AND u.deleted_at IS NULL`,
    [e164]
  );
  return rows[0] || null;
}

// Every user row carries the institution it belongs to, because "which school's
// staff is this?" is the first question the admin list has to answer. The primary
// membership is the one an admin should see: an active membership wins over a
// suspended one, and the earliest join breaks the tie, so the column is stable
// across reloads instead of flickering between two memberships.
const AFFILIATION_JOIN = `
  LEFT JOIN LATERAL (
    SELECT m.organization_id, m.membership_role, m.status, m.joined_at
    FROM organization_memberships m
    WHERE m.user_id = u.id AND m.status='active' AND m.archived_at IS NULL
    ORDER BY m.joined_at, m.id
    LIMIT 1
  ) mem ON true
   LEFT JOIN organizations o ON o.id = mem.organization_id AND o.deleted_at IS NULL`;
const AFFILIATION_COLUMNS = `
  mem.organization_id AS organization_id,
  mem.membership_role AS membership_role,
  mem.status AS membership_status,
  o.name AS organization_name,
  o.type AS organization_type,
  o.verified AS organization_verified,
  (SELECT COUNT(*)::int FROM organization_memberships m2
    WHERE m2.user_id=u.id AND m2.status='active' AND m2.archived_at IS NULL) AS organization_count`;

async function findUserWithAffiliationById(id) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role_id, u.status, u.is_protected,
            u.created_at, u.updated_at, cp.client_kind, tp.id AS teacher_profile_id,
            tp.profile_status AS teacher_profile_status, r.name AS role,
            ${AFFILIATION_COLUMNS}
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN client_profiles cp ON cp.user_id=u.id
     LEFT JOIN teacher_profiles tp ON tp.user_id=u.id AND tp.deleted_at IS NULL
     ${AFFILIATION_JOIN}
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
}

async function listUsers({ role, status, search, organizationId, limit = 100, offset = 0 } = {}) {
  const { where, params } = buildUserFilters({ role, status, search, organizationId });
  params.push(limit);
  params.push(offset);
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role_id, u.status, u.is_protected,
            u.created_at, u.updated_at, cp.client_kind,
            tp.id AS teacher_profile_id, tp.profile_status AS teacher_profile_status,
            r.name AS role,
            ${AFFILIATION_COLUMNS}
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN client_profiles cp ON cp.user_id = u.id
     LEFT JOIN teacher_profiles tp ON tp.user_id=u.id AND tp.deleted_at IS NULL
     ${AFFILIATION_JOIN}
     ${where}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

// Shared by listUsers and countUsers so a filtered list and its total can never
// describe different sets of rows.
function buildUserFilters({ role, status, search, organizationId } = {}) {
  const conditions = ['u.deleted_at IS NULL'];
  const params = [];
  if (role) {
    params.push(role);
    conditions.push(`r.name = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`u.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (organizationId) {
    params.push(organizationId);
    conditions.push(`EXISTS (SELECT 1 FROM organization_memberships mx
                              WHERE mx.user_id = u.id AND mx.organization_id = $${params.length})`);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function countUsers({ role, status, search, organizationId } = {}) {
  const { where, params } = buildUserFilters({ role, status, search, organizationId });
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     ${where}`,
    params
  );
  return rows[0].count;
}

async function createUser({ name, email, phone, phoneNormalized, roleId, passwordHash, metadata }, client) {
  const q = client ? client.query.bind(client) : query;
  const { rows } = await q(
    `INSERT INTO users (name, email, phone, phone_normalized, role_id, password_hash, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, email, phone, status, created_at, updated_at`,
    [name, email, phone || null, phoneNormalized || null, roleId, passwordHash || null, metadata ? JSON.stringify(metadata) : null]
  );
  return rows[0];
}

async function updateUser(id, fields) {
  const allowed = ['name', 'email', 'phone', 'phone_normalized', 'role_id', 'status', 'metadata'];
  const keys = allowed.filter((k) => fields[k] !== undefined);
  if (!keys.length) return null;
  const assignments = keys
    .map((k, i) => (k === 'metadata' ? `metadata = $${i + 1}` : `${k} = $${i + 1}`))
    .join(', ');
  const values = keys.map((k) =>
    k === 'metadata' && fields[k] ? JSON.stringify(fields[k]) : fields[k]
  );
  const { rows } = await query(
    `UPDATE users SET ${assignments}, updated_at = now() WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  return rows[0] || null;
}

async function softDeleteUser(id) {
  const { rows } = await query(
    `WITH target AS (
       UPDATE users SET status='deleted', deleted_at=now(), updated_at=now()
       WHERE id=$1 AND deleted_at IS NULL RETURNING id
     ), archived AS (
       UPDATE organization_memberships SET status='inactive', archived_at=now(), updated_at=now()
       WHERE user_id IN (SELECT id FROM target) AND archived_at IS NULL RETURNING id
     ) SELECT id FROM target`,
    [id]
  );
  return rows[0] || null;
}

// ---------- roles ----------
async function findRoleByName(name) {
  const { rows } = await query(`SELECT id, name, description FROM roles WHERE name = $1`, [name]);
  return rows[0] || null;
}

async function findRoleByRoleId(id) {
  const { rows } = await query(`SELECT id, name, description FROM roles WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function listRoles() {
  const { rows } = await query(
    `SELECT r.id, r.name, r.description,
            COUNT(rp.id)::int AS permission_count,
            (SELECT COUNT(*)::int FROM users u WHERE u.role_id=r.id AND u.deleted_at IS NULL) AS user_count
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     GROUP BY r.id
     ORDER BY r.id`
  );
  return rows;
}

// ---------- permissions ----------
async function permissionDecision(userId, module, action, organizationId) {
  return query(`SELECT (
    NOT EXISTS (
      SELECT 1 FROM user_permission_overrides o JOIN permissions p ON p.id=o.permission_id
      WHERE o.user_id=$1 AND p.module=$2 AND p.action=$3 AND o.effect='deny'
        AND (o.organization_id IS NULL OR o.organization_id=$4)
    ) AND (
      EXISTS (
        SELECT 1 FROM users u JOIN role_permissions rp ON rp.role_id=u.role_id
        JOIN permissions p ON p.id=rp.permission_id
        WHERE u.id=$1 AND u.status='active' AND u.deleted_at IS NULL
          AND p.module=$2 AND p.action=$3
      ) OR EXISTS (
        SELECT 1 FROM user_permission_overrides o JOIN permissions p ON p.id=o.permission_id
        WHERE o.user_id=$1 AND p.module=$2 AND p.action=$3 AND o.effect='grant'
          AND (o.organization_id IS NULL OR o.organization_id=$4)
      )
    )
  ) AS allowed`, [userId, module, action, organizationId]);
}
async function listPermissions() {
  const { rows } = await query(`SELECT id, module, action, description FROM permissions ORDER BY module, action`);
  return rows;
}

async function findPermission(module, action) {
  const { rows } = await query(`SELECT id, module, action, description FROM permissions WHERE module = $1 AND action = $2`, [module, action]);
  return rows[0] || null;
}

async function createPermission({ module, action, description }) {
  const { rows } = await query(
    `INSERT INTO permissions (module, action, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (module, action) DO UPDATE SET description = EXCLUDED.description
     RETURNING id, module, action, description`,
    [module, action, description || null]
  );
  return rows[0];
}

async function findRolePermission(roleId, permissionId) {
  const { rows } = await query(
    `SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2`,
    [roleId, permissionId]
  );
  return rows[0] || null;
}

async function createRolePermission(roleId, permissionId) {
  const { rows } = await query(
    `INSERT INTO role_permissions (role_id, permission_id)
     VALUES ($1, $2)
     ON CONFLICT (role_id, permission_id) DO NOTHING
     RETURNING id`,
    [roleId, permissionId]
  );
  return rows[0] || null;
}

async function deleteRolePermission(roleId, permissionId) {
  const { rows } = await query(
    `DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2 RETURNING id`,
    [roleId, permissionId]
  );
  return rows[0] || null;
}

async function listRolePermissions(roleId) {
  const { rows } = await query(
    `SELECT p.id, p.module, p.action, p.description
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = $1
     ORDER BY p.module, p.action`,
    [roleId]
  );
  return rows;
}

async function listPermissionsForRoles(roles) {
  if (!roles || !roles.length) return [];
  const { rows } = await query(
    `SELECT p.id, p.module, p.action
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     JOIN roles r ON r.id = rp.role_id
     WHERE r.name = ANY($1)
     ORDER BY p.module, p.action`,
    [roles]
  );
  return rows;
}

// ---------- roles ----------
// A role is editable metadata plus its permission set. Whether a role may be
// deleted is a business decision (it may still carry users, or the middleware
// may depend on it), so the repository only reports what is attached and
// performs the write; the service refuses and explains.
async function findRoleById(roleId) {
  const { rows } = await query(
    `SELECT id, name, description FROM roles WHERE id = $1`,
    [roleId]
  );
  return rows[0] || null;
}

async function createRole({ name, description }) {
  const { rows } = await query(
    `INSERT INTO roles (name, description) VALUES ($1, $2)
     RETURNING id, name, description`,
    [name, description || null]
  );
  return rows[0];
}

async function updateRole(roleId, fields) {
  const allowed = ['name', 'description'];
  const keys = allowed.filter((k) => fields[k] !== undefined);
  if (!keys.length) return findRoleById(roleId);
  const assignments = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => fields[k]);
  const { rows } = await query(
    `UPDATE roles SET ${assignments} WHERE id = $${keys.length + 1}
     RETURNING id, name, description`,
    [...values, roleId]
  );
  return rows[0] || null;
}

async function deleteRole(roleId) {
  const { rows } = await query(`DELETE FROM roles WHERE id = $1 RETURNING id`, [roleId]);
  return rows[0] || null;
}

async function countUsersInRole(roleId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM users WHERE role_id = $1 AND deleted_at IS NULL`,
    [roleId]
  );
  return rows[0] ? rows[0].count : 0;
}

// Replacing the whole matrix in one transaction. The screen saves a grid, not a
// stream of one-by-one grants, so a half-applied matrix is never observable.
async function replaceRolePermissions(roleId, permissionIds) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
    for (const permissionId of permissionIds) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [roleId, permissionId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  return listRolePermissions(roleId);
}

// ---------- app_sections ----------
// The section/page registry «المستخدمون والصلاحيات» edits. The navigation reads
// is_visible and the route guard reads is_enabled, so a switch here is a real
// control rather than a cosmetic one.
function sectionFilters({ scope, search, enabledOnly } = {}) {
  const where = [];
  const params = [];
  if (scope) {
    params.push(scope);
    where.push(`scope = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(section_key ILIKE $${params.length} OR title_ar ILIKE $${params.length} OR title_en ILIKE $${params.length})`
    );
  }
  if (enabledOnly) where.push(`is_enabled = TRUE AND is_visible = TRUE`);
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

const SECTION_SORTS = {
  order: 'sort_order ASC, title_ar ASC',
  key: 'section_key ASC',
  title: 'title_ar ASC',
  scope: 'scope ASC, sort_order ASC',
};

async function listSections(filters = {}) {
  const { clause, params } = sectionFilters(filters);
  const order = SECTION_SORTS[filters.sort] || SECTION_SORTS.order;
  const { rows } = await query(
    `SELECT id, section_key, scope, route, title_ar, title_en, description_ar,
            description_en, icon, parent_key, sort_order, is_visible, is_enabled,
            requires_role, is_system, created_at, updated_at
     FROM app_sections ${clause} ORDER BY ${order}`,
    params
  );
  return rows;
}

async function countSections(filters = {}) {
  const { clause, params } = sectionFilters(filters);
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM app_sections ${clause}`,
    params
  );
  return rows[0] ? rows[0].count : 0;
}

async function findSectionById(id) {
  const { rows } = await query(`SELECT * FROM app_sections WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findSectionByKey(key) {
  const { rows } = await query(`SELECT * FROM app_sections WHERE section_key = $1`, [key]);
  return rows[0] || null;
}

async function createSection(fields) {
  const allowed = [
    'section_key', 'scope', 'route', 'title_ar', 'title_en', 'description_ar',
    'description_en', 'icon', 'parent_key', 'sort_order', 'is_visible',
    'is_enabled', 'requires_role', 'is_system',
  ];
  const keys = allowed.filter((k) => fields[k] !== undefined);
  const columns = keys.join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map((k) => (typeof fields[k] === 'boolean' ? fields[k] : fields[k]));
  const { rows } = await query(
    `INSERT INTO app_sections (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0];
}

async function updateSection(id, fields) {
  const allowed = [
    'route', 'title_ar', 'title_en', 'description_ar', 'description_en', 'icon',
    'parent_key', 'sort_order', 'is_visible', 'is_enabled', 'requires_role',
  ];
  const keys = allowed.filter((k) => fields[k] !== undefined);
  if (!keys.length) return findSectionById(id);
  const assignments = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => fields[k]);
  const { rows } = await query(
    `UPDATE app_sections SET ${assignments}, updated_at = now() WHERE id = $${keys.length + 1}
     RETURNING *`,
    [...values, id]
  );
  return rows[0] || null;
}

async function deleteSection(id) {
  const { rows } = await query(`DELETE FROM app_sections WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

// One row per section in the order the caller sent, so a drag in the table is a
// single write instead of N updates that could land out of order.
async function reorderSections(orderedIds) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i += 1) {
      await client.query(
        `UPDATE app_sections SET sort_order = $1, updated_at = now() WHERE id = $2`,
        [(i + 1) * 10, orderedIds[i]]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  return listSections({});
}

// ---------- user_profiles ----------
async function findProfile(userId) {
  const { rows } = await query(`SELECT * FROM user_profiles WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

async function upsertProfile(userId, fields, client) {
  const q = client ? client.query.bind(client) : query;
  const existing = client
    ? (await q(`SELECT * FROM user_profiles WHERE user_id = $1`, [userId])).rows[0]
    : await findProfile(userId);
  const allowed = ['full_name', 'avatar_url', 'bio', 'gender', 'preferred_language', 'phone_alt', 'timezone', 'metadata', 'country_code', 'governorate_id', 'district_id', 'phone_country_code'];
  if (existing) {
    const keys = allowed.filter((k) => fields[k] !== undefined);
    if (!keys.length) return existing;
    const assignments = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = keys.map((k) =>
      (k === 'metadata' && fields[k] ? JSON.stringify(fields[k]) : fields[k])
    );
    const { rows } = await q(
      `UPDATE user_profiles SET ${assignments}, updated_at = now() WHERE user_id = $${keys.length + 1} RETURNING *`,
      [...values, userId]
    );
    return rows[0];
  }
  const keys = allowed.filter((k) => fields[k] !== undefined);
  const values = keys.map((k) =>
    (k === 'metadata' && fields[k] ? JSON.stringify(fields[k]) : fields[k])
  );
  const columns = keys.length ? keys.join(', ') : 'user_id, updated_at';
  const placeholders = keys.map((_, i) => `$${i + 2}`).join(', ') || 'now()';
  const { rows } = await q(
    `INSERT INTO user_profiles (user_id, ${columns})
     VALUES ($1, ${keys.length ? placeholders : 'now()'})
     RETURNING *`,
    [userId, ...values]
  );
  return rows[0];
}

// ---------- pending registrations ----------
async function createPendingRegistration({ name, email, phone, roleRequested, payload }) {
  const { rows } = await query(
    `INSERT INTO pending_registrations (name, email, phone, role_requested, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, phone, role_requested, created_at`,
    [name || null, email || null, phone || null, roleRequested || null, payload ? JSON.stringify(payload) : null]
  );
  return rows[0];
}

module.exports = {
  findUserWithAffiliationById,
  findUserById,
  findUserByEmail,
  findUserByPhone,
  findUserByPhoneNormalized,
  listUsers,
  countUsers,
  createUser,
  updateUser,
  softDeleteUser,
  findRoleByName,
  findRoleByRoleId,
  findRoleById,
  createRole,
  updateRole,
  deleteRole,
  countUsersInRole,
  replaceRolePermissions,
  listRoles,
  listSections,
  countSections,
  findSectionById,
  findSectionByKey,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  listPermissions,
  permissionDecision,
  findPermission,
  createPermission,
  findRolePermission,
  createRolePermission,
  deleteRolePermission,
  listRolePermissions,
  listPermissionsForRoles,
  findProfile,
  upsertProfile,
  createPendingRegistration,
};
