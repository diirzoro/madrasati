// modules/communication/repository.js
// OWNING MODULE: communication
// conversations, members, messages, notifications.

const { query } = require('../common/pool');

async function listConversations(userId, { offset = 0, limit = 20 } = {}) {
  const { rows } = await query(
    `SELECT DISTINCT c.* FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     WHERE cm.user_id = $1
     ORDER BY c.last_message_at DESC NULLS LAST
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
}

async function findConversationById(id) {
  const { rows } = await query(`SELECT * FROM conversations WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createConversation({ title, isGroup }) {
  const { rows } = await query(
    `INSERT INTO conversations (title, is_group) VALUES ($1, $2) RETURNING *`,
    [title || null, Boolean(isGroup)]
  );
  return rows[0];
}

async function addConversationMember(conversationId, userId, { role } = {}) {
  const { rows } = await query(
    `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *`,
    [conversationId, userId, role || 'member']
  );
  return rows[0] || null;
}

async function listMessages(conversationId, { offset = 0, limit = 50 } = {}) {
  const { rows } = await query(
    `SELECT m.*, u.name AS sender_name FROM messages m
     JOIN users u ON u.id = m.sender_user_id
     WHERE m.conversation_id = $1
     ORDER BY m.created_at ASC
     LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset]
  );
  return rows;
}

async function isConversationMember(conversationId, userId) {
  const { rows } = await query(
    `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  return Boolean(rows[0]);
}

async function createMessage({ conversationId, senderUserId, content, messageType }) {
  const { rows } = await query(
    `INSERT INTO messages (conversation_id, sender_user_id, content, message_type)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [conversationId, senderUserId, content, messageType || 'text']
  );
  await query(`UPDATE conversations SET last_message_at = NOW(), last_message_preview = LEFT($2, 200) WHERE id = $1`, [conversationId, content]);
  return rows[0];
}

async function listNotifications(userId, { offset = 0, limit = 20 } = {}) {
  const { rows } = await query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
}

async function createNotification({ userId, title, body, notificationType, entityType, entityId }) {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, title, body, notification_type, entity_type, entity_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [userId, title, body || null, notificationType || 'info', entityType || null, entityId || null]
  );
  return rows[0];
}

module.exports = {
  listConversations, findConversationById, createConversation, addConversationMember,
  isConversationMember,
  listMessages, createMessage, listNotifications, createNotification,
};