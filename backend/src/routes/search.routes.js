import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";

const router = express.Router();

const SEARCH_TYPES = new Set(["alumni", "events", "jobs", "forums", "groups"]);

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseTypes(value) {
  const requested = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!requested.length) {
    return [...SEARCH_TYPES];
  }

  return requested.filter((item) => SEARCH_TYPES.has(item));
}

function buildResult({ id, type, title, subtitle, url, icon }) {
  return {
    id,
    type,
    title,
    subtitle,
    url,
    icon
  };
}

router.get("/", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const types = parseTypes(req.query.types);
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 10);

    if (!q || q.length < 2 || !types.length) {
      res.json({ query: q, results: {} });
      return;
    }

    const regex = new RegExp(escapeRegex(q), "i");
    const instituteId = req.tenant._id;
    const { AlumniProfile, CommunityGroup, Event, ForumThread, Job, User } = getTenantModels(req);
    const resultEntries = await Promise.all(
      types.map(async (type) => {
        if (type === "alumni") {
          const profiles = await AlumniProfile.find({
            instituteId,
            $or: [
              { company: regex },
              { designation: regex },
              { department: regex },
              { location: regex },
              { skills: regex }
            ]
          })
            .populate("userId", "name email")
            .limit(limit);

          const profileResults = profiles.map((profile) =>
            buildResult({
              id: profile._id,
              type,
              title: profile.userId?.name || "Alumni profile",
              subtitle: [profile.designation, profile.company, profile.department].filter(Boolean).join(" · "),
              url: `/portal/alumni?profile=${profile._id}`,
              icon: "person"
            })
          );

          if (profileResults.length < limit) {
            const users = await User.find({ instituteId, role: "alumni", name: regex })
              .select("name email")
              .limit(limit - profileResults.length);
            profileResults.push(
              ...users.map((user) =>
                buildResult({
                  id: user._id,
                  type,
                  title: user.name,
                  subtitle: user.email,
                  url: "/portal/alumni",
                  icon: "person"
                })
              )
            );
          }

          return [type, profileResults];
        }

        if (type === "events") {
          const events = await Event.find({ instituteId, $or: [{ title: regex }, { description: regex }, { location: regex }] })
            .select("title location eventDate")
            .sort({ eventDate: -1 })
            .limit(limit);
          return [
            type,
            events.map((event) =>
              buildResult({
                id: event._id,
                type,
                title: event.title,
                subtitle: [event.location, event.eventDate?.toLocaleDateString?.()].filter(Boolean).join(" · "),
                url: "/portal/events",
                icon: "event"
              })
            )
          ];
        }

        if (type === "jobs") {
          const jobs = await Job.find({ instituteId, status: "published", $or: [{ title: regex }, { company: regex }, { location: regex }, { industry: regex }] })
            .select("title company location")
            .sort({ createdAt: -1 })
            .limit(limit);
          return [
            type,
            jobs.map((job) =>
              buildResult({
                id: job._id,
                type,
                title: job.title,
                subtitle: [job.company, job.location].filter(Boolean).join(" · "),
                url: "/portal/jobs",
                icon: "work"
              })
            )
          ];
        }

        if (type === "forums") {
          const threads = await ForumThread.find({ instituteId, $or: [{ title: regex }, { body: regex }, { tags: regex }] })
            .select("title category replyCount")
            .sort({ updatedAt: -1 })
            .limit(limit);
          return [
            type,
            threads.map((thread) =>
              buildResult({
                id: thread._id,
                type,
                title: thread.title,
                subtitle: `${thread.category} · ${thread.replyCount || 0} replies`,
                url: `/portal/forums?thread=${thread._id}`,
                icon: "forum"
              })
            )
          ];
        }

        const groups = await CommunityGroup.find({ instituteId, $or: [{ name: regex }, { description: regex }, { audienceLabel: regex }] })
          .select("name description groupType memberIds")
          .sort({ updatedAt: -1 })
          .limit(limit);
        return [
          type,
          groups.map((group) =>
            buildResult({
              id: group._id,
              type,
              title: group.name,
              subtitle: `${group.groupType} · ${group.memberIds?.length || 0} members`,
              url: "/portal/groups",
              icon: "diversity_3"
            })
          )
        ];
      })
    );

    res.json({
      query: q,
      results: Object.fromEntries(resultEntries)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
