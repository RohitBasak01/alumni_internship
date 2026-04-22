import { getTenantModels } from "../db/tenantConnectionManager.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logAuditEvent } from "../utils/audit.js";
import { isObjectIdLike } from "../utils/validation.js";
import { persistMentorshipAttachments } from "../utils/attachments.js";

// Helper constants
const E2EE_CONVERSATION_KEY_VERSION = "conv-v1";

function toIdString(value) {
  if (!value) return null;
  return value._id?.toString?.() || value.toString?.() || null;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
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

  if (!senderId || !userId || senderId !== userId) return null;

  const recipientIds = getConversationParticipantIds(request).filter((id) => id !== senderId);
  const deliveredTo = ensureArray(message.deliveredTo).map((entry) => toIdString(entry)).filter(Boolean);
  const readBy = ensureArray(message.readBy).map((entry) => toIdString(entry)).filter(Boolean);

  const deliveredCount = recipientIds.filter((recipientId) => deliveredTo.includes(recipientId)).length;
  const readCount = recipientIds.filter((recipientId) => readBy.includes(recipientId)).length;
  const recipientCount = recipientIds.length;

  let status = "sent";
  if (deliveredCount > 0) status = "delivered";
  if (readCount > 0) status = "read";

  return { status, deliveredCount, readCount, recipientCount };
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
    occupation: profile?.occupation,
    company: profile?.company,
    designation: profile?.designation,
    location: profile?.location,
    e2eePublicKey: e2eeKey?.e2eePublicKey || "",
    e2eeKeyAlgorithm: e2eeKey?.e2eeKeyAlgorithm || ""
  };
}

async function formatMentorshipRequestsWithProfiles(requests, tenantModels, currentUserId = null) {
  const { AlumniProfile, User } = tenantModels;
  const userIds = [...new Set(requests.flatMap((request) => {
    const ids = [
      request.requesterId?._id?.toString() || request.requesterId?.toString(),
      request.mentorId?._id?.toString() || request.mentorId?.toString(),
      ...(request.memberIds || []).map(id => id?._id?.toString() || id?.toString()),
      ...(request.messages || []).map(m => m.senderId?._id?.toString() || m.senderId?.toString())
    ];
    return ids.filter(Boolean);
  }))];

  const profiles = await AlumniProfile.find({ userId: { $in: userIds } });
  const e2eeUsers = await User.find({ _id: { $in: userIds } });

  const profileByUserId = new Map(profiles.map(p => [p.userId.toString(), p]));
  const e2eeKeyByUserId = new Map(e2eeUsers.map(u => [u._id.toString(), u]));
  const personById = new Map();

  // Registration helper
  const registerPerson = (person) => {
    if (!person?._id) return;
    const pid = person._id.toString();
    if (!personById.has(pid)) {
      personById.set(pid, enrichPersonWithProfile(person, profileByUserId, e2eeKeyByUserId));
    }
  };

  // Populate personById...
  // (Simplified for this snippet, in reality would use the full logic from routes)
  
  return requests.map(request => ({
    _id: request._id,
    conversationType: request.conversationType,
    status: request.status,
    messages: (request.messages || []).map(m => ({
        _id: m._id,
        content: m.content,
        sender: personById.get(toIdString(m.senderId))
    }))
  }));
}

/**
 * Controller for Mentorship and Messaging
 */
export const getMentorshipRequests = asyncHandler(async (req, res) => {
  const { MentorshipRequest, AlumniProfile, User } = getTenantModels(req);
  
  const query = req.user.role === "institute_admin" 
    ? { instituteId: req.tenant._id }
    : {
        instituteId: req.tenant._id,
        $or: [
          { requesterId: req.user._id },
          { mentorId: req.user._id },
          { conversationType: "group", memberIds: req.user._id }
        ]
      };

  const requests = await MentorshipRequest.find(query)
    .populate("requesterId", "name email")
    .populate("mentorId", "name email")
    .populate("memberIds", "name email")
    .sort({ updatedAt: -1 });

  // Fetch only the latest message preview for each conversation
  const { Message } = getTenantModels(req);
  const enrichedRequests = await Promise.all(requests.map(async (r) => {
    const latestMessage = await Message.findOne({ conversationId: r._id })
      .sort({ createdAt: -1 })
      .select("content senderId sentAt");
    return { ...r.toObject(), latestMessage };
  }));

  res.json(enrichedRequests);
});

export const createMentorshipRequest = asyncHandler(async (req, res) => {
  const { MentorshipRequest } = getTenantModels(req);
  const { recipientUserId, message } = req.body;

  const existing = await MentorshipRequest.findOne({
    requesterId: req.user._id,
    mentorId: recipientUserId,
    status: { $ne: "declined" }
  });

  if (existing) {
    return res.status(400).json({ message: "A request already exists with this mentor" });
  }

  const request = await MentorshipRequest.create({
    instituteId: req.tenant._id,
    requesterId: req.user._id,
    mentorId: recipientUserId,
    message, // Keep summary in main doc
    status: "pending"
  });

  const { Message } = getTenantModels(req);
  await Message.create({
    instituteId: req.tenant._id,
    conversationId: request._id,
    senderId: req.user._id,
    content: message,
    sentAt: new Date()
  });

  // Background tasks
  logAuditEvent(req, "MENTORSHIP_REQUEST_CREATED", { requestId: request._id });
  
  res.status(201).json(request);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { MentorshipRequest } = getTenantModels(req);
  const { content, attachments, clientId } = req.body;
  const requestId = req.params.id;

  const request = await MentorshipRequest.findOne({
    _id: requestId,
    instituteId: req.tenant._id,
    $or: [
      { requesterId: req.user._id },
      { mentorId: req.user._id },
      { conversationType: "group", memberIds: req.user._id }
    ]
  });

  if (!request) {
    return res.status(404).json({ message: "Chat not found" });
  }

  const { Message } = getTenantModels(req);
  const newMessage = await Message.create({
    instituteId: req.tenant._id,
    conversationId: requestId,
    senderId: req.user._id,
    content,
    attachments: attachments || [],
    clientId,
    sentAt: new Date()
  });

  request.updatedAt = new Date();
  await request.save();

  // Trigger realtime event if needed
  res.status(201).json(request.messages[request.messages.length - 1]);
});

export const getConversationMessages = asyncHandler(async (req, res) => {
  const { Message } = getTenantModels(req);
  const { id: conversationId } = req.params;
  const { limit = 50, before } = req.query;

  const query = {
    instituteId: req.tenant._id,
    conversationId
  };

  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .populate("senderId", "name email");

  res.json(messages.reverse()); // Return in chronological order
});
