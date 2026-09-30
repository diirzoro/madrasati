// Client profile, feedback and consent-based first-party activity.
const { Router } = require('express');
const { query } = require('../common/pool');
const { asyncHandler } = require('../common/http');
const { ValidationError, NotFoundError } = require('../common/errors');
const { writeAudit } = require('../common/audit');
const { requireAuth, requireRole } = require('./auth');

const router = Router();
const kinds = ['unspecified', 'visitor', 'student', 'parent', 'both', 'other'];
const contacts = ['none', 'phone', 'email', 'whatsapp'];
const feedbackKinds = ['suggestion', 'complaint', 'inquiry'];
const feedbackStatuses = ['open', 'in_progress', 'closed'];
const sections = ['home', 'private', 'government', 'colleges', 'institutes', 'teachers', 'detail', 'teacher'];

function clean(value, max) {
  if (typeof value !== 'string') throw new ValidationError('Expected text.');
  const result = value.trim();
  if (result.length > max) throw new ValidationError(`Text must be at most ${max} characters.`);
  return result;
}

async function client(userId) {
  const { rows } = await query(`SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.id = $1 AND r.name = 'client' AND u.deleted_at IS NULL`, [userId]);
  if (!rows.length) throw new NotFoundError('Client not found');
}

async function profile(userId, admin) {
  const { rows } = await query(`SELECT u.id AS user_id,
    COALESCE(cp.client_kind, 'unspecified') AS client_kind,
    COALESCE(cp.interests, '') AS interests,
    COALESCE(cp.preferred_locations, '') AS preferred_locations,
    COALESCE(cp.contact_preference, 'none') AS contact_preference,
    ${admin ? "COALESCE(cp.admin_notes, '') AS admin_notes," : ''}
    COALESCE(cp.analytics_consent, false) AS analytics_consent,
    up.country_code, up.governorate_id, up.district_id,
    g.name AS governorate_name, d.name AS district_name,
    cp.updated_at FROM users u
    LEFT JOIN client_profiles cp ON cp.user_id = u.id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN locations_governorates g ON g.id = up.governorate_id
    LEFT JOIN locations_districts d ON d.id = up.district_id
    WHERE u.id = $1`, [userId]);
  return rows[0];
}

async function saveProfile(userId, body, admin) {
  await client(userId);
  const fields = {};
  if (body.clientKind !== undefined) {
    if (!kinds.includes(body.clientKind)) throw new ValidationError('Invalid client kind');
    fields.client_kind = body.clientKind;
  }
  if (body.interests !== undefined) fields.interests = clean(body.interests, 500);
  if (body.preferredLocations !== undefined) fields.preferred_locations = clean(body.preferredLocations, 500);
  if (body.contactPreference !== undefined) {
    if (!contacts.includes(body.contactPreference)) throw new ValidationError('Invalid contact preference');
    fields.contact_preference = body.contactPreference;
  }
  if (admin && body.adminNotes !== undefined) fields.admin_notes = clean(body.adminNotes, 2000);
  if (!admin && body.analyticsConsent !== undefined) {
    if (typeof body.analyticsConsent !== 'boolean') throw new ValidationError('Consent must be boolean');
    fields.analytics_consent = body.analyticsConsent;
  }
  if (!Object.keys(fields).length) throw new ValidationError('No editable fields supplied');
  const keys = Object.keys(fields);
  const params = keys.map(key => fields[key]);
  const columns = keys.join(', ');
  const placeholders = keys.map((_, i) => `$${i + 2}`).join(', ');
  const updates = keys.map(key => `${key} = EXCLUDED.${key}`).join(', ');
  await query(`INSERT INTO client_profiles (user_id, ${columns}) VALUES ($1, ${placeholders})
    ON CONFLICT (user_id) DO UPDATE SET ${updates}, updated_at = now()`, [userId, ...params]);
  if (admin && (body.countryCode !== undefined || body.governorateId !== undefined || body.districtId !== undefined)) {
    const { saveRegistrationProfile } = require('./service');
    await saveRegistrationProfile(userId, { countryCode: body.countryCode,
      governorateId: body.governorateId, districtId: body.districtId });
  }
  if (fields.analytics_consent === false) {
    await query('DELETE FROM client_activity_events WHERE user_id = $1', [userId]);
  }
  return profile(userId, admin);
}

router.get('/clients/me/profile', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  res.json(await profile(req.user.id, false));
}));
router.put('/clients/me/profile', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  res.json(await saveProfile(req.user.id, req.body || {}, false));
}));
router.post('/clients/me/events', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const current = await profile(req.user.id, false);
  if (!current.analytics_consent) return res.status(204).end();
  const { eventType, section } = req.body || {};
  if (!['page_view', 'search'].includes(eventType) || !sections.includes(section)) {
    throw new ValidationError('Invalid activity event');
  }
  const searchTerm = req.body.searchTerm == null ? null : clean(req.body.searchTerm, 80);
  const locationLabel = req.body.locationLabel == null ? null : clean(req.body.locationLabel, 100);
  await query('DELETE FROM client_activity_events WHERE created_at < now() - interval \'90 days\'');
  await query(`INSERT INTO client_activity_events (user_id, event_type, section, search_term, location_label)
    VALUES ($1, $2, $3, $4, $5)`, [req.user.id, eventType, section, searchTerm, locationLabel]);
  res.status(204).end();
}));
router.post('/clients/me/feedback', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const kind = req.body && req.body.kind;
  const body = clean(req.body && req.body.body, 3000);
  if (!feedbackKinds.includes(kind) || body.length < 10) throw new ValidationError('Feedback type and at least 10 characters are required');
  const { rows } = await query(`INSERT INTO client_feedback (user_id, kind, body)
    VALUES ($1, $2, $3) RETURNING id, kind, body, status, created_at`, [req.user.id, kind, body]);
  res.status(201).json(rows[0]);
}));
router.get('/clients/me/feedback', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT id, kind, body, status, created_at FROM client_feedback
    WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [req.user.id]);
  res.json(rows);
}));

router.get('/clients/:id/profile', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  await client(req.params.id);
  res.json(await profile(req.params.id, true));
}));
router.put('/clients/:id/profile', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const saved = await saveProfile(req.params.id, req.body || {}, true);
  await writeAudit({ actorUserId: req.user.id, action: 'update', entityType: 'client_profile',
    entityId: req.params.id, newValues: { fields: Object.keys(req.body || {}) } });
  res.json(saved);
}));
router.get('/clients/:id/feedback', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  await client(req.params.id);
  const { rows } = await query(`SELECT id, kind, body, status, created_at FROM client_feedback
    WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [req.params.id]);
  res.json(rows);
}));
router.patch('/clients/:id/feedback/:feedbackId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  if (!feedbackStatuses.includes(req.body && req.body.status)) throw new ValidationError('Invalid feedback status');
  await client(req.params.id);
  const { rows } = await query(`UPDATE client_feedback SET status = $1, updated_at = now()
    WHERE id = $2 AND user_id = $3 RETURNING id, kind, body, status, created_at`,
  [req.body.status, req.params.feedbackId, req.params.id]);
  if (!rows.length) throw new NotFoundError('Feedback not found');
  await writeAudit({ actorUserId: req.user.id, action: 'update', entityType: 'client_feedback',
    entityId: req.params.feedbackId, newValues: { status: req.body.status } });
  res.json(rows[0]);
}));
router.get('/clients/:id/insights', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  await client(req.params.id);
  const id = req.params.id;
  const [sectionsResult, hoursResult, placesResult, searchesResult, bookingsResult,
    admissionsResult, loginResult] = await Promise.all([
    query(`SELECT section, COUNT(*)::int AS count FROM client_activity_events
      WHERE user_id = $1 AND event_type = 'page_view' AND created_at >= now() - interval '90 days'
      GROUP BY section ORDER BY count DESC LIMIT 8`, [id]),
    query(`SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Riyadh')::int AS hour,
      COUNT(*)::int AS count FROM client_activity_events WHERE user_id = $1
      AND created_at >= now() - interval '90 days' GROUP BY hour ORDER BY count DESC LIMIT 6`, [id]),
    query(`SELECT location_label AS location, COUNT(*)::int AS count FROM client_activity_events
      WHERE user_id = $1 AND event_type = 'search' AND location_label IS NOT NULL
      AND created_at >= now() - interval '90 days'
      GROUP BY location_label ORDER BY count DESC LIMIT 8`, [id]),
    query(`SELECT search_term AS term, COUNT(*)::int AS count FROM client_activity_events
      WHERE user_id = $1 AND event_type = 'search' AND search_term IS NOT NULL
      AND created_at >= now() - interval '90 days'
      GROUP BY search_term ORDER BY count DESC LIMIT 8`, [id]),
    query(`SELECT status, COUNT(*)::int AS count FROM bookings WHERE user_id = $1
      GROUP BY status ORDER BY count DESC`, [id]),
    query(`SELECT status, COUNT(*)::int AS count FROM admission_applications
      WHERE applicant_user_id = $1 AND deleted_at IS NULL GROUP BY status ORDER BY count DESC`, [id]),
    query(`SELECT MAX(created_at) AS last_login FROM audit_logs WHERE actor_user_id = $1
      AND action = 'login' AND object_type = 'user'`, [id]),
  ]);
  res.json({ sections: sectionsResult.rows, hours: hoursResult.rows,
    places: placesResult.rows, searches: searchesResult.rows,
    bookings: bookingsResult.rows, admissions: admissionsResult.rows,
    lastLogin: loginResult.rows[0].last_login });
}));

module.exports = router;
