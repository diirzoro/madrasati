// modules/marketing/router.js
// OWNING MODULE: marketing
// Public read routes + Super-Admin management routes.
// Mounted at /api so public paths are /api/hero-slides, /api/advertisements,
// /api/offers; admin paths live under /api/admin/... (admin module loads first
// and falls through for unmatched subpaths).

const express = require('express');
const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireRole } = require('../identity/auth');

const router = Router();

// Raw octet-stream body for banner uploads (admin and owner paths).
const rawBanner = express.raw({ limit: '9mb', type: 'application/octet-stream' });

// --------------------------- public reads ---------------------------
router.get('/hero-slides', asyncHandler(async (req, res) => {
  const placement = req.query.placement || 'public_hero';
  res.json({ slides: await service.listPublicHeroSlides(placement) });
}));

router.get('/advertisements', asyncHandler(async (req, res) => {
  const placement = req.query.placement || 'ticker';
  const limit = req.query.limit ? Number(req.query.limit) : 6;
  res.json({ items: await service.listPublicAdvertisements(placement, limit) });
}));

// Genuine click tracking: a real CTA/banner interaction, never a page load and
// never an admin preview.
router.post('/advertisements/:id/click', asyncHandler(async (req, res) => {
  res.json(await service.recordAdvertisementClick(req.params.id));
}));

// Impression tracking: the advertisement was actually shown to a user.
router.post('/advertisements/:id/impression', asyncHandler(async (req, res) => {
  res.json(await service.recordAdvertisementImpression(req.params.id));
}));

// The «المعلن» dropdown source: institution owners and private teachers.
router.get('/advertisements/advertisers', requireAuth, asyncHandler(async (_req, res) => {
  res.json(await service.listAdvertisers());
}));

router.get('/offers', asyncHandler(async (req, res) => {
  res.json({ items: await service.listPublicOffers(req.query.organizationId) });
}));

// --------------------------- owner submission + management ---------------------------
// These are the non-admin side of the workflow: an institution owner submits an
// advertisement (which enters PENDING REVIEW), edits their own, cancels or
// resubmits. The service forces `status = pending` on submission and strips any
// workflow field an owner sends, so approval can never be granted from here.
router.post('/advertisements', requireAuth, asyncHandler(async (req, res) => {
  res.status(201).json(await service.createAdvertisementByOwner({ actorUserId: req.user.id, data: req.body || {} }));
}));

router.get('/advertisements/mine', requireAuth, asyncHandler(async (req, res) => {
  res.json({ items: await service.listMyAdvertisements(req.user.id, { status: req.query.status }) });
}));

// The owner's "My Advertisements" screen: the same counters, search, filters and
// pagination the admin center uses, computed over the owner's OWN rows only.
router.get('/advertisements/mine/list', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.listMyAdvertisementsPaged(req.user.id, req.query || {}));
}));

router.get('/advertisements/mine/summary', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.myAdvertisementsSummary(req.user.id, req.query || {}));
}));

// Order matters: /mine/:id must not swallow /mine/summary above, and the owner
// read runs through the same ownership check as the owner writes.
router.get('/advertisements/mine/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json({ item: await service.getMyAdvertisement(req.user.id, req.params.id) });
}));

router.get('/advertisements/mine/:id/history', requireAuth, asyncHandler(async (req, res) => {
  res.json({ items: await service.myAdvertisementHistory(req.user.id, req.params.id) });
}));

router.put('/advertisements/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.updateAdvertisementByOwner({ actorUserId: req.user.id, id: req.params.id, data: req.body || {} }));
}));

router.post('/advertisements/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.cancelAdvertisementByOwner({ actorUserId: req.user.id, id: req.params.id }));
}));

router.post('/advertisements/:id/resubmit', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.resubmitAdvertisementByOwner({ actorUserId: req.user.id, id: req.params.id }));
}));

// Offers are institution-owned and self-served: an owner manages their own
// institution's offers without admin approval. Every route below re-checks
// ownership in the service, so Organization A can never touch Organization B.
router.get('/offers/mine', requireAuth, asyncHandler(async (req, res) => {
  res.json({ items: await service.listMyOffers(req.user.id, { organizationId: req.query.organizationId }) });
}));

router.post('/offers', requireAuth, asyncHandler(async (req, res) => {
  res.status(201).json(await service.createOfferByOwner({ actorUserId: req.user.id, data: req.body || {} }));
}));

router.put('/offers/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.updateOfferByOwner({ actorUserId: req.user.id, id: req.params.id, data: req.body || {} }));
}));

router.delete('/offers/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.deleteOfferByOwner({ actorUserId: req.user.id, id: req.params.id }));
}));

// Owner banner upload: the same magic-byte-sniffed, size-capped storage as the
// admin path, but on an authenticated route so an owner never needs the
// Admin-only endpoint. (The admin endpoint is not reused for owners.)
// Only a real advertiser may upload: an institution owner or a private
// teacher. A `client` account has no advertisement to attach an image to, so
// it is refused here rather than after a write.
router.post('/uploads/banner', requireAuth, requireRole('admin', 'owner', 'teacher'), rawBanner, asyncHandler(async (req, res) => {
  const originalName = req.headers['x-file-name'] || 'banner';
  const result = await service.uploadBanner({ actorUserId: req.user.id, originalName: String(originalName) }, req.body);
  const base = `${req.protocol}://${req.get('host')}`;
  res.status(201).json({ ...result, url: `${base}${result.path}` });
}));

// --------------------------- admin management ---------------------------
router.use('/admin', requireAuth, requireRole('admin'));

router.get('/admin/hero-slides', asyncHandler(async (_req, res) => {
  res.json({ items: await service.listHeroSlides() });
}));

router.post('/admin/hero-slides', asyncHandler(async (req, res) => {
  res.status(201).json(await service.createHeroSlide({ actorUserId: req.user.id, data: req.body || {} }));
}));

router.put('/admin/hero-slides/:id', asyncHandler(async (req, res) => {
  res.json(await service.updateHeroSlide({ actorUserId: req.user.id, id: req.params.id, data: req.body || {} }));
}));

router.delete('/admin/hero-slides/:id', asyncHandler(async (req, res) => {
  res.json(await service.deleteHeroSlide({ actorUserId: req.user.id, id: req.params.id }));
}));

// The management list. Read-only, and it applies no authorization of its own:
// the router's requireAuth + requireRole('admin') above is the only gate, so a
// non-admin never reaches a counter, a counter row, or a page of results.
router.get('/admin/advertisements', asyncHandler(async (req, res) => {
  res.json(await service.listAdvertisementsPaged(req.query || {}));
}));

// Declared before /:id so "summary" is never read as an advertisement id.
router.get('/admin/advertisements/summary', asyncHandler(async (req, res) => {
  res.json(await service.advertisementSummary(req.query || {}));
}));

router.get('/admin/advertisements/:id', asyncHandler(async (req, res) => {
  res.json({ item: await service.getAdvertisement(req.params.id) });
}));

router.get('/admin/advertisements/:id/history', asyncHandler(async (req, res) => {
  res.json({ items: await service.advertisementHistory(req.params.id) });
}));

router.post('/admin/advertisements', asyncHandler(async (req, res) => {
  res.status(201).json(await service.createAdvertisement({ actorUserId: req.user.id, data: req.body || {} }));
}));

router.put('/admin/advertisements/:id', asyncHandler(async (req, res) => {
  res.json(await service.updateAdvertisement({ actorUserId: req.user.id, id: req.params.id, data: req.body || {} }));
}));

// Review decision: approve / reject / request_changes. Only an authorized
// Program Administrator reaches this router (requireRole('admin') above), so
// approval can never be granted by an institution owner through any route.
router.post('/admin/advertisements/:id/review', asyncHandler(async (req, res) => {
  const { decision, notes } = req.body || {};
  res.json(await service.reviewAdvertisement({ actorUserId: req.user.id, id: req.params.id, decision, notes }));
}));

// Operational transitions: pause / resume / cancel / archive.
router.post('/admin/advertisements/:id/status', asyncHandler(async (req, res) => {
  const { transition } = req.body || {};
  res.json(await service.transitionAdvertisement({ actorUserId: req.user.id, id: req.params.id, transition }));
}));

router.delete('/admin/advertisements/:id', asyncHandler(async (req, res) => {
  res.json(await service.deleteAdvertisement({ actorUserId: req.user.id, id: req.params.id }));
}));

router.get('/admin/offers', asyncHandler(async (req, res) => {
  const { organizationId } = req.query;
  res.json({ items: await service.listOffers({ organizationId }) });
}));

router.post('/admin/offers', asyncHandler(async (req, res) => {
  res.status(201).json(await service.createOffer({ actorUserId: req.user.id, data: req.body || {} }));
}));

router.put('/admin/offers/:id', asyncHandler(async (req, res) => {
  res.json(await service.updateOffer({ actorUserId: req.user.id, id: req.params.id, data: req.body || {} }));
}));

router.delete('/admin/offers/:id', asyncHandler(async (req, res) => {
  res.json(await service.deleteOffer({ actorUserId: req.user.id, id: req.params.id }));
}));

// POST /api/admin/uploads/banner  (X-File-Name header, raw image body)
router.post('/admin/uploads/banner', rawBanner, asyncHandler(async (req, res) => {
  const originalName = req.headers['x-file-name'] || 'banner';
  const result = await service.uploadBanner({ actorUserId: req.user.id, originalName: String(originalName) }, req.body);
  const base = `${req.protocol}://${req.get('host')}`;
  res.status(201).json({ ...result, url: `${base}${result.path}` });
}));

module.exports = router;
