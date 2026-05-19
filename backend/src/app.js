import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";
import {
  apiRateLimiter,
  authRateLimiter,
  passwordResetRateLimiter,
  registrationRateLimiter,
  sensitiveOperationRateLimiter,
  fileUploadRateLimiter,
  apiKeyRateLimiter
} from "./middleware/rateLimit.middleware.js";
import { attachRequestContext, structuredRequestLogger } from "./middleware/requestContext.middleware.js";
import { resolveTenant } from "./middleware/tenantResolver.middleware.js";
import { csrfProtection } from "./middleware/csrf.middleware.js";
import { parseAllowedOrigins } from "./utils/runtimeConfig.js";
import { morganStream, logRequest } from "./utils/logger.js";
import { metricsMiddleware, startMetricsCollection } from "./utils/metrics.js";
import authRoutes from "./routes/auth.routes.js";
import instituteRoutes from "./routes/institute.routes.js";
import alumniRoutes from "./routes/alumni.routes.js";
import alumniPostRoutes from "./routes/alumniPost.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import businessDirectoryRoutes from "./routes/businessDirectory.routes.js";
import communityGroupRoutes from "./routes/communityGroup.routes.js";
import eventRoutes from "./routes/event.routes.js";
import feedRoutes from "./routes/feed.routes.js";
import galleryRoutes from "./routes/gallery.routes.js";
import jobRoutes from "./routes/job.routes.js";
import friendshipRoutes from "./routes/friendship.routes.js";
import mockRoutes from "./routes/mock.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import opsRoutes from "./routes/ops.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import fundraisingRoutes from "./routes/fundraising.routes.js";
import mentorshipRoutes from "./routes/mentorship.routes.js";
import idcardRoutes from "./routes/idcard.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import referralRoutes from "./routes/referral.routes.js";
import resumeRoutes from "./routes/resume.routes.js";
import reunionRoutes from "./routes/reunion.routes.js";
import celebrationsRoutes from "./routes/celebrations.routes.js";
import forumRoutes from "./routes/forum.routes.js";
import campaignRoutes from "./routes/campaign.routes.js";
import searchRoutes from "./routes/search.routes.js";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadsRoot = path.join(backendRoot, "uploads");

const app = express();

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser and same-origin requests without an Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (process.env.NODE_ENV !== "production" && allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin denied"));
    },
    credentials: true
  })
);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  frameguard: { action: "deny" },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  ieNoOpen: true,
}));
app.use(cookieParser());
app.use(csrfProtection);
app.use("/api/payments", express.raw({ type: "application/json" }), paymentRoutes);
app.use(express.json({ limit: "25mb" }));

// HTTP request logging
if (process.env.NODE_ENV !== "production") {
  // Use morgan for development with winston stream
  app.use(morgan("dev", { stream: morganStream }));
} else {
  // Use structured request logging for production
  app.use(logRequest);
}

app.use("/uploads", express.static(uploadsRoot));
app.use(attachRequestContext);
app.use(structuredRequestLogger);
app.use("/api", apiRateLimiter);
app.use("/api", mockRoutes);

// Comprehensive health check endpoint
app.get("/api/health", async (req, res) => {
  const healthCheck = {
    ok: true,
    service: "alumni-network-api",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    uptime: process.uptime(),
    checks: {
      database: { status: "unknown", latency: null },
      memory: { status: "healthy", used: null, total: null },
      cpu: { status: "healthy", load: null }
    }
  };

  try {
    // Database connectivity check
    const dbStart = Date.now();
    const mongoose = (await import("mongoose")).default;
    const dbState = mongoose.connection.readyState;
    const dbLatency = Date.now() - dbStart;
    
    healthCheck.checks.database = {
      status: dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected",
      latency: dbLatency,
      readyState: dbState
    };

    // Memory usage
    const memoryUsage = process.memoryUsage();
    healthCheck.checks.memory = {
      status: "healthy",
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024)
    };

    // CPU load (simplified)
    const loadAvg = process.cpuUsage();
    healthCheck.checks.cpu = {
      status: "healthy",
      user: loadAvg.user,
      system: loadAvg.system
    };

    // Overall health status
    healthCheck.ok = dbState === 1;
    
    const statusCode = healthCheck.ok ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    healthCheck.ok = false;
    healthCheck.error = error.message;
    healthCheck.checks.database.status = "error";
    res.status(503).json(healthCheck);
  }
});

// Simple health check for Docker/load balancers (no database check)
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "alumni-network-api",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Prometheus metrics endpoint (protected in production)
app.get("/metrics", async (req, res) => {
  try {
    const { getMetrics } = await import("./utils/metrics.js");
    const metrics = await getMetrics();
    res.set("Content-Type", "text/plain");
    res.send(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to collect metrics" });
  }
});

// Apply metrics middleware to track HTTP requests
app.use(metricsMiddleware());

app.use(resolveTenant);
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/admin/campaigns", campaignRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/institutes", instituteRoutes);
app.use("/api/ops", opsRoutes);
app.use("/api/alumni", alumniRoutes);
app.use("/api/alumni-posts", alumniPostRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/business-directory", businessDirectoryRoutes);
app.use("/api/community-groups", communityGroupRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/friendships", friendshipRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/fundraising", fundraisingRoutes);
app.use("/api/mentorship", mentorshipRoutes);
app.use("/api/idcard", idcardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/reunions", reunionRoutes);
app.use("/api/celebrations", celebrationsRoutes);
app.use("/api/forums", forumRoutes);
app.use("/api/search", searchRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

