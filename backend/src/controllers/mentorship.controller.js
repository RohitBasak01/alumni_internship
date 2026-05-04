import { getTenantModels } from "../db/tenantConnectionManager.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logAuditEvent } from "../utils/audit.js";
import {
  persistMentorshipAttachments,
  storeIncomingUpload,
} from "../utils/attachments.js";
import { isObjectIdLike } from "../utils/validation.js";

const E2EE_CONVERSATION_KEY_VERSION = "conv-v1";

function toIdString(value) {
  if (!value) return null;
  return value?._id?.toString?.() || value?.toString?.() || null;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function getConversationParticipantIds(conversation) {
  if (conversation.conversationType === "group") {
    return [
      ...new Set(
        ensureArray(conversation.memberIds)
          .map((member) => toIdString(member))
          .filter(Boolean),
      ),
    ];
  }

  return [
    ...new Set(
      [
        toIdString(conversation.requesterId),
        toIdString(conversation.mentorId),
      ].filter(Boolean),
    ),
  ];
}

function getConversationAccessQuery(userId) {
  return {
    $or: [
      { requesterId: userId },
      { mentorId: userId },
      { conversationType: "group", memberIds: userId },
    ],
  };
}

function getMessageDeliveryMetadata(message, conversation, currentUserId) {
  const senderId = toIdString(message.senderId);
  const userId = String(currentUserId || "");

  if (!senderId || !userId || senderId !== userId) {
    return null;
  }

  const recipientIds = getConversationParticipantIds(conversation).filter(
    (id) => id !== senderId,
  );
  const deliveredTo = ensureArray(message.deliveredTo)
    .map((entry) => toIdString(entry))
    .filter(Boolean);
  const readBy = ensureArray(message.readBy)
    .map((entry) => toIdString(entry))
    .filter(Boolean);

  const deliveredCount = recipientIds.filter((recipientId) =>
    deliveredTo.includes(recipientId),
  ).length;
  const readCount = recipientIds.filter((recipientId) =>
    readBy.includes(recipientId),
  ).length;

  let status = "sent";
  if (deliveredCount > 0) status = "delivered";
  if (readCount > 0) status = "read";

  return {
    status,
    deliveredCount,
    readCount,
    recipientCount: recipientIds.length,
  };
}

async function buildPeopleMap(tenantModels, userIds = []) {
  const { AlumniProfile, User } = tenantModels;
  const uniqueUserIds = [
    ...new Set(userIds.map((id) => String(id || "").trim()).filter(Boolean)),
  ];

  if (!uniqueUserIds.length) {
    return new Map();
  }

  const [profiles, users] = await Promise.all([
    AlumniProfile.find({ userId: { $in: uniqueUserIds } }),
    User.find({ _id: { $in: uniqueUserIds } }).select(
      "name email e2eePublicKey e2eeKeyAlgorithm",
    ),
  ]);

  const profileByUserId = new Map(
    profiles.map((profile) => [profile.userId.toString(), profile]),
  );

  return new Map(
    users.map((user) => {
      const userId = user._id.toString();
      const profile = profileByUserId.get(userId);
      return [
        userId,
        {
          _id: user._id,
          name: user.name,
          email: user.email,
          batch: profile?.batch,
          department: profile?.department,
          leavingYear: profile?.leavingYear,
          lastClassAttended: profile?.lastClassAttended,
          section: profile?.section,
          currentEducation: profile?.currentEducation,
          currentInstitution: profile?.currentInstitution,
          occupation: profile?.occupation,
          company: profile?.company,
          designation: profile?.designation,
          location: profile?.location,
          e2eePublicKey: user.e2eePublicKey || "",
          e2eeKeyAlgorithm: user.e2eeKeyAlgorithm || "",
        },
      ];
    }),
  );
}

function serializeTypingMembers(typingMembers, peopleById) {
  return ensureArray(typingMembers)
    .map((entry) => {
      const userId = toIdString(entry.userId);
      const person = userId ? peopleById.get(userId) : null;
      if (!userId || !person) return null;
      return {
        userId: person,
        startedAt: entry.startedAt || new Date(),
      };
    })
    .filter(Boolean);
}

function buildConversationE2ee(conversation, peopleById) {
  const participantKeys = getConversationParticipantIds(conversation)
    .map((userId) => {
      const person = peopleById.get(userId);
      if (!person?.e2eePublicKey) return null;
      return {
        userId,
        publicKey: person.e2eePublicKey,
        algorithm: person.e2eeKeyAlgorithm || "RSA-OAEP",
      };
    })
    .filter(Boolean);

  const envelopes = ensureArray(conversation.conversationKeyEnvelopes).map(
    (entry) => ({
      userId: toIdString(entry.userId),
      encryptedKey: entry.encryptedKey,
      algorithm: entry.algorithm || "RSA-OAEP",
      version: entry.version || E2EE_CONVERSATION_KEY_VERSION,
      updatedAt: entry.updatedAt || null,
    }),
  );

  return { participantKeys, envelopes };
}

function getCurrentUserRole(conversation, userId) {
  const normalizedUserId = String(userId || "");
  if (!normalizedUserId || conversation.conversationType !== "group") {
    return null;
  }

  if (
    ensureArray(conversation.adminIds).some(
      (entry) => toIdString(entry) === normalizedUserId,
    )
  ) {
    return "admin";
  }

  const explicitRole = ensureArray(conversation.memberRoles).find(
    (entry) => toIdString(entry.userId) === normalizedUserId,
  );

  return explicitRole?.role || "member";
}

async function populateConversationDocument(
  req,
  conversation,
  unreadCount = 0,
) {
  await conversation.populate([
    { path: "requesterId", select: "name email" },
    { path: "mentorId", select: "name email" },
    { path: "memberIds", select: "name email" },
    { path: "adminIds", select: "name email" },
    { path: "typingMembers.userId", select: "name email" },
    { path: "memberRoles.userId", select: "name email" },
    { path: "mutedMembers.userId", select: "name email" },
    { path: "mutedMembers.mutedById", select: "name email" },
  ]);
  return serializeConversation(req, conversation, null, unreadCount);
}

async function serializeConversation(
  req,
  conversation,
  latestMessage = null,
  unreadCount = 0,
) {
  const tenantModels = getTenantModels(req);
  const participantIds = getConversationParticipantIds(conversation);
  const typingIds = ensureArray(conversation.typingMembers).map((entry) =>
    toIdString(entry.userId),
  );
  const mutedIds = ensureArray(conversation.mutedMembers).flatMap((entry) => [
    toIdString(entry.userId),
    toIdString(entry.mutedById),
  ]);
  const adminIds = ensureArray(conversation.adminIds).map((entry) =>
    toIdString(entry),
  );
  const requesterId = toIdString(conversation.requesterId);
  const mentorId = toIdString(conversation.mentorId);
  const latestSenderId = toIdString(latestMessage?.senderId);

  const peopleById = await buildPeopleMap(tenantModels, [
    ...participantIds,
    ...typingIds,
    ...mutedIds,
    ...adminIds,
    requesterId,
    mentorId,
    latestSenderId,
  ]);

  const serializedLatestMessage = latestMessage
    ? {
        ...latestMessage.toObject(),
        senderId: peopleById.get(latestSenderId) || latestMessage.senderId,
        sentAt: latestMessage.sentAt || latestMessage.createdAt || new Date(),
        delivery: getMessageDeliveryMetadata(
          latestMessage,
          conversation,
          req.user?._id || req.user?.id,
        ),
      }
    : null;

  return {
    _id: conversation._id,
    conversationType: conversation.conversationType,
    groupName: conversation.groupName || "",
    status: conversation.status,
    message: conversation.message || "",
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    requester: requesterId ? peopleById.get(requesterId) || null : null,
    mentor: mentorId ? peopleById.get(mentorId) || null : null,
    members: participantIds
      .map((userId) => peopleById.get(userId))
      .filter(Boolean),
    admins: adminIds.map((userId) => peopleById.get(userId)).filter(Boolean),
    typingMembers: serializeTypingMembers(
      conversation.typingMembers,
      peopleById,
    ),
    currentUserRole: getCurrentUserRole(
      conversation,
      req.user?._id || req.user?.id,
    ),
    unreadCount,
    mutedMembers: ensureArray(conversation.mutedMembers)
      .map((entry) => {
        const userId = toIdString(entry.userId);
        const mutedById = toIdString(entry.mutedById);
        return {
          userId: userId ? peopleById.get(userId) || null : null,
          mutedById: mutedById ? peopleById.get(mutedById) || null : null,
          mutedUntil: entry.mutedUntil,
        };
      })
      .filter((entry) => entry.userId),
    e2ee: buildConversationE2ee(conversation, peopleById),
    latestMessage: serializedLatestMessage,
    isMuted: req.user?.mutedConversationIds?.some(id => String(id) === String(conversation._id)),
    isBlocked: req.user?.blockedUserIds?.some(id => {
      if (conversation.conversationType === 'direct') {
        const partnerId = String(conversation.requesterId) === String(req.user._id) 
          ? String(conversation.mentorId) 
          : String(conversation.requesterId);
        return String(id) === partnerId;
      }
      return false;
    }),
  };
}

async function formatMessagesForClient(req, conversation, messages) {
  const tenantModels = getTenantModels(req);
  const replyIds = [
    ...new Set(
      ensureArray(messages)
        .map((message) => toIdString(message.replyToMessageId))
        .filter(Boolean),
    ),
  ];

  const replyMessages = replyIds.length
    ? await tenantModels.Message.find({
        instituteId: req.tenant._id,
        conversationId: conversation._id,
        _id: { $in: replyIds },
      }).populate("senderId", "name email")
    : [];

  const replyById = new Map(
    replyMessages.map((message) => [message._id.toString(), message]),
  );

  const userIds = [
    ...getConversationParticipantIds(conversation),
    ...ensureArray(messages).flatMap((message) => [
      toIdString(message.senderId),
      ...ensureArray(message.readBy).map((entry) => toIdString(entry)),
      ...ensureArray(message.deliveredTo).map((entry) => toIdString(entry)),
    ]),
    ...replyMessages.flatMap((message) => [toIdString(message.senderId)]),
  ];

  const peopleById = await buildPeopleMap(tenantModels, userIds);

  return ensureArray(messages).map((message) => {
    const senderId = toIdString(message.senderId);
    const replyId = toIdString(message.replyToMessageId);
    const replyToMessage = replyId ? replyById.get(replyId) : null;
    const replySenderId = toIdString(replyToMessage?.senderId);

    return {
      ...message.toObject(),
      sender: senderId ? peopleById.get(senderId) || null : null,
      readBy: ensureArray(message.readBy).map((entry) => {
        const entryId = toIdString(entry);
        return entryId ? peopleById.get(entryId) || entry : entry;
      }),
      deliveredTo: ensureArray(message.deliveredTo).map((entry) => {
        const entryId = toIdString(entry);
        return entryId ? peopleById.get(entryId) || entry : entry;
      }),
      sentAt: message.sentAt || message.createdAt || new Date(),
      delivery: getMessageDeliveryMetadata(
        message,
        conversation,
        req.user?._id || req.user?.id,
      ),
      replyTo: replyToMessage
        ? {
            messageId: replyToMessage._id,
            senderName: replySenderId
              ? peopleById.get(replySenderId)?.name ||
                replyToMessage.senderId?.name ||
                "Member"
              : "Member",
            content: replyToMessage.content || "",
          }
        : null,
    };
  });
}

async function findAccessibleConversation(req, conversationId) {
  const { MentorshipRequest } = getTenantModels(req);
  return MentorshipRequest.findOne({
    _id: conversationId,
    instituteId: req.tenant._id,
    ...getConversationAccessQuery(req.user._id),
  });
}

function assertDirectConversationCanSend(conversation) {
  if (conversation.conversationType === "group") return null;
  if (conversation.status === "declined") {
    return "This alumni chat request has been declined.";
  }
  return null;
}

async function findGroupConversationAsAdmin(req, conversationId) {
  const { MentorshipRequest } = getTenantModels(req);
  return MentorshipRequest.findOne({
    _id: conversationId,
    instituteId: req.tenant._id,
    conversationType: "group",
    memberIds: req.user._id,
    adminIds: req.user._id,
  });
}

export const getMentorshipRequests = asyncHandler(async (req, res) => {
  const { MentorshipRequest, Message } = getTenantModels(req);

  const query =
    req.user.role === "institute_admin"
      ? { instituteId: req.tenant._id }
      : {
          instituteId: req.tenant._id,
          ...getConversationAccessQuery(req.user._id),
        };

  const conversations = await MentorshipRequest.find(query)
    .populate("requesterId", "name email")
    .populate("mentorId", "name email")
    .populate("memberIds", "name email")
    .populate("adminIds", "name email")
    .populate("typingMembers.userId", "name email")
    .sort({ updatedAt: -1 });

  const latestMessages = await Promise.all(
    conversations.map((conversation) =>
      Message.findOne({
        instituteId: req.tenant._id,
        conversationId: conversation._id,
      })
        .sort({ createdAt: -1 })
        .populate("senderId", "name email")
        .populate("readBy", "name email")
        .populate("deliveredTo", "name email"),
    ),
  );

  const unreadCounts = await Promise.all(
    conversations.map((conversation) =>
      Message.countDocuments({
        instituteId: req.tenant._id,
        conversationId: conversation._id,
        senderId: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      }),
    ),
  );

  const serialized = await Promise.all(
    conversations.map((conversation, index) =>
      serializeConversation(
        req,
        conversation,
        latestMessages[index],
        unreadCounts[index] || 0,
      ),
    ),
  );

  res.json(serialized);
});

export const createMentorshipRequest = asyncHandler(async (req, res) => {
  const { MentorshipRequest, Message, User } = getTenantModels(req);
  const recipientUserId = req.body.recipientUserId || req.body.mentorUserId;
  const message = String(req.body.message || "").trim();

  if (String(recipientUserId) === req.user._id.toString()) {
    return res
      .status(400)
      .json({ message: "You cannot start a chat with yourself." });
  }

  const recipient = await User.findOne({
    _id: recipientUserId,
    isActive: true,
    role: "alumni",
  }).select("_id");

  if (!recipient) {
    return res
      .status(404)
      .json({ message: "Selected alumni member was not found." });
  }

  const existing = await MentorshipRequest.findOne({
    instituteId: req.tenant._id,
    conversationType: "direct",
    $or: [
      { requesterId: req.user._id, mentorId: recipientUserId },
      { requesterId: recipientUserId, mentorId: req.user._id },
    ],
    status: { $ne: "declined" },
  });

  if (existing) {
    return res
      .status(400)
      .json({
        message: "A chat request already exists with this alumni member.",
      });
  }

  const conversation = await MentorshipRequest.create({
    instituteId: req.tenant._id,
    requesterId: req.user._id,
    mentorId: recipientUserId,
    message,
    status: "pending",
    conversationType: "direct",
  });

  const newMessage = await Message.create({
    instituteId: req.tenant._id,
    conversationId: conversation._id,
    senderId: req.user._id,
    content: message,
    deliveredTo: [],
    readBy: [req.user._id],
    sentAt: new Date(),
  });

  const serializedConversation = await populateConversationDocument(
    req,
    conversation,
  );
  const [serializedMessage] = await formatMessagesForClient(req, conversation, [
    newMessage,
  ]);

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "message",
    message: serializedMessage,
    messageId: serializedMessage?._id?.toString?.(),
  });

  logAuditEvent(req, "ALUMNI_CHAT_REQUEST_CREATED", {
    conversationId: conversation._id,
  });

  res.status(201).json(serializedConversation);
});

export const updateMentorshipRequestStatus = asyncHandler(async (req, res) => {
  const { MentorshipRequest } = getTenantModels(req);
  const { id } = req.params;
  const status = String(req.body.status || "")
    .trim()
    .toLowerCase();

  if (!["accepted", "declined"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Status must be accepted or declined." });
  }

  const conversation = await MentorshipRequest.findOne({
    _id: id,
    instituteId: req.tenant._id,
    conversationType: "direct",
    mentorId: req.user._id,
  });

  if (!conversation) {
    return res.status(404).json({ message: "Chat request not found." });
  }

  conversation.status = status;
  conversation.updatedAt = new Date();
  await conversation.save();

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "conversation",
  });

  res.json(await populateConversationDocument(req, conversation));
});

export const createGroupConversation = asyncHandler(async (req, res) => {
  const { MentorshipRequest, Message, User } = getTenantModels(req);
  const groupName = String(req.body.groupName || "").trim();
  const initialMessage = String(req.body.initialMessage || "").trim();
  const requestedMemberIds = ensureArray(req.body.memberUserIds).map((entry) =>
    String(entry),
  );
  const memberIds = [
    ...new Set([req.user._id.toString(), ...requestedMemberIds]),
  ];

  const validMembers = await User.find({
    _id: { $in: memberIds },
    isActive: true,
    role: "alumni",
  }).select("_id");

  if (validMembers.length !== memberIds.length) {
    return res
      .status(400)
      .json({ message: "One or more selected alumni members are invalid." });
  }

  const conversation = await MentorshipRequest.create({
    instituteId: req.tenant._id,
    conversationType: "group",
    groupName,
    memberIds,
    adminIds: [req.user._id],
    memberRoles: memberIds.map((userId) => ({
      userId,
      role: String(userId) === req.user._id.toString() ? "admin" : "member",
    })),
    message: initialMessage || `${req.user.name} created the group`,
    status: "active",
  });

  if (initialMessage) {
    await Message.create({
      instituteId: req.tenant._id,
      conversationId: conversation._id,
      senderId: req.user._id,
      content: initialMessage,
      deliveredTo: [],
      readBy: [req.user._id],
      sentAt: new Date(),
    });
  }

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "conversation",
  });

  res.status(201).json(await populateConversationDocument(req, conversation));
});

export const leaveGroupConversation = asyncHandler(async (req, res) => {
  const conversation = await findAccessibleConversation(req, req.params.id);

  if (!conversation || conversation.conversationType !== "group") {
    return res.status(404).json({ message: "Group chat not found." });
  }

  const userId = req.user._id.toString();
  const nextMemberIds = ensureArray(conversation.memberIds).filter(
    (entry) => toIdString(entry) !== userId,
  );

  if (!nextMemberIds.length) {
    return res.status(400).json({
      message: "You cannot leave the last remaining member in the group.",
    });
  }

  conversation.memberIds = nextMemberIds;
  conversation.adminIds = ensureArray(conversation.adminIds).filter(
    (entry) => toIdString(entry) !== userId,
  );
  conversation.memberRoles = ensureArray(conversation.memberRoles).filter(
    (entry) => toIdString(entry.userId) !== userId,
  );
  conversation.mutedMembers = ensureArray(conversation.mutedMembers).filter(
    (entry) => toIdString(entry.userId) !== userId,
  );

  if (!conversation.adminIds.length && conversation.memberIds.length) {
    conversation.adminIds = [conversation.memberIds[0]];
    const firstAdminId = toIdString(conversation.memberIds[0]);
    conversation.memberRoles = ensureArray(conversation.memberRoles).map(
      (entry) => {
        const normalizedEntry = entry?.toObject ? entry.toObject() : entry;
        return toIdString(normalizedEntry.userId) === firstAdminId
          ? { ...normalizedEntry, role: "admin" }
          : normalizedEntry;
      },
    );
  }

  conversation.message = `${req.user.name} left the group`;
  conversation.updatedAt = new Date();
  await conversation.save();

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "conversation",
  });

  res.json({
    message: "You left the group successfully.",
    conversationId: conversation._id,
  });
});

export const updateGroupMemberRole = asyncHandler(async (req, res) => {
  const conversation = await findGroupConversationAsAdmin(req, req.params.id);
  const userId = String(req.params.userId || "");
  const role = String(req.body.role || "")
    .trim()
    .toLowerCase();

  if (!conversation) {
    return res
      .status(404)
      .json({ message: "Group chat not found or admin access is required." });
  }

  if (!["member", "moderator", "admin"].includes(role)) {
    return res
      .status(400)
      .json({ message: "Role must be member, moderator, or admin." });
  }

  if (
    !ensureArray(conversation.memberIds).some(
      (entry) => toIdString(entry) === userId,
    )
  ) {
    return res.status(404).json({ message: "Group member not found." });
  }

  const nextRoles = ensureArray(conversation.memberRoles).filter(
    (entry) => toIdString(entry.userId) !== userId,
  );
  nextRoles.push({ userId, role });
  conversation.memberRoles = nextRoles;

  const nextAdminIds = new Set(
    ensureArray(conversation.adminIds)
      .map((entry) => toIdString(entry))
      .filter(Boolean),
  );
  if (role === "admin") {
    nextAdminIds.add(userId);
  } else {
    nextAdminIds.delete(userId);
  }

  if (!nextAdminIds.size) {
    nextAdminIds.add(req.user._id.toString());
  }

  conversation.adminIds = [...nextAdminIds];
  conversation.updatedAt = new Date();
  await conversation.save();

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "conversation",
  });

  res.json(await populateConversationDocument(req, conversation));
});

export const muteGroupMember = asyncHandler(async (req, res) => {
  const conversation = await findGroupConversationAsAdmin(req, req.params.id);
  const userId = String(req.params.userId || "");
  const muteMinutes = Math.max(Number(req.body.muteMinutes || 60), 1);

  if (!conversation) {
    return res
      .status(404)
      .json({ message: "Group chat not found or admin access is required." });
  }

  if (userId === req.user._id.toString()) {
    return res.status(400).json({ message: "You cannot mute yourself." });
  }

  if (
    !ensureArray(conversation.memberIds).some(
      (entry) => toIdString(entry) === userId,
    )
  ) {
    return res.status(404).json({ message: "Group member not found." });
  }

  const mutedUntil = new Date(Date.now() + muteMinutes * 60 * 1000);
  const nextMutedMembers = ensureArray(conversation.mutedMembers).filter(
    (entry) => toIdString(entry.userId) !== userId,
  );
  nextMutedMembers.push({
    userId,
    mutedUntil,
    mutedById: req.user._id,
  });

  conversation.mutedMembers = nextMutedMembers;
  conversation.updatedAt = new Date();
  await conversation.save();

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "conversation",
  });

  res.json(await populateConversationDocument(req, conversation));
});

export const unmuteGroupMember = asyncHandler(async (req, res) => {
  const conversation = await findGroupConversationAsAdmin(req, req.params.id);
  const userId = String(req.params.userId || "");

  if (!conversation) {
    return res
      .status(404)
      .json({ message: "Group chat not found or admin access is required." });
  }

  conversation.mutedMembers = ensureArray(conversation.mutedMembers).filter(
    (entry) => toIdString(entry.userId) !== userId,
  );
  conversation.updatedAt = new Date();
  await conversation.save();

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "conversation",
  });

  res.json(await populateConversationDocument(req, conversation));
});

export const removeGroupMember = asyncHandler(async (req, res) => {
  const conversation = await findGroupConversationAsAdmin(req, req.params.id);
  const userId = String(req.params.userId || "");

  if (!conversation) {
    return res
      .status(404)
      .json({ message: "Group chat not found or admin access is required." });
  }

  if (userId === req.user._id.toString()) {
    return res
      .status(400)
      .json({ message: "Use leave group instead of removing yourself." });
  }

  if (
    !ensureArray(conversation.memberIds).some(
      (entry) => toIdString(entry) === userId,
    )
  ) {
    return res.status(404).json({ message: "Group member not found." });
  }

  conversation.memberIds = ensureArray(conversation.memberIds).filter(
    (entry) => toIdString(entry) !== userId,
  );
  conversation.adminIds = ensureArray(conversation.adminIds).filter(
    (entry) => toIdString(entry) !== userId,
  );
  conversation.memberRoles = ensureArray(conversation.memberRoles).filter(
    (entry) => toIdString(entry.userId) !== userId,
  );
  conversation.mutedMembers = ensureArray(conversation.mutedMembers).filter(
    (entry) => toIdString(entry.userId) !== userId,
  );
  conversation.message = "A group member was removed";
  conversation.updatedAt = new Date();
  await conversation.save();

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "conversation",
  });

  res.json(await populateConversationDocument(req, conversation));
});

export const uploadAttachment = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file?.buffer?.length) {
    return res.status(400).json({ message: "File upload is required." });
  }

  const uploaded = await storeIncomingUpload({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    tenantId: req.tenant._id,
    userId: req.user._id,
  });

  res.status(201).json(uploaded);
});

export const upsertE2eePublicKey = asyncHandler(async (req, res) => {
  const { User } = getTenantModels(req);
  const publicKey = String(req.body.publicKey || "").trim();
  const algorithm =
    String(req.body.algorithm || "RSA-OAEP").trim() || "RSA-OAEP";

  if (!publicKey) {
    return res.status(400).json({ message: "Public key is required." });
  }

  await User.updateOne(
    { _id: req.user._id },
    {
      $set: {
        e2eePublicKey: publicKey,
        e2eeKeyAlgorithm: algorithm,
        e2eeKeyUpdatedAt: new Date(),
      },
    },
  );

  res.json({ ok: true });
});

export const syncConversationEnvelopes = asyncHandler(async (req, res) => {
  const conversation = await findAccessibleConversation(req, req.params.id);

  if (!conversation) {
    return res.status(404).json({ message: "Chat not found." });
  }

  const envelopes = ensureArray(req.body.envelopes)
    .map((entry) => ({
      userId: String(entry?.userId || "").trim(),
      encryptedKey: String(entry?.encryptedKey || "").trim(),
      algorithm: String(entry?.algorithm || "RSA-OAEP").trim() || "RSA-OAEP",
      version:
        String(entry?.version || E2EE_CONVERSATION_KEY_VERSION).trim() ||
        E2EE_CONVERSATION_KEY_VERSION,
      updatedAt: new Date(),
    }))
    .filter((entry) => isObjectIdLike(entry.userId) && entry.encryptedKey);

  if (!envelopes.length) {
    return res
      .status(400)
      .json({ message: "At least one valid envelope is required." });
  }

  const envelopeByUserId = new Map(
    ensureArray(conversation.conversationKeyEnvelopes).map((entry) => [
      toIdString(entry.userId),
      {
        userId: entry.userId,
        encryptedKey: entry.encryptedKey,
        algorithm: entry.algorithm,
        version: entry.version,
        updatedAt: entry.updatedAt,
      },
    ]),
  );

  for (const envelope of envelopes) {
    envelopeByUserId.set(envelope.userId, envelope);
  }

  conversation.conversationKeyEnvelopes = [...envelopeByUserId.values()];
  await conversation.save();

  // Notify all participants so their E2EE setup re-runs immediately
  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "e2ee-envelopes-updated",
  });

  res.json({ ok: true });
});

export const setConversationTyping = asyncHandler(async (req, res) => {
  const conversation = await findAccessibleConversation(req, req.params.id);
  const isTyping = Boolean(req.body.isTyping);

  if (!conversation) {
    return res.status(404).json({ message: "Chat not found." });
  }

  const userId = req.user._id.toString();
  const nextTypingMembers = ensureArray(conversation.typingMembers)
    .map((entry) => ({
      userId: entry.userId,
      startedAt: entry.startedAt || new Date(),
    }))
    .filter((entry) => toIdString(entry.userId) !== userId);

  if (isTyping) {
    nextTypingMembers.push({ userId: req.user._id, startedAt: new Date() });
  }

  conversation.typingMembers = nextTypingMembers;
  conversation.updatedAt = new Date();
  await conversation.save();

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "typing",
  });

  res.json({ ok: true });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { Message } = getTenantModels(req);
  const conversation = await findAccessibleConversation(req, req.params.id);

  if (!conversation) {
    return res.status(404).json({ message: "Chat not found." });
  }

  const blockedReason = assertDirectConversationCanSend(conversation);
  if (blockedReason) {
    return res.status(400).json({ message: blockedReason });
  }

  const activeMute = ensureArray(conversation.mutedMembers).find((entry) => {
    const isCurrentUser = toIdString(entry.userId) === req.user._id.toString();
    const mutedUntil = entry?.mutedUntil
      ? new Date(entry.mutedUntil).getTime()
      : 0;
    return isCurrentUser && mutedUntil > Date.now();
  });

  if (activeMute) {
    return res.status(403).json({
      message: "You are temporarily muted in this group chat.",
    });
  }

  const attachments = await persistMentorshipAttachments(req.body.attachments, {
    tenantId: req.tenant._id,
    conversationId: conversation._id,
  });

  const normalizedClientId = String(req.body.clientId || "").trim();
  if (normalizedClientId) {
    const existingMessage = await Message.findOne({
      instituteId: req.tenant._id,
      conversationId: conversation._id,
      senderId: req.user._id,
      clientId: normalizedClientId,
    }).sort({ createdAt: -1 });

    if (existingMessage) {
      const [serializedExistingMessage] = await formatMessagesForClient(
        req,
        conversation,
        [existingMessage],
      );
      return res.status(200).json(serializedExistingMessage);
    }
  }

  const newMessage = await Message.create({
    instituteId: req.tenant._id,
    conversationId: conversation._id,
    senderId: req.user._id,
    content: String(req.body.content || "").trim(),
    attachments,
    clientId: normalizedClientId || null,
    replyToMessageId: req.body.replyToMessageId || null,
    deliveredTo: [],
    readBy: [req.user._id],
    sentAt: new Date(),
  });

  conversation.updatedAt = new Date();
  conversation.message =
    String(req.body.content || "").trim() ||
    (attachments.length ? "Attachment" : "");
  conversation.typingMembers = ensureArray(conversation.typingMembers).filter(
    (entry) => toIdString(entry.userId) !== req.user._id.toString(),
  );
  if (
    conversation.conversationType === "direct" &&
    conversation.status === "pending"
  ) {
    conversation.status = "accepted";
  }
  await conversation.save();

  const [serializedMessage] = await formatMessagesForClient(req, conversation, [
    newMessage,
  ]);

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "message",
    message: serializedMessage,
    messageId:
      serializedMessage?._id?.toString?.() || newMessage._id.toString(),
  });

  res.status(201).json(serializedMessage);
});

export const markConversationRead = asyncHandler(async (req, res) => {
  const { Message } = getTenantModels(req);
  const conversation = await findAccessibleConversation(req, req.params.id);

  if (!conversation) {
    return res.status(404).json({ message: "Chat not found." });
  }

  await Message.updateMany(
    {
      instituteId: req.tenant._id,
      conversationId: conversation._id,
      senderId: { $ne: req.user._id },
    },
    {
      $addToSet: {
        deliveredTo: req.user._id,
        readBy: req.user._id,
      },
    },
  );

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "read",
  });

  res.json({ ok: true });
});

export const toggleMessageReaction = asyncHandler(async (req, res) => {
  const { Message } = getTenantModels(req);
  const { id, messageId } = req.params;
  const emoji = String(req.body.emoji || "").trim();
  const conversation = await findAccessibleConversation(req, id);

  if (!conversation) {
    return res.status(404).json({ message: "Chat not found." });
  }

  if (!isObjectIdLike(messageId)) {
    return res.status(400).json({ message: "Invalid message id." });
  }

  const message = await Message.findOne({
    _id: messageId,
    instituteId: req.tenant._id,
    conversationId: conversation._id,
  });

  if (!message) {
    return res.status(404).json({ message: "Message not found." });
  }

  const reactions = ensureArray(message.reactions).map((reaction) => ({
    userId: reaction.userId,
    emoji: reaction.emoji,
  }));
  const userId = req.user._id.toString();
  const existingIndex = reactions.findIndex(
    (reaction) =>
      toIdString(reaction.userId) === userId && reaction.emoji === emoji,
  );

  if (existingIndex >= 0) {
    reactions.splice(existingIndex, 1);
  } else {
    const filtered = reactions.filter(
      (reaction) => toIdString(reaction.userId) !== userId,
    );
    filtered.push({ userId: req.user._id, emoji });
    message.reactions = filtered;
    await message.save();
  }

  if (existingIndex >= 0) {
    message.reactions = reactions;
    await message.save();
  }

  const [serializedMessage] = await formatMessagesForClient(req, conversation, [
    message,
  ]);

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "message",
    message: serializedMessage,
    messageId: serializedMessage?._id?.toString?.() || message._id.toString(),
  });

  res.json(serializedMessage);
});

export const editMessage = asyncHandler(async (req, res) => {
  const { Message } = getTenantModels(req);
  const { id, messageId } = req.params;
  const content = String(req.body.content || "").trim();
  const conversation = await findAccessibleConversation(req, id);

  if (!conversation) {
    return res.status(404).json({ message: "Chat not found." });
  }

  if (!isObjectIdLike(messageId)) {
    return res.status(400).json({ message: "Invalid message id." });
  }

  const message = await Message.findOne({
    _id: messageId,
    instituteId: req.tenant._id,
    conversationId: conversation._id,
    senderId: req.user._id,
    deletedAt: null,
  });

  if (!message) {
    return res.status(404).json({ message: "Message not found." });
  }

  message.content = content;
  message.editedAt = new Date();
  await message.save();

  const [serializedMessage] = await formatMessagesForClient(req, conversation, [
    message,
  ]);

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "message",
    message: serializedMessage,
    messageId: serializedMessage?._id?.toString?.() || message._id.toString(),
  });

  res.json(serializedMessage);
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { Message } = getTenantModels(req);
  const { id, messageId } = req.params;
  const conversation = await findAccessibleConversation(req, id);

  if (!conversation) {
    return res.status(404).json({ message: "Chat not found." });
  }

  if (!isObjectIdLike(messageId)) {
    return res.status(400).json({ message: "Invalid message id." });
  }

  const message = await Message.findOne({
    _id: messageId,
    instituteId: req.tenant._id,
    conversationId: conversation._id,
    senderId: req.user._id,
    deletedAt: null,
  });

  if (!message) {
    return res.status(404).json({ message: "Message not found." });
  }

  message.deletedAt = new Date();
  message.deletedById = req.user._id;
  message.content = "";
  message.attachments = [];
  message.reactions = [];
  await message.save();

  const [serializedMessage] = await formatMessagesForClient(req, conversation, [
    message,
  ]);

  req.app.locals.emitMentorshipEvent?.({
    conversationId: conversation._id.toString(),
    conversationIds: [conversation._id.toString()],
    type: "message",
    message: serializedMessage,
    messageId: serializedMessage?._id?.toString?.() || message._id.toString(),
  });

  res.json(serializedMessage);
});

export const getConversationMessages = asyncHandler(async (req, res) => {
  const { Message } = getTenantModels(req);
  const conversation = await findAccessibleConversation(req, req.params.id);
  const { limit = 50, before } = req.query;

  if (!conversation) {
    return res.status(404).json({ message: "Chat not found." });
  }

  await Message.updateMany(
    {
      instituteId: req.tenant._id,
      conversationId: conversation._id,
      senderId: { $ne: req.user._id },
      deliveredTo: { $ne: req.user._id },
    },
    {
      $addToSet: { deliveredTo: req.user._id },
    },
  );

  const query = {
    instituteId: req.tenant._id,
    conversationId: conversation._id,
  };

  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .populate("senderId", "name email")
    .populate("readBy", "name email")
    .populate("deliveredTo", "name email");

  const serialized = await formatMessagesForClient(
    req,
    conversation,
    messages.reverse(),
  );
  res.json(serialized);
});

export const toggleMuteConversation = asyncHandler(async (req, res) => {
  const { User } = getTenantModels(req);
  const { id } = req.params; // conversationId

  const user = await User.findById(req.user._id);
  const isMuted = user.mutedConversationIds.some((cid) => String(cid) === String(id));

  if (isMuted) {
    user.mutedConversationIds = user.mutedConversationIds.filter(
      (cid) => String(cid) !== String(id),
    );
  } else {
    user.mutedConversationIds.push(id);
  }

  await user.save();
  res.json({ ok: true, isMuted: !isMuted });
});

export const toggleBlockUser = asyncHandler(async (req, res) => {
  const { User } = getTenantModels(req);
  const { id } = req.params; // conversationId

  const conversation = await findAccessibleConversation(req, id);
  if (!conversation || conversation.conversationType !== "direct") {
    return res.status(404).json({ message: "Direct conversation not found." });
  }

  const partnerId =
    String(conversation.requesterId) === String(req.user._id)
      ? conversation.mentorId
      : conversation.requesterId;

  const user = await User.findById(req.user._id);
  const isBlocked = user.blockedUserIds.some(
    (bid) => String(bid) === String(partnerId),
  );

  if (isBlocked) {
    user.blockedUserIds = user.blockedUserIds.filter(
      (bid) => String(bid) !== String(partnerId),
    );
  } else {
    user.blockedUserIds.push(partnerId);
  }

  await user.save();
  res.json({ ok: true, isBlocked: !isBlocked });
});
