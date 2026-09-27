// modules/media/service.js
// OWNING MODULE: media
// Stores an uploaded file under the entity's media root and records the mapping.
//
//   organization.id -> assets/institutions/<type-folder>/<id>[-slug]/<category>/<file>
//
// The destination is derived from the AUTHENTICATED entity id only — never from a
// client-supplied path, name, slug or filename. media.js (the client resolver)
// uses the exact same segment rule, so the two can never disagree.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ValidationError } = require('../common/errors');
const { writeAudit } = require('../common/audit');
const repo = require('./repository');

const TYPE_FOLDER = {
  private_school: 'private-schools',
  government_school: 'government-schools',
  institute: 'institutes',
  college: 'colleges',
  university: 'universities',
};

// media_type -> category folder + registry field. `list:true` appends, otherwise
// the field holds a single value (logo, cover).
const MEDIA_TYPES = {
  logo:     { folder: 'logo',     field: 'logo',     list: false },
  cover:    { folder: 'cover',    field: 'cover',    list: false },
  gallery:  { folder: 'gallery',  field: 'gallery',  list: true },
  facility: { folder: 'facilities', field: 'facilities', list: true },
  document: { folder: 'documents', field: 'documents', list: true },
};

const ASSETS_ROOT = path.join(__dirname, '..', '..', '..', 'design-prototype-v4', 'assets');
const MAX_BYTES = 6 * 1024 * 1024;

const IMAGE_TYPES = [
  { ext: 'jpg', mime: 'image/jpeg', magic: [Buffer.from([0xff, 0xd8, 0xff])] },
  { ext: 'png', mime: 'image/png', magic: [Buffer.from([0x89, 0x50, 0x4e, 0x47])] },
  { ext: 'webp', mime: 'image/webp', magic: [Buffer.from('RIFF', 'ascii'), Buffer.from('WEBP', 'ascii')] },
];

function sniffImage(buf) {
  for (const t of IMAGE_TYPES) {
    if (buf.length < t.magic[0].length) continue;
    if (!buf.slice(0, t.magic[0].length).equals(t.magic[0])) continue;
    if (t.ext === 'webp') {
      if (buf.length < 12) continue;
      if (!buf.slice(8, 12).equals(t.magic[1])) continue;
    }
    return t;
  }
  return null;
}

function slugify(s) {
  const v = String(s || '').trim().toLowerCase();
  if (!v) return '';
  return v.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}
function segment(id, label) {
  const l = slugify(label);
  return l ? `${id}-${l}` : String(id);
}

// Mirrors MadrasatiMedia.resolvePath for an organization.
function orgRootFolder(org) {
  const tf = TYPE_FOLDER[org.type] || 'other';
  return path.posix.join('institutions', tf, segment(org.id, org.slug));
}
function orgMediaRelPath(org, mediaType) {
  const cfg = MEDIA_TYPES[mediaType];
  return 'assets/' + orgRootFolder(org) + '/' + cfg.folder + '/';
}
function orgMediaAbsDir(org, mediaType) {
  const cfg = MEDIA_TYPES[mediaType];
  return path.join(ASSETS_ROOT, 'institutions', TYPE_FOLDER[org.type] || 'other', segment(org.id, org.slug), cfg.folder);
}

async function uploadOrganizationMedia(org, { mediaType, originalName, actorUserId }, fileBuffer) {
  if (!org || !org.id) throw new ValidationError('Organization is required');
  const cfg = MEDIA_TYPES[String(mediaType)];
  if (!cfg) throw new ValidationError('Invalid media type. Use logo|cover|gallery|facility|document.');
  if (!Buffer.isBuffer(fileBuffer) || !fileBuffer.length) throw new ValidationError('Empty file upload.');
  if (fileBuffer.length > MAX_BYTES) throw new ValidationError('File exceeds the 6 MB limit.');
  const type = sniffImage(fileBuffer);
  if (!type) throw new ValidationError('Unsupported image. Allowed: JPG, PNG, WEBP.');

  const dir = orgMediaAbsDir(org, mediaType);
  fs.mkdirSync(dir, { recursive: true });
  const stored = `${crypto.randomBytes(16).toString('hex')}.${type.ext}`;
  fs.writeFileSync(path.join(dir, stored), fileBuffer);

  const rel = orgMediaRelPath(org, mediaType) + stored; // e.g. assets/institutions/.../cover/ab.jpg
  const registry = await repo.getRegistry(org.id);
  if (cfg.list) {
    registry[cfg.field] = (Array.isArray(registry[cfg.field]) ? registry[cfg.field] : []).concat(rel);
  } else {
    registry[cfg.field] = rel;
  }
  await repo.saveRegistry(org.id, registry);

  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'upload',
    entityType: 'organization_media',
    entityId: stored,
    organizationId: org.id,
    newValues: { entity_type: 'organization', entity_id: org.id, media_type: mediaType, path: rel, mime: type.mime, file_size: fileBuffer.length, original: String(originalName || '') },
  });

  return { entityType: 'organization', entityId: org.id, mediaType, path: rel, mime: type.mime, size: fileBuffer.length };
}

module.exports = { uploadOrganizationMedia, orgMediaRelPath, orgRootFolder, MEDIA_TYPES, ASSETS_ROOT, MAX_BYTES };
