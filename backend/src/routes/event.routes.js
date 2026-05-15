import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";
import { authorizeWithDelegation } from "../middleware/delegation.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { isNonEmptyString, isObjectIdLike } from "../utils/validation.js";
import { createNotification, createNotificationsForUsers, listActiveAlumniUserIds } from "../utils/notifications.js";

const router = express.Router();

function inferEventType(event) {
  const text = `${event.title || ""} ${event.description || ""} ${event.location || ""}`.toLowerCase();
  if (text.includes("webinar") || text.includes("zoom") || text.includes("virtual")) return "Webinar";
  if (text.includes("workshop")) return "Workshop";
  if (text.includes("career") || text.includes("fair")) return "Career Fair";
  if (text.includes("network")) return "Networking";
  if (text.includes("gala") || text.includes("social") || text.includes("reunion")) return "Social";
  return "Event";
}

function deriveDateRange(eventDate) {
  const date = new Date(eventDate);
  const now = new Date();
  const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return "This Week";
  if (diffDays <= 30) return "This Month";
  return "Later";
}

function deriveStatus(event) {
  const now = new Date();
  const eventDate = new Date(event.eventDate);
  if (event.registrations?.length === 0 && eventDate > now) return "Draft";
  return eventDate >= now ? "Upcoming" : "Completed";
}

function formatEvent(event, user) {
  const isRegistered = event.registrations?.some(
    (entry) => entry.userId?._id?.toString?.() === user._id.toString() || entry.userId?.toString?.() === user._id.toString()
  );
  const instituteName = user.instituteId?.name || "Institute";
  const organizerName = `${instituteName} Alumni Association`;

  return {
    _id: event._id,
    instituteId: event.instituteId,
    title: event.title,
    description: event.description,
    eventDate: event.eventDate,
    location: event.location,
    groupId: event.groupId,
    createdBy: event.createdBy,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    eventType: inferEventType(event),
    dateRange: deriveDateRange(event.eventDate),
    status: deriveStatus(event),
    organizerName,
    publishedByLabel: `${organizerName} Committee`,
    registrationCap: Number.isFinite(Number(event.registrationCap)) ? Number(event.registrationCap) : null,
    attendeeCount: event.registrations?.length || 0,
    isRegistered: Boolean(isRegistered),
    fees: event.fees || [],
    attendees:
      user.role === "institute_admin"
        ? (event.registrations || []).map((entry) => ({
            userId: entry.userId?._id || entry.userId,
            name: entry.userId?.name || "Unknown User",
            email: entry.userId?.email || "",
            registeredAt: entry.registeredAt
          }))
        : []
  };
}

function validateEventBody(body) {
  const issues = [];
  if (!isNonEmptyString(body.title)) issues.push("Event title is required");
  if (!body.eventDate) issues.push("Event date is required");
  if (body.registrationCap !== undefined && (!Number.isFinite(Number(body.registrationCap)) || Number(body.registrationCap) < 0)) {
    issues.push("Registration cap must be a non-negative number");
  }
  return issues;
}

function validateEventId(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid event id"];
}

router.get("/", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const { Event } = getTenantModels(req);
    const filter = { instituteId: req.tenant?._id };
    if (req.query.groupId) {
      filter.groupId = req.query.groupId;
    } else {
      filter.groupId = { $in: [null, undefined] };
    }
    const events = await Event.find(filter)
      .populate("registrations.userId", "name email")
      .sort({ eventDate: 1 });
    res.json(events.map((event) => formatEvent(event, req.user)));
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  protect,
  authorize("institute_admin", "alumni"),
  requireTenantAccess,
  validateBody(validateEventBody),
  async (req, res, next) => {
    try {
      const { Event } = getTenantModels(req);
      const event = await Event.create({
        ...req.body,
        registrationCap:
          req.body.registrationCap !== undefined ? Number(req.body.registrationCap) : undefined,
        instituteId: req.tenant._id,
        groupId: req.body.groupId || null,
        createdBy: req.user._id
      });

      await event.populate("registrations.userId", "name email");
      res.status(201).json(formatEvent(event, req.user));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/register",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateEventId),
  async (req, res, next) => {
    try {
      const { Event } = getTenantModels(req);
      const event = await Event.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!event) {
        const error = new Error("Event not found");
        error.statusCode = 404;
        throw error;
      }

      const alreadyRegistered = event.registrations.some(
        (entry) => entry.userId.toString() === req.user._id.toString()
      );

      if (alreadyRegistered) {
        const error = new Error("You have already registered for this event");
        error.statusCode = 400;
        throw error;
      }

      event.registrations.push({
        userId: req.user._id,
        registeredAt: new Date()
      });

      await event.save();
      await event.populate("registrations.userId", "name email");

      res.json(formatEvent(event, req.user));
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id/register",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateEventId),
  async (req, res, next) => {
    try {
      const { Event } = getTenantModels(req);
      const event = await Event.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!event) {
        const error = new Error("Event not found");
        error.statusCode = 404;
        throw error;
      }

      event.registrations = event.registrations.filter(
        (entry) => entry.userId.toString() !== req.user._id.toString()
      );

      await event.save();
      await event.populate("registrations.userId", "name email");

      res.json(formatEvent(event, req.user));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/create-order",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateEventId),
  async (req, res, next) => {
    try {
      const { Event } = getTenantModels(req);
      const event = await Event.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (!event.fees || event.fees.length === 0) {
        return res.status(400).json({ message: "Event is free" });
      }

      const amount = event.fees.reduce((acc, fee) => acc + (fee.amount || 0), 0);

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || "mock_key_id",
        key_secret: process.env.RAZORPAY_KEY_SECRET || "mock_key_secret"
      });

      const options = {
        amount: amount * 100, // amount in smallest currency unit (paise)
        currency: "INR",
        receipt: `receipt_event_${event._id}`
      };

      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/verify-payment",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  validateParams(validateEventId),
  async (req, res, next) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "mock_key_secret")
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        const { Event } = getTenantModels(req);
        const event = await Event.findOne({
          _id: req.params.id,
          instituteId: req.tenant._id
        });

        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }

        const alreadyRegistered = event.registrations.some(
          (entry) => entry.userId.toString() === req.user._id.toString()
        );

        if (!alreadyRegistered) {
          event.registrations.push({
            userId: req.user._id,
            registeredAt: new Date(),
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id
          });
          await event.save();
        }

        await event.populate("registrations.userId", "name email");
        res.json({ success: true, event: formatEvent(event, req.user) });
      } else {
        res.status(400).json({ message: "Invalid signature" });
      }
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  protect,
  authorizeWithDelegation("manage_events"),
  requireTenantAccess,
  validateParams(validateEventId),
  async (req, res, next) => {
    try {
      const { Event } = getTenantModels(req);
      const event = await Event.findOneAndUpdate(
        {
          _id: req.params.id,
          instituteId: req.tenant._id
        },
        {
          ...req.body,
          ...(req.body.registrationCap !== undefined
            ? { registrationCap: Number(req.body.registrationCap) }
            : {})
        },
        { new: true, runValidators: true }
      );

      if (!event) {
        const error = new Error("Event not found");
        error.statusCode = 404;
        throw error;
      }

      await event.populate("registrations.userId", "name email");
      res.json(formatEvent(event, req.user));
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  protect,
  authorize("institute_admin", "alumni"),
  requireTenantAccess,
  validateParams(validateEventId),
  async (req, res, next) => {
    try {
      const { Event } = getTenantModels(req);
      const event = await Event.findOne({
        _id: req.params.id,
        instituteId: req.tenant._id
      });

      if (!event) {
        const error = new Error("Event not found");
        error.statusCode = 404;
        throw error;
      }

      const isAdmin = req.user.role === "institute_admin";
      const isOwner = event.createdBy?.toString?.() === req.user._id.toString();

      if (!isAdmin && !isOwner) {
        const error = new Error("You do not have permission to delete this event");
        error.statusCode = 403;
        throw error;
      }

      await event.softDelete();

      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

