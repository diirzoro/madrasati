// modules/organizations/router.js
// OWNING MODULE: organizations
// API routes for organizations CRUD + memberships + campuses/facilities/services/capabilities.

const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { ForbiddenError } = require('../common/errors');
const { requireAuth, requireRole } = require('../identity/auth');

const router = Router();

// ---------- public listing ----------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { type, governorate, district, neighborhood, search, page, limit } = req.query;
    const result = await service.listOrganizations({
      type, governorate, district, neighborhood, search, page, limit,
    });
    res.json(result);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const org = await service.getOrganization(req.params.id);
    res.json(org);
  })
);

// ---------- create ----------
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'owner'),
  asyncHandler(async (req, res) => {
    const org = await service.createOrganization({ userId: req.user.id, data: req.body });
    res.status(201).json(org);
  })
);

// ---------- update ----------
router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'owner'),
  asyncHandler(async (req, res) => {
    const org = await service.updateOrganization({
      userId: req.user.id,
      userRole: req.user.role,
      id: req.params.id,
      data: req.body,
    });
    res.json(org);
  })
);

// ---------- delete (soft) ----------
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin', 'owner'),
  asyncHandler(async (req, res) => {
    const result = await service.deleteOrganization({
      userId: req.user.id,
      userRole: req.user.role,
      id: req.params.id,
    });
    res.json(result);
  })
);

// ---------- admin: verify/unverify ----------
router.patch(
  '/:id/verify',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const org = await service.setVerification(req.params.id, true);
    res.json(org);
  })
);

router.delete(
  '/:id/verify',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const org = await service.setVerification(req.params.id, false);
    res.json(org);
  })
);

// ---------- memberships ----------
router.get(
  '/:id/memberships',
  requireAuth,
  asyncHandler(async (req, res) => {
    const members = await service.listMemberships(req.params.id, { userId: req.user.id, userRole: req.user.role });
    res.json(members);
  })
);

router.post(
   '/:id/memberships',
   requireAuth,
   requireRole('admin', 'owner'),
   asyncHandler(async (req, res) => {
     // Check if user owns the organization (for owner role) or is admin
     if (req.user.role === 'owner') {
       const isOwner = await service.isOrganizationOwner(req.user.id, req.params.id);
       if (!isOwner) {
         throw new ForbiddenError('Not authorized to modify this organization');
       }
     }
     const member = await service.addMembership(req.user.id, req.params.id, req.body, { actorUserId: req.user.id });
     res.status(201).json(member);
   })
 );

router.delete(
   '/:id/memberships/:userId',
   requireAuth,
   requireRole('admin', 'owner'),
   asyncHandler(async (req, res) => {
     // Check if user owns the organization (for owner role) or is admin
     if (req.user.role === 'owner') {
       const isOwner = await service.isOrganizationOwner(req.user.id, req.params.id);
       if (!isOwner) {
         throw new ForbiddenError('Not authorized to modify this organization');
       }
     }
     const result = await service.removeMembership(req.params.userId, req.params.id, { actorUserId: req.user.id });
     res.json(result);
   })
 );

// ---------- campuses ----------
router.get(
   '/:id/campuses',
   requireAuth,
   asyncHandler(async (req, res) => {
     // Check if user has permission to access this organization
     if (req.user.role === 'owner') {
       const isOwner = await service.isOrganizationOwner(req.user.id, req.params.id);
       if (!isOwner) {
         throw new ForbiddenError('Not authorized to access this organization');
       }
     }
     // Admins can access any organization
     const campuses = await service.listCampuses(req.params.id);
     res.json(campuses);
   })
 );

router.post(
   '/:id/campuses',
   requireAuth,
   requireRole('admin', 'owner'),
   asyncHandler(async (req, res) => {
     // Check if user owns the organization (for owner role) or is admin
     if (req.user.role === 'owner') {
       const isOwner = await service.isOrganizationOwner(req.user.id, req.params.id);
       if (!isOwner) {
         throw new ForbiddenError('Not authorized to modify this organization');
       }
     }
     const campus = await service.createCampus(req.params.id, req.body, { actorUserId: req.user.id });
     res.status(201).json(campus);
   })
 );

// ---------- facilities ----------
router.get(
   '/:id/facilities',
   requireAuth,
   asyncHandler(async (req, res) => {
     // Check if user has permission to access this organization
     if (req.user.role === 'owner') {
       const isOwner = await service.isOrganizationOwner(req.user.id, req.params.id);
       if (!isOwner) {
         throw new ForbiddenError('Not authorized to access this organization');
       }
     }
     // Admins can access any organization
     const facilities = await service.listFacilities(req.params.id);
     res.json(facilities);
   })
 );

router.post(
   '/:id/facilities',
   requireAuth,
   requireRole('admin', 'owner'),
   asyncHandler(async (req, res) => {
     // Check if user owns the organization (for owner role) or is admin
     if (req.user.role === 'owner') {
       const isOwner = await service.isOrganizationOwner(req.user.id, req.params.id);
       if (!isOwner) {
         throw new ForbiddenError('Not authorized to modify this organization');
       }
     }
     const facility = await service.createFacility(req.params.id, req.body, { actorUserId: req.user.id });
     res.status(201).json(facility);
   })
 );

// ---------- services ----------
router.get(
   '/:id/services',
   requireAuth,
   asyncHandler(async (req, res) => {
     // Check if user has permission to access this organization
     if (req.user.role === 'owner') {
       const isOwner = await service.isOrganizationOwner(req.user.id, req.params.id);
       if (!isOwner) {
         throw new ForbiddenError('Not authorized to access this organization');
       }
     }
     // Admins can access any organization
     const services = await service.listServices(req.params.id);
     res.json(services);
   })
 );

router.post(
   '/:id/services',
   requireAuth,
   requireRole('admin', 'owner'),
   asyncHandler(async (req, res) => {
     // Check if user owns the organization (for owner role) or is admin
     if (req.user.role === 'owner') {
       const isOwner = await service.isOrganizationOwner(req.user.id, req.params.id);
       if (!isOwner) {
         throw new ForbiddenError('Not authorized to modify this organization');
       }
     }
     const svc = await service.createService(req.params.id, req.body, { actorUserId: req.user.id });
     res.status(201).json(svc);
   })
 );

// ---------- capabilities ----------
router.get(
   '/:id/capabilities',
   requireAuth,
   asyncHandler(async (req, res) => {
     // Check if user has permission to access this organization
     if (req.user.role === 'owner') {
       const isOwner = await service.isOrganizationOwner(req.user.id, req.params.id);
       if (!isOwner) {
         throw new ForbiddenError('Not authorized to access this organization');
       }
     }
     // Admins can access any organization
     const caps = await service.listCapabilities(req.params.id);
     res.json(caps);
   })
 );

router.put(
   '/:id/capabilities/:key',
   requireAuth,
   requireRole('admin', 'owner'),
   asyncHandler(async (req, res) => {
     // Check if user owns the organization (for owner role) or is admin
     if (req.user.role === 'owner') {
       const isOwner = await service.isOrganizationOwner(req.user.id, req.params.id);
       if (!isOwner) {
         throw new ForbiddenError('Not authorized to modify this organization');
       }
     }
     const cap = await service.upsertCapability(req.params.id, req.params.key, req.body.enabled);
     res.json(cap);
   })
 );

module.exports = router;