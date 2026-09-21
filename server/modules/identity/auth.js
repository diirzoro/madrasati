// modules/identity/auth.js
// OWNING MODULE: identity
//
// Session + role/permission middleware for the PostgreSQL module foundation.
//
// NOTE: sessions are held in memory, so restarting the API process logs
// every user out. Persisting sessions in PostgreSQL is still open work.

const crypto = require('crypto');

const repo = require('./repository');
const orgRepo = require('../organizations/repository');

const sessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h, mirroring current runtime

const isProduction = () => process.env.NODE_ENV === 'production';

function parseSessionToken(req) {
  const header = req.headers.cookie || '';
  const token = header
    .split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith('madarasati_session='));
  return token ? token.split('=')[1] : null;
}

function currentSession(req) {
  const token = parseSessionToken(req);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt && session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    id: user.id,
    role: user.role,
    email: user.email,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function destroySession(req) {
  const token = parseSessionToken(req);
  if (token) sessions.delete(token);
  return !sessions.has(token);
}

function sessionCookie(token) {
  const secure = isProduction() ? '; Secure' : '';
  return `madarasati_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${secure}`;
}

function clearSessionCookieHeader() {
  const secure = isProduction() ? '; Secure' : '';
  return `madarasati_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

// Builds the authenticated request context from a live DB row so role/permission
// and account-status changes apply immediately instead of trusting the stale
// value cached in the in-memory session.
function sessionUserFromRow(row, session) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: session.expiresAt,
  };
}

async function requireAuth(req, res, next) {
  const session = currentSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const user = await repo.findUserById(session.id);
    if (!user || user.status !== 'active' || user.deleted_at) {
      // Account missing, suspended, or soft-deleted: revoke the session now.
      destroySession(req);
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.user = sessionUserFromRow(user, session);
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Tenant isolation guard for organization-scoped routes.
//
// Organization-owned data is keyed by organization_id, and hiding a section in
// the frontend is not authorization. A request may only reach a tenant's data
// when the caller is a platform admin (governance over shared catalogs), that
// organization's owner, or a member with an active membership row.
//
// Unauthorized callers get 404 rather than 403 so the response does not confirm
// that the organization exists.
function requireOrgMember(paramName = 'orgId') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'admin') {
      return next();
    }
    const organizationId = req.params[paramName];
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization id is required' });
    }
    try {
      const [isOwner, membership] = await Promise.all([
        orgRepo.isOrganizationOwner(req.user.id, organizationId),
        orgRepo.findMembership(req.user.id, organizationId),
      ]);
      if (isOwner || (membership && membership.status === 'active')) {
        return next();
      }
      return res.status(404).json({ error: 'Organization not found' });
    } catch (err) {
      return next(err);
    }
  };
}

async function optionalAuth(req, _res, next) {
  const session = currentSession(req);
  if (session) {
    try {
      const user = await repo.findUserById(session.id);
      if (user && user.status === 'active' && !user.deleted_at) {
        req.user = sessionUserFromRow(user, session);
      }
    } catch (err) {
      // Optional auth must degrade gracefully if the DB is unavailable.
    }
  }
  next();
}

module.exports = {
  sessions,
  SESSION_TTL_MS,
  parseSessionToken,
  currentSession,
  createSession,
  destroySession,
  sessionCookie,
  clearSessionCookieHeader,
  requireAuth,
  requireRole,
  requireOrgMember,
  optionalAuth,
};