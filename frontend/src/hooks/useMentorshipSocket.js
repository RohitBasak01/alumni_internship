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
    const upsertMessage = (conversationId, nextMessage) => {
      if (!conversationId || !nextMessage?._id) return;
      queryClient.setQueryData(["alumni-conversation-messages", conversationId], (old) => {
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
          page.some((message) => String(message._id) === String(nextMessage._id)),
        );

        if (!alreadyExists && lastPageIdx >= 0) {
          newPages[lastPageIdx] = [...newPages[lastPageIdx], nextMessage];
        }

        return { ...old, pages: newPages };
      });
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

export const useAlumniConversationSocket = useMentorshipSocket;
