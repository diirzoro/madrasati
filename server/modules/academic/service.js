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
    id: row.id, code: row.code, name: row.name, nameEn: row.name_en || null,
    description: row.description,
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
  return {
    id: row.id, name: row.name, description: row.description || null,
    // Scope tells the two subject origins apart on screen: 'global' rows are the
    // platform catalog, 'organization' rows belong to one institution and carry
    // a review state.
    scope: row.organization_id ? 'organization' : 'global',
    organizationId: row.organization_id || null,
    reviewStatus: row.review_status || 'approved',
    reviewNote: row.review_note || null,
  };
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

// The platform admin's supervision queue for the "+" an institution used: every
// subject with an organization_id is a proposal, and the review state decides
// whether it joins that institution's offering. Defaults to the pending ones,
// because an undecided proposal is the only one that needs attention.
async function listOrgSubjectProposals({ reviewStatus = 'pending' } = {}) {
  const rows = await repo.listOrgSubjectProposals({ reviewStatus: reviewStatus || undefined });
  return rows.map((r) => Object.assign(mapSubject(r), {
    organizationId: r.organization_id,
    organizationName: r.organization_name || null,
    organizationType: r.organization_type || null,
  }));
}
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

// A stage is created with its bilingual name and description, and optionally
// with its whole grade ladder in one call ("عدد الصفوف التابعة لها وأسماء
// الصفوف"). The ladder is written into academic_grades, the same grade table the
// global catalog uses, so adding six grades is one atomic definition rather than
// six separate trips to the grades screen.
async function createStage(data) {
  const name = String((data && data.name) || '').trim();
  if (!name) throw new ValidationError('name is required');
  const nameEn = data.nameEn == null ? null : String(data.nameEn).trim() || null;
  const code = normalizeCode(data.code);

  const grades = normalizeGradeLadder(data.grades, code);

  const row = await repo.createStage({
    code,
    name,
    nameEn,
    description: data.description || null,
    sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
  });

  const created = [];
  for (let i = 0; i < grades.length; i += 1) {
    const g = grades[i];
    created.push(await repo.createGrade({
      stageId: row.id,
      code: g.code,
      name: g.name,
      description: null,
      track: normalizeTrack(g.track),
      sortOrder: g.sortOrder == null ? i + 1 : g.sortOrder,
    }));
  }

  return { ...mapStage(row), grades: created.map(mapGrade) };
}

// Accepts either the grade objects the UI builds (name + optional code/track) or
// a plain count. Codes are derived from the stage code when omitted, which is
// what produces G1..G6 for a stage coded SEC, and are upper-cased so they match
// the catalog's code format.
function normalizeGradeLadder(input, stageCode) {
  if (input == null) return [];
  if (!Array.isArray(input)) throw new ValidationError('grades must be an array');
  return input.map((raw, index) => {
    if (typeof raw === 'string') {
      const n = String(raw).trim();
      if (!n) throw new ValidationError(`grades[${index}] is empty`);
      return { name: n, code: `${stageCode}${index + 1}`.slice(0, 16), sortOrder: index + 1 };
    }
    const name = String((raw && raw.name) || '').trim();
    if (!name) throw new ValidationError(`grades[${index}].name is required`);
    const code = raw.code ? normalizeCode(raw.code) : `${stageCode}${index + 1}`.slice(0, 16);
    return { name, code, track: raw.track, sortOrder: raw.sortOrder };
  });
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
async function listOrgSubjects(orgId) {
  return (await repo.listOrgSubjects(orgId)).map((row) => ({
    ...mapSubject(row),
    languageCode: row.language_code || null,
    amount: row.fee_amount == null ? null : Number(row.fee_amount),
    currency: row.currency || null,
    frequency: row.frequency || null,
  }));
}

/* ---------- institution's own subjects (the "+" quick add) ----------
   A school sometimes teaches something the global catalog has no row for. It may
   add it for itself; the row lands in the same `subjects` table with its own
   organization_id and starts as 'pending', so the platform admin keeps the
   supervision the charter asks for while the school can use it immediately. */

async function createOrgSubject(orgId, data, { actorUserId } = {}) {
  const name = String((data && data.name) || '').trim();
  if (name.length < 2) throw new ValidationError('name is required and must be at least 2 characters');

  const row = await repo.createOrgSubject({
    organizationId: orgId,
    name,
    slug: await uniqueOrgSubjectSlug(orgId, name),
    description: data.description || null,
    createdBy: actorUserId || null,
  });
  // The subject exists to be offered, so it is linked to the institution in the
  // same operation; leaving it unlinked would create an orphan catalog row.
  await repo.upsertOrgSubjectOffer(orgId, row.id, {
    language_code: normalizeEnum(data.languageCode, OFFERING_LANGUAGES, 'languageCode'),
    fee_amount: data.amount == null || data.amount === '' ? null : assertMoney(data.amount, 'amount'),
    currency: normalizeEnum(data.currency, OFFERING_CURRENCIES, 'currency') || 'YER',
    frequency: normalizeEnum(data.frequency, OFFERING_FREQUENCIES, 'frequency'),
  });

  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'create',
    objectType: 'organization_subject',
    objectId: String(row.id),
    metadata: { organizationId: orgId, name },
  });

  return { ...mapSubject(row), organizationId: orgId };
}

// slugs are globally unique on `subjects`, so an institution's subject carries a
// short owner discriminator. That keeps the constraint intact instead of
// rewriting it, and makes a collision between two schools' "Robotics" harmless.
async function uniqueOrgSubjectSlug(orgId, name) {
  const base = String(name).trim().toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'subject';
  const owner = String(orgId).replace(/-/g, '').slice(0, 8);
  let candidate = `org-${owner}-${base}`;
  let n = 1;
  while (await repo.findSubjectBySlug(candidate)) {
    n += 1;
    candidate = `org-${owner}-${base}-${n}`;
  }
  return candidate;
}

// Platform admin supervision: approve or reject a subject an institution added.
// Only organization-scoped rows can be reviewed -- a global catalog subject is
// not up for review by anyone.
async function reviewOrgSubject(subjectId, data, { actorUserId } = {}) {
  const status = normalizeEnum(data && data.status, ['pending', 'approved', 'rejected'], 'status');
  if (!status) throw new ValidationError('status must be pending, approved or rejected');
  const row = await repo.reviewSubject(subjectId, { status, note: data && data.note });
  if (!row) throw new NotFoundError('Institution subject not found');
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'review',
    objectType: 'organization_subject',
    objectId: String(subjectId),
    metadata: { status, organizationId: row.organization_id },
  });
  return mapSubject(row);
}

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
      scope: r.organization_id ? 'organization' : 'global',
      reviewStatus: r.review_status || 'approved',
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
  listStages, listGrades, listSubjects, listOrgSubjectProposals, listCurricula, listLanguages, listTeachingMethods,
  createStage, createGrade, updateGrade,
  createOrgSubject, reviewOrgSubject,
  listOrgStages, listOrgGrades, listOrgSubjects, listOrgCurricula, listOrgLanguages, listOrgTeachingMethods,
  getOrgOffering, setStageOffer, removeStageOffer, setSubjectOffer, removeSubjectOffer,
  canSeeOrgPricing,
};
