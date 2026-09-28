// modules/reports/repository.js
// OWNING MODULE: reports
// Server-side aggregation for the Reports & Analytics Center. Every figure here
// is read straight from PostgreSQL — the browser never receives a raw table and
// never computes a total by downloading the database. Queries are read-only.
//
// Two kinds of number live side by side and are never confused:
//   * current-state counts  — what is true now (e.g. verified institutions),
//     independent of the reporting period;
//   * period/event counts    — rows whose created_at (or submitted_at, …) falls
//     inside [from, to], which is what the reporting period actually selects.
// A metric that has no stored history (for example per-day advertisement
// impressions) is simply not produced, so no report can show a fabricated trend.

const { query } = require('../common/pool');

// ---------------------------------------------------------------------------
// Small query-building helpers (parameterised, never string-interpolated values)
// ---------------------------------------------------------------------------

function addParam(params, value) {
  params.push(value);
  return `$${params.length}`;
}

// Period predicate on a timestamp column. `from`/`to` are Date objects.
function periodClause(column, from, to, params) {
  const parts = [];
  if (from) parts.push(`${column} >= ${addParam(params, from)}`);
  if (to) parts.push(`${column} <= ${addParam(params, to)}`);
  return parts;
}

function joinAnd(parts) {
  const clean = (parts || []).filter(Boolean);
  return clean.length ? ` AND ${clean.join(' AND ')}` : '';
}

function whereAnd(parts) {
  const clean = (parts || []).filter(Boolean);
  return clean.length ? `WHERE ${clean.join(' AND ')}` : '';
}

// Organization filters shared by several reports.
function orgFilters(f, params, alias = 'o') {
  const c = [`${alias}.deleted_at IS NULL`];
  if (f.orgType) c.push(`${alias}.type = ${addParam(params, f.orgType)}`);
  if (f.verified === 'verified') c.push(`(${alias}.verified = true OR ${alias}.verification_status = 'verified')`);
  if (f.verified === 'pending') c.push(`(${alias}.verified = false AND (${alias}.verification_status IS NULL OR ${alias}.verification_status <> 'verified'))`);
  if (f.governorateId) c.push(`${alias}.governorate_id = ${addParam(params, Number(f.governorateId))}`);
  if (f.districtId) c.push(`${alias}.district_id = ${addParam(params, Number(f.districtId))}`);
  if (f.countryCode) c.push(`${alias}.country_code = ${addParam(params, String(f.countryCode).toUpperCase())}`);
  if (f.q) c.push(`${alias}.name ILIKE ${addParam(params, '%' + f.q + '%')}`);
  if (f.organizationId) c.push(`${alias}.id = ${addParam(params, f.organizationId)}`);
  return c;
}

// Effective offer status is derived from the stored `active` flag plus the
// schedule, exactly as the marketing service derives it — never stored twice.
const OFFER_STATUS_SQL = `CASE
  WHEN active IS NOT TRUE THEN 'inactive'
  WHEN ends_at IS NOT NULL AND ends_at < now() THEN 'expired'
  WHEN starts_at IS NOT NULL AND starts_at > now() THEN 'scheduled'
  ELSE 'active' END`;

// Advertisement display status: stored status, except an approved row resolves
// to scheduled / active / expired from its window (same rule as the service).
const AD_STATUS_SQL = `CASE
  WHEN status <> 'approved' THEN status
  WHEN ends_at IS NOT NULL AND ends_at < now() THEN 'expired'
  WHEN starts_at IS NOT NULL AND starts_at > now() THEN 'scheduled'
  ELSE 'active' END`;

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

async function overviewCounts({ from, to }) {
  const params = [];
  const orgPeriod = periodClause('o.created_at', from, to, params);
  const userPeriod = periodClause('u.created_at', from, to, params);
  const offerPeriod = periodClause('of2.created_at', from, to, params);
  const adPeriod = periodClause('ad.created_at', from, to, params);
  const teacherPeriod = periodClause('tp.created_at', from, to, params);
  const auditPeriod = periodClause('al.created_at', from, to, params);
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM organizations o WHERE o.deleted_at IS NULL) AS orgs_total,
       (SELECT COUNT(*)::int FROM organizations o WHERE o.deleted_at IS NULL AND (o.verified = true OR o.verification_status = 'verified')) AS orgs_verified,
       (SELECT COUNT(*)::int FROM organizations o WHERE o.deleted_at IS NULL AND o.verified = false AND (o.verification_status IS NULL OR o.verification_status <> 'verified')) AS orgs_pending,
       (SELECT COUNT(*)::int FROM organizations o WHERE o.deleted_at IS NOT NULL) AS orgs_archived,
       (SELECT COUNT(*)::int FROM organizations o WHERE true${joinAnd(orgPeriod)}) AS orgs_new,
       (SELECT COUNT(*)::int FROM teacher_profiles tp WHERE tp.deleted_at IS NULL) AS teachers_total,
       (SELECT COUNT(*)::int FROM teacher_profiles tp WHERE tp.deleted_at IS NULL AND tp.profile_status = 'active') AS teachers_active,
       (SELECT COUNT(*)::int FROM teacher_profiles tp WHERE tp.deleted_at IS NULL AND tp.verification_status = 'verified') AS teachers_verified,
       (SELECT COUNT(*)::int FROM teacher_profiles tp WHERE true${joinAnd(teacherPeriod)}) AS teachers_new,
       (SELECT COUNT(*)::int FROM users u WHERE u.deleted_at IS NULL) AS users_total,
       (SELECT COUNT(*)::int FROM users u WHERE u.deleted_at IS NULL AND u.status = 'active') AS users_active,
       (SELECT COUNT(*)::int FROM users u WHERE true${joinAnd(userPeriod)}) AS users_new,
       (SELECT COUNT(*)::int FROM users u JOIN roles r ON r.id = u.role_id WHERE u.deleted_at IS NULL AND r.name = 'client') AS clients_total,
       (SELECT COUNT(*)::int FROM admission_applications aa WHERE aa.deleted_at IS NULL) AS admissions_total,
       (SELECT COUNT(*)::int FROM admission_applications aa WHERE aa.deleted_at IS NULL AND aa.status = 'pending') AS admissions_pending,
       (SELECT COUNT(*)::int FROM bookings b) AS bookings_total,
       (SELECT COUNT(*)::int FROM offers of2 WHERE (${OFFER_STATUS_SQL}) = 'active') AS offers_active,
       (SELECT COUNT(*)::int FROM offers of2) AS offers_total,
       (SELECT COUNT(*)::int FROM offers of2 WHERE true${joinAnd(offerPeriod)}) AS offers_new,
       (SELECT COUNT(*)::int FROM advertisements ad) AS ads_total,
       (SELECT COUNT(*)::int FROM advertisements ad WHERE ad.status = 'pending') AS ads_pending,
       (SELECT COUNT(*)::int FROM advertisements ad WHERE (${AD_STATUS_SQL}) = 'active') AS ads_active,
       (SELECT COUNT(*)::int FROM advertisements ad WHERE true${joinAnd(adPeriod)}) AS ads_new,
       (SELECT COALESCE(SUM(ad.impressions), 0)::int FROM advertisements ad) AS ad_impressions,
       (SELECT COALESCE(SUM(ad.clicks), 0)::int FROM advertisements ad) AS ad_clicks,
       (SELECT COUNT(*)::int FROM ownership_requests orq WHERE orq.status IN ('pending','under_review')) AS pending_ownership,
       (SELECT COUNT(*)::int FROM location_requests lrq WHERE lrq.status = 'pending') AS pending_locations,
       (SELECT COUNT(*)::int FROM organization_documents od WHERE od.status = 'pending') AS pending_documents,
       (SELECT COUNT(*)::int FROM audit_logs al WHERE true${joinAnd(auditPeriod)}) AS activity_events
     `,
    params
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// Institutions
// ---------------------------------------------------------------------------

async function institutionTypeCounts(f = {}) {
  const params = [];
  const { rows } = await query(
    `SELECT o.type,
            COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE o.verified = true OR o.verification_status = 'verified')::int AS verified
       FROM organizations o
      ${whereAnd(orgFilters(f, params))}
      GROUP BY o.type ORDER BY count DESC`,
    params
  );
  return rows;
}

async function institutionsByGovernorate(f = {}, limit = 20) {
  const params = [];
  const conds = orgFilters(f, params);
  const lim = addParam(params, limit);
  const { rows } = await query(
    `SELECT g.id, g.name AS governorate, COUNT(*)::int AS count
       FROM organizations o
       LEFT JOIN locations_governorates g ON g.id = o.governorate_id
      ${whereAnd(conds)}
      GROUP BY g.id, g.name ORDER BY count DESC LIMIT ${lim}`,
    params
  );
  return rows;
}

async function institutionsByCountry(f = {}) {
  const params = [];
  const { rows } = await query(
    `SELECT COALESCE(c.name, c.code, o.country_code, '—') AS country,
            COUNT(*)::int AS count
       FROM organizations o
       LEFT JOIN locations_countries c ON c.code = o.country_code
      ${whereAnd(orgFilters(f, params))}
      GROUP BY 1 ORDER BY count DESC`,
    params
  );
  return rows;
}

async function institutionTimeSeries({ from, to, bucket }, f = {}) {
  const params = [];
  const period = periodClause('o.created_at', from, to, params);
  const fmt = bucket === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
  const { rows } = await query(
    `SELECT to_char(o.created_at, '${fmt}') AS bucket, COUNT(*)::int AS count
       FROM organizations o
      ${whereAnd([...(orgFilters(f, params)), ...period])}
      GROUP BY 1 ORDER BY 1`,
    params
  );
  return rows;
}

async function institutionsList({ from, to, limit = 25, offset = 0 }, f = {}) {
  const params = [];
  const conds = orgFilters(f, params);
  if (from || to) {
    const period = periodClause('o.created_at', from, to, params);
    conds.push(...period);
  }
  const totalRow = await query(
    `SELECT COUNT(*)::int AS count FROM organizations o ${whereAnd(conds)}`,
    params.slice()
  );
  const lim = addParam(params, limit > 0 ? limit : 5000);
  const off = addParam(params, Math.max(0, offset || 0));
  const { rows } = await query(
    `SELECT o.id, o.name, o.type, o.verified, o.verification_status, o.image,
            o.created_at, o.phone, o.email, o.registration_status,
            g.name AS governorate, d.name AS district,
            (SELECT COUNT(*)::int FROM organization_stages os WHERE os.organization_id = o.id) AS stages_count,
            (SELECT COUNT(*)::int FROM organization_subjects osu WHERE osu.organization_id = o.id) AS subjects_count,
            (SELECT COUNT(*)::int FROM offers of2 WHERE of2.organization_id = o.id) AS offers_count,
            (SELECT COUNT(*)::int FROM advertisements ad WHERE ad.organization_id = o.id) AS ads_count
       FROM organizations o
       LEFT JOIN locations_governorates g ON g.id = o.governorate_id
       LEFT JOIN locations_districts d ON d.id = o.district_id
      ${whereAnd(conds)}
      ORDER BY o.created_at DESC
      LIMIT ${lim} OFFSET ${off}`,
    params
  );
  return { rows, total: totalRow.rows[0].count };
}

async function institutionEntity(id) {
  const { rows } = await query(
    `SELECT o.*, g.name AS governorate_name, d.name AS district_name,
            n.name AS neighborhood_name, c.name AS country_name, c.code AS country_code2
       FROM organizations o
       LEFT JOIN locations_governorates g ON g.id = o.governorate_id
       LEFT JOIN locations_districts d ON d.id = o.district_id
       LEFT JOIN locations_neighborhoods n ON n.id = o.neighborhood_id
       LEFT JOIN locations_countries c ON c.code = o.country_code
      WHERE o.id = $1 AND o.deleted_at IS NULL`,
    [id]
  );
  if (!rows[0]) return null;
  const org = rows[0];
  const [stages, subjects, fees, offers, ads, docs, staff, facilities, services] = await Promise.all([
    query(`SELECT os.id, s.name AS stage, s.name_en AS stage_en, os.capacity, os.current_students,
                  os.remaining_seats, os.delivery_mode, l.name AS language
             FROM organization_stages os
             JOIN academic_stages s ON s.id = os.stage_id
             LEFT JOIN languages l ON l.code = os.language_code
            WHERE os.organization_id = $1 ORDER BY s.sort_order`, [id]),
    query(`SELECT osu.id, sub.name AS subject, osu.language_code, osu.fee_amount, osu.currency,
                  osu.frequency, sub.review_status
             FROM organization_subjects osu
             JOIN subjects sub ON sub.id = osu.subject_id
            WHERE osu.organization_id = $1 ORDER BY sub.name`, [id]),
    query(`SELECT f.id, f.name, f.fee_type, f.amount, f.currency, f.frequency, f.visibility, f.active,
                  s.name AS stage
             FROM organization_fees f LEFT JOIN academic_stages s ON s.id = f.stage_id
            WHERE f.organization_id = $1 AND f.deleted_at IS NULL ORDER BY f.name`, [id]),
    query(`SELECT id, title, title_en, discount_percent, active, starts_at, ends_at, created_at,
                  (${OFFER_STATUS_SQL}) AS effective_status
             FROM offers WHERE organization_id = $1 ORDER BY created_at DESC`, [id]),
    query(`SELECT id, name, ad_type, placement, status, billing_mode, impressions, clicks,
                  starts_at, ends_at, submitted_at, reviewed_at, (${AD_STATUS_SQL}) AS effective_status
             FROM advertisements WHERE organization_id = $1 ORDER BY created_at DESC`, [id]),
    query(`SELECT id, doc_type, file_name, mime_type, file_size, status, created_at
             FROM organization_documents WHERE organization_id = $1 ORDER BY created_at DESC`, [id]),
    query(`SELECT m.id, m.membership_role, m.status, m.department, m.job_title, m.joined_at,
                  u.name, u.email
             FROM organization_memberships m JOIN users u ON u.id = m.user_id
            WHERE m.organization_id = $1 AND m.archived_at IS NULL ORDER BY m.membership_role, u.name`, [id]),
    query(`SELECT facility_type, COUNT(*)::int AS count FROM organization_facilities
            WHERE organization_id = $1 GROUP BY facility_type ORDER BY count DESC`, [id]),
    query(`SELECT service_type, COUNT(*)::int AS count FROM organization_services
            WHERE organization_id = $1 GROUP BY service_type ORDER BY count DESC`, [id]),
  ]);
  return {
    org,
    stages: stages.rows,
    subjects: subjects.rows,
    fees: fees.rows,
    offers: offers.rows,
    ads: ads.rows,
    documents: docs.rows,
    staff: staff.rows,
    facilities: facilities.rows,
    services: services.rows,
  };
}

// ---------------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------------

async function teacherCounts({ from, to }) {
  const params = [];
  const period = periodClause('tp.created_at', from, to, params);
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE tp.profile_status = 'active')::int AS active,
            COUNT(*) FILTER (WHERE tp.verification_status = 'verified')::int AS verified,
            COUNT(*) FILTER (WHERE tp.verification_status = 'pending' OR tp.verification_status IS NULL)::int AS pending,
            COUNT(*) FILTER (WHERE tp.deleted_at IS NOT NULL OR tp.profile_status = 'inactive')::int AS inactive,
            COUNT(*) FILTER (WHERE true${joinAnd(period)})::int AS created_in_period
       FROM teacher_profiles tp
      WHERE (tp.deleted_at IS NULL OR tp.profile_status = 'inactive')`,
    params
  );
  return rows[0];
}

async function teachersBy(field) {
  const map = {
    gender: `COALESCE(NULLIF(tp.gender, ''), 'unspecified')`,
    governorate: `COALESCE(g.name, 'unspecified')`,
    status: `COALESCE(tp.profile_status, 'unspecified')`,
    verification: `COALESCE(tp.verification_status, 'pending')`,
    country: `COALESCE(c.name, 'unspecified')`,
  };
  if (!map[field]) throw new Error('Unsupported teacher breakdown');
  const joins = field === 'governorate'
    ? 'LEFT JOIN locations_governorates g ON g.id = tp.governorate_id'
    : field === 'country'
      ? 'LEFT JOIN locations_countries c ON c.id = tp.country_id'
      : '';
  const group = field === 'governorate' ? 'g.name' : field === 'country' ? 'c.name' : map[field];
  const { rows } = await query(
    `SELECT ${map[field]} AS label, COUNT(*)::int AS count
       FROM teacher_profiles tp ${joins}
      WHERE tp.deleted_at IS NULL
      GROUP BY ${group} ORDER BY count DESC`,
    []
  );
  return rows;
}

async function teachersList({ limit = 25, offset = 0 }) {
  const total = await query(`SELECT COUNT(*)::int AS count FROM teacher_profiles tp WHERE tp.deleted_at IS NULL`);
  const { rows } = await query(
    `SELECT tp.id, tp.headline, tp.bio, tp.gender, tp.years_of_experience,
            tp.profile_status, tp.verification_status, tp.verified, tp.created_at,
            u.name, u.email, u.phone, up.avatar_url,
            g.name AS governorate, c.name AS country,
            (SELECT COUNT(*)::int FROM teacher_pricing tpr WHERE tpr.teacher_id = tp.id) AS subjects_count,
            (SELECT COUNT(*)::int FROM teacher_documents td WHERE td.teacher_id = tp.id) AS documents_count
       FROM teacher_profiles tp
       LEFT JOIN users u ON u.id = tp.user_id
       LEFT JOIN user_profiles up ON up.user_id = tp.user_id
       LEFT JOIN locations_governorates g ON g.id = tp.governorate_id
       LEFT JOIN locations_countries c ON c.id = tp.country_id
      WHERE tp.deleted_at IS NULL
      ORDER BY tp.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit > 0 ? limit : 5000, Math.max(0, offset || 0)]
  );
  return { rows, total: total.rows[0].count };
}

async function teacherEntity(id) {
  const { rows } = await query(
    `SELECT tp.*, u.name, u.email, u.phone AS user_phone, up.avatar_url,
            g.name AS governorate_name, d.name AS district_name, n.name AS neighborhood_name,
            c.name AS country_name
       FROM teacher_profiles tp
       LEFT JOIN users u ON u.id = tp.user_id
       LEFT JOIN user_profiles up ON up.user_id = tp.user_id
       LEFT JOIN locations_governorates g ON g.id = tp.governorate_id
       LEFT JOIN locations_districts d ON d.id = tp.district_id
       LEFT JOIN locations_neighborhoods n ON n.id = tp.neighborhood_id
       LEFT JOIN locations_countries c ON c.id = tp.country_id
      WHERE tp.id = $1 AND tp.deleted_at IS NULL`,
    [id]
  );
  if (!rows[0]) return null;
  const t = rows[0];
  const teacherId = t.id;
  const [pricing, availability, quals, docs] = await Promise.all([
    query(`SELECT tpr.amount, tpr.currency, tpr.billing_period, tpr.language_code,
                  tpr.discount_percent, tpr.promo_label, tpr.location_mode, s.name AS subject
             FROM teacher_pricing tpr LEFT JOIN subjects s ON s.id = tpr.subject_id
            WHERE tpr.teacher_id = $1 ORDER BY s.name`, [teacherId]),
    query(`SELECT day_of_week, start_time, end_time, location_mode FROM teacher_availability
            WHERE teacher_id = $1 ORDER BY day_of_week, start_time`, [teacherId]),
    query(`SELECT title, institution_name, degree, year_obtained FROM teacher_qualifications
            WHERE teacher_id = $1 ORDER BY year_obtained DESC NULLS LAST`, [teacherId]),
    query(`SELECT doc_type, file_name, mime_type, file_size, status, created_at
             FROM teacher_documents WHERE teacher_id = $1 ORDER BY created_at DESC`, [teacherId]),
  ]);
  return { teacher: t, pricing: pricing.rows, availability: availability.rows, qualifications: quals.rows, documents: docs.rows };
}

// ---------------------------------------------------------------------------
// Users & clients
// ---------------------------------------------------------------------------

async function userCounts({ from, to }) {
  const params = [];
  const period = periodClause('u.created_at', from, to, params);
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE u.status = 'active')::int AS active,
            COUNT(*) FILTER (WHERE u.status = 'suspended')::int AS suspended,
            COUNT(*) FILTER (WHERE u.status NOT IN ('active','suspended'))::int AS other,
            COUNT(*) FILTER (WHERE true${joinAnd(period)})::int AS created_in_period,
            COUNT(*) FILTER (WHERE u.is_protected = true)::int AS protected
       FROM users u WHERE u.deleted_at IS NULL`,
    params
  );
  return rows[0];
}

async function usersByRole() {
  const { rows } = await query(
    `SELECT COALESCE(r.name, 'unassigned') AS role, COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE u.status = 'active')::int AS active
       FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.deleted_at IS NULL GROUP BY r.name ORDER BY count DESC`,
    []
  );
  return rows;
}

async function usersByStatus() {
  const { rows } = await query(
    `SELECT u.status, COUNT(*)::int AS count FROM users u
      WHERE u.deleted_at IS NULL GROUP BY u.status ORDER BY count DESC`,
    []
  );
  return rows;
}

async function usersByGovernorate() {
  const { rows } = await query(
    `SELECT COALESCE(g.name, 'unspecified') AS label, COUNT(*)::int AS count
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       LEFT JOIN locations_governorates g ON g.id = up.governorate_id
      WHERE u.deleted_at IS NULL
      GROUP BY 1 ORDER BY count DESC LIMIT 20`,
    []
  );
  return rows;
}

async function userTimeSeries({ from, to, bucket }) {
  const params = [];
  const period = periodClause('u.created_at', from, to, params);
  const fmt = bucket === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
  const { rows } = await query(
    `SELECT to_char(u.created_at, '${fmt}') AS bucket, COUNT(*)::int AS count
       FROM users u WHERE u.deleted_at IS NULL${joinAnd(period)}
      GROUP BY 1 ORDER BY 1`,
    params
  );
  return rows;
}

async function usersList({ limit = 25, offset = 0 }, f = {}) {
  const params = [];
  const conds = ['u.deleted_at IS NULL'];
  if (f.role) conds.push(`COALESCE(r.name,'') = ${addParam(params, f.role)}`);
  if (f.status) conds.push(`u.status = ${addParam(params, f.status)}`);
  if (f.q) conds.push(`(u.name ILIKE ${addParam(params, '%' + f.q + '%')} OR u.email ILIKE ${addParam(params, '%' + f.q + '%')})`);
  const total = await query(
    `SELECT COUNT(*)::int AS count FROM users u LEFT JOIN roles r ON r.id = u.role_id ${whereAnd(conds)}`,
    params.slice()
  );
  const lim = addParam(params, limit > 0 ? limit : 5000);
  const off = addParam(params, Math.max(0, offset || 0));
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.status, u.is_protected, u.created_at,
            COALESCE(r.name, 'unassigned') AS role,
            up.avatar_url,
            o.name AS organization_name, o.type AS organization_type, m.membership_role
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN user_profiles up ON up.user_id = u.id
       LEFT JOIN organization_memberships m ON m.user_id = u.id AND m.archived_at IS NULL
       LEFT JOIN organizations o ON o.id = m.organization_id
      ${whereAnd(conds)}
      ORDER BY u.created_at DESC
      LIMIT ${lim} OFFSET ${off}`,
    params
  );
  return { rows, total: total.rows[0].count };
}

// ---------------------------------------------------------------------------
// Admissions
// ---------------------------------------------------------------------------

async function admissionsByStatus() {
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS count FROM admission_applications
      WHERE deleted_at IS NULL GROUP BY status ORDER BY count DESC`,
    []
  );
  return rows;
}

async function admissionsByStage() {
  const { rows } = await query(
    `SELECT COALESCE(s.name, 'unspecified') AS label, COUNT(*)::int AS count
       FROM admission_applications aa LEFT JOIN academic_stages s ON s.id = aa.stage_id
      WHERE aa.deleted_at IS NULL GROUP BY 1 ORDER BY count DESC`,
    []
  );
  return rows;
}

async function admissionsReportList({ limit = 25, offset = 0 }, f = {}) {
  const params = [];
  const conds = ['aa.deleted_at IS NULL'];
  if (f.status) conds.push(`aa.status = ${addParam(params, f.status)}`);
  if (f.organizationId) conds.push(`aa.organization_id = ${addParam(params, f.organizationId)}`);
  const total = await query(`SELECT COUNT(*)::int AS count FROM admission_applications aa ${whereAnd(conds)}`, params.slice());
  const lim = addParam(params, limit > 0 ? limit : 5000);
  const off = addParam(params, Math.max(0, offset || 0));
  const { rows } = await query(
    `SELECT aa.id, aa.applicant_name, aa.applicant_phone, aa.status, aa.program_name,
            aa.submitted_at, aa.created_at, o.name AS institution_name, o.type AS institution_type,
            s.name AS stage
       FROM admission_applications aa
       LEFT JOIN organizations o ON o.id = aa.organization_id
       LEFT JOIN academic_stages s ON s.id = aa.stage_id
      ${whereAnd(conds)}
      ORDER BY aa.created_at DESC LIMIT ${lim} OFFSET ${off}`,
    params
  );
  return { rows, total: total.rows[0].count };
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

async function offerCounts({ from, to }) {
  const params = [];
  const period = periodClause('of2.created_at', from, to, params);
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE (${OFFER_STATUS_SQL}) = 'active')::int AS active,
            COUNT(*) FILTER (WHERE (${OFFER_STATUS_SQL}) = 'scheduled')::int AS scheduled,
            COUNT(*) FILTER (WHERE (${OFFER_STATUS_SQL}) = 'expired')::int AS expired,
            COUNT(*) FILTER (WHERE (${OFFER_STATUS_SQL}) = 'inactive')::int AS inactive,
            COUNT(*) FILTER (WHERE true${joinAnd(period)})::int AS created_in_period
       FROM offers of2`,
    params
  );
  return rows[0];
}

async function offersByStatus() {
  const { rows } = await query(
    `SELECT (${OFFER_STATUS_SQL}) AS label, COUNT(*)::int AS count FROM offers of2
      GROUP BY 1 ORDER BY count DESC`,
    []
  );
  return rows;
}

async function offersByInstitutionType() {
  const { rows } = await query(
    `SELECT COALESCE(o.type, 'unspecified') AS label, COUNT(*)::int AS count
       FROM offers of2 LEFT JOIN organizations o ON o.id = of2.organization_id
      GROUP BY 1 ORDER BY count DESC`,
    []
  );
  return rows;
}

async function offersByGovernorate() {
  const { rows } = await query(
    `SELECT COALESCE(g.name, 'unspecified') AS label, COUNT(*)::int AS count
       FROM offers of2
       LEFT JOIN organizations o ON o.id = of2.organization_id
       LEFT JOIN locations_governorates g ON g.id = o.governorate_id
      GROUP BY 1 ORDER BY count DESC LIMIT 20`,
    []
  );
  return rows;
}

async function offerTimeSeries({ from, to, bucket }) {
  const params = [];
  const period = periodClause('of2.created_at', from, to, params);
  const fmt = bucket === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
  const { rows } = await query(
    `SELECT to_char(of2.created_at, '${fmt}') AS bucket, COUNT(*)::int AS count
       FROM offers of2 WHERE true${joinAnd(period)} GROUP BY 1 ORDER BY 1`,
    params
  );
  return rows;
}

async function offersList({ limit = 25, offset = 0 }, f = {}) {
  const params = [];
  const conds = [];
  if (f.status) conds.push(`(${OFFER_STATUS_SQL}) = ${addParam(params, f.status)}`);
  if (f.orgType) conds.push(`o.type = ${addParam(params, f.orgType)}`);
  if (f.governorateId) conds.push(`o.governorate_id = ${addParam(params, Number(f.governorateId))}`);
  if (f.organizationId) conds.push(`of2.organization_id = ${addParam(params, f.organizationId)}`);
  if (f.from || f.to) conds.push(...periodClause('of2.created_at', f.from, f.to, params));
  const total = await query(
    `SELECT COUNT(*)::int AS count FROM offers of2 LEFT JOIN organizations o ON o.id = of2.organization_id ${whereAnd(conds)}`,
    params.slice()
  );
  const lim = addParam(params, limit > 0 ? limit : 5000);
  const off = addParam(params, Math.max(0, offset || 0));
  const { rows } = await query(
    `SELECT of2.id, of2.title, of2.title_en, of2.discount_percent, of2.active,
            of2.starts_at, of2.ends_at, of2.created_at, (${OFFER_STATUS_SQL}) AS effective_status,
            o.id AS organization_id, o.name AS institution_name, o.type AS institution_type, o.image AS institution_image,
            g.name AS governorate
       FROM offers of2
       LEFT JOIN organizations o ON o.id = of2.organization_id
       LEFT JOIN locations_governorates g ON g.id = o.governorate_id
      ${whereAnd(conds)}
      ORDER BY of2.created_at DESC LIMIT ${lim} OFFSET ${off}`,
    params
  );
  return { rows, total: total.rows[0].count };
}

// ---------------------------------------------------------------------------
// Advertisements
// ---------------------------------------------------------------------------

async function adCounts({ from, to }) {
  const params = [];
  const submitted = periodClause('ad.submitted_at', from, to, params);
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE ad.status = 'pending')::int AS pending,
            COUNT(*) FILTER (WHERE ad.status = 'approved')::int AS approved,
            COUNT(*) FILTER (WHERE ad.status = 'paused')::int AS paused,
            COUNT(*) FILTER (WHERE ad.status = 'rejected')::int AS rejected,
            COUNT(*) FILTER (WHERE ad.status = 'cancelled')::int AS cancelled,
            COUNT(*) FILTER (WHERE ad.status = 'archived')::int AS archived,
            COUNT(*) FILTER (WHERE (${AD_STATUS_SQL}) = 'active')::int AS active,
            COUNT(*) FILTER (WHERE (${AD_STATUS_SQL}) = 'scheduled')::int AS scheduled,
            COUNT(*) FILTER (WHERE (${AD_STATUS_SQL}) = 'expired')::int AS expired,
            COUNT(*) FILTER (WHERE true${joinAnd(submitted)})::int AS submitted_in_period,
            COALESCE(SUM(ad.impressions), 0)::int AS impressions,
            COALESCE(SUM(ad.clicks), 0)::int AS clicks
       FROM advertisements ad`,
    params
  );
  return rows[0];
}

async function adsByStatus() {
  const { rows } = await query(
    `SELECT (${AD_STATUS_SQL}) AS label, COUNT(*)::int AS count FROM advertisements ad
      GROUP BY 1 ORDER BY count DESC`,
    []
  );
  return rows;
}

async function adsByPlacement() {
  const { rows } = await query(
    `SELECT p AS label, COUNT(*)::int AS count
       FROM advertisements ad, unnest(ad.placement) AS p
      GROUP BY p ORDER BY count DESC`,
    []
  );
  return rows;
}

async function adsByType() {
  const { rows } = await query(
    `SELECT ad_type AS label, COUNT(*)::int AS count FROM advertisements ad
      GROUP BY ad_type ORDER BY count DESC`,
    []
  );
  return rows;
}

async function adsByInstitution() {
  const { rows } = await query(
    `SELECT COALESCE(o.name, '—') AS label, COUNT(*)::int AS count
       FROM advertisements ad LEFT JOIN organizations o ON o.id = ad.organization_id
      GROUP BY 1 ORDER BY count DESC LIMIT 15`,
    []
  );
  return rows;
}

async function adsList({ limit = 25, offset = 0 }, f = {}) {
  const params = [];
  const conds = [];
  if (f.status) conds.push(`(${AD_STATUS_SQL}) = ${addParam(params, f.status)}`);
  if (f.adType) conds.push(`ad.ad_type = ${addParam(params, f.adType)}`);
  if (f.organizationId) conds.push(`ad.organization_id = ${addParam(params, f.organizationId)}`);
  if (f.from || f.to) conds.push(...periodClause('ad.created_at', f.from, f.to, params));
  const total = await query(`SELECT COUNT(*)::int AS count FROM advertisements ad ${whereAnd(conds)}`, params.slice());
  const lim = addParam(params, limit > 0 ? limit : 5000);
  const off = addParam(params, Math.max(0, offset || 0));
  const { rows } = await query(
    `SELECT ad.id, ad.name, ad.ad_type, ad.billing_mode, ad.status, ad.placement,
            ad.impressions, ad.clicks, ad.starts_at, ad.ends_at, ad.created_at, ad.submitted_at, ad.reviewed_at,
            (${AD_STATUS_SQL}) AS effective_status,
            o.id AS organization_id, o.name AS institution_name, o.type AS institution_type, o.image AS institution_image
       FROM advertisements ad LEFT JOIN organizations o ON o.id = ad.organization_id
      ${whereAnd(conds)}
      ORDER BY ad.created_at DESC LIMIT ${lim} OFFSET ${off}`,
    params
  );
  return { rows, total: total.rows[0].count };
}

// ---------------------------------------------------------------------------
// Academic
// ---------------------------------------------------------------------------

async function academicCounts() {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM academic_stages WHERE is_active IS NOT FALSE) AS stages,
       (SELECT COUNT(*)::int FROM academic_grades WHERE is_active IS NOT FALSE) AS grades,
       (SELECT COUNT(*)::int FROM subjects WHERE organization_id IS NULL) AS subjects,
       (SELECT COUNT(*)::int FROM subjects WHERE organization_id IS NOT NULL) AS org_subjects,
       (SELECT COUNT(*)::int FROM subjects WHERE organization_id IS NOT NULL AND review_status = 'pending') AS org_subjects_pending,
       (SELECT COUNT(*)::int FROM languages WHERE is_active IS NOT FALSE) AS languages,
       (SELECT COUNT(*)::int FROM curricula WHERE is_active IS NOT FALSE) AS curricula,
       (SELECT COUNT(*)::int FROM organization_stages) AS offerings,
       (SELECT COUNT(*)::int FROM organization_fees WHERE deleted_at IS NULL AND active) AS active_fees,
       (SELECT COALESCE(SUM(capacity),0)::int FROM organization_stages) AS capacity,
       (SELECT COALESCE(SUM(current_students),0)::int FROM organization_stages) AS students,
       (SELECT COALESCE(SUM(remaining_seats),0)::int FROM organization_stages) AS remaining`,
    []
  );
  return rows[0];
}

async function stagesByDeliveryMode() {
  const { rows } = await query(
    `SELECT COALESCE(delivery_mode, 'unspecified') AS label, COUNT(*)::int AS count
       FROM organization_stages GROUP BY delivery_mode ORDER BY count DESC`,
    []
  );
  return rows;
}

async function offeringsByInstitutionType() {
  const { rows } = await query(
    `SELECT COALESCE(o.type, 'unspecified') AS label, COUNT(*)::int AS count
       FROM organization_stages os JOIN organizations o ON o.id = os.organization_id
      WHERE o.deleted_at IS NULL GROUP BY o.type ORDER BY count DESC`,
    []
  );
  return rows;
}

async function capacityByStage() {
  const { rows } = await query(
    `SELECT s.name AS label,
            COALESCE(SUM(os.capacity),0)::int AS capacity,
            COALESCE(SUM(os.current_students),0)::int AS students
       FROM organization_stages os JOIN academic_stages s ON s.id = os.stage_id
      GROUP BY s.id, s.name, s.sort_order
      HAVING COALESCE(SUM(os.capacity),0) > 0
      ORDER BY s.sort_order`,
    []
  );
  return rows;
}

async function subjectProposals() {
  const { rows } = await query(
    `SELECT sub.id, sub.name, sub.slug, sub.review_status, sub.review_note, sub.created_at,
            o.name AS organization_name
       FROM subjects sub LEFT JOIN organizations o ON o.id = sub.organization_id
      WHERE sub.organization_id IS NOT NULL
      ORDER BY sub.created_at DESC`,
    []
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

async function locationCounts() {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM locations_countries WHERE is_active IS NOT FALSE) AS countries,
       (SELECT COUNT(*)::int FROM locations_governorates WHERE is_active IS NOT FALSE) AS governorates,
       (SELECT COUNT(*)::int FROM locations_districts WHERE is_active IS NOT FALSE) AS districts,
       (SELECT COUNT(*)::int FROM locations_neighborhoods WHERE is_active IS NOT FALSE) AS neighborhoods,
       (SELECT COUNT(*)::int FROM organizations WHERE deleted_at IS NULL AND governorate_id IS NOT NULL) AS orgs_geolocated,
       (SELECT COUNT(*)::int FROM teacher_profiles WHERE deleted_at IS NULL AND governorate_id IS NOT NULL) AS teachers_geolocated,
       (SELECT COUNT(*)::int FROM user_profiles WHERE governorate_id IS NOT NULL) AS users_geolocated`,
    []
  );
  return rows[0];
}

async function entitiesByGovernorate() {
  const { rows } = await query(
    `SELECT g.id AS governorate_id, g.name AS governorate,
            (SELECT COUNT(*)::int FROM organizations o WHERE o.deleted_at IS NULL AND o.governorate_id = g.id) AS institutions,
            (SELECT COUNT(*)::int FROM teacher_profiles tp WHERE tp.deleted_at IS NULL AND tp.governorate_id = g.id) AS teachers,
            (SELECT COUNT(*)::int FROM user_profiles up WHERE up.governorate_id = g.id) AS users,
            (SELECT COUNT(*)::int FROM offers of2 JOIN organizations o2 ON o2.id = of2.organization_id
               WHERE o2.deleted_at IS NULL AND o2.governorate_id = g.id) AS offers
       FROM locations_governorates g
      WHERE g.is_active IS NOT FALSE
      ORDER BY institutions DESC, g.name`,
    []
  );
  return rows;
}

async function governoratesForFilter() {
  const { rows } = await query(
    `SELECT g.id, g.name, g.country_id FROM locations_governorates g
      WHERE g.is_active IS NOT FALSE ORDER BY g.name`,
    []
  );
  return rows;
}

async function countriesList() {
  const { rows } = await query(
    `SELECT id, code, name FROM locations_countries
      WHERE is_active IS NOT FALSE ORDER BY is_default DESC, name`,
    []
  );
  return rows;
}

async function institutionsForFilter() {
  const { rows } = await query(
    `SELECT id, name, type FROM organizations
      WHERE deleted_at IS NULL ORDER BY name LIMIT 500`,
    []
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Activity / audit
// ---------------------------------------------------------------------------

async function activityCounts({ from, to }, f = {}) {
  const params = [];
  const conds = [];
  if (f.actorUserId) conds.push(`al.actor_user_id = ${addParam(params, f.actorUserId)}`);
  if (f.action) conds.push(`al.action = ${addParam(params, f.action)}`);
  if (f.entityType) conds.push(`al.object_type = ${addParam(params, f.entityType)}`);
  const period = periodClause('al.created_at', from, to, params);
  const where = whereAnd([...conds, ...period]);
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(DISTINCT al.actor_user_id)::int AS actors,
            COUNT(DISTINCT al.action)::int AS actions,
            COUNT(DISTINCT al.object_type)::int AS entity_types,
            COUNT(*) FILTER (WHERE al.action IN ('delete','permission_override_changed','permission_override_removed'))::int AS sensitive
       FROM audit_logs al ${where}`,
    params
  );
  return rows[0];
}

async function activityByAction({ from, to }, f = {}) {
  const params = [];
  const conds = [];
  if (f.actorUserId) conds.push(`al.actor_user_id = ${addParam(params, f.actorUserId)}`);
  if (f.entityType) conds.push(`al.object_type = ${addParam(params, f.entityType)}`);
  conds.push(...periodClause('al.created_at', from, to, params));
  const { rows } = await query(
    `SELECT al.action AS label, COUNT(*)::int AS count FROM audit_logs al
      ${whereAnd(conds)} GROUP BY al.action ORDER BY count DESC LIMIT 12`,
    params
  );
  return rows;
}

async function activityByEntity({ from, to }, f = {}) {
  const params = [];
  const conds = [];
  if (f.actorUserId) conds.push(`al.actor_user_id = ${addParam(params, f.actorUserId)}`);
  if (f.action) conds.push(`al.action = ${addParam(params, f.action)}`);
  conds.push(...periodClause('al.created_at', from, to, params));
  const { rows } = await query(
    `SELECT COALESCE(al.object_type, 'unspecified') AS label, COUNT(*)::int AS count
       FROM audit_logs al ${whereAnd(conds)} GROUP BY 1 ORDER BY count DESC LIMIT 12`,
    params
  );
  return rows;
}

async function activityTimeSeries({ from, to, bucket }, f = {}) {
  const params = [];
  const conds = [];
  if (f.actorUserId) conds.push(`al.actor_user_id = ${addParam(params, f.actorUserId)}`);
  if (f.action) conds.push(`al.action = ${addParam(params, f.action)}`);
  if (f.entityType) conds.push(`al.object_type = ${addParam(params, f.entityType)}`);
  const fmt = bucket === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
  conds.push(...periodClause('al.created_at', from, to, params));
  const { rows } = await query(
    `SELECT to_char(al.created_at, '${fmt}') AS bucket, COUNT(*)::int AS count
       FROM audit_logs al ${whereAnd(conds)} GROUP BY 1 ORDER BY 1`,
    params
  );
  return rows;
}

async function activityActors({ from, to }) {
  const params = [];
  const period = periodClause('al.created_at', from, to, params);
  const { rows } = await query(
    `SELECT al.actor_user_id AS id, COALESCE(u.name, '—') AS name, COUNT(*)::int AS count
       FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_user_id
      ${whereAnd(period.length ? period : ['true'])}
      GROUP BY al.actor_user_id, u.name ORDER BY count DESC LIMIT 15`,
    params
  );
  return rows;
}

async function activityList({ limit = 25, offset = 0 }, f = {}) {
  const params = [];
  const conds = [];
  if (f.actorUserId) conds.push(`al.actor_user_id = ${addParam(params, f.actorUserId)}`);
  if (f.action) conds.push(`al.action = ${addParam(params, f.action)}`);
  if (f.entityType) conds.push(`al.object_type = ${addParam(params, f.entityType)}`);
  if (f.from || f.to) conds.push(...periodClause('al.created_at', f.from, f.to, params));
  const total = await query(`SELECT COUNT(*)::int AS count FROM audit_logs al ${whereAnd(conds)}`, params.slice());
  const lim = addParam(params, limit > 0 ? limit : 5000);
  const off = addParam(params, Math.max(0, offset || 0));
  const { rows } = await query(
    `SELECT al.id, al.action, al.object_type, al.object_id, al.created_at, al.reason,
            COALESCE(u.name, '—') AS actor_name, al.actor_user_id,
            o.name AS organization_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       LEFT JOIN organizations o ON o.id = al.organization_id
      ${whereAnd(conds)}
      ORDER BY al.created_at DESC LIMIT ${lim} OFFSET ${off}`,
    params
  );
  return { rows, total: total.rows[0].count };
}

async function activityDaily(days = 14) {
  const { rows } = await query(
    `SELECT to_char(created_at, 'YYYY-MM-DD') AS bucket, COUNT(*)::int AS count
       FROM audit_logs
      WHERE created_at >= now() - make_interval(days => $1)
      GROUP BY 1 ORDER BY 1`,
    [Math.max(1, Math.min(90, Number(days) || 14))]
  );
  return rows;
}

async function activityFilterValues() {
  const [actions, entities] = await Promise.all([
    query(`SELECT DISTINCT action FROM audit_logs ORDER BY action`),
    query(`SELECT DISTINCT object_type FROM audit_logs WHERE object_type IS NOT NULL ORDER BY object_type`),
  ]);
  return {
    actions: actions.rows.map((r) => r.action),
    entities: entities.rows.map((r) => r.object_type),
  };
}

// ---------------------------------------------------------------------------
// Pending-review feed used by the overview
// ---------------------------------------------------------------------------

async function pendingReviewList(limit = 8) {
  const { rows } = await query(
    `SELECT 'organization' AS kind, o.id, o.name, o.verification_status AS status, o.created_at
       FROM organizations o
      WHERE o.deleted_at IS NULL AND o.verified = false
        AND (o.verification_status IS NULL OR o.verification_status <> 'verified')
      UNION ALL
     SELECT 'advertisement' AS kind, ad.id, ad.name, ad.status, ad.created_at
       FROM advertisements ad WHERE ad.status = 'pending'
     UNION ALL
     SELECT 'document' AS kind, od.id, od.file_name, od.status, od.created_at
       FROM organization_documents od WHERE od.status = 'pending'
     UNION ALL
     SELECT 'ownership' AS kind, orq.id, orq.institution_name, orq.status, orq.created_at
       FROM ownership_requests orq WHERE orq.status IN ('pending','under_review')
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

async function recentInstitutions(limit = 8) {
  const { rows } = await query(
    `SELECT o.id, o.name, o.type, o.verified, o.verification_status, o.image, o.created_at,
            g.name AS governorate
       FROM organizations o LEFT JOIN locations_governorates g ON g.id = o.governorate_id
      WHERE o.deleted_at IS NULL ORDER BY o.created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Saved reports
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Import support (institutions)
// ---------------------------------------------------------------------------

async function governorateIndex() {
  const { rows } = await query(
    `SELECT g.id, g.name, g.country_id, c.code AS country_code
       FROM locations_governorates g LEFT JOIN locations_countries c ON c.id = g.country_id`,
    []
  );
  return rows;
}

async function districtIndex() {
  const { rows } = await query(
    `SELECT id, name, governorate_id FROM locations_districts`,
    []
  );
  return rows;
}

async function organizationSlugIndex() {
  const { rows } = await query(
    `SELECT slug, lower(name) AS name, type FROM organizations ORDER BY created_at`,
    []
  );
  return rows;
}

async function insertImportedInstitutions(records) {
  const { getClient } = require('../common/pool');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const r of records) {
      const res = await client.query(
        `INSERT INTO organizations
           (name, slug, type, description, governorate_id, district_id, phone, email,
            principal_name, country_code, verified, verification_status, data_source, registration_open)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,'pending','import',false)
         RETURNING id, name`,
        [r.name, r.slug, r.type, r.description || null, r.governorate_id || null, r.district_id || null,
          r.phone || null, r.email || null, r.principal_name || null, r.country_code || null]
      );
      inserted.push(res.rows[0]);
    }
    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listSavedReports(ownerUserId) {
  const { rows } = await query(
    `SELECT id, name, description, definition, created_at, updated_at
       FROM saved_reports WHERE owner_user_id = $1 ORDER BY created_at DESC`,
    [ownerUserId]
  );
  return rows;
}

async function createSavedReport(ownerUserId, { name, description, definition }) {
  const { rows } = await query(
    `INSERT INTO saved_reports (owner_user_id, name, description, definition)
     VALUES ($1,$2,$3,$4) RETURNING id, name, description, definition, created_at, updated_at`,
    [ownerUserId, name, description || null, JSON.stringify(definition)]
  );
  return rows[0];
}

async function deleteSavedReport(ownerUserId, id) {
  const { rows } = await query(
    `DELETE FROM saved_reports WHERE id = $1 AND owner_user_id = $2 RETURNING id`,
    [id, ownerUserId]
  );
  return rows[0] || null;
}

module.exports = {
  overviewCounts,
  institutionTypeCounts,
  institutionsByGovernorate,
  institutionsByCountry,
  institutionTimeSeries,
  institutionsList,
  institutionEntity,
  teacherCounts,
  teachersBy,
  teachersList,
  teacherEntity,
  userCounts,
  usersByRole,
  usersByStatus,
  usersByGovernorate,
  userTimeSeries,
  usersList,
  admissionsByStatus,
  admissionsByStage,
  admissionsReportList,
  offerCounts,
  offersByStatus,
  offersByInstitutionType,
  offersByGovernorate,
  offerTimeSeries,
  offersList,
  adCounts,
  adsByStatus,
  adsByPlacement,
  adsByType,
  adsByInstitution,
  adsList,
  academicCounts,
  stagesByDeliveryMode,
  offeringsByInstitutionType,
  capacityByStage,
  subjectProposals,
  locationCounts,
  entitiesByGovernorate,
  governoratesForFilter,
  countriesList,
  institutionsForFilter,
  activityCounts,
  activityByAction,
  activityByEntity,
  activityTimeSeries,
  activityActors,
  activityList,
  activityFilterValues,
  activityDaily,
  pendingReviewList,
  recentInstitutions,
  listSavedReports,
  createSavedReport,
  deleteSavedReport,
  governorateIndex,
  districtIndex,
  organizationSlugIndex,
  insertImportedInstitutions,
};
