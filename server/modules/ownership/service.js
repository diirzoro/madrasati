// modules/ownership/service.js
// OWNING MODULE: ownership
// Institution-management approval workflow (B9-B14).
// - Users are always plain clients at registration; management rights come
//   ONLY from an approved ownership_request (never from frontend input).
// - Approval creates/links the organization + owner membership and promotes
//   client -> owner. Other roles keep their role but gain the membership,
//   which is the real authorization (checked per request from the DB).

const { getClient } = require('../common/pool');
const repo = require('./repository');
const orgsRepo = require('../organizations/repository');
const identityRepo = require('../identity/repository');
const locRepo = require('../locations/repository');
const { ValidationError, ForbiddenError, NotFoundError, ConflictError } = require('../common/errors');
const { writeAudit } = require('../common/audit');

const VALID_TYPES = ['private_school', 'government_school', 'college', 'university', 'institute'];
const VALID_DECISIONS = ['approved', 'rejected', 'changes_requested'];
const TERMINAL_TO_STATUS = { approved: 'approved', rejected: 'rejected', changes_requested: 'changes_requested' };

function mapRequest(row) {
  if (!row) return null;
  return {
    id: row.id, userId: row.user_id, applicantName: row.applicant_name,
    applicantEmail: row.applicant_email, applicantPhone: row.applicant_phone,
    organizationId: row.organization_id, organizationName: row.organization_name,
    requestType: row.request_type, institutionName: row.institution_name,
    institutionType: row.institution_type, countryCode: row.country_code,
    governorateCode: row.governorate_code, districtCode: row.district_code,
    neighborhood: row.neighborhood, address: row.address,
    contactPhone: row.contact_phone, contactEmail: row.contact_email,
    description: row.description, ownershipProof: row.ownership_proof,
    status: row.status, submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at,
    decision: row.decision, reviewNotes: row.review_notes,
  };
}

async function submitRequest(userId, data) {
  const requestType = data.requestType || 'new_institution';
  if (!['new_institution', 'claim_existing'].includes(requestType)) {
    throw new ValidationError('Invalid request type.');
  }
  if (data.institutionType && !VALID_TYPES.includes(data.institutionType)) {
    throw new ValidationError('Invalid institution type.');
  }
  let organizationId = null;
  if (requestType === 'claim_existing') {
    if (!data.organizationId) throw new ValidationError('Organization is required for a claim request.');
    const org = await orgsRepo.findOrganizationById(data.organizationId);
    if (!org || org.deleted_at) throw new ValidationError('Organization does not exist.');
    organizationId = org.id;
  } else {
    if (!data.institutionName || String(data.institutionName).trim().length < 2) {
      throw new ValidationError('Institution name is required.');
    }
    if (!data.institutionType) throw new ValidationError('Institution type is required.');
  }
  // Location sanity: codes must exist in the catalog when provided.
  if (data.governorateCode) {
    const gov = await locRepo.findGovernorateByCode(data.governorateCode);
    if (!gov) throw new ValidationError('Selected governorate does not exist.');
  }
  if (data.districtCode) {
    const dist = await locRepo.findDistrictByCode(data.districtCode);
    if (!dist) throw new ValidationError('Selected district does not exist.');
  }
  let row;
  try {
    row = await repo.createRequest({
      userId, organizationId, requestType,
      institutionName: data.institutionName ? String(data.institutionName).trim() : null,
      institutionType: data.institutionType || null,
      countryCode: data.countryCode ? String(data.countryCode).toUpperCase() : null,
      governorateCode: data.governorateCode || null,
      districtCode: data.districtCode || null,
      neighborhood: data.neighborhood ? String(data.neighborhood).trim() || null : null,
      address: data.address ? String(data.address).trim() || null : null,
      contactPhone: data.contactPhone ? String(data.contactPhone).trim() || null : null,
      contactEmail: data.contactEmail ? String(data.contactEmail).trim().toLowerCase() || null : null,
      description: data.description ? String(data.description).trim() || null : null,
      ownershipProof: data.ownershipProof ? String(data.ownershipProof).trim() || null : null,
    });
  } catch (err) {
    if (err && err.code === '23505') {
      throw new ConflictError('You already have a pending request for this institution.');
    }
    throw err;
  }
  await writeAudit({
    actorUserId: userId, action: 'submit', entityType: 'ownership_request',
    entityId: String(row.id), organizationId: row.organization_id,
    newValues: { request_type: requestType, institution_name: row.institution_name },
  });
  const full = await repo.findRequestById(row.id);
  return mapRequest(full);
}

async function listMyRequests(userId, { status } = {}) {
  const rows = await repo.listRequests({ userId, status });
  return rows.map(mapRequest);
}

async function listAllRequests({ status } = {}) {
  const rows = await repo.listRequests({ status });
  const pending = await repo.countRequests({ status: 'pending' });
  const underReview = await repo.countRequests({ status: 'under_review' });
  return { items: rows.map(mapRequest), counts: { pending, underReview } };
}

async function getRequest(id, { userId, userRole } = {}) {
  const row = await repo.findRequestById(id);
  if (!row) throw new NotFoundError('Request not found');
  if (userRole !== 'admin' && String(row.user_id) !== String(userId)) {
    throw new ForbiddenError('Not authorized to view this request.');
  }
  return mapRequest(row);
}

async function reviewRequest(id, { decision, reviewNotes }, { actorUserId } = {}) {
  if (!VALID_DECISIONS.includes(decision)) throw new ValidationError('Invalid decision.');
  const existing = await repo.findRequestById(id);
  if (!existing) throw new NotFoundError('Request not found');
  if (!['pending', 'under_review'].includes(existing.status)) {
    throw new ConflictError('Request was already reviewed.');
  }
  // Nobody approves their own request — not even an admin applicant.
  if (String(existing.user_id) === String(actorUserId)) {
    throw new ForbiddenError('You cannot review your own request.');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    let organizationId = existing.organization_id;
    let promotedToOwner = false;

    if (decision === 'approved') {
      if (existing.request_type === 'new_institution') {
        // Created inside this transaction so a later failure rolls the
        // organization back too (no orphaned rows, safe retry).
        const { rows: orgRows } = await client.query(
          `INSERT INTO organizations
             (owner_user_id, name, type, governorate_code, district_code, neighborhood,
              address, phone, email, description, data_source, verified, verification_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'owner_request',false,'pending')
           RETURNING id`,
          [
            existing.user_id, existing.institution_name, existing.institution_type,
            existing.governorate_code, existing.district_code, existing.neighborhood,
            existing.address, existing.contact_phone, existing.contact_email, existing.description,
          ]
        );
        organizationId = orgRows[0].id;
      }
      await client.query(
        `INSERT INTO organization_memberships (user_id, organization_id, membership_role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (user_id, organization_id) DO UPDATE
           SET membership_role = 'owner', status = 'active'`,
        [existing.user_id, organizationId]
      );
      const applicant = await identityRepo.findUserById(existing.user_id);
      if (applicant && applicant.role === 'client') {
        const ownerRole = await identityRepo.findRoleByName('owner');
        if (ownerRole) {
          await client.query(`UPDATE users SET role_id = $2, updated_at = now() WHERE id = $1`, [existing.user_id, ownerRole.id]);
          promotedToOwner = true;
        }
      }
    }

    const { rows } = await client.query(
      `UPDATE ownership_requests
       SET status = $2, reviewed_by = $3, reviewed_at = now(),
           decision = $4, review_notes = $5,
           organization_id = COALESCE($6, organization_id),
           updated_at = now()
       WHERE id = $1 AND status IN ('pending', 'under_review')
       RETURNING *`,
      [id, TERMINAL_TO_STATUS[decision], actorUserId, decision, reviewNotes || null, organizationId]
    );
    if (!rows[0]) throw new ConflictError('Request was already reviewed.');
    await client.query('COMMIT');
    await writeAudit({
      actorUserId, action: decision, entityType: 'ownership_request', entityId: String(id),
      organizationId, newValues: { promoted_to_owner: promotedToOwner },
    });
    const full = await repo.findRequestById(id);
    return { request: mapRequest(full), promotedToOwner };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* noop */ }
    throw err;
  } finally {
    client.release();
  }
}

// Owner dashboard: organizations the user owns or actively belongs to.
async function listMyOrganizations(userId) {
  const { query } = require('../common/pool');
  const { rows } = await query(
    `SELECT o.*, m.membership_role
     FROM organization_memberships m
     JOIN organizations o ON o.id = m.organization_id
     WHERE m.user_id = $1 AND m.status = 'active' AND o.deleted_at IS NULL
     ORDER BY o.created_at DESC`,
    [userId]
  );
  const { mapOrganization } = require('../organizations/service');
  return rows.map((r) => ({ ...mapOrganization(r), membershipRole: r.membership_role }));
}

module.exports = { submitRequest, listMyRequests, listAllRequests, getRequest, reviewRequest, listMyOrganizations };
