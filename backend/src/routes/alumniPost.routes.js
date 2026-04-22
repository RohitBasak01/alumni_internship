import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { hasMinLength, isNonEmptyString, isObjectIdLike } from "../utils/validation.js";
import { createNotification } from "../utils/notifications.js";

const router = express.Router();

function validatePostBody(body) {
  const issues = [];

  if (!hasMinLength(body.content, 10)) {
    issues.push("Post content must be at least 10 characters long");
  }

  if (body.title && !isNonEmptyString(body.title)) {
    issues.push("Post title cannot be empty");
  }

  return issues;
}

function validateCommentBody(body) {
  return hasMinLength(body.content, 2) ? [] : ["Comment must be at least 2 characters long"];
}

function validateReportBody(body) {
  return hasMinLength(body.reason, 5) ? [] : ["Report reason must be at least 5 characters long"];
}

function validatePostId(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid post id"];
}

async function buildProfileMap(tenantModels, userIds, instituteId) {
  const { AlumniProfile } = tenantModels;
  const ids = [...new Set(userIds.filter(Boolean).map((value) => value.toString()))];

  if (!ids.length) {
    return new Map();
  }

  const profiles = await AlumniProfile.find({
    instituteId,
    userId: { $in: ids }
  });

  return new Map(profiles.map((profile) => [profile.userId.toString(), profile]));
}

function buildAuthorPayload(user, profile) {
  const name = user?.name || "Alumni Member";
  return {
    id: user?._id,
    name,
    email: user?.email || "",
    initials: name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase(),
    batch: profile?.batch || profile?.leavingYear || null,
    department: profile?.department || profile?.lastClassAttended || "",
    company: profile?.company || profile?.currentInstitution || "",
    designation: profile?.designation || profile?.occupation || "",
    location: profile?.location || ""
  };
}

async function formatPost(post, req, tenantModels) {
  await post.populate([
    { path: "authorUserId", select: "name email role isActive" },
    { path: "comments.userId", select: "name email role isActive" }
  ]);

  const commentUserIds = (post.comments || []).map((comment) => comment.userId?._id || comment.userId);
  const profileMap = await buildProfileMap(tenantModels, [post.authorUserId?._id || post.authorUserId, ...commentUserIds], req.tenant._id);
  const currentUserId = req.user._id.toString();
  const authorUserId = post.authorUserId?._id?.toString?.() || post.authorUserId?.toString?.() || "";

  return {
    _id: post._id,
    instituteId: post.instituteId,
    title: post.title || "",
    content: post.content,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    status: post.status,
    author: buildAuthorPayload(post.authorUserId, profileMap.get(authorUserId)),
    likeCount: post.likes.length,
    commentCount: post.comments.length,
    likedByCurrentUser: post.likes.some((item) => item.toString() === currentUserId),
    reportedByCurrentUser: post.reports.some((item) => item.reporterUserId.toString() === currentUserId),
    canManage: req.user.role === "institute_admin" || authorUserId === currentUserId,
    comments: post.comments
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((comment) => {
        const commentUserId = comment.userId?._id?.toString?.() || comment.userId?.toString?.() || "";
        return {
          _id: comment._id,
          content: comment.content,
          createdAt: comment.createdAt,
          author: buildAuthorPayload(comment.userId, profileMap.get(commentUserId))
        };
      })
  };
}

router.get("/", protect, authorize("alumni", "institute_admin"), requireTenantAccess, async (req, res, next) => {
  try {
    const { AlumniPost } = getTenantModels(req);
    const posts = await AlumniPost.find({
      instituteId: req.tenant._id,
      status: "active"
    })
      .sort({ createdAt: -1 })
      .limit(25);

    const formattedPosts = await Promise.all(posts.map((post) => formatPost(post, req, getTenantModels(req))));
    res.json(formattedPosts);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateBody(validatePostBody),
  async (req, res, next) => {
    try {
      const { AlumniPost } = getTenantModels(req);
      const post = await AlumniPost.create({
        instituteId: req.tenant._id,
        authorUserId: req.user._id,
        title: req.body.title?.trim?.() || "",
        content: req.body.content.trim()
      });

      res.status(201).json(await formatPost(post, req, getTenantModels(req)));
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  protect,
  authorize("alumni", "institute_admin"),
  requireTenantAccess,
  validateParams(validatePostId),
  async (req, res, next) => {
    try {
      const { AlumniPost } = getTenantModels(req);
      const post = await AlumniPost.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        status: "active"
      });

      if (!post) {
        const error = new Error("Post not found");
        error.statusCode = 404;
        throw error;
      }

      res.json(await formatPost(post, req, getTenantModels(req)));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/like",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validatePostId),
  async (req, res, next) => {
    try {
      const { AlumniPost } = getTenantModels(req);
      const post = await AlumniPost.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        status: "active"
      });

      if (!post) {
        const error = new Error("Post not found");
        error.statusCode = 404;
        throw error;
      }

      const currentUserId = req.user._id.toString();
      const likeIndex = post.likes.findIndex((item) => item.toString() === currentUserId);

      const isNewLike = likeIndex < 0;

      if (likeIndex >= 0) {
        post.likes.splice(likeIndex, 1);
      } else {
        post.likes.push(req.user._id);
      }

      await post.save();

      if (isNewLike && post.authorUserId.toString() !== req.user._id.toString()) {
        await createNotification(getTenantModels(req), {
          instituteId: req.tenant._id,
          userId: post.authorUserId,
          actorUserId: req.user._id,
          category: "connections",
          type: "post_like",
          title: `${req.user.name} liked your post`,
          message: post.title || "One of your alumni posts received a new like.",
          entityType: "AlumniPost",
          entityId: post._id,
          linkTo: "/portal/notifications",
          metadata: {
            postTitle: post.title || ""
          }
        });
      }

      res.json(await formatPost(post, req, getTenantModels(req)));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/comments",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validatePostId),
  validateBody(validateCommentBody),
  async (req, res, next) => {
    try {
      const { AlumniPost } = getTenantModels(req);
      const post = await AlumniPost.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        status: "active"
      });

      if (!post) {
        const error = new Error("Post not found");
        error.statusCode = 404;
        throw error;
      }

      post.comments.push({
        userId: req.user._id,
        content: req.body.content.trim()
      });

      await post.save();

      if (post.authorUserId.toString() !== req.user._id.toString()) {
        await createNotification(getTenantModels(req), {
          instituteId: req.tenant._id,
          userId: post.authorUserId,
          actorUserId: req.user._id,
          category: "connections",
          type: "post_comment",
          title: `${req.user.name} commented on your post`,
          message: req.body.content.trim(),
          entityType: "AlumniPost",
          entityId: post._id,
          linkTo: "/portal/notifications",
          metadata: {
            postTitle: post.title || ""
          }
        });
      }

      res.status(201).json(await formatPost(post, req, getTenantModels(req)));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/report",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validatePostId),
  validateBody(validateReportBody),
  async (req, res, next) => {
    try {
      const { AlumniPost } = getTenantModels(req);
      const post = await AlumniPost.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id,
        status: "active"
      });

      if (!post) {
        const error = new Error("Post not found");
        error.statusCode = 404;
        throw error;
      }

      if (post.authorUserId.toString() === req.user._id.toString()) {
        const error = new Error("You cannot report your own post");
        error.statusCode = 400;
        throw error;
      }

      const existingReport = post.reports.find((item) => item.reporterUserId.toString() === req.user._id.toString());

      if (existingReport) {
        existingReport.reason = req.body.reason.trim();
        existingReport.updatedAt = new Date();
      } else {
        post.reports.push({
          reporterUserId: req.user._id,
          reason: req.body.reason.trim()
        });
      }

      await post.save();
      res.json({ message: "Post reported successfully" });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  protect,
  authorize("alumni", "institute_admin"),
  requireTenantAccess,
  validateParams(validatePostId),
  async (req, res, next) => {
    try {
      const { AlumniPost } = getTenantModels(req);
      const post = await AlumniPost.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!post) {
        const error = new Error("Post not found");
        error.statusCode = 404;
        throw error;
      }

      const isAuthor = post.authorUserId.toString() === req.user._id.toString();
      const isAdmin = req.user.role === "institute_admin";

      if (!isAuthor && !isAdmin) {
        const error = new Error("You do not have permission to delete this post");
        error.statusCode = 403;
        throw error;
      }

      await post.softDelete();

      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

