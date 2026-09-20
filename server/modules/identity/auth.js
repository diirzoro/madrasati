// modules/identity/auth.js
// OWNING MODULE: identity
//
// Session + role/permission middleware for the PostgreSQL module foundation.
//
// NOTE: sessions are held in memory, so restarting the API process logs
// every user out. Persisting sessions in PostgreSQL is still open work.

const crypto = require('crypto');

const repo = require('./repository');

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
  optionalAuth,
};