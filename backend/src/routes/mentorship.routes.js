import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { logAuditEvent } from "../utils/audit.js";
import { sendConnectionRequestEmail } from "../utils/email.js";
import { hasMinLength, isObjectIdLike, isNonEmptyString } from "../utils/validation.js";

const router = express.Router();

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
  return hasMinLength(body.content, 1) ? [] : ["Message content is required"];
}

function enrichPersonWithProfile(person, profileByUserId) {
  if (!person) return null;

  const profile = profileByUserId.get(person._id.toString());

  return {
    _id: person._id,
    name: person.name,
    email: person.email,
    batch: profile?.batch,
    department: profile?.department,
    company: profile?.company,
    designation: profile?.designation,
    location: profile?.location
  };
}

function getConversationUserIds(request) {
  if (request.conversationType === "group") {
    const memberIds = (request.memberIds || []).map((member) => member?._id?.toString?.() || member?.toString?.());
    const adminIds = (request.adminIds || []).map((admin) => admin?._id?.toString?.() || admin?.toString?.());
    const senderIds = (request.messages || []).map((message) => message.senderId?._id?.toString?.() || message.senderId?.toString?.());
    return [...memberIds, ...adminIds, ...senderIds].filter(Boolean);
  }

  return [
    request.requesterId?._id?.toString?.(),
    request.mentorId?._id?.toString?.(),
    ...(request.messages || []).map((message) => message.senderId?._id?.toString?.() || message.senderId?.toString?.())
  ].filter(Boolean);
}

async function formatMentorshipRequestsWithProfiles(requests, tenantModels) {
  const { AlumniProfile } = tenantModels;
  const userIds = [...new Set(requests.flatMap((request) => getConversationUserIds(request)))];

  const profiles = await AlumniProfile.find({ userId: { $in: userIds } }).select(
    "userId batch department company designation location"
  );

  const profileByUserId = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));
  const personById = new Map();

  for (const request of requests) {
    const people = request.conversationType === "group"
      ? [...(request.memberIds || []), ...(request.adminIds || [])]
      : [request.requesterId, request.mentorId];

    for (const person of people) {
      if (person?._id) {
        personById.set(person._id.toString(), enrichPersonWithProfile(person, profileByUserId));
      }
    }
  }

  return requests.map((request) => {
    const messages = (request.messages || []).map((message) => {
      const senderId = message.senderId?._id?.toString?.() || message.senderId?.toString?.();
      const sender = senderId ? personById.get(senderId) : null;

      return {
        _id: message._id,
        content: message.content,
        sentAt: message.sentAt || request.createdAt,
        sender: sender || null
      };
    });

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
        members: (request.memberIds || []).map((member) => personById.get(member._id.toString())).filter(Boolean),
        admins: (request.adminIds || []).map((admin) => personById.get(admin._id.toString())).filter(Boolean)
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
      requester: enrichPersonWithProfile(request.requesterId, profileByUserId),
      mentor: enrichPersonWithProfile(request.mentorId, profileByUserId)
    };
  });
}

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
      .populate("messages.senderId", "name email")
      .sort({ updatedAt: -1, createdAt: -1 });

    res.json(await formatMentorshipRequestsWithProfiles(requests, getTenantModels(req)));
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
            sentAt: new Date()
          }
        ]
      });

      await mentorshipRequest.populate("requesterId", "name email");
      await mentorshipRequest.populate("mentorId", "name email");
      await mentorshipRequest.populate("messages.senderId", "name email");
      const [formatted] = await formatMentorshipRequestsWithProfiles([mentorshipRequest], getTenantModels(req));
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
        message: initialMessage || `${req.user.name} created the group`,
        status: "active",
        messages: initialMessage
          ? [
              {
                senderId: req.user._id,
                content: initialMessage,
                sentAt: new Date()
              }
            ]
          : []
      });

      await groupConversation.populate("memberIds", "name email");
      await groupConversation.populate("adminIds", "name email");
      await groupConversation.populate("messages.senderId", "name email");
      const [formatted] = await formatMentorshipRequestsWithProfiles([groupConversation], getTenantModels(req));
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
        .populate("messages.senderId", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Mentorship request not found");
        error.statusCode = 404;
        throw error;
      }

      mentorshipRequest.status = status;
      await mentorshipRequest.save();
      const [formatted] = await formatMentorshipRequestsWithProfiles([mentorshipRequest], getTenantModels(req));
      res.json(formatted);

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
      const content = req.body.content?.trim?.();

      if (!content) {
        const error = new Error("Message content is required");
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
        .populate("messages.senderId", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Mentorship conversation not found");
        error.statusCode = 404;
        throw error;
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
      }

      mentorshipRequest.messages.push({
        senderId: req.user._id,
        content,
        sentAt: new Date()
      });
      mentorshipRequest.message = content;
      await mentorshipRequest.save();
      const [formatted] = await formatMentorshipRequestsWithProfiles([mentorshipRequest], getTenantModels(req));
      const latestMessage = formatted.messages[formatted.messages.length - 1] || null;

      res.status(201).json({
        requestId: formatted._id,
        message: latestMessage
      });

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

      if (!mentorshipRequest.adminIds.length && mentorshipRequest.memberIds.length) {
        mentorshipRequest.adminIds = [mentorshipRequest.memberIds[0]];
      }

      mentorshipRequest.message = `${req.user.name} left the group`;
      await mentorshipRequest.save();

      res.json({
        message: "You left the group successfully",
        conversationId: mentorshipRequest._id
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
