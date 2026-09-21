// modules/teachers/repository.js
// OWNING MODULE: teachers
// Table ownership: teacher_profiles, teacher_pricing, teacher_availability,
// teacher_qualifications, teacher_service_areas, teacher_subjects,
// teacher_stages, teacher_languages, teacher_documents,
// teacher_deletion_requests.
// Reads `subjects` and `academic_stages` only to link a teacher to the shared
// academic catalog; the academic module owns those rows.
//
// One shared projection feeds both the admin card and the teacher detail screen,
// so the two views cannot drift apart.

const { query, getClient } = require('../common/pool');

const TEACHER_SELECT = `
  SELECT tp.*,
         u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
         u.status AS user_status, u.is_protected AS user_is_protected,
         up.avatar_url AS avatar_url,
         co.code AS country_code, co.name AS country_name,
         g.name AS governorate_name, d.name AS district_name, n.name AS neighborhood_name,
         COALESCE((
           SELECT json_agg(json_build_object(
             'subjectId', ts.subject_id,
             'name', s.name,
             'slug', s.slug,
             'reviewStatus', s.review_status,
             'scope', CASE WHEN s.organization_id IS NULL THEN 'global' ELSE 'organization' END,
             'amount', p.amount,
             'currency', p.currency,
             'billingPeriod', p.billing_period,
             'languageCode', p.language_code,
             'isActive', p.is_active
           ) ORDER BY s.name)
           FROM teacher_subjects ts
           JOIN subjects s ON s.id = ts.subject_id
           LEFT JOIN teacher_pricing p
                  ON p.teacher_id = tp.id AND p.subject_id = ts.subject_id AND p.is_active = true
           WHERE ts.teacher_id = tp.id
         ), '[]'::json) AS subject_list,
         COALESCE((
           SELECT json_agg(json_build_object('id', st.id, 'name', st.name, 'nameEn', st.name_en) ORDER BY st.sort_order, st.name)
           FROM teacher_stages tst JOIN academic_stages st ON st.id = tst.stage_id
           WHERE tst.teacher_id = tp.id
         ), '[]'::json) AS stage_list,
         COALESCE((
           SELECT json_agg(json_build_object('id', q.id, 'title', q.title, 'institutionName', q.institution_name,
                                             'degree', q.degree, 'year', q.year_obtained, 'documentUrl', q.document_url)
                          ORDER BY q.created_at)
           FROM teacher_qualifications q WHERE q.teacher_id = tp.id
         ), '[]'::json) AS qualification_list,
         COALESCE((
           SELECT json_agg(json_build_object('id', av.id, 'dayOfWeek', av.day_of_week,
                                             'startTime', to_char(av.start_time, 'HH24:MI'),
                                             'endTime', to_char(av.end_time, 'HH24:MI'),
                                             'locationMode', av.location_mode, 'notes', av.notes)
                          ORDER BY av.day_of_week, av.start_time)
           FROM teacher_availability av WHERE av.teacher_id = tp.id
         ), '[]'::json) AS availability_list,
         COALESCE((SELECT MAX(sa.radius_km) FROM teacher_service_areas sa WHERE sa.teacher_id = tp.id), NULL) AS travel_radius_km,
         (SELECT count(*) FROM teacher_documents doc WHERE doc.teacher_id = tp.id) AS document_count,
         (SELECT dr.id FROM teacher_deletion_requests dr
           WHERE dr.teacher_id = tp.id AND dr.status = 'pending' ORDER BY dr.created_at DESC LIMIT 1) AS pending_deletion_request_id
  FROM teacher_profiles tp
  JOIN users u ON u.id = tp.user_id
  LEFT JOIN user_profiles up ON up.user_id = tp.user_id
  LEFT JOIN locations_countries co ON co.id = tp.country_id
  LEFT JOIN locations_governorates g ON g.id = tp.governorate_id
  LEFT JOIN locations_districts d ON d.id = tp.district_id
  LEFT JOIN locations_neighborhoods n ON n.id = tp.neighborhood_id`;

function buildFilters({ organizationId, subjectId, stageId, search, status, verificationStatus, countryId, governorateId }) {
  const conditions = [];
  const params = [];
  // Independent teachers are not organizations. organizationId stays in the
  // public API contract for forward compatibility, but no approved join exists.
  if (organizationId) conditions.push('FALSE');
  if (subjectId) { params.push(subjectId); conditions.push(`EXISTS (SELECT 1 FROM teacher_subjects ts WHERE ts.teacher_id = tp.id AND ts.subject_id = $${params.length})`); }
  if (stageId) { params.push(stageId); conditions.push(`EXISTS (SELECT 1 FROM teacher_stages tst WHERE tst.teacher_id = tp.id AND tst.stage_id = $${params.length})`); }
  if (status) { params.push(status); conditions.push(`tp.profile_status = $${params.length}`); }
  if (verificationStatus) { params.push(verificationStatus); conditions.push(`tp.verification_status = $${params.length}`); }
  if (countryId) { params.push(countryId); conditions.push(`tp.country_id = $${params.length}`); }
  if (governorateId) { params.push(governorateId); conditions.push(`tp.governorate_id = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length}
                      OR tp.name_en ILIKE $${params.length} OR u.phone ILIKE $${params.length})`);
  }
  conditions.push('tp.deleted_at IS NULL');
  return { where: `WHERE ${conditions.join(' AND ')}`, params };
}

async function listTeachers(filters = {}) {
  const { offset = 0, limit = 20 } = filters;
  const { where, params } = buildFilters(filters);
  const { rows } = await query(
    `${TEACHER_SELECT} ${where}
     ORDER BY u.name
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return rows;
}

async function countTeachers(filters = {}) {
  const { where, params } = buildFilters(filters);
  const { rows } = await query(
    `SELECT count(*)::int AS total
     FROM teacher_profiles tp JOIN users u ON u.id = tp.user_id ${where}`,
    params
  );
  return rows[0] ? rows[0].total : 0;
}

async function findTeacherProfileById(id) {
  const { rows } = await query(`${TEACHER_SELECT} WHERE tp.id = $1 AND tp.deleted_at IS NULL`, [id]);
  return rows[0] || null;
}

// Used by the identity/ownership flows that attach a profile to an existing
// user; it deliberately returns the bare row, not the card projection.
async function findTeacherProfileByUserId(userId) {
  const { rows } = await query(
    `SELECT * FROM teacher_profiles WHERE user_id = $1 AND deleted_at IS NULL`, [userId]
  );
  return rows[0] || null;
}

// ---------- profile writes ----------

const PROFILE_COLUMNS = [
  'name_en', 'headline', 'bio', 'gender', 'years_of_experience', 'skills',
  'whatsapp', 'country_id', 'governorate_id', 'district_id', 'neighborhood_id',
  'address_line', 'offers_online', 'travels_to_student_home', 'accepts_student_home',
  'verified', 'verification_status', 'profile_status',
];

async function createTeacherProfile(fields, client) {
  const run = client ? client.query.bind(client) : query;
  const cols = ['user_id', ...PROFILE_COLUMNS.filter((c) => fields[c] !== undefined)];
  const values = cols.map((c) => (fields[c] === undefined ? null : fields[c]));
  const placeholders = cols.map((_c, i) => `$${i + 1}`);
  const { rows } = await run(
    `INSERT INTO teacher_profiles (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );
  return rows[0];
}

async function updateTeacherProfile(id, fields, client) {
  const run = client ? client.query.bind(client) : query;
  const keys = PROFILE_COLUMNS.filter((key) => fields[key] !== undefined);
  if (!keys.length) return null;
  const assignments = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = keys.map((key) => fields[key]);
  const { rows } = await run(
    `UPDATE teacher_profiles SET ${assignments}, updated_at = now()
     WHERE id = $${keys.length + 1} AND deleted_at IS NULL
     RETURNING id, user_id`,
    [...values, id]
  );
  return rows[0] || null;
}

// Final step of an approved deletion. Soft by design: the row and every linked
// record survive, so an approved deletion is auditable rather than destructive.
async function softDeleteTeacher(id, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `UPDATE teacher_profiles
        SET deleted_at = now(), profile_status = 'inactive', updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, user_id`,
    [id]
  );
  return rows[0] || null;
}

// ---------- country / catalog reads ----------

async function listCountries() {
  const { rows } = await query(
    `SELECT id, code, name, calling_code FROM locations_countries
     WHERE is_active = true ORDER BY sort_order, name`
  );
  return rows;
}

async function findCountryById(id) {
  const { rows } = await query(
    `SELECT id, code, name, calling_code FROM locations_countries WHERE id = $1`, [id]
  );
  return rows[0] || null;
}

async function findSubjectById(id) {
  const { rows } = await query(
    `SELECT id, name, slug, organization_id, review_status FROM subjects WHERE id = $1`, [id]
  );
  return rows[0] || null;
}

// Trimmed + case-insensitive lookup. This is the API half of the duplicate
// guard; the partial unique index on lower(btrim(name)) is the database half.
async function findGlobalSubjectByName(name) {
  const { rows } = await query(
    `SELECT id, name, slug, review_status FROM subjects
      WHERE organization_id IS NULL AND lower(btrim(name)) = lower(btrim($1))
      LIMIT 1`,
    [name]
  );
  return rows[0] || null;
}

async function findSubjectBySlug(slug) {
  const { rows } = await query(`SELECT id FROM subjects WHERE slug = $1`, [slug]);
  return rows[0] || null;
}

// The catalog's English identity lives in the slug, so a slug hit is a duplicate
// subject even when the typed name is a different language or spelling.
async function findGlobalSubjectBySlug(slug) {
  const { rows } = await query(
    `SELECT id, name, slug, review_status FROM subjects
      WHERE organization_id IS NULL AND slug = $1 LIMIT 1`,
    [slug]
  );
  return rows[0] || null;
}

async function insertGlobalSubject({ name, slug, description, createdBy }, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `INSERT INTO subjects (name, slug, description, organization_id, review_status, created_by)
     VALUES ($1, $2, $3, NULL, 'pending', $4)
     RETURNING id, name, slug, review_status`,
    [name, slug, description || null, createdBy || null]
  );
  return rows[0];
}

async function findGlobalSubjects({ search } = {}) {
  const conditions = [`organization_id IS NULL`, `review_status = 'approved'`];
  const params = [];
  if (search) { params.push(`%${search}%`); conditions.push(`name ILIKE $${params.length}`); }
  const { rows } = await query(
    `SELECT id, name, slug FROM subjects WHERE ${conditions.join(' AND ')} ORDER BY name LIMIT 500`,
    params
  );
  return rows;
}

async function linkSubject(teacherId, subjectId, client) {
  const run = client ? client.query.bind(client) : query;
  await run(
    `INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)
     ON CONFLICT (teacher_id, subject_id) DO NOTHING`,
    [teacherId, subjectId]
  );
}

async function unlinkSubject(teacherId, subjectId, client) {
  const run = client ? client.query.bind(client) : query;
  await run(`DELETE FROM teacher_subjects WHERE teacher_id = $1 AND subject_id = $2`, [teacherId, subjectId]);
  await run(`DELETE FROM teacher_pricing WHERE teacher_id = $1 AND subject_id = $2`, [teacherId, subjectId]);
}

async function insertTeacherSubject({ teacherId, subjectId, amount, currency, billingPeriod, languageCode, description }, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `INSERT INTO teacher_pricing
       (teacher_id, subject_id, pricing_type, amount, currency, billing_period, language_code, description, is_active)
     VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, true)
     ON CONFLICT (teacher_id, subject_id) WHERE subject_id IS NOT NULL AND is_active
     DO UPDATE SET amount = EXCLUDED.amount,
                   currency = EXCLUDED.currency,
                   billing_period = EXCLUDED.billing_period,
                   language_code = EXCLUDED.language_code,
                   description = EXCLUDED.description,
                   updated_at = now()
     RETURNING id`,
    [teacherId, subjectId, amount, currency || 'YER', billingPeriod || null, languageCode || null, description || null]
  );
  return rows[0];
}

// The form is the single source of truth for a teacher's subject list, so saving
// removes whatever is no longer in the payload. Without this, unchecking a
// subject would leave a stale price behind.
async function replaceTeacherSubjects(teacherId, entries, client) {
  const run = client ? client.query.bind(client) : query;
  const keep = entries.map((e) => Number(e.subjectId));
  await run(
    `DELETE FROM teacher_pricing
      WHERE teacher_id = $1 AND (subject_id IS NULL OR NOT (subject_id = ANY($2::int[])))`,
    [teacherId, keep]
  );
  await run(
    `DELETE FROM teacher_subjects
      WHERE teacher_id = $1 AND NOT (subject_id = ANY($2::int[]))`,
    [teacherId, keep.length ? keep : [0]]
  );
  for (const entry of entries) {
    await linkSubject(teacherId, Number(entry.subjectId), client);
    await insertTeacherSubject({ teacherId, ...entry }, client);
  }
}

async function listStages() {
  const { rows } = await query(
    `SELECT id, code, name, name_en FROM academic_stages WHERE is_active = true ORDER BY sort_order, name`
  );
  return rows;
}

async function setTeacherStages(teacherId, stageIds, client) {
  const run = client ? client.query.bind(client) : query;
  await run(`DELETE FROM teacher_stages WHERE teacher_id = $1`, [teacherId]);
  for (const stageId of stageIds) {
    await run(
      `INSERT INTO teacher_stages (teacher_id, stage_id) VALUES ($1, $2)
       ON CONFLICT (teacher_id, stage_id) DO NOTHING`,
      [teacherId, stageId]
    );
  }
}

async function replaceQualifications(teacherId, list, client) {
  const run = client ? client.query.bind(client) : query;
  await run(`DELETE FROM teacher_qualifications WHERE teacher_id = $1`, [teacherId]);
  for (const q of list) {
    await run(
      `INSERT INTO teacher_qualifications (teacher_id, title, institution_name, degree, year_obtained, document_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teacherId, q.title, q.institutionName || null, q.degree || null, q.year || null, q.documentUrl || null]
    );
  }
}

// ---------- weekly availability ----------

async function listAvailability(teacherId) {
  const { rows } = await query(
    `SELECT id, day_of_week, to_char(start_time, 'HH24:MI') AS start_time,
            to_char(end_time, 'HH24:MI') AS end_time, location_mode, notes
       FROM teacher_availability WHERE teacher_id = $1
      ORDER BY day_of_week, start_time`,
    [teacherId]
  );
  return rows;
}

async function replaceAvailability(teacherId, list, client) {
  const run = client ? client.query.bind(client) : query;
  await run(`DELETE FROM teacher_availability WHERE teacher_id = $1`, [teacherId]);
  for (const slot of list) {
    await run(
      `INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time, location_mode, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teacherId, slot.dayOfWeek, slot.startTime, slot.endTime, slot.locationMode, slot.notes || null]
    );
  }
}

// ---------- documents ----------

async function createDocument({ teacherId, uploadedBy, docType, fileName, filePath, mimeType, fileSize }, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `INSERT INTO teacher_documents
       (teacher_id, uploaded_by, doc_type, file_name, file_path, mime_type, file_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [teacherId, uploadedBy || null, docType || 'other', fileName, filePath, mimeType, fileSize]
  );
  return rows[0];
}

async function listDocuments(teacherId) {
  const { rows } = await query(
    `SELECT doc.*, u.name AS uploader_name, r.name AS reviewer_name
       FROM teacher_documents doc
       LEFT JOIN users u ON u.id = doc.uploaded_by
       LEFT JOIN users r ON r.id = doc.reviewer_id
      WHERE doc.teacher_id = $1 ORDER BY doc.created_at DESC`,
    [teacherId]
  );
  return rows;
}

async function listPendingDocuments() {
  const { rows } = await query(
    `SELECT doc.*, u.name AS uploader_name, tpu.name AS teacher_name
       FROM teacher_documents doc
       LEFT JOIN users u ON u.id = doc.uploaded_by
       JOIN teacher_profiles tp ON tp.id = doc.teacher_id
       JOIN users tpu ON tpu.id = tp.user_id
      WHERE doc.status = 'pending' ORDER BY doc.created_at DESC`
  );
  return rows;
}

async function findDocumentById(id) {
  const { rows } = await query(`SELECT * FROM teacher_documents WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function reviewDocument(id, { status, reviewNotes, reviewerId }) {
  const { rows } = await query(
    `UPDATE teacher_documents
        SET status = $2, review_notes = $3, reviewer_id = $4, reviewed_at = now()
      WHERE id = $1 RETURNING *`,
    [id, status, reviewNotes || null, reviewerId || null]
  );
  return rows[0] || null;
}

async function deleteDocument(id) {
  const { rows } = await query(`DELETE FROM teacher_documents WHERE id = $1 RETURNING file_path`, [id]);
  return rows[0] || null;
}

// ---------- deletion requests ----------

async function createDeletionRequest({ teacherId, requestedBy, reason }, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `INSERT INTO teacher_deletion_requests (teacher_id, requested_by, reason)
     VALUES ($1, $2, $3) RETURNING *`,
    [teacherId, requestedBy || null, reason]
  );
  return rows[0];
}

async function listDeletionRequests({ status } = {}) {
  const conditions = [];
  const params = [];
  if (status) { params.push(status); conditions.push(`dr.status = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT dr.*, u.name AS teacher_name, u.email AS teacher_email,
            req.name AS requested_by_name, rev.name AS reviewed_by_name
       FROM teacher_deletion_requests dr
       JOIN teacher_profiles tp ON tp.id = dr.teacher_id
       JOIN users u ON u.id = tp.user_id
       LEFT JOIN users req ON req.id = dr.requested_by
       LEFT JOIN users rev ON rev.id = dr.reviewed_by
       ${where}
      ORDER BY dr.created_at DESC`,
    params
  );
  return rows;
}

async function findDeletionRequestById(id) {
  const { rows } = await query(
    `SELECT dr.*, tp.user_id, tp.deleted_at AS teacher_deleted_at,
            u.status AS user_status, u.is_protected AS user_is_protected
       FROM teacher_deletion_requests dr
       JOIN teacher_profiles tp ON tp.id = dr.teacher_id
       JOIN users u ON u.id = tp.user_id
      WHERE dr.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findOpenDeletionRequest(teacherId) {
  const { rows } = await query(
    `SELECT * FROM teacher_deletion_requests WHERE teacher_id = $1 AND status = 'pending'`, [teacherId]
  );
  return rows[0] || null;
}

async function decideDeletionRequest(id, { status, decidedAction, reviewNotes, reviewerId }, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `UPDATE teacher_deletion_requests
        SET status = $2, decided_action = $3, review_notes = $4, reviewed_by = $5, reviewed_at = now()
      WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id, status, decidedAction || null, reviewNotes || null, reviewerId || null]
  );
  return rows[0] || null;
}

async function softDeleteUserById(userId, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `UPDATE users SET status = 'deleted', deleted_at = now(), updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = {
  listTeachers, countTeachers, findTeacherProfileById, findTeacherProfileByUserId,
  createTeacherProfile, updateTeacherProfile, softDeleteTeacher,
  listCountries, findCountryById,
  findSubjectById, findGlobalSubjectByName, findSubjectBySlug, findGlobalSubjectBySlug,
  insertGlobalSubject, findGlobalSubjects,
  linkSubject, unlinkSubject, insertTeacherSubject, replaceTeacherSubjects,
  listStages, setTeacherStages, replaceQualifications, listAvailability, replaceAvailability,
  createDocument, listDocuments, listPendingDocuments, findDocumentById, reviewDocument, deleteDocument,
  createDeletionRequest, listDeletionRequests, findDeletionRequestById,
  findOpenDeletionRequest, decideDeletionRequest, softDeleteUserById,
  getClient,
};
