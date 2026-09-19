// modules/marketplace/service.js
// OWNING MODULE: marketplace
// organization_fees: fee listing visibility respects organization capabilities.
// Canonical money = NUMERIC(14,2) only (common/money.js).

const repo = require('./repository');
const { ValidationError, ForbiddenError, NotFoundError } = require('../common/errors');
const { writeAudit } = require('../common/audit');
const { assertMoney } = require('../common/money');

function mapFee(row) {
  if (!row) return null;
  return {
    id: row.id, organizationId: row.organization_id, orgName: row.org_name,
    title: row.name, description: row.description, amount: row.amount,
    currency: row.currency, feeType: row.fee_type, gradeLevel: row.grade_id,
    isActive: row.active, visibility: row.visibility, createdAt: row.created_at,
  };
}

function mapFeePublic(row) {
  if (!row) return null;
  return {
    id: row.id, organizationId: row.organization_id, orgName: row.org_name,
    title: row.name, feeType: row.fee_type, gradeLevel: row.grade_id,
    currency: row.currency,
  };
}

async function listFees(filters, { userRole, userId } = {}) {
  const rows = await repo.listFees(filters);
  // Public/unauthenticated: no detailed fees (amount, description)
  if (!userRole || userRole === 'client') {
    return rows.map(mapFeePublic);
  }
  return rows.map(mapFee);
}

async function getFee(id, { userRole, userId } = {}) {
  const row = await repo.findFeeById(id);
  if (!row) throw new NotFoundError('Fee not found');
  // Owner can only see their own org's detailed fees
  if (userRole === 'owner') {
    const isOwner = await require('../organizations/repository').isOrganizationOwner(userId, row.organization_id);
    if (!isOwner) throw new ForbiddenError('Not authorized to view competitor fee details');
  }
  // Public/client: no detailed fees
  if (!userRole || userRole === 'client') {
    return mapFeePublic(row);
  }
  return mapFee(row);
}

async function createFee(data, { actorUserId } = {}) {
  if (!data.organizationId) throw new ValidationError('organizationId is required');
  if (!data.title) throw new ValidationError('title is required');
  if (data.amount != null) assertMoney(data.amount, 'amount');
  const fee = await repo.createFee(data);
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'create',
    entityType: 'organization_fee',
    entityId: fee.id,
    organizationId: data.organizationId,
    newValues: { title: data.title, amount: data.amount },
  });
  return mapFee(fee);
}

module.exports = { listFees, getFee, createFee };