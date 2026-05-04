const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server.js');
let content = fs.readFileSync(filePath, 'utf8');

// Add onlineUsers map
if (!content.includes('const onlineUsers = new Map();')) {
    content = content.replace(
        'dotenv.config({ override: true });',
        'dotenv.config({ override: true });\n\nconst onlineUsers = new Map(); // userId -> socketId'
    );
}

// Add signaling logic
const socketBlockStart = 'io.on("connection", (socket) => {';
const rtcLogic = `
  const userId = socket.user?.id || socket.user?._id;
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
`;

if (!content.includes('rtc:call-user')) {
    content = content.replace(socketBlockStart, socketBlockStart + rtcLogic);
}

fs.writeFileSync(filePath, content);
console.log('Successfully updated server.js');
