import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { isNonEmptyString, isObjectIdLike } from "../utils/validation.js";

const router = express.Router();

function validateReferralBody(body) {
  const issues = [];
  if (!isNonEmptyString(body.candidateName)) issues.push("Candidate name is required");
  if (!isNonEmptyString(body.candidateEmail)) issues.push("Candidate email is required");
  if (!isObjectIdLike(body.jobId)) issues.push("Valid job ID is required");
  return issues;
}

function validateReferralId(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid referral id"];
}

// Alumni: submit a referral
router.post(
  "/",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateBody(validateReferralBody),
  async (req, res, next) => {
    try {
      const { Referral, Job } = getTenantModels(req);

      // Verify job exists
      const job = await Job.findOne({
        _id: req.body.jobId,
        instituteId: req.tenant._id,
        status: "published"
      });

      if (!job) {
        const error = new Error("Job not found or not published");
        error.statusCode = 404;
        throw error;
      }

      // Check for duplicate
      const existing = await Referral.findOne({
        jobId: req.body.jobId,
        candidateEmail: req.body.candidateEmail.toLowerCase().trim(),
        instituteId: req.tenant._id
      });

      if (existing) {
        const error = new Error("This candidate has already been referred for this job");
        error.statusCode = 400;
        throw error;
      }

      const referral = await Referral.create({
        instituteId: req.tenant._id,
        jobId: req.body.jobId,
        referrerId: req.user._id,
        candidateName: req.body.candidateName,
        candidateEmail: req.body.candidateEmail,
        candidatePhone: req.body.candidatePhone || "",
        candidateResume: req.body.candidateResume || "",
        referralNote: req.body.referralNote || "",
        relationship: req.body.relationship || ""
      });

      await referral.populate("jobId", "title company");
      await referral.populate("referrerId", "name email");

      res.status(201).json(referral);
    } catch (error) {
      next(error);
    }
  }
);

// Alumni: list my referrals
router.get(
  "/my",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { Referral } = getTenantModels(req);
      const referrals = await Referral.find({
        referrerId: req.user._id,
        instituteId: req.tenant._id
      })
        .populate("jobId", "title company location")
        .sort({ createdAt: -1 });

      res.json(referrals);
    } catch (error) {
      next(error);
    }
  }
);

// Admin: list referrals for a specific job
router.get(
  "/job/:id",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateParams(validateReferralId),
  async (req, res, next) => {
    try {
      const { Referral } = getTenantModels(req);
      const referrals = await Referral.find({
        jobId: req.params.id,
        instituteId: req.tenant._id
      })
        .populate("referrerId", "name email")
        .populate("reviewedBy", "name")
        .sort({ createdAt: -1 });

      res.json(referrals);
    } catch (error) {
      next(error);
    }
  }
);

// Admin: list all referrals
router.get(
  "/",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { Referral } = getTenantModels(req);
      const filter = { instituteId: req.tenant._id };

      if (req.query.status) filter.status = req.query.status;

      const referrals = await Referral.find(filter)
        .populate("jobId", "title company")
        .populate("referrerId", "name email")
        .populate("reviewedBy", "name")
        .sort({ createdAt: -1 });

      res.json(referrals);
    } catch (error) {
      next(error);
    }
  }
);

// Admin: review a referral (accept/reject)
router.patch(
  "/:id/review",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateParams(validateReferralId),
  async (req, res, next) => {
    try {
      const { status, adminNote } = req.body;
      if (!["reviewed", "accepted", "rejected"].includes(status)) {
        const error = new Error("Status must be reviewed, accepted, or rejected");
        error.statusCode = 400;
        throw error;
      }

      const { Referral } = getTenantModels(req);
      const referral = await Referral.findOneAndUpdate(
        {
          _id: req.params.id,
          instituteId: req.tenant._id
        },
        {
          status,
          adminNote: adminNote || "",
          reviewedBy: req.user._id,
          reviewedAt: new Date()
        },
        { new: true, runValidators: true }
      )
        .populate("jobId", "title company")
        .populate("referrerId", "name email")
        .populate("reviewedBy", "name");

      if (!referral) {
        const error = new Error("Referral not found");
        error.statusCode = 404;
        throw error;
      }

      res.json(referral);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
