import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  useDeferredValue,
} from "react";
import {
  useMutation,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchAlumniConversations,
  fetchAlumni,
  updateAlumniConversationRequest,
  sendAlumniConversationMessage,
  toggleAlumniConversationReaction,
  markAlumniConversationRead,
  setAlumniConversationTyping,
  createAlumniConversationGroup,
  leaveGroupConversation,
  deleteAlumniConversation,
  editAlumniConversationMessage,
  deleteAlumniConversationMessage,
  clearAlumniConversationMessages,
  updateGroupMemberRole,
  muteGroupMember,
  unmuteGroupMember,
  removeGroupMember,
  uploadFriendshipAttachment,
  fetchAlumniConversationMessages,
  toggleMuteAlumniConversation,
  toggleBlockAlumniContact,
} from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";


const initialGroupForm = {
  groupName: "",
  initialMessage: "",
  memberUserIds: [],
};

function upsertConversationMessage(oldData, nextMessage) {
  if (!oldData) {
    return { pages: [[nextMessage]], pageParams: [undefined] };
  }

  const pages = (oldData.pages || []).map((page) =>
    page.map((message) => {
      if (String(message._id) === String(nextMessage._id)) {
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

  const exists = pages.some((page) =>
    page.some(
      (message) =>
        String(message._id) === String(nextMessage._id) ||
        (nextMessage.clientId &&
          message.clientId &&
          String(message.clientId) === String(nextMessage.clientId)),
    ),
  );

  if (!exists) {
    const lastPageIdx = pages.length - 1;
    pages[lastPageIdx] = [...pages[lastPageIdx], nextMessage];
  }

  return { ...oldData, pages };
}

export function useFriendship() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const invalidateConversationLists = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["alumni-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["friendship-requests"] });
  }, [queryClient]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeId, setActiveId] = useState(null);
  const [isMobileThreadListOpen, setIsMobileThreadListOpen] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 760px)").matches
      : false,
  );
  const [pendingMessagesByConversation, setPendingMessagesByConversation] =
    useState({});
  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);

  // Viewport effect
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const handle = (e) => {
      setIsMobileViewport(e.matches);
      if (!e.matches) setIsMobileThreadListOpen(true);
    };
    mediaQuery.addEventListener("change", handle);
    return () => mediaQuery.removeEventListener("change", handle);
  }, []);

  const {
    data: rawData = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["alumni-conversations"],
    queryFn: fetchAlumniConversations,
    enabled: auth.user?.role === "alumni",
    refetchInterval: 10000,
  });

  const { data: alumni = [] } = useQuery({
    queryKey: ["alumni"],
    queryFn: fetchAlumni,
    enabled: auth.user?.role === "alumni",
  });

  const {
    data: messagesInfiniteData,
    isLoading: isMessagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["alumni-conversation-messages", activeId],
    queryFn: ({ pageParam }) =>
      fetchAlumniConversationMessages(activeId, { before: pageParam }),
    enabled: !!activeId,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 50) return undefined;
      return lastPage[0]?.createdAt; // Fetch messages before the oldest one in the last batch
    },
    refetchOnWindowFocus: false,
    refetchInterval: 3000,
  });

  const messagesData = useMemo(() => {
    return messagesInfiniteData?.pages.flatMap((page) => page) || [];
  }, [messagesInfiniteData]);

  const conversations = useMemo(() => {
    return rawData.map((item) => {
      const latestMessage =
        item.latestMessage || item.messages?.[item.messages.length - 1] || null;
      const latestSenderId = latestMessage?.senderId?._id || latestMessage?.senderId || null;
      const latestSenderName = latestMessage?.senderId?.name || null;
      const latestReadBy = Array.isArray(latestMessage?.readBy)
        ? latestMessage.readBy.map((entry) => entry?._id || entry).filter(Boolean)
        : [];
      const currentUserId = auth.user?.id ? String(auth.user.id) : null;
      const latestIsUnread = Boolean(
        latestMessage &&
          currentUserId &&
          String(latestSenderId || "") !== currentUserId &&
          !latestReadBy.some((entry) => String(entry) === currentUserId),
      );
      const unreadCount =
        activeId === item._id
          ? messagesData.filter((message) => {
              const senderId = String(
                message.sender?._id ||
                  message.senderId?._id ||
                  message.senderId ||
                  "",
              );
              if (!senderId || senderId === currentUserId) {
                return false;
              }
              return !Array.isArray(message.readBy)
                ? true
                : !message.readBy.some(
                    (entry) => String(entry?._id || entry) === currentUserId,
                  );
            }).length
          : latestIsUnread
            ? 1
            : 0;
      const latestPreview = latestMessage
        ? latestMessage.content?.trim() ||
          (latestMessage.attachments?.length ? "Attachment" : "No messages yet")
        : item.message || "No messages yet";
      const previewText =
        item.conversationType === "group" && latestSenderName
          ? `${latestSenderName}: ${latestPreview}`
          : latestPreview;

      const isActiveConversation = activeId === item._id;
      const displayUnreadCount = isActiveConversation
        ? 0
        : Number(item.unreadCount ?? unreadCount ?? 0);

      const common = {
        _id: item._id,
        preview: previewText,
        status: item.status || "active",
        when: new Date(item.updatedAt || item.createdAt).toLocaleDateString(
          undefined,
          { month: "short", day: "numeric" },
        ),
        messages: activeId === item._id ? messagesData : [],
        createdAt: item.createdAt,
        e2ee: item.e2ee || { participantKeys: [], envelopes: [] },
        typingMembers: item.typingMembers || [],
        isUnread: isActiveConversation ? false : latestIsUnread,
        unreadCount: displayUnreadCount,
      };

      if (item.conversationType === "group") {
        return {
          ...common,
          type: "group",
          name: item.groupName || "Untitled Group",
          members: item.members || [],
          admins: item.admins || [],
          moderators: item.moderators || [],
          currentUserRole: item.currentUserRole || null,
        };
      }

      const currentId = String(auth.user?.id || auth.user?._id || "");
      const isMentor =
        currentId && String(item.mentor?._id || item.mentor?.id || "") === currentId;
      const partner = isMentor ? item.requester : item.mentor;
      return {
        ...common,
        type: "direct",
        name: partner?.name || "Alumni contact",
        online: item.status === "accepted",
        incoming: isMentor,
        requester: item.requester,
        mentor: item.mentor,
        members: [item.requester, item.mentor].filter(Boolean).map(p => ({
          ...p,
          id: p._id || p.id
        })),
      };
    });
  }, [activeId, auth.user?.id, messagesData, rawData]);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    if (activeFilter === "unread") {
      filtered = filtered.filter((c) => c.unreadCount > 0);
    } else if (activeFilter === "groups") {
      filtered = filtered.filter((c) => c.type === "group");
    }

    if (!deferredSearch) return filtered;
    const q = deferredSearch.toLowerCase();
    return filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q) ||
        (c.type === "group" &&
          (c.members || []).some((m) => m.name?.toLowerCase().includes(q))),
    );
  }, [conversations, activeFilter, deferredSearch]);

  const activeConversation = useMemo(
    () =>
      filteredConversations.find((c) => c._id === activeId) ||
      filteredConversations[0] ||
      null,
    [filteredConversations, activeId],
  );

  useEffect(() => {
    if (!activeId && filteredConversations.length > 0) {
      setActiveId(filteredConversations[0]._id);
    }
  }, [activeId, filteredConversations]);

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: ({ id, content, clientId, attachments, replyToMessageId }) =>
      sendAlumniConversationMessage(id, {
        content,
        clientId,
        attachments,
        replyToMessageId,
      }),
    onSuccess: (newMessage, variables) => {
      queryClient.setQueryData(["alumni-conversation-messages", variables.id], (old) =>
        upsertConversationMessage(old, newMessage),
      );
      invalidateConversationLists();
    },
  });

  const reactionMutation = useMutation({
    mutationFn: ({ id, messageId, emoji }) =>
      toggleAlumniConversationReaction(id, messageId, { emoji }),
    onSuccess: (updatedMessage, variables) => {
      queryClient.setQueryData(["alumni-conversation-messages", variables.id], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((message) =>
              String(message._id) === String(updatedMessage._id) ? updatedMessage : message,
            ),
          ),
        };
      });
      invalidateConversationLists();
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: ({ requestId, messageId, content }) =>
      editAlumniConversationMessage(requestId, messageId, { content }),
    onSuccess: (updatedMessage, variables) => {
      queryClient.setQueryData(["alumni-conversation-messages", variables.requestId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((message) =>
              String(message._id) === String(updatedMessage._id) ? updatedMessage : message,
            ),
          ),
        };
      });
      invalidateConversationLists();
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: ({ requestId, messageId }) => deleteAlumniConversationMessage(requestId, messageId),
    onSuccess: (updatedMessage, variables) => {
      queryClient.setQueryData(["alumni-conversation-messages", variables.requestId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((message) =>
              String(message._id) === String(updatedMessage._id) ? updatedMessage : message,
            ),
          ),
        };
      });
      invalidateConversationLists();
    },
  });

  const clearMessagesMutation = useMutation({
    mutationFn: clearAlumniConversationMessages,
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({
        queryKey: ["alumni-conversation-messages", conversationId],
      });
      const previousMessages = queryClient.getQueryData([
        "alumni-conversation-messages",
        conversationId,
      ]);
      queryClient.setQueryData(
        ["alumni-conversation-messages", conversationId],
        (old) =>
          old
            ? { ...old, pages: [[]] }
            : { pages: [[]], pageParams: [undefined] },
      );
      return { conversationId, previousMessages };
    },
    onError: (_error, conversationId, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["alumni-conversation-messages", conversationId],
          context.previousMessages,
        );
      }
    },
    onSettled: (_data, _error, conversationId) => {
      queryClient.invalidateQueries({
        queryKey: ["alumni-conversation-messages", conversationId],
      });
      invalidateConversationLists();
    },
  });

  const markReadMutation = useMutation({
    mutationFn: markAlumniConversationRead,
    onSuccess: () =>
      invalidateConversationLists(),
  });

  const createGroupMutation = useMutation({
    mutationFn: createAlumniConversationGroup,
    onSuccess: (conversation) => {
      invalidateConversationLists();
      setActiveId(conversation._id);
      if (isMobileViewport) setIsMobileThreadListOpen(false);
      setGroupForm(initialGroupForm);
      setIsCreateGroupOpen(false);
    },
  });

  const updateGroupMemberRoleMutation = useMutation({
    mutationFn: ({ conversationId, userId, role }) =>
      updateGroupMemberRole(conversationId, userId, { role }),
    onSuccess: () => {
      invalidateConversationLists();
    },
  });

  const muteGroupMemberMutation = useMutation({
    mutationFn: ({ conversationId, userId, muteMinutes }) =>
      muteGroupMember(conversationId, userId, { muteMinutes }),
    onSuccess: () => {
      invalidateConversationLists();
    },
  });

  const unmuteGroupMemberMutation = useMutation({
    mutationFn: ({ conversationId, userId }) =>
      unmuteGroupMember(conversationId, userId),
    onSuccess: () => {
      invalidateConversationLists();
    },
  });

  const removeGroupMemberMutation = useMutation({
    mutationFn: ({ conversationId, userId }) =>
      removeGroupMember(conversationId, userId),
    onSuccess: () => {
      invalidateConversationLists();
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: leaveGroupConversation,
    onSuccess: () => {
      invalidateConversationLists();
      setActiveId(null);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: deleteAlumniConversation,
    onSuccess: () => {
      invalidateConversationLists();
      setActiveId(null);
    },
  });
  const toggleMuteMutation = useMutation({
    mutationFn: toggleMuteAlumniConversation,
    onSuccess: () => invalidateConversationLists(),
  });

  const toggleBlockMutation = useMutation({
    mutationFn: toggleBlockAlumniContact,
    onSuccess: () => invalidateConversationLists(),
  });

  // Helper functions
  const removePendingMessage = useCallback((conversationId, matcher) => {
    setPendingMessagesByConversation((curr) => {
      const pending = curr[conversationId] || [];
      const updated = pending.filter((m) => !matcher(m));
      if (!updated.length) {
        const next = { ...curr };
        delete next[conversationId];
        return next;
      }
      return { ...curr, [conversationId]: updated };
    });
  }, []);

  const updatePendingMessage = useCallback(
    (conversationId, matcher, updater) => {
      setPendingMessagesByConversation((curr) => {
        const pending = curr[conversationId] || [];
        const updated = pending.map((m) => (matcher(m) ? updater(m) : m));
        return { ...curr, [conversationId]: updated };
      });
    },
    [],
  );

  return {
    auth,
    conversations,
    filteredConversations,
    activeConversation,
    activeId,
    setActiveId,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    isMobileViewport,
    isMobileThreadListOpen,
    setIsMobileThreadListOpen,
    isLoading,
    isError,
    error,
    alumni,
    groupForm,
    setGroupForm,
    isCreateGroupOpen,
    setIsCreateGroupOpen,
    pendingMessagesByConversation,
    setPendingMessagesByConversation,
    sendMessageMutation,
    reactionMutation,
    editMessageMutation,
    deleteMessageMutation,
    clearMessagesMutation,
    markReadMutation,
    createGroupMutation,
    updateGroupMemberRoleMutation,
    muteGroupMemberMutation,
    unmuteGroupMemberMutation,
    removeGroupMemberMutation,
    leaveGroupMutation,
    deleteConversationMutation,
    toggleMuteMutation,
    toggleBlockMutation,
    removePendingMessage,
    updatePendingMessage,
    isMessagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}

export const useAlumniConversations = useFriendship;
