// modules/communication/service.js
// OWNING MODULE: communication
// Minimal DTO + validation for conversations, messages, notifications.

const repo = require('./repository');
const { ValidationError, ForbiddenError, NotFoundError } = require('../common/errors');
const { writeAudit } = require('../common/audit');

function mapConversation(row) {
  if (!row) return null;
  return { id: row.id, title: row.title, isGroup: row.is_group, lastMessageAt: row.last_message_at, createdAt: row.created_at };
}

function mapMessage(row) {
  if (!row) return null;
  return { id: row.id, conversationId: row.conversation_id, senderUserId: row.sender_user_id,
    senderName: row.sender_name, content: row.content, messageType: row.message_type, createdAt: row.created_at };
}

function mapNotification(row) {
  if (!row) return null;
  return { id: row.id, userId: row.user_id, title: row.title, body: row.body,
    notificationType: row.notification_type, entityType: row.entity_type, entityId: row.entity_id,
    isRead: row.is_read, createdAt: row.created_at };
}

async function listConversations(userId, opts) { return (await repo.listConversations(userId, opts)).map(mapConversation); }
async function listMessages(conversationId, opts) { return (await repo.listMessages(conversationId, opts)).map(mapMessage); }
async function listNotifications(userId, opts) { return (await repo.listNotifications(userId, opts)).map(mapNotification); }

async function sendMessage({ userId, conversationId, content }) {
  if (!conversationId) throw new ValidationError('conversationId is required');
  if (!content || !content.trim()) throw new ValidationError('content is required');
  const conv = await repo.findConversationById(conversationId);
  if (!conv) throw new NotFoundError('Conversation not found');
  const isMember = await repo.isConversationMember(conversationId, userId);
  if (!isMember) throw new ForbiddenError('You are not a member of this conversation');
  const msg = await repo.createMessage({ conversationId, senderUserId: userId, content });
  await writeAudit({
    actorUserId: userId,
    action: 'send_message',
    entityType: 'message',
    entityId: msg.id,
    newValues: { conversation_id: conversationId },
  });
  return mapMessage(msg);
}

async function createConversationWithMessage({ userId, recipientUserId, content }) {
  if (!content || !content.trim()) throw new ValidationError('content is required');
  const conv = await repo.createConversation({ title: null, isGroup: false });
  await repo.addConversationMember(conv.id, userId, { role: 'admin' });
  if (recipientUserId) await repo.addConversationMember(conv.id, recipientUserId, { role: 'member' });
  const msg = await repo.createMessage({ conversationId: conv.id, senderUserId: userId, content });
  await writeAudit({
    actorUserId: userId,
    action: 'create_conversation',
    entityType: 'conversation',
    entityId: conv.id,
    newValues: { recipient_user_id: recipientUserId || null },
  });
  return { conversation: mapConversation(conv), message: mapMessage(msg) };
}

async function isConversationMember(conversationId, userId) {
   return await repo.isConversationMember(conversationId, userId);
}

module.exports = { listConversations, listMessages, listNotifications, sendMessage, createConversationWithMessage, isConversationMember };