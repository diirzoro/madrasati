// modules/documents/repository.js
// OWNING MODULE: documents
// Metadata for private organization supporting documents.
// Files themselves live under server/uploads (never served statically);
// every access goes through the authenticated download route.

const { query } = require('../common/pool');

async function createDocument(data) {
  const { rows } = await query(
    `INSERT INTO organization_documents
       (organization_id, uploaded_by, doc_type, file_name, file_path, mime_type, file_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [data.organizationId, data.uploadedBy || null, data.docType || 'other',
      data.fileName, data.filePath, data.mimeType, data.fileSize]
  );
  return rows[0];
}

async function findDocumentById(id) {
  const { rows } = await query(
    `SELECT d.*, o.name AS organization_name, u.name AS uploader_name
     FROM organization_documents d
     JOIN organizations o ON o.id = d.organization_id
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listDocumentsByOrganization(organizationId) {
  const { rows } = await query(
    `SELECT d.*, u.name AS uploader_name
     FROM organization_documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.organization_id = $1
     ORDER BY d.created_at DESC`,
    [organizationId]
  );
  return rows;
}

async function listPendingDocuments({ limit = 50, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT d.*, o.name AS organization_name, u.name AS uploader_name
     FROM organization_documents d
     JOIN organizations o ON o.id = d.organization_id
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.status = 'pending'
     ORDER BY d.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function reviewDocument(id, { status, reviewerId, reviewNotes }) {
  const { rows } = await query(
    `UPDATE organization_documents
     SET status = $2, reviewer_id = $3, reviewed_at = now(), review_notes = $4
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, status, reviewerId || null, reviewNotes || null]
  );
  return rows[0] || null;
}

async function deleteDocument(id) {
  const { rows } = await query(`DELETE FROM organization_documents WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

module.exports = {
  createDocument, findDocumentById, listDocumentsByOrganization,
  listPendingDocuments, reviewDocument, deleteDocument,
};
