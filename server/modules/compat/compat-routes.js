// server/modules/compat/compat-routes.js
// Backward-compatible routes that map SQLite-era API paths to PG services.
// Used during Phase 2D cutover so the existing frontend works without changes.

const { Router } = require('express');
const service = require('../identity/service');
const { asyncHandler } = require('../common/http');
const { createSession, sessionCookie, clearSessionCookieHeader, requireAuth, requireRole } = require('../identity/auth');

const router = Router();

const mapUserDto = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// POST /api/login  →  service.loginUser
router.post(
  '/api/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await service.loginUser({ email, password });
    const token = createSession(user);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.json(mapUserDto(user));
  })
);

// POST /api/users  →  service.registerUser (public; role always forced to client)
router.post(
  '/api/users',
  asyncHandler(async (req, res) => {
    const { name, email, password, phone, phoneCountryCode, countryIso, profile, metadata } = req.body || {};
    const user = await service.registerUser({ name, email, password, phone, phoneCountryCode, countryIso, profile, metadata });
    const token = createSession(user);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.status(201).json(mapUserDto(user));
  })
);

// GET /api/users  →  service.listUsers (return flat array for frontend compat)
// Auth required: admin only (matches identity router contract)
router.get(
  '/api/users',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const { items } = await service.listUsers({ limit: 1000, offset: 0 });
    res.json(items.map(mapUserDto));
  })
);

module.exports = router;
