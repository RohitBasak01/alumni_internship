import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ── helpers ────────────────────────────────────────────── */
function matchesWindow(dob, todayMonth, todayDay, windowDays) {
  const m = dob.getMonth();
  const d = dob.getDate();

  for (let offset = 0; offset <= windowDays; offset++) {
    const check = new Date(2000, todayMonth, todayDay + offset);
    if (check.getMonth() === m && check.getDate() === d) return true;
  }
  return false;
}

/* ── GET /birthdays — today + upcoming 7 days ───────────── */
router.get(
  "/birthdays",
  protect,
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { AlumniProfile, User } = getTenantModels(req);

      const profiles = await AlumniProfile.find({
        instituteId: req.tenant._id,
        dateOfBirth: { $ne: null }
      })
        .populate("userId", "name email")
        .lean();

      const now = new Date();
      const todayMonth = now.getMonth();
      const todayDay = now.getDate();

      const today = [];
      const upcoming = [];

      for (const p of profiles) {
        if (!p.dateOfBirth || !p.userId) continue;
        const dob = new Date(p.dateOfBirth);

        const isToday = dob.getMonth() === todayMonth && dob.getDate() === todayDay;

        if (isToday) {
          today.push({
            _id: p._id,
            userId: p.userId._id,
            name: p.userId.name,
            email: p.userId.email,
            profilePhotoUrl: p.profilePhotoUrl,
            dateOfBirth: p.dateOfBirth,
            department: p.department,
            batch: p.batch
          });
        } else if (matchesWindow(dob, todayMonth, todayDay, 7)) {
          upcoming.push({
            _id: p._id,
            userId: p.userId._id,
            name: p.userId.name,
            email: p.userId.email,
            profilePhotoUrl: p.profilePhotoUrl,
            dateOfBirth: p.dateOfBirth,
            department: p.department,
            batch: p.batch
          });
        }
      }

      // Sort upcoming by nearest date
      upcoming.sort((a, b) => {
        const aDob = new Date(a.dateOfBirth);
        const bDob = new Date(b.dateOfBirth);
        const aDay = new Date(2000, aDob.getMonth(), aDob.getDate());
        const bDay = new Date(2000, bDob.getMonth(), bDob.getDate());
        const todayRef = new Date(2000, todayMonth, todayDay);
        const aDiff = aDay >= todayRef ? aDay - todayRef : aDay - todayRef + 365 * 86400000;
        const bDiff = bDay >= todayRef ? bDay - todayRef : bDay - todayRef + 365 * 86400000;
        return aDiff - bDiff;
      });

      res.json({ today, upcoming });
    } catch (error) {
      next(error);
    }
  }
);

/* ── GET /work-anniversaries — this month ──────────────── */
router.get(
  "/work-anniversaries",
  protect,
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { AlumniProfile } = getTenantModels(req);

      const profiles = await AlumniProfile.find({
        instituteId: req.tenant._id
      })
        .populate("userId", "name email")
        .lean();

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const anniversaries = [];

      for (const p of profiles) {
        if (!p.userId || !p.createdAt) continue;
        const joined = new Date(p.createdAt);
        if (joined.getMonth() === currentMonth && joined.getFullYear() !== currentYear) {
          const years = currentYear - joined.getFullYear();
          anniversaries.push({
            _id: p._id,
            userId: p.userId._id,
            name: p.userId.name,
            email: p.userId.email,
            profilePhotoUrl: p.profilePhotoUrl,
            department: p.department,
            batch: p.batch,
            joinedDate: p.createdAt,
            years
          });
        }
      }

      anniversaries.sort((a, b) => b.years - a.years);

      res.json(anniversaries);
    } catch (error) {
      next(error);
    }
  }
);

/* ── POST /wish — send a wish (creates notification) ────── */
router.post(
  "/wish",
  protect,
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { Notification } = getTenantModels(req);

      const { recipientId, type, message } = req.body;
      if (!recipientId) return res.status(400).json({ message: "recipientId is required" });

      const wishType = type === "anniversary" ? "work_anniversary_wish" : "birthday_wish";

      await Notification.create({
        instituteId: req.tenant._id,
        userId: recipientId,
        category: "celebration",
        type: wishType,
        entityType: "User",
        entityId: req.user._id,
        title: type === "anniversary" ? "Work Anniversary Wish! 🎉" : "Happy Birthday! 🎂",
        message: message || `${req.user.name} wished you a happy ${type === "anniversary" ? "work anniversary" : "birthday"}!`,
        metadata: {
          senderId: req.user._id,
          senderName: req.user.name
        }
      });

      res.json({ message: "Wish sent!" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
