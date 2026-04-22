import express from "express";
import multer from "multer";

import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { hasMinLength, isObjectIdLike, isNonEmptyString } from "../utils/validation.js";

import { 
  getMentorshipRequests, 
  createMentorshipRequest, 
  sendMessage,
  getConversationMessages
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
router.get("/:id/messages", protect, requireTenantAccess, validateParams(validateMentorshipParams), getConversationMessages);
router.post("/:id/messages", protect, requireTenantAccess, validateParams(validateMentorshipParams), validateBody(validateMentorshipMessageBody), sendMessage);

// ... Other routes will be migrated similarly ...

export default router;
