// modules/teachers/router.js
// OWNING MODULE: teachers
// API contract for the teacher section.
//
// Route order matters: the literal single-segment paths (form-catalog,
// deletion-requests) are declared before `/:id`, otherwise Express would treat
// "form-catalog" as a teacher id.
//
// Reading the public directory stays open, exactly as before, but the two public
// reads carry `optionalAuth` so the server can decide about money: an anonymous
// visitor gets the profile with every amount stripped and `pricingGated` set, a
// signed-in one sees the prices. Everything that writes, and anything exposing a
// teacher's private documents or deletion queue, requires an authenticated
// platform admin.

const express = require('express');
const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireRole, optionalAuth } = require('../identity/auth');

const router = Router();
const adminOnly = [requireAuth, requireRole('admin')];
const rawUpload = express.raw({ limit: '11mb', type: 'application/octet-stream' });

// ---------- public reads ----------

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { organizationId, subjectId, stageId, search, status, verificationStatus, countryId, governorateId, offset, limit } = req.query;
  res.json(await service.listTeachers({
    organizationId, subjectId, stageId, search, status, verificationStatus, countryId, governorateId,
    offset: offset ? Number(offset) : undefined,
    limit: limit ? Number(limit) : undefined,
  }, { canSeePricing: Boolean(req.user) }));
}));

// ---------- literal paths (must precede /:id) ----------

// The add/edit form's pickers: approved countries, the price-free global subject
// catalog, and the stages. Never carries a price.
router.get('/form-catalog', ...adminOnly, asyncHandler(async (_req, res) => {
  res.json(await service.getFormCatalog());
}));

// Queue behind the «التحقق والمراجعة» screen: teacher deletion requests.
router.get('/deletion-requests', ...adminOnly, asyncHandler(async (req, res) => {
  res.json(await service.listDeletionRequests({ status: req.query.status }));
}));

router.patch('/deletion-requests/:id', ...adminOnly, asyncHandler(async (req, res) => {
  const { decision, reviewNotes } = req.body || {};
  res.json(await service.reviewDeletionRequest({
    requestId: req.params.id, decision, reviewNotes, actorUserId: req.user.id,
  }));
}));

// Teacher documents waiting for review.
router.get('/documents/pending', ...adminOnly, asyncHandler(async (_req, res) => {
  res.json(await service.listPendingDocuments());
}));

router.get('/documents/:id/file', requireAuth, asyncHandler(async (req, res) => {
  const { doc, absPath } = await service.downloadDocument({
    documentId: req.params.id, userId: req.user.id, actorRole: req.user.role,
  });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', doc.mimeType);
  // Arabic file names are not Latin-1, so a raw header value would throw
  // ERR_INVALID_CHAR. Send an ASCII fallback plus the RFC 5987 UTF-8 form.
  const asciiName = doc.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`
  );
  res.sendFile(absPath);
}));

router.patch('/documents/:id', ...adminOnly, asyncHandler(async (req, res) => {
  const { status, reviewNotes } = req.body || {};
  res.json(await service.reviewDocument({
    documentId: req.params.id, status, reviewNotes, actorUserId: req.user.id,
  }));
}));

router.delete('/documents/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.deleteDocument({
    documentId: req.params.id, userId: req.user.id, actorRole: req.user.role,
  }));
}));

// The "+" beside the subject picker. Refuses a name that already exists in the
// catalog (trimmed, case-insensitive) so duplicates cannot be created.
router.post('/subjects', ...adminOnly, asyncHandler(async (req, res) => {
  const { name, nameEn, description } = req.body || {};
  res.status(201).json(await service.proposeSubject({
    name, data: { nameEn, description }, actorUserId: req.user.id,
  }));
}));

// ---------- single teacher ----------

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  res.json(await service.getTeacher(req.params.id, { canSeePricing: Boolean(req.user) }));
}));

// Creates the teacher's own `users` row (role: teacher) and the profile in one
// transaction. No pre-existing account is required or offered.
router.post('/', ...adminOnly, asyncHandler(async (req, res) => {
  res.status(201).json(await service.createTeacher({ data: req.body || {}, actorUserId: req.user.id }));
}));

router.patch('/:id', ...adminOnly, asyncHandler(async (req, res) => {
  res.json(await service.updateTeacher({ id: req.params.id, data: req.body || {}, actorUserId: req.user.id }));
}));

// Suspend / activate — freezes visibility, keeps every row.
router.post('/:id/status', ...adminOnly, asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  res.json(await service.setTeacherStatus({ id: req.params.id, status, actorUserId: req.user.id }));
}));

// Deletion is a request with a mandatory reason, never an instant delete.
router.post('/:id/deletion-requests', ...adminOnly, asyncHandler(async (req, res) => {
  const { reason } = req.body || {};
  res.status(201).json(await service.requestDeletion({
    id: req.params.id, reason, actorUserId: req.user.id,
  }));
}));

router.get('/:id/documents', ...adminOnly, asyncHandler(async (req, res) => {
  res.json(await service.listDocuments(req.params.id));
}));

router.post('/:id/documents', ...adminOnly, rawUpload, asyncHandler(async (req, res) => {
  const originalName = req.headers['x-file-name'] || 'document';
  res.status(201).json(await service.uploadDocument({
    teacherId: req.params.id,
    userId: req.user.id,
    actorRole: req.user.role,
    docType: req.query.docType,
    originalName: String(originalName),
  }, req.body));
}));

module.exports = router;
