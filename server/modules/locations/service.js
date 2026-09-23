// modules/locations/service.js
// OWNING MODULE: locations
// Business logic for location catalog: public reads, admin-only writes,
// and the controlled missing-location request workflow (A5).

const repo = require('./repository');
const { NotFoundError, ValidationError, ConflictError } = require('../common/errors');
const { writeAudit } = require('../common/audit');

function mapGov(row) {
  if (!row) return null;
  return { id: row.id, code: row.code, pcode: row.pcode || null, name: row.name, nameEn: row.name_en || null, latitude: row.latitude, longitude: row.longitude, countryCode: row.country_code || null };
}

function mapDistrict(row) {
  if (!row) return null;
  return { id: row.id, governorateId: row.governorate_id, code: row.code, pcode: row.pcode || null, name: row.name, nameEn: row.name_en || null, latitude: row.latitude, longitude: row.longitude };
}

function mapNeighborhood(row) {
  if (!row) return null;
  return { id: row.id, districtId: row.district_id, code: row.code, name: row.name, nameEn: row.name_en || null, latitude: row.latitude, longitude: row.longitude };
}

async function listGovernorates() {
  const rows = await repo.listGovernorates();
  return rows.map(mapGov);
}

async function listDistricts({ governorate, governorateId } = {}) {
  let id = governorateId;
  if (!id && governorate) {
    const g = await repo.findGovernorateByCode(governorate);
    if (!g) throw new NotFoundError('Governorate not found');
    id = g.id;
  }
  const rows = await repo.listDistricts(id);
  return rows.map(mapDistrict);
}

async function listNeighborhoods({ district, districtId } = {}) {
  let id = districtId;
  if (!id && district) {
    const d = await repo.findDistrictByCode(district);
    if (!d) throw new NotFoundError('District not found');
    id = d.id;
  }
  const rows = await repo.listNeighborhoods(id);
  return rows.map(mapNeighborhood);
}

async function listCountries() {
  const rows = await repo.listCountries();
  return rows.map(mapCountry);
}

function mapCountry(r) {
  if (!r) return null;
  return {
    id: r.id, code: r.code, name: r.name, nameEn: r.name_en || null,
    callingCode: r.calling_code || null, isDefault: Boolean(r.is_default),
    isActive: r.is_active !== false, sortOrder: Number(r.sort_order || 0),
    governorateCount: r.governorate_count == null ? undefined : Number(r.governorate_count),
  };
}

// Admin read: includes inactive countries so a deactivated one can be re-enabled
// instead of disappearing from the screen that manages it.
async function listAllCountries() {
  const rows = await repo.listAllCountries();
  return rows.map(mapCountry);
}

const ISO2 = /^[A-Z]{2}$/;
const CALLING_CODE = /^[0-9]{1,4}$/;

// A country is the root of the location tree (country -> governorate -> district
// -> neighborhood), so it is the one row every other location depends on. The
// Arabic name is required — it is what the RTL shell renders — and the ISO code
// plus the calling code are validated here rather than left to the UNIQUE
// constraint, so the admin form gets a readable message instead of a 500.
async function createCountry({ name, nameEn, code, callingCode, sortOrder }, { actorUserId } = {}) {
  const ar = requireArName(name, 'country');
  const duplicate = await repo.findCountryByName(ar);
  if (duplicate) throw new ConflictError('Country already exists.');

  let iso = null;
  if (code !== undefined && code !== null && String(code).trim() !== '') {
    iso = String(code).trim().toUpperCase();
    if (!ISO2.test(iso)) throw new ValidationError('Country code must be two Latin letters (ISO 3166-1 alpha-2).');
    const clash = await repo.findCountryByCode(iso);
    if (clash) throw new ConflictError('Country code is already in use.');
  }

  let calling = null;
  if (callingCode !== undefined && callingCode !== null && String(callingCode).trim() !== '') {
    calling = String(callingCode).trim().replace(/^\+/, '');
    if (!CALLING_CODE.test(calling)) throw new ValidationError('Calling code must be 1 to 4 digits.');
  }

  const row = await repo.insertCountry({
    code: iso, name: ar,
    nameEn: nameEn ? String(nameEn).trim() || null : null,
    callingCode: calling,
    sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
  });
  await writeAudit({ actorUserId: actorUserId || null, action: 'create', entityType: 'country', entityId: String(row.id), newValues: { name: ar, code: iso } });
  return mapCountry(row);
}

async function updateCountry(id, data = {}, { actorUserId } = {}) {
  const existing = await repo.findCountryById(Number(id));
  if (!existing) throw new NotFoundError('Country not found');

  const fields = {};
  if (data.name !== undefined) fields.name = requireArName(data.name, 'country');
  if (data.nameEn !== undefined) fields.nameEn = data.nameEn ? String(data.nameEn).trim() || null : null;
  if (data.code !== undefined) {
    if (data.code === null || String(data.code).trim() === '') fields.code = null;
    else {
      const iso = String(data.code).trim().toUpperCase();
      if (!ISO2.test(iso)) throw new ValidationError('Country code must be two Latin letters (ISO 3166-1 alpha-2).');
      const clash = await repo.findCountryByCode(iso);
      if (clash && Number(clash.id) !== Number(id)) throw new ConflictError('Country code is already in use.');
      fields.code = iso;
    }
  }
  if (data.callingCode !== undefined) {
    if (data.callingCode === null || String(data.callingCode).trim() === '') fields.callingCode = null;
    else {
      const calling = String(data.callingCode).trim().replace(/^\+/, '');
      if (!CALLING_CODE.test(calling)) throw new ValidationError('Calling code must be 1 to 4 digits.');
      fields.callingCode = calling;
    }
  }
  if (data.sortOrder !== undefined) fields.sortOrder = Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0;
  if (data.isActive !== undefined) fields.isActive = Boolean(data.isActive);

  // The country every organization and teacher already points at cannot be
  // deactivated out from under them; the default row is the fallback the
  // governorate cascade resolves to when no country is given.
  if (fields.isActive === false && existing.is_default) {
    throw new ValidationError('The default country cannot be deactivated.');
  }

  const row = await repo.updateCountry(Number(id), fields);
  await writeAudit({ actorUserId: actorUserId || null, action: 'update', entityType: 'country', entityId: String(id), newValues: fields });
  return mapCountry(row);
}

// ---------- admin writes (A5 "+") ----------
function requireArName(name, what) {
  const v = String(name || '').trim();
  if (v.length < 2) throw new ValidationError(`Arabic name is required for ${what}.`);
  return v;
}

async function createGovernorate({ name, nameEn, code, countryCode, countryId, latitude, longitude }, { actorUserId } = {}) {
  const ar = requireArName(name, 'governorate');
  const dup = await repo.findGovernorateByName(ar);
  if (dup) throw new ConflictError('Governorate already exists.');
  // The cascade adds a governorate from the country it belongs to, so a numeric
  // countryId is accepted alongside the ISO countryCode the older callers send.
  // With neither, the default country is used, which is the previous behaviour.
  let country = null;
  if (countryId !== undefined && countryId !== null && String(countryId).trim() !== '') {
    country = await repo.findCountryById(Number(countryId));
    if (!country) throw new ValidationError('Parent country does not exist.');
  } else {
    country = countryCode ? await repo.findCountryByCode(String(countryCode).toUpperCase()) : await repo.findDefaultCountry();
  }
  const row = await repo.insertGovernorate({
    name: ar, nameEn: nameEn ? String(nameEn).trim() || null : null,
    code: code ? String(code).trim() || null : null,
    countryId: country ? country.id : null,
    latitude: latitude !== undefined ? latitude : null,
    longitude: longitude !== undefined ? longitude : null,
  });
  await writeAudit({ actorUserId: actorUserId || null, action: 'create', entityType: 'governorate', entityId: String(row.id), newValues: { name: ar } });
  return mapGov(row);
}

async function createDistrict({ governorateId, name, nameEn, code, latitude, longitude }, { actorUserId } = {}) {
  const ar = requireArName(name, 'district');
  const gov = await repo.findGovernorateById(Number(governorateId));
  if (!gov) throw new ValidationError('Parent governorate does not exist.');
  const dup = await repo.findDistrictByName(gov.id, ar);
  if (dup) throw new ConflictError('District already exists in this governorate.');
  const row = await repo.insertDistrict({
    governorateId: gov.id, name: ar,
    nameEn: nameEn ? String(nameEn).trim() || null : null,
    code: code ? String(code).trim() || null : null,
    latitude: latitude !== undefined ? latitude : null,
    longitude: longitude !== undefined ? longitude : null,
  });
  await writeAudit({ actorUserId: actorUserId || null, action: 'create', entityType: 'district', entityId: String(row.id), newValues: { name: ar, governorate_id: gov.id } });
  return mapDistrict(row);
}

async function createNeighborhood({ districtId, name, nameEn, code, latitude, longitude }, { actorUserId } = {}) {
  const ar = requireArName(name, 'neighborhood');
  const dist = await repo.findDistrictById(Number(districtId));
  if (!dist) throw new ValidationError('Parent district does not exist.');
  const dup = await repo.findNeighborhoodByName(dist.id, ar);
  if (dup) throw new ConflictError('Neighborhood already exists in this district.');
  const row = await repo.insertNeighborhood({
    districtId: dist.id, name: ar,
    nameEn: nameEn ? String(nameEn).trim() || null : null,
    code: code ? String(code).trim() || null : null,
    latitude: latitude !== undefined ? latitude : null,
    longitude: longitude !== undefined ? longitude : null,
  });
  await writeAudit({ actorUserId: actorUserId || null, action: 'create', entityType: 'neighborhood', entityId: String(row.id), newValues: { name: ar, district_id: dist.id } });
  return mapNeighborhood(row);
}

// ---------- missing-location requests ----------
const VALID_KINDS = ['governorate', 'district', 'neighborhood'];

async function submitLocationRequest(data, { userId } = {}) {
  const kind = data.kind;
  if (!VALID_KINDS.includes(kind)) throw new ValidationError('Invalid location kind.');
  const nameAr = requireArName(data.nameAr, kind);
  let govId = null; let distId = null; let countryCode = null;
  if (kind === 'governorate') {
    countryCode = data.countryCode ? String(data.countryCode).toUpperCase() : 'YE';
    const dup = await repo.findGovernorateByName(nameAr);
    if (dup) throw new ConflictError('This governorate already exists.');
  } else {
    govId = data.governorateId ? Number(data.governorateId) : null;
    const gov = govId ? await repo.findGovernorateById(govId) : null;
    if (!gov) throw new ValidationError('Parent governorate is required.');
    if (kind === 'district') {
      const dup = await repo.findDistrictByName(gov.id, nameAr);
      if (dup) throw new ConflictError('This district already exists.');
    } else {
      distId = data.districtId ? Number(data.districtId) : null;
      const dist = distId ? await repo.findDistrictById(distId) : null;
      if (!dist || dist.governorate_id !== gov.id) throw new ValidationError('Parent district is required and must belong to the governorate.');
      const dup = await repo.findNeighborhoodByName(dist.id, nameAr);
      if (dup) throw new ConflictError('This neighborhood already exists.');
    }
  }
  const row = await repo.insertLocationRequest({
    kind, nameAr, nameEn: data.nameEn ? String(data.nameEn).trim() || null : null,
    code: data.code ? String(data.code).trim() || null : null,
    countryCode, governorateId: govId, districtId: distId,
    notes: data.notes ? String(data.notes).trim() || null : null,
    submittedBy: userId || null,
  });
  return row;
}

async function listLocationRequests({ status } = {}) {
  return repo.listLocationRequests({ status });
}

async function reviewLocationRequest(id, { decision, reviewNotes }, { actorUserId } = {}) {
  if (!['approved', 'rejected'].includes(decision)) throw new ValidationError('Decision must be approved or rejected.');
  const req = await repo.findLocationRequestById(id);
  if (!req) throw new NotFoundError('Location request not found');
  if (req.status !== 'pending') throw new ConflictError('Request was already reviewed.');
  let created = null;
  if (decision === 'approved') {
    if (req.kind === 'governorate') {
      created = await repo.insertGovernorate({
        name: req.name_ar, nameEn: req.name_en, code: req.code,
        countryId: req.country_code ? (await repo.findCountryByCode(req.country_code) || {}).id || null : null,
      });
    } else if (req.kind === 'district') {
      created = await repo.insertDistrict({
        governorateId: req.parent_governorate_id, name: req.name_ar, nameEn: req.name_en, code: req.code,
      });
    } else {
      created = await repo.insertNeighborhood({
        districtId: req.parent_district_id, name: req.name_ar, nameEn: req.name_en, code: req.code,
      });
    }
  }
  const updated = await repo.updateLocationRequest(id, {
    status: decision, reviewedBy: actorUserId || null, reviewNotes: reviewNotes || null,
  });
  await writeAudit({
    actorUserId: actorUserId || null, action: decision === 'approved' ? 'approve' : 'reject',
    entityType: 'location_request', entityId: String(id),
    newValues: { kind: req.kind, name: req.name_ar, created_id: created ? created.id : null },
  });
  return { request: updated, created };
}

module.exports = {
  listCountries, listAllCountries, createCountry, updateCountry,
  listGovernorates, listDistricts, listNeighborhoods,
  createGovernorate, createDistrict, createNeighborhood,
  submitLocationRequest, listLocationRequests, reviewLocationRequest,
};