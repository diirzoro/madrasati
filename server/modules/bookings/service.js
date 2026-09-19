// modules/bookings/service.js
// OWNING MODULE: bookings
// Minimal DTO + validation. Supports org-owned AND teacher-only bookings.

const repo = require('./repository');
const { ValidationError, ForbiddenError, NotFoundError } = require('../common/errors');
const { writeAudit } = require('../common/audit');

function mapBooking(row) {
  if (!row) return null;
  return {
    id: row.id, userId: row.user_id, organizationId: row.organization_id,
    teacherUserId: row.teacher_user_id, bookingType: row.booking_type,
    title: row.title, description: row.description,
    startTime: row.start_time, endTime: row.end_time,
    status: row.status, amount: row.amount, currency: row.currency,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function listBookings(filters) { return (await repo.listBookings(filters)).map(mapBooking); }

async function getBooking(id) {
  const row = await repo.findBookingById(id);
  if (!row) throw new NotFoundError('Booking not found');
  return mapBooking(row);
}

async function createBooking({ userId, data }) {
  if (!data.bookingType || !repo.VALID_TYPES.includes(data.bookingType)) {
    throw new ValidationError('Valid bookingType is required');
  }
  // teacher-only: organizationId may be null; either org or teacher must be present
  if (!data.organizationId && !data.teacherUserId) {
    throw new ValidationError('organizationId or teacherUserId is required');
  }
  const row = await repo.createBooking({ userId, ...data });
  await writeAudit({ action: 'create', entityType: 'booking', entityId: row.id,
    organizationId: row.organization_id });
  return mapBooking(row);
}

async function updateStatus({ userId, userRole, id, status, actorUserId }) {
  if (!repo.VALID_STATUSES.includes(status)) throw new ValidationError('Invalid status');
  const existing = await repo.findBookingById(id);
  if (!existing) throw new NotFoundError('Booking not found');

  // Authorization: owner can only update their org's bookings, teacher only their own
  if (userRole === 'owner') {
    if (existing.organization_id) {
      const isOwner = await require('../organizations/repository').isOrganizationOwner(userId, existing.organization_id);
      if (!isOwner) throw new ForbiddenError('Not authorized to update this booking');
    }
  } else if (userRole === 'teacher') {
    if (existing.teacher_user_id !== userId) throw new ForbiddenError('Not authorized to update this booking');
  }

  const updated = await repo.updateBookingStatus(id, status);
  await writeAudit({
    actorUserId: actorUserId || userId,
    action: 'status_change',
    entityType: 'booking',
    entityId: id,
    organizationId: existing.organization_id,
    oldValues: { status: existing.status },
    newValues: { status },
  });
  return mapBooking(updated);
}

module.exports = { listBookings, getBooking, createBooking, updateStatus };