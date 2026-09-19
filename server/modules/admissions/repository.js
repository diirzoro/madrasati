// modules/admissions/repository.js
// OWNING MODULE: admissions
// Schema: admission_applications columns: id, organization_id, applicant_user_id,
// applicant_name, applicant_phone, applicant_email, stage_id, grade_id, program_name,
// notes, status, submitted_at, reviewed_at, reviewed_by_user_id, decision_reason,
// payload, created_at, updated_at, deleted_at.

const { query } = require('../common/pool');

async function listApplications({ organizationId, userId, status, offset = 0, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (organizationId) { params.push(organizationId); conditions.push(`aa.organization_id = $${params.length}`); }
  if (userId) { params.push(userId); conditions.push(`aa.applicant_user_id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`aa.status = $${params.length}`); }
  conditions.push(`aa.deleted_at IS NULL`);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT aa.* FROM admission_applications aa
     ${where}
     ORDER BY aa.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return rows;
}

async function findApplicationById(id) {
  const { rows } = await query(`SELECT * FROM admission_applications WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return rows[0] || null;
}

async function createApplication({ userId, organizationId, data }) {
  const { rows } = await query(
    `INSERT INTO admission_applications (applicant_user_id, organization_id, applicant_name, applicant_phone, applicant_email, stage_id, grade_id, program_name, notes, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
[userId, organizationId, data.studentName || data.applicantName, data.phone || null, data.email || null,
      data.stageId || null, data.gradeId || null, data.programName || null, data.notes || null, 'submitted']
  );
  return rows[0];
}

async function updateApplicationStatus(id, status) {
  const { rows } = await query(
    `UPDATE admission_applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows[0] || null;
}

module.exports = { listApplications, findApplicationById, createApplication, updateApplicationStatus };