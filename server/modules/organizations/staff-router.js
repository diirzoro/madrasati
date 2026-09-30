// Tenant-scoped staff directory. Job role describes the institution assignment;
// it never changes the account's platform role or grants platform permissions.
const { Router } = require('express');
const { query, getClient } = require('../common/pool');
const { asyncHandler } = require('../common/http');
const { writeAudit } = require('../common/audit');
const { requireAuth, requireRole, requireOrgMember } = require('../identity/auth');
const { ValidationError, NotFoundError, ForbiddenError } = require('../common/errors');
const orgRepo = require('./repository');

const router = Router({ mergeParams: true });
router.use(requireAuth, requireOrgMember('id'), requireRole('admin', 'owner'));
const rolePattern = /^[a-z][a-z0-9_]{1,39}$/;
const statuses = ['active', 'pending', 'suspended', 'inactive'];
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
const textField = (value, max) => {
  if (value == null || String(value).trim() === '') return null;
  const result = String(value).trim();
  if (result.length > max) throw new ValidationError(`Field exceeds ${max} characters`);
  return result;
};
async function checkOwner(req) {
  if (req.user.role !== 'admin' && !(await orgRepo.isOrganizationOwner(req.user.id, req.params.id)))
    throw new NotFoundError('Organization not found');
}
function checkRole(role) {
  if (!rolePattern.test(String(role || '')) || role === 'owner' || role === 'admin')
    throw new ValidationError('Invalid staff role');
  return role;
}
async function lockedMembership(client, orgId, userId) {
  const { rows } = await client.query(`SELECT m.*, u.name, u.email, u.status AS user_status,
    u.is_protected FROM organization_memberships m JOIN users u ON u.id=m.user_id
    WHERE m.organization_id=$1 AND m.user_id=$2 FOR UPDATE OF m`, [orgId, userId]);
  const row = rows[0];
  if (!row) throw new NotFoundError('Staff member not found');
  if (row.membership_role === 'owner' || row.is_protected)
    throw new ForbiddenError('Protected or owner membership cannot be changed here');
  return row;
}
async function transaction(work) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

router.get('/', asyncHandler(async (req, res) => {
  await checkOwner(req);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const search = String(req.query.search || '').trim().slice(0, 100);
  const { rows } = await query(`SELECT m.id, m.user_id AS "userId", u.name, u.email,
    u.status AS "accountStatus", m.membership_role AS "role", m.status,
    m.department, m.job_title AS "jobTitle", m.joined_at AS "joinedAt",
    m.updated_at AS "updatedAt", m.archived_at AS "archivedAt"
    FROM organization_memberships m JOIN users u ON u.id=m.user_id
    WHERE m.organization_id=$1 AND m.membership_role <> 'owner'
      AND ($2='' OR u.name ILIKE '%'||$2||'%' OR u.email ILIKE '%'||$2||'%')
    ORDER BY (m.archived_at IS NOT NULL), m.joined_at DESC, m.id DESC
    LIMIT $3 OFFSET $4`, [req.params.id, search, limit, offset]);
  const count = await query(`SELECT COUNT(*)::int AS total FROM organization_memberships m
    JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1
    AND m.membership_role <> 'owner'
    AND ($2='' OR u.name ILIKE '%'||$2||'%' OR u.email ILIKE '%'||$2||'%')`, [req.params.id, search]);
  res.json({ items: rows, total: count.rows[0].total });
}));

router.get('/:userId', asyncHandler(async (req, res) => {
  await checkOwner(req);
  if (!uuid(req.params.userId)) throw new ValidationError('Invalid user id');
  const { rows } = await query(`SELECT m.id, m.user_id AS "userId", u.name, u.email,
    u.status AS "accountStatus", m.membership_role AS "role", m.status,
    m.department, m.job_title AS "jobTitle", m.archived_at AS "archivedAt"
    FROM organization_memberships m JOIN users u ON u.id=m.user_id
    WHERE m.organization_id=$1 AND m.user_id=$2 AND m.membership_role <> 'owner'`,
  [req.params.id, req.params.userId]);
  if (!rows[0]) throw new NotFoundError('Staff member not found');
  res.json(rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  await checkOwner(req);
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Valid registered email required');
  const role = checkRole(req.body.role);
  const status = req.body.status || 'active';
  if (!statuses.includes(status)) throw new ValidationError('Invalid staff status');
  const department = textField(req.body.department, 100);
  const jobTitle = textField(req.body.jobTitle, 120);
  const result = await transaction(async client => {
    const found = await client.query(`SELECT u.id, u.role_id, u.status, u.is_protected,
      r.name AS platform_role FROM users u JOIN roles r ON r.id=u.role_id
      WHERE lower(u.email)=$1 AND u.deleted_at IS NULL FOR UPDATE OF u`, [email]);
    const user = found.rows[0];
    if (!user) throw new NotFoundError('Registered user not found');
    if (user.is_protected || user.platform_role === 'admin' ||
        user.status !== 'active' || user.id === req.user.id)
      throw new ForbiddenError('This account cannot be assigned as staff');
    const existing = await client.query(`SELECT * FROM organization_memberships
      WHERE user_id=$1 AND organization_id=$2 FOR UPDATE`, [user.id, req.params.id]);
    if (existing.rows[0] && existing.rows[0].membership_role === 'owner')
      throw new ForbiddenError('Owner membership cannot be replaced by staff');
    if (existing.rows[0] && !existing.rows[0].archived_at)
      throw new ValidationError('User already belongs to this organization');
    const saved = await client.query(`INSERT INTO organization_memberships
      (user_id, organization_id, membership_role, status, department, job_title)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (user_id, organization_id) DO UPDATE SET
        membership_role=EXCLUDED.membership_role, status=EXCLUDED.status,
        department=EXCLUDED.department, job_title=EXCLUDED.job_title,
        archived_at=NULL, archived_by_user_id=NULL, updated_at=now()
      RETURNING *`, [user.id, req.params.id, role, status, department, jobTitle]);
    await writeAudit({ actorUserId: req.user.id, action: existing.rows[0] ? 'staff_restored' : 'staff_added',
      entityType: 'organization_membership', entityId: String(saved.rows[0].id),
      organizationId: req.params.id, newValues: { userId: user.id, role, status, department, jobTitle } }, client);
    return saved.rows[0];
  });
  res.status(201).json(result);
}));

router.patch('/:userId', asyncHandler(async (req, res) => {
  await checkOwner(req);
  if (!uuid(req.params.userId)) throw new ValidationError('Invalid user id');
  const role = req.body.role === undefined ? undefined : checkRole(req.body.role);
  const status = req.body.status;
  if (status !== undefined && !statuses.includes(status)) throw new ValidationError('Invalid staff status');
  const department = req.body.department === undefined ? undefined : textField(req.body.department, 100);
  const jobTitle = req.body.jobTitle === undefined ? undefined : textField(req.body.jobTitle, 120);
  const result = await transaction(async client => {
    const old = await lockedMembership(client, req.params.id, req.params.userId);
    if (old.archived_at) throw new ValidationError('Restore archived staff using Add staff');
    const saved = await client.query(`UPDATE organization_memberships SET
      membership_role=$3, status=$4, department=$5, job_title=$6, updated_at=now()
      WHERE organization_id=$1 AND user_id=$2 RETURNING *`, [req.params.id, req.params.userId,
      role === undefined ? old.membership_role : role,
      status === undefined ? old.status : status,
      department === undefined ? old.department : department,
      jobTitle === undefined ? old.job_title : jobTitle]);
    await writeAudit({ actorUserId: req.user.id, action: 'staff_changed',
      entityType: 'organization_membership', entityId: String(old.id), organizationId: req.params.id,
      oldValues: { role: old.membership_role, status: old.status, department: old.department, jobTitle: old.job_title },
      newValues: { role: saved.rows[0].membership_role, status: saved.rows[0].status,
        department: saved.rows[0].department, jobTitle: saved.rows[0].job_title } }, client);
    return saved.rows[0];
  });
  res.json(result);
}));

router.delete('/:userId', asyncHandler(async (req, res) => {
  await checkOwner(req);
  if (!uuid(req.params.userId)) throw new ValidationError('Invalid user id');
  const result = await transaction(async client => {
    const old = await lockedMembership(client, req.params.id, req.params.userId);
    if (old.archived_at) throw new ValidationError('Staff member already archived');
    const saved = await client.query(`UPDATE organization_memberships SET status='inactive',
      archived_at=now(), archived_by_user_id=$3, updated_at=now()
      WHERE organization_id=$1 AND user_id=$2 RETURNING id, archived_at AS "archivedAt"`,
    [req.params.id, req.params.userId, req.user.id]);
    await writeAudit({ actorUserId: req.user.id, action: 'staff_archived',
      entityType: 'organization_membership', entityId: String(old.id), organizationId: req.params.id,
      oldValues: { userId: old.user_id, role: old.membership_role, status: old.status } }, client);
    return saved.rows[0];
  });
  res.json(result);
}));

module.exports = router;
