import dotenv from "dotenv";
import http from "node:http";
import mongoose from "mongoose";
import { Server as SocketIoServer } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import app from "./app.js";
import { getJwtSecret, AUTH_COOKIE_NAME } from "./utils/auth.js";

dotenv.config({ override: true });

const PORT = process.env.PORT || 5000;
const CENTRAL_MONGODB_URI =
  process.env.CENTRAL_MONGODB_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/alumni-network";
const ENABLE_DEV_MOCK_MODE = process.env.ENABLE_DEV_MOCK_MODE === "true";

function parseAllowedOrigins() {
  const configured = String(
    process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_URL || process.env.FRONTEND_URL || ""
  );
  return configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function validateRuntimeEnv() {
  getJwtSecret();

  if (process.env.NODE_ENV === "production" && parseAllowedOrigins().length === 0) {
    throw new Error("CORS_ALLOWED_ORIGINS (or CLIENT_URL/FRONTEND_URL) is required in production.");
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
    next(new Error("Authentication error: Invalid token"));
  }
});

function isObjectIdLike(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

function toConversationRoom(conversationId) {
  return `mentorship:conversation:${conversationId}`;
}

function normalizeConversationIds(value) {
  const input = Array.isArray(value) ? value : [];
  const ids = input
    .map((entry) => String(entry || "").trim())
    .filter((entry) => isObjectIdLike(entry));
  return [...new Set(ids)].slice(0, 300);
}

app.locals.emitMentorshipEvent = (payload) => {
  const eventPayload = {
    timestamp: new Date().toISOString(),
    ...payload
  };

  const scopedConversationIds = normalizeConversationIds(
    payload?.conversationIds || (payload?.conversationId ? [payload.conversationId] : [])
  );

  if (scopedConversationIds.length) {
    for (const conversationId of scopedConversationIds) {
      io.to(toConversationRoom(conversationId)).emit("mentorship:update", eventPayload);
    }
    return;
  }

  io.emit("mentorship:update", eventPayload);
};

io.on("connection", (socket) => {
  socket.on("mentorship:subscribe", (payload = {}) => {
    const conversationIds = normalizeConversationIds(payload.conversationIds);
    for (const conversationId of conversationIds) {
      socket.join(toConversationRoom(conversationId));
    }
    socket.emit("mentorship:subscribed", { conversationIds });
  });

  socket.on("mentorship:unsubscribe", (payload = {}) => {
    const conversationIds = normalizeConversationIds(payload.conversationIds);
    for (const conversationId of conversationIds) {
      socket.leave(toConversationRoom(conversationId));
    }
  });

  socket.emit("mentorship:ready", { ok: true });
});

async function startServer() {
  try {
    validateRuntimeEnv();

    await mongoose.connect(CENTRAL_MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    app.locals.mockMode = false;
    app.locals.centralDatabaseUri = CENTRAL_MONGODB_URI;
    console.log("Central MongoDB connected");

    httpServer.on("error", (error) => {
      console.error("HTTP Server error:", error);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection:", reason);
    });

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    const isDevelopment = process.env.NODE_ENV !== "production";

    if (!isDevelopment || !ENABLE_DEV_MOCK_MODE) {
      console.error("Failed to start server", error);
      if (isDevelopment && !ENABLE_DEV_MOCK_MODE) {
        console.error("Set ENABLE_DEV_MOCK_MODE=true only if you explicitly want mock API data.");
      }
      process.exit(1);
    }

    app.locals.mockMode = true;
    app.locals.mockReason = error.message;

    console.warn("MongoDB unavailable. Starting API in development mock mode.");
    console.warn(error.message);

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (mock mode)`);
    });
  }
}

startServer();
