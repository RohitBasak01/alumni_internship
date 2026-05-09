import dotenv from "dotenv";
import http from "node:http";
import mongoose from "mongoose";
import { Server as SocketIoServer } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import app from "./app.js";
import { getJwtSecret, AUTH_COOKIE_NAME } from "./utils/auth.js";
import { parseAllowedOrigins } from "./utils/runtimeConfig.js";
import logger, { logError, logSocket } from "./utils/logger.js";
import { initSentry, captureError } from "./utils/sentry.js";
import { startMetricsCollection } from "./utils/metrics.js";

dotenv.config({ override: true });

// Initialize Sentry error tracking
initSentry();

// Start metrics collection for performance monitoring
if (process.env.PROMETHEUS_ENABLED === "true") {
  startMetricsCollection();
  logger.info("Performance metrics collection enabled (Prometheus)");
}

const onlineUsers = new Map(); // userId -> socketId

const PORT = process.env.PORT || 5000;
const CENTRAL_MONGODB_URI =
  process.env.CENTRAL_MONGODB_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/alumni-network";
const ENABLE_DEV_MOCK_MODE = process.env.ENABLE_DEV_MOCK_MODE === "true";

function validateRuntimeEnv() {
  getJwtSecret();

  if (process.env.NODE_ENV === "production" && parseAllowedOrigins().length === 0) {
    throw new Error("CORS_ALLOWED_ORIGINS (or CLIENT_URL/FRONTEND_URL) is required in production.");
  }

  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_MOCK_MODE === "true") {
    throw new Error("ENABLE_DEV_MOCK_MODE must not be enabled in production.");
  }
}

const allowedOrigins = parseAllowedOrigins();

const httpServer = http.createServer(app);
const io = new SocketIoServer(httpServer, {
  cors: {
    origin(origin, callback) {
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

      callback(new Error("Socket CORS origin denied"));
    },
    credentials: true
  }
});

// Socket Authentication Middleware
io.use((socket, next) => {
  try {
    const cookies = cookie.parse(socket.request.headers.cookie || "");
    const token = cookies[AUTH_COOKIE_NAME];

    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    const decoded = jwt.verify(token, getJwtSecret());
    socket.user = decoded; // Attach user info to socket
    next();
  } catch (err) {
    logError(err, { context: "Socket Authentication", socketId: socket.id });
    next(new Error("Authentication error: Invalid token"));
  }
});

function isObjectIdLike(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

function toConversationRoom(conversationId) {
  return `social:conversation:${conversationId}`;
}

function normalizeConversationIds(value) {
  const input = Array.isArray(value) ? value : [];
  const ids = input
    .map((entry) => String(entry || "").trim())
    .filter((entry) => isObjectIdLike(entry));
  return [...new Set(ids)].slice(0, 300);
}

app.locals.emitSocialEvent = (payload) => {
  const eventPayload = {
    timestamp: new Date().toISOString(),
    ...payload
  };

  const scopedConversationIds = normalizeConversationIds(
    payload?.conversationIds || (payload?.conversationId ? [payload.conversationId] : [])
  );

  if (scopedConversationIds.length) {
    for (const conversationId of scopedConversationIds) {
      io.to(toConversationRoom(conversationId)).emit("social:update", eventPayload);
      if (eventPayload.type === "message" && eventPayload.message) {
        io.to(toConversationRoom(conversationId)).emit("social:message", eventPayload);
      }
    }
    return;
  }

  io.emit("social:update", eventPayload);
  if (eventPayload.type === "message" && eventPayload.message) {
    io.emit("social:message", eventPayload);
  }
};

io.on("connection", (socket) => {
  const userId = socket.user?.userId || socket.user?.id || socket.user?._id;
  
  if (userId) {
    onlineUsers.set(String(userId), socket.id);
    io.emit("rtc:user-status", { userId, status: "online" });
  }

  // --- WebRTC Signaling ---
  socket.on("rtc:call-user", ({ targetUserId, signalData, fromName, conversationId, callType }) => {
    const targetSocketId = onlineUsers.get(String(targetUserId));
    if (targetSocketId) {
      io.to(targetSocketId).emit("rtc:incoming-call", {
        fromUserId: userId,
        fromName,
        signalData,
        conversationId,
        callType
      });
    } else {
      socket.emit("rtc:call-error", { message: "User is offline" });
    }
  });

  socket.on("rtc:answer-call", ({ targetUserId, signalData }) => {
    const targetSocketId = onlineUsers.get(String(targetUserId));
    if (targetSocketId) {
      io.to(targetSocketId).emit("rtc:call-accepted", { signalData, fromUserId: userId });
    }
  });

  socket.on("rtc:reject-call", ({ targetUserId }) => {
    const targetSocketId = onlineUsers.get(String(targetUserId));
    if (targetSocketId) {
      io.to(targetSocketId).emit("rtc:call-rejected", { fromUserId: userId });
    }
  });

  socket.on("rtc:signal", ({ targetUserId, signalData }) => {
    const targetSocketId = onlineUsers.get(String(targetUserId));
    if (targetSocketId) {
      io.to(targetSocketId).emit("rtc:signal", { fromUserId: userId, signalData });
    }
  });

  socket.on("rtc:end-call", ({ targetUserId }) => {
    const targetSocketId = onlineUsers.get(String(targetUserId));
    if (targetSocketId) {
      io.to(targetSocketId).emit("rtc:call-ended", { fromUserId: userId });
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      onlineUsers.delete(String(userId));
      io.emit("rtc:user-status", { userId, status: "offline" });
    }
  });

  socket.on("social:subscribe", (payload = {}) => {
    const conversationIds = normalizeConversationIds(payload.conversationIds);
    for (const conversationId of conversationIds) {
      socket.join(toConversationRoom(conversationId));
    }
    socket.emit("social:subscribed", { conversationIds });
  });

  socket.on("social:unsubscribe", (payload = {}) => {
    const conversationIds = normalizeConversationIds(payload.conversationIds);
    for (const conversationId of conversationIds) {
      socket.leave(toConversationRoom(conversationId));
    }
  });

  socket.emit("social:ready", { ok: true });
});

async function startServer() {
  try {
    validateRuntimeEnv();

    await mongoose.connect(CENTRAL_MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    app.locals.mockMode = false;
    app.locals.centralDatabaseUri = CENTRAL_MONGODB_URI;
    logger.info("Central MongoDB connected", { uri: CENTRAL_MONGODB_URI.replace(/\/\/[^@]+@/, '//***@') });

    httpServer.on("error", (error) => {
      logError(error, { context: "HTTP Server error" });
      captureError(error, { tags: { errorType: "http_server_error" } });
    });

    process.on("unhandledRejection", (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(`Unhandled Rejection: ${reason}`);
      logError(error, { context: "unhandledRejection", promise });
      captureError(error, {
        tags: { errorType: "unhandled_rejection" },
        extra: { promise: promise?.toString() }
      });
    });

    process.on("uncaughtException", (error) => {
      logError(error, { context: "uncaughtException" });
      captureError(error, {
        tags: { errorType: "uncaught_exception" },
        level: "fatal"
      });
      // In production, we might want to restart the process after logging
      if (process.env.NODE_ENV === "production") {
        logger.error("Uncaught exception in production, exiting process", { error: error.message });
        process.exit(1);
      }
    });

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        port: PORT,
        nodeEnv: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'
      });
    });
  } catch (error) {
    const isDevelopment = process.env.NODE_ENV !== "production";

    if (!isDevelopment || !ENABLE_DEV_MOCK_MODE) {
      logError(error, { context: "Failed to start server" });
      if (isDevelopment && !ENABLE_DEV_MOCK_MODE) {
        logger.warn("Set ENABLE_DEV_MOCK_MODE=true only if you explicitly want mock API data.");
      }
      process.exit(1);
    }

    app.locals.mockMode = true;
    app.locals.mockReason = error.message;

    logger.warn("MongoDB unavailable. Starting API in development mock mode.", {
      error: error.message,
      mode: "mock"
    });

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} (mock mode)`, {
        port: PORT,
        mode: "mock",
        reason: error.message
      });
    });
  }
}

startServer();
