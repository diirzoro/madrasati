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
  return rows.map((r) => ({
    id: r.id, code: r.code, name: r.name, callingCode: r.calling_code || null,
    isDefault: Boolean(r.is_default),
  }));
}

// ---------- admin writes (A5 "+") ----------
function requireArName(name, what) {
  const v = String(name || '').trim();
  if (v.length < 2) throw new ValidationError(`Arabic name is required for ${what}.`);
  return v;
}

async function createGovernorate({ name, nameEn, code, countryCode, latitude, longitude }, { actorUserId } = {}) {
  const ar = requireArName(name, 'governorate');
  const dup = await repo.findGovernorateByName(ar);
  if (dup) throw new ConflictError('Governorate already exists.');
  const country = countryCode ? await repo.findCountryByCode(String(countryCode).toUpperCase()) : await repo.findDefaultCountry();
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
  listCountries, listGovernorates, listDistricts, listNeighborhoods,
  createGovernorate, createDistrict, createNeighborhood,
  submitLocationRequest, listLocationRequests, reviewLocationRequest,
};