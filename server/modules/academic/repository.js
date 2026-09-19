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
    where = `WHERE stage_id = $${params.length} AND is_active = true`;
  } else {
    where = 'WHERE is_active = true';
  }
  const { rows } = await query(`SELECT * FROM academic_grades ${where} ORDER BY sort_order, name`, params);
  return rows;
}

async function listSubjects() {
  const { rows } = await query(`SELECT * FROM subjects ORDER BY name`);
  return rows;
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

async function listOrgSubjects(orgId) {
  const { rows } = await query(
    `SELECT s.* FROM organization_subjects os2
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
  listOrgStages, setOrgStages,
  listOrgGrades, setOrgGrades,
  listOrgSubjects, setOrgSubjects,
  listOrgCurricula, setOrgCurricula,
  listOrgLanguages, setOrgLanguages,
  listOrgTeachingMethods, setOrgTeachingMethods,
};