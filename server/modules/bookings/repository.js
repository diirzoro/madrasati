// modules/bookings/repository.js
// OWNING MODULE: bookings
// bookings + status history. organization_id IS NULLABLE (teacher-only bookings valid).

const { query } = require('../common/pool');

const VALID_TYPES = ['school_visit', 'admission_interview', 'parent_meeting', 'teacher_lesson', 'institute_course', 'workshop', 'other'];
const VALID_STATUSES = ['draft', 'pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'no_show', 'expired', 'refunded', 'booked'];

async function listBookings({ organizationId, teacherId, userId, status, offset = 0, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (organizationId) { params.push(organizationId); conditions.push(`b.organization_id = $${params.length}`); }
  if (teacherId) { params.push(teacherId); conditions.push(`b.teacher_user_id = $${params.length}`); }
  if (userId) { params.push(userId); conditions.push(`(b.user_id = $${params.length} OR b.teacher_user_id = $${params.length})`); }
  if (status) { params.push(status); conditions.push(`b.status = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT b.* FROM bookings b ${where} ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return rows;
}

async function findBookingById(id) {
  const { rows } = await query(`SELECT * FROM bookings WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createBooking(data) {
  const { rows } = await query(
    `INSERT INTO bookings (user_id, organization_id, teacher_user_id, booking_type, client_name, client_phone, client_email, seats, subject_id, stage_id, status, starts_at, ends_at, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [data.userId, data.organizationId || null, data.teacherUserId || null, data.bookingType || 'other',
     data.clientName || null, data.clientPhone || null, data.clientEmail || null,
     data.seats || 1, data.subjectId || null, data.stageId || null,
     'pending', data.startsAt || null, data.endsAt || null, data.notes || null]
  );
  return rows[0];
}

async function updateBookingStatus(id, status) {
  const { rows } = await query(
    `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [status, id]
  );
  return rows[0] || null;
}

module.exports = { VALID_TYPES, VALID_STATUSES, listBookings, findBookingById, createBooking, updateBookingStatus };