// modules/identity/repository.js
// OWNING MODULE: identity
// Data access for users, roles, permissions, role_permissions, user_profiles.
// Table ownership: users, roles, permissions, role_permissions, user_profiles
// Dependent on: locations (via user_profiles.location refs are deferred)

const { query } = require('../common/pool');

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

async function listUsers({ role, status, search, limit = 100, offset = 0 } = {}) {
  const conditions = [];
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
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);
  params.push(offset);
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role_id, u.status,
            u.created_at, u.updated_at,
            r.name AS role
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function countUsers({ role, status, search } = {}) {
  const conditions = [];
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
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count
     FROM users u
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
    `UPDATE users SET status = 'deleted', deleted_at = now(), updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
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
            COUNT(rp.id)::int AS permission_count
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     GROUP BY r.id
     ORDER BY r.id`
  );
  return rows;
}

// ---------- permissions ----------
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
  listRoles,
  listPermissions,
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