// modules/media/repository.js
// OWNING MODULE: media
// The entity media registry. It records WHICH files belong to WHICH entity using
// the existing system_settings key/value store, keyed on the entity id:
//
//   key   = "media:organization:<organization.id>"
//   value = { logo, cover, gallery:[], facilities:[], documents:[], updatedAt }
//
// No schema change is required, and the id — never the name/slug/filename — is
// the authoritative owner. The file bytes are stored under the entity's media
// root; this row records the relationship (entity_type, entity_id, media_type,
// path).

const { query } = require('../common/pool');

function key(orgId) { return `media:organization:${orgId}`; }

async function getRegistry(orgId) {
  const { rows } = await query('SELECT value FROM system_settings WHERE key = $1', [key(orgId)]);
  return (rows[0] && rows[0].value) || { logo: null, cover: null, gallery: [], facilities: [], documents: [] };
}

async function saveRegistry(orgId, value) {
  value.updatedAt = new Date().toISOString();
  await query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key(orgId), JSON.stringify(value)]
  );
  return value;
}

module.exports = { getRegistry, saveRegistry, key };
