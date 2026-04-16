import express from "express";
import multer from "multer";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { logAuditEvent } from "../utils/audit.js";
import { sendConnectionRequestEmail } from "../utils/email.js";
import { createNotification } from "../utils/notifications.js";
import { persistMentorshipAttachments, storeIncomingUpload } from "../utils/attachments.js";
import { hasMinLength, isObjectIdLike, isNonEmptyString } from "../utils/validation.js";

const router = express.Router();
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
const allowedAttachmentMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/octet-stream",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
const E2EE_CONVERSATION_KEY_VERSION = "conv-v1";
const E2EE_PUBLIC_KEY_MAX_LENGTH = 12000;
const E2EE_ENCRYPTED_KEY_MAX_LENGTH = 16000;

function emitMentorshipRealtimeEvent(req, payload) {
  const emitMentorshipEvent = req.app?.locals?.emitMentorshipEvent;
  if (typeof emitMentorshipEvent !== "function") {
    return;
  }

  emitMentorshipEvent({
    tenantId: req.tenant?._id?.toString?.() || null,
    actorUserId: req.user?._id?.toString?.() || null,
    ...payload
  });
}

function validateCreateMentorshipBody(body) {
  const issues = [];
  const recipientUserId = body.recipientUserId || body.mentorUserId;
  if (!isObjectIdLike(recipientUserId)) issues.push("Valid recipient user id is required");
  if (!hasMinLength(body.message, 10)) issues.push("Message must be at least 10 characters");
  return issues;
}

function validateCreateGroupBody(body) {
  const issues = [];

  if (!isNonEmptyString(body.groupName)) {
    issues.push("Group name is required");
  }

  if (!Array.isArray(body.memberUserIds) || body.memberUserIds.length < 1) {
    issues.push("Choose at least one member for the group");
  } else if (body.memberUserIds.some((id) => !isObjectIdLike(id))) {
    issues.push("All group members must be valid user ids");
  }

  if (body.initialMessage && !hasMinLength(body.initialMessage, 1)) {
    issues.push("Initial message must not be empty");
  }

  return issues;
}

function validateMentorshipParams(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid mentorship request id"];
}

function validateMentorshipUpdateBody(body) {
  return ["accepted", "declined"].includes(body.status) ? [] : ["Status must be accepted or declined"];
}

function validateMentorshipMessageBody(body) {
  const issues = [];
  const hasContent = hasMinLength(body.content, 1);
  const hasAttachments = Array.isArray(body.attachments) && body.attachments.length > 0;

  if (!hasContent && !hasAttachments) {
    issues.push("Message content or attachments are required");
  }

  if (body.replyToMessageId && !isObjectIdLike(body.replyToMessageId)) {
    issues.push("replyToMessageId must be a valid message id");
  }

  if (body.attachments && !Array.isArray(body.attachments)) {
    issues.push("attachments must be an array");
    return issues;
  }

  if (Array.isArray(body.attachments) && body.attachments.length > 4) {
    issues.push("You can attach up to 4 files per message");
  }

  if (Array.isArray(body.attachments)) {
    for (const attachment of body.attachments) {
      if (!attachment || typeof attachment !== "object") {
        issues.push("Each attachment must be an object");
        continue;
      }

      if (!isNonEmptyString(attachment.name)) {
        issues.push("Attachment name is required");
      }

      if (!isNonEmptyString(attachment.url)) {
        issues.push("Attachment url is required");
      }

      const size = Number(attachment.size || 0);
      if (!Number.isFinite(size) || size < 0 || size > 5 * 1024 * 1024) {
        issues.push("Attachment size must be between 0 and 5 MB");
      }

      if (typeof attachment.url === "string" && attachment.url.length > 2_500_000) {
        issues.push("Attachment payload is too large");
      }

      if (attachment.isEncrypted === true && !isNonEmptyString(attachment.encryptionIv)) {
        issues.push("Encrypted attachments require encryptionIv");
      }
    }
  }

  return issues;
}

function validateTypingBody(body) {
  return typeof body.isTyping === "boolean" ? [] : ["isTyping must be a boolean"];
}

function validateReactionBody(body) {
  if (!isNonEmptyString(body.emoji)) {
    return ["emoji is required"];
  }

  if (String(body.emoji).trim().length > 16) {
    return ["emoji must be 16 characters or fewer"];
  }

  return [];
}

function validateMessageUpdateBody(body) {
  return hasMinLength(body.content, 1) ? [] : ["Updated message content is required"];
}

function validateMemberActionParams(params) {
  const issues = [];

  if (!isObjectIdLike(params.id)) {
    issues.push("Invalid mentorship request id");
  }

  if (!isObjectIdLike(params.userId)) {
    issues.push("Invalid user id");
  }

  return issues;
}

function validateMessageActionParams(params) {
  const issues = [];

  if (!isObjectIdLike(params.id)) {
    issues.push("Invalid mentorship request id");
  }

  if (!isObjectIdLike(params.messageId)) {
    issues.push("Invalid message id");
  }

  return issues;
}

function validateMemberRoleBody(body) {
  return ["member", "moderator", "admin"].includes(body.role)
    ? []
    : ["Role must be member, moderator, or admin"];
}

function validateMuteBody(body) {
  const minutes = Number(body.minutes);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 10080
    ? []
    : ["minutes must be an integer between 1 and 10080"];
}

function sanitizeE2eePublicKey(value) {
  return String(value || "").trim().slice(0, E2EE_PUBLIC_KEY_MAX_LENGTH);
}

function validateE2eePublicKeyBody(body) {
  const issues = [];

  if (!isNonEmptyString(body.publicKey)) {
    issues.push("publicKey is required");
  } else if (String(body.publicKey).trim().length > E2EE_PUBLIC_KEY_MAX_LENGTH) {
    issues.push("publicKey is too large");
  }

  if (body.algorithm !== undefined && !isNonEmptyString(body.algorithm)) {
    issues.push("algorithm must be a non-empty string");
  }

  return issues;
}

function validateE2eeEnvelopeSyncBody(body) {
  const issues = [];

  if (!Array.isArray(body.envelopes) || body.envelopes.length < 1) {
    issues.push("envelopes must be a non-empty array");
    return issues;
  }

  if (body.envelopes.length > 100) {
    issues.push("You can sync up to 100 envelopes per request");
    return issues;
  }

  for (const envelope of body.envelopes) {
    if (!envelope || typeof envelope !== "object") {
      issues.push("Each envelope must be an object");
      continue;
    }

    if (!isObjectIdLike(envelope.userId)) {
      issues.push("Each envelope must contain a valid userId");
    }

    if (!isNonEmptyString(envelope.encryptedKey)) {
      issues.push("Each envelope must contain encryptedKey");
    } else if (String(envelope.encryptedKey).trim().length > E2EE_ENCRYPTED_KEY_MAX_LENGTH) {
      issues.push("encryptedKey is too large");
    }
  }

  return issues;
}

function normalizeConversationKeyEnvelopes(envelopes) {
  const result = [];

  for (const envelope of ensureArray(envelopes)) {
    if (!envelope || typeof envelope !== "object") {
      continue;
    }

    const userId = String(envelope.userId || "").trim();
    const encryptedKey = String(envelope.encryptedKey || "").trim();
    if (!isObjectIdLike(userId) || !encryptedKey) {
      continue;
    }

    result.push({
      userId,
      encryptedKey: encryptedKey.slice(0, E2EE_ENCRYPTED_KEY_MAX_LENGTH),
      algorithm: String(envelope.algorithm || "RSA-OAEP").trim().slice(0, 80) || "RSA-OAEP",
      version: String(envelope.version || E2EE_CONVERSATION_KEY_VERSION).trim().slice(0, 64) || E2EE_CONVERSATION_KEY_VERSION
    });
  }

  return result;
}

function toIdString(value) {
  if (!value) return null;
  return value._id?.toString?.() || value.toString?.() || null;
}

function getGroupRole(request, userId) {
  const userIdString = String(userId);
  const roleEntry = (request.memberRoles || []).find((entry) => toIdString(entry.userId) === userIdString);
  if (roleEntry?.role) {
    return roleEntry.role;
  }

  const isAdmin = (request.adminIds || []).some((entry) => toIdString(entry) === userIdString);
  return isAdmin ? "admin" : "member";
}

function syncGroupAdminsFromRoles(request) {
  const adminIds = (request.memberRoles || [])
    .filter((entry) => entry.role === "admin")
    .map((entry) => entry.userId);

  request.adminIds = adminIds;
}

function purgeExpiredMutes(request) {
  const now = Date.now();
  request.mutedMembers = (request.mutedMembers || []).filter((entry) => {
    const mutedUntil = new Date(entry.mutedUntil).getTime();
    return Number.isFinite(mutedUntil) && mutedUntil > now;
  });
}

function getActiveMute(request, userId) {
  const userIdString = String(userId);
  const now = Date.now();

  return (request.mutedMembers || []).find((entry) => {
    const mutedUntil = new Date(entry.mutedUntil).getTime();
    return toIdString(entry.userId) === userIdString && Number.isFinite(mutedUntil) && mutedUntil > now;
  });
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function includesUserId(entries, userId) {
  const userIdString = String(userId);
  return ensureArray(entries).some((entry) => toIdString(entry) === userIdString);
}

function pushUserId(entries, userId) {
  const current = ensureArray(entries);
  if (includesUserId(current, userId)) {
    return current;
  }

  return [...current, userId];
}

function upsertConversationKeyEnvelope(request, envelope) {
  const userId = String(envelope.userId);
  const existing = ensureArray(request.conversationKeyEnvelopes).find(
    (entry) => toIdString(entry.userId) === userId
  );

  if (existing) {
    existing.encryptedKey = envelope.encryptedKey;
    existing.algorithm = envelope.algorithm;
    existing.version = envelope.version;
    existing.updatedAt = new Date();
    return;
  }

  request.conversationKeyEnvelopes.push({
    userId,
    encryptedKey: envelope.encryptedKey,
    algorithm: envelope.algorithm,
    version: envelope.version,
    updatedAt: new Date()
  });
}

function sanitizeAttachments(attachments) {
  return ensureArray(attachments)
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") {
        return null;
      }

      const name = String(attachment.name || "").trim().slice(0, 160);
      const url = String(attachment.url || "").trim();
      const mimeType = String(attachment.mimeType || "").trim().slice(0, 120);
      const size = Number(attachment.size || 0);

      if (!name || !url || !Number.isFinite(size) || size < 0) {
        return null;
      }

      return {
        name,
        url,
        mimeType,
        size: Math.min(size, 5 * 1024 * 1024),
        isEncrypted: attachment.isEncrypted === true,
        encryptionVersion: String(attachment.encryptionVersion || "").trim().slice(0, 32),
        encryptionAlgorithm: String(attachment.encryptionAlgorithm || "").trim().slice(0, 64),
        encryptionIv: String(attachment.encryptionIv || "").trim().slice(0, 256),
        originalMimeType: String(attachment.originalMimeType || "").trim().slice(0, 120),
        originalName: String(attachment.originalName || "").trim().slice(0, 160)
      };
    })
    .filter(Boolean)
    .slice(0, 4);
}

function getConversationParticipantIds(request) {
  if (request.conversationType === "group") {
    return [...new Set((request.memberIds || []).map((member) => toIdString(member)).filter(Boolean))];
  }

  return [...new Set([toIdString(request.requesterId), toIdString(request.mentorId)].filter(Boolean))];
}

function getMessageDeliveryMetadata(message, request, currentUserId) {
  const senderId = toIdString(message.senderId);
  const userId = String(currentUserId || "");

  if (!senderId || !userId || senderId !== userId) {
    return null;
  }

  const recipientIds = getConversationParticipantIds(request).filter((id) => id !== senderId);
  const deliveredTo = ensureArray(message.deliveredTo).map((entry) => toIdString(entry)).filter(Boolean);
  const readBy = ensureArray(message.readBy).map((entry) => toIdString(entry)).filter(Boolean);

  const deliveredCount = recipientIds.filter((recipientId) => deliveredTo.includes(recipientId)).length;
  const readCount = recipientIds.filter((recipientId) => readBy.includes(recipientId)).length;
  const recipientCount = recipientIds.length;

  let status = "sent";
  if (deliveredCount > 0) {
    status = "delivered";
  }
  if (readCount > 0) {
    status = "read";
  }

  return {
    status,
    deliveredCount,
    readCount,
    recipientCount
  };
}

function enrichPersonWithProfile(person, profileByUserId, e2eeKeyByUserId) {
  if (!person) return null;

  const userId = person._id.toString();
  const profile = profileByUserId.get(userId);
  const e2eeKey = e2eeKeyByUserId.get(userId);

  return {
    _id: person._id,
    name: person.name,
    email: person.email,
    batch: profile?.batch,
    department: profile?.department,
    company: profile?.company,
    designation: profile?.designation,
    location: profile?.location,
    e2eePublicKey: e2eeKey?.e2eePublicKey || "",
    e2eeKeyAlgorithm: e2eeKey?.e2eeKeyAlgorithm || "",
    e2eeKeyUpdatedAt: e2eeKey?.e2eeKeyUpdatedAt || null
  };
}

function getConversationUserIds(request) {
  if (request.conversationType === "group") {
    const memberIds = (request.memberIds || []).map((member) => member?._id?.toString?.() || member?.toString?.());
    const adminIds = (request.adminIds || []).map((admin) => admin?._id?.toString?.() || admin?.toString?.());
    const roleIds = (request.memberRoles || []).map((entry) => entry.userId?._id?.toString?.() || entry.userId?.toString?.());
    const mutedByIds = (request.mutedMembers || []).map((entry) => entry.mutedById?._id?.toString?.() || entry.mutedById?.toString?.());
    const mutedUserIds = (request.mutedMembers || []).map((entry) => entry.userId?._id?.toString?.() || entry.userId?.toString?.());
    const senderIds = (request.messages || []).map((message) => message.senderId?._id?.toString?.() || message.senderId?.toString?.());
    const deletedByIds = (request.messages || []).map((message) => message.deletedById?._id?.toString?.() || message.deletedById?.toString?.());
    const deliveredToIds = (request.messages || []).flatMap((message) =>
      ensureArray(message.deliveredTo).map((entry) => entry?._id?.toString?.() || entry?.toString?.())
    );
    const readByIds = (request.messages || []).flatMap((message) =>
      ensureArray(message.readBy).map((entry) => entry?._id?.toString?.() || entry?.toString?.())
    );
    const typingIds = (request.typingMembers || []).map((entry) => entry.userId?._id?.toString?.() || entry.userId?.toString?.());
    return [
      ...memberIds,
      ...adminIds,
      ...roleIds,
      ...mutedByIds,
      ...mutedUserIds,
      ...senderIds,
      ...deletedByIds,
      ...deliveredToIds,
      ...readByIds,
      ...typingIds
    ].filter(Boolean);
  }

  return [
    request.requesterId?._id?.toString?.(),
    request.mentorId?._id?.toString?.(),
    ...(request.messages || []).map((message) => message.senderId?._id?.toString?.() || message.senderId?.toString?.()),
    ...(request.messages || []).map((message) => message.deletedById?._id?.toString?.() || message.deletedById?.toString?.()),
    ...(request.messages || []).flatMap((message) =>
      ensureArray(message.deliveredTo).map((entry) => entry?._id?.toString?.() || entry?.toString?.())
    ),
    ...(request.messages || []).flatMap((message) =>
      ensureArray(message.readBy).map((entry) => entry?._id?.toString?.() || entry?.toString?.())
    ),
    ...(request.typingMembers || []).map((entry) => entry.userId?._id?.toString?.() || entry.userId?.toString?.())
  ].filter(Boolean);
}

async function formatMentorshipRequestsWithProfiles(requests, tenantModels, currentUserId = null) {
  const { AlumniProfile, User } = tenantModels;
  const userIds = [...new Set(requests.flatMap((request) => getConversationUserIds(request)))];

  const profiles = await AlumniProfile.find({ userId: { $in: userIds } }).select(
    "userId batch department company designation location"
  );
  const e2eeUsers = await User.find({ _id: { $in: userIds } }).select(
    "_id e2eePublicKey e2eeKeyAlgorithm e2eeKeyUpdatedAt"
  );

  const profileByUserId = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));
  const e2eeKeyByUserId = new Map(e2eeUsers.map((user) => [user._id.toString(), user]));
  const personById = new Map();

  function registerPerson(person) {
    if (!person?._id) return;
    const personId = person._id.toString();
    if (personById.has(personId)) return;
    personById.set(personId, enrichPersonWithProfile(person, profileByUserId, e2eeKeyByUserId));
  }

  for (const request of requests) {
    const people = request.conversationType === "group"
      ? [
          ...(request.memberIds || []),
          ...(request.adminIds || []),
          ...(request.memberRoles || []).map((entry) => entry.userId),
          ...(request.mutedMembers || []).map((entry) => entry.userId),
          ...(request.mutedMembers || []).map((entry) => entry.mutedById),
          ...(request.messages || []).map((message) => message.senderId),
          ...(request.messages || []).map((message) => message.deletedById)
        ]
      : [
          request.requesterId,
          request.mentorId,
          ...(request.messages || []).map((message) => message.senderId),
          ...(request.messages || []).map((message) => message.deletedById)
        ];

    for (const person of people) {
      registerPerson(person);
    }
  }

  return requests.map((request) => {
    const memberRoleMap = new Map(
      (request.memberRoles || []).map((entry) => [toIdString(entry.userId), entry.role || "member"])
    );
    const mutedMemberMap = new Map(
      (request.mutedMembers || []).map((entry) => [toIdString(entry.userId), entry])
    );
    const requestMessageById = new Map((request.messages || []).map((message) => [String(message._id), message]));
    const participantIds = getConversationParticipantIds(request);
    const participantKeyRegistry = participantIds
      .map((participantId) => {
        const person = personById.get(participantId);
        if (!person) {
          return null;
        }

        return {
          userId: participantId,
          publicKey: person.e2eePublicKey || "",
          algorithm: person.e2eeKeyAlgorithm || "",
          updatedAt: person.e2eeKeyUpdatedAt || null
        };
      })
      .filter(Boolean);
    const conversationKeyEnvelopes = ensureArray(request.conversationKeyEnvelopes)
      .map((envelope) => {
        const userId = toIdString(envelope.userId);
        if (!userId) {
          return null;
        }

        return {
          userId,
          encryptedKey: envelope.encryptedKey || "",
          algorithm: envelope.algorithm || "RSA-OAEP",
          version: envelope.version || E2EE_CONVERSATION_KEY_VERSION,
          updatedAt: envelope.updatedAt || null
        };
      })
      .filter(Boolean);

    const messages = (request.messages || []).map((message) => {
      const senderId = message.senderId?._id?.toString?.() || message.senderId?.toString?.();
      const sender = senderId ? personById.get(senderId) : null;
      const deletedById = message.deletedById?._id?.toString?.() || message.deletedById?.toString?.();
      const deletedBy = deletedById ? personById.get(deletedById) : null;
      const delivery = getMessageDeliveryMetadata(message, request, currentUserId);
      const replySource = message.replyToMessageId ? requestMessageById.get(String(message.replyToMessageId)) : null;
      const replySenderId = replySource
        ? replySource.senderId?._id?.toString?.() || replySource.senderId?.toString?.()
        : null;
      const replySender = replySenderId ? personById.get(replySenderId) : null;
      const reactionsMap = new Map();

      for (const reaction of ensureArray(message.reactions)) {
        const emoji = String(reaction.emoji || "").trim();
        if (!emoji) {
          continue;
        }

        const reactedUserId = toIdString(reaction.userId);
        const current = reactionsMap.get(emoji) || {
          emoji,
          count: 0,
          reactedByCurrentUser: false
        };
        current.count += 1;
        if (reactedUserId && reactedUserId === currentUserId) {
          current.reactedByCurrentUser = true;
        }
        reactionsMap.set(emoji, current);
      }

      const attachments = ensureArray(message.attachments).map((attachment) => ({
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType || "",
        size: attachment.size || 0,
        isEncrypted: attachment.isEncrypted === true,
        encryptionVersion: attachment.encryptionVersion || "",
        encryptionAlgorithm: attachment.encryptionAlgorithm || "",
        encryptionIv: attachment.encryptionIv || "",
        originalMimeType: attachment.originalMimeType || "",
        originalName: attachment.originalName || "",
        isImage:
          attachment.isEncrypted === true
            ? false
            : String(attachment.mimeType || "").startsWith("image/") || String(attachment.url || "").startsWith("data:image/")
      }));

      return {
        _id: message._id,
        clientId: message.clientId || null,
        content: message.deletedAt ? "Message deleted" : message.content,
        sentAt: message.sentAt || request.createdAt,
        editedAt: message.editedAt || null,
        deletedAt: message.deletedAt || null,
        deletedBy: deletedBy || null,
        sender: sender || null,
        delivery,
        replyTo: replySource
          ? {
              messageId: replySource._id,
              content: replySource.deletedAt ? "Message deleted" : replySource.content || "Attachment",
              senderName: replySender?.name || "Member"
            }
          : null,
        attachments,
        reactions: Array.from(reactionsMap.values())
      };
    });

    const typingUserIds = (request.typingMembers || [])
      .filter((entry) => {
        if (!entry?.startedAt) {
          return false;
        }
        return Date.now() - new Date(entry.startedAt).getTime() <= 10000;
      })
      .map((entry) => toIdString(entry.userId))
      .filter((userId) => userId && userId !== currentUserId);

    if (request.conversationType === "group") {
      return {
        _id: request._id,
        conversationType: "group",
        groupName: request.groupName,
        status: request.status || "active",
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        message: request.message || "",
        messages,
        members: (request.memberIds || [])
          .map((member) => {
            const memberId = member._id.toString();
            const person = personById.get(memberId);
            if (!person) return null;

            const muteEntry = mutedMemberMap.get(memberId);

            return {
              ...person,
              role: memberRoleMap.get(memberId) || "member",
              mutedUntil: muteEntry?.mutedUntil || null,
              mutedBy: muteEntry?.mutedById ? personById.get(toIdString(muteEntry.mutedById)) || null : null
            };
          })
          .filter(Boolean),
        admins: (request.adminIds || []).map((admin) => personById.get(admin._id.toString())).filter(Boolean),
        moderators: (request.memberIds || [])
          .map((member) => {
            const memberId = member._id.toString();
            if (memberRoleMap.get(memberId) !== "moderator") {
              return null;
            }

            return personById.get(memberId) || null;
          })
          .filter(Boolean),
        currentUserRole: currentUserId ? getGroupRole(request, currentUserId) : null,
        typingUserIds,
        e2ee: {
          version: E2EE_CONVERSATION_KEY_VERSION,
          participantKeys: participantKeyRegistry,
          envelopes: conversationKeyEnvelopes
        }
      };
    }

    return {
      _id: request._id,
      conversationType: "direct",
      message: request.message,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      messages,
      typingUserIds,
      requester: enrichPersonWithProfile(request.requesterId, profileByUserId, e2eeKeyByUserId),
      mentor: enrichPersonWithProfile(request.mentorId, profileByUserId, e2eeKeyByUserId),
      e2ee: {
        version: E2EE_CONVERSATION_KEY_VERSION,
        participantKeys: participantKeyRegistry,
        envelopes: conversationKeyEnvelopes
      }
    };
  });
}

router.put(
  "/e2ee/public-key",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateBody(validateE2eePublicKeyBody),
  async (req, res, next) => {
    try {
      const { User } = getTenantModels(req);
      const publicKey = sanitizeE2eePublicKey(req.body.publicKey);
      const algorithm = String(req.body.algorithm || "RSA-OAEP").trim().slice(0, 120) || "RSA-OAEP";

      const updated = await User.findByIdAndUpdate(
        req.user._id,
        {
          e2eePublicKey: publicKey,
          e2eeKeyAlgorithm: algorithm,
          e2eeKeyUpdatedAt: new Date()
        },
        {
          new: true,
          runValidators: true
        }
      ).select("_id e2eePublicKey e2eeKeyAlgorithm e2eeKeyUpdatedAt");

      if (!updated) {
        const error = new Error("Unable to update encryption key");
        error.statusCode = 404;
        throw error;
      }

      res.json({
        userId: updated._id,
        publicKey: updated.e2eePublicKey,
        algorithm: updated.e2eeKeyAlgorithm,
        updatedAt: updated.e2eeKeyUpdatedAt
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/e2ee/envelopes",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMentorshipParams),
  validateBody(validateE2eeEnvelopeSyncBody),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);
      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        $or: [
          { conversationType: "group", memberIds: req.user._id },
          { conversationType: { $ne: "group" }, requesterId: req.user._id },
          { conversationType: { $ne: "group" }, mentorId: req.user._id }
        ]
      });

      if (!mentorshipRequest) {
        const error = new Error("Mentorship conversation not found");
        error.statusCode = 404;
        throw error;
      }

      const participantIds = new Set(getConversationParticipantIds(mentorshipRequest));
      const envelopes = normalizeConversationKeyEnvelopes(req.body.envelopes);

      if (!envelopes.length) {
        const error = new Error("No valid envelopes were provided");
        error.statusCode = 400;
        throw error;
      }

      for (const envelope of envelopes) {
        if (!participantIds.has(String(envelope.userId))) {
          const error = new Error("Envelope user must be a conversation participant");
          error.statusCode = 400;
          throw error;
        }

        upsertConversationKeyEnvelope(mentorshipRequest, envelope);
      }

      await mentorshipRequest.save();

      res.json({
        requestId: mentorshipRequest._id,
        updatedCount: envelopes.length
      });

      emitMentorshipRealtimeEvent(req, {
        type: "conversation:e2ee",
        conversationId: mentorshipRequest._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/", protect, authorize("alumni"), requireTenantAccess, async (req, res, next) => {
  try {
    const { MentorshipRequest } = getTenantModels(req);
    const requests = await MentorshipRequest.find({
      instituteId: req.tenant._id,
      $or: [
        { conversationType: "group", memberIds: req.user._id },
        { conversationType: { $ne: "group" }, requesterId: req.user._id },
        { conversationType: { $ne: "group" }, mentorId: req.user._id }
      ]
    })
      .populate("requesterId", "name email")
      .populate("mentorId", "name email")
      .populate("memberIds", "name email")
      .populate("adminIds", "name email")
      .populate("memberRoles.userId", "name email")
      .populate("mutedMembers.userId", "name email")
      .populate("mutedMembers.mutedById", "name email")
      .populate("messages.senderId", "name email")
      .populate("messages.deletedById", "name email")
      .sort({ updatedAt: -1, createdAt: -1 });

    const currentUserId = req.user._id.toString();
    const typingThresholdMs = 10000;

    for (const request of requests) {
      let hasChanges = false;

      const activeTypingMembers = (request.typingMembers || []).filter((entry) => {
        if (!entry?.startedAt) {
          return false;
        }
        return Date.now() - new Date(entry.startedAt).getTime() <= typingThresholdMs;
      });

      if (activeTypingMembers.length !== (request.typingMembers || []).length) {
        request.typingMembers = activeTypingMembers;
        hasChanges = true;
      }

      for (const message of request.messages || []) {
        if (toIdString(message.senderId) === currentUserId || message.deletedAt) {
          continue;
        }

        const nextDeliveredTo = pushUserId(message.deliveredTo, req.user._id);
        if (nextDeliveredTo.length !== ensureArray(message.deliveredTo).length) {
          message.deliveredTo = nextDeliveredTo;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await request.save();
      }
    }

    res.json(await formatMentorshipRequestsWithProfiles(requests, getTenantModels(req), currentUserId));
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateBody(validateCreateMentorshipBody),
  async (req, res, next) => {
    try {
      const { AlumniProfile, MentorshipRequest, User } = getTenantModels(req);
      const recipientUserId = req.body.recipientUserId || req.body.mentorUserId;
      const { message } = req.body;

      if (!recipientUserId || !message?.trim()) {
        const error = new Error("Recipient and message are required");
        error.statusCode = 400;
        throw error;
      }

      if (recipientUserId === req.user._id.toString()) {
        const error = new Error("You cannot start a chat with yourself");
        error.statusCode = 400;
        throw error;
      }

      const mentor = await User.findOne({
        _id: recipientUserId,
        instituteId: req.tenant._id,
        role: "alumni",
        isActive: true
      });

      if (!mentor) {
        const error = new Error("Selected alumni was not found");
        error.statusCode = 404;
        throw error;
      }

      const existingRequest = await MentorshipRequest.findOne({
        instituteId: req.tenant._id,
        conversationType: "direct",
        requesterId: req.user._id,
        mentorId: mentor._id,
        status: "pending"
      });

      if (existingRequest) {
        const error = new Error("A pending chat request already exists for this alumni");
        error.statusCode = 409;
        throw error;
      }

      const mentorshipRequest = await MentorshipRequest.create({
        instituteId: req.tenant._id,
        conversationType: "direct",
        requesterId: req.user._id,
        mentorId: mentor._id,
        message: message.trim(),
        messages: [
          {
            senderId: req.user._id,
            content: message.trim(),
            sentAt: new Date(),
            deliveredTo: [req.user._id],
            readBy: [req.user._id]
          }
        ]
      });

      await mentorshipRequest.populate("requesterId", "name email");
      await mentorshipRequest.populate("mentorId", "name email");
      await mentorshipRequest.populate("messages.senderId", "name email");
      await mentorshipRequest.populate("messages.deletedById", "name email");
      const [formatted] = await formatMentorshipRequestsWithProfiles([mentorshipRequest], getTenantModels(req), req.user._id.toString());
      res.status(201).json(formatted);

      const requesterProfile = await AlumniProfile.findOne({ userId: req.user._id });

      await sendConnectionRequestEmail({
        recipientEmail: mentor.email,
        recipientName: mentor.name,
        requesterName: req.user.name,
        requesterEmail: req.user.email,
        requesterProfile: {
          company: requesterProfile?.company,
          designation: requesterProfile?.designation,
          batch: requesterProfile?.batch,
          department: requesterProfile?.department,
          location: requesterProfile?.location
        },
        message: message.trim()
      }).catch((err) => {
        console.error("Failed to send connection request email:", err);
      });

      await createNotification(getTenantModels(req), {
        instituteId: req.tenant._id,
        userId: mentor._id,
        actorUserId: req.user._id,
        category: "connections",
        type: "mentorship_request",
        title: `${req.user.name} sent you a connection request`,
        message: message.trim(),
        entityType: "MentorshipRequest",
        entityId: mentorshipRequest._id,
        linkTo: "/portal/notifications",
        metadata: {
          requesterId: req.user._id.toString()
        }
      });

      await logAuditEvent(req, {
        action: "mentorship.request_created",
        targetType: "MentorshipRequest",
        targetId: mentorshipRequest._id.toString(),
        instituteId: req.tenant._id,
        metadata: {
          mentorId: mentorshipRequest.mentorId._id?.toString?.() || mentorshipRequest.mentorId.toString(),
          requesterId: mentorshipRequest.requesterId._id?.toString?.() || mentorshipRequest.requesterId.toString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/groups",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateBody(validateCreateGroupBody),
  async (req, res, next) => {
    try {
      const { MentorshipRequest, User } = getTenantModels(req);
      const groupName = req.body.groupName?.trim?.();
      const initialMessage = req.body.initialMessage?.trim?.() || "";
      const requestedMemberIds = [...new Set((req.body.memberUserIds || []).map((id) => String(id)))];
      const memberIds = [...new Set([req.user._id.toString(), ...requestedMemberIds])];

      const members = await User.find({
        _id: { $in: memberIds },
        instituteId: req.tenant._id,
        role: "alumni",
        isActive: true
      });

      if (members.length !== memberIds.length) {
        const error = new Error("One or more selected members are invalid");
        error.statusCode = 400;
        throw error;
      }

      const groupConversation = await MentorshipRequest.create({
        instituteId: req.tenant._id,
        conversationType: "group",
        groupName,
        memberIds,
        adminIds: [req.user._id],
        memberRoles: memberIds.map((id) => ({
          userId: id,
          role: String(id) === req.user._id.toString() ? "admin" : "member"
        })),
        message: initialMessage || `${req.user.name} created the group`,
        status: "active",
        messages: initialMessage
          ? [
              {
                senderId: req.user._id,
                content: initialMessage,
                sentAt: new Date(),
                deliveredTo: [req.user._id],
                readBy: [req.user._id]
              }
            ]
          : []
      });

      await groupConversation.populate("memberIds", "name email");
      await groupConversation.populate("adminIds", "name email");
      await groupConversation.populate("memberRoles.userId", "name email");
      await groupConversation.populate("mutedMembers.userId", "name email");
      await groupConversation.populate("mutedMembers.mutedById", "name email");
      await groupConversation.populate("messages.senderId", "name email");
      await groupConversation.populate("messages.deletedById", "name email");
      const [formatted] = await formatMentorshipRequestsWithProfiles([groupConversation], getTenantModels(req), req.user._id.toString());
      res.status(201).json(formatted);

      await logAuditEvent(req, {
        action: "mentorship.group_created",
        targetType: "MentorshipRequest",
        targetId: groupConversation._id.toString(),
        instituteId: req.tenant._id,
        metadata: {
          groupName,
          memberCount: memberIds.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMentorshipParams),
  validateBody(validateMentorshipUpdateBody),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);
      const { status } = req.body;

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        conversationType: { $ne: "group" },
        mentorId: req.user._id
      })
        .populate("requesterId", "name email")
        .populate("mentorId", "name email")
        .populate("messages.senderId", "name email")
        .populate("messages.deletedById", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Mentorship request not found");
        error.statusCode = 404;
        throw error;
      }

      mentorshipRequest.status = status;
      await mentorshipRequest.save();
      const [formatted] = await formatMentorshipRequestsWithProfiles([mentorshipRequest], getTenantModels(req), req.user._id.toString());
      res.json(formatted);

      emitMentorshipRealtimeEvent(req, {
        type: "conversation:status",
        conversationId: mentorshipRequest._id.toString()
      });

      await createNotification(getTenantModels(req), {
        instituteId: req.tenant._id,
        userId: mentorshipRequest.requesterId._id?.toString?.() || mentorshipRequest.requesterId,
        actorUserId: req.user._id,
        category: "connections",
        type: `mentorship_${status}`,
        title: status === "accepted" ? `${req.user.name} accepted your request` : `${req.user.name} declined your request`,
        message: status === "accepted" ? "Your conversation is now open." : "This request was declined.",
        entityType: "MentorshipRequest",
        entityId: mentorshipRequest._id,
        linkTo: "/portal/notifications",
        metadata: {
          status
        }
      });

      await logAuditEvent(req, {
        action: `mentorship.request_${status}`,
        targetType: "MentorshipRequest",
        targetId: mentorshipRequest._id.toString(),
        instituteId: req.tenant._id,
        metadata: {
          requesterId: mentorshipRequest.requesterId._id?.toString?.() || mentorshipRequest.requesterId.toString(),
          mentorId: mentorshipRequest.mentorId._id?.toString?.() || mentorshipRequest.mentorId.toString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/messages",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMentorshipParams),
  validateBody(validateMentorshipMessageBody),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);
      const content = req.body.content?.trim?.() || "";
      const clientId = req.body.clientId?.trim?.() || null;
      const replyToMessageId = req.body.replyToMessageId || null;
      const incomingAttachments = sanitizeAttachments(req.body.attachments);
      const normalizedContent = content;

      if (!normalizedContent && !incomingAttachments.length) {
        const error = new Error("Message content or attachments are required");
        error.statusCode = 400;
        throw error;
      }

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        $or: [
          { conversationType: "group", memberIds: req.user._id },
          { conversationType: { $ne: "group" }, requesterId: req.user._id },
          { conversationType: { $ne: "group" }, mentorId: req.user._id }
        ]
      })
        .populate("requesterId", "name email")
        .populate("mentorId", "name email")
        .populate("memberIds", "name email")
        .populate("adminIds", "name email")
        .populate("memberRoles.userId", "name email")
        .populate("mutedMembers.userId", "name email")
        .populate("mutedMembers.mutedById", "name email")
        .populate("messages.senderId", "name email")
        .populate("messages.deletedById", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Mentorship conversation not found");
        error.statusCode = 404;
        throw error;
      }

      if (replyToMessageId) {
        const replyTarget = (mentorshipRequest.messages || []).id(replyToMessageId);
        if (!replyTarget) {
          const error = new Error("Reply target message not found");
          error.statusCode = 404;
          throw error;
        }
      }

      if (clientId) {
        const existingMessage = (mentorshipRequest.messages || []).find(
          (message) => message.clientId === clientId && toIdString(message.senderId) === req.user._id.toString()
        );

        if (existingMessage) {
          const [formattedExisting] = await formatMentorshipRequestsWithProfiles(
            [mentorshipRequest],
            getTenantModels(req),
            req.user._id.toString()
          );
          const existingFormattedMessage = (formattedExisting.messages || []).find(
            (message) => String(message._id) === String(existingMessage._id)
          );

          res.status(200).json({
            requestId: formattedExisting._id,
            message: existingFormattedMessage || null
          });
          return;
        }
      }

      if (mentorshipRequest.conversationType !== "group") {
        if (mentorshipRequest.status === "declined") {
          const error = new Error("This mentorship request has been declined");
          error.statusCode = 400;
          throw error;
        }

        if (mentorshipRequest.status === "pending") {
          const error = new Error("Wait for the recipient to accept this chat request before sending more messages");
          error.statusCode = 403;
          throw error;
        }
      } else {
        purgeExpiredMutes(mentorshipRequest);
        const activeMute = getActiveMute(mentorshipRequest, req.user._id);

        if (activeMute) {
          const error = new Error(`You are muted until ${new Date(activeMute.mutedUntil).toLocaleString()}`);
          error.statusCode = 403;
          throw error;
        }
      }

      const attachments = await persistMentorshipAttachments(incomingAttachments, {
        tenantId: req.tenant._id,
        conversationId: mentorshipRequest._id
      });

      mentorshipRequest.typingMembers = (mentorshipRequest.typingMembers || []).filter(
        (entry) => toIdString(entry.userId) !== req.user._id.toString()
      );

      mentorshipRequest.messages.push({
        clientId,
        senderId: req.user._id,
        content: normalizedContent,
        replyToMessageId,
        attachments,
        sentAt: new Date(),
        deliveredTo: [req.user._id],
        readBy: [req.user._id]
      });
      mentorshipRequest.message = normalizedContent || "Shared an attachment";
      await mentorshipRequest.save();
      const [formatted] = await formatMentorshipRequestsWithProfiles([mentorshipRequest], getTenantModels(req), req.user._id.toString());
      const latestMessage = formatted.messages[formatted.messages.length - 1] || null;

      res.status(201).json({
        requestId: formatted._id,
        message: latestMessage
      });

      emitMentorshipRealtimeEvent(req, {
        type: "message:new",
        conversationId: mentorshipRequest._id.toString()
      });

      if (mentorshipRequest.conversationType !== "group") {
        const recipientId = mentorshipRequest.requesterId._id?.toString?.() === req.user._id.toString()
          ? mentorshipRequest.mentorId._id?.toString?.() || mentorshipRequest.mentorId
          : mentorshipRequest.requesterId._id?.toString?.() || mentorshipRequest.requesterId;

        await createNotification(getTenantModels(req), {
          instituteId: req.tenant._id,
          userId: recipientId,
          actorUserId: req.user._id,
          category: "connections",
          type: "mentorship_message",
          title: `${req.user.name} sent you a new message`,
          message: normalizedContent || "Sent an attachment",
          entityType: "MentorshipRequest",
          entityId: mentorshipRequest._id,
          linkTo: "/portal/notifications",
          metadata: {
            conversationType: mentorshipRequest.conversationType
          }
        });
      }

      await logAuditEvent(req, {
        action: mentorshipRequest.conversationType === "group" ? "mentorship.group_message_sent" : "mentorship.message_sent",
        targetType: "MentorshipRequest",
        targetId: mentorshipRequest._id.toString(),
        instituteId: req.tenant._id,
        metadata: {
          senderId: req.user._id.toString(),
          status: mentorshipRequest.status,
          conversationType: mentorshipRequest.conversationType
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/uploads",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  attachmentUpload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        const error = new Error("Attachment file is required");
        error.statusCode = 400;
        throw error;
      }

      if (!allowedAttachmentMimeTypes.has(req.file.mimetype)) {
        const error = new Error("Unsupported attachment type");
        error.statusCode = 400;
        throw error;
      }

      const uploadedAttachment = await storeIncomingUpload({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        tenantId: req.tenant._id,
        userId: req.user._id
      });

      res.status(201).json(uploadedAttachment);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/read",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMentorshipParams),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        $or: [
          { conversationType: "group", memberIds: req.user._id },
          { conversationType: { $ne: "group" }, requesterId: req.user._id },
          { conversationType: { $ne: "group" }, mentorId: req.user._id }
        ]
      });

      if (!mentorshipRequest) {
        const error = new Error("Mentorship conversation not found");
        error.statusCode = 404;
        throw error;
      }

      let readCount = 0;
      for (const message of mentorshipRequest.messages || []) {
        if (message.deletedAt || toIdString(message.senderId) === req.user._id.toString()) {
          continue;
        }

        const nextDeliveredTo = pushUserId(message.deliveredTo, req.user._id);
        if (nextDeliveredTo.length !== ensureArray(message.deliveredTo).length) {
          message.deliveredTo = nextDeliveredTo;
        }

        const nextReadBy = pushUserId(message.readBy, req.user._id);
        if (nextReadBy.length !== ensureArray(message.readBy).length) {
          message.readBy = nextReadBy;
          readCount += 1;
        }
      }

      mentorshipRequest.typingMembers = (mentorshipRequest.typingMembers || []).filter(
        (entry) => toIdString(entry.userId) !== req.user._id.toString()
      );

      await mentorshipRequest.save();

      res.json({
        requestId: mentorshipRequest._id,
        readCount
      });

      if (readCount > 0) {
        emitMentorshipRealtimeEvent(req, {
          type: "conversation:read",
          conversationId: mentorshipRequest._id.toString()
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/typing",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMentorshipParams),
  validateBody(validateTypingBody),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);
      const { isTyping } = req.body;

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        $or: [
          { conversationType: "group", memberIds: req.user._id },
          { conversationType: { $ne: "group" }, requesterId: req.user._id },
          { conversationType: { $ne: "group" }, mentorId: req.user._id }
        ]
      });

      if (!mentorshipRequest) {
        const error = new Error("Mentorship conversation not found");
        error.statusCode = 404;
        throw error;
      }

      const userId = req.user._id.toString();
      const activeTypingMembers = (mentorshipRequest.typingMembers || []).filter((entry) => {
        if (!entry?.startedAt) {
          return false;
        }
        return Date.now() - new Date(entry.startedAt).getTime() <= 10000;
      });

      const existingEntry = activeTypingMembers.find((entry) => toIdString(entry.userId) === userId);

      if (isTyping) {
        if (existingEntry) {
          existingEntry.startedAt = new Date();
        } else {
          activeTypingMembers.push({ userId: req.user._id, startedAt: new Date() });
        }
      } else {
        mentorshipRequest.typingMembers = activeTypingMembers.filter((entry) => toIdString(entry.userId) !== userId);
        await mentorshipRequest.save();
        res.json({ requestId: mentorshipRequest._id, isTyping: false });
        emitMentorshipRealtimeEvent(req, {
          type: "conversation:typing",
          conversationId: mentorshipRequest._id.toString()
        });
        return;
      }

      mentorshipRequest.typingMembers = activeTypingMembers;
      await mentorshipRequest.save();

      res.json({ requestId: mentorshipRequest._id, isTyping: true });
      emitMentorshipRealtimeEvent(req, {
        type: "conversation:typing",
        conversationId: mentorshipRequest._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/messages/:messageId/reactions",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMessageActionParams),
  validateBody(validateReactionBody),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);
      const emoji = String(req.body.emoji || "").trim();

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        $or: [
          { conversationType: "group", memberIds: req.user._id },
          { conversationType: { $ne: "group" }, requesterId: req.user._id },
          { conversationType: { $ne: "group" }, mentorId: req.user._id }
        ]
      })
        .populate("requesterId", "name email")
        .populate("mentorId", "name email")
        .populate("memberIds", "name email")
        .populate("adminIds", "name email")
        .populate("memberRoles.userId", "name email")
        .populate("mutedMembers.userId", "name email")
        .populate("mutedMembers.mutedById", "name email")
        .populate("messages.senderId", "name email")
        .populate("messages.deletedById", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Mentorship conversation not found");
        error.statusCode = 404;
        throw error;
      }

      const targetMessage = (mentorshipRequest.messages || []).id(req.params.messageId);
      if (!targetMessage) {
        const error = new Error("Message not found");
        error.statusCode = 404;
        throw error;
      }

      if (targetMessage.deletedAt) {
        const error = new Error("Cannot react to deleted messages");
        error.statusCode = 400;
        throw error;
      }

      const actorId = req.user._id.toString();
      const existingReaction = ensureArray(targetMessage.reactions).find(
        (reaction) => toIdString(reaction.userId) === actorId
      );

      if (existingReaction && existingReaction.emoji === emoji) {
        targetMessage.reactions = ensureArray(targetMessage.reactions).filter(
          (reaction) => !(toIdString(reaction.userId) === actorId && reaction.emoji === emoji)
        );
      } else if (existingReaction) {
        existingReaction.emoji = emoji;
      } else {
        targetMessage.reactions.push({ userId: req.user._id, emoji });
      }

      await mentorshipRequest.save();

      const [formatted] = await formatMentorshipRequestsWithProfiles(
        [mentorshipRequest],
        getTenantModels(req),
        req.user._id.toString()
      );
      const updatedMessage = (formatted.messages || []).find((message) => String(message._id) === req.params.messageId);

      res.json({
        requestId: formatted._id,
        message: updatedMessage || null
      });

      emitMentorshipRealtimeEvent(req, {
        type: "message:reaction",
        conversationId: mentorshipRequest._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/messages/:messageId",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMessageActionParams),
  validateBody(validateMessageUpdateBody),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);
      const content = req.body.content?.trim?.();

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        $or: [
          { conversationType: "group", memberIds: req.user._id },
          { conversationType: { $ne: "group" }, requesterId: req.user._id },
          { conversationType: { $ne: "group" }, mentorId: req.user._id }
        ]
      })
        .populate("requesterId", "name email")
        .populate("mentorId", "name email")
        .populate("memberIds", "name email")
        .populate("adminIds", "name email")
        .populate("memberRoles.userId", "name email")
        .populate("mutedMembers.userId", "name email")
        .populate("mutedMembers.mutedById", "name email")
        .populate("messages.senderId", "name email")
        .populate("messages.deletedById", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Mentorship conversation not found");
        error.statusCode = 404;
        throw error;
      }

      const targetMessage = (mentorshipRequest.messages || []).id(req.params.messageId);

      if (!targetMessage) {
        const error = new Error("Message not found");
        error.statusCode = 404;
        throw error;
      }

      if (toIdString(targetMessage.senderId) !== req.user._id.toString()) {
        const error = new Error("You can edit only your own messages");
        error.statusCode = 403;
        throw error;
      }

      if (targetMessage.deletedAt) {
        const error = new Error("Deleted messages cannot be edited");
        error.statusCode = 400;
        throw error;
      }

      targetMessage.content = content;
      targetMessage.editedAt = new Date();
      mentorshipRequest.message = content;
      await mentorshipRequest.save();

      const [formatted] = await formatMentorshipRequestsWithProfiles(
        [mentorshipRequest],
        getTenantModels(req),
        req.user._id.toString()
      );
      const updatedMessage = (formatted.messages || []).find((message) => String(message._id) === req.params.messageId);

      res.json({
        requestId: formatted._id,
        message: updatedMessage || null
      });

      emitMentorshipRealtimeEvent(req, {
        type: "message:edit",
        conversationId: mentorshipRequest._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id/messages/:messageId",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMessageActionParams),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        $or: [
          { conversationType: "group", memberIds: req.user._id },
          { conversationType: { $ne: "group" }, requesterId: req.user._id },
          { conversationType: { $ne: "group" }, mentorId: req.user._id }
        ]
      })
        .populate("requesterId", "name email")
        .populate("mentorId", "name email")
        .populate("memberIds", "name email")
        .populate("adminIds", "name email")
        .populate("memberRoles.userId", "name email")
        .populate("mutedMembers.userId", "name email")
        .populate("mutedMembers.mutedById", "name email")
        .populate("messages.senderId", "name email")
        .populate("messages.deletedById", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Mentorship conversation not found");
        error.statusCode = 404;
        throw error;
      }

      const targetMessage = (mentorshipRequest.messages || []).id(req.params.messageId);

      if (!targetMessage) {
        const error = new Error("Message not found");
        error.statusCode = 404;
        throw error;
      }

      const isSender = toIdString(targetMessage.senderId) === req.user._id.toString();
      const role = mentorshipRequest.conversationType === "group" ? getGroupRole(mentorshipRequest, req.user._id) : "member";
      const canModerateGroupMessage = mentorshipRequest.conversationType === "group" && ["admin", "moderator"].includes(role);

      if (!isSender && !canModerateGroupMessage) {
        const error = new Error("You are not allowed to delete this message");
        error.statusCode = 403;
        throw error;
      }

      if (!targetMessage.deletedAt) {
        targetMessage.deletedAt = new Date();
        targetMessage.deletedById = req.user._id;
        targetMessage.content = "Message deleted";
      }

      const latestVisibleMessage = [...(mentorshipRequest.messages || [])]
        .reverse()
        .find((message) => !message.deletedAt && String(message._id) !== req.params.messageId);
      mentorshipRequest.message = latestVisibleMessage?.content || "";

      await mentorshipRequest.save();
      const [formatted] = await formatMentorshipRequestsWithProfiles(
        [mentorshipRequest],
        getTenantModels(req),
        req.user._id.toString()
      );
      const updatedMessage = (formatted.messages || []).find((message) => String(message._id) === req.params.messageId);

      res.json({
        requestId: formatted._id,
        message: updatedMessage || null
      });

      emitMentorshipRealtimeEvent(req, {
        type: "message:delete",
        conversationId: mentorshipRequest._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/members/:userId/role",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMemberActionParams),
  validateBody(validateMemberRoleBody),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);
      const targetUserId = req.params.userId;
      const role = req.body.role;

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        conversationType: "group",
        memberIds: req.user._id
      })
        .populate("memberIds", "name email")
        .populate("adminIds", "name email")
        .populate("memberRoles.userId", "name email")
        .populate("mutedMembers.userId", "name email")
        .populate("mutedMembers.mutedById", "name email")
        .populate("messages.senderId", "name email")
        .populate("messages.deletedById", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Group conversation not found");
        error.statusCode = 404;
        throw error;
      }

      const actorRole = getGroupRole(mentorshipRequest, req.user._id);
      if (actorRole !== "admin") {
        const error = new Error("Only group admins can change member roles");
        error.statusCode = 403;
        throw error;
      }

      const isTargetMember = (mentorshipRequest.memberIds || []).some((entry) => toIdString(entry) === targetUserId);
      if (!isTargetMember) {
        const error = new Error("Selected user is not in this group");
        error.statusCode = 404;
        throw error;
      }

      const roleEntry = (mentorshipRequest.memberRoles || []).find((entry) => toIdString(entry.userId) === targetUserId);
      if (roleEntry) {
        roleEntry.role = role;
      } else {
        mentorshipRequest.memberRoles.push({ userId: targetUserId, role });
      }

      if (targetUserId === req.user._id.toString() && role !== "admin") {
        const adminCount = (mentorshipRequest.memberRoles || []).filter((entry) => entry.role === "admin").length;
        if (adminCount < 1) {
          const error = new Error("The group must have at least one admin");
          error.statusCode = 400;
          throw error;
        }
      }

      syncGroupAdminsFromRoles(mentorshipRequest);
      mentorshipRequest.message = `${req.user.name} updated a member role`;
      await mentorshipRequest.save();

      const [formatted] = await formatMentorshipRequestsWithProfiles(
        [mentorshipRequest],
        getTenantModels(req),
        req.user._id.toString()
      );
      res.json(formatted);

      emitMentorshipRealtimeEvent(req, {
        type: "conversation:members",
        conversationId: mentorshipRequest._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/members/:userId/mute",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMemberActionParams),
  validateBody(validateMuteBody),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);
      const targetUserId = req.params.userId;
      const minutes = Number(req.body.minutes);

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        conversationType: "group",
        memberIds: req.user._id
      })
        .populate("memberIds", "name email")
        .populate("adminIds", "name email")
        .populate("memberRoles.userId", "name email")
        .populate("mutedMembers.userId", "name email")
        .populate("mutedMembers.mutedById", "name email")
        .populate("messages.senderId", "name email")
        .populate("messages.deletedById", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Group conversation not found");
        error.statusCode = 404;
        throw error;
      }

      const actorRole = getGroupRole(mentorshipRequest, req.user._id);
      if (!["admin", "moderator"].includes(actorRole)) {
        const error = new Error("Only group admins or moderators can mute members");
        error.statusCode = 403;
        throw error;
      }

      if (targetUserId === req.user._id.toString()) {
        const error = new Error("You cannot mute yourself");
        error.statusCode = 400;
        throw error;
      }

      const targetRole = getGroupRole(mentorshipRequest, targetUserId);
      if (actorRole === "moderator" && ["admin", "moderator"].includes(targetRole)) {
        const error = new Error("Moderators can only mute regular members");
        error.statusCode = 403;
        throw error;
      }

      const isTargetMember = (mentorshipRequest.memberIds || []).some((entry) => toIdString(entry) === targetUserId);
      if (!isTargetMember) {
        const error = new Error("Selected user is not in this group");
        error.statusCode = 404;
        throw error;
      }

      purgeExpiredMutes(mentorshipRequest);

      const mutedUntil = new Date(Date.now() + minutes * 60 * 1000);
      const muteEntry = (mentorshipRequest.mutedMembers || []).find((entry) => toIdString(entry.userId) === targetUserId);
      if (muteEntry) {
        muteEntry.mutedUntil = mutedUntil;
        muteEntry.mutedById = req.user._id;
      } else {
        mentorshipRequest.mutedMembers.push({
          userId: targetUserId,
          mutedUntil,
          mutedById: req.user._id
        });
      }

      mentorshipRequest.message = `${req.user.name} muted a member`;
      await mentorshipRequest.save();

      const [formatted] = await formatMentorshipRequestsWithProfiles(
        [mentorshipRequest],
        getTenantModels(req),
        req.user._id.toString()
      );
      res.json(formatted);

      emitMentorshipRealtimeEvent(req, {
        type: "conversation:members",
        conversationId: mentorshipRequest._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id/members/:userId/mute",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMemberActionParams),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);
      const targetUserId = req.params.userId;

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        conversationType: "group",
        memberIds: req.user._id
      })
        .populate("memberIds", "name email")
        .populate("adminIds", "name email")
        .populate("memberRoles.userId", "name email")
        .populate("mutedMembers.userId", "name email")
        .populate("mutedMembers.mutedById", "name email")
        .populate("messages.senderId", "name email")
        .populate("messages.deletedById", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Group conversation not found");
        error.statusCode = 404;
        throw error;
      }

      const actorRole = getGroupRole(mentorshipRequest, req.user._id);
      if (!["admin", "moderator"].includes(actorRole)) {
        const error = new Error("Only group admins or moderators can unmute members");
        error.statusCode = 403;
        throw error;
      }

      mentorshipRequest.mutedMembers = (mentorshipRequest.mutedMembers || []).filter(
        (entry) => toIdString(entry.userId) !== targetUserId
      );

      mentorshipRequest.message = `${req.user.name} unmuted a member`;
      await mentorshipRequest.save();

      const [formatted] = await formatMentorshipRequestsWithProfiles(
        [mentorshipRequest],
        getTenantModels(req),
        req.user._id.toString()
      );
      res.json(formatted);

      emitMentorshipRealtimeEvent(req, {
        type: "conversation:members",
        conversationId: mentorshipRequest._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id/members/:userId",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMemberActionParams),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);
      const targetUserId = req.params.userId;

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        conversationType: "group",
        memberIds: req.user._id
      })
        .populate("memberIds", "name email")
        .populate("adminIds", "name email")
        .populate("memberRoles.userId", "name email")
        .populate("mutedMembers.userId", "name email")
        .populate("mutedMembers.mutedById", "name email")
        .populate("messages.senderId", "name email")
        .populate("messages.deletedById", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Group conversation not found");
        error.statusCode = 404;
        throw error;
      }

      const actorRole = getGroupRole(mentorshipRequest, req.user._id);
      if (actorRole !== "admin") {
        const error = new Error("Only group admins can remove members");
        error.statusCode = 403;
        throw error;
      }

      if (targetUserId === req.user._id.toString()) {
        const error = new Error("Use leave group to remove yourself");
        error.statusCode = 400;
        throw error;
      }

      const isTargetMember = (mentorshipRequest.memberIds || []).some((entry) => toIdString(entry) === targetUserId);
      if (!isTargetMember) {
        const error = new Error("Selected user is not in this group");
        error.statusCode = 404;
        throw error;
      }

      mentorshipRequest.memberIds = (mentorshipRequest.memberIds || []).filter(
        (entry) => toIdString(entry) !== targetUserId
      );
      mentorshipRequest.memberRoles = (mentorshipRequest.memberRoles || []).filter(
        (entry) => toIdString(entry.userId) !== targetUserId
      );
      mentorshipRequest.mutedMembers = (mentorshipRequest.mutedMembers || []).filter(
        (entry) => toIdString(entry.userId) !== targetUserId
      );

      if ((mentorshipRequest.memberIds || []).length < 1) {
        const error = new Error("Group must have at least one member");
        error.statusCode = 400;
        throw error;
      }

      syncGroupAdminsFromRoles(mentorshipRequest);
      if (!mentorshipRequest.adminIds.length && mentorshipRequest.memberIds.length) {
        const fallbackAdminId = mentorshipRequest.memberIds[0];
        const fallbackRole = (mentorshipRequest.memberRoles || []).find(
          (entry) => toIdString(entry.userId) === toIdString(fallbackAdminId)
        );
        if (fallbackRole) {
          fallbackRole.role = "admin";
        } else {
          mentorshipRequest.memberRoles.push({ userId: fallbackAdminId, role: "admin" });
        }
        syncGroupAdminsFromRoles(mentorshipRequest);
      }

      mentorshipRequest.message = `${req.user.name} removed a member`;
      await mentorshipRequest.save();

      const [formatted] = await formatMentorshipRequestsWithProfiles(
        [mentorshipRequest],
        getTenantModels(req),
        req.user._id.toString()
      );
      res.json(formatted);

      emitMentorshipRealtimeEvent(req, {
        type: "conversation:members",
        conversationId: mentorshipRequest._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/leave",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMentorshipParams),
  async (req, res, next) => {
    try {
      const { MentorshipRequest } = getTenantModels(req);
      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        conversationType: "group",
        memberIds: req.user._id
      });

      if (!mentorshipRequest) {
        const error = new Error("Group conversation not found");
        error.statusCode = 404;
        throw error;
      }

      if ((mentorshipRequest.memberIds || []).length <= 1) {
        const error = new Error("You cannot leave the last remaining member in the group");
        error.statusCode = 400;
        throw error;
      }

      mentorshipRequest.memberIds = (mentorshipRequest.memberIds || []).filter(
        (memberId) => memberId.toString() !== req.user._id.toString()
      );
      mentorshipRequest.adminIds = (mentorshipRequest.adminIds || []).filter(
        (adminId) => adminId.toString() !== req.user._id.toString()
      );
      mentorshipRequest.memberRoles = (mentorshipRequest.memberRoles || []).filter(
        (entry) => toIdString(entry.userId) !== req.user._id.toString()
      );
      mentorshipRequest.mutedMembers = (mentorshipRequest.mutedMembers || []).filter(
        (entry) => toIdString(entry.userId) !== req.user._id.toString()
      );

      if (!mentorshipRequest.adminIds.length && mentorshipRequest.memberIds.length) {
        const fallbackAdminId = mentorshipRequest.memberIds[0];
        const fallbackRole = (mentorshipRequest.memberRoles || []).find(
          (entry) => toIdString(entry.userId) === toIdString(fallbackAdminId)
        );

        if (fallbackRole) {
          fallbackRole.role = "admin";
        } else {
          mentorshipRequest.memberRoles.push({ userId: fallbackAdminId, role: "admin" });
        }

        syncGroupAdminsFromRoles(mentorshipRequest);
      }

      mentorshipRequest.message = `${req.user.name} left the group`;
      await mentorshipRequest.save();

      res.json({
        message: "You left the group successfully",
        conversationId: mentorshipRequest._id
      });

      emitMentorshipRealtimeEvent(req, {
        type: "conversation:members",
        conversationId: mentorshipRequest._id.toString()
      });

      await logAuditEvent(req, {
        action: "mentorship.group_left",
        targetType: "MentorshipRequest",
        targetId: mentorshipRequest._id.toString(),
        instituteId: req.tenant._id,
        metadata: {
          userId: req.user._id.toString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

