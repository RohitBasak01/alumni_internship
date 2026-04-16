import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { isNonEmptyString, isObjectIdLike } from "../utils/validation.js";

const router = express.Router();

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateCreateGalleryItemBody(body) {
  const issues = [];

  if (!isNonEmptyString(body.section) || !["images", "videos", "personal_photos"].includes(body.section)) {
    issues.push("Section must be images, videos, or personal_photos");
  }

  if (!isNonEmptyString(body.mediaType) || !["image", "video"].includes(body.mediaType)) {
    issues.push("Media type must be image or video");
  }

  if (!isNonEmptyString(body.url) || !isValidHttpUrl(body.url)) {
    issues.push("A valid http(s) media URL is required");
  }

  if (body.caption !== undefined && body.caption !== null && typeof body.caption !== "string") {
    issues.push("Caption must be a string");
  }

  return issues;
}

function validateGalleryItemParams(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid gallery item id"];
}

function assertCreatePolicy(userRole, section, mediaType) {
  if (userRole === "institute_admin") {
    if (section === "personal_photos") {
      const error = new Error("Institute admins can upload only to images or videos sections");
      error.statusCode = 403;
      throw error;
    }

    if (section === "images" && mediaType !== "image") {
      const error = new Error("Images section accepts only image media type");
      error.statusCode = 400;
      throw error;
    }

    if (section === "videos" && mediaType !== "video") {
      const error = new Error("Videos section accepts only video media type");
      error.statusCode = 400;
      throw error;
    }

    return;
  }

  if (userRole === "alumni") {
    if (section !== "personal_photos" || mediaType !== "image") {
      const error = new Error("Alumni can upload only image media to personal_photos section");
      error.statusCode = 403;
      throw error;
    }

    return;
  }

  const error = new Error("You do not have permission to upload media");
  error.statusCode = 403;
  throw error;
}

router.get("/", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const { GalleryItem } = getTenantModels(req);
    const items = await GalleryItem.find({ instituteId: req.tenant._id })
      .populate("userId", "name role")
      .sort({ createdAt: -1 });

    res.json(
      items.map((item) => ({
        _id: item._id,
        section: item.section,
        mediaType: item.mediaType,
        url: item.url,
        caption: item.caption,
        uploader: {
          id: item.userId?._id || null,
          name: item.userId?.name || "Unknown User",
          role: item.userId?.role || "unknown"
        },
        createdAt: item.createdAt
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post("/", protect, requireTenantAccess, validateBody(validateCreateGalleryItemBody), async (req, res, next) => {
  try {
    const { GalleryItem } = getTenantModels(req);
    const { section, mediaType, url, caption } = req.body;

    assertCreatePolicy(req.user.role, section, mediaType);

    const created = await GalleryItem.create({
      instituteId: req.tenant._id,
      userId: req.user._id,
      section,
      mediaType,
      url: url.trim(),
      caption: (caption || "").trim()
    });

    await created.populate("userId", "name role");

    res.status(201).json({
      _id: created._id,
      section: created.section,
      mediaType: created.mediaType,
      url: created.url,
      caption: created.caption,
      uploader: {
        id: created.userId?._id || null,
        name: created.userId?.name || "Unknown User",
        role: created.userId?.role || "unknown"
      },
      createdAt: created.createdAt
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", protect, requireTenantAccess, validateParams(validateGalleryItemParams), async (req, res, next) => {
  try {
    const { GalleryItem } = getTenantModels(req);
    const item = await GalleryItem.findOne({
      _id: req.params.id,
      instituteId: req.tenant._id
    });

    if (!item) {
      const error = new Error("Gallery item not found");
      error.statusCode = 404;
      throw error;
    }

    const isInstituteAdmin = req.user.role === "institute_admin";
    const isOwner = item.userId.toString() === req.user._id.toString();

    if (!isInstituteAdmin && !isOwner) {
      const error = new Error("You do not have permission to remove this item");
      error.statusCode = 403;
      throw error;
    }

    if (req.user.role === "alumni" && item.section !== "personal_photos") {
      const error = new Error("Alumni can remove only their personal photos");
      error.statusCode = 403;
      throw error;
    }

    await item.deleteOne();
    res.json({ message: "Gallery item removed" });
  } catch (error) {
    next(error);
  }
});

export default router;