import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";
import { authorizeWithDelegation } from "../middleware/delegation.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { isNonEmptyString, isObjectIdLike } from "../utils/validation.js";

const router = express.Router();
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const uploadsRoot = path.join(backendRoot, "uploads");

const galleryUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(uploadsRoot, "gallery", req.tenant._id.toString());
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}-${file.originalname.replace(/\s+/g, "-")}`);
    }
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set(["image/jpeg", "image/png", "video/mp4", "video/quicktime"]);
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Only JPG, PNG, MP4, and MOV files are allowed"));
  }
});

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidGalleryMediaUrl(value) {
  const trimmed = String(value || "").trim();
  return isValidHttpUrl(trimmed) || trimmed.startsWith("/uploads/");
}

function normalizeGalleryMediaUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed.startsWith("/uploads/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.pathname.startsWith("/uploads/") ? parsed.pathname : trimmed;
  } catch {
    return trimmed;
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

  if (!isNonEmptyString(body.url) || !isValidGalleryMediaUrl(body.url)) {
    issues.push("A valid http(s) media URL or /uploads path is required");
  }

  if (body.caption !== undefined && body.caption !== null && typeof body.caption !== "string") {
    issues.push("Caption must be a string");
  }

  return issues;
}

function validateGalleryItemParams(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid gallery item id"];
}

function validateGalleryCommentBody(body) {
  return isNonEmptyString(body.content) && String(body.content).trim().length >= 2
    ? []
    : ["Comment must be at least 2 characters long"];
}

function formatGalleryItem(item, req) {
  const currentUserId = req.user?._id?.toString?.() || "";

  return {
    _id: item._id,
    section: item.section,
    mediaType: item.mediaType,
    url: normalizeGalleryMediaUrl(item.url),
    caption: item.caption,
    uploader: {
      id: item.userId?._id || null,
      name: item.userId?.name || "Unknown User",
      role: item.userId?.role || "unknown"
    },
    likeCount: item.likes?.length || 0,
    commentCount: item.comments?.length || 0,
    likedByCurrentUser: (item.likes || []).some((id) => id.toString() === currentUserId),
    comments: (item.comments || [])
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((comment) => ({
        _id: comment._id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
          id: comment.userId?._id || null,
          name: comment.userId?.name || "Unknown User",
          role: comment.userId?.role || "unknown"
        }
      })),
    createdAt: item.createdAt
  };
}

function assertCreatePolicy(user, section, mediaType) {
  const userRole = user.role;
  if (userRole === "institute_admin") {
    // Delegated admins must have manage_gallery scope
    if (user.isDelegatedAdmin && !user.delegatedPermissions?.includes("manage_gallery")) {
      const error = new Error("Your delegated admin access does not include the \"manage_gallery\" permission");
      error.statusCode = 403;
      throw error;
    }

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
      .populate("comments.userId", "name role")
      .sort({ createdAt: -1 });

    res.json(items.map((item) => formatGalleryItem(item, req)));
  } catch (error) {
    next(error);
  }
});

router.post("/", protect, requireTenantAccess, validateBody(validateCreateGalleryItemBody), async (req, res, next) => {
  try {
    const { GalleryItem } = getTenantModels(req);
    const { section, mediaType, url, caption } = req.body;

    assertCreatePolicy(req.user, section, mediaType);

    const created = await GalleryItem.create({
      instituteId: req.tenant._id,
      userId: req.user._id,
      section,
      mediaType,
      url: url.trim(),
      caption: (caption || "").trim()
    });

    await created.populate("userId", "name role");

    res.status(201).json(formatGalleryItem(created, req));
  } catch (error) {
    next(error);
  }
});

router.post("/upload", protect, requireTenantAccess, galleryUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("No file uploaded");
      error.statusCode = 400;
      throw error;
    }

    const mediaType = req.file.mimetype.startsWith("video/") ? "video" : "image";
    const publicPath = `/uploads/gallery/${req.tenant._id}/${req.file.filename}`;

    res.status(201).json({
      name: req.file.originalname,
      url: publicPath,
      publicPath,
      absoluteUrl: `${req.protocol}://${req.get("host")}${publicPath}`,
      mimeType: req.file.mimetype,
      mediaType,
      size: req.file.size
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/like", protect, requireTenantAccess, validateParams(validateGalleryItemParams), async (req, res, next) => {
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

    const currentUserId = req.user._id.toString();
    const likeIndex = item.likes.findIndex((id) => id.toString() === currentUserId);

    if (likeIndex >= 0) {
      item.likes.splice(likeIndex, 1);
    } else {
      item.likes.push(req.user._id);
    }

    await item.save();
    await item.populate("userId", "name role");
    await item.populate("comments.userId", "name role");

    res.json(formatGalleryItem(item, req));
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/comments",
  protect,
  requireTenantAccess,
  validateParams(validateGalleryItemParams),
  validateBody(validateGalleryCommentBody),
  async (req, res, next) => {
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

      item.comments.push({
        userId: req.user._id,
        content: req.body.content.trim()
      });

      await item.save();
      await item.populate("userId", "name role");
      await item.populate("comments.userId", "name role");

      res.status(201).json(formatGalleryItem(item, req));
    } catch (error) {
      next(error);
    }
  }
);

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

    const isInstituteAdmin = req.user.role === "institute_admin" &&
      (!req.user.isDelegatedAdmin || req.user.delegatedPermissions?.includes("manage_gallery"));
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
