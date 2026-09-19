// modules/admin/repository.js
// OWNING MODULE: admin
// Audit logs + system settings + pending registrations (read-heavy, write in Phase 2C+).

const { query } = require('../common/pool');

async function listAuditLogs({ actorUserId, entityType, organizationId, offset = 0, limit = 50 } = {}) {
  const conditions = [];
  const params = [];
  if (actorUserId) { params.push(actorUserId); conditions.push(`al.actor_user_id = $${params.length}`); }
  if (entityType) { params.push(entityType); conditions.push(`al.entity_type = $${params.length}`); }
  if (organizationId) { params.push(organizationId); conditions.push(`al.organization_id = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT al.*, u.name AS actor_name FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return rows;
}

async function getSetting(key) {
  const { rows } = await query(`SELECT * FROM system_settings WHERE key = $1`, [key]);
  return rows[0] || null;
}

async function listSettings() {
  const { rows } = await query(`SELECT * FROM system_settings ORDER BY key`);
  return rows;
}

async function upsertSetting(key, value, { description, updatedBy } = {}) {
  const { rows } = await query(
    `INSERT INTO system_settings (key, value, description, updated_by)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING *`,
    [key, JSON.stringify(value), description || null, updatedBy || null]
  );
  return rows[0];
}

async function countPendingRegistrations() {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM users WHERE status = 'pending'`
  );
  return rows[0].count;
}

async function listPendingRegistrations({ offset = 0, limit = 20 } = {}) {
  const { rows } = await query(
    `SELECT id, name, email, role, status, created_at FROM users WHERE status = 'pending' ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function dashboardMetrics() {
  const [
    organizations,
    teachers,
    users,
    bookings,
    admissions,
    fees,
    marketing,
    recentAudit,
  ] = await Promise.all([
    query(`SELECT type, COUNT(*)::int AS count,
                  COUNT(*) FILTER (WHERE verified = true)::int AS verified_count,
                  COUNT(*) FILTER (WHERE verification_status = 'pending')::int AS pending_count
           FROM organizations WHERE deleted_at IS NULL GROUP BY type ORDER BY type`),
    query(`SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE profile_status = 'active')::int AS active,
                  COUNT(*) FILTER (WHERE verification_status = 'pending')::int AS pending
           FROM teacher_profiles WHERE deleted_at IS NULL`),
    query(`SELECT COALESCE(r.name, 'unassigned') AS role, u.status, COUNT(*)::int AS count
           FROM users u LEFT JOIN roles r ON r.id = u.role_id
           WHERE u.deleted_at IS NULL GROUP BY r.name, u.status ORDER BY r.name, u.status`),
    query(`SELECT status, COUNT(*)::int AS count FROM bookings GROUP BY status ORDER BY status`),
    query(`SELECT status, COUNT(*)::int AS count FROM admission_applications
           WHERE deleted_at IS NULL GROUP BY status ORDER BY status`),
    query(`SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE active = true)::int AS active,
                  COALESCE(SUM(amount) FILTER (WHERE active = true), 0) AS active_amount
           FROM organization_fees WHERE deleted_at IS NULL`),
    query(`SELECT
             (SELECT COUNT(*)::int FROM hero_slides) AS slides,
             (SELECT COUNT(*)::int FROM advertisements) AS advertisements,
             (SELECT COUNT(*)::int FROM offers) AS offers`),
    query(`SELECT al.id, al.action, al.entity_type, al.entity_id, al.created_at, u.name AS actor_name
           FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_user_id
           ORDER BY al.created_at DESC LIMIT 8`),
  ]);
  return {
    organizations: organizations.rows,
    teachers: teachers.rows[0],
    users: users.rows,
    bookings: bookings.rows,
    admissions: admissions.rows,
    fees: fees.rows[0],
    marketing: marketing.rows[0],
    recentAudit: recentAudit.rows,
  };
}

module.exports = { listAuditLogs, getSetting, listSettings, upsertSetting, countPendingRegistrations, listPendingRegistrations, dashboardMetrics };
