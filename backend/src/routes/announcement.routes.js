import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { isNonEmptyString, isObjectIdLike } from "../utils/validation.js";
import { createNotificationsForUsers, listActiveAlumniUserIds } from "../utils/notifications.js";

const router = express.Router();

function validateAnnouncementBody(body) {
  const issues = [];
  if (!isNonEmptyString(body.title)) issues.push("Announcement title is required");
  if (!isNonEmptyString(body.content)) issues.push("Announcement content is required");
  if (body.category !== undefined && body.category !== null && typeof body.category !== "string") {
    issues.push("Category must be a string");
  }
  if (body.summary !== undefined && body.summary !== null && typeof body.summary !== "string") {
    issues.push("Summary must be a string");
  }
  if (body.imageUrl !== undefined && body.imageUrl !== null && typeof body.imageUrl !== "string") {
    issues.push("Image URL must be a string");
  }
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
    const status = req.body.status === "draft" ? "draft" : "published";
    const announcement = await Announcement.create({
      instituteId: req.tenant._id,
      title: req.body.title.trim(),
      category: req.body.category?.trim?.() || "News",
      summary: req.body.summary?.trim?.() || "",
      imageUrl: req.body.imageUrl?.trim?.() || "",
      content: req.body.content.trim(),
      status,
      publishedAt: status === "published" ? new Date() : null,
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
    const existing = await Announcement.findOne({
      _id: req.params.id,
      instituteId: req.tenant._id
    });

    if (!existing) {
      const error = new Error("Announcement not found");
      error.statusCode = 404;
      throw error;
    }

    const status = req.body.status === "draft" ? "draft" : "published";
    const announcement = await Announcement.findOneAndUpdate(
      {
        _id: req.params.id,
        instituteId: req.tenant._id
      },
      {
        title: req.body.title?.trim?.() || existing.title,
        category: req.body.category?.trim?.() || "News",
        summary: req.body.summary?.trim?.() || "",
        imageUrl: req.body.imageUrl?.trim?.() || "",
        content: req.body.content?.trim?.() || existing.content,
        status,
        publishedAt:
          status === "published"
            ? existing.publishedAt || new Date()
            : null
      },
      { new: true, runValidators: true }
    );

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
    const announcement = await Announcement.findOne({
      _id: req.params.id,
      instituteId: req.tenant._id
    });

    if (!announcement) {
      const error = new Error("Announcement not found");
      error.statusCode = 404;
      throw error;
    }

    await announcement.softDelete();

    res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    next(error);
  }
  }
);

export default router;

