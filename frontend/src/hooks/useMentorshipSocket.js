import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getApiOrigin } from "../lib/api.js";

export function useMentorshipSocket(auth, conversations) {
  const queryClient = useQueryClient();
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const socketRef = useRef(null);
  const subscribedConversationIdsRef = useRef(new Set());
  const userIdRef = useRef(null);

  // Socket connection - use stable userId reference to prevent recreation
  useEffect(() => {
    const userId = auth.user?.id || auth.user?._id;

    if (!auth.user?.role || auth.user?.role !== "alumni") {
      console.log("[Socket] User is not alumni, skipping socket");
      return;
    }

    // If socket already exists and user hasn't changed, don't recreate
    if (
      socketRef.current &&
      userIdRef.current === String(userId) &&
      socketRef.current.connected
    ) {
      console.log("[Socket] Socket already connected for this user, reusing");
      return;
    }

    // If socket exists but user changed, disconnect old one
    if (socketRef.current && userIdRef.current !== String(userId)) {
      console.log("[Socket] User changed, disconnecting old socket");
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    userIdRef.current = String(userId);
    console.log(
      "[Socket] Initializing socket connection to:",
      getApiOrigin(),
      "for user:",
      userId,
    );

    const socket = io(getApiOrigin(), {
      withCredentials: true,
      // Prefer polling first so cookies/credentials are sent during the
      // initial HTTP handshake; the transport will then upgrade to websocket.
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected successfully");
      setIsRealtimeConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setIsRealtimeConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message || error);
    });

    const upsertMessage = (conversationId, nextMessage) => {
      if (!conversationId || !nextMessage?._id) return;
      // Use queryClient directly instead of from closure
      queryClient.setQueryData(
        ["alumni-conversation-messages", conversationId],
        (old) => {
          if (!old) return old;
          const newPages = old.pages.map((page) =>
            page.map((message) => {
              if (message._id === nextMessage._id) {
                return nextMessage;
              }
              if (
                nextMessage.clientId &&
                message.clientId &&
                String(message.clientId) === String(nextMessage.clientId)
              ) {
                return nextMessage;
              }
              return message;
            }),
          );
          const lastPageIdx = newPages.length - 1;
          const alreadyExists = newPages.some((page) =>
            page.some(
              (message) => String(message._id) === String(nextMessage._id),
            ),
          );

          if (!alreadyExists && lastPageIdx >= 0) {
            newPages[lastPageIdx] = [...newPages[lastPageIdx], nextMessage];
          }

          return { ...old, pages: newPages };
        },
      );
    };

    socket.on("mentorship:message", (payload = {}) => {
      const conversationId = String(payload?.conversationId || "").trim();
      if (!conversationId) return;
      upsertMessage(conversationId, payload.message);
      queryClient.invalidateQueries({ queryKey: ["alumni-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    });

    socket.on("mentorship:update", (payload = {}) => {
      const conversationId = String(payload?.conversationId || "").trim();
      if (payload?.type === "message" && payload?.message) {
        upsertMessage(conversationId, payload.message);
      }
      queryClient.invalidateQueries({ queryKey: ["alumni-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    });

    return () => {
      console.log("[Socket] Component unmounting, keeping socket alive");
      // Don't disconnect on unmount - let it stay connected
    };
  }, [auth.user?.id, auth.user?.role]);

  // Handle subscriptions
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isRealtimeConnected) return;

    const nextIds = new Set(
      conversations.map((c) => String(c._id)).filter(Boolean),
    );
    const previousIds = subscribedConversationIdsRef.current;
    const idsToSubscribe = [...nextIds].filter((id) => !previousIds.has(id));
    const idsToUnsubscribe = [...previousIds].filter((id) => !nextIds.has(id));

    if (idsToSubscribe.length) {
      socket.emit("mentorship:subscribe", { conversationIds: idsToSubscribe });
    }
    if (idsToUnsubscribe.length) {
      socket.emit("mentorship:unsubscribe", {
        conversationIds: idsToUnsubscribe,
      });
    }

    subscribedConversationIdsRef.current = nextIds;
  }, [conversations, isRealtimeConnected]);

  return { isRealtimeConnected, socket: socketRef.current };
}

export const useAlumniConversationSocket = useMentorshipSocket;
