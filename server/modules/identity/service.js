// modules/identity/service.js
// OWNING MODULE: identity
// Business logic for identity module. Depends on identity.repository and
// common helpers. Does NOT depend on other business modules.

const bcrypt = require('bcryptjs');
const repo = require('./repository');
const { ValidationError, UnauthorizedError, ConflictError, NotFoundError, ForbiddenError, AppError } = require('../common/errors');
const { writeAudit } = require('../common/audit');
const { validatePhoneForCountry } = require('../common/phone');

const VALID_ROLES = ['admin', 'owner', 'teacher', 'client'];
const VALID_STATUS = ['active', 'suspended', 'pending', 'deleted'];

function mapUser(row) {
  if (!row) return null;
  const role = row.role || 'client';
  const organizationId = row.organization_id || null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role,
    clientKind: row.client_kind || 'unspecified',
    phone: row.phone,
    status: row.status || 'active',
    // Institution affiliation. A teacher who belongs to an institution is staff
    // of that institution (organization_memberships); a teacher with none is the
    // independent freelancer whose profile lives in teacher_profiles. The two are
    // different arrangements and the screen must not blur them.
    organizationId,
    organizationName: row.organization_name || null,
    organizationType: row.organization_type || null,
    organizationVerified: row.organization_verified == null ? null : Boolean(row.organization_verified),
    membershipRole: row.membership_role || null,
    membershipStatus: row.membership_status || null,
    organizationCount: Number(row.organization_count || 0),
    teacherProfileId: row.teacher_profile_id || null,
    teacherProfileStatus: row.teacher_profile_status || null,
    teacherKind: role === 'teacher' ? (organizationId && row.membership_status === 'active' ? 'institutional' : 'freelancer') : null,
    isProtected: Boolean(row.is_protected),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeEmail(email) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new ValidationError('Please provide a valid email address.');
  }
  return email.trim().toLowerCase();
}

function sanitizeName(name) {
  if (typeof name !== 'string' || name.trim().length < 2) {
    throw new ValidationError('Name is required and must be at least 2 characters.');
  }
  return name.trim();
}

function isStrongPassword(p) {
  return typeof p === 'string' &&
    p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[^A-Za-z0-9\s]/.test(p);
}

// The ONE place an account row is created. `role` is a parameter of this
// function, never a body field read off an untrusted caller: public registration
// pins it to 'client' (see registerUser), and only createUserForAdmin — behind
// requireRole('admin') — is allowed to choose. Keeping a single writer is what
// stops the two doors from drifting apart on validation or hashing.
async function createAccount({
  name, email, password, phone, phoneCountryCode, countryIso, profile,
  metadata, actorUserId, role, status, auditAction = 'create',
}) {
  const safeName = sanitizeName(name);
  const safeEmail = sanitizeEmail(email);
  const safeRole = role || 'client';
  if (!VALID_ROLES.includes(safeRole)) throw new ValidationError('Invalid role.');
  if (status !== undefined && !VALID_STATUS.includes(status)) {
    throw new ValidationError('Invalid user status');
  }
  if (!isStrongPassword(password)) {
    throw new ValidationError('Password must be at least 8 characters with at least one capital letter and one symbol.');
  }
  const existing = await repo.findUserByEmail(safeEmail);
  if (existing) throw new AppError('Email already registered.', 409, 'EMAIL_EXISTS');
  let e164 = null;
  if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
    let norm;
    try {
      norm = validatePhoneForCountry(phone, phoneCountryCode, countryIso);
    } catch (err) {
      throw new ValidationError(err.message);
    }
    e164 = norm.e164;
    const existingPhone = await repo.findUserByPhoneNormalized(e164);
    if (existingPhone) throw new AppError('Phone number already registered.', 409, 'PHONE_EXISTS');
  }
  const roleRow = await repo.findRoleByName(safeRole);
  if (!roleRow) throw new ValidationError('Invalid role.');
  const passwordHash = await bcrypt.hash(password, 10);
  // User row + registration profile are created atomically: a profile
  // validation failure must not leave an orphaned account behind.
  const { getClient } = require('../common/pool');
  const client = await getClient();
  let created;
  try {
    await client.query('BEGIN');
    try {
      created = await repo.createUser({
        name: safeName,
        email: safeEmail,
        phone: e164,
        phoneNormalized: e164,
        roleId: roleRow.id,
        passwordHash,
        status,
        metadata,
      }, client);
    } catch (err) {
      // Race-safe: concurrent duplicate inserts hit the DB constraints.
      if (err && err.code === '23505') {
        throw new AppError('Account already registered.', 409, 'ACCOUNT_EXISTS');
      }
      throw err;
    }
    if (profile) {
      await saveRegistrationProfile(created.id, profile, client);
    }
    // Written on the same client so the user row and its audit entry commit together.
    await writeAudit({
      actorUserId: actorUserId || created.id,
      action: auditAction,
      entityType: 'user',
      entityId: String(created.id),
      newValues: { email: safeEmail, role: safeRole },
    }, client);
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* noop */ }
    throw err;
  } finally {
    client.release();
  }
  const full = await repo.findUserById(created.id);
  return mapUser(full);
}

// Public registration. Roles (owner / teacher / admin) are never granted here:
// the role is pinned to 'client' and the `role` body field is ignored on purpose.
// An owner or a teacher arrives through the admin screen or the approval
// workflow, which is where an accountable actor exists.
async function registerUser(args) {
  return createAccount({ ...args, role: 'client' });
}

// Admin-created account. This is the only door that may choose a role, and it
// sits behind requireRole('admin') on the route — see the router.
async function createUserForAdmin(args) {
  return createAccount({ ...args, auditAction: 'create' });
}

// An admin sets or resets a password. Separate from updateUserByAdmin on
// purpose: a password never travels inside a general field patch, so it can
// never be changed by a partial update that forgot to consider it.
async function setUserPassword(userId, password, actorUserId) {
  if (!isStrongPassword(password)) {
    throw new ValidationError('Password must be at least 8 characters with at least one capital letter and one symbol.');
  }
  const existing = await repo.findUserById(userId);
  if (!existing) throw new NotFoundError('User not found');
  const passwordHash = await bcrypt.hash(password, 10);
  await repo.updateUser(userId, { password_hash: passwordHash });
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'password_reset',
    entityType: 'user',
    entityId: String(userId),
  });
  return { success: true };
}

// Validates + stores registration geography on user_profiles.
// Reuses the locations catalog (FKs + parent/child consistency checks).
async function saveRegistrationProfile(userId, profile, client) {
  const { countryCode, governorateId, districtId, phoneCountryCode } = profile || {};
  const mapped = {};
  if (countryCode !== undefined) mapped.country_code = String(countryCode).toUpperCase();
  if (phoneCountryCode !== undefined) mapped.phone_country_code = String(phoneCountryCode).replace(/\D/g, '');
  const locRepo = require('../locations/repository');
  if (countryCode) {
    const country = await locRepo.findCountryByCode(String(countryCode).toUpperCase());
    if (!country || country.is_active === false) throw new ValidationError('Selected country does not exist.');
  }
  let govId = governorateId !== undefined && governorateId !== null && governorateId !== '' ? Number(governorateId) : null;
  let distId = districtId !== undefined && districtId !== null && districtId !== '' ? Number(districtId) : null;
  if (governorateId !== undefined && govId === null) mapped.governorate_id = null;
  if (districtId !== undefined && distId === null) mapped.district_id = null;
  if (govId !== null) {
    const gov = await locRepo.findGovernorateById(govId);
    if (!gov) throw new ValidationError('Selected governorate does not exist.');
    if (countryCode && gov.country_code && gov.country_code !== String(countryCode).toUpperCase()) {
      throw new ValidationError('Selected governorate does not belong to the selected country.');
    }
    mapped.governorate_id = govId;
  }
  if (distId !== null) {
    const dist = await locRepo.findDistrictById(distId);
    if (!dist) throw new ValidationError('Selected district does not exist.');
    if (govId !== null && dist.governorate_id !== govId) {
      throw new ValidationError('Selected district does not belong to the selected governorate.');
    }
    mapped.district_id = distId;
  }
  if (!Object.keys(mapped).length) return null;
  return repo.upsertProfile(userId, mapped, client);
}

// Availability probes for live inline feedback. Always return a plain
// boolean — never leak which account holds the value.
async function checkEmailAvailable(email) {
  let safe;
  try {
    safe = sanitizeEmail(email);
  } catch (err) {
    return { available: false, reason: 'invalid' };
  }
  const existing = await repo.findUserByEmail(safe);
  return { available: !existing };
}

async function checkPhoneAvailable(phone, phoneCountryCode, countryIso) {
  let norm;
  try {
    norm = validatePhoneForCountry(phone, phoneCountryCode, countryIso);
  } catch (err) {
    return { available: false, reason: 'invalid' };
  }
  const existing = await repo.findUserByPhoneNormalized(norm.e164);
  return { available: !existing };
}

async function loginUser({ email, password }) {
  const safeEmail = sanitizeEmail(email);
  if (!password) throw new ValidationError('Password is required.');
  const row = await repo.findUserByEmail(safeEmail);
  if (!row) throw new UnauthorizedError('Invalid credentials');
  const valid = row.password_hash ? await bcrypt.compare(password, row.password_hash) : false;
  if (!valid) {
    await writeAudit({
      action: 'login_failed',
      entityType: 'user',
      entityId: String(row.id),
      newValues: { email: safeEmail, reason: 'invalid_password' },
    });
    throw new UnauthorizedError('Invalid credentials');
  }
  if (row.status && row.status !== 'active') throw new UnauthorizedError('Account is not active');
  await writeAudit({
    actorUserId: row.id,
    action: 'login',
    entityType: 'user',
    entityId: String(row.id),
  });
  return mapUser(row);
}

// Protected system accounts (db/seed-fixed-users.js, users.is_protected) exist
// to be the permanent role fixtures every environment can rely on, so deleting
// one silently breaks logins and the ownership demos. Deletion has two API
// doors and both must be shut: DELETE /api/users/:id, and PATCH /api/users/:id
// with status 'deleted' -- the latter is the same soft delete wearing a hat.
async function assertDeletable(userId) {
  const target = await repo.findUserById(userId);
  if (!target) throw new NotFoundError('User not found');
  if (target.is_protected) {
    throw new ForbiddenError('This is a protected system account and cannot be deleted.');
  }
  if (target.role === 'teacher') {
    throw new ForbiddenError('Teacher deletion must use the verified teacher deletion request workflow.');
  }
  if (target.role === 'owner') {
    const { query } = require('../common/pool');
    const active = await query(`SELECT 1 FROM organization_memberships WHERE user_id=$1
      AND membership_role='owner' AND status='active' LIMIT 1`, [userId]);
    if (active.rows[0]) throw new ForbiddenError('Transfer active institution ownership before deleting this account.');
  }
  return target;
}

async function updateUserByAdmin(userId, { name, email, phone, role, status, institutionType, actorUserId }) {
  if (status === 'deleted') await assertDeletable(userId);

  const current = await repo.findUserById(userId);
  if (!current) throw new NotFoundError('User not found');
  if (current.is_protected && ((status !== undefined && status !== current.status) ||
      (role !== undefined && role !== current.role))) {
    throw new ForbiddenError('Protected system account role and status cannot be changed.');
  }
  if (String(actorUserId) === String(userId) &&
      ((role !== undefined && role !== current.role) ||
       (status !== undefined && status !== current.status))) {
    throw new ForbiddenError('You cannot change your own role or account status.');
  }

  if (status && !VALID_STATUS.includes(status)) throw new ValidationError('Invalid user status');
  const fields = {};
  if (name !== undefined) fields.name = sanitizeName(name);
  if (email !== undefined) fields.email = sanitizeEmail(email);
  if (phone !== undefined) fields.phone = phone;
  if (status !== undefined) fields.status = status;
  if (institutionType !== undefined) {
    const existing = await repo.findUserById(userId);
    const metadata = { ...(existing && existing.metadata ? existing.metadata : {}), institutionType };
    fields.metadata = metadata;
  }
  let roleRow = null;
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) throw new ValidationError('Invalid role');
    roleRow = await repo.findRoleByName(role);
    if (!roleRow) throw new ValidationError('Invalid role');
    fields.role_id = roleRow.id;
  }
  if (!Object.keys(fields).length) throw new ValidationError('No editable fields supplied');
  const updated = await repo.updateUser(userId, fields);
  if (!updated) throw new NotFoundError('User not found');
  const full = await repo.findUserById(userId);
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'update',
    entityType: 'user',
    entityId: String(userId),
    newValues: { fields: Object.keys(fields) },
  });
  if (status !== undefined && status !== 'active') {
    require('./auth').revokeUserSessions(userId);
  }
  return mapUser(full);
}

async function deleteUser(userId, actorUserId) {
  if (String(userId) === String(actorUserId)) throw new ForbiddenError('You cannot delete your own account.');
  await assertDeletable(userId);
  const deleted = await repo.softDeleteUser(userId);
  if (!deleted) throw new NotFoundError('User not found');
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'delete',
    entityType: 'user',
    entityId: String(userId),
  });
  require('./auth').revokeUserSessions(userId);
  return { success: true };
}

async function listUsers(filters) {
  const rows = await repo.listUsers(filters);
  const total = await repo.countUsers(filters);
  return { items: rows.map(mapUser), total };
}

async function getUserByAdmin(userId) {
  const row = await repo.findUserWithAffiliationById(userId);
  if (!row) throw new NotFoundError('User not found');
  return mapUser(row);
}

async function getProfile(userId) {
  return repo.findProfile(userId);
}

async function upsertProfile(userId, fields) {
  const allowed = ['fullName', 'avatarUrl', 'bio', 'gender', 'preferredLanguage', 'phoneAlt', 'timezone', 'metadata', 'countryCode', 'governorateId', 'districtId', 'phoneCountryCode'];
  const mapped = {};
  if (fields.fullName !== undefined) mapped.full_name = fields.fullName;
  if (fields.avatarUrl !== undefined) mapped.avatar_url = fields.avatarUrl;
  if (fields.bio !== undefined) mapped.bio = fields.bio;
  if (fields.gender !== undefined) mapped.gender = fields.gender;
  if (fields.preferredLanguage !== undefined) mapped.preferred_language = fields.preferredLanguage;
  if (fields.phoneAlt !== undefined) mapped.phone_alt = fields.phoneAlt;
  if (fields.timezone !== undefined) mapped.timezone = fields.timezone;
  if (fields.metadata !== undefined) mapped.metadata = fields.metadata;
  if (fields.countryCode !== undefined) mapped.country_code = fields.countryCode;
  if (fields.governorateId !== undefined) mapped.governorate_id = fields.governorateId;
  if (fields.districtId !== undefined) mapped.district_id = fields.districtId;
  if (fields.phoneCountryCode !== undefined) mapped.phone_country_code = fields.phoneCountryCode;
  if (!Object.keys(mapped).length) throw new ValidationError('No editable fields supplied');
  return repo.upsertProfile(userId, mapped);
}

// ---------- RBAC ----------
async function listRoles() {
  return repo.listRoles();
}

async function listPermissions() {
  return repo.listPermissions();
}

async function grantPermissionToRole(roleId, { module, action, actorUserId }) {
  if (!module || !action) throw new ValidationError('module and action are required.');
  const role = await repo.findRoleByRoleId(roleId);
  if (!role) throw new NotFoundError('Role not found');
  const permission = await repo.findPermission(module, action);
  if (!permission) throw new NotFoundError('Permission not found in the catalog');
  const actorDecision = await repo.permissionDecision(actorUserId, module, action, null);
  if (!actorDecision.rows[0].allowed)
    throw new ForbiddenError('You cannot grant a permission you do not hold');
  const { getClient } = require('../common/pool');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(`INSERT INTO role_permissions (role_id, permission_id)
      VALUES ($1,$2) ON CONFLICT (role_id, permission_id) DO NOTHING RETURNING id`, [roleId, permission.id]);
    if (inserted.rowCount) await writeAudit({ actorUserId, action: 'grant', entityType: 'role_permission',
      entityId: String(permission.id), newValues: { role_id: roleId, module, action } }, client);
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; }
  finally { client.release(); }
  return { roleId, permission };
}

async function revokePermissionFromRole(roleId, permissionId, actorUserId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(permissionId)))
    throw new ValidationError('Invalid permission id');
  const role = await repo.findRoleByRoleId(roleId);
  if (!role) throw new NotFoundError('Role not found');
  if (role.name === 'admin') throw new ForbiddenError('The platform administrator role is protected');
  const { getClient } = require('../common/pool');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const deleted = await client.query(`DELETE FROM role_permissions WHERE role_id=$1 AND permission_id=$2 RETURNING id`,
      [roleId, permissionId]);
    if (!deleted.rowCount) throw new NotFoundError('Permission grant not found');
    await writeAudit({ actorUserId, action: 'revoke', entityType: 'role_permission',
      entityId: String(permissionId), newValues: { role_id: roleId } }, client);
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; }
  finally { client.release(); }
  return { success: true };
}

async function listRolePermissions(roleId) {
  const role = await repo.findRoleByRoleId(roleId);
  if (!role) throw new NotFoundError('Role not found');
  return repo.listRolePermissions(roleId);
}

module.exports = {
  getUserByAdmin,
  registerUser,
  saveRegistrationProfile,
  checkEmailAvailable,
  checkPhoneAvailable,
  loginUser,
  updateUserByAdmin,
  deleteUser,
  listUsers,
  getProfile,
  upsertProfile,
  listRoles,
  listPermissions,
  grantPermissionToRole,
  revokePermissionFromRole,
  listRolePermissions,
  mapUser,
};
