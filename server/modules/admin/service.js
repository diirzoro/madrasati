// modules/admin/service.js
// OWNING MODULE: admin
// Admin dashboard data + system settings management.
// Phase 2B: read-only admin views + settings CRUD; user suspension deferred to 2D.

const repo = require('./repository');
const { writeAudit } = require('../common/audit');

function mapAuditLog(row) {
  if (!row) return null;
  return {
    id: row.id, actorUserId: row.actor_user_id, actorName: row.actor_name,
    action: row.action, entityType: row.object_type, entityId: row.object_id,
    organizationId: row.organization_id, oldValues: row.old_values,
    newValues: row.new_values, reason: row.reason, correlationId: row.correlation_id,
    createdAt: row.created_at,
  };
}

function mapSetting(row) {
  if (!row) return null;
  return { key: row.key, value: row.value, description: row.description, updatedBy: row.updated_by, updatedAt: row.updated_at };
}

async function listAuditLogs(filters) { return (await repo.listAuditLogs(filters)).map(mapAuditLog); }
async function listSettings() { return (await repo.listSettings()).map(mapSetting); }
async function getSetting(key) { return mapSetting(await repo.getSetting(key)); }

async function updateSetting({ key, value, description, updatedBy }) {
  const existing = await repo.getSetting(key);
  const setting = await repo.upsertSetting(key, value, { description, updatedBy });
  await writeAudit({
    actorUserId: updatedBy || null,
    action: existing ? 'update' : 'create',
    entityType: 'system_setting',
    entityId: key,
    oldValues: existing ? { value: existing.value } : null,
    newValues: { value, description },
  });
  return mapSetting(setting);
}

async function dashboardCounts() {
  const [pendingRegistrations, metrics] = await Promise.all([
    repo.countPendingRegistrations(),
    repo.dashboardMetrics(),
  ]);
  const { query } = require('../common/pool');
  const [own, loc, docs] = await Promise.all([
    query(`SELECT COUNT(*)::int AS c FROM ownership_requests WHERE status IN ('pending','under_review')`),
    query(`SELECT COUNT(*)::int AS c FROM location_requests WHERE status = 'pending'`),
    query(`SELECT COUNT(*)::int AS c FROM organization_documents WHERE status = 'pending'`),
  ]);
  return {
    ...metrics,
    pendingRegistrations,
    pendingOwnershipRequests: own.rows[0].c,
    pendingLocationRequests: loc.rows[0].c,
    pendingDocuments: docs.rows[0].c,
  };
}

module.exports = { listAuditLogs, listSettings, getSetting, updateSetting, dashboardCounts };
