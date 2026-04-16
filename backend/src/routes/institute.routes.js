import crypto from "node:crypto";
import express from "express";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import AlumniProfile from "../models/AlumniProfile.js";
import Institute from "../models/Institute.js";
import User from "../models/User.js";
import { logAuditEvent } from "../utils/audit.js";
import { hashPassword } from "../utils/auth.js";
import { attachTenantDatabaseContext, buildTenantPersistenceConfig, getTenantModels } from "../db/tenantConnectionManager.js";
import { sendInviteEmail } from "../utils/email.js";
import { getPlatformTenantSummaries } from "../utils/tenantAdminData.js";
import { getDefaultCommunityLabels, getDefaultFeatureFlags } from "../utils/tenantConfig.js";
import { isEmail, isNonEmptyString, isObjectIdLike } from "../utils/validation.js";

const router = express.Router();

function validateInstituteRequestBody(body) {
  const issues = [];

  if (!isNonEmptyString(body.name)) issues.push("Institute name is required");
  if (!isNonEmptyString(body.subdomain)) issues.push("Subdomain is required");
  if (!isNonEmptyString(body.primaryContactName)) issues.push("Primary contact name is required");
  if (!isEmail(body.primaryContactEmail)) issues.push("A valid primary contact email is required");
  if (body.institutionType && !["college", "school"].includes(body.institutionType)) issues.push("Institution type must be college or school");
  if (body.educationLevel && !["k10", "k12", "higher_ed"].includes(body.educationLevel)) issues.push("Education level must be k10, k12, or higher_ed");

  return issues;
}

function validateInstituteId(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid institute id"];
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

function buildDefaultTenantConfig({ name, subdomain }) {
  return buildTenantPersistenceConfig({
    name,
    subdomain,
    dataIsolationMode: process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared"
  });
}

router.get("/public", async (_req, res, next) => {
  try {
    const institutes = await Institute.find({ status: "active" })
      .select("name subdomain domain institutionType educationLevel communityLabels")
      .sort({ name: 1 });

    res.json(institutes);
  } catch (error) {
    next(error);
  }
});
router.post("/request", validateBody(validateInstituteRequestBody), async (req, res, next) => {
  try {
    const {
      name,
      subdomain,
      domain,
      institutionType,
      educationLevel,
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone
    } = req.body;

    if (!name || !subdomain || !primaryContactName || !primaryContactEmail) {
      const error = new Error("Name, subdomain, contact name, and contact email are required");
      error.statusCode = 400;
      throw error;
    }

    const normalizedSubdomain = subdomain.trim().toLowerCase();
    const normalizedDomain = domain?.trim().toLowerCase();
    const normalizedEmail = primaryContactEmail.trim().toLowerCase();
    const normalizedInstitutionType = institutionType === "school" ? "school" : "college";
    const normalizedEducationLevel =
      educationLevel || (normalizedInstitutionType === "school" ? "k10" : "higher_ed");

    const [existingInstitute, existingUser] = await Promise.all([
      Institute.findOne({
        $or: [
          { subdomain: normalizedSubdomain },
          ...(normalizedDomain ? [{ domain: normalizedDomain }] : [])
        ]
      }),
      User.findOne({ email: normalizedEmail })
    ]);

    if (existingInstitute) {
      const error = new Error("That subdomain or domain is already in use");
      error.statusCode = 409;
      throw error;
    }

    if (existingUser) {
      const error = new Error("A user with that contact email already exists");
      error.statusCode = 409;
      throw error;
    }

    const institute = await Institute.create({
      name: name.trim(),
      subdomain: normalizedSubdomain,
      domain: normalizedDomain,
      institutionType: normalizedInstitutionType,
      educationLevel: normalizedEducationLevel,
      communityLabels: getDefaultCommunityLabels(normalizedInstitutionType),
      featureFlags: getDefaultFeatureFlags(normalizedInstitutionType),
      dataIsolationMode: process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared",
      tenantDatabaseName: buildDefaultTenantConfig({
        name: name.trim(),
        subdomain: normalizedSubdomain
      }).databaseName,
      primaryContactName: primaryContactName.trim(),
      primaryContactEmail: normalizedEmail,
      primaryContactPhone: primaryContactPhone?.trim() || ""
    });

    const tenantContext = {};
    await attachTenantDatabaseContext(tenantContext, institute);
    const TenantUser = getTenantModels(tenantContext).User;

    const instituteAdmin = await TenantUser.create({
      instituteId: institute._id,
      name: primaryContactName.trim(),
      email: normalizedEmail,
      passwordHash: await hashPassword(`Pending@${crypto.randomBytes(4).toString("hex")}`),
      role: "institute_admin",
      isActive: false,
      passwordSetupCompleted: false,
      inviteTokenHash: null,
      inviteTokenExpiresAt: null
    });
    const { inviteUrl, expiresAt } = issueInviteToken(instituteAdmin);
    await instituteAdmin.save();

    const emailDelivery = await sendInviteEmail({
      to: instituteAdmin.email,
      recipientName: instituteAdmin.name,
      instituteName: institute.name,
      inviteUrl,
      expiresAt,
      portalRoleLabel: "institute admin"
    });

    res.status(201).json({
      institute,
      tenantProvisioning: {
        isolationMode: institute.dataIsolationMode,
        databaseName: institute.tenantDatabaseName,
        databaseUriConfigured: Boolean(institute.tenantDatabaseUri)
      },
      tenantConfig: {
        institutionType: institute.institutionType,
        educationLevel: institute.educationLevel,
        communityLabels: institute.communityLabels,
        featureFlags: institute.featureFlags
      },
      onboarding: {
        contactEmail: normalizedEmail,
        status: "pending_approval",
        message:
          "Portal request submitted. Set your password from the invite link, then wait for approval before signing in."
      },
      invite: {
        email: instituteAdmin.email,
        inviteUrl,
        expiresAt
      },
      emailDelivery
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", protect, authorize("super_admin"), async (_req, res, next) => {
  try {
    const institutes = await Institute.find().sort({ createdAt: -1 });
    const summaries = await getPlatformTenantSummaries(institutes, { includeAdmins: true });
    const summaryMap = new Map(summaries.map((item) => [item.institute._id.toString(), item.summary]));

    res.json(
      institutes.map((institute) => ({
        ...institute.toObject(),
        memberCount: summaryMap.get(institute._id.toString())?.metrics.alumniProfilesCount || 0,
        activeUsers: summaryMap.get(institute._id.toString())?.metrics.activeAlumniUsersCount || 0,
        adminCount: summaryMap.get(institute._id.toString())?.metrics.adminsCount || 0
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:id/approve",
  protect,
  authorize("super_admin"),
  validateParams(validateInstituteId),
  async (req, res, next) => {
  try {
    const institute = await Institute.findById(req.params.id);

    if (!institute) {
      const error = new Error("Institute not found");
      error.statusCode = 404;
      throw error;
    }

    institute.status = "active";
    institute.subscriptionStatus = "active";
    institute.subscriptionPlan = req.body.subscriptionPlan || institute.subscriptionPlan;
    institute.dataIsolationMode =
      req.body.dataIsolationMode || institute.dataIsolationMode || process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared";

    if (!institute.tenantDatabaseName) {
      institute.tenantDatabaseName = buildDefaultTenantConfig({
        name: institute.name,
        subdomain: institute.subdomain
      }).databaseName;
    }

    await institute.save();

    const tenantContext = {};
    await attachTenantDatabaseContext(tenantContext, institute);
    const TenantUser = getTenantModels(tenantContext).User;

    await TenantUser.updateMany(
      {
        instituteId: institute._id,
        role: "institute_admin",
        passwordSetupCompleted: true
      },
      {
        $set: {
          isActive: true
        }
      }
    );

    res.json({
      institute,
      message: "Institute approved. Institute admins who completed onboarding can now sign in."
    });

    await logAuditEvent(req, {
      action: "institute.approved",
      targetType: "Institute",
      targetId: institute._id.toString(),
      instituteId: institute._id,
      metadata: {
        name: institute.name,
        subscriptionPlan: institute.subscriptionPlan
      }
    });
  } catch (error) {
    next(error);
  }
  }
);

router.patch(
  "/:id/suspend",
  protect,
  authorize("super_admin"),
  validateParams(validateInstituteId),
  async (req, res, next) => {
  try {
    const institute = await Institute.findById(req.params.id);

    if (!institute) {
      const error = new Error("Institute not found");
      error.statusCode = 404;
      throw error;
    }

    institute.status = "suspended";
    institute.subscriptionStatus = "inactive";

    await institute.save();

    const tenantContext = {};
    await attachTenantDatabaseContext(tenantContext, institute);
    const TenantUser = getTenantModels(tenantContext).User;

    await TenantUser.updateMany(
      {
        instituteId: institute._id,
        role: { $in: ["institute_admin", "alumni"] }
      },
      {
        $set: {
          isActive: false
        }
      }
    );

    res.json({
      institute,
      message: "Institute suspended and tenant users deactivated"
    });

    await logAuditEvent(req, {
      action: "institute.suspended",
      targetType: "Institute",
      targetId: institute._id.toString(),
      instituteId: institute._id,
      metadata: {
        name: institute.name
      }
    });
  } catch (error) {
    next(error);
  }
  }
);

export default router;


