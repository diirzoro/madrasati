// modules/marketplace/repository.js
// OWNING MODULE: marketplace
// organization_fees — fee listing and creation.
// Schema columns: id, organization_id, fee_type, name, description, amount,
// currency, frequency, stage_id, grade_id, active, effective_from, effective_until,
// visibility, created_at, updated_at, deleted_at.

const { query } = require('../common/pool');

async function listFees({ organizationId, isActive, offset = 0, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (organizationId) { params.push(organizationId); conditions.push(`of2.organization_id = $${params.length}`); }
  if (isActive !== undefined) { params.push(isActive); conditions.push(`of2.active = $${params.length}`); }
  conditions.push(`of2.deleted_at IS NULL`);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT of2.*, o.name AS org_name
     FROM organization_fees of2
     JOIN organizations o ON o.id = of2.organization_id
     ${where}
     ORDER BY of2.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return rows;
}

async function findFeeById(id) {
  const { rows } = await query(`SELECT * FROM organization_fees WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return rows[0] || null;
}

async function createFee({ organizationId, title, description, amount, currency, feeType, gradeLevel, visibility }) {
  const { rows } = await query(
    `INSERT INTO organization_fees (organization_id, fee_type, name, description, amount, currency, active, visibility)
     VALUES ($1,$2,$3,$4,$5,$6,true,$7) RETURNING *`,
    [organizationId, feeType || 'tuition', title, description || null, amount, currency || 'YER', visibility || 'authenticated']
  );
  return rows[0];
}

module.exports = { listFees, findFeeById, createFee };