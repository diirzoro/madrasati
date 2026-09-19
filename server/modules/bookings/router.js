// modules/bookings/router.js
// OWNING MODULE: bookings
// Minimal API for bookings (org-owned + teacher-only).

const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { ForbiddenError } = require('../common/errors');
const { requireAuth, requireRole } = require('../identity/auth');

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { organizationId, teacherId, status, offset, limit } = req.query;
  res.json(await service.listBookings({
    organizationId, teacherId, status,
    userId: req.user.role === 'client' || req.user.role === 'teacher' ? req.user.id : undefined,
    offset: offset ? Number(offset) : undefined,
    limit: limit ? Number(limit) : undefined,
  }));
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
   const booking = await service.getBooking(req.params.id);
   // Check if user has permission to access this booking
   if (req.user.role === 'client' && booking.userId !== req.user.id) {
      throw new ForbiddenError('Access denied');
   }
   // Teachers and admins can access bookings for their organizations (handled in service)
   res.json(booking);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  res.status(201).json(await service.createBooking({ userId: req.user.id, data: req.body }));
}));

router.patch('/:id/status', requireAuth, requireRole('admin', 'owner', 'teacher'), asyncHandler(async (req, res) => {
  res.json(await service.updateStatus({
    userId: req.user.id,
    userRole: req.user.role,
    id: req.params.id,
    status: req.body.status,
    actorUserId: req.user.id,
  }));
}));

module.exports = router;