// modules/documents/service.js
// OWNING MODULE: documents
// Private supporting documents (B15/B16).
// - Upload: owner of an authorized institution (active membership) or admin.
// - Download/list: admin, or active member of THAT organization (IDOR-safe:
//   membership is always re-checked from the DB for the requested org id).
// - Files: raw octet-stream upload (no new dependencies), magic-byte +
//   extension validation, stored outside any static dir, served as
//   attachment with nosniff. Never exposed via public organization APIs.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const repo = require('./repository');
const orgsRepo = require('../organizations/repository');
const { ValidationError, ForbiddenError, NotFoundError } = require('../common/errors');
const { writeAudit } = require('../common/audit');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads', 'org-docs');
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED = {
  pdf: { mime: 'application/pdf', magic: [Buffer.from([0x25, 0x50, 0x44, 0x46])] },
  jpg: { mime: 'image/jpeg', magic: [Buffer.from([0xff, 0xd8, 0xff])] },
  jpeg: { mime: 'image/jpeg', magic: [Buffer.from([0xff, 0xd8, 0xff])] },
  png: { mime: 'image/png', magic: [Buffer.from([0x89, 0x50, 0x4e, 0x47])] },
  webp: { mime: 'image/webp', magic: [Buffer.from('RIFF'), Buffer.from('WEBP', 'ascii')] },
};
const VALID_DOC_TYPES = ['license', 'ownership', 'authorization', 'registration', 'accreditation', 'other'];

function mapDoc(row) {
  if (!row) return null;
  // filePath (disk location) is NEVER sent to clients.
  return {
    id: row.id, organizationId: row.organization_id, organizationName: row.organization_name,
    uploadedBy: row.uploaded_by, uploaderName: row.uploader_name,
    docType: row.doc_type, fileName: row.file_name, mimeType: row.mime_type,
    fileSize: row.file_size, status: row.status,
    reviewerId: row.reviewer_id, reviewedAt: row.reviewed_at, reviewNotes: row.review_notes,
    createdAt: row.created_at,
  };
}

async function assertCanManageOrg(userId, userRole, organizationId) {
  const org = await orgsRepo.findOrganizationById(organizationId);
  if (!org || org.deleted_at) throw new NotFoundError('Organization not found');
  if (userRole === 'admin') return org;
  // Any active membership grants management (owner/staff); the membership
  // row itself is the authorization — never a frontend-supplied flag.
  const active = await isActiveMember(userId, organizationId);
  if (!active) throw new ForbiddenError('Not authorized to manage this institution.');
  return org;
}

async function isActiveMember(userId, organizationId) {
  const m = await orgsRepo.findMembership(userId, organizationId);
  return Boolean(m && (!m.status || m.status === 'active'));
}

function sniffFile(buf, ext) {
  const rule = ALLOWED[ext];
  if (!rule) return null;
  if (ext === 'webp') {
    if (buf.length < 12) return null;
    if (!buf.slice(0, 4).equals(rule.magic[0])) return null;
    if (!buf.slice(8, 12).equals(rule.magic[1])) return null;
    return rule.mime;
  }
  if (buf.length < rule.magic[0].length) return null;
  return buf.slice(0, rule.magic[0].length).equals(rule.magic[0]) ? rule.mime : null;
}

async function uploadDocument({ userId, userRole, organizationId, docType, originalName }, fileBuffer) {
  if (!VALID_DOC_TYPES.includes(docType || 'other')) throw new ValidationError('Invalid document type.');
  await assertCanManageOrg(userId, userRole, organizationId);
  if (!Buffer.isBuffer(fileBuffer) || !fileBuffer.length) throw new ValidationError('Empty file upload.');
  if (fileBuffer.length > MAX_BYTES) throw new ValidationError('File exceeds the 10 MB limit.');
  const ext = String(originalName || '').split('.').pop().toLowerCase();
  const mime = sniffFile(fileBuffer, ext);
  if (!mime) throw new ValidationError('Unsupported file type. Allowed: PDF, JPG, PNG, WEBP.');
  const safeBase = String(originalName || 'document').replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_').slice(0, 120);
  const stored = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  const dir = path.join(UPLOAD_ROOT, String(organizationId));
  fs.mkdirSync(dir, { recursive: true });
  const abs = path.join(dir, stored);
  fs.writeFileSync(abs, fileBuffer);
  const row = await repo.createDocument({
    organizationId, uploadedBy: userId, docType: docType || 'other',
    fileName: safeBase, filePath: path.join(String(organizationId), stored),
    mimeType: mime, fileSize: fileBuffer.length,
  });
  await writeAudit({
    actorUserId: userId, action: 'upload', entityType: 'organization_document',
    entityId: String(row.id), organizationId, newValues: { doc_type: docType, file_name: safeBase },
  });
  return mapDoc({ ...row, organization_name: undefined });
}

async function listOrganizationDocuments({ userId, userRole, organizationId }) {
  await assertCanManageOrg(userId, userRole, organizationId);
  const rows = await repo.listDocumentsByOrganization(organizationId);
  return rows.map(mapDoc);
}

async function downloadDocument({ userId, userRole, documentId }) {
  const doc = await repo.findDocumentById(documentId);
  if (!doc) throw new NotFoundError('Document not found');
  await assertCanManageOrg(userId, userRole, doc.organization_id);
  const abs = path.join(UPLOAD_ROOT, doc.file_path);
  const resolved = path.resolve(abs);
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT))) throw new ForbiddenError('Invalid document path.');
  if (!fs.existsSync(resolved)) throw new NotFoundError('File missing from storage.');
  return { doc: mapDoc(doc), absPath: resolved };
}

async function deleteDocument({ userId, userRole, documentId }) {
  const doc = await repo.findDocumentById(documentId);
  if (!doc) throw new NotFoundError('Document not found');
  await assertCanManageOrg(userId, userRole, doc.organization_id);
  const abs = path.resolve(path.join(UPLOAD_ROOT, doc.file_path));
  const removed = await repo.deleteDocument(documentId);
  if (removed && abs.startsWith(path.resolve(UPLOAD_ROOT)) && fs.existsSync(abs)) {
    try { fs.unlinkSync(abs); } catch (e) { /* metadata already deleted; report only */ }
  }
  await writeAudit({
    actorUserId: userId, action: 'delete', entityType: 'organization_document',
    entityId: String(documentId), organizationId: doc.organization_id,
  });
  return { success: true };
}

async function listPendingDocuments() {
  const rows = await repo.listPendingDocuments({});
  return rows.map(mapDoc);
}

async function reviewDocument(documentId, { status, reviewNotes }, { actorUserId } = {}) {
  if (!['verified', 'rejected'].includes(status)) throw new ValidationError('Invalid review status.');
  const row = await repo.reviewDocument(documentId, { status, reviewerId: actorUserId, reviewNotes });
  if (!row) throw new NotFoundError('Document not found or already reviewed');
  await writeAudit({
    actorUserId, action: status === 'verified' ? 'verify' : 'reject',
    entityType: 'organization_document', entityId: String(documentId),
    organizationId: row.organization_id, newValues: { review_notes: reviewNotes || null },
  });
  return mapDoc(row);
}

module.exports = {
  uploadDocument, listOrganizationDocuments, downloadDocument,
  deleteDocument, listPendingDocuments, reviewDocument, MAX_BYTES,
};
