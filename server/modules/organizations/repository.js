// modules/organizations/repository.js
// OWNING MODULE: organizations
// Data access for organizations, organization_memberships, organization_campuses,
// organization_facilities, organization_services, organization_capabilities.
// Scope: organization_id = the canonical tenant key.

const { query } = require('../common/pool');

const ALLOWED_FILTER_PARAMS = ['search', 'type', 'governorateCode', 'districtCode', 'neighborhood', 'stage', 'verified', 'status', 'ownerUserId', 'sort', 'limit', 'offset'];

function buildListQuery(filters) {
  const conditions = [];
  const params = [];
  if (filters.search) {
    params.push(filters.search);
    params.push(`%${filters.search}%`);
    conditions.push(
      `(o.search_vector @@ plainto_tsquery('simple', $${params.length - 1})
        OR o.name ILIKE $${params.length}
        OR o.description ILIKE $${params.length})`
    );
  }
  if (filters.type) {
    params.push(filters.type);
    conditions.push(`o.type = $${params.length}`);
  }
  if (filters.governorateCode) {
    params.push(filters.governorateCode);
    conditions.push(`o.governorate_code = $${params.length}`);
  }
  if (filters.districtCode) {
    params.push(filters.districtCode);
    conditions.push(`o.district_code = $${params.length}`);
  }
  if (filters.neighborhood) {
    params.push(`%${filters.neighborhood}%`);
    conditions.push(`o.neighborhood ILIKE $${params.length}`);
  }
  if (filters.stage) {
    params.push(filters.stage);
    conditions.push(`o.stages ? $${params.length}`);
  }
  if (filters.verified !== undefined && filters.verified !== '') {
    params.push(filters.verified === 'true');
    conditions.push(`o.verified = $${params.length}`);
  }
  if (filters.ownerUserId) {
    params.push(filters.ownerUserId);
    conditions.push(`o.owner_user_id = $${params.length}`);
  }
  conditions.push(`o.deleted_at IS NULL`);
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function listOrganizations(filters = {}) {
  const { where, params } = buildListQuery(filters);
  const limit = Number(filters.limit) || 50;
  const offset = Number(filters.offset) || 0;
  let orderBy = 'o.rating DESC, o.name';
  const sort = (filters.sort || 'rating').toLowerCase();
  if (sort === 'name') orderBy = 'o.name';
  else if (sort === 'rating') orderBy = 'o.rating DESC';
  else if (sort === 'newest') orderBy = 'o.created_at DESC';
  // 'nearest'/'fee_asc'/'fee_desc' deferred; fallback to rating
  params.push(limit);
  params.push(offset);
  const { rows } = await query(
    `SELECT o.*,
       (SELECT COUNT(*)::int FROM offers f
         WHERE f.organization_id = o.id
           AND f.active = true
           AND (f.starts_at IS NULL OR f.starts_at <= now())
           AND (f.ends_at IS NULL OR f.ends_at >= now())) AS offers_count
     FROM organizations o
     ${where}
     ORDER BY ${orderBy}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function countOrganizations(filters = {}) {
  const { where, params } = buildListQuery(filters);
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM organizations o ${where}`,
    params
  );
  return rows[0].count;
}

async function findOrganizationById(id) {
  const { rows } = await query(
    `SELECT o.*,
       (SELECT COUNT(*)::int FROM offers f
         WHERE f.organization_id = o.id
           AND f.active = true
           AND (f.starts_at IS NULL OR f.starts_at <= now())
           AND (f.ends_at IS NULL OR f.ends_at >= now())) AS offers_count
     FROM organizations o WHERE o.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findOrganizationBySlug(slug) {
  const { rows } = await query(`SELECT * FROM organizations WHERE slug = $1 AND deleted_at IS NULL`, [slug]);
  return rows[0] || null;
}

async function createOrganization(fields) {
  const allowed = [
    'owner_user_id', 'name', 'slug', 'type', 'description',
    'governorate_id', 'district_id', 'address', 'phone', 'email',
    'image', 'gallery', 'social_links', 'map_url', 'gender', 'curriculum',
    'latitude', 'longitude', 'verified', 'verification_status', 'data_source',
    'seats_available', 'registration_open', 'registration_status', 'registration_info',
    'stage_availability', 'bio', 'teachers', 'students', 'reviews', 'rating',
    'subjects', 'stages', 'languages', 'teaching_methods', 'grades', 'fees',
    'fee_details', 'facilities', 'activities', 'offers', 'discounts',
    'working_hours', 'governorate_code', 'district_code', 'neighborhood',
    'video_url', 'website',
  ];
  const keys = allowed.filter((k) => fields[k] !== undefined);
  const values = keys.map((k) => {
    const v = fields[k];
    return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
  });
  const columns = keys.join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO organizations (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0];
}

async function updateOrganization(id, fields) {
  const allowed = [
    'name', 'slug', 'type', 'description',
    'governorate_id', 'district_id', 'address', 'phone', 'email',
    'image', 'gallery', 'social_links', 'map_url', 'gender', 'curriculum',
    'latitude', 'longitude', 'verification_status', 'data_source',
    'seats_available', 'registration_open', 'registration_status', 'registration_info',
    'stage_availability', 'bio', 'teachers', 'students', 'reviews', 'rating',
    'subjects', 'stages', 'languages', 'teaching_methods', 'grades', 'fees',
    'fee_details', 'facilities', 'activities', 'offers', 'discounts',
    'working_hours', 'governorate_code', 'district_code', 'neighborhood',
    'video_url', 'website',
  ];
  const keys = allowed.filter((k) => fields[k] !== undefined);
  if (!keys.length) return null;
  const assignments = keys
    .map((k, i) => {
      const v = fields[k];
      return `${k} = $${i + 1}`;
    })
    .join(', ');
  const values = keys.map((k) => {
    const v = fields[k];
    return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
  });
  const { rows } = await query(
    `UPDATE organizations SET ${assignments}, updated_at = now() WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  return rows[0] || null;
}

async function softDeleteOrganization(id) {
  const { rows } = await query(
    `UPDATE organizations SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id]
  );
  return rows[0] || null;
}

async function setVerification(id, verified, verificationStatus) {
  const { rows } = await query(
    `UPDATE organizations
     SET verified = $2,
         verification_status = $3,
         updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id, verified, verificationStatus || (verified ? 'verified' : 'pending')]
  );
  return rows[0] || null;
}

// ---------- memberships ----------
async function listMemberships(organizationId) {
  const { rows } = await query(
    `SELECT om.*, u.name, u.email
     FROM organization_memberships om
     JOIN users u ON u.id = om.user_id
     WHERE om.organization_id = $1
     ORDER BY om.joined_at`,
    [organizationId]
  );
  return rows;
}

async function findMembership(userId, organizationId) {
  const { rows } = await query(
    `SELECT * FROM organization_memberships WHERE user_id = $1 AND organization_id = $2`,
    [userId, organizationId]
  );
  return rows[0] || null;
}

async function createMembership({ userId, organizationId, membershipRole, status }) {
  const { rows } = await query(
    `INSERT INTO organization_memberships (user_id, organization_id, membership_role, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, organization_id) DO UPDATE
       SET membership_role = EXCLUDED.membership_role, status = EXCLUDED.status
     RETURNING *`,
    [userId, organizationId, membershipRole || 'member', status || 'active']
  );
  return rows[0];
}

async function deleteMembership(userId, organizationId) {
  const { rows } = await query(
    `DELETE FROM organization_memberships WHERE user_id = $1 AND organization_id = $2 RETURNING id`,
    [userId, organizationId]
  );
  return rows[0] || null;
}

// ---------- campuses ----------
async function listCampuses(organizationId) {
  const { rows } = await query(
    `SELECT * FROM organization_campuses WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY is_primary DESC, name`,
    [organizationId]
  );
  return rows;
}

async function createCampus(organizationId, fields) {
  const { rows } = await query(
    `INSERT INTO organization_campuses (organization_id, name, is_primary, governorate_id, district_id, neighborhood_id, address, latitude, longitude, map_url, contact_phone, working_hours)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      organizationId,
      fields.name,
      fields.isPrimary || false,
      fields.governorateId || null,
      fields.districtId || null,
      fields.neighborhoodId || null,
      fields.address || null,
      fields.latitude || null,
      fields.longitude || null,
      fields.mapUrl || null,
      fields.contactPhone || null,
      fields.workingHours ? JSON.stringify(fields.workingHours) : null,
    ]
  );
  return rows[0];
}

// ---------- facilities ----------
async function listFacilities(organizationId) {
  const { rows } = await query(
    `SELECT * FROM organization_facilities WHERE organization_id = $1 ORDER BY sort_order, name`,
    [organizationId]
  );
  return rows;
}

async function createFacility(organizationId, fields) {
  const { rows } = await query(
    `INSERT INTO organization_facilities (organization_id, facility_type, name, description, quantity, available, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      organizationId,
      fields.facilityType,
      fields.name,
      fields.description || null,
      fields.quantity || 1,
      fields.available !== undefined ? fields.available : true,
      fields.sortOrder || 0,
    ]
  );
  return rows[0];
}

// ---------- services ----------
async function listServices(organizationId) {
  const { rows } = await query(
    `SELECT * FROM organization_services WHERE organization_id = $1 ORDER BY sort_order, name`,
    [organizationId]
  );
  return rows;
}

async function createService(organizationId, fields) {
  const { rows } = await query(
    `INSERT INTO organization_services (organization_id, service_type, name, description, price, currency, available, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      organizationId,
      fields.serviceType,
      fields.name,
      fields.description || null,
      fields.price || null,
      fields.currency || 'YER',
      fields.available !== undefined ? fields.available : true,
      fields.sortOrder || 0,
    ]
  );
  return rows[0];
}

// ---------- capabilities ----------
async function listCapabilities(organizationId) {
  const { rows } = await query(
    `SELECT * FROM organization_capabilities WHERE organization_id = $1 ORDER BY capability_key`,
    [organizationId]
  );
  return rows;
}

async function upsertCapability(organizationId, key, enabled) {
  const { rows } = await query(
    `INSERT INTO organization_capabilities (organization_id, capability_key, enabled)
     VALUES ($1, $2, $3)
     ON CONFLICT (organization_id, capability_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()
     RETURNING *`,
    [organizationId, key, enabled]
  );
  return rows[0];
}

async function isOrganizationOwner(userId, organizationId) {
  const { rows } = await query(
    `SELECT 1 FROM organizations WHERE id = $1 AND owner_user_id = $2 AND deleted_at IS NULL`,
    [organizationId, userId]
  );
  return Boolean(rows[0]);
}

async function getMembershipRole(userId, organizationId) {
  const { rows } = await query(
    `SELECT membership_role FROM organization_memberships WHERE user_id = $1 AND organization_id = $2`,
    [userId, organizationId]
  );
  return rows[0] ? rows[0].membership_role : null;
}

module.exports = {
  listOrganizations,
  countOrganizations,
  findOrganizationById,
  findOrganizationBySlug,
  createOrganization,
  updateOrganization,
  softDeleteOrganization,
  setVerification,
  listMemberships,
  findMembership,
  createMembership,
  deleteMembership,
  listCampuses,
  createCampus,
  listFacilities,
  createFacility,
  listServices,
  createService,
  listCapabilities,
  upsertCapability,
  isOrganizationOwner,
  getMembershipRole,
};