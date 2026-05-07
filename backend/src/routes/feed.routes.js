import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";
import { CachedDataService } from "../services/cachedDataService.js";

const router = express.Router();

router.get("/", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const tenantModels = getTenantModels(req);
    const instituteId = req.tenant._id;
    const userId = req.user._id.toString();
    
    // Use cached data service for feed
    const { announcements, events, jobs } = await CachedDataService.getFeed(
      tenantModels,
      instituteId,
      req.user.role === "institute_admin" ? null : userId
    );

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
