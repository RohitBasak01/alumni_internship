import crypto from "node:crypto";
import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.middleware.js";
import { logAuditEvent } from "../utils/audit.js";
import { sendInviteEmail } from "../utils/email.js";
import { hashPassword } from "../utils/auth.js";
import { buildTenantConfigSnapshot } from "../utils/tenantConfig.js";
import { hasMinLength, isEmail, isNonEmptyString, isObjectIdLike, isPositiveYear } from "../utils/validation.js";

const router = express.Router();

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

function buildRegex(value) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function validateAlumniQuery(query) {
  const issues = [];

  if (query.batch && !isPositiveYear(query.batch)) {
    issues.push("Batch must be a valid year");
  }

  if (query.leavingYear && !isPositiveYear(query.leavingYear)) {
    issues.push("Leaving year must be a valid year");
  }

  return issues;
}

function validateInviteBody(body) {
  const issues = [];

  if (!isNonEmptyString(body.name)) issues.push("Name is required");
  if (!isEmail(body.email)) issues.push("A valid email is required");

  return issues;
}

function validateProfileId(params) {
  return isObjectIdLike(params.profileId) ? [] : ["Invalid alumni profile id"];
}

function validateMentorshipLikeBody(body) {
  return hasMinLength(body.message || body.bio || "", 0) ? [] : [];
}

function getTenantProfileMode(req) {
  return buildTenantConfigSnapshot(req.tenant)?.institutionType === "school" ? "school" : "college";
}

function validateInvitePayloadForTenant(req, body) {
  const profileMode = getTenantProfileMode(req);
  const issues = [];

  if (profileMode === "school") {
    if (!isPositiveYear(body.leavingYear)) issues.push("Leaving year must be a valid year");
    if (!isNonEmptyString(body.lastClassAttended)) issues.push("Last class attended is required");
  } else {
    if (!isPositiveYear(body.batch)) issues.push("Batch must be a valid year");
    if (!isNonEmptyString(body.department)) issues.push("Department is required");
  }

  return issues;
}

router.get("/", protect, requireTenantAccess, validateQuery(validateAlumniQuery), async (req, res, next) => {
  try {
    const { AlumniProfile } = getTenantModels(req);
    const { q, batch, department, company, skill, leavingYear, lastClassAttended, section, location } = req.query;
    const isInstituteAdmin = req.user.role === "institute_admin";
    const profileFilter = {
      instituteId: req.tenant?._id
    };

    if (batch) {
      profileFilter.batch = Number(batch);
    }

    if (department) {
      profileFilter.department = buildRegex(String(department).trim());
    }

    if (leavingYear) {
      profileFilter.leavingYear = Number(leavingYear);
    }

    if (lastClassAttended) {
      profileFilter.lastClassAttended = buildRegex(String(lastClassAttended).trim());
    }

    if (section) {
      profileFilter.section = buildRegex(String(section).trim());
    }

    if (company) {
      profileFilter.company = buildRegex(String(company).trim());
    }

    if (location) {
      profileFilter.location = buildRegex(String(location).trim());
    }

    if (skill) {
      profileFilter.skills = { $in: [buildRegex(String(skill).trim())] };
    }

    const searchRegex = q ? buildRegex(String(q).trim()) : null;

    const alumni = await AlumniProfile.find(profileFilter)
      .populate("userId", "name email isActive inviteTokenHash inviteTokenExpiresAt passwordSetupCompleted")
      .sort({
        createdAt: -1
      });

    const formattedAlumni = alumni
      .filter((profile) => profile.userId)
      .map((profile) => ({
        _id: profile._id,
        instituteId: profile.instituteId,
        userId: profile.userId?._id || null,
        name: profile.userId?.name || "Unknown Alumni",
        email: profile.userId?.email || "",
        isActive: profile.userId?.isActive || false,
        batch: profile.batch,
        department: profile.department,
        leavingYear: profile.leavingYear,
        lastClassAttended: profile.lastClassAttended,
        section: profile.section,
        currentEducation: profile.currentEducation,
        currentInstitution: profile.currentInstitution,
        occupation: profile.occupation,
        company: profile.company,
        designation: profile.designation,
        location: profile.location,
        bio: profile.bio,
        skills: profile.skills || [],
        ...(isInstituteAdmin
          ? {
              registrationReviewStatus:
                profile.registrationReviewStatus ||
                (profile.userId?.passwordSetupCompleted
                  ? "approved"
                  : profile.userId?.inviteTokenHash
                    ? "pending"
                    : "rejected"),
              invitationStatus:
                profile.userId?.passwordSetupCompleted === false
                  ? profile.userId?.inviteTokenHash
                    ? "invited"
                    : "revoked"
                  : "active",
              inviteExpiresAt: profile.userId?.inviteTokenExpiresAt || null
            }
          : {})
      }))
      .filter((profile) => {
        if (!searchRegex) {
          return true;
        }

        return [
          profile.name,
          profile.email,
          profile.department,
          profile.company,
          profile.designation,
          profile.location,
          profile.bio,
          ...(profile.skills || [])
        ]
          .filter(Boolean)
          .some((value) => searchRegex.test(String(value)));
      });

    res.json(formattedAlumni);
  } catch (error) {
    next(error);
  }
});

router.get("/me", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const { AlumniProfile } = getTenantModels(req);
    const profile = await AlumniProfile.findOne({
      instituteId: req.tenant._id,
      userId: req.user._id
    }).populate("userId", "name email");

    if (!profile) {
      const error = new Error("Alumni profile not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({
      _id: profile._id,
      userId: profile.userId?._id || null,
      name: profile.userId?.name || req.user.name,
      email: profile.userId?.email || req.user.email,
      batch: profile.batch,
      department: profile.department,
      leavingYear: profile.leavingYear,
      lastClassAttended: profile.lastClassAttended || "",
      section: profile.section || "",
      currentEducation: profile.currentEducation || "",
      currentInstitution: profile.currentInstitution || "",
      occupation: profile.occupation || "",
      company: profile.company || "",
      designation: profile.designation || "",
      location: profile.location || "",
      industry: profile.industry || "",
      bio: profile.bio || "",
      skills: profile.skills || [],
      linkedinUrl: profile.linkedinUrl || "",
      websiteUrl: profile.websiteUrl || "",
      twitterHandle: profile.twitterHandle || "",
      profileVisibility: profile.profileVisibility || "institute_only",
      showEmail: profile.showEmail ?? false,
      allowMentorRequests: profile.allowMentorRequests ?? true
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/me",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateBody(validateMentorshipLikeBody),
  async (req, res, next) => {
  try {
    const { AlumniProfile, User } = getTenantModels(req);
    const profile = await AlumniProfile.findOne({
      instituteId: req.tenant._id,
      userId: req.user._id
    });
    const user = await User.findById(req.user._id);

    if (!profile) {
      const error = new Error("Alumni profile not found");
      error.statusCode = 404;
      throw error;
    }

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const nextSkills = Array.isArray(req.body.skills)
      ? req.body.skills
      : typeof req.body.skills === "string"
        ? req.body.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
        : profile.skills;

    user.name = req.body.name?.trim?.() || user.name;
    profile.batch = req.body.batch !== undefined && req.body.batch !== null && req.body.batch !== "" ? Number(req.body.batch) : profile.batch;
    profile.department = req.body.department?.trim?.() ?? profile.department;
    profile.leavingYear =
      req.body.leavingYear !== undefined && req.body.leavingYear !== null && req.body.leavingYear !== ""
        ? Number(req.body.leavingYear)
        : profile.leavingYear;
    profile.lastClassAttended = req.body.lastClassAttended?.trim?.() ?? profile.lastClassAttended;
    profile.section = req.body.section?.trim?.() ?? profile.section;
    profile.currentEducation = req.body.currentEducation?.trim?.() ?? profile.currentEducation;
    profile.currentInstitution = req.body.currentInstitution?.trim?.() ?? profile.currentInstitution;
    profile.occupation = req.body.occupation?.trim?.() ?? profile.occupation;
    profile.company = req.body.company?.trim?.() ?? profile.company;
    profile.designation = req.body.designation?.trim?.() ?? profile.designation;
    profile.location = req.body.location?.trim?.() ?? profile.location;
    profile.industry = req.body.industry?.trim?.() ?? profile.industry;
    profile.bio = req.body.bio?.trim?.() ?? profile.bio;
    profile.skills = nextSkills;
    profile.linkedinUrl = req.body.linkedinUrl?.trim?.() ?? profile.linkedinUrl;
    profile.websiteUrl = req.body.websiteUrl?.trim?.() ?? profile.websiteUrl;
    profile.twitterHandle = req.body.twitterHandle?.trim?.() ?? profile.twitterHandle;
    profile.profileVisibility = req.body.profileVisibility ?? profile.profileVisibility;
    profile.showEmail =
      typeof req.body.showEmail === "boolean" ? req.body.showEmail : profile.showEmail;
    profile.allowMentorRequests =
      typeof req.body.allowMentorRequests === "boolean"
        ? req.body.allowMentorRequests
        : profile.allowMentorRequests;

    await user.save();
    await profile.save();

    res.json({
      ...profile.toObject(),
      name: user.name
    });
  } catch (error) {
    next(error);
  }
  }
);

router.post(
  "/invite",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateBody(validateInviteBody),
  async (req, res, next) => {
    try {
      const { AlumniProfile, User } = getTenantModels(req);
      const { name, email, batch, department, leavingYear, lastClassAttended, section, currentEducation, currentInstitution, occupation, company, designation, location } = req.body;
      const tenantIssues = validateInvitePayloadForTenant(req, req.body);

      if (!name || !email || tenantIssues.length) {
        const error = new Error(tenantIssues[0] || "Name and email are required");
        error.statusCode = 400;
        throw error;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail });

      if (existingUser) {
        const error = new Error("An account with that email already exists");
        error.statusCode = 409;
        throw error;
      }

      const user = await User.create({
        instituteId: req.tenant._id,
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: await hashPassword(`Pending@${crypto.randomBytes(4).toString("hex")}`),
        role: "alumni",
        isActive: false,
        inviteTokenHash: null,
        inviteTokenExpiresAt: null,
        passwordSetupCompleted: false
      });
      const { inviteUrl, expiresAt } = issueInviteToken(user);
      await user.save();

      const profile = await AlumniProfile.create({
        instituteId: req.tenant._id,
        userId: user._id,
        batch: batch ? Number(batch) : null,
        department: department?.trim?.() || "",
        leavingYear: leavingYear ? Number(leavingYear) : null,
        lastClassAttended: lastClassAttended?.trim?.() || "",
        section: section?.trim?.() || "",
        currentEducation: currentEducation?.trim?.() || "",
        currentInstitution: currentInstitution?.trim?.() || "",
        occupation: occupation?.trim?.() || "",
        company: company?.trim() || "",
        designation: designation?.trim() || "",
        location: location?.trim() || "",
        registrationReviewStatus: "pending",
        bio: "",
        skills: []
      });

      const emailDelivery = await sendInviteEmail({
        to: user.email,
        recipientName: user.name,
        instituteName: req.tenant.name,
        inviteUrl,
        expiresAt,
        portalRoleLabel: "alumni"
      });

      res.status(201).json({
        profile,
        invite: {
          email: user.email,
          inviteUrl,
          expiresAt,
          message: emailDelivery.message
        },
        emailDelivery
      });

      await logAuditEvent(req, {
        action: "alumni.invited",
        targetType: "AlumniProfile",
        targetId: profile._id.toString(),
        instituteId: req.tenant._id,
        metadata: {
          alumniEmail: user.email,
          alumniName: user.name,
          deliveryMode: emailDelivery.mode
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:profileId/resend-invite",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateParams(validateProfileId),
  async (req, res, next) => {
    try {
      const { AlumniProfile } = getTenantModels(req);
      const profile = await AlumniProfile.findOne({
        _id: req.params.profileId,
        instituteId: req.tenant._id
      }).populate("userId");

      if (!profile || !profile.userId) {
        const error = new Error("Alumni invite not found");
        error.statusCode = 404;
        throw error;
      }

      if (profile.userId.passwordSetupCompleted) {
        const error = new Error("This alumni account is already active");
        error.statusCode = 400;
        throw error;
      }

      const { inviteUrl, expiresAt } = issueInviteToken(profile.userId);
      await profile.userId.save();

      const emailDelivery = await sendInviteEmail({
        to: profile.userId.email,
        recipientName: profile.userId.name,
        instituteName: req.tenant.name,
        inviteUrl,
        expiresAt,
        portalRoleLabel: "alumni"
      });

      res.json({
        invite: {
          email: profile.userId.email,
          inviteUrl,
          expiresAt,
          message: emailDelivery.message
        },
        emailDelivery
      });

      await logAuditEvent(req, {
        action: "alumni.invite_resent",
        targetType: "AlumniProfile",
        targetId: profile._id.toString(),
        instituteId: req.tenant._id,
        metadata: {
          alumniEmail: profile.userId.email,
          deliveryMode: emailDelivery.mode
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:profileId/copy-invite-link",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateParams(validateProfileId),
  async (req, res, next) => {
    try {
      const { AlumniProfile } = getTenantModels(req);
      const profile = await AlumniProfile.findOne({
        _id: req.params.profileId,
        instituteId: req.tenant._id
      }).populate("userId");

      if (!profile || !profile.userId) {
        const error = new Error("Alumni invite not found");
        error.statusCode = 404;
        throw error;
      }

      if (profile.userId.passwordSetupCompleted) {
        const error = new Error("This alumni account is already active");
        error.statusCode = 400;
        throw error;
      }

      const { inviteUrl, expiresAt } = issueInviteToken(profile.userId);
      await profile.userId.save();

      res.json({
        invite: {
          email: profile.userId.email,
          inviteUrl,
          expiresAt,
          message: "A fresh invite link was generated for copying."
        },
        emailDelivery: {
          delivered: false,
          mode: "copy",
          message: "Invite email was not sent. Share the copied link manually.",
          previewUrl: null
        }
      });

      await logAuditEvent(req, {
        action: "alumni.invite_link_regenerated",
        targetType: "AlumniProfile",
        targetId: profile._id.toString(),
        instituteId: req.tenant._id,
        metadata: {
          alumniEmail: profile.userId.email
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:profileId/approve-registration",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateParams(validateProfileId),
  async (req, res, next) => {
    try {
      const { AlumniProfile } = getTenantModels(req);
      const profile = await AlumniProfile.findOne({
        _id: req.params.profileId,
        instituteId: req.tenant._id
      }).populate("userId");

      if (!profile || !profile.userId) {
        const error = new Error("Alumni registration not found");
        error.statusCode = 404;
        throw error;
      }

      if (profile.registrationReviewStatus === "approved") {
        const error = new Error("This registration is already approved");
        error.statusCode = 400;
        throw error;
      }

      profile.registrationReviewStatus = "approved";
      await profile.save();

      res.json({
        message: "Registration approved successfully"
      });

      await logAuditEvent(req, {
        action: "alumni.registration_approved",
        targetType: "AlumniProfile",
        targetId: profile._id.toString(),
        instituteId: req.tenant._id,
        metadata: {
          alumniEmail: profile.userId.email
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:profileId/revoke-invite",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateParams(validateProfileId),
  async (req, res, next) => {
    try {
      const { AlumniProfile } = getTenantModels(req);
      const profile = await AlumniProfile.findOne({
        _id: req.params.profileId,
        instituteId: req.tenant._id
      }).populate("userId");

      if (!profile || !profile.userId) {
        const error = new Error("Alumni invite not found");
        error.statusCode = 404;
        throw error;
      }

      if (profile.userId.passwordSetupCompleted) {
        const error = new Error("Active alumni accounts cannot have their invite revoked");
        error.statusCode = 400;
        throw error;
      }

      profile.userId.inviteTokenHash = null;
      profile.userId.inviteTokenExpiresAt = null;
      profile.userId.isActive = false;
      profile.registrationReviewStatus = "rejected";
      await profile.save();
      await profile.userId.save();

      res.json({
        message: "Invite revoked successfully"
      });

      await logAuditEvent(req, {
        action: "alumni.invite_revoked",
        targetType: "AlumniProfile",
        targetId: profile._id.toString(),
        instituteId: req.tenant._id,
        metadata: {
          alumniEmail: profile.userId.email
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  protect,
  authorize("institute_admin", "alumni"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { AlumniProfile } = getTenantModels(req);
      const alumni = await AlumniProfile.create({
        ...req.body,
        instituteId: req.tenant._id,
        userId: req.user._id
      });

      res.status(201).json(alumni);
    } catch (error) {
      next(error);
    }
  }
);

export default router;


