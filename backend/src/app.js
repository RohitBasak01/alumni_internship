import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";

import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";
import { apiRateLimiter, authRateLimiter } from "./middleware/rateLimit.middleware.js";
import { attachRequestContext, structuredRequestLogger } from "./middleware/requestContext.middleware.js";
import { resolveTenant } from "./middleware/tenantResolver.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import instituteRoutes from "./routes/institute.routes.js";
import alumniRoutes from "./routes/alumni.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import eventRoutes from "./routes/event.routes.js";
import feedRoutes from "./routes/feed.routes.js";
import jobRoutes from "./routes/job.routes.js";
import mentorshipRoutes from "./routes/mentorship.routes.js";
import mockRoutes from "./routes/mock.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import opsRoutes from "./routes/ops.routes.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(attachRequestContext);
app.use(structuredRequestLogger);
app.use("/api", apiRateLimiter);
app.use("/api", mockRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "alumni-network-api",
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/institutes", instituteRoutes);
app.use("/api/ops", opsRoutes);

app.use(resolveTenant);
app.use("/api/alumni", alumniRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/mentorship", mentorshipRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
