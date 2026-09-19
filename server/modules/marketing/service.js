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
const AD_STATUSES = ['active', 'paused', 'expired', 'archived'];
const PLACEMENTS = ['public_hero', 'ticker', 'banner', 'sidebar'];
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

function mapAdvertisement(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    advertiser: row.advertiser || '',
    organizationId: row.organization_id || null,
    organizationName: row.organization_name || '',
    adType: row.ad_type,
    billingMode: row.billing_mode,
    status: row.status,
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

function normalizePlacement(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const list = (Array.isArray(value) ? value : [value]).map((v) => String(v).trim()).filter(Boolean);
  const invalid = list.filter((v) => !PLACEMENTS.includes(v));
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

async function recordAdvertisementClick(id) {
  const row = await repo.incrementAdvertisementClick(id);
  if (!row) throw new NotFoundError('Advertisement not found');
  return { id: row.id, clicks: row.clicks };
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
  if (data.placement !== undefined) setIf('placement', normalizePlacement(data.placement, ['public_hero']));
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
    const status = data.status !== undefined ? String(data.status).toLowerCase() : 'active';
    if (!AD_STATUSES.includes(status)) throw new ValidationError('Invalid advertisement status');
    setIf('status', status);
  }
  if (data.placement !== undefined) setIf('placement', normalizePlacement(data.placement, ['ticker']));
  else if (!partial) fields.placement = ['ticker'];

  setIf('advertiser', asString(data.advertiser));
  setIf('organization_id', data.organizationId || null);
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
  listPublicHeroSlides, listPublicAdvertisements, listPublicOffers, recordAdvertisementClick,
  listHeroSlides, createHeroSlide, updateHeroSlide, deleteHeroSlide,
  listAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement,
  listOffers, createOffer, updateOffer, deleteOffer,
  uploadBanner, BANNER_ROOT,
};
