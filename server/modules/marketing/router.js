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

router.post('/advertisements/:id/click', asyncHandler(async (req, res) => {
  res.json(await service.recordAdvertisementClick(req.params.id));
}));

router.get('/offers', asyncHandler(async (req, res) => {
  res.json({ items: await service.listPublicOffers(req.query.organizationId) });
}));

// --------------------------- admin management ---------------------------
const rawBanner = express.raw({ limit: '9mb', type: 'application/octet-stream' });

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

router.get('/admin/advertisements', asyncHandler(async (req, res) => {
  const { status, placement } = req.query;
  res.json({ items: await service.listAdvertisements({ status, placement }) });
}));

router.post('/admin/advertisements', asyncHandler(async (req, res) => {
  res.status(201).json(await service.createAdvertisement({ actorUserId: req.user.id, data: req.body || {} }));
}));

router.put('/admin/advertisements/:id', asyncHandler(async (req, res) => {
  res.json(await service.updateAdvertisement({ actorUserId: req.user.id, id: req.params.id, data: req.body || {} }));
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
