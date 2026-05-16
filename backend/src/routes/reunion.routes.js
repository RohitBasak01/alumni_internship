import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ── helpers ────────────────────────────────────────────── */
function formatReunion(r, userId) {
  const obj = r.toObject ? r.toObject() : { ...r };
  const uid = userId?.toString();

  const rsvpMap = { attending: 0, maybe: 0, declined: 0 };
  (obj.rsvps || []).forEach(v => { rsvpMap[v.status] = (rsvpMap[v.status] || 0) + 1; });

  const myRsvp = (obj.rsvps || []).find(
    v => (v.userId?._id?.toString?.() || v.userId?.toString?.()) === uid
  );

  return {
    ...obj,
    rsvpCounts: rsvpMap,
    myRsvpStatus: myRsvp?.status || null,
    isOrganizer: (obj.organizers || []).some(
      o => (o?._id?.toString?.() || o?.toString?.()) === uid
    )
  };
}

/* ── LIST reunions (filter by batch, department) ────────── */
router.get(
  "/",
  protect,
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { Reunion } = getTenantModels(req);
      const filter = { instituteId: req.tenant._id };

      if (req.query.batch) filter.batch = Number(req.query.batch);
      if (req.query.department) filter.department = req.query.department;

      const reunions = await Reunion.find(filter)
        .populate("organizers", "name email")
        .populate("rsvps.userId", "name email")
        .populate("createdBy", "name email")
        .sort({ eventDate: 1 });

      res.json(reunions.map(r => formatReunion(r, req.user._id)));
    } catch (error) {
      next(error);
    }
  }
);

/* ── GET single reunion ─────────────────────────────────── */
router.get(
  "/:id",
  protect,
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { Reunion } = getTenantModels(req);
      const reunion = await Reunion.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      })
        .populate("organizers", "name email")
        .populate("rsvps.userId", "name email")
        .populate("createdBy", "name email");

      if (!reunion) return res.status(404).json({ message: "Reunion not found" });

      res.json(formatReunion(reunion, req.user._id));
    } catch (error) {
      next(error);
    }
  }
);

/* ── CREATE reunion ─────────────────────────────────────── */
router.post(
  "/",
  protect,
  authorize("alumni", "institute_admin"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { Reunion } = getTenantModels(req);

      const { title, batch, department, description, eventDate, location, isVirtual, virtualLink, coverImage } = req.body;

      if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
      if (!batch) return res.status(400).json({ message: "Batch year is required" });
      if (!eventDate) return res.status(400).json({ message: "Event date is required" });

      const reunion = await Reunion.create({
        instituteId: req.tenant._id,
        title: title.trim(),
        batch: Number(batch),
        department: department?.trim() || "",
        description: description?.trim() || "",
        eventDate: new Date(eventDate),
        location: location?.trim() || "",
        isVirtual: Boolean(isVirtual),
        virtualLink: virtualLink?.trim() || "",
        coverImage: coverImage?.trim() || "",
        organizers: [req.user._id],
        createdBy: req.user._id,
        rsvps: [{ userId: req.user._id, status: "attending" }]
      });

      await reunion.populate("organizers", "name email");
      await reunion.populate("rsvps.userId", "name email");
      await reunion.populate("createdBy", "name email");

      res.status(201).json(formatReunion(reunion, req.user._id));
    } catch (error) {
      next(error);
    }
  }
);

/* ── UPDATE reunion (organizer or admin only) ───────────── */
router.patch(
  "/:id",
  protect,
  authorize("alumni", "institute_admin"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { Reunion } = getTenantModels(req);
      const reunion = await Reunion.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!reunion) return res.status(404).json({ message: "Reunion not found" });

      const isOrganizer = reunion.organizers.some(
        o => o.toString() === req.user._id.toString()
      );
      if (!isOrganizer && req.user.role !== "institute_admin") {
        return res.status(403).json({ message: "Only organizers can update a reunion" });
      }

      const allowedFields = ["title", "batch", "department", "description", "eventDate", "location", "isVirtual", "virtualLink", "coverImage"];
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          reunion[key] = key === "batch" ? Number(req.body[key]) :
                         key === "eventDate" ? new Date(req.body[key]) :
                         key === "isVirtual" ? Boolean(req.body[key]) :
                         req.body[key];
        }
      }

      await reunion.save();
      await reunion.populate("organizers", "name email");
      await reunion.populate("rsvps.userId", "name email");
      await reunion.populate("createdBy", "name email");

      res.json(formatReunion(reunion, req.user._id));
    } catch (error) {
      next(error);
    }
  }
);

/* ── DELETE reunion (organizer or admin only) ────────────── */
router.delete(
  "/:id",
  protect,
  authorize("alumni", "institute_admin"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { Reunion } = getTenantModels(req);
      const reunion = await Reunion.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!reunion) return res.status(404).json({ message: "Reunion not found" });

      const isOrganizer = reunion.organizers.some(
        o => o.toString() === req.user._id.toString()
      );
      if (!isOrganizer && req.user.role !== "institute_admin") {
        return res.status(403).json({ message: "Only organizers can delete a reunion" });
      }

      await reunion.softDelete();
      res.json({ message: "Reunion deleted" });
    } catch (error) {
      next(error);
    }
  }
);

/* ── RSVP (attending / maybe / declined) ─────────────────── */
router.post(
  "/:id/rsvp",
  protect,
  authorize("alumni", "institute_admin"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { Reunion } = getTenantModels(req);
      const reunion = await Reunion.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!reunion) return res.status(404).json({ message: "Reunion not found" });

      const status = req.body.status || "attending";
      if (!["attending", "maybe", "declined"].includes(status)) {
        return res.status(400).json({ message: "Invalid RSVP status" });
      }

      const existingIdx = reunion.rsvps.findIndex(
        r => r.userId.toString() === req.user._id.toString()
      );

      if (existingIdx >= 0) {
        reunion.rsvps[existingIdx].status = status;
        reunion.rsvps[existingIdx].respondedAt = new Date();
      } else {
        reunion.rsvps.push({
          userId: req.user._id,
          status,
          respondedAt: new Date()
        });
      }

      await reunion.save();
      await reunion.populate("organizers", "name email");
      await reunion.populate("rsvps.userId", "name email");
      await reunion.populate("createdBy", "name email");

      res.json(formatReunion(reunion, req.user._id));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
