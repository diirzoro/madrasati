// modules/locations/repository.js
// OWNING MODULE: locations
// Shared reference: read-only catalog queries for location hierarchy.
// Scope: GLOBAL (location data is cross-organization).

const { query } = require('../common/pool');

async function listCountries() {
  const { rows } = await query(`SELECT * FROM locations_countries WHERE is_active = true ORDER BY sort_order, name`);
  return rows;
}

// The countries list is small and reference-only, but the admin screen also has
// to show a country it just created and one it has deactivated, so the admin
// read does not filter on is_active.
async function listAllCountries() {
  const { rows } = await query(`SELECT * FROM locations_countries ORDER BY sort_order, name`);
  return rows;
}

async function insertCountry({ code, name, nameEn, callingCode, sortOrder }) {
  const { rows } = await query(
    `INSERT INTO locations_countries (code, name, name_en, calling_code, sort_order, is_default, is_active)
     VALUES ($1,$2,$3,$4,$5,false,true) RETURNING *`,
    [code || null, name, nameEn || null, callingCode || null, sortOrder || 0]
  );
  return rows[0];
}

async function updateCountry(id, { code, name, nameEn, callingCode, sortOrder, isActive }) {
  const { rows } = await query(
    `UPDATE locations_countries
        SET code = COALESCE($2, code),
            name = COALESCE($3, name),
            name_en = COALESCE($4, name_en),
            calling_code = COALESCE($5, calling_code),
            sort_order = COALESCE($6, sort_order),
            is_active = COALESCE($7, is_active)
      WHERE id = $1 RETURNING *`,
    [id, code ?? null, name ?? null, nameEn ?? null, callingCode ?? null, sortOrder ?? null, isActive ?? null]
  );
  return rows[0] || null;
}

async function findCountryById(id) {
  const { rows } = await query(`SELECT * FROM locations_countries WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findCountryByName(name) {
  const { rows } = await query(`SELECT * FROM locations_countries WHERE name = $1`, [name]);
  return rows[0] || null;
}

async function listGovernorates() {
  const { rows } = await query(
    `SELECT g.*, c.code AS country_code
     FROM locations_governorates g
     LEFT JOIN locations_countries c ON c.id = g.country_id
     WHERE g.is_active = true
     ORDER BY g.sort_order, g.name`
  );
  return rows;
}

async function findGovernorateById(id) {
  const { rows } = await query(`SELECT * FROM locations_governorates WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findGovernorateByCode(code) {
  const { rows } = await query(`SELECT * FROM locations_governorates WHERE code = $1`, [code]);
  return rows[0] || null;
}

async function listDistricts(governorateId) {
  const conditions = [];
  const params = [];
  if (governorateId) {
    params.push(governorateId);
    conditions.push(`d.governorate_id = $${params.length}`);
  }
  params.push(true);
  conditions.push(`d.is_active = $${params.length}`);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT d.* FROM locations_districts d ${where} ORDER BY d.sort_order, d.name`,
    params
  );
  return rows;
}

async function findDistrictById(id) {
  const { rows } = await query(`SELECT * FROM locations_districts WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findDistrictByCode(code) {
  const { rows } = await query(`SELECT * FROM locations_districts WHERE code = $1`, [code]);
  return rows[0] || null;
}

async function listNeighborhoods(districtId) {
  const conditions = [];
  const params = [];
  if (districtId) {
    params.push(districtId);
    conditions.push(`n.district_id = $${params.length}`);
  }
  params.push(true);
  conditions.push(`n.is_active = $${params.length}`);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT n.* FROM locations_neighborhoods n ${where} ORDER BY n.sort_order, n.name`,
    params
  );
  return rows;
}

async function findNeighborhoodByCode(code) {
  const { rows } = await query(`SELECT * FROM locations_neighborhoods WHERE code = $1`, [code]);
  return rows[0] || null;
}

// ---------- admin writes + request workflow (A5) ----------
async function findCountryByCode(code) {
  const { rows } = await query(`SELECT * FROM locations_countries WHERE code = $1`, [code]);
  return rows[0] || null;
}

async function findDefaultCountry() {
  const { rows } = await query(`SELECT * FROM locations_countries WHERE is_default = true ORDER BY id LIMIT 1`);
  if (rows[0]) return rows[0];
  const ye = await query(`SELECT * FROM locations_countries WHERE code = 'YE' LIMIT 1`);
  return ye.rows[0] || null;
}

async function findGovernorateByName(name) {
  const { rows } = await query(`SELECT * FROM locations_governorates WHERE name = $1`, [name]);
  return rows[0] || null;
}

async function findDistrictByName(governorateId, name) {
  const { rows } = await query(`SELECT * FROM locations_districts WHERE governorate_id = $1 AND name = $2`, [governorateId, name]);
  return rows[0] || null;
}

async function findNeighborhoodByName(districtId, name) {
  const { rows } = await query(`SELECT * FROM locations_neighborhoods WHERE district_id = $1 AND name = $2`, [districtId, name]);
  return rows[0] || null;
}

async function insertGovernorate({ name, nameEn, code, pcode, countryId, latitude, longitude }) {
  const { rows } = await query(
    `INSERT INTO locations_governorates (name, name_en, code, pcode, country_id, latitude, longitude, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
    [name, nameEn || null, code || null, pcode || null, countryId || null, latitude || null, longitude || null]
  );
  return rows[0];
}

async function insertDistrict({ governorateId, name, nameEn, code, pcode, latitude, longitude }) {
  const { rows } = await query(
    `INSERT INTO locations_districts (governorate_id, name, name_en, code, pcode, latitude, longitude, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
    [governorateId, name, nameEn || null, code || null, pcode || null, latitude || null, longitude || null]
  );
  return rows[0];
}

async function insertNeighborhood({ districtId, name, nameEn, code, latitude, longitude }) {
  const { rows } = await query(
    `INSERT INTO locations_neighborhoods (district_id, name, name_en, code, latitude, longitude, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING *`,
    [districtId, name, nameEn || null, code || null, latitude || null, longitude || null]
  );
  return rows[0];
}

async function insertLocationRequest({ kind, nameAr, nameEn, code, countryCode, governorateId, districtId, notes, submittedBy }) {
  const { rows } = await query(
    `INSERT INTO location_requests (kind, name_ar, name_en, code, country_code, parent_governorate_id, parent_district_id, notes, submitted_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [kind, nameAr, nameEn || null, code || null, countryCode || null, governorateId || null, districtId || null, notes || null, submittedBy || null]
  );
  return rows[0];
}

async function listLocationRequests({ status } = {}) {
  const params = [];
  let where = '';
  if (status) { params.push(status); where = `WHERE r.status = $1`; }
  const { rows } = await query(
    `SELECT r.*, g.name AS governorate_name, d.name AS district_name
     FROM location_requests r
     LEFT JOIN locations_governorates g ON g.id = r.parent_governorate_id
     LEFT JOIN locations_districts d ON d.id = r.parent_district_id
     ${where} ORDER BY r.created_at DESC`,
    params
  );
  return rows;
}

async function findLocationRequestById(id) {
  const { rows } = await query(`SELECT * FROM location_requests WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function updateLocationRequest(id, { status, reviewedBy, reviewNotes }) {
  const { rows } = await query(
    `UPDATE location_requests SET status = $2, reviewed_by = $3, reviewed_at = now(), review_notes = $4
     WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id, status, reviewedBy || null, reviewNotes || null]
  );
  return rows[0] || null;
}

module.exports = {
  listCountries,
  listAllCountries,
  insertCountry,
  updateCountry,
  findCountryById,
  findCountryByName,
  findCountryByCode,
  findDefaultCountry,
  listGovernorates,
  findGovernorateById,
  findGovernorateByCode,
  findGovernorateByName,
  listDistricts,
  findDistrictById,
  findDistrictByCode,
  findDistrictByName,
  listNeighborhoods,
  findNeighborhoodByCode,
  findNeighborhoodByName,
  insertGovernorate,
  insertDistrict,
  insertNeighborhood,
  insertLocationRequest,
  listLocationRequests,
  findLocationRequestById,
  updateLocationRequest,
};