import express from "express";
import mongoose from "mongoose";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { serverRuntime } from "../utils/runtime.js";
import { getStorageMode, hasSmtpRuntimeConfig } from "../utils/runtimeConfig.js";

const router = express.Router();

function buildStatusPayload(req) {
  const uptimeSeconds = Math.floor(process.uptime());
  const memUsage = process.memoryUsage();

  return {
    ok: mongoose.connection.readyState === 1,
    service: "alumni-network-api",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds,
    startedAt: serverRuntime.startedAt.toISOString(),
    timestamp: new Date().toISOString(),
    database: {
      state: mongoose.connection.readyState,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null
    },
    storage: {
      mode: getStorageMode()
    },
    email: {
      smtpConfigured: hasSmtpRuntimeConfig()
    },
    mockMode: Boolean(req?.app?.locals?.mockMode),
    memory: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal
    },
    nodeVersion: process.version
  };
}

router.get("/status", protect, authorize("super_admin"), (req, res) => {
  res.json({
    ...buildStatusPayload(req),
    requestId: req.requestId
  });
});

export { buildStatusPayload };
export default router;
