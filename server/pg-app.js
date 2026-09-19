// server/pg-app.js
// Parallel PostgreSQL-backed API entry point (port 4003).
// This file does NOT modify or replace server/index.js (SQLite, port 4002).
// Both runtimes can coexist during Phase 2B/2C.

require('dotenv').config();

const path = require('path');
const express = require('express');
const { pool } = require('./modules/common/pool');
const { errorHandler, notFoundHandler } = require('./modules/common/http');

const app = express();
app.disable('x-powered-by');

const PG_PORT = process.env.PG_PORT || 4003;

// ---------- middleware ----------
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS for credentialed requests from V4 frontend (localhost:3000)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------- health ----------
app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now, current_database() AS db');
    res.json({ status: 'ok', runtime: 'postgresql', server: rows[0].db, time: rows[0].now });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

// ---------- compat routes (SQLite-era API paths for frontend) ----------
// Must be mounted BEFORE identity router so /api/users and /api/login
// are handled by compat (no auth required) instead of identity (auth required).
try {
  const compatRouter = require('./modules/compat/compat-routes');
  app.use(compatRouter);
  console.log('[pg-app] mounted: /api/login, /api/users (compat)');
} catch (err) {
  console.warn('[pg-app] compat routes not loaded:', err.message);
}

// Public marketing banner images (uploaded by marketing admin).
// Private org documents stay outside any static directory.
app.use('/uploads/marketing', express.static(path.join(__dirname, 'uploads', 'marketing')));

// ---------- module routers ----------
// Each module exports { router } from its index.js.
// Routers are mounted lazily so missing modules don't crash the app.

const modules = [
  { name: 'identity',       path: '/api' },
  { name: 'organizations',  path: '/api/organizations' },
  { name: 'locations',      path: '/api/locations' },
  { name: 'academic',       path: '/api/academic' },
  { name: 'teachers',       path: '/api/teachers' },
  { name: 'admissions',     path: '/api/admissions' },
  { name: 'bookings',       path: '/api/bookings' },
  { name: 'communication',  path: '/api/communication' },
  { name: 'marketplace',    path: '/api/marketplace' },
  { name: 'ownership',      path: '/api/ownership' },
  { name: 'documents',      path: '/api/documents' },
  { name: 'admin',          path: '/api/admin' },
  // marketing must mount AFTER admin so /api/admin/* owned by the admin module
  // is matched first, while marketing's own /api/admin/* writes fall through.
  { name: 'marketing',      path: '/api' },
];

for (const mod of modules) {
  try {
    // eslint-disable-next-line no-console
    console.log(`[pg-app] loading module: ${mod.name}`);
    const imported = require(`./modules/${mod.name}`);
    if (imported && imported.router) {
      app.use(mod.path, imported.router);
      // eslint-disable-next-line no-console
      console.log(`[pg-app] mounted: ${mod.path} -> ${mod.name}`);
    } else {
      console.warn(`[pg-app] module ${mod.name} has no router — skipping`);
    }
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.warn(`[pg-app] module ${mod.name} not yet built — skipping`);
    } else {
      console.error(`[pg-app] failed to load module ${mod.name}:`, err.message);
    }
  }
}

// ---------- error handlers (must be last) ----------
app.use(notFoundHandler);
app.use(errorHandler);

// ---------- start ----------
if (require.main === module) {
  app.listen(PG_PORT, () => {
    console.log(`[pg-app] PostgreSQL API listening on port ${PG_PORT}`);
  });
}

module.exports = app;