import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ══════════════════════════════════════════════════════════
   THREADS
   ══════════════════════════════════════════════════════════ */

/* ── LIST threads (paginated, filterable) ────────────────── */
router.get(
  "/",
  protect,
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { ForumThread } = getTenantModels(req);
      const filter = { instituteId: req.tenant._id };

      if (req.query.category) filter.category = req.query.category;
      if (req.query.tag) filter.tags = req.query.tag;
      if (req.query.search) {
        const re = new RegExp(req.query.search, "i");
        filter.$or = [{ title: re }, { body: re }, { tags: re }];
      }

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const [threads, total] = await Promise.all([
        ForumThread.find(filter)
          .populate("authorId", "name email")
          .sort({ isPinned: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ForumThread.countDocuments(filter)
      ]);

      const uid = req.user._id.toString();
      const formatted = threads.map(t => ({
        ...t,
        upvoteCount: t.upvotes?.length || 0,
        hasUpvoted: (t.upvotes || []).some(u => u.toString() === uid)
      }));

      res.json({ threads: formatted, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
      next(error);
    }
  }
);

/* ── CREATE thread ───────────────────────────────────────── */
router.post(
  "/",
  protect,
  authorize("alumni", "institute_admin"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { ForumThread } = getTenantModels(req);
      const { title, body, category, tags } = req.body;

      if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
      if (!body?.trim()) return res.status(400).json({ message: "Body is required" });

      const thread = await ForumThread.create({
        instituteId: req.tenant._id,
        title: title.trim(),
        body: body.trim(),
        category: category || "general",
        tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [],
        authorId: req.user._id
      });

      await thread.populate("authorId", "name email");

      res.status(201).json(thread);
    } catch (error) {
      next(error);
    }
  }
);

/* ── GET single thread + replies ─────────────────────────── */
router.get(
  "/:id",
  protect,
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { ForumThread, ForumReply } = getTenantModels(req);

      const thread = await ForumThread.findOneAndUpdate(
        { _id: req.params.id, instituteId: req.tenant._id },
        { $inc: { viewCount: 1 } },
        { new: true }
      )
        .populate("authorId", "name email")
        .lean();

      if (!thread) return res.status(404).json({ message: "Thread not found" });

      const replies = await ForumReply.find({
        threadId: thread._id,
        instituteId: req.tenant._id
      })
        .populate("authorId", "name email")
        .sort({ isAccepted: -1, createdAt: 1 })
        .lean();

      const uid = req.user._id.toString();

      res.json({
        ...thread,
        upvoteCount: thread.upvotes?.length || 0,
        hasUpvoted: (thread.upvotes || []).some(u => u.toString() === uid),
        replies: replies.map(r => ({
          ...r,
          upvoteCount: r.upvotes?.length || 0,
          hasUpvoted: (r.upvotes || []).some(u => u.toString() === uid)
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ── POST reply to thread ────────────────────────────────── */
router.post(
  "/:id/replies",
  protect,
  authorize("alumni", "institute_admin"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { ForumThread, ForumReply } = getTenantModels(req);

      const thread = await ForumThread.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!thread) return res.status(404).json({ message: "Thread not found" });
      if (thread.isLocked) return res.status(403).json({ message: "Thread is locked" });

      const { body, parentReplyId } = req.body;
      if (!body?.trim()) return res.status(400).json({ message: "Reply body is required" });

      const reply = await ForumReply.create({
        instituteId: req.tenant._id,
        threadId: thread._id,
        body: body.trim(),
        authorId: req.user._id,
        parentReplyId: parentReplyId || null
      });

      thread.replyCount = (thread.replyCount || 0) + 1;
      await thread.save();

      await reply.populate("authorId", "name email");

      res.status(201).json(reply);
    } catch (error) {
      next(error);
    }
  }
);

/* ── UPVOTE thread ───────────────────────────────────────── */
router.post(
  "/:id/upvote",
  protect,
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { ForumThread } = getTenantModels(req);
      const thread = await ForumThread.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!thread) return res.status(404).json({ message: "Thread not found" });

      const uid = req.user._id;
      const idx = thread.upvotes.findIndex(u => u.toString() === uid.toString());
      if (idx >= 0) {
        thread.upvotes.splice(idx, 1);
      } else {
        thread.upvotes.push(uid);
      }

      await thread.save();
      res.json({ upvoteCount: thread.upvotes.length, hasUpvoted: idx < 0 });
    } catch (error) {
      next(error);
    }
  }
);

/* ── UPVOTE reply ────────────────────────────────────────── */
router.post(
  "/replies/:id/upvote",
  protect,
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { ForumReply } = getTenantModels(req);
      const reply = await ForumReply.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!reply) return res.status(404).json({ message: "Reply not found" });

      const uid = req.user._id;
      const idx = reply.upvotes.findIndex(u => u.toString() === uid.toString());
      if (idx >= 0) {
        reply.upvotes.splice(idx, 1);
      } else {
        reply.upvotes.push(uid);
      }

      await reply.save();
      res.json({ upvoteCount: reply.upvotes.length, hasUpvoted: idx < 0 });
    } catch (error) {
      next(error);
    }
  }
);

/* ── PIN/UNPIN thread (admin) ────────────────────────────── */
router.patch(
  "/:id/pin",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { ForumThread } = getTenantModels(req);
      const thread = await ForumThread.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!thread) return res.status(404).json({ message: "Thread not found" });

      thread.isPinned = !thread.isPinned;
      await thread.save();

      res.json({ isPinned: thread.isPinned });
    } catch (error) {
      next(error);
    }
  }
);

/* ── LOCK/UNLOCK thread (admin) ──────────────────────────── */
router.patch(
  "/:id/lock",
  protect,
  authorize("institute_admin"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { ForumThread } = getTenantModels(req);
      const thread = await ForumThread.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!thread) return res.status(404).json({ message: "Thread not found" });

      thread.isLocked = !thread.isLocked;
      await thread.save();

      res.json({ isLocked: thread.isLocked });
    } catch (error) {
      next(error);
    }
  }
);

/* ── ACCEPT reply as best answer (thread author) ─────────── */
router.patch(
  "/replies/:id/accept",
  protect,
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { ForumThread, ForumReply } = getTenantModels(req);
      const reply = await ForumReply.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!reply) return res.status(404).json({ message: "Reply not found" });

      const thread = await ForumThread.findById(reply.threadId);
      if (!thread) return res.status(404).json({ message: "Thread not found" });

      if (thread.authorId.toString() !== req.user._id.toString() && req.user.role !== "institute_admin") {
        return res.status(403).json({ message: "Only thread author can accept answers" });
      }

      // Unmark any previously accepted reply
      await ForumReply.updateMany(
        { threadId: thread._id, isAccepted: true },
        { isAccepted: false }
      );

      reply.isAccepted = !reply.isAccepted;
      await reply.save();

      res.json({ isAccepted: reply.isAccepted });
    } catch (error) {
      next(error);
    }
  }
);

/* ── DELETE thread (author or admin) ─────────────────────── */
router.delete(
  "/:id",
  protect,
  authorize("alumni", "institute_admin"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { ForumThread } = getTenantModels(req);
      const thread = await ForumThread.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!thread) return res.status(404).json({ message: "Thread not found" });

      if (thread.authorId.toString() !== req.user._id.toString() && req.user.role !== "institute_admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      await thread.softDelete();
      res.json({ message: "Thread deleted" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
