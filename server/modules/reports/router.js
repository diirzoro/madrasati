// modules/reports/router.js
// OWNING MODULE: reports
// Admin-only Reporting & Analytics API. Every route carries requireAuth +
// requireRole('admin'): reports aggregate across every tenant, so access is
// enforced on the server, never by hiding a tab in the UI. Exports are built
// from the same payload the screen renders, so an export cannot leak a figure
// the UI is not allowed to show.

const express = require('express');
const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireRole } = require('../identity/auth');

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/catalog', asyncHandler(async (_req, res) => {
  res.json({ items: service.catalog() });
}));

router.get('/filter-options', asyncHandler(async (_req, res) => {
  res.json(await service.filterOptions());
}));

router.get('/headline', asyncHandler(async (_req, res) => {
  res.json(await service.headline());
}));

router.get('/saved', asyncHandler(async (req, res) => {
  res.json({ items: await service.listSavedReports(req.user.id) });
}));

router.post('/saved', asyncHandler(async (req, res) => {
  res.status(201).json(await service.createSavedReport(req.user.id, req.body || {}));
}));

router.delete('/saved/:id', asyncHandler(async (req, res) => {
  res.json(await service.deleteSavedReport(req.user.id, req.params.id));
}));

// Import Center. `dryRun: true` validates and returns the error report without
// writing anything; a real run is all-or-nothing and audited.
router.post('/import/institutions', asyncHandler(async (req, res) => {
  res.json(await service.importInstitutions(req.user.id, req.body || {}));
}));

// The one data endpoint. `type` selects the report; the rest are its filters.
// Entity reports (type=institution|teacher) require `id`.
router.get('/report', asyncHandler(async (req, res) => {
  const type = String(req.query.type || 'overview');
  res.json(await service.buildReport(type, req.query));
}));

module.exports = router;
