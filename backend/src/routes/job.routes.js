import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { sendApplicationEmail } from "../utils/email.js";
import { isNonEmptyString, isObjectIdLike } from "../utils/validation.js";

const router = express.Router();

function inferJobType(job) {
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();
  if (text.includes("intern")) return "Internship";
  if (text.includes("contract")) return "Contract";
  return "Full-time";
}

function inferLocation(job) {
  if (job.location) return job.location;
  const text = `${job.title || ""} ${job.description || ""} ${job.company || ""}`.toLowerCase();
  if (text.includes("remote")) return "Remote";
  if (text.includes("hybrid")) return "Hybrid";
  return "On-site";
}

function inferIndustry(job) {
  if (job.industry) return job.industry;
  const text = `${job.title || ""} ${job.company || ""} ${job.description || ""}`.toLowerCase();
  if (text.includes("design")) return "Design";
  if (text.includes("marketing")) return "Marketing";
  if (text.includes("bank") || text.includes("finance")) return "Finance";
  if (text.includes("operations")) return "Operations";
  return "Technology";
}

function mapAdminStatus(job) {
  if (job.status === "pending_approval") return "Pending";
  if (job.status === "rejected") return "Rejected";
  if (job.status === "expired") return "Expired";
  return "Approved";
}

function normalizeDateOrNull(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function syncExpiredJobs(Job, instituteId) {
  await Job.updateMany(
    {
      instituteId,
      status: "published",
      applicationDeadline: { $lt: new Date() }
    },
    {
      $set: {
        status: "expired"
      }
    }
  );
}

function formatJob(job, user) {
  const posterId = job.postedBy?._id?.toString?.() || job.postedBy?.toString?.() || "";
  const currentUserId = user?._id?.toString?.() || "";
  const isOwnPosting = posterId && currentUserId && posterId === currentUserId;

  return {
    _id: job._id,
    instituteId: job.instituteId,
    title: job.title,
    company: job.company,
    description: job.description,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    postedBy: job.postedBy,
    postedById: posterId,
    jobType: inferJobType(job),
    locationLabel: inferLocation(job),
    cityLabel: inferLocation(job),
    industryLabel: inferIndustry(job),
    adminStatus: mapAdminStatus(job),
    requestedDeadline: job.requestedDeadline,
    applicationDeadline: job.applicationDeadline,
    postedByLabel: job.postedBy?.name || "Institute Admin",
    canApply: job.status === "published" && !isOwnPosting,
    isOwnPosting
  };
}

function validateJobBody(body) {
  const issues = [];
  if (!isNonEmptyString(body.title)) issues.push("Job title is required");
  if (!isNonEmptyString(body.company)) issues.push("Company is required");
  if (!isNonEmptyString(body.description)) issues.push("Description is required");
  if (body.requestedDeadline && !normalizeDateOrNull(body.requestedDeadline)) issues.push("Requested deadline must be a valid date");
  if (body.applicationDeadline && !normalizeDateOrNull(body.applicationDeadline)) issues.push("Application deadline must be a valid date");
  return issues;
}

function validateJobId(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid job id"];
}

router.get("/", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const { Job } = getTenantModels(req);
    await syncExpiredJobs(Job, req.tenant?._id);

    const filter =
      req.user.role === "institute_admin"
        ? { instituteId: req.tenant?._id }
        : {
            instituteId: req.tenant?._id,
            $or: [
              {
                status: "published",
                applicationDeadline: { $gte: new Date() }
              },
              {
                postedBy: req.user._id
              }
            ]
          };

    const jobs = await Job.find(filter).populate("postedBy", "name email").sort({ createdAt: -1 });
    res.json(jobs.map((job) => formatJob(job, req.user)));
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  protect,
  requireTenantAccess,
  validateBody(validateJobBody),
  async (req, res, next) => {
    try {
      const { Job } = getTenantModels(req);
      const requestedDeadline = normalizeDateOrNull(req.body.requestedDeadline);
      const applicationDeadline = req.user.role === "institute_admin" ? normalizeDateOrNull(req.body.applicationDeadline || req.body.requestedDeadline) : null;
      const isAdmin = req.user.role === "institute_admin";
      const job = await Job.create({
        title: req.body.title,
        company: req.body.company,
        description: req.body.description,
        location: req.body.location,
        industry: req.body.industry,
        requestedDeadline,
        applicationDeadline,
        instituteId: req.tenant._id,
        postedBy: req.user._id,
        approvedBy: isAdmin ? req.user._id : null,
        approvedAt: isAdmin ? new Date() : null,
        status: isAdmin ? "published" : "pending_approval"
      });

      await job.populate("postedBy", "name email");
      res.status(201).json(formatJob(job, req.user));
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
  validateParams(validateJobId),
  async (req, res, next) => {
    try {
      const { Job } = getTenantModels(req);
      const update = {
        title: req.body.title,
        company: req.body.company,
        description: req.body.description,
        location: req.body.location,
        industry: req.body.industry
      };

      if (req.body.requestedDeadline !== undefined) {
        update.requestedDeadline = normalizeDateOrNull(req.body.requestedDeadline);
      }

      if (req.body.status === "published") {
        const approvedDeadline = normalizeDateOrNull(req.body.applicationDeadline || req.body.requestedDeadline);

        if (!approvedDeadline) {
          const error = new Error("Approved jobs must have a valid application deadline");
          error.statusCode = 400;
          throw error;
        }

        update.status = "published";
        update.applicationDeadline = approvedDeadline;
        update.approvedBy = req.user._id;
        update.approvedAt = new Date();
        update.rejectedAt = null;
      } else if (req.body.status === "rejected") {
        update.status = "rejected";
        update.rejectedAt = new Date();
        update.applicationDeadline = null;
        update.approvedBy = null;
        update.approvedAt = null;
      } else if (req.body.status === "expired") {
        update.status = "expired";
      }

      const job = await Job.findOneAndUpdate(
        {
          _id: req.params.id,
          instituteId: req.tenant._id
        },
        update,
        { new: true, runValidators: true }
      );

      if (!job) {
        const error = new Error("Job not found");
        error.statusCode = 404;
        throw error;
      }

      await job.populate("postedBy", "name email");
      res.json(formatJob(job, req.user));
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
  validateParams(validateJobId),
  async (req, res, next) => {
    try {
      const { Job } = getTenantModels(req);
      const job = await Job.findOneAndDelete({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!job) {
        const error = new Error("Job not found");
        error.statusCode = 404;
        throw error;
      }

      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/apply",
  protect,
  requireTenantAccess,
  validateParams(validateJobId),
  async (req, res, next) => {
    try {
      const { Job, JobApplication, AlumniProfile } = getTenantModels(req);
      const { coverLetter, resumeUrl, resumeFileName } = req.body;
      await syncExpiredJobs(Job, req.tenant?._id);

      // Check if job exists
      const job = await Job.findById(req.params.id).populate("postedBy", "name email");
      if (!job) {
        const error = new Error("Job not found");
        error.statusCode = 404;
        throw error;
      }

      if (job.status !== "published") {
        const error = new Error("This job is not accepting applications");
        error.statusCode = 400;
        throw error;
      }

      if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
        job.status = "expired";
        await job.save();
        const error = new Error("The application deadline for this job has passed");
        error.statusCode = 400;
        throw error;
      }

      if (job.postedBy?._id?.toString?.() === req.user._id.toString()) {
        const error = new Error("You cannot apply to your own job posting");
        error.statusCode = 400;
        throw error;
      }

      // Check if already applied
      const existingApplication = await JobApplication.findOne({
        jobId: req.params.id,
        userId: req.user._id
      });

      if (existingApplication) {
        const error = new Error("You have already applied to this job");
        error.statusCode = 409;
        throw error;
      }

      // Get applicant's profile
      const applicantProfile = await AlumniProfile.findOne({
        userId: req.user._id,
        instituteId: req.tenant._id
      });

      // Create application
      const application = await JobApplication.create({
        jobId: req.params.id,
        userId: req.user._id,
        coverLetter: coverLetter || "",
        resumeUrl: resumeUrl || "",
        resumeFileName: resumeFileName || ""
      });

      await application.populate("jobId", "title company");
      await application.populate("userId", "name email");

      // Send email to job poster with applicant resume and profile
      try {
        await sendApplicationEmail({
          jobPosterEmail: job.postedBy.email,
          jobPosterName: job.postedBy.name,
          jobTitle: job.title,
          applicantName: req.user.name,
          applicantEmail: req.user.email,
          applicantProfile: {
            company: applicantProfile?.company,
            designation: applicantProfile?.designation,
            batch: applicantProfile?.batch,
            department: applicantProfile?.department,
            location: applicantProfile?.location,
            bio: applicantProfile?.bio,
            skills: applicantProfile?.skills
          },
          coverLetter,
          resumeUrl,
          resumeFileName
        });
      } catch (emailError) {
        console.error("Failed to send application email:", emailError);
        // Don't fail the application if email fails
      }

      res.status(201).json({
        _id: application._id,
        jobId: application.jobId,
        userId: application.userId,
        coverLetter: application.coverLetter,
        resumeFileName: application.resumeFileName,
        status: application.status,
        createdAt: application.createdAt,
        message: "Application submitted successfully"
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
