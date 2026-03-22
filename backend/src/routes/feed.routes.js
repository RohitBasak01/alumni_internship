import express from "express";

import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";
import Announcement from "../models/Announcement.js";
import Event from "../models/Event.js";
import Job from "../models/Job.js";

const router = express.Router();

router.get("/", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const instituteId = req.tenant._id;
    const announcementFilter =
      req.user.role === "institute_admin"
        ? { instituteId }
        : { instituteId, status: "published" };
    const jobFilter =
      req.user.role === "institute_admin"
        ? { instituteId }
        : { instituteId, status: "published" };

    const [announcements, events, jobs] = await Promise.all([
      Announcement.find(announcementFilter).sort({ createdAt: -1 }).limit(5),
      Event.find({ instituteId }).sort({ eventDate: 1 }).limit(5),
      Job.find(jobFilter).sort({ createdAt: -1 }).limit(5)
    ]);

    const feed = [
      ...announcements.map((item) => ({
        id: item._id,
        type: "announcement",
        title: item.title,
        description: item.content,
        meta: item.status,
        createdAt: item.createdAt
      })),
      ...events.map((item) => ({
        id: item._id,
        type: "event",
        title: item.title,
        description: item.description || item.location || "Upcoming institute event",
        meta: item.eventDate,
        createdAt: item.createdAt
      })),
      ...jobs.map((item) => ({
        id: item._id,
        type: "job",
        title: item.title,
        description: item.company,
        meta: item.status,
        createdAt: item.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(feed);
  } catch (error) {
    next(error);
  }
});

export default router;
