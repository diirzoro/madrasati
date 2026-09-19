// modules/teachers/service.js
// OWNING MODULE: teachers
// Minimal service: DTO mapping + thin validation.

const repo = require('./repository');
const { ValidationError, NotFoundError } = require('../common/errors');
const { writeAudit } = require('../common/audit');

function mapTeacher(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || null,
    userEmail: row.user_email || null,
    bio: row.bio,
    qualifications: row.qualifications,
    headline: row.headline,
    experienceYears: row.years_of_experience,
    hourlyRate: row.hourly_rate,
    currency: row.currency,
    travelRadiusKm: row.travel_radius_km,
    offersOnline: Boolean(row.offers_online),
    travelsToStudentHome: Boolean(row.travels_to_student_home),
    acceptsStudentHome: Boolean(row.accepts_student_home),
    verified: Boolean(row.verified),
    verificationStatus: row.verification_status,
    status: row.profile_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listTeachers(filters) { return (await repo.listTeachers(filters)).map(mapTeacher); }

async function getTeacher(id) {
  const row = await repo.findTeacherProfileById(id);
  if (!row) throw new NotFoundError('Teacher not found');
  return mapTeacher(row);
}

async function getTeacherByUserId(userId) {
  return mapTeacher(await repo.findTeacherProfileByUserId(userId));
}

async function createTeacher({ userId, data, actorUserId }) {
  if (!userId) throw new ValidationError('userId is required');
  const existing = await repo.findTeacherProfileByUserId(userId);
  if (existing) throw new ValidationError('Teacher profile already exists for this user');
  const profile = await repo.createTeacherProfile({ userId, ...data });
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'create',
    entityType: 'teacher_profile',
    entityId: profile.id,
    newValues: { user_id: userId },
  });
  return mapTeacher(profile);
}

async function updateTeacher({ id, data, actorUserId }) {
  const current = await repo.findTeacherProfileById(id);
  if (!current) throw new NotFoundError('Teacher not found');
  const fields = {};
  if (data.headline !== undefined) fields.headline = data.headline;
  if (data.bio !== undefined) fields.bio = data.bio;
  if (data.gender !== undefined) fields.gender = data.gender;
  if (data.experienceYears !== undefined) fields.years_of_experience = Number(data.experienceYears) || 0;
  if (data.offersOnline !== undefined) fields.offers_online = Boolean(data.offersOnline);
  if (data.travelsToStudentHome !== undefined) fields.travels_to_student_home = Boolean(data.travelsToStudentHome);
  if (data.acceptsStudentHome !== undefined) fields.accepts_student_home = Boolean(data.acceptsStudentHome);
  if (data.status !== undefined) {
    if (!['active', 'inactive', 'suspended'].includes(data.status)) throw new ValidationError('Invalid teacher status');
    fields.profile_status = data.status;
  }
  if (data.verificationStatus !== undefined) {
    if (!['pending', 'verified', 'rejected'].includes(data.verificationStatus)) throw new ValidationError('Invalid verification status');
    fields.verification_status = data.verificationStatus;
    fields.verified = data.verificationStatus === 'verified';
  }
  const updated = await repo.updateTeacherProfile(id, fields);
  await writeAudit({ actorUserId, action: 'update', entityType: 'teacher_profile', entityId: id,
    newValues: { fields: Object.keys(fields) } });
  return mapTeacher(await repo.findTeacherProfileById(updated.id));
}

module.exports = { listTeachers, getTeacher, getTeacherByUserId, createTeacher, updateTeacher };
