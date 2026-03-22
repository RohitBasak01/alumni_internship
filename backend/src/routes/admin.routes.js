import crypto from "node:crypto";
import express from "express";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.middleware.js";
import AlumniProfile from "../models/AlumniProfile.js";
import Announcement from "../models/Announcement.js";
import AuditLog from "../models/AuditLog.js";
import Event from "../models/Event.js";
import Institute from "../models/Institute.js";
import Job from "../models/Job.js";
import MentorshipRequest from "../models/MentorshipRequest.js";
import User from "../models/User.js";
import { logAuditEvent } from "../utils/audit.js";
import { sendInviteEmail } from "../utils/email.js";
import { isNonEmptyString, isObjectIdLike } from "../utils/validation.js";

const router = express.Router();

function validateInstituteId(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid institute id"];
}

function validateAuditLogQuery(query) {
  const issues = [];

  if (query.instituteId && !isObjectIdLike(query.instituteId)) {
    issues.push("Invalid institute id filter");
  }

  if (query.limit && (!Number.isInteger(Number(query.limit)) || Number(query.limit) < 1 || Number(query.limit) > 100)) {
    issues.push("Limit must be between 1 and 100");
  }

  return issues;
}

function validateSubscriptionBody(body) {
  const issues = [];

  if (!["basic", "pro", "enterprise"].includes(body.subscriptionPlan)) {
    issues.push("Subscription plan must be basic, pro, or enterprise");
  }

  if (!["inactive", "trial", "active", "expired"].includes(body.subscriptionStatus)) {
    issues.push("Subscription status must be inactive, trial, active, or expired");
  }

  if (body.amount !== undefined && (Number.isNaN(Number(body.amount)) || Number(body.amount) < 0)) {
    issues.push("Amount must be a non-negative number");
  }

  if (body.renewalDate && Number.isNaN(Date.parse(body.renewalDate))) {
    issues.push("Renewal date must be a valid date");
  }

  return issues;
}

function hashInviteToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildInviteUrl(rawInviteToken) {
  return `${process.env.CLIENT_URL || "http://localhost:5173"}/setup-password/${rawInviteToken}`;
}

function issueInviteToken(user) {
  const rawInviteToken = crypto.randomBytes(24).toString("hex");
  user.inviteTokenHash = hashInviteToken(rawInviteToken);
  user.inviteTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  user.passwordSetupCompleted = false;
  user.isActive = false;

  return {
    inviteUrl: buildInviteUrl(rawInviteToken),
    expiresAt: user.inviteTokenExpiresAt
  };
}

async function buildInstituteDetail(instituteId) {
  const institute = await Institute.findById(instituteId);

  if (!institute) {
    const error = new Error("Institute not found");
    error.statusCode = 404;
    throw error;
  }

  const [adminUsers, alumniProfilesCount, activeAlumniUsersCount, eventsCount, jobsCount, announcementsCount, pendingMentorshipRequests, recentEvents, recentJobs, recentAnnouncements] =
    await Promise.all([
      User.find({ instituteId, role: "institute_admin" })
        .select("name email isActive passwordSetupCompleted inviteTokenHash inviteTokenExpiresAt createdAt")
        .sort({ createdAt: -1 }),
      AlumniProfile.countDocuments({ instituteId }),
      User.countDocuments({ instituteId, role: "alumni", isActive: true }),
      Event.countDocuments({ instituteId }),
      Job.countDocuments({ instituteId }),
      Announcement.countDocuments({ instituteId }),
      MentorshipRequest.countDocuments({ instituteId, status: "pending" }),
      Event.find({ instituteId }).select("title eventDate location createdAt").sort({ createdAt: -1 }).limit(3),
      Job.find({ instituteId }).select("title company status createdAt").sort({ createdAt: -1 }).limit(3),
      Announcement.find({ instituteId }).select("title status createdAt").sort({ createdAt: -1 }).limit(3)
    ]);

  const recentActivity = [
    ...recentAnnouncements.map((item) => ({
      id: item._id,
      type: "announcement",
      title: item.title,
      meta: item.status,
      createdAt: item.createdAt
    })),
    ...recentEvents.map((item) => ({
      id: item._id,
      type: "event",
      title: item.title,
      meta: item.location || item.eventDate?.toISOString?.() || "",
      createdAt: item.createdAt
    })),
    ...recentJobs.map((item) => ({
      id: item._id,
      type: "job",
      title: item.title,
      meta: `${item.company} | ${item.status}`,
      createdAt: item.createdAt
    }))
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return {
    institute: {
      ...institute.toObject(),
      billingHistory: (institute.billingHistory || []).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
    },
    admins: adminUsers.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      passwordSetupCompleted: user.passwordSetupCompleted,
      inviteExpiresAt: user.inviteTokenExpiresAt,
      onboardingStatus: user.passwordSetupCompleted ? "ready" : user.inviteTokenHash ? "invited" : "pending_setup",
      createdAt: user.createdAt
    })),
    metrics: {
      adminsCount: adminUsers.length,
      alumniProfilesCount,
      activeAlumniUsersCount,
      eventsCount,
      jobsCount,
      announcementsCount,
      pendingMentorshipRequests
    },
    support: {
      hasPendingAdminSetup: adminUsers.some((user) => !user.passwordSetupCompleted),
      inactiveAdminCount: adminUsers.filter((user) => !user.isActive).length,
      pendingMentorshipRequests
    },
    recentActivity
  };
}

router.get("/analytics", protect, authorize("super_admin"), async (_req, res, next) => {
  try {
    const totalRsvpsPromise = Event.aggregate([
      {
        $project: {
          registrationCount: {
            $size: {
              $ifNull: ["$registrations", []]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$registrationCount" }
        }
      }
    ]).then((result) => result[0]?.total || 0);

    const institutesByPlanPromise = Institute.aggregate([
      {
        $group: {
          _id: {
            $ifNull: ["$subscriptionPlan", "unknown"]
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const [
      totalInstitutes,
      activeInstitutes,
      pendingInstitutes,
      suspendedInstitutes,
      totalAlumniProfiles,
      activeAlumniUsers,
      totalEvents,
      totalJobs,
      publishedJobs,
      totalRsvps,
      totalMentorshipRequests,
      pendingMentorshipRequests,
      institutesByPlan
    ] = await Promise.all([
      Institute.countDocuments(),
      Institute.countDocuments({ status: "active" }),
      Institute.countDocuments({ status: "pending" }),
      Institute.countDocuments({ status: "suspended" }),
      AlumniProfile.countDocuments(),
      User.countDocuments({ role: "alumni", isActive: true }),
      Event.countDocuments(),
      Job.countDocuments(),
      Job.countDocuments({ status: "published" }),
      totalRsvpsPromise,
      MentorshipRequest.countDocuments(),
      MentorshipRequest.countDocuments({ status: "pending" }),
      institutesByPlanPromise
    ]);

    res.json({
      totals: {
        totalInstitutes,
        activeInstitutes,
        pendingInstitutes,
        suspendedInstitutes,
        totalAlumniProfiles,
        activeAlumniUsers,
        totalEvents,
        totalJobs,
        publishedJobs,
        totalRsvps,
        totalMentorshipRequests,
        pendingMentorshipRequests
      },
      institutesByPlan: institutesByPlan.map((item) => ({
        plan: item._id || "unknown",
        count: item.count
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/support-overview", protect, authorize("super_admin"), async (_req, res, next) => {
  try {
    const [pendingInstituteRequests, suspendedInstitutes, pendingInstituteAdminSetup, inactiveInstituteAdmins, pendingAlumniInvites, expiredInvites] =
      await Promise.all([
        Institute.countDocuments({ status: "pending" }),
        Institute.countDocuments({ status: "suspended" }),
        User.countDocuments({ role: "institute_admin", passwordSetupCompleted: false }),
        User.countDocuments({ role: "institute_admin", isActive: false }),
        User.countDocuments({ role: "alumni", passwordSetupCompleted: false, inviteTokenHash: { $ne: null } }),
        User.countDocuments({ inviteTokenExpiresAt: { $lt: new Date() }, passwordSetupCompleted: false })
      ]);

    res.json({
      pendingInstituteRequests,
      suspendedInstitutes,
      pendingInstituteAdminSetup,
      inactiveInstituteAdmins,
      pendingAlumniInvites,
      expiredInvites
    });
  } catch (error) {
    next(error);
  }
});

router.get("/audit-logs", protect, authorize("super_admin"), validateQuery(validateAuditLogQuery), async (req, res, next) => {
  try {
    const filter = {};

    if (isNonEmptyString(req.query.action)) {
      filter.action = req.query.action.trim();
    }

    if (isNonEmptyString(req.query.instituteId)) {
      filter.instituteId = req.query.instituteId.trim();
    }

    const limit = req.query.limit ? Number(req.query.limit) : 30;

    const logs = await AuditLog.find(filter)
      .populate("actorId", "name email role")
      .populate("instituteId", "name subdomain")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(
      logs.map((log) => ({
        _id: log._id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        actor: log.actorId
          ? {
              id: log.actorId._id,
              name: log.actorId.name,
              email: log.actorId.email,
              role: log.actorId.role
            }
          : null,
        institute: log.instituteId
          ? {
              id: log.instituteId._id,
              name: log.instituteId.name,
              subdomain: log.instituteId.subdomain
            }
          : null,
        metadata: log.metadata || {},
        createdAt: log.createdAt
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.get("/institutes/:id", protect, authorize("super_admin"), validateParams(validateInstituteId), async (req, res, next) => {
  try {
    res.json(await buildInstituteDetail(req.params.id));
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/institutes/:id/subscription",
  protect,
  authorize("super_admin"),
  validateParams(validateInstituteId),
  validateBody(validateSubscriptionBody),
  async (req, res, next) => {
    try {
      const institute = await Institute.findById(req.params.id);

      if (!institute) {
        const error = new Error("Institute not found");
        error.statusCode = 404;
        throw error;
      }

      institute.subscriptionPlan = req.body.subscriptionPlan;
      institute.subscriptionStatus = req.body.subscriptionStatus;
      institute.subscriptionRenewsAt = req.body.renewalDate ? new Date(req.body.renewalDate) : null;
      institute.lastPaymentAt = req.body.amount ? new Date() : institute.lastPaymentAt;

      if (req.body.subscriptionStatus === "active") {
        institute.status = "active";
      } else if (req.body.subscriptionStatus === "inactive" || req.body.subscriptionStatus === "expired") {
        institute.status = "suspended";
      }

      institute.billingHistory = [
        {
          plan: req.body.subscriptionPlan,
          status: req.body.subscriptionStatus,
          amount: Number(req.body.amount || 0),
          currency: req.body.currency || "INR",
          paidAt: req.body.amount ? new Date() : new Date(),
          notes: req.body.notes?.trim?.() || ""
        },
        ...(institute.billingHistory || [])
      ].slice(0, 25);

      await institute.save();

      if (institute.status === "active") {
        await User.updateMany(
          {
            instituteId: institute._id,
            passwordSetupCompleted: true
          },
          {
            $set: { isActive: true }
          }
        );
      }

      if (institute.status === "suspended") {
        await User.updateMany(
          {
            instituteId: institute._id
          },
          {
            $set: { isActive: false }
          }
        );
      }

      res.json(await buildInstituteDetail(institute._id));

      await logAuditEvent(req, {
        action: "institute.subscription_updated",
        targetType: "Institute",
        targetId: institute._id.toString(),
        instituteId: institute._id,
        metadata: {
          subscriptionPlan: institute.subscriptionPlan,
          subscriptionStatus: institute.subscriptionStatus,
          renewalDate: institute.subscriptionRenewsAt?.toISOString?.() || null,
          amount: Number(req.body.amount || 0)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/institutes/:id/resend-admin-invite", protect, authorize("super_admin"), validateParams(validateInstituteId), async (req, res, next) => {
  try {
    const institute = await Institute.findById(req.params.id);

    if (!institute) {
      const error = new Error("Institute not found");
      error.statusCode = 404;
      throw error;
    }

    const adminUser = await User.findOne({
      instituteId: institute._id,
      role: "institute_admin"
    });

    if (!adminUser) {
      const error = new Error("Institute admin not found");
      error.statusCode = 404;
      throw error;
    }

    if (adminUser.passwordSetupCompleted && adminUser.isActive) {
      const error = new Error("Institute admin is already active");
      error.statusCode = 400;
      throw error;
    }

    const { inviteUrl, expiresAt } = issueInviteToken(adminUser);
    await adminUser.save();

    const emailDelivery = await sendInviteEmail({
      to: adminUser.email,
      recipientName: adminUser.name,
      instituteName: institute.name,
      inviteUrl,
      expiresAt,
      portalRoleLabel: "institute admin"
    });

    res.json({
      invite: {
        email: adminUser.email,
        inviteUrl,
        expiresAt,
        message: emailDelivery.message
      },
      emailDelivery
    });

    await logAuditEvent(req, {
      action: "institute.admin_invite_resent",
      targetType: "User",
      targetId: adminUser._id.toString(),
      instituteId: institute._id,
      metadata: {
        adminEmail: adminUser.email,
        deliveryMode: emailDelivery.mode
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
