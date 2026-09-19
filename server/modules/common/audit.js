// modules/common/audit.js
// Audit trail writer aligned to the Phase 2A audit_logs evolution
// (actor_user_id, entity_type, entity_id, organization_id,
//  old_values, new_values, reason, correlation_id).

const { query } = require('./pool');

/**
 * Write an audit entry.
 * @param {object} entry
 * @param {string|null} entry.actorUserId   users.id (null = system)
 * @param {string} entry.action             e.g. 'create' | 'update' | 'status_change'
 * @param {string} entry.entityType         e.g. 'organization' | 'booking' | 'user'
 * @param {string|null} entry.entityId
 * @param {string|null} entry.organizationId
 * @param {object|null} entry.oldValues
 * @param {object|null} entry.newValues
 * @param {string|null} entry.reason
 * @param {string|null} entry.correlationId
 */
async function writeAudit(entry) {
  await query(
    `INSERT INTO audit_logs
       (actor_user_id, action, entity_type, entity_id, organization_id,
        old_values, new_values, reason, correlation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      entry.actorUserId || null,
      entry.action,
      entry.entityType,
      entry.entityId || null,
      entry.organizationId || null,
      entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      entry.newValues ? JSON.stringify(entry.newValues) : null,
      entry.reason || null,
      entry.correlationId || null,
    ]
  );
}

module.exports = { writeAudit };