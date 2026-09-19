// modules/marketing/repository.js
// OWNING MODULE: marketing
// Data access for hero_slides, advertisements and the existing offers table.
// PostgreSQL is the single source of truth for all marketing content.

const { query } = require('../common/pool');
const { parseJson } = require('../common/http');

// ---------------------------------------------------------------------------
// hero_slides
// ---------------------------------------------------------------------------
async function listHeroSlides({ placement, publicOnly = false, status, limit } = {}) {
  const conditions = [];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (placement) {
    params.push([placement]);
    conditions.push(`placement @> $${params.length}::text[]`);
  }
  if (publicOnly) {
    conditions.push(`active = true`);
    conditions.push(`status = 'approved'`);
    conditions.push(`(starts_at IS NULL OR starts_at <= now())`);
    conditions.push(`(ends_at IS NULL OR ends_at >= now())`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM hero_slides ${where} ORDER BY priority DESC, created_at ASC`
    + (limit ? ` LIMIT $${params.length + 1}` : '');
  if (limit) params.push(Number(limit));
  const { rows } = await query(sql, params);
  return rows;
}

async function findHeroSlideById(id) {
  const { rows } = await query(`SELECT * FROM hero_slides WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function countHeroSlides() {
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM hero_slides`);
  return rows[0].count;
}

async function createHeroSlide(fields) {
  const keys = Object.keys(fields);
  const values = keys.map((k) => (fields[k] !== null && typeof fields[k] === 'object' ? JSON.stringify(fields[k]) : fields[k]));
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO hero_slides (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0];
}

async function updateHeroSlide(id, updates) {
  const keys = Object.keys(updates);
  const values = keys.map((k) => (updates[k] !== null && typeof updates[k] === 'object' ? JSON.stringify(updates[k]) : updates[k]));
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  values.push(id);
  const { rows } = await query(
    `UPDATE hero_slides SET ${set}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function deleteHeroSlide(id) {
  const { rows } = await query(`DELETE FROM hero_slides WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// advertisements
// ---------------------------------------------------------------------------
async function listAdvertisements({ placement, publicOnly = false, status, limit } = {}) {
  const conditions = [];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (placement) {
    params.push([placement]);
    conditions.push(`placement @> $${params.length}::text[]`);
  }
  if (publicOnly) {
    conditions.push(`status = 'active'`);
    conditions.push(`(starts_at IS NULL OR starts_at <= now())`);
    conditions.push(`(ends_at IS NULL OR ends_at >= now())`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM advertisements ${where} ORDER BY priority DESC, created_at DESC`
    + (limit ? ` LIMIT $${params.length + 1}` : '');
  if (limit) params.push(Number(limit));
  const { rows } = await query(sql, params);
  return rows;
}

async function findAdvertisementById(id) {
  const { rows } = await query(`SELECT * FROM advertisements WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createAdvertisement(fields) {
  const keys = Object.keys(fields);
  const values = keys.map((k) => (fields[k] !== null && typeof fields[k] === 'object' ? JSON.stringify(fields[k]) : fields[k]));
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO advertisements (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0];
}

async function updateAdvertisement(id, updates) {
  const keys = Object.keys(updates);
  const values = keys.map((k) => (updates[k] !== null && typeof updates[k] === 'object' ? JSON.stringify(updates[k]) : updates[k]));
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  values.push(id);
  const { rows } = await query(
    `UPDATE advertisements SET ${set}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function deleteAdvertisement(id) {
  const { rows } = await query(`DELETE FROM advertisements WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

async function incrementAdvertisementClick(id) {
  const { rows } = await query(
    `UPDATE advertisements SET clicks = clicks + 1 WHERE id = $1 RETURNING id, clicks`,
    [id]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// offers (existing table, now managed by this module)
// ---------------------------------------------------------------------------
async function listOffers({ organizationId, publicOnly = false, limit } = {}) {
  const conditions = [];
  const params = [];
  if (organizationId) {
    params.push(organizationId);
    conditions.push(`organization_id = $${params.length}`);
  }
  if (publicOnly) {
    conditions.push(`active = true`);
    conditions.push(`(starts_at IS NULL OR starts_at <= now())`);
    conditions.push(`(ends_at IS NULL OR ends_at >= now())`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT o.*, org.name AS organization_name
     FROM offers o
     LEFT JOIN organizations org ON org.id = o.organization_id
     ${where}
     ORDER BY (o.ends_at IS NULL), o.ends_at ASC NULLS LAST, o.created_at DESC`
    + (limit ? ` LIMIT $${params.length + 1}` : '');
  if (limit) params.push(Number(limit));
  const { rows } = await query(sql, params);
  return rows;
}

async function findOfferById(id) {
  const { rows } = await query(
    `SELECT o.*, org.name AS organization_name FROM offers o
     LEFT JOIN organizations org ON org.id = o.organization_id
     WHERE o.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function createOffer(fields) {
  const keys = Object.keys(fields);
  const values = keys.map((k) => (fields[k] !== null && typeof fields[k] === 'object' ? JSON.stringify(fields[k]) : fields[k]));
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO offers (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0];
}

async function updateOffer(id, updates) {
  const keys = Object.keys(updates);
  const values = keys.map((k) => (updates[k] !== null && typeof updates[k] === 'object' ? JSON.stringify(updates[k]) : updates[k]));
  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  values.push(id);
  const { rows } = await query(
    `UPDATE offers SET ${set}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function deleteOffer(id) {
  const { rows } = await query(`DELETE FROM offers WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
}

module.exports = {
  parseJson,
  listHeroSlides, findHeroSlideById, countHeroSlides,
  createHeroSlide, updateHeroSlide, deleteHeroSlide,
  listAdvertisements, findAdvertisementById,
  createAdvertisement, updateAdvertisement, deleteAdvertisement, incrementAdvertisementClick,
  listOffers, findOfferById, createOffer, updateOffer, deleteOffer,
};
