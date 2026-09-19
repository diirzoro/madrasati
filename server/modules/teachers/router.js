// modules/teachers/router.js
// OWNING MODULE: teachers
// Minimal API contract for teacher profiles.

const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireRole } = require('../identity/auth');

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { organizationId, subjectId, stageId, search, offset, limit } = req.query;
  res.json(await service.listTeachers({
    organizationId, subjectId, stageId, search,
    offset: offset ? Number(offset) : undefined,
    limit: limit ? Number(limit) : undefined,
  }));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await service.getTeacher(req.params.id));
}));

router.post('/', requireAuth, requireRole('admin', 'owner'), asyncHandler(async (req, res) => {
  const userId = req.user.role === 'admin' && req.body.userId ? req.body.userId : req.user.id;
  res.status(201).json(await service.createTeacher({ userId, data: req.body, actorUserId: req.user.id }));
}));

router.patch('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  res.json(await service.updateTeacher({ id: req.params.id, data: req.body || {}, actorUserId: req.user.id }));
}));

module.exports = router;
