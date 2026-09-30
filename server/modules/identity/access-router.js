// Administrative identity views and controls. All routes are under /api/access.
const { Router } = require('express');
const { query, getClient } = require('../common/pool');
const { asyncHandler } = require('../common/http');
const { writeAudit } = require('../common/audit');
const { requireAuth, requireRole, requirePermission, parseSessionToken, listUserSessions, revokeUserSessions } = require('./auth');
const { ValidationError, NotFoundError, ForbiddenError } = require('../common/errors');

const router = Router();
router.use(requireAuth, requireRole('admin'), requirePermission('access', 'view'));
const canManage = requirePermission('access', 'update');
const uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
const page = (req) => ({ limit: Math.min(100, Math.max(1, Number(req.query.limit) || 25)),
  offset: Math.max(0, Number(req.query.offset) || 0) });

async function targetUser(id) {
  if (!uuid(id)) throw new ValidationError('Invalid user id');
  const { rows } = await query('SELECT id, role_id, status, is_protected FROM users WHERE id=$1 AND deleted_at IS NULL', [id]);
  if (!rows[0]) throw new NotFoundError('User not found');
  return rows[0];
}
function guardTarget(actor, target) {
  if (target.is_protected) throw new ForbiddenError('Protected account access cannot be changed');
  if (String(actor.id) === String(target.id)) throw new ForbiddenError('You cannot change your own access');
}

router.get('/summary', asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT
    (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL) AS users,
    (SELECT COUNT(*)::int FROM users WHERE status='active' AND deleted_at IS NULL) AS active_users,
    (SELECT COUNT(*)::int FROM roles) AS roles,
    (SELECT COUNT(*)::int FROM permissions) AS permissions,
    (SELECT COUNT(*)::int FROM organization_memberships) AS memberships,
    (SELECT COUNT(*)::int FROM pending_registrations) AS registration_requests`);
  res.json(rows[0]);
}));

router.get('/memberships', asyncHandler(async (req, res) => {
  const { limit, offset } = page(req);
  const { rows } = await query(`SELECT m.id, m.user_id AS "userId", u.name AS "userName",
      m.organization_id AS "organizationId", o.name AS "organizationName",
      m.membership_role AS "role", m.status, m.joined_at AS "joinedAt"
    FROM organization_memberships m JOIN users u ON u.id=m.user_id
    JOIN organizations o ON o.id=m.organization_id
    WHERE u.deleted_at IS NULL AND o.deleted_at IS NULL
    ORDER BY m.joined_at DESC, m.id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
  const count = await query(`SELECT COUNT(*)::int AS total FROM organization_memberships m
    JOIN users u ON u.id=m.user_id JOIN organizations o ON o.id=m.organization_id
    WHERE u.deleted_at IS NULL AND o.deleted_at IS NULL`);
  res.json({ items: rows, total: count.rows[0].total });
}));

router.get('/users/:userId/memberships', asyncHandler(async (req, res) => {
  await targetUser(req.params.userId);
  const { rows } = await query(`SELECT m.id, m.organization_id AS "organizationId",
    o.name AS "organizationName", o.type AS "organizationType",
    m.membership_role AS "role", m.status, m.joined_at AS "joinedAt"
    FROM organization_memberships m JOIN organizations o ON o.id=m.organization_id
    WHERE m.user_id=$1 AND o.deleted_at IS NULL ORDER BY m.joined_at, m.id`, [req.params.userId]);
  res.json(rows);
}));

router.post('/users/:userId/memberships', canManage, asyncHandler(async (req, res) => {
  const target = await targetUser(req.params.userId);
  guardTarget(req.user, target);
  const { organizationId, role, status = 'active' } = req.body || {};
  if (!uuid(organizationId) || !/^[a-z][a-z0-9_]{1,39}$/.test(String(role || '')) ||
      !['active', 'inactive', 'suspended', 'pending'].includes(status)) throw new ValidationError('Invalid membership');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const org = await client.query('SELECT id FROM organizations WHERE id=$1 AND deleted_at IS NULL', [organizationId]);
    if (!org.rows[0]) throw new NotFoundError('Organization not found');
    // Serialize modifications to this user within the transaction.
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [target.id]);
    const existing = await client.query(`SELECT id, archived_at FROM organization_memberships
      WHERE user_id=$1 AND organization_id=$2 ORDER BY id LIMIT 1`, [target.id, organizationId]);
    if (existing.rows[0] && !existing.rows[0].archived_at) throw new ValidationError('User is already a member of this organization');
    const result = await client.query(`INSERT INTO organization_memberships
      (user_id, organization_id, membership_role, status) VALUES ($1,$2,$3,$4)
      ON CONFLICT (user_id, organization_id) DO UPDATE SET
        membership_role=EXCLUDED.membership_role, status=EXCLUDED.status,
        archived_at=NULL, archived_by_user_id=NULL, updated_at=now()
      RETURNING id, user_id AS "userId", organization_id AS "organizationId",
        membership_role AS "role", status, joined_at AS "joinedAt"`,
    [target.id, organizationId, role, status]);
    await writeAudit({ actorUserId: req.user.id, action: 'membership_created', entityType: 'organization_membership',
      entityId: String(result.rows[0].id), organizationId, newValues: { userId: target.id, role, status } }, client);
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; }
  finally { client.release(); }
}));

router.patch('/memberships/:id', canManage, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { role, status } = req.body || {};
  if (!Number.isSafeInteger(id) || id < 1 || (role === undefined && status === undefined) ||
      (role !== undefined && !/^[a-z][a-z0-9_]{1,39}$/.test(String(role))) ||
      (status !== undefined && !['active', 'inactive', 'suspended', 'pending'].includes(status)))
    throw new ValidationError('Invalid membership update');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const old = await client.query('SELECT * FROM organization_memberships WHERE id=$1 FOR UPDATE', [id]);
    if (!old.rows[0]) throw new NotFoundError('Membership not found');
    if (old.rows[0].archived_at) throw new ValidationError('Archived membership must be restored through Add membership');
    guardTarget(req.user, await targetUser(old.rows[0].user_id));
    const result = await client.query(`UPDATE organization_memberships SET
      membership_role=COALESCE($2,membership_role), status=COALESCE($3,status), updated_at=now()
      WHERE id=$1 RETURNING *`, [id, role || null, status || null]);
    await writeAudit({ actorUserId: req.user.id, action: 'membership_changed', entityType: 'organization_membership',
      entityId: String(id), organizationId: old.rows[0].organization_id,
      oldValues: { role: old.rows[0].membership_role, status: old.rows[0].status },
      newValues: { role: result.rows[0].membership_role, status: result.rows[0].status } }, client);
    await client.query('COMMIT'); res.json({ success: true });
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; }
  finally { client.release(); }
}));

router.delete('/memberships/:id', canManage, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid membership id');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const old = await client.query('SELECT * FROM organization_memberships WHERE id=$1 FOR UPDATE', [id]);
    if (!old.rows[0]) throw new NotFoundError('Membership not found');
    if (old.rows[0].archived_at) throw new ValidationError('Membership already archived');
    guardTarget(req.user, await targetUser(old.rows[0].user_id));
    await client.query(`UPDATE organization_memberships SET status='inactive', archived_at=now(),
      archived_by_user_id=$2, updated_at=now() WHERE id=$1`, [id, req.user.id]);
    await writeAudit({ actorUserId: req.user.id, action: 'membership_archived', entityType: 'organization_membership',
      entityId: String(id), organizationId: old.rows[0].organization_id,
      oldValues: { userId: old.rows[0].user_id, role: old.rows[0].membership_role } }, client);
    await client.query('COMMIT'); res.json({ success: true });
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; }
  finally { client.release(); }
}));

router.get('/users/:userId/permissions', asyncHandler(async (req, res) => {
  const user = await targetUser(req.params.userId);
  const orgId = req.query.organizationId || null;
  if (orgId && !uuid(orgId)) throw new ValidationError('Invalid organization id');
  const inherited = await query(`SELECT p.id, p.module, p.action FROM role_permissions rp
    JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=$1 ORDER BY p.module,p.action`, [user.role_id]);
  const overrides = await query(`SELECT p.id, p.module, p.action, o.effect,
    o.organization_id AS "organizationId" FROM user_permission_overrides o
    JOIN permissions p ON p.id=o.permission_id WHERE o.user_id=$1
      AND (o.organization_id IS NULL OR o.organization_id=$2)
    ORDER BY p.module,p.action`, [user.id, orgId]);
  const effective = new Map(inherited.rows.map((p) => [`${p.module}.${p.action}`, { ...p, source: 'role' }]));
  for (const item of overrides.rows) {
    const key = `${item.module}.${item.action}`;
    if (item.effect === 'grant') effective.set(key, { id: item.id, module: item.module, action: item.action, source: 'direct' });
  }
  for (const item of overrides.rows) if (item.effect === 'deny')
    effective.delete(`${item.module}.${item.action}`);
  res.json({ inherited: inherited.rows, overrides: overrides.rows, effective: [...effective.values()] });
}));

router.put('/users/:userId/permissions/:permissionId', canManage, asyncHandler(async (req, res) => {
  const user = await targetUser(req.params.userId); guardTarget(req.user, user);
  const { effect, organizationId = null } = req.body || {};
  if (!uuid(req.params.permissionId) || !['grant', 'deny'].includes(effect) ||
      (organizationId !== null && !uuid(organizationId))) throw new ValidationError('Invalid permission override');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const p = await client.query('SELECT id,module,action FROM permissions WHERE id=$1', [req.params.permissionId]);
    if (!p.rows[0]) throw new NotFoundError('Permission not found');
    if (effect === 'grant') {
      const actorDecision = await require('./repository').permissionDecision(
        req.user.id, p.rows[0].module, p.rows[0].action, organizationId);
      if (!actorDecision.rows[0].allowed)
        throw new ForbiddenError('You cannot grant a permission you do not hold');
    }
    if (organizationId) {
      const m = await client.query(`SELECT id FROM organization_memberships WHERE user_id=$1
        AND organization_id=$2 AND status='active' AND archived_at IS NULL`, [user.id, organizationId]);
      if (!m.rows[0]) throw new ValidationError('User needs an active organization membership');
    }
    const old = await client.query(`SELECT effect FROM user_permission_overrides WHERE user_id=$1
      AND permission_id=$2 AND organization_id IS NOT DISTINCT FROM $3 FOR UPDATE`,
    [user.id, p.rows[0].id, organizationId]);
    if (old.rows[0]) await client.query(`UPDATE user_permission_overrides SET effect=$4, created_by=$5, created_at=now()
      WHERE user_id=$1 AND permission_id=$2 AND organization_id IS NOT DISTINCT FROM $3`,
    [user.id, p.rows[0].id, organizationId, effect, req.user.id]);
    else await client.query(`INSERT INTO user_permission_overrides
      (user_id,permission_id,effect,organization_id,created_by) VALUES($1,$2,$3,$4,$5)`,
    [user.id, p.rows[0].id, effect, organizationId, req.user.id]);
    await writeAudit({ actorUserId: req.user.id, action: 'permission_override_changed', entityType: 'user',
      entityId: String(user.id), organizationId,
      oldValues: old.rows[0] || null,
      newValues: { permission: `${p.rows[0].module}.${p.rows[0].action}`, effect } }, client);
    await client.query('COMMIT'); res.json({ success: true });
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; }
  finally { client.release(); }
}));

router.delete('/users/:userId/permissions/:permissionId', canManage, asyncHandler(async (req, res) => {
  const user = await targetUser(req.params.userId); guardTarget(req.user, user);
  const organizationId = req.query.organizationId || null;
  if (!uuid(req.params.permissionId) || (organizationId && !uuid(organizationId))) throw new ValidationError('Invalid permission override');
  const { rowCount } = await query(`DELETE FROM user_permission_overrides WHERE user_id=$1 AND permission_id=$2
    AND organization_id IS NOT DISTINCT FROM $3`, [user.id, req.params.permissionId, organizationId]);
  if (!rowCount) throw new NotFoundError('Permission override not found');
  await writeAudit({ actorUserId: req.user.id, action: 'permission_override_removed', entityType: 'user',
    entityId: String(user.id), organizationId, newValues: { permissionId: req.params.permissionId } });
  res.json({ success: true });
}));

router.get('/users/:userId/sessions', asyncHandler(async (req, res) => {
  await targetUser(req.params.userId);
  res.json({ persistent: false, items: listUserSessions(req.params.userId, parseSessionToken(req)) });
}));
router.delete('/users/:userId/sessions/:sessionId', canManage, asyncHandler(async (req, res) => {
  await targetUser(req.params.userId);
  if (!/^[0-9a-f]{64}$/.test(req.params.sessionId)) throw new ValidationError('Invalid session id');
  const count = revokeUserSessions(req.params.userId, req.params.sessionId);
  if (!count) throw new NotFoundError('Session not found');
  await writeAudit({ actorUserId: req.user.id, action: 'session_revoked', entityType: 'user',
    entityId: String(req.params.userId) });
  res.json({ success: true });
}));
router.delete('/users/:userId/sessions', canManage, asyncHandler(async (req, res) => {
  await targetUser(req.params.userId);
  const count = revokeUserSessions(req.params.userId);
  await writeAudit({ actorUserId: req.user.id, action: 'sessions_revoked', entityType: 'user',
    entityId: String(req.params.userId), newValues: { count } });
  res.json({ success: true, count });
}));

router.get('/users/:userId/activity', asyncHandler(async (req, res) => {
  await targetUser(req.params.userId);
  const { limit, offset } = page(req);
  const { rows } = await query(`SELECT al.id, al.action, al.object_type AS "entityType",
      al.object_id AS "entityId", al.created_at AS "createdAt", al.organization_id AS "organizationId",
      al.old_values AS "oldValues", al.new_values AS "newValues", u.name AS "actorName"
    FROM audit_logs al LEFT JOIN users u ON u.id=al.actor_user_id
    WHERE (al.object_type='user' AND al.object_id=$1) OR al.actor_user_id=$1::uuid
    ORDER BY al.created_at DESC LIMIT $2 OFFSET $3`, [req.params.userId, limit, offset]);
  res.json({ items: rows });
}));

module.exports = router;
