// modules/organizations/service.js
// OWNING MODULE: organizations
// Business logic and DTO mapping for organizations. Depends only on
// identity module (for ownership verification) and common helpers.

const repo = require('./repository');
const { ValidationError, ForbiddenError, NotFoundError } = require('../common/errors');
const { parseJson } = require('../common/http');
const { writeAudit } = require('../common/audit');

const VALID_TYPES = ['private_school', 'government_school', 'college', 'university', 'institute'];
const VALID_STATUSES = ['active', 'archived', 'suspended'];

function mapOrganization(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_user_id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    description: row.description,
    governorate: row.governorate_name || row.governorate_code,
    district: row.district_name || row.district_code,
    governorateCode: row.governorate_code,
    districtCode: row.district_code,
    neighborhood: row.neighborhood,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    principalName: row.principal_name,
    email: row.email,
    website: row.website,
    image: row.image,
    gallery: parseJson(row.gallery, []),
    facilities: parseJson(row.facilities, []),
    offers: parseJson(row.offers, []),
    offersCount: row.offers_count || 0,
    services: Array.isArray(row.service_names) ? row.service_names : [],
    discounts: parseJson(row.discounts, []),
    activities: parseJson(row.activities, []),
    socialLinks: parseJson(row.social_links, []),
    mapUrl: row.map_url,
    registrationStatus: row.registration_status,
    registrationInfo: row.registration_info,
    stageAvailability: parseJson(row.stage_availability, {}),
    bio: row.bio,
    teachers: row.teachers || 0,
    students: row.students || 0,
    rating: row.rating || 0,
    reviews: row.reviews || 0,
    subjects: parseJson(row.subjects, []),
    stages: parseJson(row.stages, []),
    languages: parseJson(row.languages, []),
    teachingMethods: parseJson(row.teaching_methods, []),
    fees: parseJson(row.fees, {}),
    feeDetails: parseJson(row.fee_details, {}),
    grades: parseJson(row.grades, []),
    seatsAvailable: row.seats_available,
    registrationOpen: row.registration_open == null ? null : Boolean(row.registration_open),
    gender: row.gender,
    curriculum: row.curriculum,
    latitude: row.latitude,
    longitude: row.longitude,
    verified: Boolean(row.verified),
    verificationStatus: row.verification_status || 'pending',
    dataSource: row.data_source || 'postgres',
    dataStatus: row.deleted_at ? 'archived' : 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listOrganizations(filters) {
  // Public filter params stay as-is (governorate/district/neighborhood);
  // normalize to repository filter names without changing the API contract.
  const norm = { ...filters };
  if (norm.governorate && !norm.governorateCode) norm.governorateCode = norm.governorate;
  if (norm.district && !norm.districtCode) norm.districtCode = norm.district;
  delete norm.governorate;
  delete norm.district;
  const rows = await repo.listOrganizations(norm);
  const total = await repo.countOrganizations(norm);
  return { items: rows.map(mapOrganization), total };
}

async function getOrganization(id) {
  const row = await repo.findOrganizationById(id);
  if (!row || row.deleted_at) throw new NotFoundError('Organization not found');
  return mapOrganization(row);
}

async function createOrganization({ userId, data }) {
  if (!data.name) throw new ValidationError('name is required');
  if (data.type && !VALID_TYPES.includes(data.type)) throw new ValidationError('Invalid organization type');
  const fields = {
    ...data,
    owner_user_id: userId,
    data_source: data.dataSource || 'postgres',
  };
  if (!fields.rating) fields.rating = 0;
  if (!fields.teachers) fields.teachers = 0;
  if (!fields.students) fields.students = 0;
  if (!fields.reviews) fields.reviews = 0;
  const row = await repo.createOrganization(fields);
  await writeAudit({
    action: 'create',
    entityType: 'organization',
    entityId: row.id,
    organizationId: row.id,
    newValues: { name: data.name, type: data.type },
  });
  return mapOrganization(row);
}

async function updateOrganization({ userId, userRole, id, data }) {
  const existing = await repo.findOrganizationById(id);
  if (!existing || existing.deleted_at) throw new NotFoundError('Organization not found');
  if (userRole === 'owner') {
    const isOwner = await repo.isOrganizationOwner(userId, id);
    if (!isOwner) throw new NotFoundError('Organization not found');
  }
  const allowed = [
    'name', 'description', 'address', 'phone', 'email', 'image', 'gender', 'curriculum',
    'registration_status', 'registration_info', 'governorate_code', 'district_code',
    'neighborhood', 'stages', 'fees', 'social_links', 'map_url', 'gallery',
    'subjects', 'languages', 'teaching_methods', 'grades', 'fees', 'fee_details',
    'facilities', 'activities', 'offers', 'discounts', 'seats_available',
    'registration_open', 'bio', 'type', 'working_hours', 'video_url', 'website',
  ];
  const mapped = {
    name: data.name,
    description: data.description,
    address: data.address,
    phone: data.phone,
    email: data.email,
    image: data.image,
    gender: data.gender,
    curriculum: data.curriculum,
    registration_status: data.registration_status,
    registration_info: data.registration_info,
    governorate_code: data.governorate_code,
    district_code: data.district_code,
    neighborhood: data.neighborhood,
    stages: data.stages,
    fees: data.fees,
    social_links: data.social_links,
    map_url: data.mapUrl || data.map_url,
    gallery: data.gallery,
    subjects: data.subjects,
    languages: data.languages,
    teaching_methods: data.teachingMethods || data.teaching_methods,
    grades: data.grades,
    fee_details: data.feeDetails || data.fee_details,
    facilities: data.facilities,
    activities: data.activities,
    offers: data.offers,
    discounts: data.discounts,
    seats_available: data.seatsAvailable !== undefined ? data.seatsAvailable : data.seats_available,
    registration_open: data.registrationOpen !== undefined ? data.registrationOpen : data.registration_open,
    bio: data.bio,
    type: data.type,
    working_hours: data.workingHours || data.working_hours,
    video_url: data.videoUrl || data.video_url,
    website: data.website,
  };
  const updates = {};
  for (const [k, v] of Object.entries(mapped)) {
    if (v !== undefined && allowed.includes(k)) updates[k] = v;
  }
  if (!Object.keys(updates).length) throw new ValidationError('No editable fields supplied');
  const updated = await repo.updateOrganization(id, updates);
  await writeAudit({
    action: 'update',
    entityType: 'organization',
    entityId: id,
    organizationId: id,
    newValues: { fields: Object.keys(updates) },
  });
  return mapOrganization(updated);
}

async function deleteOrganization({ userId, userRole, id }) {
  const existing = await repo.findOrganizationById(id);
  if (!existing || existing.deleted_at) throw new NotFoundError('Organization not found');
  if (userRole === 'owner') {
    const isOwner = await repo.isOrganizationOwner(userId, id);
    if (!isOwner) throw new NotFoundError('Organization not found');
  }
  await repo.softDeleteOrganization(id);
  await writeAudit({ action: 'delete', entityType: 'organization', entityId: id, organizationId: id });
  return { success: true };
}

async function setVerification(id, verified) {
  const row = await repo.setVerification(id, verified, verified ? 'verified' : 'pending');
  if (!row) throw new NotFoundError('Organization not found');
  await writeAudit({
    action: verified ? 'verify' : 'unverify',
    entityType: 'organization',
    entityId: id,
    organizationId: id,
    newValues: { verified },
  });
  return mapOrganization(row);
}

async function listMemberships(organizationId, { userId, userRole } = {}) {
  const org = await repo.findOrganizationById(organizationId);
  if (!org) throw new NotFoundError('Organization not found');

  // Tenant isolation: memberships are private data
  // Admin can view all; owner can view own org; others must be members
  if (userRole === 'admin') {
    // admin can view all
  } else if (userRole === 'owner') {
    const isOwner = await repo.isOrganizationOwner(userId, organizationId);
    if (!isOwner) throw new ForbiddenError('Not authorized to view this organization memberships');
  } else {
    // For clients/teachers: check if they are members
    const membership = await repo.findMembership(userId, organizationId);
    if (!membership) throw new ForbiddenError('Not authorized to view this organization memberships');
  }

  return repo.listMemberships(organizationId);
}

async function addMembership(userId, organizationId, { membershipRole, status }, { actorUserId } = {}) {
  const membership = await repo.createMembership({ userId, organizationId, membershipRole, status });
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'add_membership',
    entityType: 'organization_membership',
    entityId: membership.id,
    organizationId,
    newValues: { user_id: userId, membership_role: membershipRole || 'member' },
  });
  return membership;
}

async function removeMembership(userId, organizationId, { actorUserId } = {}) {
  const result = await repo.deleteMembership(userId, organizationId);
  if (!result) throw new NotFoundError('Membership not found');
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'remove_membership',
    entityType: 'organization_membership',
    entityId: result.id,
    organizationId,
    oldValues: { user_id: userId },
  });
  return { success: true };
}

async function listCampuses(organizationId) {
  return repo.listCampuses(organizationId);
}

async function createCampus(organizationId, data, { actorUserId } = {}) {
  const campus = await repo.createCampus(organizationId, data);
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'create',
    entityType: 'organization_campus',
    entityId: campus.id,
    organizationId,
    newValues: { name: data.name },
  });
  return campus;
}

async function listFacilities(organizationId) {
  return repo.listFacilities(organizationId);
}

async function createFacility(organizationId, data, { actorUserId } = {}) {
  if (!data.facilityType) throw new ValidationError('facilityType is required');
  if (!data.name) throw new ValidationError('name is required');
  const facility = await repo.createFacility(organizationId, data);
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'create',
    entityType: 'organization_facility',
    entityId: facility.id,
    organizationId,
    newValues: { name: data.name, facility_type: data.facilityType },
  });
  return facility;
}

async function listServices(organizationId) {
  return repo.listServices(organizationId);
}

async function createService(organizationId, data, { actorUserId } = {}) {
  if (!data.serviceType) throw new ValidationError('serviceType is required');
  if (!data.name) throw new ValidationError('name is required');
  const svc = await repo.createService(organizationId, data);
  await writeAudit({
    actorUserId: actorUserId || null,
    action: 'create',
    entityType: 'organization_service',
    entityId: svc.id,
    organizationId,
    newValues: { name: data.name, service_type: data.serviceType },
  });
  return svc;
}

async function listCapabilities(organizationId) {
  return repo.listCapabilities(organizationId);
}

async function upsertCapability(organizationId, key, enabled) {
  if (!key) throw new ValidationError('capability key is required');
  return repo.upsertCapability(organizationId, key, Boolean(enabled));
}

async function isOrganizationOwner(userId, organizationId) {
   return await repo.isOrganizationOwner(userId, organizationId);
}

module.exports = {
   mapOrganization,
   listOrganizations,
   getOrganization,
   createOrganization,
   updateOrganization,
   deleteOrganization,
   setVerification,
   listMemberships,
   addMembership,
   removeMembership,
   listCampuses,
   createCampus,
   listFacilities,
   createFacility,
   listServices,
   createService,
   listCapabilities,
   upsertCapability,
   isOrganizationOwner
};