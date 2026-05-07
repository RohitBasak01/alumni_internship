import crypto from "node:crypto";
import express from "express";
import multer from "multer";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.middleware.js";
import { logAuditEvent } from "../utils/audit.js";
import { sendInviteEmail } from "../utils/email.js";
import { hashPassword } from "../utils/auth.js";
import { buildTenantConfigSnapshot } from "../utils/tenantConfig.js";
import { hasMinLength, isEmail, isNonEmptyString, isObjectIdLike, isPositiveYear } from "../utils/validation.js";

const router = express.Router();

// Configure multer for CSV file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
});

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

function validateBulkReviewBody(body) {
  const issues = [];
  const profileIds = Array.isArray(body?.profileIds) ? body.profileIds : [];
  const normalizedRejectionReason = String(body?.rejectionReason || "").trim();

  if (!profileIds.length) {
    issues.push("At least one alumni profile id is required");
  }

  if (profileIds.some((value) => !isObjectIdLike(value))) {
    issues.push("One or more alumni profile ids are invalid");
  }

  if (!["approve", "reject"].includes(body?.action)) {
    issues.push("Action must be approve or reject");
  }

  if (body?.action === "reject" && !hasMinLength(normalizedRejectionReason, 3)) {
    issues.push("Rejection reason must be at least 3 characters");
  }

  if (normalizedRejectionReason.length > 300) {
    issues.push("Rejection reason cannot exceed 300 characters");
  }

  return issues;
}

function validateBulkResendBody(body) {
  const issues = [];
  const profileIds = Array.isArray(body?.profileIds) ? body.profileIds : [];

  if (!profileIds.length) {
    issues.push("At least one alumni profile id is required");
  }

  if (profileIds.some((value) => !isObjectIdLike(value))) {
    issues.push("One or more alumni profile ids are invalid");
  }

  return issues;
}

function validateRejectBody(body) {
  const issues = [];
  const normalizedRejectionReason = String(body?.rejectionReason || "").trim();

  if (!hasMinLength(normalizedRejectionReason, 3)) {
    issues.push("Rejection reason must be at least 3 characters");
  }

  if (normalizedRejectionReason.length > 300) {
    issues.push("Rejection reason cannot exceed 300 characters");
  }

  return issues;
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

import {
  getAlumni,
  getMyProfile,
  updateMyProfile,
  inviteAlumni,
  exportAlumniCsv,
  importAlumniCsv
} from "../controllers/alumni.controller.js";

router.get("/", protect, requireTenantAccess, validateQuery(validateAlumniQuery), getAlumni);
router.get("/me", protect, requireTenantAccess, getMyProfile);
router.patch("/me", protect, authorize("alumni"), requireTenantAccess, validateBody(validateMentorshipLikeBody), updateMyProfile);
router.post("/invite", protect, authorize("institute_admin"), requireTenantAccess, validateBody(validateInviteBody), inviteAlumni);
router.get("/export/csv", protect, authorize("institute_admin"), requireTenantAccess, exportAlumniCsv);

// Handlers migrated to alumni.controller.js

router.post(
  "/bulk-resend-invite",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateBody(validateBulkResendBody),
  async (req, res, next) => {
    try {
      const { AlumniProfile } = getTenantModels(req);
      const uniqueProfileIds = [...new Set(req.body.profileIds.map((value) => String(value)))];
      const profiles = await AlumniProfile.find({
        _id: { $in: uniqueProfileIds },
        instituteId: req.tenant._id
      }).populate("userId");

      if (!profiles.length) {
        const error = new Error("No matching alumni registrations were found");
        error.statusCode = 404;
        throw error;
      }

      const processedIds = [];
      const skipped = [];
      let deliveredCount = 0;

      for (const profile of profiles) {
        if (!profile.userId) {
          skipped.push({ profileId: profile._id.toString(), reason: "missing_user" });
          continue;
        }

        if (profile.userId.passwordSetupCompleted) {
          skipped.push({ profileId: profile._id.toString(), reason: "already_active" });
          continue;
        }

        if ((profile.registrationReviewStatus || "pending") !== "pending") {
          skipped.push({ profileId: profile._id.toString(), reason: "not_pending_review" });
          continue;
        }

        try {
          const { inviteUrl, expiresAt } = issueInviteToken(profile.userId);
          await profile.userId.save();

          const emailDelivery = await sendInviteEmail({
            to: profile.userId.email,
            recipientName: profile.userId.name,
            instituteName: req.tenant.name,
            inviteUrl,
            expiresAt,
            portalRoleLabel: req.tenant?.institutionType === "school" ? "former student" : "alumni",
            institutionType: req.tenant?.institutionType || "college"
          });

          if (emailDelivery.delivered) {
            deliveredCount += 1;
          }

          processedIds.push(profile._id.toString());
        } catch {
          skipped.push({ profileId: profile._id.toString(), reason: "send_failed" });
        }
      }

      const manualShareCount = processedIds.length - deliveredCount;

      res.json({
        message: `${processedIds.length} invite${processedIds.length === 1 ? "" : "s"} resent`,
        requestedCount: uniqueProfileIds.length,
        processedCount: processedIds.length,
        skippedCount: skipped.length,
        deliveredCount,
        manualShareCount,
        processedIds,
        skipped
      });

      await logAuditEvent(req, {
        action: "alumni.invite_bulk_resent",
        targetType: "AlumniProfile",
        instituteId: req.tenant._id,
        metadata: {
          requestedCount: uniqueProfileIds.length,
          processedCount: processedIds.length,
          deliveredCount,
          skippedCount: skipped.length,
          profileIds: uniqueProfileIds
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/approval-turnaround-kpi",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { AlumniProfile } = getTenantModels(req);
      const [reviewedProfiles, pendingCount] = await Promise.all([
        AlumniProfile.find({
          instituteId: req.tenant._id,
          registrationReviewStatus: { $in: ["approved", "rejected"] },
          registrationReviewedAt: { $ne: null }
        }).select("createdAt registrationReviewedAt"),
        AlumniProfile.countDocuments({
          instituteId: req.tenant._id,
          registrationReviewStatus: "pending"
        })
      ]);

      const turnaroundHours = reviewedProfiles
        .map((profile) => {
          const createdAt = profile.createdAt ? new Date(profile.createdAt).getTime() : NaN;
          const reviewedAt = profile.registrationReviewedAt
            ? new Date(profile.registrationReviewedAt).getTime()
            : NaN;

          if (!Number.isFinite(createdAt) || !Number.isFinite(reviewedAt) || reviewedAt < createdAt) {
            return null;
          }

          return (reviewedAt - createdAt) / (1000 * 60 * 60);
        })
        .filter((value) => Number.isFinite(value));

      const sorted = [...turnaroundHours].sort((a, b) => a - b);
      const sampleSize = sorted.length;
      const averageHours =
        sampleSize > 0
          ? Number((sorted.reduce((sum, value) => sum + value, 0) / sampleSize).toFixed(2))
          : null;
      const medianHours =
        sampleSize > 0
          ? Number(
              (
                sampleSize % 2 === 0
                  ? (sorted[sampleSize / 2 - 1] + sorted[sampleSize / 2]) / 2
                  : sorted[Math.floor(sampleSize / 2)]
              ).toFixed(2)
            )
          : null;

      res.json({
        averageHours,
        medianHours,
        sampleSize,
        pendingCount
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/bulk-review",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateBody(validateBulkReviewBody),
  async (req, res, next) => {
    try {
      const { AlumniProfile } = getTenantModels(req);
      const uniqueProfileIds = [...new Set(req.body.profileIds.map((value) => String(value)))];
      const action = req.body.action;
      const rejectionReason = String(req.body.rejectionReason || "").trim();
      const profiles = await AlumniProfile.find({
        _id: { $in: uniqueProfileIds },
        instituteId: req.tenant._id
      }).populate("userId");

      if (!profiles.length) {
        const error = new Error("No matching alumni registrations were found");
        error.statusCode = 404;
        throw error;
      }

      const processedIds = [];
      const skipped = [];

      for (const profile of profiles) {
        if (!profile.userId) {
          skipped.push({ profileId: profile._id.toString(), reason: "missing_user" });
          continue;
        }

        if (action === "approve") {
          if (profile.registrationReviewStatus === "approved") {
            skipped.push({ profileId: profile._id.toString(), reason: "already_approved" });
            continue;
          }

          profile.registrationReviewStatus = "approved";
          profile.registrationRejectedReason = "";
          profile.registrationReviewedAt = new Date();
          await profile.save();
          processedIds.push(profile._id.toString());
          continue;
        }

        if (profile.userId.passwordSetupCompleted) {
          skipped.push({ profileId: profile._id.toString(), reason: "already_active" });
          continue;
        }

        profile.userId.inviteTokenHash = null;
        profile.userId.inviteTokenExpiresAt = null;
        profile.userId.isActive = false;
        profile.registrationReviewStatus = "rejected";
        profile.registrationRejectedReason = rejectionReason;
        profile.registrationReviewedAt = new Date();
        await profile.userId.save();
        await profile.save();
        processedIds.push(profile._id.toString());
      }

      const verb = action === "approve" ? "approved" : "rejected";

      res.json({
        message: `${processedIds.length} registration${processedIds.length === 1 ? "" : "s"} ${verb}`,
        action,
        requestedCount: uniqueProfileIds.length,
        processedCount: processedIds.length,
        skippedCount: skipped.length,
        processedIds,
        skipped
      });

      await logAuditEvent(req, {
        action: action === "approve" ? "alumni.registration_bulk_approved" : "alumni.registration_bulk_rejected",
        targetType: "AlumniProfile",
        instituteId: req.tenant._id,
        metadata: {
          requestedCount: uniqueProfileIds.length,
          processedCount: processedIds.length,
          skippedCount: skipped.length,
          profileIds: uniqueProfileIds,
          ...(action === "reject" ? { rejectionReason } : {})
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
      profile.registrationRejectedReason = "";
      profile.registrationReviewedAt = new Date();
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
  validateBody(validateRejectBody),
  async (req, res, next) => {
    try {
      const { AlumniProfile } = getTenantModels(req);
      const rejectionReason = String(req.body.rejectionReason || "").trim();
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
      profile.registrationRejectedReason = rejectionReason;
      profile.registrationReviewedAt = new Date();
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
          alumniEmail: profile.userId.email,
          rejectionReason
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

// Bulk import alumni from CSV
router.post(
  "/import/csv",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  upload.single("file"),
  importAlumniCsv
);

export default router;


