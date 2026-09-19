// modules/documents/router.js
// OWNING MODULE: documents
// Authenticated routes only. Upload uses raw octet-stream bodies
// (no new dependencies); metadata via query params.

const express = require('express');
const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireRole } = require('../identity/auth');

const router = Router();
router.use(requireAuth);

const rawUpload = express.raw({ limit: '11mb', type: 'application/octet-stream' });

// POST /api/documents/upload?organizationId=&docType=  (X-File-Name header)
router.post(
  '/upload',
  rawUpload,
  asyncHandler(async (req, res) => {
    const { organizationId, docType } = req.query;
    if (!organizationId) return res.status(400).json({ error: 'organizationId is required' });
    const originalName = req.headers['x-file-name'] || 'document';
    const doc = await service.uploadDocument(
      {
        userId: req.user.id, userRole: req.user.role,
        organizationId, docType, originalName: String(originalName),
      },
      req.body
    );
    res.status(201).json(doc);
  })
);

// GET /api/documents?organizationId=  (org-scoped list)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.query;
    if (!organizationId) return res.status(400).json({ error: 'organizationId is required' });
    res.json(await service.listOrganizationDocuments({
      userId: req.user.id, userRole: req.user.role, organizationId,
    }));
  })
);

// GET /api/documents/pending  (admin review queue)
router.get(
  '/pending',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    res.json(await service.listPendingDocuments());
  })
);

// GET /api/documents/:id/file  (authorized download, attachment)
router.get(
  '/:id/file',
  asyncHandler(async (req, res) => {
    const { doc, absPath } = await service.downloadDocument({
      userId: req.user.id, userRole: req.user.role, documentId: req.params.id,
    });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName.replace(/"/g, '')}"`);
    res.sendFile(absPath);
  })
);

// PATCH /api/documents/:id  { status: verified|rejected, reviewNotes } (admin)
router.patch(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    res.json(await service.reviewDocument(req.params.id, req.body || {}, { actorUserId: req.user.id }));
  })
);

// DELETE /api/documents/:id  (org manager or admin)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await service.deleteDocument({ userId: req.user.id, userRole: req.user.role, documentId: req.params.id }));
  })
);

module.exports = router;
