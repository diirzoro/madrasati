// modules/teachers/repository.js
// OWNING MODULE: teachers
// Teacher profiles, pricing, qualifications, and catalog relationships.
// Phase 2B: repository only — no deep business logic yet.

const { query } = require('../common/pool');

async function listTeachers({ organizationId, subjectId, stageId, search, offset = 0, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  // Independent teachers are not organizations. organizationId stays in the
  // public API contract for forward compatibility, but no approved join exists.
  if (organizationId) conditions.push('FALSE');
  if (subjectId) { params.push(subjectId); conditions.push(`EXISTS (SELECT 1 FROM teacher_subjects ts WHERE ts.teacher_id = tp.id AND ts.subject_id = $${params.length})`); }
  if (stageId) { params.push(stageId); conditions.push(`EXISTS (SELECT 1 FROM teacher_stages tst WHERE tst.teacher_id = tp.id AND tst.stage_id = $${params.length})`); }
  if (search) { params.push(`%${search}%`); conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }
  conditions.push('tp.deleted_at IS NULL');
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT tp.*, u.name AS user_name, u.email AS user_email,
            COALESCE((SELECT MIN(p.amount) FROM teacher_pricing p WHERE p.teacher_id = tp.id AND p.is_active = true), NULL) AS hourly_rate,
            COALESCE((SELECT MIN(p.currency) FROM teacher_pricing p WHERE p.teacher_id = tp.id AND p.is_active = true), 'YER') AS currency,
            COALESCE((SELECT MAX(sa.radius_km) FROM teacher_service_areas sa WHERE sa.teacher_id = tp.id), NULL) AS travel_radius_km,
            COALESCE((SELECT json_agg(json_build_object('title', q.title, 'institutionName', q.institution_name, 'degree', q.degree, 'year', q.year_obtained) ORDER BY q.created_at) FROM teacher_qualifications q WHERE q.teacher_id = tp.id), '[]'::json) AS qualifications
     FROM teacher_profiles tp
     JOIN users u ON u.id = tp.user_id
     ${where}
     ORDER BY u.name
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return rows;
}

async function findTeacherProfileById(id) {
  const { rows } = await query(
    `SELECT tp.*, u.name AS user_name, u.email AS user_email
     FROM teacher_profiles tp JOIN users u ON u.id = tp.user_id
     WHERE tp.id = $1 AND tp.deleted_at IS NULL`, [id]
  );
  return rows[0] || null;
}

async function findTeacherProfileByUserId(userId) {
  const { rows } = await query(
    `SELECT * FROM teacher_profiles WHERE user_id = $1 AND deleted_at IS NULL`, [userId]
  );
  return rows[0] || null;
}

async function createTeacherProfile({ userId, headline, bio, gender, experience, offersOnline, travelsToStudentHome, acceptsStudentHome }) {
  const { rows } = await query(
    `INSERT INTO teacher_profiles
       (user_id, headline, bio, gender, years_of_experience, offers_online, travels_to_student_home, accepts_student_home)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [userId, headline || null, bio || null, gender || null, Number(experience) || 0,
     Boolean(offersOnline), Boolean(travelsToStudentHome), Boolean(acceptsStudentHome)]
  );
  return rows[0];
}

async function updateTeacherProfile(id, fields) {
  const allowed = ['headline', 'bio', 'gender', 'years_of_experience', 'offers_online',
    'travels_to_student_home', 'accepts_student_home', 'verified', 'verification_status', 'profile_status'];
  const keys = allowed.filter((key) => fields[key] !== undefined);
  if (!keys.length) return findTeacherProfileById(id);
  const assignments = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = keys.map((key) => fields[key]);
  const { rows } = await query(
    `UPDATE teacher_profiles SET ${assignments}, updated_at = now()
     WHERE id = $${keys.length + 1} AND deleted_at IS NULL RETURNING *`,
    [...values, id]
  );
  return rows[0] || null;
}

module.exports = { listTeachers, findTeacherProfileById, findTeacherProfileByUserId, createTeacherProfile, updateTeacherProfile };
