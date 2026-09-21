// modules/academic/router.js
// OWNING MODULE: academic
// Read-only catalog routes (stages, grades, subjects, etc.)
// + org-scoped join queries (require auth).

const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireRole, requireOrgMember, optionalAuth } = require('../identity/auth');

const router = Router();

// public catalog
router.get('/stages',             asyncHandler(async (_r, res) => { res.json(await service.listStages()); }));
router.get('/grades',             asyncHandler(async (r, res)  => { res.json(await service.listGrades(r.query.stageId)); }));
router.get('/subjects',           asyncHandler(async (_r, res) => { res.json(await service.listSubjects()); }));
router.get('/curricula',          asyncHandler(async (_r, res) => { res.json(await service.listCurricula()); }));
router.get('/languages',          asyncHandler(async (_r, res) => { res.json(await service.listLanguages()); }));
router.get('/teaching-methods',   asyncHandler(async (_r, res) => { res.json(await service.listTeachingMethods()); }));

// ---------- global catalog writes (platform admin only) ----------
// The catalog is an abstract, price-free definition of stages and grades. It is
// written here and only here; an institution's prices, capacity and languages
// live on the organization offering endpoints in the organizations module.
router.post('/stages', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  res.status(201).json(await service.createStage(req.body));
}));

router.post('/grades', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  res.status(201).json(await service.createGrade(req.body));
}));

router.patch('/grades/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  res.json(await service.updateGrade(req.params.id, req.body));
}));

// org-scoped (require auth + tenant membership)
router.get('/org/:orgId/stages',             requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgStages(r.params.orgId)); }));
router.get('/org/:orgId/grades',             requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgGrades(r.params.orgId)); }));
router.get('/org/:orgId/subjects',           requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgSubjects(r.params.orgId)); }));

// ---------- organization offering (tenant-scoped, priced, sized) ----------
// Every write below carries requireOrgMember so a caller can only change the
// offering of an institution they belong to, and an outsider gets a 404 rather
// than a confirmation that the institution exists (AGENTS.md rule 7).
router.get('/org/:orgId/offering', requireAuth, requireOrgMember(), asyncHandler(async (r, res) => {
  res.json(await service.getOrgOffering(r.params.orgId, { canSeePricing: true }));
}));

// Public, pricing-gated read of the same offering. An anonymous parent search
// needs to know which stages and subjects an institution teaches; the amounts
// are stripped server-side and `pricingGated` tells the UI to ask for a login.
router.get('/org/:orgId/offering/public', optionalAuth, asyncHandler(async (r, res) => {
  const userId = r.user ? r.user.id : null;
  const canSeePricing = await service.canSeeOrgPricing(userId, r.params.orgId, r.user ? r.user.role : null);
  res.json(await service.getOrgOffering(r.params.orgId, { canSeePricing }));
}));

router.put('/org/:orgId/offering/stages/:stageId', requireAuth, requireOrgMember(), requireRole('admin', 'owner'), asyncHandler(async (r, res) => {
  res.json(await service.setStageOffer(r.params.orgId, r.params.stageId, r.body, { actorUserId: r.user.id }));
}));

router.delete('/org/:orgId/offering/stages/:stageId', requireAuth, requireOrgMember(), requireRole('admin', 'owner'), asyncHandler(async (r, res) => {
  res.json(await service.removeStageOffer(r.params.orgId, r.params.stageId));
}));

router.put('/org/:orgId/offering/subjects/:subjectId', requireAuth, requireOrgMember(), requireRole('admin', 'owner'), asyncHandler(async (r, res) => {
  res.json(await service.setSubjectOffer(r.params.orgId, r.params.subjectId, r.body, { actorUserId: r.user.id }));
}));

router.delete('/org/:orgId/offering/subjects/:subjectId', requireAuth, requireOrgMember(), requireRole('admin', 'owner'), asyncHandler(async (r, res) => {
  res.json(await service.removeSubjectOffer(r.params.orgId, r.params.subjectId));
}));
router.get('/org/:orgId/curricula',          requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgCurricula(r.params.orgId)); }));
router.get('/org/:orgId/languages',          requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgLanguages(r.params.orgId)); }));
router.get('/org/:orgId/teaching-methods',   requireAuth, requireOrgMember(), asyncHandler(async (r, res) => { res.json(await service.listOrgTeachingMethods(r.params.orgId)); }));

module.exports = router;