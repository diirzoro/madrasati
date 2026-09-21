#!/usr/bin/env node
// db/migrate.js
// Migration runner for PostgreSQL.
// Usage: node db/migrate.js [up|status]
//
// Reads .env via dotenv, connects to DATABASE_URL, and applies
// unapplied migration files from db/migrations/ in lexicographic order.
// Each migration is recorded in the schema_migrations table.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(pool) {
  const res = await pool.query('SELECT name FROM schema_migrations ORDER BY id');
  return new Set(res.rows.map(r => r.name));
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error('Migrations directory not found:', MIGRATIONS_DIR);
    process.exit(1);
  }
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

async function runMigration(pool, filePath, name) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [name]
    );
    await client.query('COMMIT');
    console.log(`  Applied: ${name}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  FAILED:  ${name}`);
    console.error('  ', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function migrateUp() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await ensureMigrationTable(pool);
    const applied = await getAppliedMigrations(pool);
    const files = getMigrationFiles();
    const pending = files.filter(f => !applied.has(f));

    if (pending.length === 0) {
      console.log('All migrations are already applied.');
    } else {
      console.log(`Running ${pending.length} pending migration(s)...\n`);
      for (const file of pending) {
        const filePath = path.join(MIGRATIONS_DIR, file);
        await runMigration(pool, filePath, file);
      }
      console.log('\nDone.');
    }

    // Runs unconditionally, including when nothing was pending: the seven
    // protected test accounts (db/seed-fixed-users.js) must exist in every
    // environment, and re-seeding is what repairs a deleted or drifted one.
    console.log('\nSeeding protected system accounts...');
    const { seed } = require('./seed-fixed-users');
    const summary = await seed(pool);
    console.log(`  protected accounts: ${summary.accounts.length}`);
    summary.links.forEach((link) => console.log(`  linked: ${link}`));
  } finally {
    await pool.end();
  }
}

async function showStatus() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await ensureMigrationTable(pool);
    const applied = await getAppliedMigrations(pool);
    const files = getMigrationFiles();

    console.log('Migration status:\n');
    for (const file of files) {
      const status = applied.has(file) ? '  [APPLIED]' : '  [PENDING]';
      console.log(`${status} ${file}`);
    }

    const pending = files.filter(f => !applied.has(f));
    console.log(`\nTotal: ${files.length} | Applied: ${files.length - pending.length} | Pending: ${pending.length}`);
  } finally {
    await pool.end();
  }
}

const command = process.argv[2] || 'up';
if (command === 'up') {
  migrateUp().catch(err => { console.error(err); process.exit(1); });
} else if (command === 'status') {
  showStatus().catch(err => { console.error(err); process.exit(1); });
} else {
  console.error('Usage: node db/migrate.js [up|status]');
  process.exit(1);
}
