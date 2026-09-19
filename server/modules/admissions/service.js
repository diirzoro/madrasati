// modules/admissions/service.js
// OWNING MODULE: admissions
// Minimal DTO + validation for admission applications.

const repo = require('./repository');
const { ValidationError, ForbiddenError, NotFoundError } = require('../common/errors');
const { writeAudit } = require('../common/audit');

function mapApplication(row) {
  if (!row) return null;
  return {
    id: row.id, userId: row.applicant_user_id, organizationId: row.organization_id,
    applicantName: row.applicant_name, applicantPhone: row.applicant_phone,
    applicantEmail: row.applicant_email,
    stageId: row.stage_id, gradeId: row.grade_id, programName: row.program_name,
    notes: row.notes, status: row.status,
    submittedAt: row.submitted_at, reviewedAt: row.reviewed_at,
    reviewedByUserId: row.reviewed_by_user_id, decisionReason: row.decision_reason,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function listApplications(filters) { return (await repo.listApplications(filters)).map(mapApplication); }

async function getApplication(id) {
  const row = await repo.findApplicationById(id);
  if (!row) throw new NotFoundError('Application not found');
  return mapApplication(row);
}

async function createApplication({ userId, organizationId, data }) {
  if (!organizationId) throw new ValidationError('organizationId is required');
  if (!data.studentName) throw new ValidationError('studentName is required');
  const row = await repo.createApplication({ userId, organizationId, data });
  await writeAudit({ action: 'create', entityType: 'admission_application', entityId: row.id, organizationId });
  return mapApplication(row);
}

async function updateStatus({ userId, userRole, id, status, actorUserId }) {
  if (!['draft', 'submitted', 'under_review', 'more_information_required', 'assessment_interview', 'waiting_list', 'offered', 'accepted', 'rejected', 'withdrawn', 'enrolled'].includes(status)) {
    throw new ValidationError('Invalid status');
  }
  const existing = await repo.findApplicationById(id);
  if (!existing) throw new NotFoundError('Application not found');

  // Authorization: owner can only update their org's applications
  if (userRole === 'owner') {
    const isOwner = await require('../organizations/repository').isOrganizationOwner(userId, existing.organization_id);
    if (!isOwner) throw new ForbiddenError('Not authorized to update this application');
  }

  const updated = await repo.updateApplicationStatus(id, status);
  await writeAudit({
    actorUserId: actorUserId || userId,
    action: 'status_change',
    entityType: 'admission_application',
    entityId: id,
    organizationId: existing.organization_id,
    oldValues: { status: existing.status },
    newValues: { status },
  });
  return mapApplication(updated);
}

module.exports = { listApplications, getApplication, createApplication, updateStatus };