import crypto from "node:crypto";
import express from "express";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import AlumniProfile from "../models/AlumniProfile.js";
import Institute from "../models/Institute.js";
import User from "../models/User.js";
import { logAuditEvent } from "../utils/audit.js";
import { hashPassword } from "../utils/auth.js";
import { sendInviteEmail } from "../utils/email.js";
import { isEmail, isNonEmptyString, isObjectIdLike } from "../utils/validation.js";

const router = express.Router();

function validateInstituteRequestBody(body) {
  const issues = [];

  if (!isNonEmptyString(body.name)) issues.push("Institute name is required");
  if (!isNonEmptyString(body.subdomain)) issues.push("Subdomain is required");
  if (!isNonEmptyString(body.primaryContactName)) issues.push("Primary contact name is required");
  if (!isEmail(body.primaryContactEmail)) issues.push("A valid primary contact email is required");

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

router.post("/request", validateBody(validateInstituteRequestBody), async (req, res, next) => {
  try {
    const {
      name,
      subdomain,
      domain,
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
      primaryContactName: primaryContactName.trim(),
      primaryContactEmail: normalizedEmail,
      primaryContactPhone: primaryContactPhone?.trim() || ""
    });

    const instituteAdmin = await User.create({
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

    const instituteIds = institutes.map((institute) => institute._id);

    const [profileCounts, activeAlumniCounts, adminCounts] = await Promise.all([
      AlumniProfile.aggregate([
        { $match: { instituteId: { $in: instituteIds } } },
        { $group: { _id: "$instituteId", count: { $sum: 1 } } }
      ]),
      User.aggregate([
        {
          $match: {
            instituteId: { $in: instituteIds },
            role: "alumni",
            isActive: true
          }
        },
        { $group: { _id: "$instituteId", count: { $sum: 1 } } }
      ]),
      User.aggregate([
        {
          $match: {
            instituteId: { $in: instituteIds },
            role: "institute_admin"
          }
        },
        { $group: { _id: "$instituteId", count: { $sum: 1 } } }
      ])
    ]);

    const profileCountMap = new Map(profileCounts.map((item) => [item._id.toString(), item.count]));
    const activeAlumniCountMap = new Map(activeAlumniCounts.map((item) => [item._id.toString(), item.count]));
    const adminCountMap = new Map(adminCounts.map((item) => [item._id.toString(), item.count]));

    res.json(
      institutes.map((institute) => ({
        ...institute.toObject(),
        memberCount: profileCountMap.get(institute._id.toString()) || 0,
        activeUsers: activeAlumniCountMap.get(institute._id.toString()) || 0,
        adminCount: adminCountMap.get(institute._id.toString()) || 0
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

    await institute.save();

    await User.updateMany(
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

    await User.updateMany(
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
