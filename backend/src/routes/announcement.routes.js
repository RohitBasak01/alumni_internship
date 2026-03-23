import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { isNonEmptyString, isObjectIdLike } from "../utils/validation.js";

const router = express.Router();

function validateAnnouncementBody(body) {
  const issues = [];
  if (!isNonEmptyString(body.title)) issues.push("Announcement title is required");
  if (!isNonEmptyString(body.content)) issues.push("Announcement content is required");
  return issues;
}

function validateAnnouncementId(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid announcement id"];
}

router.get("/", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const { Announcement } = getTenantModels(req);
    const filter =
      req.user.role === "institute_admin"
        ? { instituteId: req.tenant._id }
        : { instituteId: req.tenant._id, status: "published" };

    const announcements = await Announcement.find(filter).sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  validateBody(validateAnnouncementBody),
  async (req, res, next) => {
  try {
    const { Announcement } = getTenantModels(req);
    const announcement = await Announcement.create({
      ...req.body,
      instituteId: req.tenant._id,
      createdBy: req.user._id
    });

    res.status(201).json(announcement);
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
  validateParams(validateAnnouncementId),
  async (req, res, next) => {
  try {
    const { Announcement } = getTenantModels(req);
    const announcement = await Announcement.findOneAndUpdate(
      {
        _id: req.params.id,
        instituteId: req.tenant._id
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!announcement) {
      const error = new Error("Announcement not found");
      error.statusCode = 404;
      throw error;
    }

    res.json(announcement);
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
  validateParams(validateAnnouncementId),
  async (req, res, next) => {
  try {
    const { Announcement } = getTenantModels(req);
    const announcement = await Announcement.findOneAndDelete({
      _id: req.params.id,
      instituteId: req.tenant._id
    });

    if (!announcement) {
      const error = new Error("Announcement not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    next(error);
  }
  }
);

export default router;
