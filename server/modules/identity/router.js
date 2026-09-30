// modules/identity/router.js
// OWNING MODULE: identity
// API routes for identity/auth, served by the PostgreSQL-backed API app.

const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const {
  parseSessionToken,
  createSession,
  destroySession,
  sessionCookie,
  clearSessionCookieHeader,
  requireAuth,
  requireRole,
  requirePermission,
} = require('./auth');

const router = Router();
router.use('/access', require('./access-router'));

// Explicit whitelist: nothing reaches the client that this list does not name.
// The affiliation fields are the ones the admin directory renders as a column
// (which institution this person belongs to, and whether a teacher is on an
// institution's staff or an independent freelancer); they stay null on the auth
// routes where no institution context was loaded.
const mapUserDto = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  clientKind: user.clientKind ?? 'unspecified',
  phone: user.phone,
  status: user.status,
  organizationId: user.organizationId ?? null,
  organizationName: user.organizationName ?? null,
  organizationType: user.organizationType ?? null,
  organizationVerified: user.organizationVerified ?? null,
  membershipRole: user.membershipRole ?? null,
  membershipStatus: user.membershipStatus ?? null,
  organizationCount: user.organizationCount ?? 0,
  teacherProfileId: user.teacherProfileId ?? null,
  teacherProfileStatus: user.teacherProfileStatus ?? null,
  teacherKind: user.teacherKind ?? null,
  isProtected: user.isProtected ?? false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ---------- auth ----------
router.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, phone, phoneCountryCode, countryIso, profile, metadata } = req.body || {};
    // NOTE: `role` is never accepted here — service forces client.
    const user = await service.registerUser({ name, email, password, phone, phoneCountryCode, countryIso, profile, metadata });
    const token = createSession(user);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.status(201).json(mapUserDto(user));
  })
);

// Availability probes (public, boolean-only — no account enumeration).
router.get(
  '/auth/check-email',
  asyncHandler(async (req, res) => {
    res.json(await service.checkEmailAvailable(req.query.email));
  })
);

router.get(
  '/auth/check-phone',
  asyncHandler(async (req, res) => {
    const { phone, cc, iso } = req.query;
    res.json(await service.checkPhoneAvailable(phone, cc, iso));
  })
);

router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await service.loginUser({ email, password });
    const token = createSession(user);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.json(mapUserDto(user));
  })
);

router.post('/auth/logout', (req, res) => {
  destroySession(req);
  res.setHeader('Set-Cookie', clearSessionCookieHeader());
  res.json({ success: true });
});

router.get(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(mapUserDto(req.user));
  })
);

// ---------- users ----------
router.post(
  '/users',
  requireAuth,
  requireRole('admin'),
  requirePermission('access', 'create'),
  asyncHandler(async (req, res) => {
    const { name, email, password, phone, phoneCountryCode, countryIso, profile } = req.body || {};
    const user = await service.registerUser({ name, email, password, phone,
      phoneCountryCode, countryIso, profile, actorUserId: req.user.id });
    res.status(201).json(mapUserDto(user));
  })
);

router.get(
  '/users',
  requireAuth,
  requireRole('admin'),
  requirePermission('access', 'view'),
  asyncHandler(async (req, res) => {
    const { role, status, search, organizationId, limit = 100, offset = 0 } = req.query;
    const { items, total } = await service.listUsers({
      role,
      status,
      search,
      organizationId,
      limit: Number(limit),
      offset: Number(offset),
    });
    res.json({ items: items.map(mapUserDto), total });
  })
);

router.get(
  '/users/:id',
  requireAuth,
  requireRole('admin'),
  requirePermission('access', 'view'),
  asyncHandler(async (req, res) => {
    res.json(mapUserDto(await service.getUserByAdmin(req.params.id)));
  })
);

router.patch(
  '/users/:id',
  requireAuth,
  requireRole('admin'),
  requirePermission('access', 'update'),
  asyncHandler(async (req, res) => {
    const user = await service.updateUserByAdmin(req.params.id, { ...req.body, actorUserId: req.user.id });
    res.json(mapUserDto(user));
  })
);

router.delete(
  '/users/:id',
  requireAuth,
  requireRole('admin'),
  requirePermission('access', 'delete'),
  asyncHandler(async (req, res) => {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'Cannot delete current user' });
    }
    const result = await service.deleteUser(req.params.id, req.user.id);
    res.json(result);
  })
);

// ---------- user profiles ----------
router.get(
  '/profiles/:userId',
  requireAuth,
  (req, res, next) => {
    if (String(req.user.id) === String(req.params.userId)) return next();
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
    return requirePermission('access', 'view')(req, res, next);
  },
  asyncHandler(async (req, res) => {
    const profile = await service.getProfile(req.params.userId);
    res.json(profile);
  })
);

router.put(
  '/profiles/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (String(req.params.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You may only edit your own profile' });
    }
    const profile = await service.upsertProfile(req.params.userId, req.body || {});
    res.json(profile);
  })
);

// ---------- rbac ----------
router.get(
  '/rbac/roles',
  requireAuth,
  requireRole('admin'),
  requirePermission('access', 'view'),
  asyncHandler(async (req, res) => {
    res.json(await service.listRoles());
  })
);

router.get(
  '/rbac/permissions',
  requireAuth,
  requireRole('admin'),
  requirePermission('access', 'view'),
  asyncHandler(async (req, res) => {
    res.json(await service.listPermissions());
  })
);

router.get(
  '/rbac/roles/:roleId/permissions',
  requireAuth,
  requireRole('admin'),
  requirePermission('access', 'view'),
  asyncHandler(async (req, res) => {
    res.json(await service.listRolePermissions(req.params.roleId));
  })
);

router.post(
  '/rbac/roles/:roleId/permissions',
  requireAuth,
  requireRole('admin'),
  requirePermission('access', 'update'),
  asyncHandler(async (req, res) => {
    const { module, action, description } = req.body || {};
    const result = await service.grantPermissionToRole(req.params.roleId, { module, action, actorUserId: req.user.id });
    res.status(201).json(result);
  })
);

router.delete(
  '/rbac/roles/:roleId/permissions/:permissionId',
  requireAuth,
  requireRole('admin'),
  requirePermission('access', 'update'),
  asyncHandler(async (req, res) => {
    const result = await service.revokePermissionFromRole(req.params.roleId, req.params.permissionId, req.user.id);
    res.json(result);
  })
);

// For runtime-compat introspection of the session token (useful during dev)
router.use(require('./client-router'));

router.get('/auth/session', (req, res) => {
  const token = parseSessionToken(req);
  res.json({ hasSession: Boolean(token) });
});

module.exports = router;
