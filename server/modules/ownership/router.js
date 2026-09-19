// modules/ownership/router.js
// OWNING MODULE: ownership
// Routes: owner submits + tracks; admin reviews; owners list their orgs.

const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireRole } = require('../identity/auth');

const router = Router();

// All ownership routes require an authenticated session.
router.use(requireAuth);

// Owner dashboard data: my organizations (owner or active member).
router.get(
  '/my-organizations',
  asyncHandler(async (req, res) => {
    res.json(await service.listMyOrganizations(req.user.id));
  })
);

// Submit an institution-management request (any authenticated user).
router.post(
  '/requests',
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.submitRequest(req.user.id, req.body || {}));
  })
);

// Track own requests.
router.get(
  '/requests/mine',
  asyncHandler(async (req, res) => {
    res.json(await service.listMyRequests(req.user.id, { status: req.query.status }));
  })
);

// View one request (owner of the request or admin).
router.get(
  '/requests/:id',
  asyncHandler(async (req, res) => {
    res.json(await service.getRequest(req.params.id, { userId: req.user.id, userRole: req.user.role }));
  })
);

// ---------- admin review ----------
router.get(
  '/requests',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    res.json(await service.listAllRequests({ status: req.query.status }));
  })
);

router.patch(
  '/requests/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { decision, reviewNotes } = req.body || {};
    res.json(await service.reviewRequest(req.params.id, { decision, reviewNotes }, { actorUserId: req.user.id }));
  })
);

module.exports = router;
