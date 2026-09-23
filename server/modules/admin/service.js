// modules/admin/service.js
// OWNING MODULE: admin
// Admin dashboard data + system settings management.
// Phase 2B: read-only admin views + settings CRUD; user suspension deferred to 2D.

const repo = require('./repository');
const { writeAudit } = require('../common/audit');
const { ValidationError } = require('../common/errors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function mapAuditLog(row) {
  if (!row) return null;
  return {
    id: row.id, actorUserId: row.actor_user_id, actorName: row.actor_name,
    action: row.action, entityType: row.object_type, entityId: row.object_id,
    organizationId: row.organization_id, oldValues: row.old_values,
    newValues: row.new_values, reason: row.reason, correlationId: row.correlation_id,
    createdAt: row.created_at,
  };
}

function mapSetting(row) {
  if (!row) return null;
  return { key: row.key, value: row.value, description: row.description, updatedBy: row.updated_by, updatedAt: row.updated_at };
}

async function listAuditLogs(filters) { return (await repo.listAuditLogs(filters)).map(mapAuditLog); }
async function listSettings() { return (await repo.listSettings()).map(mapSetting); }
async function getSetting(key) { return mapSetting(await repo.getSetting(key)); }

async function updateSetting({ key, value, description, updatedBy }) {
  const existing = await repo.getSetting(key);
  const setting = await repo.upsertSetting(key, value, { description, updatedBy });
  await writeAudit({
    actorUserId: updatedBy || null,
    action: existing ? 'update' : 'create',
    entityType: 'system_setting',
    entityId: key,
    oldValues: existing ? { value: existing.value } : null,
    newValues: { value, description },
  });
  return mapSetting(setting);
}

async function dashboardCounts() {
  const [pendingRegistrations, metrics] = await Promise.all([
    repo.countPendingRegistrations(),
    repo.dashboardMetrics(),
  ]);
  const { query } = require('../common/pool');
  const [own, loc, docs] = await Promise.all([
    query(`SELECT COUNT(*)::int AS c FROM ownership_requests WHERE status IN ('pending','under_review')`),
    query(`SELECT COUNT(*)::int AS c FROM location_requests WHERE status = 'pending'`),
    query(`SELECT COUNT(*)::int AS c FROM organization_documents WHERE status = 'pending'`),
  ]);
  return {
    ...metrics,
    pendingRegistrations,
    pendingOwnershipRequests: own.rows[0].c,
    pendingLocationRequests: loc.rows[0].c,
    pendingDocuments: docs.rows[0].c,
  };
}


/* ---------- public image uploads ----------
   A form field that carries an image (a teacher avatar, an institution logo) needs
   a real upload: the browser sends the bytes, the server stores the file and hands
   back a path the form submits. This is the same raw-body approach the marketing
   banner already used (no multipart dependency), with three differences that make
   it usable by any admin form:
     - the scope picks the folder, so avatars and logos do not mix;
     - the type is decided by sniffing the magic bytes, never by the extension the
       client claims, so a renamed executable cannot land in a served directory;
     - only images are accepted, and every stored name is random.
   The directory is served statically, which is why the validation is strict: an
   upload that reaches it is publicly readable by design. */
const IMAGE_ROOT = path.join(__dirname, '..', '..', 'uploads', 'images');
const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_SCOPES = ['avatars', 'logos', 'documents'];

const IMAGE_TYPES = [
  { ext: 'jpg', mime: 'image/jpeg', magic: [Buffer.from([0xff, 0xd8, 0xff])] },
  { ext: 'png', mime: 'image/png', magic: [Buffer.from([0x89, 0x50, 0x4e, 0x47])] },
  { ext: 'webp', mime: 'image/webp', magic: [Buffer.from('RIFF', 'ascii'), Buffer.from('WEBP', 'ascii')] },
];

function sniffImage(buf) {
  for (const t of IMAGE_TYPES) {
    if (buf.length < t.magic[0].length) continue;
    if (!buf.slice(0, t.magic[0].length).equals(t.magic[0])) continue;
    // WEBP carries its marker at offset 8, so the RIFF header alone is not enough.
    if (t.ext === 'webp') {
      if (buf.length < 12) continue;
      if (!buf.slice(8, 12).equals(t.magic[1])) continue;
    }
    return t;
  }
  return null;
}

async function uploadImage({ actorUserId, originalName, scope }, fileBuffer) {
  if (!Buffer.isBuffer(fileBuffer) || !fileBuffer.length) throw new ValidationError('Empty file upload.');
  if (fileBuffer.length > IMAGE_MAX_BYTES) throw new ValidationError('Image exceeds the 4 MB limit.');
  const folder = IMAGE_SCOPES.includes(String(scope)) ? String(scope) : 'images';
  const type = sniffImage(fileBuffer);
  if (!type) throw new ValidationError('Unsupported image. Allowed: JPG, PNG, WEBP.');
  const dir = path.join(IMAGE_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  const stored = `${crypto.randomBytes(16).toString('hex')}.${type.ext}`;
  fs.writeFileSync(path.join(dir, stored), fileBuffer);
  const rel = `/uploads/images/${folder}/${stored}`;
  await writeAudit({
    actorUserId, action: 'upload', entityType: 'image', entityId: stored,
    newValues: { mime: type.mime, file_size: fileBuffer.length, scope: folder, original: String(originalName || '') },
  });
  return { path: rel, mime: type.mime, size: fileBuffer.length };
}

module.exports = { listAuditLogs, listSettings, getSetting, updateSetting, dashboardCounts, uploadImage, IMAGE_ROOT };
