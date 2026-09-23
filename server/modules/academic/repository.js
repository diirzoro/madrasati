// modules/academic/repository.js
// OWNING MODULE: academic
// Shared reference: academic catalog queries + organization join tables.
// Scope: catalog tables GLOBAL, join tables ORGANIZATION-OWNED.

const { pool, query } = require('../common/pool');

async function listStages() {
  const { rows } = await query(`SELECT * FROM academic_stages WHERE is_active = true ORDER BY sort_order, name`);
  return rows;
}

async function listGrades(stageId) {
  const params = [];
  let where = '';
  if (stageId) {
    params.push(stageId);
    where = `WHERE g.stage_id = $${params.length} AND g.is_active = true`;
  } else {
    where = 'WHERE g.is_active = true';
  }
  const { rows } = await query(
    `SELECT g.*, s.name AS stage_name FROM academic_grades g
     JOIN academic_stages s ON s.id = g.stage_id
     ${where} ORDER BY s.sort_order, g.sort_order, g.name`,
    params
  );
  return rows;
}

// ---------- global catalog writes (platform admin only) ----------
async function createStage({ code, name, nameEn, description, sortOrder }) {
  const { rows } = await query(
    `INSERT INTO academic_stages (code, name, name_en, description, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
    [code, name, nameEn, description, sortOrder]
  );
  return rows[0];
}

async function createGrade({ stageId, code, name, description, track, sortOrder }) {
  const { rows } = await query(
    `INSERT INTO academic_grades (stage_id, code, name, description, track, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
    [stageId, code, name, description, track, sortOrder]
  );
  return rows[0];
}

async function updateGrade(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return null;
  const assignments = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => fields[k]);
  values.push(id);
  const { rows } = await query(
    `UPDATE academic_grades SET ${assignments} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

// The global catalog lists platform-wide subjects only. A subject an institution
// added for itself carries an organization_id and is filtered out here, so
// "the catalog" never grows a private row just because one school needed it.
async function listSubjects() {
  const { rows } = await query(
    `SELECT * FROM subjects WHERE organization_id IS NULL ORDER BY name`
  );
  return rows;
}

async function findSubjectById(id) {
  const { rows } = await query(`SELECT * FROM subjects WHERE id = $1`, [id]);
  return rows[0] || null;
}

// Every subject an institution defined for itself, newest first. The global
// catalog is `organization_id IS NULL`, so this is exactly its mirror image, and
// the review state is what the platform admin acts on.
async function listOrgSubjectProposals({ reviewStatus } = {}) {
  const params = [];
  let where = 'WHERE s.organization_id IS NOT NULL';
  if (reviewStatus) { params.push(reviewStatus); where += ` AND s.review_status = $${params.length}`; }
  const { rows } = await query(
    `SELECT s.*, o.name AS organization_name, o.type AS organization_type
       FROM subjects s
       LEFT JOIN organizations o ON o.id = s.organization_id
       ${where}
      ORDER BY s.created_at DESC NULLS LAST, s.name`,
    params
  );
  return rows;
}

async function findSubjectBySlug(slug) {
  const { rows } = await query(`SELECT id FROM subjects WHERE slug = $1`, [slug]);
  return rows[0] || null;
}

// An institution's own subject. It lands in the same subjects table as the
// global catalog -- there is deliberately no second subject system -- and starts
// as 'pending' so the platform admin keeps supervision over what institutions
// teach.
async function createOrgSubject({ organizationId, name, slug, description, createdBy }) {
  const { rows } = await query(
    `INSERT INTO subjects (name, slug, description, organization_id, review_status, created_by)
     VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING *`,
    [name, slug, description, organizationId, createdBy || null]
  );
  return rows[0];
}

async function reviewSubject(id, { status, note }) {
  const { rows } = await query(
    `UPDATE subjects SET review_status = $1, review_note = $2
     WHERE id = $3 AND organization_id IS NOT NULL RETURNING *`,
    [status, note || null, id]
  );
  return rows[0] || null;
}

async function listCurricula() {
  const { rows } = await query(`SELECT * FROM curricula WHERE is_active = true ORDER BY name`);
  return rows;
}

async function listLanguages() {
  const { rows } = await query(`SELECT * FROM languages WHERE is_active = true ORDER BY name`);
  return rows;
}

async function listTeachingMethods() {
  const { rows } = await query(`SELECT * FROM teaching_methods WHERE is_active = true ORDER BY name`);
  return rows;
}

// ---------- organization join tables ----------
async function listOrgStages(orgId) {
  const { rows } = await query(
    `SELECT s.* FROM organization_stages os JOIN academic_stages s ON s.id = os.stage_id WHERE os.organization_id = $1 ORDER BY s.sort_order, s.name`,
    [orgId]
  );
  return rows;
}

async function setOrgStages(orgId, stageIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM organization_stages WHERE organization_id = $1`, [orgId]);
    for (const stageId of stageIds) {
      await client.query(
        `INSERT INTO organization_stages (organization_id, stage_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [orgId, stageId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listOrgGrades(orgId) {
  const { rows } = await query(
    `SELECT g.*, s.name AS stage_name FROM organization_grades og
     JOIN academic_grades g ON g.id = og.grade_id
     JOIN academic_stages s ON s.id = g.stage_id
     WHERE og.organization_id = $1 ORDER BY s.sort_order, g.sort_order`,
    [orgId]
  );
  return rows;
}

async function setOrgGrades(orgId, gradeIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM organization_grades WHERE organization_id = $1`, [orgId]);
    for (const gradeId of gradeIds) {
      await client.query(
        `INSERT INTO organization_grades (organization_id, grade_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [orgId, gradeId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// An institution's subject list is the global catalog it picked from PLUS the
// subjects it defined for itself. `is_global` and `review_status` come along so
// the screen can mark which rows are the platform's and which are this
// institution's own, still awaiting or already past admin review.
async function listOrgSubjects(orgId) {
  const { rows } = await query(
    `SELECT s.*, s.organization_id IS NULL AS is_global,
            os2.language_code, os2.fee_amount, os2.currency, os2.frequency
     FROM organization_subjects os2
     JOIN subjects s ON s.id = os2.subject_id
     WHERE os2.organization_id = $1 ORDER BY s.name`,
    [orgId]
  );
  return rows;
}

async function setOrgSubjects(orgId, subjectIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM organization_subjects WHERE organization_id = $1`, [orgId]);
    for (const subjectId of subjectIds) {
      await client.query(
        `INSERT INTO organization_subjects (organization_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [orgId, subjectId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listOrgCurricula(orgId) {
  const { rows } = await query(
    `SELECT c.* FROM organization_curricula oc JOIN curricula c ON c.id = oc.curriculum_id WHERE oc.organization_id = $1 ORDER BY c.name`,
    [orgId]
  );
  return rows;
}

async function setOrgCurricula(orgId, curriculumIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM organization_curricula WHERE organization_id = $1`, [orgId]);
    for (const id of curriculumIds) {
      await client.query(`INSERT INTO organization_curricula (organization_id, curriculum_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [orgId, id]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listOrgLanguages(orgId) {
  const { rows } = await query(
    `SELECT l.* FROM organization_languages ol JOIN languages l ON l.id = ol.language_id WHERE ol.organization_id = $1 ORDER BY l.name`,
    [orgId]
  );
  return rows;
}

async function setOrgLanguages(orgId, languageIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM organization_languages WHERE organization_id = $1`, [orgId]);
    for (const id of languageIds) {
      await client.query(`INSERT INTO organization_languages (organization_id, language_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [orgId, id]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------- organization offering (the priced, capacity-bearing layer) ----------
// Each function below works on ONE institution. The catalog row it points at
// (stage / subject) is read-only reference data; everything priced or sized
// lives on the junction row or on the stage-scoped fee.

async function listOrgStageOffers(orgId) {
  const { rows } = await query(
    `SELECT os.id AS offer_id, os.stage_id, os.delivery_mode, os.language_code,
            os.capacity, os.current_students, os.remaining_seats,
            s.code AS stage_code, s.name AS stage_name, s.sort_order
     FROM organization_stages os
     JOIN academic_stages s ON s.id = os.stage_id
     WHERE os.organization_id = $1
     ORDER BY s.sort_order, s.name`,
    [orgId]
  );
  return rows;
}

async function upsertOrgStageOffer(orgId, stageId, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return null;
  // Capacity is the only size input; remaining_seats is a generated column and
  // is never written (AGENTS.md rule 4).
  const cols = ['organization_id', 'stage_id'].concat(keys);
  const params = [orgId, stageId].concat(keys.map((k) => fields[k]));
  const setList = keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ');
  const { rows } = await query(
    `INSERT INTO organization_stages (${cols.join(', ')})
     VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (organization_id, stage_id) DO UPDATE SET ${setList}
     RETURNING *`,
    params
  );
  return rows[0] || null;
}

async function removeOrgStageOffer(orgId, stageId) {
  const { rows } = await query(
    `DELETE FROM organization_stages WHERE organization_id = $1 AND stage_id = $2 RETURNING id`,
    [orgId, stageId]
  );
  return rows[0] || null;
}

async function upsertOrgSubjectOffer(orgId, subjectId, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return null;
  const setList = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => fields[k]);
  values.push(orgId, subjectId);
  const { rows } = await query(
    `UPDATE organization_subjects SET ${setList}
     WHERE organization_id = $${values.length - 1} AND subject_id = $${values.length}
     RETURNING *`,
    values
  );
  if (rows[0]) return rows[0];
  const cols = ['organization_id', 'subject_id'].concat(keys);
  const params = [orgId, subjectId].concat(keys.map((k) => fields[k]));
  const { rows: created } = await query(
    `INSERT INTO organization_subjects (${cols.join(', ')})
     VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (organization_id, subject_id) DO NOTHING RETURNING *`,
    params
  );
  return created[0] || null;
}

async function removeOrgSubjectOffer(orgId, subjectId) {
  const { rows } = await query(
    `DELETE FROM organization_subjects WHERE organization_id = $1 AND subject_id = $2 RETURNING id`,
    [orgId, subjectId]
  );
  return rows[0] || null;
}

async function listOrgTeachingMethods(orgId) {
  const { rows } = await query(
    `SELECT tm.* FROM organization_teaching_methods otm
     JOIN teaching_methods tm ON tm.id = otm.teaching_method_id
     WHERE otm.organization_id = $1 ORDER BY tm.name`,
    [orgId]
  );
  return rows;
}

async function setOrgTeachingMethods(orgId, methodIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM organization_teaching_methods WHERE organization_id = $1`, [orgId]);
    for (const id of methodIds) {
      await client.query(`INSERT INTO organization_teaching_methods (organization_id, teaching_method_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [orgId, id]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listStages, listGrades, listSubjects, listCurricula, listLanguages, listTeachingMethods,
  createStage, createGrade, updateGrade,
  findSubjectById, findSubjectBySlug, listOrgSubjectProposals, createOrgSubject, reviewSubject,
  listOrgStages, setOrgStages,
  listOrgGrades, setOrgGrades,
  listOrgSubjects, setOrgSubjects,
  listOrgStageOffers, upsertOrgStageOffer, removeOrgStageOffer,
  upsertOrgSubjectOffer, removeOrgSubjectOffer,
  listOrgCurricula, setOrgCurricula,
  listOrgLanguages, setOrgLanguages,
  listOrgTeachingMethods, setOrgTeachingMethods,
};