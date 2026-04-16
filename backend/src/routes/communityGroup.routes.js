import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { isNonEmptyString, isObjectIdLike } from "../utils/validation.js";

const router = express.Router();

function validateGroupBody(body) {
  const issues = [];

  if (!isNonEmptyString(body.name)) {
    issues.push("Group name is required");
  }

  if (!["interest", "class", "year"].includes(body.groupType)) {
    issues.push("Group type must be interest, class, or year");
  }

  if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
    issues.push("Description must be a string");
  }

  if (body.audienceLabel !== undefined && body.audienceLabel !== null && typeof body.audienceLabel !== "string") {
    issues.push("Audience label must be a string");
  }

  if (!Array.isArray(body.memberUserIds)) {
    issues.push("Member list is required");
  } else if (body.memberUserIds.some((id) => !isObjectIdLike(id))) {
    issues.push("All group members must be valid user ids");
  }

  return issues;
}

function validateGroupId(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid group id"];
}

function validateGroupMessageBody(body) {
  return isNonEmptyString(body.content) ? [] : ["Message content is required"];
}

async function buildMemberProfileMap(AlumniProfile, memberIds) {
  const profiles = await AlumniProfile.find({
    userId: { $in: memberIds }
  }).select("userId batch department leavingYear lastClassAttended section company designation location");

  return new Map(profiles.map((profile) => [profile.userId.toString(), profile]));
}

function formatGroup(group, profileByUserId, viewer) {
  const members = (group.memberIds || []).map((member) => {
    const memberId = member?._id?.toString?.() || member?.toString?.() || "";
    const profile = profileByUserId.get(memberId);

    return {
      id: memberId,
      name: member?.name || "Unknown Member",
      email: member?.email || "",
      batch: profile?.batch ?? null,
      department: profile?.department || "",
      leavingYear: profile?.leavingYear ?? null,
      lastClassAttended: profile?.lastClassAttended || "",
      section: profile?.section || "",
      company: profile?.company || "",
      designation: profile?.designation || "",
      location: profile?.location || ""
    };
  });

  const messages = (group.messages || []).map((message) => {
    const senderId = message.senderId?._id?.toString?.() || message.senderId?.toString?.() || "";
    const senderProfile = profileByUserId.get(senderId);

    return {
      _id: message._id,
      content: message.content,
      sentAt: message.sentAt,
      sender: {
        id: senderId,
        name: message.senderId?.name || "Unknown Member",
        email: message.senderId?.email || "",
        batch: senderProfile?.batch ?? null,
        department: senderProfile?.department || "",
        leavingYear: senderProfile?.leavingYear ?? null,
        lastClassAttended: senderProfile?.lastClassAttended || "",
        company: senderProfile?.company || "",
        designation: senderProfile?.designation || "",
        location: senderProfile?.location || ""
      }
    };
  });

  const isAdminViewer = viewer?.role === "institute_admin";
  const viewerId = viewer?._id?.toString?.() || "";
  const isMemberViewer = members.some((member) => member.id === viewerId);
  const canViewChat = isAdminViewer || isMemberViewer;
  const visibleMessages = canViewChat ? messages : [];
  const latestMessage = canViewChat ? messages[messages.length - 1] || null : null;

  return {
    _id: group._id,
    name: group.name,
    description: group.description || "",
    groupType: group.groupType,
    audienceLabel: group.audienceLabel || "",
    memberCount: members.length,
    members,
    canViewChat,
    messages: visibleMessages,
    latestMessage,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt
  };
}

async function assertValidMembers(User, req, memberUserIds) {
  const uniqueMemberIds = [...new Set(memberUserIds.map((id) => String(id)))];
  const members = await User.find({
    _id: { $in: uniqueMemberIds },
    instituteId: req.tenant._id,
    role: "alumni",
    isActive: true
  }).select("name email");

  if (members.length !== uniqueMemberIds.length) {
    const error = new Error("One or more selected members are invalid or inactive");
    error.statusCode = 400;
    throw error;
  }

  return uniqueMemberIds;
}

async function formatGroupsWithProfiles(CommunityGroup, AlumniProfile, query, viewer) {
  const groups = await CommunityGroup.find(query)
    .populate("memberIds", "name email")
    .populate("messages.senderId", "name email")
    .sort({ updatedAt: -1, name: 1 });

  const memberIds = groups
    .flatMap((group) => [
      ...(group.memberIds || []).map((member) => member?._id),
      ...(group.messages || []).map((message) => message.senderId?._id)
    ])
    .filter(Boolean);

  const profileByUserId = await buildMemberProfileMap(AlumniProfile, memberIds);
  return groups.map((group) => formatGroup(group, profileByUserId, viewer));
}

async function findGroupForMemberAccess(CommunityGroup, req, groupId) {
  const filter = {
    _id: groupId,
    instituteId: req.tenant._id
  };

  if (req.user.role !== "institute_admin") {
    filter.memberIds = req.user._id;
  }

  const group = await CommunityGroup.findOne(filter)
    .populate("memberIds", "name email")
    .populate("messages.senderId", "name email");

  if (!group) {
    const error = new Error("Group not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  return group;
}

router.get("/", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const { CommunityGroup, AlumniProfile } = getTenantModels(req);
    res.json(await formatGroupsWithProfiles(CommunityGroup, AlumniProfile, { instituteId: req.tenant._id }, req.user));
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateBody(validateGroupBody),
  async (req, res, next) => {
    try {
      const { CommunityGroup, User, AlumniProfile } = getTenantModels(req);
      const memberUserIds = await assertValidMembers(User, req, req.body.memberUserIds || []);

      const created = await CommunityGroup.create({
        instituteId: req.tenant._id,
        name: req.body.name.trim(),
        description: req.body.description?.trim?.() || "",
        groupType: req.body.groupType,
        audienceLabel: req.body.audienceLabel?.trim?.() || "",
        memberIds: memberUserIds,
        createdBy: req.user._id
      });

      await created.populate("memberIds", "name email");
      const profileByUserId = await buildMemberProfileMap(AlumniProfile, created.memberIds.map((member) => member._id));
      res.status(201).json(formatGroup(created, profileByUserId));
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateParams(validateGroupId),
  validateBody(validateGroupBody),
  async (req, res, next) => {
    try {
      const { CommunityGroup, User, AlumniProfile } = getTenantModels(req);
      const memberUserIds = await assertValidMembers(User, req, req.body.memberUserIds || []);

      const group = await CommunityGroup.findOneAndUpdate(
        {
          _id: req.params.id,
          instituteId: req.tenant._id
        },
        {
          name: req.body.name.trim(),
          description: req.body.description?.trim?.() || "",
          groupType: req.body.groupType,
          audienceLabel: req.body.audienceLabel?.trim?.() || "",
          memberIds: memberUserIds
        },
        {
          new: true,
          runValidators: true
        }
      ).populate("memberIds", "name email");

      if (!group) {
        const error = new Error("Group not found");
        error.statusCode = 404;
        throw error;
      }

      const profileByUserId = await buildMemberProfileMap(AlumniProfile, group.memberIds.map((member) => member._id));
      res.json(formatGroup(group, profileByUserId));
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateParams(validateGroupId),
  async (req, res, next) => {
    try {
      const { CommunityGroup } = getTenantModels(req);
      const deleted = await CommunityGroup.findOneAndDelete({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!deleted) {
        const error = new Error("Group not found");
        error.statusCode = 404;
        throw error;
      }

      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/messages",
  protect,
  requireTenantAccess,
  validateParams(validateGroupId),
  validateBody(validateGroupMessageBody),
  async (req, res, next) => {
    try {
      const { CommunityGroup, AlumniProfile } = getTenantModels(req);
      const group = await findGroupForMemberAccess(CommunityGroup, req, req.params.id);

      const isMember = (group.memberIds || []).some((member) => member._id.toString() === req.user._id.toString());
      if (!isMember && req.user.role !== "institute_admin") {
        const error = new Error("Only group members can send messages");
        error.statusCode = 403;
        throw error;
      }

      group.messages.push({
        senderId: req.user._id,
        content: req.body.content.trim(),
        sentAt: new Date()
      });
      await group.save();
      await group.populate("messages.senderId", "name email");

      const memberIds = [
        ...(group.memberIds || []).map((member) => member._id),
        ...(group.messages || []).map((message) => message.senderId?._id)
      ].filter(Boolean);
      const profileByUserId = await buildMemberProfileMap(AlumniProfile, memberIds);
      const formatted = formatGroup(group, profileByUserId, req.user);
      const latestMessage = formatted.messages[formatted.messages.length - 1] || null;

      res.status(201).json({
        groupId: formatted._id,
        message: latestMessage
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
