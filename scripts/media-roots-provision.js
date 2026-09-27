#!/usr/bin/env node
// scripts/media-roots-provision.js
// Creates a dedicated media root for every existing organization and teacher,
// keyed on the database id:
//
//   assets/institutions/<type-folder>/<organization-id>[-slug]/{logo,cover,gallery,facilities,documents}/
//   assets/teachers/<gender>/<teacher-id>[-slug]/{profile,cover,gallery,documents}/
//
// Idempotent: re-running only adds what is missing. It does NOT copy or move any
// image — the folders are storage locations; which file belongs to an entity is
// recorded in the database (organizations.image / gallery, teacher avatar) and in
// media-map.js. Until a real cover/gallery is uploaded, the resolver serves the
// deterministic fallback at runtime and never writes it into the entity root.
require('dotenv').config();
const { Pool } = require('pg');
const { initOrgRoot, initTeacherRoot } = require('./media-init');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const orgs = (await pool.query(
    `SELECT id, slug, type FROM organizations WHERE deleted_at IS NULL ORDER BY type, slug`
  )).rows;
  const teachers = (await pool.query(
    `SELECT id, gender FROM teacher_profiles WHERE deleted_at IS NULL`
  )).rows;

  orgs.forEach((o) => initOrgRoot(o.id, { slug: o.slug, type: o.type }));
  teachers.forEach((t) => initTeacherRoot(t.id, { gender: t.gender }));

  console.log('provisioned organization roots: ' + orgs.length);
  console.log('provisioned teacher roots: ' + teachers.length);
  await pool.end();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
