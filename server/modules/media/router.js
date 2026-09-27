// modules/media/router.js
// OWNING MODULE: media
// Entity media upload + registry reads. The owner is the entity id in the URL; an
// owner actor may only upload for the institution they own, and a direct write to
// another tenant's institution returns 404 (existence is not confirmed).

const express = require('express');
const { Router } = require('express');
const service = require('./service');
const repo = require('./repository');
const orgRepo = require('../organizations/repository');
const { asyncHandler } = require('../common/http');
const { requireAuth, requireRole } = require('../identity/auth');
const { NotFoundError } = require('../common/errors');

const router = Router();

// Raw image body (no multipart dependency), original name in X-File-Name.
const rawImage = express.raw({ limit: '7mb', type: 'application/octet-stream' });

async function loadOwnedOrg(req) {
  const org = await orgRepo.findOrganizationById(req.params.id);
  if (!org || org.deleted_at) throw new NotFoundError('Organization not found');
  if (req.user.role !== 'admin') {
    const owns = await orgRepo.isOrganizationOwner(req.user.id, req.params.id);
    if (!owns) throw new NotFoundError('Organization not found');
  }
  return org;
}

// POST /api/media/organization/:id?type=logo|cover|gallery|facility|document
// X-File-Name carries the original name. The stored location is derived from the
// organization id, never from the request.
router.post(
  '/organization/:id',
  requireAuth,
  requireRole('admin', 'owner'),
  rawImage,
  asyncHandler(async (req, res) => {
    const org = await loadOwnedOrg(req);
    const result = await service.uploadOrganizationMedia(
      org,
      { mediaType: req.query.type, originalName: req.headers['x-file-name'] || 'file', actorUserId: req.user.id },
      req.body
    );
    res.status(201).json(result);
  })
);

// GET /api/media/organization/:id — the registry row for one organization.
router.get(
  '/organization/:id',
  requireAuth,
  requireRole('admin', 'owner'),
  asyncHandler(async (req, res) => {
    const org = await loadOwnedOrg(req);
    res.json({ entityType: 'organization', entityId: org.id, media: await repo.getRegistry(org.id) });
  })
);

module.exports = router;
