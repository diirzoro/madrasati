// modules/ownership/repository.js
// OWNING MODULE: ownership
// Data access for ownership_requests (institution-management approval workflow).

const { query } = require('../common/pool');

async function createRequest(data) {
  const { rows } = await query(
    `INSERT INTO ownership_requests
       (user_id, organization_id, request_type, institution_name, institution_type,
        country_code, governorate_code, district_code, neighborhood, address,
        contact_phone, contact_email, description, ownership_proof)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      data.userId, data.organizationId || null, data.requestType || 'new_institution',
      data.institutionName || null, data.institutionType || null,
      data.countryCode || null, data.governorateCode || null, data.districtCode || null,
      data.neighborhood || null, data.address || null, data.contactPhone || null,
      data.contactEmail || null, data.description || null, data.ownershipProof || null,
    ]
  );
  return rows[0];
}

async function findRequestById(id) {
  const { rows } = await query(
    `SELECT r.*, u.name AS applicant_name, u.email AS applicant_email, u.phone AS applicant_phone,
            o.name AS organization_name
     FROM ownership_requests r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN organizations o ON o.id = r.organization_id
     WHERE r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listRequests({ status, userId, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const params = [];
  if (status) { params.push(status); conditions.push(`r.status = $${params.length}`); }
  if (userId) { params.push(userId); conditions.push(`r.user_id = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);
  params.push(offset);
  const { rows } = await query(
    `SELECT r.*, u.name AS applicant_name, u.email AS applicant_email, u.phone AS applicant_phone,
            o.name AS organization_name
     FROM ownership_requests r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN organizations o ON o.id = r.organization_id
     ${where}
     ORDER BY r.submitted_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function countRequests({ status } = {}) {
  const params = [];
  const where = status ? `WHERE status = $1` : '';
  if (status) params.push(status);
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM ownership_requests ${where}`, params);
  return rows[0].count;
}

// Status transition guarded in SQL: only pending/under_review may move.
async function transitionRequest(client, id, { status, reviewedBy, decision, reviewNotes, organizationId }) {
  const q = client ? client.query.bind(client) : query;
  const { rows } = await q(
    `UPDATE ownership_requests
     SET status = $2, reviewed_by = $3, reviewed_at = now(),
         decision = $4, review_notes = $5,
         organization_id = COALESCE($6, organization_id),
         updated_at = now()
     WHERE id = $1 AND status IN ('pending', 'under_review')
     RETURNING *`,
    [id, status, reviewedBy || null, decision || status, reviewNotes || null, organizationId || null]
  );
  return rows[0] || null;
}

module.exports = { createRequest, findRequestById, listRequests, countRequests, transitionRequest };
