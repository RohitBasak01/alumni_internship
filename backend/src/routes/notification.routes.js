import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateParams } from "../middleware/validate.middleware.js";
import { isObjectIdLike } from "../utils/validation.js";

const router = express.Router();

function validateNotificationId(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid notification id"];
}

function formatNotification(notification) {
  const actor = notification.actorUserId;

  return {
    _id: notification._id,
    category: notification.category,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    entityType: notification.entityType,
    entityId: notification.entityId,
    linkTo: notification.linkTo,
    metadata: notification.metadata || {},
    isRead: Boolean(notification.isRead),
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
    actor: actor
      ? {
          _id: actor._id,
          name: actor.name,
          email: actor.email
        }
      : null
  };
}

router.get("/", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const { Notification } = getTenantModels(req);
    const category = String(req.query.category || "all").trim().toLowerCase();
    const before = req.query.before ? new Date(req.query.before) : null;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const filter = {
      instituteId: req.tenant._id,
      userId: req.user._id,
      dismissedAt: null
    };

    if (category && category !== "all") {
      filter.category = category;
    }

    if (before && !Number.isNaN(before.getTime())) {
      filter.createdAt = { $lt: before };
    }

    const notifications = await Notification.find(filter)
      .populate("actorUserId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = notifications.length > limit;
    const visibleItems = hasMore ? notifications.slice(0, limit) : notifications;

    res.json({
      items: visibleItems.map(formatNotification),
      nextCursor: hasMore ? visibleItems[visibleItems.length - 1]?.createdAt || null : null,
      hasMore
    });
  } catch (error) {
    next(error);
  }
});

router.post("/mark-all-read", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const { Notification } = getTenantModels(req);
    const now = new Date();

    await Notification.updateMany(
      {
        instituteId: req.tenant._id,
        userId: req.user._id,
        dismissedAt: null,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: now
        }
      }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/read", protect, requireTenantAccess, validateParams(validateNotificationId), async (req, res, next) => {
  try {
    const { Notification } = getTenantModels(req);
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        instituteId: req.tenant._id,
        userId: req.user._id,
        dismissedAt: null
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      },
      { new: true }
    ).populate("actorUserId", "name email");

    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      throw error;
    }

    res.json(formatNotification(notification));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/dismiss", protect, requireTenantAccess, validateParams(validateNotificationId), async (req, res, next) => {
  try {
    const { Notification } = getTenantModels(req);
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        instituteId: req.tenant._id,
        userId: req.user._id,
        dismissedAt: null
      },
      {
        $set: {
          dismissedAt: new Date(),
          isRead: true,
          readAt: new Date()
        }
      },
      { new: true }
    );

    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({ message: "Notification dismissed" });
  } catch (error) {
    next(error);
  }
});

router.get("/summary", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const { AlumniProfile, Friendship, Notification } = getTenantModels(req);
    const instituteId = req.tenant._id;

    const [pendingFriendshipRequests, pendingAlumniInvites, unreadCount, unreadByCategoryRaw] = await Promise.all([
      req.user.role === "alumni"
        ? Friendship.countDocuments({
            instituteId,
            recipientId: req.user._id,
            status: "pending"
          })
        : Promise.resolve(0),
      req.user.role === "institute_admin"
        ? AlumniProfile.aggregate([
            {
              $match: {
                instituteId
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
              }
            },
            { $unwind: "$user" },
            {
              $match: {
                "user.passwordSetupCompleted": false,
                "user.inviteTokenHash": { $ne: null }
              }
            },
            { $count: "count" }
          ]).then((result) => result[0]?.count || 0)
        : Promise.resolve(0),
      Notification.countDocuments({
        instituteId,
        userId: req.user._id,
        dismissedAt: null,
        isRead: false
      }),
      Notification.aggregate([
        {
          $match: {
            instituteId,
            userId: req.user._id,
            dismissedAt: null,
            isRead: false
          }
        },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const unreadByCategory = unreadByCategoryRaw.reduce(
      (accumulator, entry) => ({ ...accumulator, [entry._id]: entry.count }),
      { connections: 0, jobs: 0, events: 0, feed: 0, groups: 0, system: 0 }
    );

    res.json({
      pendingFriendshipRequests,
      pendingAlumniInvites,
      unreadCount,
      unreadByCategory
    });
  } catch (error) {
    next(error);
  }
});

export default router;
