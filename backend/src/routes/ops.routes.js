import express from "express";
import mongoose from "mongoose";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { serverRuntime } from "../utils/runtime.js";

const router = express.Router();

function buildStatusPayload() {
  const uptimeSeconds = Math.floor(process.uptime());

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
    memory: {
      rss: process.memoryUsage().rss,
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal
    },
    nodeVersion: process.version
  };
}

router.get("/status", protect, authorize("super_admin"), (req, res) => {
  res.json({
    ...buildStatusPayload(),
    requestId: req.requestId
  });
});

export { buildStatusPayload };
export default router;
