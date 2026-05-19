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
import Friendship from "../models/Friendship.js";
import User from "../models/User.js";
import { logAuditEvent } from "../utils/audit.js";
import { buildCheckoutRedirectUrl, createStripeCheckoutSession, getPlanMonthlyPrice } from "../utils/billing.js";
import { sendInviteEmail } from "../utils/email.js";
import { getInstituteTenantModels, getInstituteTenantSummary, getPlatformTenantSummaries } from "../utils/tenantAdminData.js";
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

function validateHierarchyBody(body) {
  const issues = [];

  if (!["standalone", "group_lead", "group_member"].includes(body.hierarchyType)) {
    issues.push("Hierarchy type must be standalone, group_lead, or group_member");
  }

  if (body.hierarchyType === "group_member" && !isObjectIdLike(body.parentInstituteId)) {
    issues.push("A valid lead institute is required for group members");
  }

  return issues;
}

function validateCheckoutBody(body) {
  const issues = [];

  if (!["pro", "enterprise"].includes(body.subscriptionPlan)) {
    issues.push("Checkout plan must be pro or enterprise");
  }

  if (body.successUrl && !String(body.successUrl).startsWith("http")) {
    issues.push("Success URL must be an absolute URL");
  }

  if (body.cancelUrl && !String(body.cancelUrl).startsWith("http")) {
    issues.push("Cancel URL must be an absolute URL");
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

function buildHierarchyCapabilities(bodyCapabilities = {}, currentCapabilities = {}) {
  const defaultCapabilities = {
    billing: true,
    admins: true,
    branding: true,
    reporting: true,
    contentModeration: true
  };
  const incoming = bodyCapabilities && typeof bodyCapabilities === "object" ? bodyCapabilities : {};

  return Object.fromEntries(
    Object.entries(defaultCapabilities).map(([key, defaultValue]) => [
      key,
      incoming[key] !== undefined ? Boolean(incoming[key]) : Boolean(currentCapabilities?.[key] ?? defaultValue)
    ])
  );
}

async function buildInstituteDetail(instituteId) {
  const institute = await Institute.findById(instituteId);

  if (!institute) {
    const error = new Error("Institute not found");
    error.statusCode = 404;
    throw error;
  }

  const { admins: adminUsers, metrics, support, recentActivity } = await getInstituteTenantSummary(institute, {
    includeAdmins: true,
    includeRecentActivity: true
  });
  const [parentInstitute, childInstitutes] = await Promise.all([
    institute.parentInstituteId
      ? Institute.findById(institute.parentInstituteId).select("name subdomain domain status subscriptionPlan hierarchyType")
      : Promise.resolve(null),
    Institute.find({ parentInstituteId: institute._id })
      .select("name subdomain domain status subscriptionPlan subscriptionStatus hierarchyType")
      .sort({ name: 1 })
  ]);

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
      alumniProfilesCount: metrics.alumniProfilesCount,
      activeAlumniUsersCount: metrics.activeAlumniUsersCount,
      eventsCount: metrics.eventsCount,
      jobsCount: metrics.jobsCount,
      announcementsCount: metrics.announcementsCount,
      pendingFriendships: metrics.pendingFriendships
    },
    support: {
      hasPendingAdminSetup: support.hasPendingAdminSetup,
      inactiveAdminCount: support.inactiveAdminCount,
      pendingFriendships: metrics.pendingFriendships
    },
    hierarchy: {
      type: institute.hierarchyType || "standalone",
      capabilities: buildHierarchyCapabilities({}, institute.hierarchyCapabilities || {}),
      parent: parentInstitute
        ? {
            _id: parentInstitute._id,
            name: parentInstitute.name,
            subdomain: parentInstitute.subdomain,
            domain: parentInstitute.domain,
            status: parentInstitute.status,
            subscriptionPlan: parentInstitute.subscriptionPlan,
            hierarchyType: parentInstitute.hierarchyType || "standalone"
          }
        : null,
      children: childInstitutes.map((child) => ({
        _id: child._id,
        name: child.name,
        subdomain: child.subdomain,
        domain: child.domain,
        status: child.status,
        subscriptionPlan: child.subscriptionPlan,
        subscriptionStatus: child.subscriptionStatus,
        hierarchyType: child.hierarchyType || "group_member"
      }))
    },
    recentActivity
  };
}

router.get("/analytics", protect, authorize("super_admin"), async (_req, res, next) => {
  try {
    const institutes = await Institute.find().sort({ createdAt: -1 });
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

    const monthAnchors = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - (5 - index));

      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString("en-US", { month: "short" }),
        year: date.getFullYear(),
        month: date.getMonth()
      };
    });

    const summaries = await getPlatformTenantSummaries(institutes);
    const totals = summaries.reduce(
          (accumulator, item) => ({
            totalInstitutes: accumulator.totalInstitutes + 1,
            activeInstitutes: accumulator.activeInstitutes + (item.institute.status === "active" ? 1 : 0),
            pendingInstitutes: accumulator.pendingInstitutes + (item.institute.status === "pending" ? 1 : 0),
            suspendedInstitutes: accumulator.suspendedInstitutes + (item.institute.status === "suspended" ? 1 : 0),
            totalAlumniProfiles: accumulator.totalAlumniProfiles + item.summary.metrics.alumniProfilesCount,
            activeAlumniUsers: accumulator.activeAlumniUsers + item.summary.metrics.activeAlumniUsersCount,
            totalEvents: accumulator.totalEvents + item.summary.metrics.eventsCount,
            totalJobs: accumulator.totalJobs + item.summary.metrics.jobsCount,
            publishedJobs: accumulator.publishedJobs + item.summary.metrics.publishedJobsCount,
            totalRsvps: accumulator.totalRsvps + item.summary.metrics.totalRsvps,
            totalFriendships: accumulator.totalFriendships + item.summary.metrics.friendshipRequestsCount,
            pendingFriendships: accumulator.pendingFriendships + item.summary.metrics.pendingFriendships
          }),
          {
            totalInstitutes: 0,
            activeInstitutes: 0,
            pendingInstitutes: 0,
            suspendedInstitutes: 0,
            totalAlumniProfiles: 0,
            activeAlumniUsers: 0,
            totalEvents: 0,
            totalJobs: 0,
            publishedJobs: 0,
            totalRsvps: 0,
            totalFriendships: 0,
            pendingFriendships: 0
          }
        );

    const [institutesByPlan] = await Promise.all([institutesByPlanPromise]);

    const revenueByMonth = monthAnchors.map((anchor) => ({
      label: anchor.label,
      value: institutes.reduce((sum, institute) => {
        return (
          sum +
          (institute.billingHistory || [])
            .filter((item) => {
              const paidAt = item.paidAt ? new Date(item.paidAt) : null;
              return paidAt && paidAt.getFullYear() === anchor.year && paidAt.getMonth() === anchor.month;
            })
            .reduce((total, item) => total + Number(item.amount || 0), 0)
        );
      }, 0)
    }));

    const newInstitutesByMonth = monthAnchors.map((anchor) => ({
      label: anchor.label,
      value: institutes.filter((institute) => {
        const createdAt = institute.createdAt ? new Date(institute.createdAt) : null;
        return createdAt && createdAt.getFullYear() === anchor.year && createdAt.getMonth() === anchor.month;
      }).length
    }));

    const currentMrr = institutes.reduce((sum, institute) => {
      return institute.subscriptionStatus === "active" ? sum + getPlanMonthlyPrice(institute.subscriptionPlan) : sum;
    }, 0);
    const paidInstitutes = institutes.filter((institute) => institute.subscriptionStatus === "active" && institute.subscriptionPlan !== "basic").length;
    const churnRiskInstitutes = institutes.filter((institute) => {
      if (institute.subscriptionStatus !== "active" || !institute.subscriptionRenewsAt) {
        return false;
      }

      const daysUntilRenewal = (new Date(institute.subscriptionRenewsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilRenewal >= 0 && daysUntilRenewal <= 14;
    }).length;

    res.json({
      totals,
      billing: {
        currentMrr,
        paidInstitutes,
        arpu: institutes.length ? currentMrr / institutes.length : 0,
        churnRiskInstitutes,
        overdueInstitutes: institutes.filter((institute) => institute.subscriptionStatus === "expired").length
      },
      trends: {
        revenueByMonth,
        newInstitutesByMonth
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

router.post(
  "/institutes/:id/payment-checkout",
  protect,
  authorize("super_admin"),
  validateParams(validateInstituteId),
  validateBody(validateCheckoutBody),
  async (req, res, next) => {
    try {
      const institute = await Institute.findById(req.params.id);

      if (!institute) {
        const error = new Error("Institute not found");
        error.statusCode = 404;
        throw error;
      }

      const successUrl =
        req.body.successUrl || buildCheckoutRedirectUrl("/admin/subscriptions/payment-success", institute._id);
      const cancelUrl =
        req.body.cancelUrl || buildCheckoutRedirectUrl("/admin/subscriptions/payment-cancelled", institute._id);

      const checkout = await createStripeCheckoutSession({
        institute,
        subscriptionPlan: req.body.subscriptionPlan,
        successUrl,
        cancelUrl
      });

      institute.billingHistory = [
        {
          plan: req.body.subscriptionPlan,
          status: "checkout_created",
          amount: getPlanMonthlyPrice(req.body.subscriptionPlan),
          currency: "USD",
          paidAt: new Date(),
          notes: checkout.mode === "mock" ? "Mock Stripe checkout created" : "Stripe checkout session created",
          provider: "stripe",
          externalId: checkout.id
        },
        ...(institute.billingHistory || [])
      ].slice(0, 25);
      await institute.save();

      res.status(201).json(checkout);

      await logAuditEvent(req, {
        action: "billing.checkout_created",
        targetType: "Institute",
        targetId: institute._id.toString(),
        instituteId: institute._id,
        metadata: {
          subscriptionPlan: req.body.subscriptionPlan,
          provider: "stripe",
          mode: checkout.mode,
          checkoutSessionId: checkout.id
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/support-overview", protect, authorize("super_admin"), async (_req, res, next) => {
  try {
    const now = new Date();
    const institutes = await Institute.find().sort({ createdAt: -1 });
    const [pendingInstituteRequests, suspendedInstitutes, instituteSupportCounts] = await Promise.all([
      Institute.countDocuments({ status: "pending" }),
      Institute.countDocuments({ status: "suspended" }),
      Promise.all(
        institutes.map(async (institute) => {
          const { User: TenantUser } = await getInstituteTenantModels(institute);

          const [pendingInstituteAdminSetup, inactiveInstituteAdmins, pendingAlumniInvites, expiredInvites] = await Promise.all([
            TenantUser.countDocuments({ instituteId: institute._id, role: "institute_admin", passwordSetupCompleted: false }),
            TenantUser.countDocuments({ instituteId: institute._id, role: "institute_admin", isActive: false }),
            TenantUser.countDocuments({
              instituteId: institute._id,
              role: "alumni",
              passwordSetupCompleted: false,
              inviteTokenHash: { $ne: null }
            }),
            TenantUser.countDocuments({
              instituteId: institute._id,
              inviteTokenExpiresAt: { $lt: now },
              passwordSetupCompleted: false
            })
          ]);

          return {
            pendingInstituteAdminSetup,
            inactiveInstituteAdmins,
            pendingAlumniInvites,
            expiredInvites
          };
        })
      )
    ]);

    const totals = instituteSupportCounts.reduce(
      (accumulator, item) => ({
        pendingInstituteAdminSetup: accumulator.pendingInstituteAdminSetup + item.pendingInstituteAdminSetup,
        inactiveInstituteAdmins: accumulator.inactiveInstituteAdmins + item.inactiveInstituteAdmins,
        pendingAlumniInvites: accumulator.pendingAlumniInvites + item.pendingAlumniInvites,
        expiredInvites: accumulator.expiredInvites + item.expiredInvites
      }),
      {
        pendingInstituteAdminSetup: 0,
        inactiveInstituteAdmins: 0,
        pendingAlumniInvites: 0,
        expiredInvites: 0
      }
    );

    res.json({
      pendingInstituteRequests,
      suspendedInstitutes,
      pendingInstituteAdminSetup: totals.pendingInstituteAdminSetup,
      inactiveInstituteAdmins: totals.inactiveInstituteAdmins,
      pendingAlumniInvites: totals.pendingAlumniInvites,
      expiredInvites: totals.expiredInvites
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
      institute.billingProvider = "manual";

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
          notes: req.body.notes?.trim?.() || "",
          provider: "manual",
          externalId: ""
        },
        ...(institute.billingHistory || [])
      ].slice(0, 25);

      await institute.save();

      if (institute.status === "active") {
        const { User: TenantUser } = await getInstituteTenantModels(institute);
        await TenantUser.updateMany(
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
        const { User: TenantUser } = await getInstituteTenantModels(institute);
        await TenantUser.updateMany(
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

router.patch(
  "/institutes/:id/hierarchy",
  protect,
  authorize("super_admin"),
  validateParams(validateInstituteId),
  validateBody(validateHierarchyBody),
  async (req, res, next) => {
    try {
      const institute = await Institute.findById(req.params.id);

      if (!institute) {
        const error = new Error("Institute not found");
        error.statusCode = 404;
        throw error;
      }

      const hierarchyType = req.body.hierarchyType;
      let parentInstitute = null;

      if (hierarchyType === "group_member") {
        if (String(req.body.parentInstituteId) === institute._id.toString()) {
          const error = new Error("An institute cannot manage itself");
          error.statusCode = 400;
          throw error;
        }

        parentInstitute = await Institute.findById(req.body.parentInstituteId);

        if (!parentInstitute) {
          const error = new Error("Lead institute not found");
          error.statusCode = 404;
          throw error;
        }

        if (parentInstitute.parentInstituteId?.toString?.() === institute._id.toString()) {
          const error = new Error("Circular institute hierarchy is not allowed");
          error.statusCode = 409;
          throw error;
        }

        parentInstitute.hierarchyType = "group_lead";
        parentInstitute.parentInstituteId = null;
        await parentInstitute.save();
      }

      if (hierarchyType === "standalone") {
        const childCount = await Institute.countDocuments({ parentInstituteId: institute._id });

        if (childCount > 0) {
          const error = new Error("Move or detach member institutes before making this lead standalone");
          error.statusCode = 409;
          throw error;
        }
      }

      institute.hierarchyType = hierarchyType;
      institute.parentInstituteId = hierarchyType === "group_member" ? parentInstitute._id : null;
      institute.hierarchyCapabilities = buildHierarchyCapabilities(
        req.body.hierarchyCapabilities,
        institute.hierarchyCapabilities || {}
      );

      await institute.save();

      res.json(await buildInstituteDetail(institute._id));

      await logAuditEvent(req, {
        action: "institute.hierarchy_updated",
        targetType: "Institute",
        targetId: institute._id.toString(),
        instituteId: institute._id,
        metadata: {
          hierarchyType: institute.hierarchyType,
          parentInstituteId: institute.parentInstituteId?.toString?.() || null,
          updatedBy: req.user.email
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

    const { User: TenantUser } = await getInstituteTenantModels(institute);
    const adminUser = await TenantUser.findOne({
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
        portalRoleLabel: "institute admin",
        institutionType: institute.institutionType || "college"
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
