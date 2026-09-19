// modules/academic/service.js
// OWNING MODULE: academic
// Business logic for academic catalog. Read-only in Phase 2B for the catalog
// tables; organization join writes are available for org ownership operations.

const repo = require('./repository');

function mapStage(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, slug: row.slug, sortOrder: row.sort_order, isActive: row.is_active };
}

function mapGrade(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, slug: row.slug, sortOrder: row.sort_order, stageId: row.stage_id, isActive: row.is_active };
}

function mapSubject(row) {
  if (!row) return null;
  return { id: row.id, name: row.name };
}

function mapCurriculum(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, isActive: row.is_active };
}

function mapLanguage(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, code: row.code, isActive: row.is_active };
}

function mapTeachingMethod(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, slug: row.slug, isActive: row.is_active };
}

async function listStages() { return (await repo.listStages()).map(mapStage); }
async function listGrades(stageId) { return (await repo.listGrades(stageId)).map(mapGrade); }
async function listSubjects() { return (await repo.listSubjects()).map(mapSubject); }
async function listCurricula() { return (await repo.listCurricula()).map(mapCurriculum); }
async function listLanguages() { return (await repo.listLanguages()).map(mapLanguage); }
async function listTeachingMethods() { return (await repo.listTeachingMethods()).map(mapTeachingMethod); }

// org joins (read)
async function listOrgStages(orgId) { return (await repo.listOrgStages(orgId)).map(mapStage); }
async function listOrgGrades(orgId) { return (await repo.listOrgGrades(orgId)).map(mapGrade); }
async function listOrgSubjects(orgId) { return (await repo.listOrgSubjects(orgId)).map(mapSubject); }
async function listOrgCurricula(orgId) { return (await repo.listOrgCurricula(orgId)).map(mapCurriculum); }
async function listOrgLanguages(orgId) { return (await repo.listOrgLanguages(orgId)).map(mapLanguage); }
async function listOrgTeachingMethods(orgId) { return (await repo.listOrgTeachingMethods(orgId)).map(mapTeachingMethod); }

module.exports = {
  listStages, listGrades, listSubjects, listCurricula, listLanguages, listTeachingMethods,
  listOrgStages, listOrgGrades, listOrgSubjects, listOrgCurricula, listOrgLanguages, listOrgTeachingMethods,
};