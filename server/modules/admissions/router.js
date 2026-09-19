// modules/admissions/router.js
// OWNING MODULE: admissions
// Minimal API for admission applications.

const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { ForbiddenError } = require('../common/errors');
const { requireAuth, requireRole } = require('../identity/auth');

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { organizationId, status, offset, limit } = req.query;
  res.json(await service.listApplications({
    organizationId, status, userId: req.user.role === 'client' ? req.user.id : undefined,
    offset: offset ? Number(offset) : undefined,
    limit: limit ? Number(limit) : undefined,
  }));
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
   const application = await service.getApplication(req.params.id);
   // Check if user has permission to access this application
   if (req.user.role === 'client' && application.userId !== req.user.id) {
      throw new ForbiddenError('Access denied');
   }
   // Admins and owners can access applications for their organizations
   res.json(application);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  res.status(201).json(await service.createApplication({ userId: req.user.id, organizationId: req.body.organizationId, data: req.body }));
}));

router.patch('/:id/status', requireAuth, requireRole('admin', 'owner'), asyncHandler(async (req, res) => {
  res.json(await service.updateStatus({
    userId: req.user.id,
    userRole: req.user.role,
    id: req.params.id,
    status: req.body.status,
    actorUserId: req.user.id,
  }));
}));

module.exports = router;