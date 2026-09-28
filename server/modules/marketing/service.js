// modules/marketing/service.js
// OWNING MODULE: marketing
// Business logic + DTO mapping for hero slides, advertisements and offers.
// Public reads only ever expose eligible (approved/active, within window)
// records. All writes are Super-Admin only (enforced at the router).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const repo = require('./repository');
const orgsRepo = require('../organizations/repository');
const { ValidationError, NotFoundError } = require('../common/errors');
const { writeAudit } = require('../common/audit');

const SLIDE_TYPES = ['platform', 'promotion', 'premium_ad'];
const SLIDE_STATUSES = ['draft', 'approved', 'paused', 'rejected', 'expired'];
const AD_TYPES = ['general', 'promotion', 'enrollment', 'notice'];
const AD_BILLING = ['free', 'paid'];
// Stored workflow statuses. The display states `scheduled`, `active` and
// `expired` are DERIVED from `approved` + the start/end window (see
// effectiveStatus) and never stored, so they cannot contradict the schedule.
const AD_STATUSES = ['pending', 'approved', 'paused', 'rejected', 'cancelled', 'archived'];
const AD_REVIEW_DECISIONS = ['approve', 'reject', 'request_changes'];
// Each concept has exactly one real placement today: hero_slides render in the
// landing hero (`public_hero`, consumed by hero-slides.js) and advertisements
// render in the scrolling ticker (`ticker`, consumed by app.js). `banner` and
// `sidebar` were exposed in the picker before any frontend rendered them, which
// let an administrator select a placement that did nothing. Only genuine,
// rendered placements are exposed, per the audit.
const SLIDE_PLACEMENTS = ['public_hero'];
const AD_PLACEMENTS = ['ticker'];
// Internal CTA destinations must stay on approved public routes.
const ALLOWED_CTA_ROUTES = ['home', 'private', 'government', 'colleges', 'institutes', 'teachers', 'schools', 'login'];
const MAX_HERO_SLIDES = 6;

const BANNER_ROOT = path.join(__dirname, '..', '..', 'uploads', 'marketing');
const BANNER_MAX_BYTES = 8 * 1024 * 1024;
const BANNER_TYPES = {
  jpg: { mime: 'image/jpeg', magic: [Buffer.from([0xff, 0xd8, 0xff])] },
  jpeg: { mime: 'image/jpeg', magic: [Buffer.from([0xff, 0xd8, 0xff])] },
  png: { mime: 'image/png', magic: [Buffer.from([0x89, 0x50, 0x4e, 0x47])] },
  webp: { mime: 'image/webp', magic: [Buffer.from('RIFF')], magic2: [Buffer.from('WEBP')] },
};

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------
function mapHeroSlide(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.slide_type,
    source: 'remote',
    titleAr: row.title_ar || '',
    titleEn: row.title_en || '',
    subtitleAr: row.subtitle_ar || '',
    subtitleEn: row.subtitle_en || '',
    badgeAr: row.badge_ar || '',
    badgeEn: row.badge_en || '',
    image: row.image || '',
    imagePosition: row.image_position || 'center',
    overlayTitleAr: row.overlay_title_ar || '',
    overlayTitleEn: row.overlay_title_en || '',
    locationAr: row.location_ar || '',
    locationEn: row.location_en || '',
    ctaLabelAr: row.cta_label_ar || '',
    ctaLabelEn: row.cta_label_en || '',
    ctaRoute: row.cta_route || '',
    ctaUrl: row.cta_url || '',
    priority: row.priority || 0,
    placement: row.placement || [],
    status: row.status,
    startAt: row.starts_at,
    endAt: row.ends_at,
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// The display state is a pure function of the stored status plus the schedule.
// A row stores only `pending | approved | paused | rejected | cancelled |
// archived`; `approved` then resolves to scheduled / active / expired from
// starts_at / ends_at so the public eligibility rule has exactly one source.
function effectiveStatus(row) {
  if (!row) return null;
  if (row.status === 'approved') {
    const now = Date.now();
    if (row.ends_at && new Date(row.ends_at).getTime() < now) return 'expired';
    if (row.starts_at && new Date(row.starts_at).getTime() > now) return 'scheduled';
    return 'active';
  }
  return row.status;
}

function mapAdvertisement(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    advertiser: row.advertiser || '',
    organizationId: row.organization_id || null,
    organizationName: row.organization_name || '',
    organizationType: row.organization_type || '',
    organizationSlug: row.organization_slug || '',
    teacherId: row.teacher_id || null,
    teacherName: row.teacher_name || '',
    adType: row.ad_type,
    billingMode: row.billing_mode,
    status: row.status,
    effectiveStatus: effectiveStatus(row),
    placement: row.placement || [],
    startAt: row.starts_at,
    endAt: row.ends_at,
    image: row.image || '',
    targetUrl: row.target_url || '',
    targetRoute: row.target_route || '',
    messageAr: row.message_ar || '',
    messageEn: row.message_en || '',
    priority: row.priority || 0,
    notes: row.notes || '',
    impressions: row.impressions || 0,
    clicks: row.clicks || 0,
    submittedBy: row.submitted_by || null,
    submittedAt: row.submitted_at || null,
    reviewedBy: row.reviewed_by || null,
    reviewedAt: row.reviewed_at || null,
    reviewNotes: row.review_notes || '',
    rejectionReason: row.rejection_reason || '',
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOffer(row) {
  if (!row) return null;
  const discount = row.discount_percent == null ? null : Number(row.discount_percent);
  return {
    id: row.id,
    organizationId: row.organization_id || null,
    organizationName: row.organization_name || '',
    title: row.title || '',
    titleEn: row.title_en || '',
    description: row.description || '',
    descriptionEn: row.description_en || '',
    discountPercent: discount,
    startAt: row.starts_at,
    endAt: row.ends_at,
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function asString(v) {
  if (v === undefined || v === null) return null;
  return String(v);
}

function normalizePlacement(value, fallback, allowed) {
  if (value === undefined || value === null || value === '') return fallback;
  const list = (Array.isArray(value) ? value : [value]).map((v) => String(v).trim()).filter(Boolean);
  const invalid = list.filter((v) => !allowed.includes(v));
  if (invalid.length) throw new ValidationError(`Invalid placement: ${invalid.join(', ')}`);
  return list.length ? list : fallback;
}

function normalizeDate(value, field) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) throw new ValidationError(`Invalid ${field}`);
  return new Date(t).toISOString();
}

function normalizeRoute(value) {
  if (value === undefined) return undefined;
  const v = asString(value);
  if (!v) return null;
  if (!ALLOWED_CTA_ROUTES.includes(v)) throw new ValidationError(`Invalid route: ${v}`);
  return v;
}

function normalizeHttps(value, field) {
  if (value === undefined) return undefined;
  const v = asString(value);
  if (!v) return null;
  if (!/^https:\/\//i.test(v) || /["'<>]/.test(v)) throw new ValidationError(`${field} must be a valid https:// URL`);
  return v;
}

function normalizeInt(value, field) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new ValidationError(`Invalid ${field}`);
  return Math.trunc(n);
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------
async function listPublicHeroSlides(placement = 'public_hero') {
  const rows = await repo.listHeroSlides({ placement, publicOnly: true });
  return rows.map(mapHeroSlide);
}

async function listPublicAdvertisements(placement = 'ticker', limit) {
  const rows = await repo.listAdvertisements({ placement, publicOnly: true, limit });
  return rows.map(mapAdvertisement);
}

async function listPublicOffers(organizationId) {
  if (!organizationId) throw new ValidationError('organizationId is required');
  const rows = await repo.listOffers({ organizationId, publicOnly: true });
  return rows.map(mapOffer);
}

// A click only counts for an advertisement a visitor could actually see. A
// pending, rejected, paused, cancelled, archived, or out-of-window ad is
// refused here rather than silently incrementing a number nobody earned.
async function recordAdvertisementClick(id) {
  const eligible = await repo.findPublicAdvertisementById(id);
  if (!eligible) throw new NotFoundError('Advertisement not found');
  const row = await repo.incrementAdvertisementClick(id);
  if (!row) throw new NotFoundError('Advertisement not found');
  return { id: row.id, clicks: row.clicks };
}

// An impression is "the advertisement was shown to a user", recorded only when
// the frontend actually renders eligible ads — never on a raw page load, and
// never when an admin previews. Clicks and impressions stay separate: CTR is
// derived from them and is never fabricated. Same eligibility gate as a click.
async function recordAdvertisementImpression(id) {
  const eligible = await repo.findPublicAdvertisementById(id);
  if (!eligible) throw new NotFoundError('Advertisement not found');
  const row = await repo.incrementAdvertisementImpression(id);
  if (!row) throw new NotFoundError('Advertisement not found');
  return { id: row.id, impressions: row.impressions };
}

// The «المعلن» dropdown: institution owners (their institutions) and private
// teachers, so an advertisement names a real advertiser instead of free text.
function mapAdvertiserOrganization(o) {
  return { kind: 'organization', id: o.id, name: o.name || '', ownerName: o.owner_name || null };
}
function mapAdvertiserTeacher(t) {
  return { kind: 'teacher', id: t.user_id, name: t.name || t.name_en || 'Teacher', nameEn: t.name_en || null };
}
async function listAdvertisers() {
  const { organizations, teachers } = await repo.listAdvertisers();
  return {
    items: [
      ...organizations.map(mapAdvertiserOrganization),
      ...teachers.map(mapAdvertiserTeacher),
    ],
  };
}

// ---------------------------------------------------------------------------
// Admin: hero slides
// ---------------------------------------------------------------------------
async function listHeroSlides() {
  return (await repo.listHeroSlides({})).map(mapHeroSlide);
}

function buildSlideFields(data, { partial }) {
  const fields = {};
  const setIf = (col, val) => { if (val !== undefined) fields[col] = val; };

  if (!partial || data.type !== undefined) {
    const type = data.type !== undefined ? String(data.type).toLowerCase() : 'promotion';
    if (!SLIDE_TYPES.includes(type)) throw new ValidationError('Invalid slide type');
    setIf('slide_type', type);
  }
  if (!partial || data.status !== undefined) {
    const status = data.status !== undefined ? String(data.status).toLowerCase() : 'draft';
    if (!SLIDE_STATUSES.includes(status)) throw new ValidationError('Invalid slide status');
    setIf('status', status);
  }
  if (!partial || data.image !== undefined) {
    const image = asString(data.image);
    if (!image) throw new ValidationError('Slide image is required');
    fields.image = image;
  }
  setIf('title_ar', asString(data.titleAr));
  setIf('title_en', asString(data.titleEn));
  setIf('subtitle_ar', asString(data.subtitleAr));
  setIf('subtitle_en', asString(data.subtitleEn));
  setIf('badge_ar', asString(data.badgeAr));
  setIf('badge_en', asString(data.badgeEn));
  if (data.imagePosition !== undefined) setIf('image_position', asString(data.imagePosition) || 'center');
  setIf('overlay_title_ar', asString(data.overlayTitleAr));
  setIf('overlay_title_en', asString(data.overlayTitleEn));
  setIf('location_ar', asString(data.locationAr));
  setIf('location_en', asString(data.locationEn));
  setIf('cta_label_ar', asString(data.ctaLabelAr));
  setIf('cta_label_en', asString(data.ctaLabelEn));
  const route = normalizeRoute(data.ctaRoute);
  if (route !== undefined) setIf('cta_route', route);
  const url = normalizeHttps(data.ctaUrl, 'ctaUrl');
  if (url !== undefined) setIf('cta_url', url);
  const priority = normalizeInt(data.priority, 'priority');
  if (priority !== undefined) setIf('priority', priority);
  if (data.placement !== undefined) setIf('placement', normalizePlacement(data.placement, ['public_hero'], SLIDE_PLACEMENTS));
  const startAt = normalizeDate(data.startAt, 'startAt');
  if (startAt !== undefined) setIf('starts_at', startAt);
  const endAt = normalizeDate(data.endAt, 'endAt');
  if (endAt !== undefined) setIf('ends_at', endAt);
  if (data.active !== undefined) setIf('active', Boolean(data.active));

  if (!partial) {
    if (!fields.title_ar && !fields.title_en) throw new ValidationError('A title (Arabic or English) is required');
    if (!fields.placement) fields.placement = ['public_hero'];
  }
  return fields;
}

async function createHeroSlide({ actorUserId, data = {} }) {
  const count = await repo.countHeroSlides();
  if (count >= MAX_HERO_SLIDES) {
    throw new ValidationError(`Maximum of ${MAX_HERO_SLIDES} hero slides reached. Delete or reuse an existing slide.`);
  }
  const fields = buildSlideFields(data, { partial: false });
  fields.created_by = actorUserId || null;
  const row = await repo.createHeroSlide(fields);
  await writeAudit({
    actorUserId, action: 'create', entityType: 'hero_slide', entityId: row.id,
    newValues: { title_ar: fields.title_ar, title_en: fields.title_en, status: fields.status },
  });
  return mapHeroSlide(row);
}

async function updateHeroSlide({ actorUserId, id, data = {} }) {
  const existing = await repo.findHeroSlideById(id);
  if (!existing) throw new NotFoundError('Hero slide not found');
  const fields = buildSlideFields(data, { partial: true });
  if (!Object.keys(fields).length) throw new ValidationError('No editable fields supplied');
  const row = await repo.updateHeroSlide(id, fields);
  await writeAudit({
    actorUserId, action: 'update', entityType: 'hero_slide', entityId: id,
    newValues: { fields: Object.keys(fields) },
  });
  return mapHeroSlide(row);
}

async function deleteHeroSlide({ actorUserId, id }) {
  const row = await repo.deleteHeroSlide(id);
  if (!row) throw new NotFoundError('Hero slide not found');
  await writeAudit({ actorUserId, action: 'delete', entityType: 'hero_slide', entityId: id });
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin: advertisements
// ---------------------------------------------------------------------------
async function listAdvertisements(filters = {}) {
  return (await repo.listAdvertisements(filters)).map(mapAdvertisement);
}

// Every display bucket the management center knows about. `active`, `scheduled`
// and `expired` are DERIVED (stored status `approved` + the window), so they are
// listed here alongside the stored ones and can never be written directly.
const AD_BUCKETS = ['pending', 'active', 'scheduled', 'paused', 'rejected', 'expired', 'cancelled', 'archived'];

function normalizeLimit(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.trunc(n), max);
}

// The management list: server-side search, filters, sort and pagination so a
// large catalogue is never shipped whole to the browser. Read-only: it changes
// no workflow state and applies no extra authorization beyond the route's
// requireRole('admin').
// The four advanced filters, normalized ONCE and shared by the list, the tab
// counters and the summary. They are normalized together on purpose: a list
// filtered by type while its counters were not would report «2 of 4» in a way
// that can never be reconciled. An unusable value is a 400 rather than a silent
// empty page — a filter that quietly matches nothing reads as «لا توجد إعلانات»,
// which is the most misleading answer a management list can give.
function adFilterParams(query = {}) {
  const adType = query.adType ? String(query.adType).toLowerCase() : '';
  if (adType && !AD_TYPES.includes(adType)) throw new ValidationError('Invalid advertisement type filter');
  const billing = query.billing ? String(query.billing).toLowerCase() : '';
  if (billing && !AD_BILLING.includes(billing)) throw new ValidationError('Invalid billing mode filter');
  const parseDate = (value, label) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new ValidationError(`Invalid ${label} date`);
    return d.toISOString();
  };
  const from = parseDate(query.from, 'from');
  const to = parseDate(query.to, 'to');
  if (from && to && new Date(from) > new Date(to)) {
    throw new ValidationError('The start of the period must not be after its end');
  }
  return { adType, billing, from, to };
}

async function listAdvertisementsPaged(query = {}) {
  const effective = query.effective ? String(query.effective) : '';
  if (effective && !AD_BUCKETS.includes(effective)) throw new ValidationError('Invalid status filter');
  const filters = {
    ...adFilterParams(query),
    status: query.status ? String(query.status) : '',
    effective,
    placement: query.placement ? String(query.placement) : '',
    organizationId: query.organizationId ? String(query.organizationId) : '',
    advertiserId: query.advertiserId ? String(query.advertiserId) : '',
    advertiserKind: query.advertiserKind ? String(query.advertiserKind) : '',
    q: query.q ? String(query.q) : '',
    sort: query.sort ? String(query.sort) : 'newest',
    limit: normalizeLimit(query.limit, 25, 200),
    offset: normalizeLimit(query.offset, 0, 100000),
  };
  const page = await repo.listAdvertisementsPaged(filters);
  return {
    items: page.rows.map(mapAdvertisement),
    total: page.total,
    limit: page.limit,
    offset: page.offset,
  };
}

// The dashboard counters, computed in PostgreSQL from the same rows the tabs
// list. CTR is null whenever impressions are zero: a rate for an ad nobody has
// seen is a fabricated number, so the UI shows "—" and says why.
async function advertisementSummary(query = {}) {
  const filters = {
    ...adFilterParams(query),
    organizationIds: Array.isArray(query.organizationIds) ? query.organizationIds : [],
    submittedBy: query.submittedBy || '',
    q: query.q ? String(query.q) : '',
    placement: query.placement ? String(query.placement) : '',
  };
  const buckets = await repo.summarizeAdvertisements(filters);
  const counts = {};
  AD_BUCKETS.forEach((b) => { counts[b] = 0; });
  let total = 0;
  let impressions = 0;
  let clicks = 0;
  for (const row of buckets) {
    const key = row.bucket in counts ? row.bucket : 'archived';
    counts[key] += Number(row.count || 0);
    total += Number(row.count || 0);
    impressions += Number(row.impressions || 0);
    clicks += Number(row.clicks || 0);
  }
  return {
    total,
    counts,
    performance: {
      impressions,
      clicks,
      ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : null,
      // The database stores aggregate counters only. The UI must say so instead of
      // drawing a timeline it cannot honestly fill.
      historyAvailable: false,
    },
  };
}

// The audit rows the workflow actually wrote for this advertisement. No event is
// synthesised here, so an advertisement with a short trail shows a short trail.
async function advertisementHistory(id) {
  const row = await repo.findAdvertisementById(id);
  if (!row) throw new NotFoundError('Advertisement not found');
  const events = await repo.findAdvertisementHistory(id);
  return events.map((e) => ({
    id: e.id,
    action: e.action,
    at: e.created_at,
    actorName: e.actor_name || null,
    actorRole: e.actor_email || null,
    status: e.new_values && e.new_values.status ? e.new_values.status : null,
    details: e.new_values || e.old_values || null,
  }));
}

async function getAdvertisement(id) {
  const row = await repo.findAdvertisementById(id);
  if (!row) throw new NotFoundError('Advertisement not found');
  return mapAdvertisement(row);
}

function buildAdFields(data, { partial }) {
  const fields = {};
  const setIf = (col, val) => { if (val !== undefined) fields[col] = val; };

  if (!partial || data.name !== undefined) {
    const name = asString(data.name);
    if (!name || !name.trim()) throw new ValidationError('Advertisement name is required');
    fields.name = name.trim();
  }
  if (!partial || data.adType !== undefined) {
    const type = data.adType !== undefined ? String(data.adType).toLowerCase() : 'general';
    if (!AD_TYPES.includes(type)) throw new ValidationError('Invalid advertisement type');
    setIf('ad_type', type);
  }
  if (!partial || data.billingMode !== undefined) {
    const billing = data.billingMode !== undefined ? String(data.billingMode).toLowerCase() : 'free';
    if (!AD_BILLING.includes(billing)) throw new ValidationError('Invalid billing mode');
    setIf('billing_mode', billing);
  }
  if (!partial || data.status !== undefined) {
    const status = data.status !== undefined ? String(data.status).toLowerCase() : 'pending';
    if (!AD_STATUSES.includes(status)) throw new ValidationError('Invalid advertisement status');
    setIf('status', status);
  }
  if (data.placement !== undefined) setIf('placement', normalizePlacement(data.placement, ['ticker'], AD_PLACEMENTS));
  else if (!partial) fields.placement = ['ticker'];

  setIf('advertiser', asString(data.advertiser));
  setIf('organization_id', data.organizationId || null);
  // The advertiser is either an institution (organization_id) or a private
  // teacher (teacher_id) — never both.
  if (data.teacherId !== undefined) setIf('teacher_id', data.teacherId || null);
  if (data.organizationId && data.teacherId) {
    throw new ValidationError('An advertiser is either an institution or a teacher, not both.');
  }
  setIf('image', asString(data.image) || null);
  const url = normalizeHttps(data.targetUrl, 'targetUrl');
  if (url !== undefined) setIf('target_url', url);
  const route = normalizeRoute(data.targetRoute);
  if (route !== undefined) setIf('target_route', route);
  setIf('message_ar', asString(data.messageAr));
  setIf('message_en', asString(data.messageEn));
  setIf('notes', asString(data.notes));
  const priority = normalizeInt(data.priority, 'priority');
  if (priority !== undefined) setIf('priority', priority);
  const startAt = normalizeDate(data.startAt, 'startAt');
  if (startAt !== undefined) setIf('starts_at', startAt);
  const endAt = normalizeDate(data.endAt, 'endAt');
  if (endAt !== undefined) setIf('ends_at', endAt);

  if (!partial && !fields.message_ar && !fields.message_en && !fields.image) {
    throw new ValidationError('Provide ticker text (Arabic or English) or an image');
  }
  return fields;
}

async function createAdvertisement({ actorUserId, data = {} }) {
  const fields = buildAdFields(data, { partial: false });
  fields.created_by = actorUserId || null;
  const row = await repo.createAdvertisement(fields);
  await writeAudit({
    actorUserId, action: 'create', entityType: 'advertisement', entityId: row.id,
    organizationId: fields.organization_id || null,
    newValues: { name: fields.name, billing_mode: fields.billing_mode, status: fields.status },
  });
  return mapAdvertisement(row);
}

async function updateAdvertisement({ actorUserId, id, data = {} }) {
  const existing = await repo.findAdvertisementById(id);
  if (!existing) throw new NotFoundError('Advertisement not found');
  const fields = buildAdFields(data, { partial: true });
  if (!Object.keys(fields).length) throw new ValidationError('No editable fields supplied');
  const row = await repo.updateAdvertisement(id, fields);
  await writeAudit({
    actorUserId, action: 'update', entityType: 'advertisement', entityId: id,
    newValues: { fields: Object.keys(fields) },
  });
  return mapAdvertisement(row);
}

async function deleteAdvertisement({ actorUserId, id }) {
  const row = await repo.deleteAdvertisement(id);
  if (!row) throw new NotFoundError('Advertisement not found');
  await writeAudit({ actorUserId, action: 'delete', entityType: 'advertisement', entityId: id });
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin: offers
// ---------------------------------------------------------------------------
async function listOffers(filters = {}) {
  return (await repo.listOffers(filters)).map(mapOffer);
}

function buildOfferFields(data, { partial }) {
  const fields = {};
  if (!partial || data.organizationId !== undefined) {
    if (!data.organizationId) throw new ValidationError('organizationId is required');
    fields.organization_id = data.organizationId;
  }
  if (!partial || data.title !== undefined) {
    const title = asString(data.title);
    if (!title || !title.trim()) throw new ValidationError('Offer title is required');
    fields.title = title.trim();
  }
  if (data.titleEn !== undefined) fields.title_en = asString(data.titleEn);
  if (data.description !== undefined) fields.description = asString(data.description);
  if (data.descriptionEn !== undefined) fields.description_en = asString(data.descriptionEn);
  if (data.discountPercent !== undefined) {
    if (data.discountPercent === null || data.discountPercent === '') {
      fields.discount_percent = null;
    } else {
      const n = Number(data.discountPercent);
      if (!Number.isFinite(n) || n < 0 || n > 100) throw new ValidationError('discountPercent must be between 0 and 100');
      fields.discount_percent = n;
    }
  }
  if (data.startAt !== undefined) fields.starts_at = normalizeDate(data.startAt, 'startAt');
  if (data.endAt !== undefined) fields.ends_at = normalizeDate(data.endAt, 'endAt');
  if (data.active !== undefined) fields.active = Boolean(data.active);
  return fields;
}

async function createOffer({ actorUserId, data = {} }) {
  const fields = buildOfferFields(data, { partial: false });
  const org = await orgsRepo.findOrganizationById(fields.organization_id);
  if (!org || org.deleted_at) throw new NotFoundError('Organization not found');
  const row = await repo.createOffer(fields);
  await writeAudit({
    actorUserId, action: 'create', entityType: 'offer', entityId: row.id,
    organizationId: fields.organization_id, newValues: { title: fields.title },
  });
  return mapOffer(row);
}

async function updateOffer({ actorUserId, id, data = {} }) {
  const existing = await repo.findOfferById(id);
  if (!existing) throw new NotFoundError('Offer not found');
  const fields = buildOfferFields(data, { partial: true });
  if (fields.organization_id) {
    const org = await orgsRepo.findOrganizationById(fields.organization_id);
    if (!org || org.deleted_at) throw new NotFoundError('Organization not found');
  }
  if (!Object.keys(fields).length) throw new ValidationError('No editable fields supplied');
  const row = await repo.updateOffer(id, fields);
  await writeAudit({
    actorUserId, action: 'update', entityType: 'offer', entityId: id,
    organizationId: row.organization_id, newValues: { fields: Object.keys(fields) },
  });
  return mapOffer(row);
}

async function deleteOffer({ actorUserId, id }) {
  const existing = await repo.findOfferById(id);
  if (!existing) throw new NotFoundError('Offer not found');
  await repo.deleteOffer(id);
  await writeAudit({
    actorUserId, action: 'delete', entityType: 'offer', entityId: id,
    organizationId: existing.organization_id,
  });
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin: banner image upload (octet-stream, no new dependencies)
// ---------------------------------------------------------------------------
function sniffBanner(buf, ext) {
  const rule = BANNER_TYPES[ext];
  if (!rule) return null;
  if (ext === 'webp') {
    if (buf.length < 12) return null;
    if (!buf.slice(0, 4).equals(rule.magic[0])) return null;
    if (!buf.slice(8, 12).equals(rule.magic2[0])) return null;
    return rule.mime;
  }
  if (buf.length < rule.magic[0].length) return null;
  return buf.slice(0, rule.magic[0].length).equals(rule.magic[0]) ? rule.mime : null;
}

async function uploadBanner({ actorUserId, originalName }, fileBuffer) {
  if (!Buffer.isBuffer(fileBuffer) || !fileBuffer.length) throw new ValidationError('Empty file upload.');
  if (fileBuffer.length > BANNER_MAX_BYTES) throw new ValidationError('Banner exceeds the 8 MB limit.');
  const ext = String(originalName || '').split('.').pop().toLowerCase();
  const mime = sniffBanner(fileBuffer, ext);
  if (!mime) throw new ValidationError('Unsupported image type. Allowed: JPG, PNG, WEBP.');
  fs.mkdirSync(BANNER_ROOT, { recursive: true });
  const stored = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(BANNER_ROOT, stored), fileBuffer);
  await writeAudit({
    actorUserId, action: 'upload', entityType: 'marketing_banner', entityId: stored,
    newValues: { mime, file_size: fileBuffer.length },
  });
  return { path: `/uploads/marketing/${stored}`, mime, size: fileBuffer.length };
}

module.exports = {
  MAX_HERO_SLIDES,
  ALLOWED_CTA_ROUTES,
  listPublicHeroSlides, listPublicAdvertisements, listPublicOffers,
  recordAdvertisementClick, recordAdvertisementImpression,
  listAdvertisers,
  listHeroSlides, createHeroSlide, updateHeroSlide, deleteHeroSlide,
  listAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement,
  listAdvertisementsPaged, advertisementSummary, advertisementHistory, getAdvertisement,
  reviewAdvertisement, transitionAdvertisement,
  listMyAdvertisements, listMyAdvertisementsPaged, myAdvertisementsSummary,
  getMyAdvertisement, myAdvertisementHistory,
  createAdvertisementByOwner, updateAdvertisementByOwner,
  cancelAdvertisementByOwner, resubmitAdvertisementByOwner,
  listOffers, createOffer, updateOffer, deleteOffer,
  listMyOffers, createOfferByOwner, updateOfferByOwner, deleteOfferByOwner,
  uploadBanner, BANNER_ROOT,
};

// ---------------------------------------------------------------------------
// Ownership helpers — the tenant boundary between offers and advertisements.
// Both are organization-scoped, so every owner write resolves the actor's own
// institutions first. Unauthorized access raises NotFound (404), not Forbidden,
// so the existence of another tenant's record is never confirmed.
// ---------------------------------------------------------------------------
async function ownedOrganizationIds(userId) {
  const { listMyOrganizations } = require('../ownership/service');
  const orgs = await listMyOrganizations(userId);
  return orgs.filter((o) => o.membershipRole === 'owner').map((o) => o.id);
}

async function assertOwnsOrganization(userId, organizationId) {
  if (!organizationId) throw new NotFoundError('Organization not found');
  const membership = await orgsRepo.findMembership(userId, organizationId);
  if (!(membership && membership.status === 'active' && membership.membership_role === 'owner')) {
    throw new NotFoundError('Organization not found');
  }
}

// ---------------------------------------------------------------------------
// Advertisements: institution submission + moderation
// ---------------------------------------------------------------------------
// The fields that, when changed by the submitter, void an approval and send the
// advertisement back to PENDING REVIEW (business rule L).
const MATERIAL_AD_FIELDS = ['image', 'message_ar', 'message_en', 'target_url', 'target_route', 'placement', 'starts_at', 'ends_at'];

// A non-admin (owner) submission is ALWAYS pending. The status and review
// metadata cannot be supplied by the caller: they are forced here, so a
// `status: "approved"` sent by an owner is stripped, never honoured (rule J).
// The advertiser link is checked against the same catalog the dropdown is built
// from, so a hand-written request cannot attach an advertisement to a user who
// is not an active teacher, or to an institution the submitter does not own.
// Presence is required on create only: a partial edit carries the fields it
// changes, and the advertiser already lives on the row.
async function assertAdvertiserLink(userId, fields, { requireAdvertiser } = {}) {
  if (requireAdvertiser && !fields.organization_id && !fields.teacher_id) {
    throw new ValidationError('Choose an advertiser: your institution or a private teacher');
  }
  if (fields.organization_id) await assertOwnsOrganization(userId, fields.organization_id);
  if (fields.teacher_id) {
    const teacher = await repo.findTeacherAdvertiser(fields.teacher_id);
    if (!teacher) throw new ValidationError('The selected teacher is not an available advertiser');
  }
}

async function createAdvertisementByOwner({ actorUserId, data = {} }) {
  const fields = buildAdFields(data, { partial: false });
  await assertAdvertiserLink(actorUserId, fields, { requireAdvertiser: true });
  fields.status = 'pending';
  fields.submitted_by = actorUserId || null;
  fields.submitted_at = new Date().toISOString();
  fields.reviewed_by = null;
  fields.reviewed_at = null;
  fields.review_notes = null;
  fields.rejection_reason = null;
  const row = await repo.createAdvertisement(fields);
  await writeAudit({
    actorUserId, action: 'submit', entityType: 'advertisement', entityId: row.id,
    organizationId: fields.organization_id || null,
    newValues: { name: fields.name, status: 'pending' },
  });
  return mapAdvertisement(row);
}

// The submitter's own view. An owner sees ONLY what they own: the organization
// ids come from the ownership module, and a user with no institution falls back
// to the rows they personally submitted. The tenant boundary is therefore the
// same one the write paths use — the read cannot widen it.
async function ownedAdvertisementScope(userId) {
  const orgIds = await ownedOrganizationIds(userId);
  return orgIds.length
    ? { organizationIds: orgIds }
    : { submittedBy: userId };
}

async function listMyAdvertisements(userId, { status } = {}) {
  return (await repo.listAdvertisements({ ...(await ownedAdvertisementScope(userId)), status })).map(mapAdvertisement);
}

// Paged + filtered version for the owner's "My Advertisements" screen. Same
// counters, same derived buckets, same search — computed over the owner's own
// rows only.
async function listMyAdvertisementsPaged(userId, query = {}) {
  const effective = query.effective ? String(query.effective) : '';
  if (effective && !AD_BUCKETS.includes(effective)) throw new ValidationError('Invalid status filter');
  const page = await repo.listAdvertisementsPaged({
    ...(await ownedAdvertisementScope(userId)),
    ...adFilterParams(query),
    status: query.status ? String(query.status) : '',
    effective,
    q: query.q ? String(query.q) : '',
    sort: query.sort ? String(query.sort) : 'newest',
    limit: normalizeLimit(query.limit, 25, 200),
    offset: normalizeLimit(query.offset, 0, 100000),
  });
  return { items: page.rows.map(mapAdvertisement), total: page.total, limit: page.limit, offset: page.offset };
}

// The owner's counters must describe the same rows their filtered list shows,
// so this forwards every filter the list accepts rather than search alone.
async function myAdvertisementsSummary(userId, query = {}) {
  return advertisementSummary({
    ...(await ownedAdvertisementScope(userId)),
    ...adFilterParams(query),
    q: query.q ? String(query.q) : '',
    placement: query.placement ? String(query.placement) : '',
  });
}

// One advertisement, read through the same ownership boundary the writes use, so
// another tenant's row raises 404 rather than confirming that it exists.
async function getMyAdvertisement(userId, id) {
  const row = await repo.findAdvertisementById(id);
  if (!row) throw new NotFoundError('Advertisement not found');
  if (row.organization_id) await assertOwnsOrganization(userId, row.organization_id);
  else if (row.submitted_by !== userId) throw new NotFoundError('Advertisement not found');
  return mapAdvertisement(row);
}

async function myAdvertisementHistory(userId, id) {
  await getMyAdvertisement(userId, id);
  const events = await repo.findAdvertisementHistory(id);
  return events.map((e) => ({
    id: e.id,
    action: e.action,
    at: e.created_at,
    actorName: e.actor_name || null,
    status: e.new_values && e.new_values.status ? e.new_values.status : null,
    details: e.new_values || e.old_values || null,
  }));
}

// The submitter edits only their own advertisement. Material edits push it back
// to pending; an owner can never touch the workflow state or the review trail.
async function updateAdvertisementByOwner({ actorUserId, id, data = {} }) {
  const existing = await repo.findAdvertisementById(id);
  if (!existing) throw new NotFoundError('Advertisement not found');
  if (existing.organization_id) await assertOwnsOrganization(actorUserId, existing.organization_id);
  else if (existing.submitted_by !== actorUserId) throw new NotFoundError('Advertisement not found');

  const fields = buildAdFields(data, { partial: true });
  delete fields.status; // an owner never moves the workflow state
  if (!Object.keys(fields).length) throw new ValidationError('No editable fields supplied');
  await assertAdvertiserLink(actorUserId, fields);

  const material = Object.keys(fields).some((k) => MATERIAL_AD_FIELDS.includes(k));
  if (material) {
    fields.status = 'pending';
    fields.reviewed_by = null;
    fields.reviewed_at = null;
    fields.review_notes = null;
    fields.rejection_reason = null;
    fields.submitted_at = new Date().toISOString();
  }
  const row = await repo.updateAdvertisement(id, fields);
  await writeAudit({
    actorUserId, action: material ? 'resubmit' : 'update', entityType: 'advertisement',
    entityId: id, organizationId: existing.organization_id || null,
    newValues: { fields: Object.keys(fields), status: fields.status || existing.status },
  });
  return mapAdvertisement(row);
}

async function cancelAdvertisementByOwner({ actorUserId, id }) {
  const existing = await repo.findAdvertisementById(id);
  if (!existing) throw new NotFoundError('Advertisement not found');
  if (existing.organization_id) await assertOwnsOrganization(actorUserId, existing.organization_id);
  else if (existing.submitted_by !== actorUserId) throw new NotFoundError('Advertisement not found');
  if (['cancelled', 'archived'].includes(existing.status)) return mapAdvertisement(existing);
  const row = await repo.updateAdvertisement(id, { status: 'cancelled' });
  await writeAudit({ actorUserId, action: 'cancel', entityType: 'advertisement', entityId: id, organizationId: existing.organization_id || null });
  return mapAdvertisement(row);
}

async function resubmitAdvertisementByOwner({ actorUserId, id }) {
  const existing = await repo.findAdvertisementById(id);
  if (!existing) throw new NotFoundError('Advertisement not found');
  if (existing.organization_id) await assertOwnsOrganization(actorUserId, existing.organization_id);
  else if (existing.submitted_by !== actorUserId) throw new NotFoundError('Advertisement not found');
  const row = await repo.updateAdvertisement(id, {
    status: 'pending', submitted_at: new Date().toISOString(),
    reviewed_by: null, reviewed_at: null, review_notes: null, rejection_reason: null,
  });
  await writeAudit({ actorUserId, action: 'resubmit', entityType: 'advertisement', entityId: id, organizationId: existing.organization_id || null });
  return mapAdvertisement(row);
}

// Admin review decision. `request_changes` returns the row to pending while
// preserving the request text in review_notes (no redundant stored state).
async function reviewAdvertisement({ actorUserId, id, decision, notes }) {
  if (!AD_REVIEW_DECISIONS.includes(decision)) throw new ValidationError('Invalid review decision');
  const existing = await repo.findAdvertisementById(id);
  if (!existing) throw new NotFoundError('Advertisement not found');
  const updates = { reviewed_by: actorUserId, reviewed_at: new Date().toISOString() };
  if (decision === 'approve') {
    updates.status = 'approved';
    updates.rejection_reason = null;
    updates.review_notes = notes || null;
  } else if (decision === 'reject') {
    updates.status = 'rejected';
    updates.rejection_reason = notes || null;
    updates.review_notes = null;
  } else {
    updates.status = 'pending';
    updates.review_notes = notes ? `changes_requested: ${notes}` : 'changes_requested';
    updates.rejection_reason = null;
  }
  const row = await repo.updateAdvertisement(id, updates);
  await writeAudit({
    actorUserId, action: `review_${decision}`, entityType: 'advertisement', entityId: id,
    organizationId: existing.organization_id || null,
    newValues: { decision, status: updates.status },
  });
  return mapAdvertisement(row);
}

const ADMIN_TRANSITIONS = { pause: 'paused', resume: 'approved', cancel: 'cancelled', archive: 'archived' };

async function transitionAdvertisement({ actorUserId, id, transition }) {
  if (!ADMIN_TRANSITIONS[transition]) throw new ValidationError('Invalid transition');
  const existing = await repo.findAdvertisementById(id);
  if (!existing) throw new NotFoundError('Advertisement not found');
  const target = ADMIN_TRANSITIONS[transition];
  const row = await repo.updateAdvertisement(id, { status: target });
  await writeAudit({
    actorUserId, action: transition, entityType: 'advertisement', entityId: id,
    organizationId: existing.organization_id || null, newValues: { status: target },
  });
  return mapAdvertisement(row);
}

// ---------------------------------------------------------------------------
// Offers: institution-owned, self-served (no moderation)
// ---------------------------------------------------------------------------
async function listMyOffers(userId, { organizationId } = {}) {
  const orgIds = await ownedOrganizationIds(userId);
  if (!orgIds.length) return [];
  const ids = organizationId ? orgIds.filter((o) => o === organizationId) : orgIds;
  if (!ids.length) return [];
  return (await repo.listOffers({ organizationIds: ids })).map(mapOffer);
}

async function createOfferByOwner({ actorUserId, data = {} }) {
  const fields = buildOfferFields(data, { partial: false });
  await assertOwnsOrganization(actorUserId, fields.organization_id);
  const org = await orgsRepo.findOrganizationById(fields.organization_id);
  if (!org || org.deleted_at) throw new NotFoundError('Organization not found');
  const row = await repo.createOffer(fields);
  await writeAudit({
    actorUserId, action: 'create', entityType: 'offer', entityId: row.id,
    organizationId: fields.organization_id, newValues: { title: fields.title },
  });
  return mapOffer(row);
}

async function updateOfferByOwner({ actorUserId, id, data = {} }) {
  const existing = await repo.findOfferById(id);
  if (!existing) throw new NotFoundError('Offer not found');
  await assertOwnsOrganization(actorUserId, existing.organization_id);
  const fields = buildOfferFields(data, { partial: true });
  if (fields.organization_id) {
    // Reassigning an offer to another tenant is forbidden for an owner.
    await assertOwnsOrganization(actorUserId, fields.organization_id);
    const org = await orgsRepo.findOrganizationById(fields.organization_id);
    if (!org || org.deleted_at) throw new NotFoundError('Organization not found');
  }
  if (!Object.keys(fields).length) throw new ValidationError('No editable fields supplied');
  const row = await repo.updateOffer(id, fields);
  await writeAudit({
    actorUserId, action: 'update', entityType: 'offer', entityId: id,
    organizationId: existing.organization_id, newValues: { fields: Object.keys(fields) },
  });
  return mapOffer(row);
}

async function deleteOfferByOwner({ actorUserId, id }) {
  const existing = await repo.findOfferById(id);
  if (!existing) throw new NotFoundError('Offer not found');
  await assertOwnsOrganization(actorUserId, existing.organization_id);
  await repo.deleteOffer(id);
  await writeAudit({ actorUserId, action: 'delete', entityType: 'offer', entityId: id, organizationId: existing.organization_id });
  return { success: true };
}
