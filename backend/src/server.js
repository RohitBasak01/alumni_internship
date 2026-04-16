import dotenv from "dotenv";
import http from "node:http";
import mongoose from "mongoose";
import { Server as SocketIoServer } from "socket.io";

import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const CENTRAL_MONGODB_URI =
  process.env.CENTRAL_MONGODB_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/alumni-network";
const ENABLE_DEV_MOCK_MODE = process.env.ENABLE_DEV_MOCK_MODE === "true";

const httpServer = http.createServer(app);
const io = new SocketIoServer(httpServer, {
  cors: {
    origin: true,
    credentials: true
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
    await mongoose.connect(CENTRAL_MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    app.locals.mockMode = false;
    app.locals.centralDatabaseUri = CENTRAL_MONGODB_URI;
    console.log("Central MongoDB connected");

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
