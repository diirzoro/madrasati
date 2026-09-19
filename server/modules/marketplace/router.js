// modules/marketplace/router.js
// OWNING MODULE: marketplace
// Fee listing (marketplace). Visibility is controlled by org capabilities in Phase 2C+.

const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireRole, optionalAuth } = require('../identity/auth');

const router = Router();

router.get('/fees', optionalAuth, asyncHandler(async (req, res) => {
  const { organizationId, isActive, offset, limit } = req.query;
  const userRole = req.user ? req.user.role : null;
  const userId = req.user ? req.user.id : null;
  res.json(await service.listFees({
    organizationId,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    offset: offset ? Number(offset) : undefined,
    limit: limit ? Number(limit) : undefined,
  }, { userRole, userId }));
}));

router.get('/fees/:id', optionalAuth, asyncHandler(async (req, res) => {
  const userRole = req.user ? req.user.role : null;
  const userId = req.user ? req.user.id : null;
  res.json(await service.getFee(req.params.id, { userRole, userId }));
}));

router.post('/fees', requireAuth, requireRole('admin', 'owner'), asyncHandler(async (req, res) => {
  // Owner can only create fees for their own organization
  if (req.user.role === 'owner' && req.body.organizationId) {
    const isOwner = await require('../organizations/repository').isOrganizationOwner(req.user.id, req.body.organizationId);
    if (!isOwner) return res.status(403).json({ error: 'Not authorized to create fees for this organization' });
  }
  res.status(201).json(await service.createFee({ ...req.body, organizationId: req.body.organizationId }, { actorUserId: req.user.id }));
}));

module.exports = router;