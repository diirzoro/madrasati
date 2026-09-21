// modules/academic/service.js
// OWNING MODULE: academic
// Business logic for academic catalog. Read-only in Phase 2B for the catalog
// tables; organization join writes are available for org ownership operations.

const repo = require('./repository');
const { ValidationError, NotFoundError } = require('../common/errors');
const { assertMoney } = require('../common/money');
const { writeAudit } = require('../common/audit');
// organization_fees is owned by the marketplace module; the offering reads and
// writes its stage-scoped rows through that module's repository instead of
// duplicating the money model or the partial-unique-index conflict targets.
const marketplaceRepo = require('../marketplace/repository');

// The global catalog is a price-free, capacity-free definition (AGENTS.md
// rule 1 + migration 030). Nothing in these mappers may carry an amount,
// a currency or a seat count: those belong to the organization offering.
const TRACKS = ['science', 'literary', 'general'];

function mapStage(row) {
  if (!row) return null;
  return {
    id: row.id, code: row.code, name: row.name, description: row.description,
    sortOrder: row.sort_order, isActive: row.is_active,
  };
}

function mapGrade(row) {
  if (!row) return null;
  return {
    id: row.id, code: row.code, name: row.name, description: row.description,
    track: row.track || null, sortOrder: row.sort_order,
    stageId: row.stage_id, stageName: row.stage_name || undefined,
    isActive: row.is_active,
  };
}

function mapSubject(row) {
  if (!row) return null;
  return { id: row.id, name: row.name };
}

function mapCurriculum(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, isActive: row.is_active };
}

function mapLanguage(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, code: row.code, isActive: row.is_active };
}

function mapTeachingMethod(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, slug: row.slug, isActive: row.is_active };
}

async function listStages() { return (await repo.listStages()).map(mapStage); }
async function listGrades(stageId) { return (await repo.listGrades(stageId)).map(mapGrade); }
async function listSubjects() { return (await repo.listSubjects()).map(mapSubject); }
async function listCurricula() { return (await repo.listCurricula()).map(mapCurriculum); }
async function listLanguages() { return (await repo.listLanguages()).map(mapLanguage); }
async function listTeachingMethods() { return (await repo.listTeachingMethods()).map(mapTeachingMethod); }

// ---------- global catalog writes (platform admin only) ----------
// Stage and grade codes are what makes a catalog row referable from an
// organization offering, so a code is required and validated here rather than
// in the browser.
function normalizeCode(code) {
  const v = String(code == null ? '' : code).trim().toUpperCase();
  if (!v) throw new ValidationError('code is required');
  if (!/^[A-Z0-9_-]{2,16}$/.test(v)) {
    throw new ValidationError('code must be 2-16 characters of A-Z, 0-9, "-" or "_"');
  }
  return v;
}

async function createStage(data) {
  const name = String((data && data.name) || '').trim();
  if (!name) throw new ValidationError('name is required');
  const row = await repo.createStage({
    code: normalizeCode(data.code),
    name,
    description: data.description || null,
    sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
  });
  return mapStage(row);
}

async function createGrade(data) {
  const name = String((data && data.name) || '').trim();
  if (!name) throw new ValidationError('name is required');
  if (!data.stageId) throw new ValidationError('stageId is required');
  const track = normalizeTrack(data.track);
  const row = await repo.createGrade({
    stageId: data.stageId,
    code: normalizeCode(data.code),
    name,
    description: data.description || null,
    track,
    sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
  });
  return mapGrade(row);
}

function normalizeTrack(track) {
  if (track === undefined || track === null || track === '' || track === 'none') return null;
  if (TRACKS.indexOf(track) < 0) {
    throw new ValidationError(`track must be one of ${TRACKS.join(', ')}`);
  }
  return track;
}

async function updateGrade(id, data) {
  const fields = {};
  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) throw new ValidationError('name is required');
    fields.name = name;
  }
  if (data.code !== undefined) fields.code = normalizeCode(data.code);
  if (data.description !== undefined) fields.description = data.description || null;
  if (data.track !== undefined) fields.track = normalizeTrack(data.track);
  if (data.sortOrder !== undefined) fields.sort_order = Number(data.sortOrder) || 0;
  if (!Object.keys(fields).length) throw new ValidationError('No editable fields supplied');
  const row = await repo.updateGrade(id, fields);
  if (!row) throw new NotFoundError('Grade not found');
  return mapGrade(row);
}

// org joins (read)
async function listOrgStages(orgId) { return (await repo.listOrgStages(orgId)).map(mapStage); }
async function listOrgGrades(orgId) { return (await repo.listOrgGrades(orgId)).map(mapGrade); }
async function listOrgSubjects(orgId) { return (await repo.listOrgSubjects(orgId)).map(mapSubject); }
async function listOrgCurricula(orgId) { return (await repo.listOrgCurricula(orgId)).map(mapCurriculum); }
async function listOrgLanguages(orgId) { return (await repo.listOrgLanguages(orgId)).map(mapLanguage); }
async function listOrgTeachingMethods(orgId) { return (await repo.listOrgTeachingMethods(orgId)).map(mapTeachingMethod); }

// ---------- organization offering (priced + sized, one institution only) ----------
// Delivery modes are an attribute, never a catalog (AGENTS.md rule 5). The three
// legal values are the whole vocabulary; a status word such as "active" was
// previously accepted here and is explicitly rejected now.
const DELIVERY_MODES = ['on_site', 'online', 'hybrid'];
const OFFERING_CURRENCIES = ['YER', 'SAR', 'USD'];
const OFFERING_LANGUAGES = ['AR', 'EN', 'FR'];
const OFFERING_FREQUENCIES = ['once', 'monthly', 'term', 'yearly'];

function normalizeEnum(value, allowed, field) {
  if (value === undefined || value === null || value === '') return null;
  if (allowed.indexOf(value) < 0) {
    throw new ValidationError(`${field} must be one of ${allowed.join(', ')}`);
  }
  return value;
}

function normalizeCapacity(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new ValidationError('capacity must be a non-negative integer');
  return n;
}

function normalizeMoneyField(value) {
  if (value === undefined || value === null || value === '') return null;
  return assertMoney(value, 'amount');
}

function stageOfferFields(data, { partial }) {
  const fields = {};
  if (data.deliveryMode !== undefined || !partial) {
    const mode = normalizeEnum(data.deliveryMode, DELIVERY_MODES, 'deliveryMode');
    if (mode !== null) fields.delivery_mode = mode;
  }
  if (data.languageCode !== undefined || !partial) {
    const code = normalizeEnum(data.languageCode, OFFERING_LANGUAGES, 'languageCode');
    if (code !== null) fields.language_code = code;
  }
  if (data.capacity !== undefined || !partial) {
    const cap = normalizeCapacity(data.capacity);
    if (cap !== null) fields.capacity = cap;
  }
  if (data.currentStudents !== undefined) {
    const cur = normalizeCapacity(data.currentStudents);
    if (cur !== null) fields.current_students = cur;
  }
  return fields;
}

function subjectOfferFields(data) {
  const fields = {};
  if (data.languageCode !== undefined) {
    const code = normalizeEnum(data.languageCode, OFFERING_LANGUAGES, 'languageCode');
    if (code !== null) fields.language_code = code;
  }
  if (data.currency !== undefined) {
    const cur = normalizeEnum(data.currency, OFFERING_CURRENCIES, 'currency');
    if (cur !== null) fields.currency = cur;
  }
  if (data.frequency !== undefined) {
    const freq = normalizeEnum(data.frequency, OFFERING_FREQUENCIES, 'frequency');
    if (freq !== null) fields.frequency = freq;
  }
  if (data.amount !== undefined) {
    const amount = normalizeMoneyField(data.amount);
    if (amount !== null) fields.fee_amount = amount;
  }
  return fields;
}

function requireMoneyField(data) {
  if (data.amount === undefined || data.amount === null || data.amount === '') {
    throw new ValidationError('amount is required');
  }
  return assertMoney(data.amount, 'amount');
}

// Reads the whole offering of one institution: the stages it offers with their
// price / currency / period / language / delivery / capacity, plus the subject
// offering. Stage prices live in organization_fees (marketplace owns that
// table), so they are merged in here rather than duplicated on the junction.
//
// `canSeePricing` is a server-side decision, never a client hint: an anonymous
// visitor and a client both receive the structure of the offering (so the
// parent search can still show which stages and subjects are taught) with every
// amount removed and `pricingGated` set. Hiding a price in the browser is not
// access control (AGENTS.md rule 7).
async function getOrgOffering(orgId, { canSeePricing = false } = {}) {
  const [stageRows, subjectRows, stageFees] = await Promise.all([
    repo.listOrgStageOffers(orgId),
    repo.listOrgSubjects(orgId),
    canSeePricing ? marketplaceRepo.listStageFees(orgId) : Promise.resolve([]),
  ]);
  const feeByStage = {};
  stageFees.forEach((f) => { feeByStage[f.stage_id] = f; });
  const gated = !canSeePricing;
  return {
    organizationId: orgId,
    pricingGated: gated,
    stages: stageRows.map((r) => {
      const fee = feeByStage[r.stage_id] || null;
      return {
        stageId: r.stage_id, stageCode: r.stage_code, stageName: r.stage_name,
        deliveryMode: r.delivery_mode, languageCode: r.language_code,
        capacity: r.capacity, currentStudents: r.current_students,
        remainingSeats: r.remaining_seats,
        fee: fee ? {
          id: fee.id, amount: fee.amount, currency: fee.currency,
          frequency: fee.frequency, visibility: fee.visibility,
        } : null,
      };
    }),
    subjects: subjectRows.map((r) => ({
      subjectId: r.id, name: r.name, languageCode: r.language_code,
      amount: gated ? null : r.fee_amount, currency: gated ? null : r.currency,
      frequency: gated ? null : r.frequency,
    })),
  };
}

async function setStageOffer(orgId, stageId, data, { actorUserId } = {}) {
  if (!stageId) throw new ValidationError('stageId is required');
  const fields = stageOfferFields(data, { partial: false });
  const amount = requireMoneyField(data);
  const currency = normalizeEnum(data.currency, OFFERING_CURRENCIES, 'currency') || 'YER';
  const frequency = normalizeEnum(data.frequency, OFFERING_FREQUENCIES, 'frequency') || 'yearly';
  const feeName = String(data.feeName || 'Tuition').trim() || 'Tuition';

  const offer = await repo.upsertOrgStageOffer(orgId, stageId, fields);
  await marketplaceRepo.upsertScopedFee({
    organizationId: orgId, feeType: 'tuition', name: feeName,
    amount, currency, frequency, stageId,
  });
  await writeAudit({
    actorUserId: actorUserId || null, action: 'update', entityType: 'organization_stage_offer',
    entityId: offer ? offer.id : stageId, organizationId: orgId,
    newValues: { stageId, ...fields, amount, currency, frequency },
  });
  return (await getOrgOffering(orgId, { canSeePricing: true })).stages.filter((s) => s.stageId === stageId)[0] || null;
}

async function removeStageOffer(orgId, stageId) {
  const removed = await repo.removeOrgStageOffer(orgId, stageId);
  if (!removed) throw new NotFoundError('Stage offer not found');
  return { removed: true };
}

async function setSubjectOffer(orgId, subjectId, data, { actorUserId } = {}) {
  if (!subjectId) throw new ValidationError('subjectId is required');
  const fields = subjectOfferFields(data);
  if (!Object.keys(fields).length) throw new ValidationError('No editable fields supplied');
  const offer = await repo.upsertOrgSubjectOffer(orgId, subjectId, fields);
  if (!offer) throw new NotFoundError('Subject not found for this organization');
  await writeAudit({
    actorUserId: actorUserId || null, action: 'update', entityType: 'organization_subject_offer',
    entityId: offer.id, organizationId: orgId, newValues: { subjectId, ...fields },
  });
  return offer;
}

// Pricing visibility for one institution, decided on the server.
// A platform admin governs every tenant; an owner or active member sees their
// own institution's prices; everyone else (anonymous visitor, client) does not.
async function canSeeOrgPricing(userId, orgId, userRole) {
  if (!userId) return false;
  if (userRole === 'admin') return true;
  const orgRepo = require('../organizations/repository');
  const [isOwner, membership] = await Promise.all([
    orgRepo.isOrganizationOwner(userId, orgId),
    orgRepo.findMembership(userId, orgId),
  ]);
  return Boolean(isOwner || (membership && membership.status === 'active'));
}

async function removeSubjectOffer(orgId, subjectId) {
  const removed = await repo.removeOrgSubjectOffer(orgId, subjectId);
  if (!removed) throw new NotFoundError('Subject offer not found');
  return { removed: true };
}

module.exports = {
  listStages, listGrades, listSubjects, listCurricula, listLanguages, listTeachingMethods,
  createStage, createGrade, updateGrade,
  listOrgStages, listOrgGrades, listOrgSubjects, listOrgCurricula, listOrgLanguages, listOrgTeachingMethods,
  getOrgOffering, setStageOffer, removeStageOffer, setSubjectOffer, removeSubjectOffer,
  canSeeOrgPricing,
};
