// modules/academic/router.js
// OWNING MODULE: academic
// Read-only catalog routes (stages, grades, subjects, etc.)
// + org-scoped join queries (require auth).

const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireOrgMember } = require('../identity/auth');

const router = Router();

// public catalog
router.get('/stages',             asyncHandler(async (_r, res) => { res.json(await service.listStages()); }));
router.get('/grades',             asyncHandler(async (r, res)  => { res.json(await service.listGrades(r.query.stageId)); }));
router.get('/subjects',           asyncHandler(async (_r, res) => { res.json(await service.listSubjects()); }));
router.get('/curricula',          asyncHandler(async (_r, res) => { res.json(await service.listCurricula()); }));
router.get('/languages',          asyncHandler(async (_r, res) => { res.json(await service.listLanguages()); }));
router.get('/teaching-methods',   asyncHandler(async (_r, res) => { res.json(await service.listTeachingMethods()); }));

// org-scoped (require auth + tenant membership)
router.get('/org/:orgId/stages',             requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgStages(r.params.orgId)); }));
router.get('/org/:orgId/grades',             requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgGrades(r.params.orgId)); }));
router.get('/org/:orgId/subjects',           requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgSubjects(r.params.orgId)); }));
router.get('/org/:orgId/curricula',          requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgCurricula(r.params.orgId)); }));
router.get('/org/:orgId/languages',          requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgLanguages(r.params.orgId)); }));
router.get('/org/:orgId/teaching-methods',   requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgTeachingMethods(r.params.orgId)); }));

module.exports = router;