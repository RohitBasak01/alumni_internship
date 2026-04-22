import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getApiOrigin } from "../lib/api.js";

export function useMentorshipSocket(auth, conversations) {
  const queryClient = useQueryClient();
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const socketRef = useRef(null);
  const subscribedConversationIdsRef = useRef(new Set());

  useEffect(() => {
    if (auth.user?.role !== "alumni") return;

    const socket = io(getApiOrigin(), {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    socket.on("connect", () => setIsRealtimeConnected(true));
    socket.on("disconnect", () => setIsRealtimeConnected(false));
    socket.on("mentorship:message", (payload = {}) => {
      const conversationId = String(payload?.conversationId || "").trim();
      if (!conversationId) return;

      queryClient.setQueryData(["mentorship-messages", conversationId], (old) => {
        if (!old) return old;
        const lastPageIdx = old.pages.length - 1;
        const newPages = [...old.pages];
        // Only append if it doesn't already exist (avoid duplicates from sender's mutation)
        if (!newPages[lastPageIdx].some(m => m._id === payload.message?._id)) {
          newPages[lastPageIdx] = [...newPages[lastPageIdx], payload.message];
        }
        return { ...old, pages: newPages };
      });
      
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    });

    socket.on("mentorship:update", (payload = {}) => {
      const conversationId = String(payload?.conversationId || "").trim();
      // Only invalidate if it's a conversation we know about
      const knownIds = new Set(conversations.map(c => String(c._id)));
      if (conversationId && !knownIds.has(conversationId)) return;
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    });

    return () => {
      subscribedConversationIdsRef.current = new Set();
      socket.disconnect();
      socketRef.current = null;
      setIsRealtimeConnected(false);
    };
  }, [auth.user?.role, queryClient, conversations]);

  // Handle subscriptions
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isRealtimeConnected) return;

    const nextIds = new Set(conversations.map(c => String(c._id)).filter(Boolean));
    const previousIds = subscribedConversationIdsRef.current;
    const idsToSubscribe = [...nextIds].filter(id => !previousIds.has(id));
    const idsToUnsubscribe = [...previousIds].filter(id => !nextIds.has(id));

    if (idsToSubscribe.length) {
      socket.emit("mentorship:subscribe", { conversationIds: idsToSubscribe });
    }
    if (idsToUnsubscribe.length) {
      socket.emit("mentorship:unsubscribe", { conversationIds: idsToUnsubscribe });
    }

    subscribedConversationIdsRef.current = nextIds;
  }, [conversations, isRealtimeConnected]);

  return { isRealtimeConnected, socket: socketRef.current };
}
