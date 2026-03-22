import express from "express";

import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import AlumniProfile from "../models/AlumniProfile.js";
import MentorshipRequest from "../models/MentorshipRequest.js";
import User from "../models/User.js";
import { logAuditEvent } from "../utils/audit.js";
import { sendConnectionRequestEmail } from "../utils/email.js";
import { hasMinLength, isObjectIdLike } from "../utils/validation.js";

const router = express.Router();

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

async function formatMentorshipRequestsWithProfiles(requests) {
  const userIds = [...new Set(
    requests.flatMap((request) => [request.requesterId?._id?.toString?.(), request.mentorId?._id?.toString?.()]).filter(Boolean)
  )];

  const profiles = await AlumniProfile.find({ userId: { $in: userIds } })
    .select("userId batch department company designation location");

  const profileByUserId = new Map(
    profiles.map((profile) => [profile.userId.toString(), profile])
  );

  const personById = new Map();

  for (const request of requests) {
    if (request.requesterId?._id) {
      personById.set(request.requesterId._id.toString(), enrichPersonWithProfile(request.requesterId, profileByUserId));
    }
    if (request.mentorId?._id) {
      personById.set(request.mentorId._id.toString(), enrichPersonWithProfile(request.mentorId, profileByUserId));
    }
  }

  return requests.map((request) => ({
    _id: request._id,
    message: request.message,
    status: request.status,
    createdAt: request.createdAt,
    messages: (request.messages || []).map((message) => {
      const senderId = message.senderId?._id?.toString?.() || message.senderId?.toString?.();
      const sender = senderId ? personById.get(senderId) : null;

      return {
        _id: message._id,
        content: message.content,
        sentAt: message.sentAt || request.createdAt,
        sender: sender || null
      };
    }),
    requester: enrichPersonWithProfile(request.requesterId, profileByUserId),
    mentor: enrichPersonWithProfile(request.mentorId, profileByUserId)
  }));
}

router.get("/", protect, authorize("alumni"), requireTenantAccess, async (req, res, next) => {
  try {
    const requests = await MentorshipRequest.find({
      instituteId: req.tenant._id,
      $or: [{ requesterId: req.user._id }, { mentorId: req.user._id }]
    })
      .populate("requesterId", "name email")
      .populate("mentorId", "name email")
      .sort({ createdAt: -1 });

    res.json(await formatMentorshipRequestsWithProfiles(requests));
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

    const [formatted] = await formatMentorshipRequestsWithProfiles([mentorshipRequest]);
    res.status(201).json(formatted);

    // Fetch requester profile for email
    const requesterProfile = await AlumniProfile.findOne({ userId: req.user._id });

    // Send connection request email
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

router.patch(
  "/:id",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateMentorshipParams),
  validateBody(validateMentorshipUpdateBody),
  async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["accepted", "declined"].includes(status)) {
      const error = new Error("Status must be accepted or declined");
      error.statusCode = 400;
      throw error;
    }

    const mentorshipRequest = await MentorshipRequest.findOne({
      _id: req.params.id,
      instituteId: req.tenant._id,
      mentorId: req.user._id
    })
      .populate("requesterId", "name email")
      .populate("mentorId", "name email");

    if (!mentorshipRequest) {
      const error = new Error("Mentorship request not found");
      error.statusCode = 404;
      throw error;
    }

    mentorshipRequest.status = status;
    await mentorshipRequest.save();

    const [formatted] = await formatMentorshipRequestsWithProfiles([mentorshipRequest]);
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
      const content = req.body.content?.trim?.();

      if (!content) {
        const error = new Error("Message content is required");
        error.statusCode = 400;
        throw error;
      }

      const mentorshipRequest = await MentorshipRequest.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        $or: [{ requesterId: req.user._id }, { mentorId: req.user._id }]
      })
        .populate("requesterId", "name email")
        .populate("mentorId", "name email");

      if (!mentorshipRequest) {
        const error = new Error("Mentorship conversation not found");
        error.statusCode = 404;
        throw error;
      }

      if (mentorshipRequest.status === "declined") {
        const error = new Error("This mentorship request has been declined");
        error.statusCode = 400;
        throw error;
      }

      if (
        mentorshipRequest.status === "pending"
      ) {
        const error = new Error("Wait for the recipient to accept this chat request before sending more messages");
        error.statusCode = 403;
        throw error;
      }

      mentorshipRequest.messages.push({
        senderId: req.user._id,
        content,
        sentAt: new Date()
      });
      await mentorshipRequest.save();

      const [formatted] = await formatMentorshipRequestsWithProfiles([mentorshipRequest]);
      const latestMessage = formatted.messages[formatted.messages.length - 1] || null;

      res.status(201).json({
        requestId: formatted._id,
        message: latestMessage
      });

      await logAuditEvent(req, {
        action: "mentorship.message_sent",
        targetType: "MentorshipRequest",
        targetId: mentorshipRequest._id.toString(),
        instituteId: req.tenant._id,
        metadata: {
          senderId: req.user._id.toString(),
          status: mentorshipRequest.status
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
