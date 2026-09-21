#!/usr/bin/env node
// db/seed-fixed-users.js
//
// Seeds the seven permanent test accounts used to exercise every role without
// hand-registering users. One shared password, one account per role:
//
//   admin@test.com    admin   platform administrator
//   private@test.com  owner   owner of a private school
//   gov@test.com      owner   owner of a government school
//   collage@test.com  owner   owner of a college
//   inst@test.com     owner   owner of an institute
//   teacher@test.com  teacher teacher with a teacher_profiles row
//   student@test.com  client  ordinary student/parent account
//
// Password for all seven: Admin@123 (bcrypt, cost 10 -- the same factor the
// register flow in modules/identity/service.js uses, so login verification
// matches).
//
// These rows are *protected system accounts*: this script sets
// users.is_protected = true (migration 032) and the identity API refuses to
// delete them. The upsert is an ON CONFLICT (email) DO UPDATE, so re-running
// also repairs drift -- a deleted, suspended or password-changed account comes
// back to a known-good state.
//
// Runs automatically at the end of `node db/migrate.js up` and from
// scripts/preview-up.sh, and can be run directly:
//
//   node db/seed-fixed-users.js
//
// Idempotent: safe to re-run.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const PASSWORD = 'Admin@123';
const BCRYPT_COST = 10;

// Owner accounts are attached to the first organization of their type ordered
// by slug, so a re-run always resolves to the same institution instead of
// drifting between rows.
const ACCOUNTS = [
  { email: 'admin@test.com', name: 'مدير النظام (تجريبي)', role: 'admin', phone: '+967711100001' },
  { email: 'private@test.com', name: 'مالك مدرسة خاصة (تجريبي)', role: 'owner', phone: '+967711100002', orgType: 'private_school' },
  { email: 'gov@test.com', name: 'مالك مدرسة حكومية (تجريبي)', role: 'owner', phone: '+967711100003', orgType: 'government_school' },
  { email: 'collage@test.com', name: 'مالك كلية (تجريبي)', role: 'owner', phone: '+967711100004', orgType: 'college' },
  { email: 'inst@test.com', name: 'مالك معهد (تجريبي)', role: 'owner', phone: '+967711100005', orgType: 'institute' },
  {
    email: 'teacher@test.com',
    name: 'معلم (تجريبي)',
    role: 'teacher',
    phone: '+967711100006',
    teacherProfile: {
      headline: 'معلم رياضيات - المرحلة الثانوية',
      bio: 'حساب تجريبي دائم لاختبار لوحة المعلم والحجوزات.',
      gender: 'male',
      yearsOfExperience: 8,
    },
  },
  { email: 'student@test.com', name: 'طالب (تجريبي)', role: 'client', phone: '+967711100007' },
];

async function assertSchemaReady(client) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_protected'`
  );
  if (!rows.length) {
    throw new Error('users.is_protected is missing — run `node db/migrate.js up` first.');
  }
}

async function upsertProtectedUser(client, account, passwordHash) {
  const { rows } = await client.query(
    `INSERT INTO users (name, email, phone, phone_normalized, role_id, password_hash, status, is_protected)
     SELECT $1, $2, $3, $3, r.id, $4, 'active', true
       FROM roles r
      WHERE r.name = $5
     ON CONFLICT (email) DO UPDATE SET
       name             = EXCLUDED.name,
       phone            = EXCLUDED.phone,
       phone_normalized = EXCLUDED.phone_normalized,
       role_id          = EXCLUDED.role_id,
       password_hash    = EXCLUDED.password_hash,
       status           = 'active',
       is_protected     = true,
       deleted_at       = NULL,
       updated_at       = now()
     RETURNING id`,
    [account.name, account.email, account.phone, passwordHash, account.role]
  );
  if (!rows.length) throw new Error(`role "${account.role}" is not seeded (see migration 006)`);
  return rows[0].id;
}

// organization_memberships has no unique key on (user_id, organization_id), so
// ON CONFLICT is unavailable: update first and insert only when nothing matched,
// which keeps re-runs from stacking duplicate rows.
async function linkOwner(client, userId, orgType) {
  const { rows } = await client.query(
    `SELECT id, name FROM organizations
      WHERE type = $1 AND deleted_at IS NULL
      ORDER BY slug
      LIMIT 1`,
    [orgType]
  );
  if (!rows.length) return null;

  const org = rows[0];
  const updated = await client.query(
    `UPDATE organization_memberships
        SET membership_role = 'owner', status = 'active'
      WHERE user_id = $1 AND organization_id = $2`,
    [userId, org.id]
  );
  if (updated.rowCount === 0) {
    await client.query(
      `INSERT INTO organization_memberships (user_id, organization_id, membership_role, status)
       VALUES ($1, $2, 'owner', 'active')`,
      [userId, org.id]
    );
  }
  return org;
}

async function upsertTeacherProfile(client, userId, profile) {
  await client.query(
    `INSERT INTO teacher_profiles
       (user_id, headline, bio, gender, years_of_experience,
        offers_online, travels_to_student_home, accepts_student_home,
        verified, verification_status, profile_status)
     VALUES ($1, $2, $3, $4, $5, true, false, false, true, 'verified', 'active')
     ON CONFLICT (user_id) DO UPDATE SET
       headline            = EXCLUDED.headline,
       bio                 = EXCLUDED.bio,
       gender              = EXCLUDED.gender,
       years_of_experience = EXCLUDED.years_of_experience,
       verified            = true,
       verification_status = 'verified',
       profile_status      = 'active',
       deleted_at          = NULL,
       updated_at          = now()`,
    [userId, profile.headline, profile.bio, profile.gender, profile.yearsOfExperience]
  );
}

// Seeds every account in one transaction: a half-seeded set of roles would be
// worse than none, since a missing owner link looks like a permissions bug.
async function seed(pool) {
  const passwordHash = bcrypt.hashSync(PASSWORD, BCRYPT_COST);
  const client = await pool.connect();
  const summary = { accounts: [], links: [], teacherProfiles: 0 };

  try {
    await client.query('BEGIN');
    await assertSchemaReady(client);

    for (const account of ACCOUNTS) {
      const userId = await upsertProtectedUser(client, account, passwordHash);
      summary.accounts.push(account.email);

      if (account.orgType) {
        const org = await linkOwner(client, userId, account.orgType);
        if (!org) throw new Error(`no organization of type "${account.orgType}" to link ${account.email} to`);
        summary.links.push(`${account.email} -> ${org.name}`);
      }

      if (account.teacherProfile) {
        await upsertTeacherProfile(client, userId, account.teacherProfile);
        summary.teacherProfiles += 1;
      }
    }

    await client.query('COMMIT');
    return summary;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* noop */ }
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const summary = await seed(pool);
    console.log(`  protected accounts: ${summary.accounts.length} (password: ${PASSWORD})`);
    summary.links.forEach((link) => console.log(`  linked: ${link}`));
    if (summary.teacherProfiles) console.log(`  teacher profiles: ${summary.teacherProfiles}`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { seed, ACCOUNTS, PASSWORD };
