// modules/locations/router.js
// OWNING MODULE: locations
// Read-only catalog routes. No auth required — public reference data.

const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireRole } = require('../identity/auth');

const router = Router();

router.get(
  '/countries',
  asyncHandler(async (_req, res) => {
    res.json(await service.listCountries());
  })
);

router.get(
  '/governorates',
  asyncHandler(async (_req, res) => {
    res.json(await service.listGovernorates());
  })
);

router.get(
  '/districts',
  asyncHandler(async (req, res) => {
    const { governorate, governorateId } = req.query;
    res.json(await service.listDistricts({ governorate, governorateId }));
  })
);

router.get(
  '/neighborhoods',
  asyncHandler(async (req, res) => {
    const { district, districtId } = req.query;
    res.json(await service.listNeighborhoods({ district, districtId }));
  })
);

// ---------- admin-only direct catalog writes (A5 "+") ----------
// Countries get the same treatment as the rest of the hierarchy. The public
// read stays open; the admin read and both writes need the platform admin role,
// because the country list is the root every other location hangs from.
router.get(
  '/countries/manage',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    res.json(await service.listAllCountries());
  })
);

router.post(
  '/countries',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createCountry(req.body || {}, { actorUserId: req.user.id }));
  })
);

router.patch(
  '/countries/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    res.json(await service.updateCountry(req.params.id, req.body || {}, { actorUserId: req.user.id }));
  })
);

router.post(
  '/governorates',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createGovernorate(req.body || {}, { actorUserId: req.user.id }));
  })
);

router.post(
  '/districts',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createDistrict(req.body || {}, { actorUserId: req.user.id }));
  })
);

router.post(
  '/neighborhoods',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createNeighborhood(req.body || {}, { actorUserId: req.user.id }));
  })
);

// ---------- missing-location requests ----------
// Any authenticated user may file; only admin reviews.
router.post(
  '/requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.submitLocationRequest(req.body || {}, { userId: req.user.id }));
  })
);

router.get(
  '/requests',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    res.json(await service.listLocationRequests({ status: req.query.status }));
  })
);

router.patch(
  '/requests/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    res.json(await service.reviewLocationRequest(req.params.id, req.body || {}, { actorUserId: req.user.id }));
  })
);

module.exports = router;