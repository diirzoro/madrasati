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

// A fee prices exactly one scope: a grade, a stage, or the organization itself.
// Migration 023 enforces that with one partial unique index per scope, so the
// conflict target must repeat the index predicate — a bare column list would
// not match a partial index in PostgreSQL.
async function upsertScopedFee({
  organizationId, feeType, name, amount, currency, frequency, stageId, gradeId, visibility,
}) {
  const scope = gradeId ? 'grade' : stageId ? 'stage' : 'org';
  const conflict = {
    grade: 'ON CONFLICT (organization_id, fee_type, name, grade_id) WHERE grade_id IS NOT NULL AND deleted_at IS NULL',
    stage: 'ON CONFLICT (organization_id, fee_type, name, stage_id) WHERE grade_id IS NULL AND stage_id IS NOT NULL AND deleted_at IS NULL',
    org: 'ON CONFLICT (organization_id, fee_type, name) WHERE grade_id IS NULL AND stage_id IS NULL AND deleted_at IS NULL',
  }[scope];
  const { rows } = await query(
    `INSERT INTO organization_fees
       (organization_id, fee_type, name, amount, currency, frequency, stage_id, grade_id, active, visibility)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9)
     ${conflict}
     DO UPDATE SET amount = EXCLUDED.amount,
                   currency = EXCLUDED.currency,
                   frequency = EXCLUDED.frequency,
                   visibility = EXCLUDED.visibility,
                   active = true,
                   deleted_at = NULL,
                   updated_at = now()
     RETURNING *`,
    [organizationId, feeType, name, amount, currency, frequency, stageId || null, gradeId || null, visibility || 'authenticated']
  );
  return rows[0];
}

async function listStageFees(organizationId) {
  const { rows } = await query(
    `SELECT * FROM organization_fees
     WHERE organization_id = $1 AND stage_id IS NOT NULL AND grade_id IS NULL
       AND deleted_at IS NULL AND active = true
     ORDER BY created_at`,
    [organizationId]
  );
  return rows;
}

async function softDeleteFee(id) {
  const { rows } = await query(
    `UPDATE organization_fees SET active = false, deleted_at = now(), updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { listFees, findFeeById, createFee, upsertScopedFee, listStageFees, softDeleteFee };
