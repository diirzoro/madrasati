// modules/admin/router.js
// OWNING MODULE: admin
// Admin-only API routes: audit logs, system settings, dashboard counts, pending registrations.

const express = require('express');
const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireRole } = require('../identity/auth');

const router = Router();

// all admin routes require auth + admin role
router.use(requireAuth, requireRole('admin'));

// Raw body for image uploads: the file arrives as bytes, not multipart, so the
// request needs its own parser and its own (small) size ceiling.
const rawImage = express.raw({ limit: '5mb', type: 'application/octet-stream' });

router.get('/dashboard', asyncHandler(async (_req, res) => {
  res.json(await service.dashboardCounts());
}));

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const { actorUserId, entityType, organizationId, offset, limit } = req.query;
  res.json(await service.listAuditLogs({
    actorUserId, entityType, organizationId,
    offset: offset ? Number(offset) : undefined,
    limit: limit ? Number(limit) : undefined,
  }));
}));

router.get('/settings', asyncHandler(async (_req, res) => {
  res.json(await service.listSettings());
}));

router.get('/settings/:key', asyncHandler(async (req, res) => {
  const setting = await service.getSetting(req.params.key);
  if (!setting) return res.status(404).json({ error: 'Setting not found' });
  res.json(setting);
}));

router.put('/settings/:key', asyncHandler(async (req, res) => {
  res.json(await service.updateSetting({ key: req.params.key, value: req.body.value, description: req.body.description, updatedBy: req.user.id }));
}));

router.get('/pending-registrations', asyncHandler(async (req, res) => {
  const { offset, limit } = req.query;
  res.json(await service.listPendingRegistrations({ offset: offset ? Number(offset) : undefined, limit: limit ? Number(limit) : undefined }));
}));

// POST /api/admin/uploads/image?scope=avatars|logos|documents
// Raw image body with the original name in X-File-Name; returns a public path.
router.post('/uploads/image', rawImage, asyncHandler(async (req, res) => {
  const originalName = req.headers['x-file-name'] || 'image';
  const result = await service.uploadImage(
    { actorUserId: req.user.id, originalName: String(originalName), scope: req.query.scope },
    req.body
  );
  const base = `${req.protocol}://${req.get('host')}`;
  res.status(201).json({ ...result, url: `${base}${result.path}` });
}));

module.exports = router;