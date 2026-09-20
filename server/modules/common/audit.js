// modules/common/audit.js
// Audit trail writer for the audit_logs table
// (actor_user_id, object_type, object_id, organization_id,
//  old_values, new_values, reason, correlation_id).

const { query } = require('./pool');

/**
 * Write an audit entry.
 * @param {object} entry
 * @param {string|null} entry.actorUserId   users.id (null = system)
 * @param {string} entry.action             e.g. 'create' | 'update' | 'status_change'
 * @param {string} entry.entityType         e.g. 'organization' | 'booking' | 'user' (stored in object_type)
 * @param {string|null} entry.entityId      (stored in object_id)
 * @param {string|null} entry.organizationId
 * @param {object|null} entry.oldValues
 * @param {object|null} entry.newValues
 * @param {string|null} entry.reason
 * @param {string|null} entry.correlationId
 * @param {object} [executor]  Optional pg client. When supplied the audit row is
 *                             written on the caller's transaction instead of the pool.
 */
async function writeAudit(entry, executor) {
  const run = executor && typeof executor.query === 'function' ? executor.query.bind(executor) : query;
  await run(
    `INSERT INTO audit_logs
       (actor_user_id, action, object_type, object_id, organization_id,
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