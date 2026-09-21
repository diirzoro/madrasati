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
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || 'client',
    phone: row.phone,
    status: row.status || 'active',
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

async function registerUser({ name, email, password, phone, phoneCountryCode, countryIso, profile, metadata, actorUserId }) {
  const safeName = sanitizeName(name);
  const safeEmail = sanitizeEmail(email);
  // Public registration ALWAYS creates a plain client. Roles (owner/admin)
  // are granted only through admin action or the ownership-approval workflow.
  // The `role` body field is intentionally ignored here — never trust it.
  const safeRole = 'client';
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
      action: 'create',
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

// Validates + stores registration geography on user_profiles.
// Reuses the locations catalog (FKs + parent/child consistency checks).
async function saveRegistrationProfile(userId, profile, client) {
  const { countryCode, governorateId, districtId, phoneCountryCode } = profile || {};
  const mapped = {};
  if (countryCode !== undefined) mapped.country_code = String(countryCode).toUpperCase();
  if (phoneCountryCode !== undefined) mapped.phone_country_code = String(phoneCountryCode).replace(/\D/g, '');
  const locRepo = require('../locations/repository');
  let govId = governorateId !== undefined && governorateId !== null && governorateId !== '' ? Number(governorateId) : null;
  let distId = districtId !== undefined && districtId !== null && districtId !== '' ? Number(districtId) : null;
  if (govId !== null) {
    const gov = await locRepo.findGovernorateById(govId);
    if (!gov) throw new ValidationError('Selected governorate does not exist.');
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
  return target;
}

async function updateUserByAdmin(userId, { name, email, phone, role, status, institutionType, actorUserId }) {
  if (status === 'deleted') await assertDeletable(userId);

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
  return mapUser(full);
}

async function deleteUser(userId, actorUserId) {
  await assertDeletable(userId);
  const deleted = await repo.softDeleteUser(userId);
  if (!deleted) throw new NotFoundError('User not found');
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'delete',
    entityType: 'user',
    entityId: String(userId),
  });
  return { success: true };
}

async function listUsers(filters) {
  const rows = await repo.listUsers(filters);
  const total = await repo.countUsers(filters);
  return { items: rows.map(mapUser), total };
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

async function grantPermissionToRole(roleId, { module, action, description }) {
  if (!module || !action) throw new ValidationError('module and action are required.');
  const role = await repo.findRoleByRoleId(roleId);
  if (!role) throw new NotFoundError('Role not found');
  const permission = await repo.createPermission({ module, action, description });
  await repo.createRolePermission(roleId, permission.id);
  await writeAudit({ action: 'grant', entityType: 'role_permission', entityId: String(permission.id), newValues: { role_id: roleId, module, action } });
  return { roleId, permission };
}

async function revokePermissionFromRole(roleId, permissionId) {
  const deleted = await repo.deleteRolePermission(roleId, permissionId);
  if (!deleted) throw new NotFoundError('Permission grant not found');
  await writeAudit({ action: 'revoke', entityType: 'role_permission', entityId: String(permissionId), newValues: { role_id: roleId } });
  return { success: true };
}

async function listRolePermissions(roleId) {
  const role = await repo.findRoleByRoleId(roleId);
  if (!role) throw new NotFoundError('Role not found');
  return repo.listRolePermissions(roleId);
}

module.exports = {
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