import express from "express";
import multer from "multer";

import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { hasMinLength, isObjectIdLike, isNonEmptyString } from "../utils/validation.js";

import {
  getMentorshipRequests, 
  createMentorshipRequest, 
  updateMentorshipRequestStatus,
  createGroupConversation,
  leaveGroupConversation,
  updateGroupMemberRole,
  muteGroupMember,
  unmuteGroupMember,
  removeGroupMember,
  sendMessage,
  getConversationMessages,
  setConversationTyping,
  markConversationRead,
  toggleMessageReaction,
  editMessage,
  deleteMessage,
  uploadAttachment,
  upsertE2eePublicKey,
  syncConversationEnvelopes,
  toggleMuteConversation,
  toggleBlockUser,
} from "../controllers/mentorship.controller.js";

const router = express.Router();
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Validation functions (kept in routes as they are routing-specific)
function validateCreateMentorshipBody(body) {
  const issues = [];
  const recipientUserId = body.recipientUserId || body.mentorUserId;
  if (!isObjectIdLike(recipientUserId)) issues.push("Valid recipient user id is required");
  if (!hasMinLength(body.message, 10)) issues.push("Message must be at least 10 characters");
  return issues;
}

function validateMentorshipParams(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid mentorship request id"];
}

function validateMessageParams(params) {
  const issues = validateMentorshipParams(params);
  if (!isObjectIdLike(params.messageId)) issues.push("Invalid message id");
  return issues;
}

function validateUserParams(params) {
  const issues = validateMentorshipParams(params);
  if (!isObjectIdLike(params.userId)) issues.push("Invalid user id");
  return issues;
}

function validateMentorshipMessageBody(body) {
  const issues = [];
  const hasContent = hasMinLength(body.content, 1);
  const hasAttachments = Array.isArray(body.attachments) && body.attachments.length > 0;

  if (!hasContent && !hasAttachments) {
    issues.push("Message content or attachments are required");
  }
  return issues;
}

// Routes
router.get("/", protect, requireTenantAccess, getMentorshipRequests);
router.post("/", protect, authorize("alumni"), requireTenantAccess, validateBody(validateCreateMentorshipBody), createMentorshipRequest);
router.patch("/:id", protect, authorize("alumni"), requireTenantAccess, validateParams(validateMentorshipParams), validateBody((body) => ["accepted", "declined"].includes(String(body.status || "").trim()) ? [] : ["Status must be accepted or declined"]), updateMentorshipRequestStatus);
router.post("/groups", protect, authorize("alumni"), requireTenantAccess, validateBody((body) => {
  const issues = [];
  if (!isNonEmptyString(body.groupName)) issues.push("Group name is required");
  if (!Array.isArray(body.memberUserIds) || body.memberUserIds.length === 0) issues.push("Choose at least one member");
  return issues;
}), createGroupConversation);
router.post("/uploads", protect, authorize("alumni"), requireTenantAccess, attachmentUpload.single("file"), uploadAttachment);
router.put("/e2ee/public-key", protect, authorize("alumni"), requireTenantAccess, validateBody((body) => isNonEmptyString(body.publicKey) ? [] : ["Public key is required"]), upsertE2eePublicKey);
router.patch("/:id/e2ee/envelopes", protect, authorize("alumni"), requireTenantAccess, validateParams(validateMentorshipParams), syncConversationEnvelopes);
router.get("/:id/messages", protect, requireTenantAccess, validateParams(validateMentorshipParams), getConversationMessages);
router.post("/:id/messages", protect, requireTenantAccess, validateParams(validateMentorshipParams), validateBody(validateMentorshipMessageBody), sendMessage);
router.post("/:id/messages/:messageId/reactions", protect, requireTenantAccess, validateParams(validateMessageParams), toggleMessageReaction);
router.patch("/:id/messages/:messageId", protect, requireTenantAccess, validateParams(validateMessageParams), validateBody((body) => hasMinLength(body.content, 1) ? [] : ["Message content is required"]), editMessage);
router.delete("/:id/messages/:messageId", protect, requireTenantAccess, validateParams(validateMessageParams), deleteMessage);
router.post("/:id/read", protect, requireTenantAccess, validateParams(validateMentorshipParams), markConversationRead);
router.post("/:id/typing", protect, requireTenantAccess, validateParams(validateMentorshipParams), setConversationTyping);
router.post("/:id/leave", protect, authorize("alumni"), requireTenantAccess, validateParams(validateMentorshipParams), leaveGroupConversation);
router.patch("/:id/members/:userId/role", protect, authorize("alumni"), requireTenantAccess, validateParams(validateUserParams), validateBody((body) => ["member", "moderator", "admin"].includes(String(body.role || "").trim()) ? [] : ["Role must be member, moderator, or admin"]), updateGroupMemberRole);
router.patch("/:id/members/:userId/mute", protect, authorize("alumni"), requireTenantAccess, validateParams(validateUserParams), muteGroupMember);
router.delete("/:id/members/:userId/mute", protect, authorize("alumni"), requireTenantAccess, validateParams(validateUserParams), unmuteGroupMember);
router.delete("/:id/members/:userId", protect, authorize("alumni"), requireTenantAccess, validateParams(validateUserParams), removeGroupMember);
router.post("/:id/mute", protect, requireTenantAccess, validateParams(validateMentorshipParams), toggleMuteConversation);
router.post("/:id/block", protect, requireTenantAccess, validateParams(validateMentorshipParams), toggleBlockUser);

// ... Other routes will be migrated similarly ...

export default router;
