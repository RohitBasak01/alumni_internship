import { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue } from "react";
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMentorshipRequests,
  fetchAlumni,
  updateMentorshipRequest,
  sendMentorshipMessage,
  toggleMentorshipMessageReaction,
  markMentorshipConversationRead,
  setMentorshipTyping,
  createGroupConversation,
  leaveGroupConversation,
  editMentorshipMessage,
  deleteMentorshipMessage,
  updateGroupMemberRole,
  muteGroupMember,
  unmuteGroupMember,
  removeGroupMember,
  uploadMentorshipAttachment,
  fetchMentorshipMessages,
} from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { isEncryptedEnvelope } from "../lib/e2ee.js";

const initialGroupForm = { groupName: "", initialMessage: "", memberUserIds: [] };

export function useMentorship() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [isMobileThreadListOpen, setIsMobileThreadListOpen] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 760px)").matches : false
  );
  const [pendingMessagesByConversation, setPendingMessagesByConversation] = useState({});
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

  const { data: rawData = [], isLoading, isError, error } = useQuery({
    queryKey: ["mentorship-requests"],
    queryFn: fetchMentorshipRequests,
    enabled: auth.user?.role === "alumni",
    refetchInterval: 10000,
  });

  const { data: alumni = [] } = useQuery({
    queryKey: ["alumni"],
    queryFn: fetchAlumni,
    enabled: auth.user?.role === "alumni"
  });

  const { 
    data: messagesInfiniteData, 
    isLoading: isMessagesLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ["mentorship-messages", activeId],
    queryFn: ({ pageParam }) => fetchMentorshipMessages(activeId, { before: pageParam }),
    enabled: !!activeId,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 50) return undefined;
      return lastPage[0]?.createdAt; // Fetch messages before the oldest one in the last batch
    },
    refetchOnWindowFocus: false,
  });

  const messagesData = useMemo(() => {
    return messagesInfiniteData?.pages.flatMap(page => page) || [];
  }, [messagesInfiniteData]);

  const conversations = useMemo(() => {
    return rawData.map((item) => {
      const latestMessage = item.messages?.[item.messages.length - 1] || null;
      const latestPreview = latestMessage
        ? isEncryptedEnvelope(latestMessage.content)
          ? "Encrypted message"
          : latestMessage.content?.trim() || (latestMessage.attachments?.length ? "Attachment" : "No messages yet")
        : item.message || "No messages yet";

      const common = {
        _id: item._id,
        preview: latestPreview,
        status: item.status || "active",
        when: new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        messages: activeId === item._id ? messagesData : [],
        createdAt: item.createdAt,
        e2ee: item.e2ee || { participantKeys: [], envelopes: [] }
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

      const isMentor = item.mentor?._id === auth.user?.id;
      const partner = isMentor ? item.requester : item.mentor;
      return {
        ...common,
        type: "direct",
        name: partner?.name || "Alumni contact",
        online: item.status === "accepted",
        incoming: isMentor,
        requester: item.requester,
        mentor: item.mentor,
      };
    });
  }, [auth.user?.id, rawData]);

  const filteredConversations = useMemo(() => {
    if (!deferredSearch) return conversations;
    const q = deferredSearch.toLowerCase();
    return conversations.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.preview.toLowerCase().includes(q) ||
      (c.type === "group" && (c.members || []).some(m => m.name?.toLowerCase().includes(q)))
    );
  }, [conversations, deferredSearch]);

  const activeConversation = useMemo(() => 
    filteredConversations.find(c => c._id === activeId) || filteredConversations[0] || null
  , [filteredConversations, activeId]);

  // Mutations
    mutationFn: ({ id, content, clientId, attachments, replyToMessageId }) =>
      sendMentorshipMessage(id, { content, clientId, attachments, replyToMessageId }),
    onSuccess: (newMessage, variables) => {
      queryClient.setQueryData(["mentorship-messages", variables.id], (old) => {
        if (!old) return { pages: [[newMessage]], pageParams: [undefined] };
        const lastPageIdx = old.pages.length - 1;
        const newPages = [...old.pages];
        newPages[lastPageIdx] = [...newPages[lastPageIdx], newMessage];
        return { ...old, pages: newPages };
      });
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const reactionMutation = useMutation({
    mutationFn: ({ id, messageId, emoji }) => toggleMentorshipMessageReaction(id, messageId, { emoji }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] })
  });

  const markReadMutation = useMutation({
    mutationFn: markMentorshipConversationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] })
  });

  const createGroupMutation = useMutation({
    mutationFn: createGroupConversation,
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      setActiveId(conversation._id);
      if (isMobileViewport) setIsMobileThreadListOpen(false);
      setGroupForm(initialGroupForm);
      setIsCreateGroupOpen(false);
    }
  });

  // Helper functions
  const removePendingMessage = useCallback((conversationId, matcher) => {
    setPendingMessagesByConversation(curr => {
      const pending = curr[conversationId] || [];
      const updated = pending.filter(m => !matcher(m));
      if (!updated.length) {
        const next = { ...curr };
        delete next[conversationId];
        return next;
      }
      return { ...curr, [conversationId]: updated };
    });
  }, []);

  const updatePendingMessage = useCallback((conversationId, matcher, updater) => {
    setPendingMessagesByConversation(curr => {
      const pending = curr[conversationId] || [];
      const updated = pending.map(m => matcher(m) ? updater(m) : m);
      return { ...curr, [conversationId]: updated };
    });
  }, []);

  return {
    auth,
    conversations,
    filteredConversations,
    activeConversation,
    activeId,
    setActiveId,
    search,
    setSearch,
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
    markReadMutation,
    createGroupMutation,
    removePendingMessage,
    updatePendingMessage,
    isMessagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  };
}
