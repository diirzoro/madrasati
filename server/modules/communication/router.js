// modules/communication/router.js
// OWNING MODULE: communication
// Minimal API for conversations, messages, notifications.

const { Router } = require('express');
const service = require('./service');
const { asyncHandler } = require('../common/http');
const { ForbiddenError } = require('../common/errors');
const { requireAuth } = require('../identity/auth');

const router = Router();

router.get('/conversations', requireAuth, asyncHandler(async (req, res) => {
  const { offset, limit } = req.query;
  res.json(await service.listConversations(req.user.id, { offset: offset ? Number(offset) : undefined, limit: limit ? Number(limit) : undefined }));
}));

router.post('/conversations', requireAuth, asyncHandler(async (req, res) => {
  const { recipientUserId, content } = req.body;
  const result = await service.createConversationWithMessage({ userId: req.user.id, recipientUserId, content });
  res.status(201).json(result);
}));

router.get('/conversations/:id/messages', requireAuth, asyncHandler(async (req, res) => {
   const { offset, limit } = req.query;
   // Check if user is a member of the conversation before listing messages
   const isMember = await service.isConversationMember(req.params.id, req.user.id);
   if (!isMember) {
      throw new ForbiddenError('Access denied');
   }
   res.json(await service.listMessages(req.params.id, { offset: offset ? Number(offset) : undefined, limit: limit ? Number(limit) : undefined }));
}));

router.post('/conversations/:id/messages', requireAuth, asyncHandler(async (req, res) => {
   // Check if user is a member of the conversation before sending message
   const isMember = await service.isConversationMember(req.params.id, req.user.id);
   if (!isMember) {
      throw new ForbiddenError('Access denied');
   }
   res.status(201).json(await service.sendMessage({ userId: req.user.id, conversationId: req.params.id, content: req.body.content }));
}));

router.get('/notifications', requireAuth, asyncHandler(async (req, res) => {
  const { offset, limit } = req.query;
  res.json(await service.listNotifications(req.user.id, { offset: offset ? Number(offset) : undefined, limit: limit ? Number(limit) : undefined }));
}));

module.exports = router;