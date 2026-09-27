#!/usr/bin/env node
// scripts/media-init.js
// Provisions an entity's media root. ONE ENTITY = ONE MEDIA ROOT.
// The database id is the sole identity; the label is only a readable suffix.
//
//   initOrgRoot(id, { slug, type })          -> assets/institutions/<type>/<id[-slug]>/{...}
//   initTeacherRoot(id, { slug, gender })    -> assets/teachers/<gender>/<id[-slug]>/{...}
//   initUserRoot(id)                         -> assets/users/<id>/{...}
//   initOwnerRoot(id)                        -> assets/owners/<id>/{...}
//
// Must stay in lock-step with design-prototype-v4/media.js.

const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'design-prototype-v4', 'assets');

const TYPE_FOLDER = {
  private_school: 'private-schools',
  government_school: 'government-schools',
  institute: 'institutes',
  college: 'colleges',
  university: 'universities'
};

const CATEGORIES = {
  organization: ['logo', 'cover', 'gallery', 'facilities', 'documents'],
  teacher: ['profile', 'cover', 'gallery', 'documents'],
  user: ['avatar', 'documents'],
  owner: ['profile', 'documents']
};

function slugify(s) {
  const v = String(s || '').trim().toLowerCase();
  if (!v) return '';
  return v.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}
function segment(id, label) {
  const l = slugify(label);
  return l ? (String(id) + '-' + l) : String(id);
}
function ensure(base, cats) {
  fs.mkdirSync(base, { recursive: true });
  cats.forEach((c) => {
    const dir = path.join(base, c);
    fs.mkdirSync(dir, { recursive: true });
    const marker = path.join(dir, '.gitkeep');
    if (!fs.existsSync(marker)) fs.writeFileSync(marker, '');
  });
  return base;
}

function initOrgRoot(id, opts = {}) {
  if (!id) throw new Error('initOrgRoot: entity id is required');
  const tf = TYPE_FOLDER[opts.type] || 'other';
  return ensure(path.join(ASSETS, 'institutions', tf, segment(id, opts.slug)), CATEGORIES.organization);
}
function initTeacherRoot(id, opts = {}) {
  if (!id) throw new Error('initTeacherRoot: entity id is required');
  const g = (opts.gender === 'female') ? 'female' : 'male';
  return ensure(path.join(ASSETS, 'teachers', g, segment(id, opts.slug)), CATEGORIES.teacher);
}
function initUserRoot(id) {
  if (!id) throw new Error('initUserRoot: entity id is required');
  return ensure(path.join(ASSETS, 'users', String(id)), CATEGORIES.user);
}
function initOwnerRoot(id) {
  if (!id) throw new Error('initOwnerRoot: entity id is required');
  return ensure(path.join(ASSETS, 'owners', String(id)), CATEGORIES.owner);
}

module.exports = { initOrgRoot, initTeacherRoot, initUserRoot, initOwnerRoot, segment, slugify, TYPE_FOLDER, CATEGORIES };

if (require.main === module) {
  const [kind, id, label, type] = process.argv.slice(2);
  try {
    let p;
    if (kind === 'org') p = initOrgRoot(id, { slug: label, type });
    else if (kind === 'teacher') p = initTeacherRoot(id, { slug: label, gender: type });
    else if (kind === 'user') p = initUserRoot(id);
    else if (kind === 'owner') p = initOwnerRoot(id);
    else { console.error('Usage: node scripts/media-init.js <org|teacher|user|owner> <id> [label] [type|gender]'); process.exit(1); }
    console.log('media root ready: ' + path.relative(path.join(__dirname, '..'), p));
  } catch (e) { console.error(e.message); process.exit(1); }
}
