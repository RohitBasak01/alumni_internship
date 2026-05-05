import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getApiOrigin } from "../lib/api.js";

export function useMentorshipSocket(auth, conversations) {
  const queryClient = useQueryClient();
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const socketRef = useRef(null);
  const subscribedConversationIdsRef = useRef(new Set());
  const handledMessageEventIdsRef = useRef(new Set());
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

      // Re-subscribe to all known conversations immediately on (re)connect
      // so messages sent during a brief disconnect are not missed.
      const idsToResub = [...subscribedConversationIdsRef.current];
      if (idsToResub.length) {
        console.log("[Socket] Re-subscribing to", idsToResub.length, "conversations after connect");
        socket.emit("mentorship:subscribe", { conversationIds: idsToResub });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setIsRealtimeConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message || error);
    });

    // Upsert a message into the infinite-query cache for a conversation.
    const upsertMessage = (conversationId, nextMessage) => {
      if (!conversationId || !nextMessage?._id) return;

      queryClient.setQueryData(
        ["alumni-conversation-messages", conversationId],
        (old) => {
          // No cache yet – seed it so the message appears immediately
          const pages = Array.isArray(old?.pages)
            ? old.pages.map((page) => (Array.isArray(page) ? [...page] : []))
            : [];

          if (!pages.length) {
            return { pages: [[nextMessage]], pageParams: [undefined] };
          }

          // Check if this message already exists (by _id or clientId).
          const alreadyExists = pages.some((page) =>
            page.some(
              (m) =>
                String(m._id) === String(nextMessage._id) ||
                (nextMessage.clientId &&
                  m.clientId &&
                  String(m.clientId) === String(nextMessage.clientId)),
            ),
          );

          if (alreadyExists) {
            // Update in place (e.g. delivery status changed)
            return {
              ...old,
              pages: pages.map((page) =>
                page.map((m) => {
                  if (String(m._id) === String(nextMessage._id)) return nextMessage;
                  if (
                    nextMessage.clientId &&
                    m.clientId &&
                    String(m.clientId) === String(nextMessage.clientId)
                  ) return nextMessage;
                  return m;
                }),
              ),
            };
          }

          // Append to the last page
          pages[pages.length - 1] = [...pages[pages.length - 1], nextMessage];
          return { ...old, pages };
        },
      );

      // Refresh the conversations sidebar so the preview + unread count update immediately.
      queryClient.invalidateQueries({ queryKey: ["alumni-conversations"] });
    };

    const handleRealtimeMessage = (payload = {}) => {
      const conversationId = String(payload?.conversationId || "").trim();
      const messageId = String(payload?.messageId || payload?.message?._id || "").trim();
      if (!conversationId || !payload?.message) return;

      const eventKey = `${conversationId}:${messageId || payload.timestamp || Date.now()}`;
      if (messageId && handledMessageEventIdsRef.current.has(eventKey)) {
        return;
      }

      if (messageId) {
        handledMessageEventIdsRef.current.add(eventKey);
        if (handledMessageEventIdsRef.current.size > 500) {
          handledMessageEventIdsRef.current = new Set(
            [...handledMessageEventIdsRef.current].slice(-250),
          );
        }
      }

      console.log("[Socket] realtime message for", conversationId);
      upsertMessage(conversationId, payload.message);
    };

    socket.on("mentorship:message", (payload = {}) => {
      handleRealtimeMessage(payload);
    });

    socket.on("mentorship:update", (payload = {}) => {
      if (payload?.type === "message" && payload?.message) {
        handleRealtimeMessage(payload);
      } else if (payload?.type === "messages-cleared") {
        const conversationId = String(payload?.conversationId || "").trim();
        if (conversationId) {
          queryClient.setQueryData(
            ["alumni-conversation-messages", conversationId],
            (old) =>
              old
                ? { ...old, pages: [[]] }
                : { pages: [[]], pageParams: [undefined] },
          );
        }
        queryClient.invalidateQueries({ queryKey: ["alumni-conversations"] });
      } else {
        // Non-message update (typing, read, role change) — refresh metadata only
        queryClient.invalidateQueries({ queryKey: ["alumni-conversations"] });
      }
    });

    socket.on("mentorship:ready", () => {
      console.log("[Socket] Server ready signal received");
    });

    return () => {
      console.log("[Socket] Component unmounting, keeping socket alive");
    };
  }, [auth.user?.id, auth.user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle subscriptions — runs whenever conversations list or connection changes
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
      console.log("[Socket] Subscribing to", idsToSubscribe.length, "new conversations");
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
