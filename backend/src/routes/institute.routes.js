import crypto from "node:crypto";
import express from "express";

import { attachTenantDatabaseContext, buildTenantPersistenceConfig, getTenantModels } from "../db/tenantConnectionManager.js";
import { authorize, protect, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import Institute from "../models/Institute.js";
import PortalOnboardingDraft from "../models/PortalOnboardingDraft.js";
import User from "../models/User.js";
import { logAuditEvent } from "../utils/audit.js";
import { hashPassword } from "../utils/auth.js";
import { sendInviteEmail } from "../utils/email.js";
import { getPlatformTenantSummaries } from "../utils/tenantAdminData.js";
import { getDefaultBranding, getDefaultCommunityLabels, getDefaultFeatureFlags } from "../utils/tenantConfig.js";
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

function validateDraftId(params) {
  return isObjectIdLike(params.draftId) ? [] : ["Invalid draft id"];
}

function isHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || "").trim());
}

function normalizeDomain(value) {
  return String(value || "").trim().toLowerCase();
}

function isDomainLike(value) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(value);
}

function normalizeAutoApproveDomains(value) {
  const rawValues =
    typeof value === "string"
      ? value.split(",")
      : Array.isArray(value)
        ? value
        : [];

  const uniqueDomains = new Set();

  rawValues.forEach((entry) => {
    const normalized = normalizeDomain(entry).replace(/^@/, "");
    if (normalized) {
      uniqueDomains.add(normalized);
    }
  });

  return [...uniqueDomains];
}

function normalizeDepartmentStreams(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized = {};

  Object.entries(value).forEach(([department, streams]) => {
    const deptName = String(department || "").trim();
    if (!deptName) return;

    const items = Array.isArray(streams) ? streams : String(streams || "").split(/[\,\n]/);
    const cleaned = [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
    if (cleaned.length > 0) {
      normalized[deptName] = cleaned;
    }
  });

  return normalized;
}

function flattenDepartmentStreams(value) {
  return [...new Set(Object.values(normalizeDepartmentStreams(value)).flat())];
}

function validateInstituteSettingsBody(body) {
  const issues = [];

  if (body.name !== undefined && !isNonEmptyString(body.name)) {
    issues.push("Institution name cannot be empty");
  }

  if (body.primaryContactEmail !== undefined && !isEmail(body.primaryContactEmail)) {
    issues.push("A valid contact email is required");
  }

  if (body.branding && typeof body.branding === "object") {
    if (body.branding.primaryColor !== undefined && !isHexColor(body.branding.primaryColor)) {
      issues.push("Primary color must be a hex color like #2554d8");
    }

    if (body.branding.secondaryColor !== undefined && !isHexColor(body.branding.secondaryColor)) {
      issues.push("Secondary color must be a hex color like #163795");
    }

    if (body.branding.accentColor !== undefined && !isHexColor(body.branding.accentColor)) {
      issues.push("Accent color must be a hex color like #eef3ff");
    }
  }

  if (body.featureFlags && typeof body.featureFlags === "object" && body.featureFlags.autoApproveEmailDomains !== undefined) {
    const domains = normalizeAutoApproveDomains(body.featureFlags.autoApproveEmailDomains);
    const invalid = domains.filter((domain) => !isDomainLike(domain));

    if (invalid.length) {
      issues.push("Auto-approve domains must be valid domain names");
    }

    if (domains.length > 25) {
      issues.push("Auto-approve domains cannot exceed 25 entries");
    }
  }

  if (body.departments !== undefined && !Array.isArray(body.departments)) {
    issues.push("Departments must be an array of strings");
  }
  
  if (body.departmentStreams !== undefined && (typeof body.departmentStreams !== "object" || Array.isArray(body.departmentStreams))) {
    issues.push("Department streams must be an object keyed by department");
  }

  if (body.streams !== undefined && !Array.isArray(body.streams)) {
    issues.push("Streams must be an array of strings");
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

function buildDefaultTenantConfig({ name, subdomain }) {
  return buildTenantPersistenceConfig({
    name,
    subdomain,
    dataIsolationMode: process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared"
  });
}

function buildInstituteSettingsPayload(institute) {
  const featureDefaults = getDefaultFeatureFlags(institute.institutionType || "college");
  const brandingDefaults = getDefaultBranding(institute.institutionType || "college");

  return {
    _id: institute._id,
    name: institute.name,
    subdomain: institute.subdomain || "",
    domain: institute.domain || "",
    website: institute.website || "",
    bio: institute.bio || "",
    primaryContactEmail: institute.primaryContactEmail || "",
    institutionType: institute.institutionType || "college",
    educationLevel: institute.educationLevel || "higher_ed",
    featureFlags: {
      ...featureDefaults,
      ...(institute.featureFlags || {})
    },
    branding: {
      ...brandingDefaults,
      ...(institute.branding || {})
    },
    departments: institute.departments || [],
    departmentStreams: institute.departmentStreams || {},
    streams: institute.streams || []
  };
}

function normalizeOnboardingPayload(body = {}) {
  const institutionType = body.institutionType === "school" ? "school" : "college";
  const educationLevel = body.educationLevel || (institutionType === "school" ? "k10" : "higher_ed");

  return {
    name: String(body.name || "").trim(),
    institutionType,
    educationLevel,
    subdomain: String(body.subdomain || "").trim().toLowerCase(),
    domain: String(body.domain || "").trim().toLowerCase(),
    primaryContactName: String(body.primaryContactName || "").trim(),
    primaryContactEmail: String(body.primaryContactEmail || "").trim().toLowerCase(),
    primaryContactPhone: String(body.primaryContactPhone || "").trim(),
    website: String(body.website || "").trim(),
    bio: String(body.bio || "").trim(),
    branding: {
      logoUrl: String(body.branding?.logoUrl || "").trim(),
      primaryColor: String(body.branding?.primaryColor || "").trim(),
      secondaryColor: String(body.branding?.secondaryColor || "").trim(),
      accentColor: String(body.branding?.accentColor || "").trim(),
      tagline: String(body.branding?.tagline || "").trim()
    },
    featureFlags: body.featureFlags && typeof body.featureFlags === "object" ? body.featureFlags : {}
  };
}

async function createInstitutePortalRequest(payload) {
  const normalizedSubdomain = payload.subdomain;
  const normalizedDomain = payload.domain || "";
  const normalizedEmail = payload.primaryContactEmail;

  const [existingInstitute, existingUser] = await Promise.all([
    Institute.findOne({
      $or: [{ subdomain: normalizedSubdomain }, ...(normalizedDomain ? [{ domain: normalizedDomain }] : [])]
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
    name: payload.name,
    subdomain: normalizedSubdomain,
    domain: normalizedDomain || undefined,
    institutionType: payload.institutionType,
    educationLevel: payload.educationLevel,
    communityLabels: getDefaultCommunityLabels(payload.institutionType),
    featureFlags: {
      ...getDefaultFeatureFlags(payload.institutionType),
      ...(payload.featureFlags || {})
    },
    branding: {
      ...getDefaultBranding(payload.institutionType),
      ...(payload.branding || {})
    },
    website: payload.website,
    bio: payload.bio,
    dataIsolationMode: process.env.DEFAULT_TENANT_ISOLATION_MODE || "shared",
    tenantDatabaseName: buildDefaultTenantConfig({
      name: payload.name,
      subdomain: normalizedSubdomain
    }).databaseName,
    primaryContactName: payload.primaryContactName,
    primaryContactEmail: normalizedEmail,
    primaryContactPhone: payload.primaryContactPhone
  });

  const tenantContext = {};
  await attachTenantDatabaseContext(tenantContext, institute);
  const TenantUser = getTenantModels(tenantContext).User;

  const instituteAdmin = await TenantUser.create({
    instituteId: institute._id,
    name: payload.primaryContactName,
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
    portalRoleLabel: "institute admin",
    institutionType: institute.institutionType
  });

  return {
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
  };
}

router.post("/onboarding/draft", async (req, res, next) => {
  try {
    const normalizedPayload = normalizeOnboardingPayload(req.body || {});
    const draftId = String(req.body?.draftId || "").trim();
    const requestedStep = Number(req.body?.currentStep || 1);
    const currentStep = Number.isFinite(requestedStep) ? Math.max(1, Math.min(4, requestedStep)) : 1;

    const draft =
      draftId && isObjectIdLike(draftId)
        ? await PortalOnboardingDraft.findByIdAndUpdate(
            draftId,
            { status: "draft", currentStep, data: normalizedPayload },
            { new: true }
          )
        : await PortalOnboardingDraft.create({
            status: "draft",
            currentStep,
            data: normalizedPayload
          });

    if (!draft) {
      const error = new Error("Draft not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(201).json({
      draftId: draft._id,
      currentStep: draft.currentStep,
      savedAt: draft.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

router.get("/onboarding/draft/:draftId", validateParams(validateDraftId), async (req, res, next) => {
  try {
    const draft = await PortalOnboardingDraft.findById(req.params.draftId);
    if (!draft) {
      const error = new Error("Draft not found");
      error.statusCode = 404;
      throw error;
    }
    res.json({
      draftId: draft._id,
      currentStep: draft.currentStep,
      data: draft.data || {},
      savedAt: draft.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

router.get("/public", async (_req, res, next) => {
  try {
    const institutes = await Institute.find({ status: "active" })
      .select("name subdomain domain institutionType educationLevel communityLabels departments departmentStreams streams")
      .sort({ name: 1 });

    res.json(institutes);
  } catch (error) {
    next(error);
  }
});

router.get("/public/current", async (req, res, next) => {
  try {
    if (!req.tenant) {
      const { subdomain, domain, hasTenantHint } = req.tenantResolution || {};

      if (!hasTenantHint) {
        const error = new Error("No institution portal was resolved for this request");
        error.statusCode = 404;
        throw error;
      }

      const matchedInstitute = await Institute.findOne({
        $or: [
          ...(domain ? [{ domain }] : []),
          ...(subdomain ? [{ subdomain }] : [])
        ]
      }).select("name status subdomain domain");

      if (!matchedInstitute) {
        const error = new Error("Institution portal not found");
        error.statusCode = 404;
        throw error;
      }

      const error = new Error("This institution portal is currently unavailable");
      error.statusCode = 423;
      error.details = {
        portalStatus: matchedInstitute.status,
        instituteName: matchedInstitute.name,
        subdomain: matchedInstitute.subdomain || "",
        domain: matchedInstitute.domain || ""
      };
      throw error;
    }

    res.json({
      _id: req.tenant._id,
      name: req.tenant.name,
      subdomain: req.tenant.subdomain || "",
      domain: req.tenant.domain || "",
      institutionType: req.tenant.institutionType || "college",
      educationLevel: req.tenant.educationLevel || "higher_ed",
      status: req.tenant.status,
      bio: req.tenant.bio || "",
      website: req.tenant.website || "",
      communityLabels: req.tenant.communityLabels || null,
      featureFlags: req.tenant.featureFlags || null,
      branding: {
        ...getDefaultBranding(req.tenant.institutionType || "college"),
        ...(req.tenant.branding || {})
      },
      departments: req.tenant.departments || [],
      departmentStreams: req.tenant.departmentStreams || {},
      streams: req.tenant.streams || []
    });
  } catch (error) {
    next(error);
  }
});

router.post("/request", validateBody(validateInstituteRequestBody), async (req, res, next) => {
  try {
    const payload = normalizeOnboardingPayload(req.body);
    const response = await createInstitutePortalRequest(payload);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.post("/onboarding/submit", async (req, res, next) => {
  try {
    let payload = normalizeOnboardingPayload(req.body || {});
    const draftId = String(req.body?.draftId || "").trim();

    if (draftId && isObjectIdLike(draftId)) {
      const draft = await PortalOnboardingDraft.findById(draftId);
      if (!draft) {
        const error = new Error("Draft not found");
        error.statusCode = 404;
        throw error;
      }
      const draftPayload = normalizeOnboardingPayload(draft.data || {});
      const hasLiveValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";
      payload = {
        ...draftPayload,
        ...Object.fromEntries(Object.entries(payload).filter(([, value]) => {
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            return true;
          }
          return hasLiveValue(value);
        })),
        branding: {
          ...(draftPayload.branding || {}),
          ...(payload.branding || {})
        },
        featureFlags: {
          ...(draftPayload.featureFlags || {}),
          ...(payload.featureFlags || {})
        }
      };
    }

    const validationIssues = validateInstituteRequestBody(payload);
    if (validationIssues.length) {
      const error = new Error("Validation failed");
      error.statusCode = 400;
      error.details = validationIssues;
      throw error;
    }

    const response = await createInstitutePortalRequest(payload);

    if (draftId && isObjectIdLike(draftId)) {
      await PortalOnboardingDraft.findByIdAndDelete(draftId);
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/me/settings", protect, authorize("institute_admin"), requireTenantAccess, async (req, res, next) => {
  try {
    const institute = await Institute.findById(req.tenant?._id || req.user.instituteId?._id || req.user.instituteId);

    if (!institute) {
      const error = new Error("Institute not found");
      error.statusCode = 404;
      throw error;
    }

    res.json(buildInstituteSettingsPayload(institute));
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/me/settings",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateBody(validateInstituteSettingsBody),
  async (req, res, next) => {
    try {
      const institute = await Institute.findById(req.tenant?._id || req.user.instituteId?._id || req.user.instituteId);

      if (!institute) {
        const error = new Error("Institute not found");
        error.statusCode = 404;
        throw error;
      }

      if (req.body.name !== undefined) {
        institute.name = String(req.body.name).trim();
      }

      if (req.body.website !== undefined) {
        institute.website = String(req.body.website || "").trim();
      }

      if (req.body.bio !== undefined) {
        institute.bio = String(req.body.bio || "").trim();
      }

      if (req.body.primaryContactEmail !== undefined) {
        institute.primaryContactEmail = String(req.body.primaryContactEmail || "").trim().toLowerCase();
      }

      if (req.body.departments !== undefined) {
        institute.departments = Array.isArray(req.body.departments) ? req.body.departments.map(d => String(d).trim()).filter(Boolean) : [];
      }

      if (req.body.departmentStreams !== undefined) {
        institute.departmentStreams = normalizeDepartmentStreams(req.body.departmentStreams);
        institute.streams = flattenDepartmentStreams(institute.departmentStreams);
      }
      
      if (req.body.streams !== undefined) {
        institute.streams = Array.isArray(req.body.streams) ? req.body.streams.map(s => String(s).trim()).filter(Boolean) : [];
      }

      const incomingBranding = req.body.branding && typeof req.body.branding === "object" ? req.body.branding : {};
      const incomingFeatureFlags =
        req.body.featureFlags && typeof req.body.featureFlags === "object" ? req.body.featureFlags : {};
      const autoApproveDomains =
        incomingFeatureFlags.autoApproveEmailDomains !== undefined
          ? normalizeAutoApproveDomains(incomingFeatureFlags.autoApproveEmailDomains)
          : null;

      institute.branding = {
        ...getDefaultBranding(institute.institutionType || "college"),
        ...(institute.branding || {}),
        ...(incomingBranding.tagline !== undefined ? { tagline: String(incomingBranding.tagline || "").trim() } : {}),
        ...(incomingBranding.primaryColor !== undefined ? { primaryColor: String(incomingBranding.primaryColor).trim() } : {}),
        ...(incomingBranding.secondaryColor !== undefined ? { secondaryColor: String(incomingBranding.secondaryColor).trim() } : {}),
        ...(incomingBranding.accentColor !== undefined ? { accentColor: String(incomingBranding.accentColor).trim() } : {}),
        ...(incomingBranding.logoUrl !== undefined ? { logoUrl: String(incomingBranding.logoUrl || "").trim() } : {})
      };

      institute.featureFlags = {
        ...getDefaultFeatureFlags(institute.institutionType || "college"),
        ...(institute.featureFlags || {}),
        ...(incomingFeatureFlags.enableJobs !== undefined ? { enableJobs: Boolean(incomingFeatureFlags.enableJobs) } : {}),
        ...(incomingFeatureFlags.enableEvents !== undefined ? { enableEvents: Boolean(incomingFeatureFlags.enableEvents) } : {}),
        ...(incomingFeatureFlags.allowStudentRegistrations !== undefined
          ? { allowStudentRegistrations: Boolean(incomingFeatureFlags.allowStudentRegistrations) }
          : {}),
        ...(incomingFeatureFlags.autoApproveAlumni !== undefined
          ? { autoApproveAlumni: Boolean(incomingFeatureFlags.autoApproveAlumni) }
          : {}),
        ...(autoApproveDomains !== null ? { autoApproveEmailDomains: autoApproveDomains } : {})
      };

      await institute.save();

      res.json({
        message: "Institution settings updated",
        settings: buildInstituteSettingsPayload(institute)
      });

      await logAuditEvent(req, {
        action: "institute.settings.updated",
        targetType: "Institute",
        targetId: institute._id.toString(),
        instituteId: institute._id,
        metadata: {
          updatedBy: req.user.email,
          updatedFields: Object.keys(req.body || {})
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

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
