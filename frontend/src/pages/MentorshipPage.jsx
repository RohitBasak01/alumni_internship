import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";

import {
  PortalMetricCard,
  PortalMetricGrid,
  PortalPageHeader,
  PortalSearchField
} from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createGroupConversation,
  deleteMentorshipMessage,
  editMentorshipMessage,
  fetchAlumni,
  fetchMentorshipRequests,
  getApiOrigin,
  leaveGroupConversation,
  markMentorshipConversationRead,
  muteGroupMember,
  removeGroupMember,
  resolveApiAssetUrl,
  syncMentorshipConversationEnvelopes,
  setMentorshipTyping,
  sendMentorshipMessage,
  toggleMentorshipMessageReaction,
  unmuteGroupMember,
  upsertMentorshipE2eePublicKey,
  uploadMentorshipAttachment,
  updateGroupMemberRole,
  updateMentorshipRequest
} from "../lib/api.js";
import {
  decryptConversationSecretEnvelope,
  decryptFileAttachment,
  decryptMessageContent,
  encryptConversationSecretForPublicKey,
  encryptFileAttachment,
  encryptMessageContent,
  ensureE2eeDeviceKeyPair,
  generateConversationSecret,
  getConversationKeyFingerprint,
  isEncryptedEnvelope
} from "../lib/e2ee.js";

function formatTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function getMessageDayKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function formatMessageDayLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) {
    return "Today";
  }

  if (target.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric"
  });
}

function getInitials(name, fallback = "??") {
  const initials = String(name || "")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || fallback;
}

function buildClientMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatFileSize(size) {
  const value = Number(size || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return "0 KB";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

const quickInsertActions = [
  {
    id: "intro",
    label: "Intro",
    value: "Hi! Thanks for connecting. I would love to learn more about your journey."
  },
  {
    id: "availability",
    label: "Availability",
    value: "Would you be open to a quick chat this week? I am flexible on timing."
  },
  {
    id: "profile",
    label: "Profile link",
    value: "Here is my profile for context: "
  }
];

const reactionChoices = ["😀", "😂", "❤️", "🎉", "👏", "🙏"];
const messageReactionChoices = ["👍", "❤️", "😂", "🎉", "🔥", "🙏"];

const initialGroupForm = {
  groupName: "",
  initialMessage: "",
  memberUserIds: []
};

function getConversationSecretStorageKey(conversationId) {
  return `mentorship:e2ee:${conversationId}`;
}

function getConversationVerificationStorageKey(conversationId) {
  return `mentorship:e2ee:verified:${conversationId}`;
}

function buildAttachmentPreviewKey(messageId, attachmentUrl) {
  return `${String(messageId || "")}:${String(attachmentUrl || "")}`;
}

function getConversationParticipantKeys(conversation) {
  return Array.isArray(conversation?.e2ee?.participantKeys)
    ? conversation.e2ee.participantKeys
        .map((entry) => ({
          userId: String(entry?.userId || "").trim(),
          publicKey: String(entry?.publicKey || "").trim(),
          algorithm: String(entry?.algorithm || "").trim(),
          updatedAt: entry?.updatedAt || null
        }))
        .filter((entry) => entry.userId)
    : [];
}

function getConversationEnvelopes(conversation) {
  return Array.isArray(conversation?.e2ee?.envelopes)
    ? conversation.e2ee.envelopes
        .map((entry) => ({
          userId: String(entry?.userId || "").trim(),
          encryptedKey: String(entry?.encryptedKey || "").trim(),
          algorithm: String(entry?.algorithm || "").trim(),
          version: String(entry?.version || "").trim()
        }))
        .filter((entry) => entry.userId && entry.encryptedKey)
    : [];
}

function MentorshipPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 760px)").matches : false
  );
  const [isMobileThreadListOpen, setIsMobileThreadListOpen] = useState(true);
  const [draftMessage, setDraftMessage] = useState("");
  const [composerAttachments, setComposerAttachments] = useState([]);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageDraft, setEditingMessageDraft] = useState("");
  const [isGroupMembersExpanded, setIsGroupMembersExpanded] = useState(false);
  const [isEncryptionPanelOpen, setIsEncryptionPanelOpen] = useState(false);
  const [conversationSecretInput, setConversationSecretInput] = useState("");
  const [conversationSecret, setConversationSecret] = useState("");
  const [conversationKeyFingerprint, setConversationKeyFingerprint] = useState("");
  const [isConversationKeyVerified, setIsConversationKeyVerified] = useState(false);
  const [devicePrivateKeyJwk, setDevicePrivateKeyJwk] = useState(null);
  const [devicePublicKeySerialized, setDevicePublicKeySerialized] = useState("");
  const [isE2eeInitializing, setIsE2eeInitializing] = useState(false);
  const [decryptedContentByMessageId, setDecryptedContentByMessageId] = useState({});
  const [replyPreviewContentByMessageId, setReplyPreviewContentByMessageId] = useState({});
  const [decryptedAttachmentUrlByKey, setDecryptedAttachmentUrlByKey] = useState({});
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState("");
  const [pendingMessagesByConversation, setPendingMessagesByConversation] = useState({});
  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const messageStreamRef = useRef(null);
  const messageNodeRefs = useRef(new Map());
  const attachmentInputRef = useRef(null);
  const socketRef = useRef(null);
  const knownConversationIdsRef = useRef(new Set());
  const subscribedConversationIdsRef = useRef(new Set());
  const e2eeSyncSignatureRef = useRef(new Map());
  const decryptingAttachmentKeysRef = useRef(new Set());
  const decryptedAttachmentUrlByKeyRef = useRef({});
  const typingStopTimerRef = useRef(null);
  const highlightResetTimerRef = useRef(null);
  const typingHeartbeatRef = useRef(0);
  const lastReadSyncRef = useRef(new Map());
  const previousActiveConversationIdRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");

    function handleViewportChange(event) {
      setIsMobileViewport(event.matches);
      if (!event.matches) {
        setIsMobileThreadListOpen(true);
      }
    }

    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleViewportChange);

    return () => {
      mediaQuery.removeEventListener("change", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (auth.user?.role !== "alumni") {
      return;
    }

    const socket = io(getApiOrigin(), {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsRealtimeConnected(true);
    });

    socket.on("disconnect", () => {
      setIsRealtimeConnected(false);
    });

    socket.on("mentorship:update", (payload = {}) => {
      const conversationId = String(payload?.conversationId || "").trim();
      if (conversationId && !knownConversationIdsRef.current.has(conversationId)) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    });

    return () => {
      subscribedConversationIdsRef.current = new Set();
      socket.disconnect();
      socketRef.current = null;
      setIsRealtimeConnected(false);
    };
  }, [auth.user?.role, queryClient]);

  useEffect(() => {
    if (auth.user?.role !== "alumni") {
      return;
    }

    let isCancelled = false;

    async function bootstrapE2eeDevice() {
      setIsE2eeInitializing(true);
      try {
        const keyPair = await ensureE2eeDeviceKeyPair();
        if (isCancelled) {
          return;
        }

        setDevicePrivateKeyJwk(keyPair.privateKeyJwk);
        setDevicePublicKeySerialized(keyPair.publicKeySerialized);

        await upsertMentorshipE2eePublicKey({
          publicKey: keyPair.publicKeySerialized,
          algorithm: "RSA-OAEP"
        });

        await queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      } catch {
        if (!isCancelled) {
          setAttachmentUploadError("Unable to initialize secure messaging keys on this device.");
        }
      } finally {
        if (!isCancelled) {
          setIsE2eeInitializing(false);
        }
      }
    }

    void bootstrapE2eeDevice();

    return () => {
      isCancelled = true;
    };
  }, [auth.user?.role, queryClient]);

  useEffect(() => {
    return () => {
      Object.values(decryptedAttachmentUrlByKeyRef.current).forEach((value) => {
        if (typeof value === "string" && value.startsWith("blob:")) {
          URL.revokeObjectURL(value);
        }
      });
      decryptedAttachmentUrlByKeyRef.current = {};
    };
  }, []);

  useEffect(() => {
    decryptedAttachmentUrlByKeyRef.current = decryptedAttachmentUrlByKey;
  }, [decryptedAttachmentUrlByKey]);

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["mentorship-requests"],
    queryFn: fetchMentorshipRequests,
    enabled: auth.user?.role === "alumni",
    refetchInterval: 10000,
    refetchIntervalInBackground: false
  });

  const { data: alumni = [] } = useQuery({
    queryKey: ["alumni"],
    queryFn: fetchAlumni,
    enabled: auth.user?.role === "alumni"
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => updateMentorshipRequest(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ id, content, clientId, attachments, replyToMessageId }) =>
      sendMentorshipMessage(id, { content, clientId, attachments, replyToMessageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const reactionMutation = useMutation({
    mutationFn: ({ id, messageId, emoji }) => toggleMentorshipMessageReaction(id, messageId, { emoji }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const markReadMutation = useMutation({
    mutationFn: markMentorshipConversationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const typingMutation = useMutation({
    mutationFn: ({ id, isTyping }) => setMentorshipTyping(id, { isTyping })
  });

  const createGroupMutation = useMutation({
    mutationFn: createGroupConversation,
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      setActiveId(conversation._id);
      if (isMobileViewport) {
        setIsMobileThreadListOpen(false);
      }
      setGroupForm(initialGroupForm);
      setIsCreateGroupOpen(false);
    }
  });

  const leaveGroupMutation = useMutation({
    mutationFn: leaveGroupConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      setActiveId(null);
    }
  });

  const editMessageMutation = useMutation({
    mutationFn: ({ id, messageId, content }) => editMentorshipMessage(id, messageId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      setEditingMessageId(null);
      setEditingMessageDraft("");
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: ({ id, messageId }) => deleteMentorshipMessage(id, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      if (editingMessageId) {
        setEditingMessageId(null);
        setEditingMessageDraft("");
      }
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ requestId, userId, role }) => updateGroupMemberRole(requestId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const muteMemberMutation = useMutation({
    mutationFn: ({ requestId, userId, minutes }) => muteGroupMember(requestId, userId, { minutes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const unmuteMemberMutation = useMutation({
    mutationFn: ({ requestId, userId }) => unmuteGroupMember(requestId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ requestId, userId }) => removeGroupMember(requestId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const conversations = useMemo(() => {
    return data.map((item) => {
      const latestMessage = item.messages?.[item.messages.length - 1] || null;
      const latestPreview = latestMessage
        ? isEncryptedEnvelope(latestMessage.content)
          ? "Encrypted message"
          : latestMessage.content?.trim() || (latestMessage.attachments?.length ? "Attachment" : "No messages yet")
        : item.message || "No messages yet";

      if (item.conversationType === "group") {
        return {
          _id: item._id,
          type: "group",
          name: item.groupName || "Untitled Group",
          preview: latestPreview || "Group created",
          status: item.status || "active",
          when: new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric"
          }),
          online: false,
          incoming: false,
          messages: item.messages || [],
          createdAt: item.createdAt,
          members: item.members || [],
          admins: item.admins || [],
          moderators: item.moderators || [],
          currentUserRole: item.currentUserRole || null,
          e2ee: item.e2ee || { participantKeys: [], envelopes: [] }
        };
      }

      const isMentor = item.mentor?._id === auth.user?.id;
      const partner = isMentor ? item.requester : item.mentor;
      return {
        _id: item._id,
        type: "direct",
        name: partner?.name || "Alumni contact",
        preview: latestPreview,
        status: item.status,
        when: new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric"
        }),
        online: item.status === "accepted",
        incoming: isMentor,
        messages: item.messages || [],
        createdAt: item.createdAt,
        requester: item.requester,
        mentor: item.mentor,
        e2ee: item.e2ee || { participantKeys: [], envelopes: [] }
      };
    });
  }, [auth.user?.id, data]);

  useEffect(() => {
    knownConversationIdsRef.current = new Set(conversations.map((item) => String(item._id || "")).filter(Boolean));

    const socket = socketRef.current;
    if (!socket || !isRealtimeConnected) {
      return;
    }

    const nextIds = new Set(conversations.map((item) => String(item._id || "")).filter(Boolean));
    const previousIds = subscribedConversationIdsRef.current;
    const idsToSubscribe = [...nextIds].filter((id) => !previousIds.has(id));
    const idsToUnsubscribe = [...previousIds].filter((id) => !nextIds.has(id));

    if (idsToSubscribe.length) {
      socket.emit("mentorship:subscribe", { conversationIds: idsToSubscribe });
    }

    if (idsToUnsubscribe.length) {
      socket.emit("mentorship:unsubscribe", { conversationIds: idsToUnsubscribe });
    }

    subscribedConversationIdsRef.current = nextIds;
  }, [conversations, isRealtimeConnected]);

  const filteredConversations = useMemo(() => {
    if (!deferredSearch) {
      return conversations;
    }

    const query = deferredSearch.toLowerCase();
    return conversations.filter((item) => {
      const names = item.type === "group" ? (item.members || []).map((member) => member?.name || "") : [];
      return (
        item.name.toLowerCase().includes(query) ||
        item.preview.toLowerCase().includes(query) ||
        names.some((name) => name.toLowerCase().includes(query))
      );
    });
  }, [conversations, deferredSearch]);

  const activeConversation =
    filteredConversations.find((item) => item._id === activeId) || filteredConversations[0] || null;

  const hasConversationSecret = Boolean(conversationSecret.trim());
  const activeConversationMember =
    activeConversation?.type === "group"
      ? (activeConversation.members || []).find((member) => member._id === auth.user?.id) || null
      : null;
  const activeConversationMuteUntil = activeConversationMember?.mutedUntil
    ? new Date(activeConversationMember.mutedUntil)
    : null;
  const isCurrentUserMuted =
    activeConversationMuteUntil instanceof Date && Number.isFinite(activeConversationMuteUntil.getTime())
      ? activeConversationMuteUntil.getTime() > Date.now()
      : false;
  const canManageGroupMembers = ["admin", "moderator"].includes(activeConversation?.currentUserRole || "");

  const canSendMessage =
    Boolean(activeConversation) &&
    hasConversationSecret &&
    !isCurrentUserMuted &&
    activeConversation.status !== "declined" &&
    (activeConversation.type === "group" || activeConversation.status !== "pending");

  const pendingActiveMessages = pendingMessagesByConversation[activeConversation?._id] || [];

  const visibleMessages = useMemo(() => {
    const baseMessages = activeConversation?.messages || [];
    const merged = [...baseMessages, ...pendingActiveMessages];

    return merged.sort((a, b) => new Date(a.sentAt || 0).getTime() - new Date(b.sentAt || 0).getTime());
  }, [activeConversation?.messages, pendingActiveMessages]);

  useEffect(() => {
    setIsGroupMembersExpanded(false);
    setReplyToMessage(null);
    setComposerAttachments([]);
    setAttachmentUploadError("");
    setReactionPickerMessageId(null);
    setActiveMessageMenuId(null);
    setHighlightedMessageId(null);
    setIsEncryptionPanelOpen(false);

    if (!activeConversation?._id || typeof window === "undefined") {
      setConversationSecret("");
      setConversationSecretInput("");
      setConversationKeyFingerprint("");
      setIsConversationKeyVerified(false);
      return;
    }

    setDecryptedAttachmentUrlByKey((current) => {
      Object.values(current).forEach((value) => {
        if (typeof value === "string" && value.startsWith("blob:")) {
          URL.revokeObjectURL(value);
        }
      });
      return {};
    });
    decryptingAttachmentKeysRef.current.clear();

    const storedSecret = window.localStorage.getItem(getConversationSecretStorageKey(activeConversation._id)) || "";
    const verifiedValue = window.localStorage.getItem(getConversationVerificationStorageKey(activeConversation._id));
    setConversationSecret(storedSecret);
    setConversationSecretInput(storedSecret);
    setIsConversationKeyVerified(verifiedValue === "true");
  }, [activeConversation?._id]);

  useEffect(() => {
    if (!activeConversation?._id || !auth.user?.id || !devicePrivateKeyJwk || !devicePublicKeySerialized || typeof window === "undefined") {
      return;
    }

    let isCancelled = false;
    const conversationId = activeConversation._id;
    const currentUserId = String(auth.user.id);

    async function ensureConversationSecret() {
      setIsE2eeInitializing(true);
      try {
        const participantKeys = getConversationParticipantKeys(activeConversation);
        const envelopeEntries = getConversationEnvelopes(activeConversation);
        const participantKeyByUserId = new Map(participantKeys.map((entry) => [entry.userId, entry.publicKey]));
        if (!participantKeyByUserId.has(currentUserId)) {
          participantKeyByUserId.set(currentUserId, devicePublicKeySerialized);
        }

        const selfParticipant = participantKeys.find((entry) => entry.userId === currentUserId);
        if (!selfParticipant?.publicKey || selfParticipant.publicKey !== devicePublicKeySerialized) {
          await upsertMentorshipE2eePublicKey({
            publicKey: devicePublicKeySerialized,
            algorithm: "RSA-OAEP"
          });
        }

        const storageKey = getConversationSecretStorageKey(conversationId);
        const verificationStorageKey = getConversationVerificationStorageKey(conversationId);
        let resolvedSecret = window.localStorage.getItem(storageKey) || "";

        if (!resolvedSecret) {
          const ownEnvelope = envelopeEntries.find((entry) => entry.userId === currentUserId);
          if (ownEnvelope?.encryptedKey) {
            try {
              resolvedSecret = await decryptConversationSecretEnvelope(ownEnvelope.encryptedKey, devicePrivateKeyJwk);
            } catch {
              resolvedSecret = "";
            }
          }
        }

        if (!resolvedSecret) {
          resolvedSecret = generateConversationSecret();
        }

        const envelopeByUserId = new Map(envelopeEntries.map((entry) => [entry.userId, entry]));
        const missingTargets = [...participantKeyByUserId.entries()]
          .filter(([userId, publicKey]) => Boolean(publicKey) && !envelopeByUserId.has(userId))
          .map(([userId, publicKey]) => ({ userId, publicKey }));

        if (missingTargets.length) {
          const signature = `${conversationId}:${missingTargets
            .map((item) => item.userId)
            .sort()
            .join("|")}`;

          if (e2eeSyncSignatureRef.current.get(conversationId) !== signature) {
            e2eeSyncSignatureRef.current.set(conversationId, signature);

            const envelopes = [];
            for (const target of missingTargets) {
              const encryptedKey = await encryptConversationSecretForPublicKey(resolvedSecret, target.publicKey);
              envelopes.push({
                userId: target.userId,
                encryptedKey,
                algorithm: "RSA-OAEP",
                version: "conv-v1"
              });
            }

            if (envelopes.length) {
              await syncMentorshipConversationEnvelopes(conversationId, { envelopes });
              await queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
            }
          }
        } else {
          e2eeSyncSignatureRef.current.delete(conversationId);
        }

        if (isCancelled) {
          return;
        }

        window.localStorage.setItem(storageKey, resolvedSecret);
        window.localStorage.setItem(verificationStorageKey, "true");
        setConversationSecret(resolvedSecret);
        setConversationSecretInput(resolvedSecret);
        setIsConversationKeyVerified(true);
        setAttachmentUploadError("");
      } catch {
        if (!isCancelled) {
          setAttachmentUploadError("Secure channel is initializing. Try again in a moment.");
        }
      } finally {
        if (!isCancelled) {
          setIsE2eeInitializing(false);
        }
      }
    }

    void ensureConversationSecret();

    return () => {
      isCancelled = true;
    };
  }, [
    activeConversation?._id,
    activeConversation?.e2ee,
    auth.user?.id,
    devicePrivateKeyJwk,
    devicePublicKeySerialized,
    queryClient
  ]);

  useEffect(() => {
    let isCancelled = false;

    async function updateKeyFingerprint() {
      if (!activeConversation?._id || !conversationSecret) {
        setConversationKeyFingerprint("");
        return;
      }

      try {
        const fingerprint = await getConversationKeyFingerprint(conversationSecret, activeConversation._id);
        if (!isCancelled) {
          setConversationKeyFingerprint(fingerprint);
        }
      } catch {
        if (!isCancelled) {
          setConversationKeyFingerprint("");
        }
      }
    }

    void updateKeyFingerprint();
    return () => {
      isCancelled = true;
    };
  }, [activeConversation?._id, conversationSecret]);

  useEffect(() => {
    let isCancelled = false;

    async function decryptVisibleMessages() {
      if (!activeConversation) {
        setDecryptedContentByMessageId({});
        setReplyPreviewContentByMessageId({});
        return;
      }

      const decryptedContent = {};
      const decryptedReplyPreview = {};

      for (const message of visibleMessages) {
        const rawContent = String(message.content || "");
        if (!isEncryptedEnvelope(rawContent)) {
          decryptedContent[message._id] = rawContent;
        } else if (!conversationSecret) {
          decryptedContent[message._id] = "Encrypted message";
        } else {
          try {
            decryptedContent[message._id] = await decryptMessageContent(rawContent, conversationSecret, activeConversation._id);
          } catch {
            decryptedContent[message._id] = "Unable to decrypt";
          }
        }

        if (!message.replyTo) {
          continue;
        }

        const replyRawContent = String(message.replyTo.content || "");
        if (!isEncryptedEnvelope(replyRawContent)) {
          decryptedReplyPreview[message._id] = replyRawContent;
        } else if (!conversationSecret) {
          decryptedReplyPreview[message._id] = "Encrypted message";
        } else {
          try {
            decryptedReplyPreview[message._id] = await decryptMessageContent(
              replyRawContent,
              conversationSecret,
              activeConversation._id
            );
          } catch {
            decryptedReplyPreview[message._id] = "Unable to decrypt";
          }
        }
      }

      if (!isCancelled) {
        setDecryptedContentByMessageId(decryptedContent);
        setReplyPreviewContentByMessageId(decryptedReplyPreview);
      }
    }

    void decryptVisibleMessages();

    return () => {
      isCancelled = true;
    };
  }, [activeConversation?._id, conversationSecret, visibleMessages]);

  useEffect(() => {
    if (!activeConversation?._id || !conversationSecret) {
      return;
    }

    for (const message of visibleMessages) {
      for (const attachment of message.attachments || []) {
        if (!attachment?.isEncrypted) {
          continue;
        }

        const originalMimeType = String(attachment.originalMimeType || "");
        if (!originalMimeType.startsWith("image/")) {
          continue;
        }

        const previewKey = buildAttachmentPreviewKey(message._id, attachment.url);
        if (decryptedAttachmentUrlByKey[previewKey]) {
          continue;
        }

        void decryptAttachmentForPreview(message._id, attachment);
      }
    }
  }, [activeConversation?._id, conversationSecret, decryptedAttachmentUrlByKey, visibleMessages]);

  useEffect(() => {
    setPendingMessagesByConversation((current) => {
      const next = { ...current };
      let hasChanges = false;

      for (const conversation of conversations) {
        const pending = next[conversation._id] || [];
        if (!pending.length) {
          continue;
        }

        const serverClientIds = new Set((conversation.messages || []).map((message) => message.clientId).filter(Boolean));
        const filteredPending = pending.filter((message) => {
          if (message.delivery?.status === "failed") {
            return true;
          }

          return !message.clientId || !serverClientIds.has(message.clientId);
        });

        if (filteredPending.length !== pending.length) {
          next[conversation._id] = filteredPending;
          hasChanges = true;
        }
      }

      return hasChanges ? next : current;
    });
  }, [conversations]);

  useEffect(() => {
    const stream = messageStreamRef.current;
    if (!stream || !activeConversation) {
      return;
    }

    const isConversationChange = previousActiveConversationIdRef.current !== activeConversation._id;
    if (isConversationChange || shouldAutoScrollRef.current) {
      stream.scrollTop = stream.scrollHeight;
    }

    previousActiveConversationIdRef.current = activeConversation._id;
  }, [activeConversation?._id, visibleMessages.length]);

  useEffect(() => {
    if (!activeConversation) {
      return;
    }

    const conversationId = activeConversation._id;
    const now = Date.now();
    const lastSyncedAt = lastReadSyncRef.current.get(conversationId) || 0;
    if (now - lastSyncedAt < 2000) {
      return;
    }

    lastReadSyncRef.current.set(conversationId, now);
    markReadMutation.mutate(conversationId);
  }, [activeConversation?._id, activeConversation?.messages?.length]);

  useEffect(() => {
    if (!activeConversation || !canSendMessage) {
      return;
    }

    if (!draftMessage.trim()) {
      sendTypingSignal(false);
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      return;
    }

    const now = Date.now();
    if (now - typingHeartbeatRef.current > 2200) {
      typingHeartbeatRef.current = now;
      sendTypingSignal(true);
    }

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = setTimeout(() => {
      sendTypingSignal(false);
    }, 2600);

    return () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }
    };
  }, [activeConversation?._id, draftMessage, canSendMessage]);

  const groupCandidateMembers = useMemo(
    () => alumni.filter((item) => item.userId !== auth.user?.id && item.isActive),
    [alumni, auth.user?.id]
  );

  const acceptedCount = conversations.filter((item) => item.status === "accepted" || item.type === "group").length;
  const pendingCount = conversations.filter((item) => item.type === "direct" && item.status === "pending").length;

  const typingNames = useMemo(() => {
    if (!activeConversation?.typingUserIds?.length) {
      return [];
    }

    if (activeConversation.type === "group") {
      const membersById = new Map((activeConversation.members || []).map((member) => [member._id, member.name]));
      return activeConversation.typingUserIds
        .map((userId) => membersById.get(userId))
        .filter(Boolean)
        .slice(0, 3);
    }

    return [activeConversation.name];
  }, [activeConversation]);

  const typingLabel = useMemo(() => {
    if (!typingNames.length) {
      return "";
    }

    if (typingNames.length === 1) {
      return `${typingNames[0]} is typing...`;
    }

    if (typingNames.length === 2) {
      return `${typingNames[0]} and ${typingNames[1]} are typing...`;
    }

    return `${typingNames[0]}, ${typingNames[1]}, and others are typing...`;
  }, [typingNames]);

  const hasDecryptionFailures = useMemo(() => {
    return visibleMessages.some((message) => {
      if (!isEncryptedEnvelope(message.content)) {
        return false;
      }

      return decryptedContentByMessageId[message._id] === "Unable to decrypt";
    });
  }, [decryptedContentByMessageId, visibleMessages]);

  useEffect(() => {
    return () => {
      if (highlightResetTimerRef.current) {
        clearTimeout(highlightResetTimerRef.current);
      }
    };
  }, []);

  function registerMessageNode(messageId, node) {
    if (!messageId) {
      return;
    }

    if (node) {
      messageNodeRefs.current.set(String(messageId), node);
    } else {
      messageNodeRefs.current.delete(String(messageId));
    }
  }

  function jumpToMessage(messageId) {
    const targetNode = messageNodeRefs.current.get(String(messageId));
    if (!targetNode) {
      return;
    }

    targetNode.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    setHighlightedMessageId(String(messageId));
    if (highlightResetTimerRef.current) {
      clearTimeout(highlightResetTimerRef.current);
    }

    highlightResetTimerRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
    }, 1800);
  }

  function updatePendingMessage(conversationId, matcher, updater) {
    setPendingMessagesByConversation((current) => {
      const pending = current[conversationId] || [];
      const updated = pending.map((message) => (matcher(message) ? updater(message) : message));
      return {
        ...current,
        [conversationId]: updated
      };
    });
  }

  function removePendingMessage(conversationId, matcher) {
    setPendingMessagesByConversation((current) => {
      const pending = current[conversationId] || [];
      const updated = pending.filter((message) => !matcher(message));

      if (!updated.length) {
        const next = { ...current };
        delete next[conversationId];
        return next;
      }

      return {
        ...current,
        [conversationId]: updated
      };
    });
  }

  function sendTypingSignal(isTyping) {
    if (!activeConversation || !canSendMessage) {
      return;
    }

    typingMutation.mutate({ id: activeConversation._id, isTyping });
  }

  function closeConversationPanel() {
    setIsEncryptionPanelOpen(false);
    setIsGroupMembersExpanded(false);
  }

  function toggleEncryptionPanel() {
    setIsEncryptionPanelOpen((current) => {
      const next = !current;
      if (next) {
        setIsGroupMembersExpanded(false);
      }
      return next;
    });
  }

  function toggleGroupMembersPanel() {
    setIsGroupMembersExpanded((current) => {
      const next = !current;
      if (next) {
        setIsEncryptionPanelOpen(false);
      }
      return next;
    });
  }

  function handleMessageStreamScroll(event) {
    const stream = event.currentTarget;
    const distanceFromBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  }

  function handleLeaveGroup() {
    if (!activeConversation || activeConversation.type !== "group" || activeConversation.members.length <= 1) {
      return;
    }

    if (window.confirm(`Leave ${activeConversation.name}? You will need to be added again to rejoin.`)) {
      leaveGroupMutation.mutate(activeConversation._id);
    }
  }

  function getThreadStatus(item) {
    if (item.type === "group") {
      return { label: "Group", className: "status-active" };
    }

    if (item.status === "pending") {
      return { label: "Pending", className: "status-pending" };
    }

    if (item.status === "declined") {
      return { label: "Declined", className: "status-declined" };
    }

    return { label: "Active", className: "status-accepted" };
  }

  async function transmitPendingMessage(conversationId, pendingMessage) {
    try {
      await sendMessageMutation.mutateAsync({
        id: conversationId,
        content: pendingMessage.encryptedContent ?? pendingMessage.content,
        clientId: pendingMessage.clientId,
        attachments: pendingMessage.attachments || [],
        replyToMessageId: pendingMessage.replyTo?.messageId || null
      });

      removePendingMessage(conversationId, (message) => message._id === pendingMessage._id);
      setDraftMessage("");
      setComposerAttachments([]);
      setReplyToMessage(null);
      setIsQuickMenuOpen(false);
      setIsEmojiPickerOpen(false);
    } catch (error) {
      updatePendingMessage(
        conversationId,
        (message) => message._id === pendingMessage._id,
        (message) => ({
          ...message,
          delivery: { status: "failed" },
          errorMessage: error?.message || "Failed to send"
        })
      );
    }
  }

  function retryPendingMessage(conversationId, messageId) {
    const pendingMessage = (pendingMessagesByConversation[conversationId] || []).find((message) => message._id === messageId);
    if (!pendingMessage) {
      return;
    }

    updatePendingMessage(
      conversationId,
      (message) => message._id === messageId,
      (message) => ({
        ...message,
        delivery: { status: "sending" },
        errorMessage: null
      })
    );

    void transmitPendingMessage(conversationId, pendingMessage);
  }

  async function handleSendMessage() {
    const content = draftMessage.trim();
    if (!activeConversation || (!content && !composerAttachments.length) || !canSendMessage || isUploadingAttachments) {
      return;
    }

    setAttachmentUploadError("");

    let encryptedContent = "";
    if (content) {
      try {
        encryptedContent = await encryptMessageContent(content, conversationSecret, activeConversation._id);
      } catch {
        setAttachmentUploadError("Unable to encrypt message. Check your key and try again.");
        return;
      }
    }

    const attachmentsSnapshot = composerAttachments.map((attachment) => ({
      name: attachment.name,
      url: attachment.url,
      mimeType: attachment.mimeType,
      size: attachment.size,
      isImage: attachment.isImage,
      isEncrypted: attachment.isEncrypted === true,
      encryptionVersion: attachment.encryptionVersion || "",
      encryptionAlgorithm: attachment.encryptionAlgorithm || "",
      encryptionIv: attachment.encryptionIv || "",
      originalMimeType: attachment.originalMimeType || "",
      originalName: attachment.originalName || ""
    }));
    const replySnapshot = replyToMessage;

    const clientId = buildClientMessageId();
    const optimisticMessage = {
      _id: `temp-${clientId}`,
      clientId,
      content,
      encryptedContent,
      sentAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      attachments: attachmentsSnapshot,
      replyTo: replySnapshot,
      reactions: [],
      sender: {
        _id: auth.user?.id,
        name: auth.user?.name || "You"
      },
      delivery: {
        status: "sending"
      },
      isPending: true,
      errorMessage: null
    };

    setPendingMessagesByConversation((current) => ({
      ...current,
      [activeConversation._id]: [...(current[activeConversation._id] || []), optimisticMessage]
    }));

    setDraftMessage("");
    setComposerAttachments([]);
    setReplyToMessage(null);
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    sendTypingSignal(false);

    void transmitPendingMessage(activeConversation._id, optimisticMessage);
  }

  function getMessageDisplayContent(message) {
    const fromDecryptedMap = decryptedContentByMessageId[message?._id];
    if (typeof fromDecryptedMap === "string") {
      return fromDecryptedMap;
    }

    return String(message?.content || "");
  }

  function getReplyPreviewDisplayContent(message) {
    const fromReplyMap = replyPreviewContentByMessageId[message?._id];
    if (typeof fromReplyMap === "string") {
      return fromReplyMap;
    }

    return String(message?.replyTo?.content || "");
  }

  async function decryptAttachmentForPreview(messageId, attachment) {
    if (!activeConversation?._id || !attachment?.isEncrypted || !conversationSecret) {
      return "";
    }

    const previewKey = buildAttachmentPreviewKey(messageId, attachment.url);
    const existing = decryptedAttachmentUrlByKey[previewKey];
    if (existing) {
      return existing;
    }

    if (decryptingAttachmentKeysRef.current.has(previewKey)) {
      return "";
    }

    decryptingAttachmentKeysRef.current.add(previewKey);

    try {
      const response = await fetch(resolveApiAssetUrl(attachment.url), {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Unable to fetch encrypted attachment");
      }

      const encryptedBuffer = await response.arrayBuffer();
      const decryptedBuffer = await decryptFileAttachment(
        encryptedBuffer,
        attachment,
        conversationSecret,
        activeConversation._id
      );

      const blob = new Blob([decryptedBuffer], {
        type: attachment.originalMimeType || attachment.mimeType || "application/octet-stream"
      });
      const objectUrl = URL.createObjectURL(blob);

      setDecryptedAttachmentUrlByKey((current) => ({
        ...current,
        [previewKey]: objectUrl
      }));

      return objectUrl;
    } catch {
      setAttachmentUploadError("Unable to decrypt one or more attachments with the current key.");
      return "";
    } finally {
      decryptingAttachmentKeysRef.current.delete(previewKey);
    }
  }

  function startMessageEdit(message) {
    const currentContent = getMessageDisplayContent(message);
    if (isEncryptedEnvelope(message.content) && (!hasConversationSecret || currentContent === "Unable to decrypt")) {
      return;
    }

    setEditingMessageId(message._id);
    setEditingMessageDraft(currentContent || "");
  }

  function cancelMessageEdit() {
    setEditingMessageId(null);
    setEditingMessageDraft("");
  }

  async function saveMessageEdit() {
    const content = editingMessageDraft.trim();
    if (!activeConversation || !editingMessageId || !content || !hasConversationSecret) {
      return;
    }

    try {
      const encryptedContent = await encryptMessageContent(content, conversationSecret, activeConversation._id);
      editMessageMutation.mutate({
        id: activeConversation._id,
        messageId: editingMessageId,
        content: encryptedContent
      });
    } catch {
      setAttachmentUploadError("Unable to encrypt the updated message. Check your key and try again.");
    }
  }

  function appendToDraft(value) {
    setDraftMessage((current) => `${current}${current ? " " : ""}${value}`.trimStart());
  }

  function handleQuickInsert(action) {
    if (action.id === "profile") {
      appendToDraft(`${action.value}${window.location.origin}/portal/profile`);
    } else {
      appendToDraft(action.value);
    }

    setIsQuickMenuOpen(false);
  }

  function handleReactionInsert(reaction) {
    appendToDraft(reaction);
    setIsEmojiPickerOpen(false);
  }

  async function handleAttachmentSelection(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) {
      return;
    }

    const availableSlots = Math.max(0, 4 - composerAttachments.length);
    const selectedFiles = files.slice(0, availableSlots);
    const preparedAttachments = [];
    let skippedCount = 0;
    let failedCount = 0;

    setAttachmentUploadError("");
    setIsUploadingAttachments(true);

    try {
      for (const file of selectedFiles) {
        if (file.size > 5 * 1024 * 1024) {
          skippedCount += 1;
          continue;
        }

        try {
          let fileToUpload = file;
          let encryptedMetadata = {
            isEncrypted: false,
            encryptionVersion: "",
            encryptionAlgorithm: "",
            encryptionIv: "",
            originalMimeType: file.type || "application/octet-stream",
            originalName: file.name
          };

          if (activeConversation?._id && conversationSecret) {
            const encryptedAttachment = await encryptFileAttachment(file, conversationSecret, activeConversation._id);
            fileToUpload = encryptedAttachment.encryptedFile;
            encryptedMetadata = encryptedAttachment.metadata;
          }

          const uploadedAttachment = await uploadMentorshipAttachment(fileToUpload);
          preparedAttachments.push({
            id: buildClientMessageId(),
            name: uploadedAttachment.name || encryptedMetadata.originalName || file.name,
            url: String(uploadedAttachment.url || ""),
            mimeType: uploadedAttachment.mimeType || fileToUpload.type || "application/octet-stream",
            size: Number(uploadedAttachment.size || fileToUpload.size || 0),
            isImage: encryptedMetadata.isEncrypted
              ? false
              : Boolean(uploadedAttachment.isImage) || (encryptedMetadata.originalMimeType || file.type || "").startsWith("image/"),
            isEncrypted: encryptedMetadata.isEncrypted,
            encryptionVersion: encryptedMetadata.encryptionVersion,
            encryptionAlgorithm: encryptedMetadata.encryptionAlgorithm,
            encryptionIv: encryptedMetadata.encryptionIv,
            originalMimeType: encryptedMetadata.originalMimeType,
            originalName: encryptedMetadata.originalName
          });
        } catch {
          failedCount += 1;
        }
      }
    } finally {
      setIsUploadingAttachments(false);
    }

    if (!preparedAttachments.length) {
      if (failedCount || skippedCount) {
        const parts = [];
        if (skippedCount) {
          parts.push(`${skippedCount} file(s) were over 5 MB`);
        }
        if (failedCount) {
          parts.push(`${failedCount} file(s) failed to upload`);
        }
        setAttachmentUploadError(parts.join(". "));
      }
      return;
    }

    setComposerAttachments((current) => [...current, ...preparedAttachments].slice(0, 4));
    if (failedCount || skippedCount) {
      const parts = [];
      if (skippedCount) {
        parts.push(`${skippedCount} file(s) were over 5 MB`);
      }
      if (failedCount) {
        parts.push(`${failedCount} file(s) failed to upload`);
      }
      setAttachmentUploadError(parts.join(". "));
    }
  }

  function removeComposerAttachment(attachmentId) {
    setComposerAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  }

  function startReplyToMessage(message) {
    const snippet = getMessageDisplayContent(message).trim() || (message.attachments?.length ? "Attachment" : "Message");
    setReplyToMessage({
      messageId: message._id,
      senderName: message.sender?._id === auth.user?.id ? "You" : message.sender?.name || "Member",
      content: snippet
    });
    setReactionPickerMessageId(null);
  }

  function saveConversationSecret() {
    if (!activeConversation?._id || typeof window === "undefined") {
      return;
    }

    const secret = conversationSecretInput.trim();
    const storageKey = getConversationSecretStorageKey(activeConversation._id);
    const verificationStorageKey = getConversationVerificationStorageKey(activeConversation._id);
    if (secret) {
      window.localStorage.setItem(storageKey, secret);
      window.localStorage.removeItem(verificationStorageKey);
    } else {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(verificationStorageKey);
    }

    setConversationSecret(secret);
    setConversationSecretInput(secret);
    setIsConversationKeyVerified(false);
    setAttachmentUploadError("");
  }

  function clearConversationSecret() {
    if (!activeConversation?._id || typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(getConversationSecretStorageKey(activeConversation._id));
    window.localStorage.removeItem(getConversationVerificationStorageKey(activeConversation._id));
    setConversationSecret("");
    setConversationSecretInput("");
    setConversationKeyFingerprint("");
    setIsConversationKeyVerified(false);
    setDecryptedAttachmentUrlByKey((current) => {
      Object.values(current).forEach((value) => {
        if (typeof value === "string" && value.startsWith("blob:")) {
          URL.revokeObjectURL(value);
        }
      });
      return {};
    });
    decryptingAttachmentKeysRef.current.clear();
    sendTypingSignal(false);
  }

  function markConversationSecretVerified() {
    if (!activeConversation?._id || typeof window === "undefined" || !conversationSecret) {
      return;
    }

    window.localStorage.setItem(getConversationVerificationStorageKey(activeConversation._id), "true");
    setIsConversationKeyVerified(true);
  }

  function clearReplyToMessage() {
    setReplyToMessage(null);
  }

  function handleReactionToggle(messageId, emoji) {
    if (!activeConversation) {
      return;
    }

    reactionMutation.mutate({
      id: activeConversation._id,
      messageId,
      emoji
    });
    setReactionPickerMessageId(null);
  }

  function getDeliveryLabel(message) {
    if (!message?.delivery?.status) {
      return null;
    }

    if (message.delivery.status === "sending") {
      return "Sending";
    }

    if (message.delivery.status === "failed") {
      return "Failed";
    }

    if (message.delivery.status === "sent") {
      return "Sent";
    }

    if (message.delivery.status === "delivered") {
      return "Delivered";
    }

    if (message.delivery.status === "read") {
      return "Read";
    }

    return null;
  }

  function getDeliveryIconName(message) {
    const status = message?.delivery?.status;

    if (status === "sending") {
      return "schedule";
    }

    if (status === "failed") {
      return "error";
    }

    if (status === "read") {
      return "done_all";
    }

    if (status === "delivered") {
      return "done_all";
    }

    if (status === "sent") {
      return "done";
    }

    return null;
  }

  function handleGroupFormChange(event) {
    const { name, value } = event.target;
    setGroupForm((current) => ({ ...current, [name]: value }));
  }

  function toggleGroupMember(userId) {
    setGroupForm((current) => ({
      ...current,
      memberUserIds: current.memberUserIds.includes(userId)
        ? current.memberUserIds.filter((id) => id !== userId)
        : [...current.memberUserIds, userId]
    }));
  }

  function handleCreateGroup() {
    createGroupMutation.mutate({
      groupName: groupForm.groupName,
      initialMessage: groupForm.initialMessage,
      memberUserIds: groupForm.memberUserIds
    });
  }

  function handleSelectConversation(conversationId) {
    setActiveId(conversationId);
    if (isMobileViewport) {
      setIsMobileThreadListOpen(false);
    }
  }

  if (auth.user?.role !== "alumni") {
    return (
      <SectionCard title="Mentorship" subtitle="Portal access">
        <p className="muted">Mentorship requests are available for alumni accounts.</p>
      </SectionCard>
    );
  }

  return (
    <div className="member-messages-page">
      <PortalPageHeader
        title="Messages"
        subtitle="Stay in touch with mentors, peers, and small alumni groups from one place."
        actions={
          <button className="button primary" onClick={() => setIsCreateGroupOpen((current) => !current)} type="button">
            {isCreateGroupOpen ? "Close group builder" : "New group"}
          </button>
        }
      />

      <PortalMetricGrid>
        <PortalMetricCard title="Conversations" value={conversations.length} icon="CV" />
        <PortalMetricCard title="Active chats" value={acceptedCount} icon="AC" />
        <PortalMetricCard title="Pending replies" value={pendingCount} icon="PD" />
      </PortalMetricGrid>

      <div
        className={`member-messages-shell ${isMobileViewport ? "mobile-view" : ""} ${isMobileThreadListOpen ? "mobile-sidebar-open" : "mobile-sidebar-closed"}`.trim()}
      >
        <aside className="member-messages-sidebar">
          <SectionCard title="Inbox" subtitle="Find a conversation or start a small group">
            <PortalSearchField
              ariaLabel="Search conversations"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people, groups, or keywords"
              value={search}
            />
          </SectionCard>

          {isMobileViewport ? (
            <div className="member-mobile-thread-toggle in-sidebar">
              <button
                className="button secondary"
                disabled={!activeConversation}
                onClick={() => setIsMobileThreadListOpen(false)}
                type="button"
              >
                Open selected chat
              </button>
            </div>
          ) : null}

          {isCreateGroupOpen ? (
            <SectionCard title="Create group chat" subtitle="Bring together a few alumni around a topic or event">
              <div className="member-form-grid">
                <label className="member-form-field">
                  <span>Group name</span>
                  <input name="groupName" onChange={handleGroupFormChange} value={groupForm.groupName} />
                </label>
                <label className="member-form-field">
                  <span>Welcome message</span>
                  <textarea className="textarea member-form-textarea" name="initialMessage" onChange={handleGroupFormChange} rows="4" value={groupForm.initialMessage} />
                </label>
              </div>
              <div className="member-selection-list">
                {groupCandidateMembers.map((member) => {
                  const memberUserId = member.userId?._id || member.userId;
                  return (
                    <label className="member-selection-row" key={member._id}>
                      <input
                        checked={groupForm.memberUserIds.includes(memberUserId)}
                        onChange={() => toggleGroupMember(memberUserId)}
                        type="checkbox"
                      />
                      <div>
                        <strong>{member.name}</strong>
                        <span>{member.designation || "Alumni member"}</span>
                      </div>
                    </label>
                  );
                })}
                {!groupCandidateMembers.length ? <p className="muted">No other active alumni are available yet.</p> : null}
              </div>
              <div className="member-inline-actions">
                <button
                  className="button secondary"
                  onClick={() => {
                    setGroupForm(initialGroupForm);
                    setIsCreateGroupOpen(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="button primary"
                  disabled={!groupForm.groupName.trim() || !groupForm.memberUserIds.length || createGroupMutation.isPending}
                  onClick={handleCreateGroup}
                  type="button"
                >
                  {createGroupMutation.isPending ? "Creating..." : "Create group"}
                </button>
              </div>
              {createGroupMutation.isError ? <p className="error-text">{createGroupMutation.error.message}</p> : null}
            </SectionCard>
          ) : null}

          {isLoading ? <p>Loading conversations...</p> : null}
          {isError ? <p className="error-text">{error.message}</p> : null}
          {!isLoading && !filteredConversations.length ? (
            <p className="muted member-sidebar-empty">No conversations found. Try a different name or keyword.</p>
          ) : null}

          <div className="member-thread-list">
            {filteredConversations.map((item) => {
              const threadStatus = getThreadStatus(item);
              return (
                <button
                  className={item._id === activeConversation?._id ? "member-thread-card active" : "member-thread-card"}
                  key={item._id}
                  onClick={() => handleSelectConversation(item._id)}
                  type="button"
                >
                  <div className="member-thread-avatar">
                    {getInitials(item.name, item.type === "group" ? "GR" : "DM")}
                  </div>
                  <div className="member-thread-copy">
                    <div className="member-thread-head">
                      <strong>{item.name}</strong>
                      <span className={`member-status-pill ${threadStatus.className}`}>{threadStatus.label}</span>
                    </div>
                    <p>{item.preview}</p>
                    <div className="member-thread-foot">
                      <small>{item.type === "group" ? `${item.members.length} members` : "Direct message"}</small>
                      <span>{item.when}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="member-messages-panel">
          {isMobileViewport ? (
            <div className="member-mobile-thread-toggle">
              <button
                className="button secondary"
                onClick={() => setIsMobileThreadListOpen((current) => !current)}
                type="button"
              >
                {isMobileThreadListOpen ? "Hide conversations" : "Show conversations"}
              </button>
              {!isMobileThreadListOpen && activeConversation ? <span>{activeConversation.name}</span> : null}
            </div>
          ) : null}

          {activeConversation ? (
            <div className="member-active-conversation">
              <div className="member-messages-panel-header">
                <div className="member-messages-panel-identity">
                  <div className="member-thread-avatar large">
                    {getInitials(activeConversation.name, activeConversation.type === "group" ? "GR" : "DM")}
                  </div>
                  <div>
                    <strong>{activeConversation.name}</strong>
                    <p>
                      {activeConversation.type === "group"
                        ? `${activeConversation.members.length} members`
                        : activeConversation.online
                          ? "Active conversation"
                          : activeConversation.status}
                    </p>
                    <small
                      className={
                        isRealtimeConnected
                          ? "member-connection-state is-connected"
                          : "member-connection-state is-reconnecting"
                      }
                    >
                      {isRealtimeConnected ? "Live updates on" : "Reconnecting live updates..."}
                    </small>
                    {typingLabel ? <small className="member-typing-indicator">{typingLabel}</small> : null}
                  </div>
                </div>
                <div className="member-chat-topbar-actions">
                  <button
                    aria-label={hasConversationSecret ? "Show encryption details" : "Open encryption setup"}
                    className={isEncryptionPanelOpen ? "member-chat-action-button active" : "member-chat-action-button"}
                    onClick={toggleEncryptionPanel}
                    title={hasConversationSecret ? "Encryption details" : "Encryption setup"}
                    type="button"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                    <span>{hasConversationSecret ? "Encryption details" : "Encryption setup"}</span>
                  </button>
                  {activeConversation.type === "group" ? (
                    <button
                      aria-label={canManageGroupMembers ? "Manage group members" : "Show group members"}
                      className={isGroupMembersExpanded ? "member-chat-action-button active" : "member-chat-action-button"}
                      onClick={toggleGroupMembersPanel}
                      title={canManageGroupMembers ? "Manage members" : "Show members"}
                      type="button"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">group</span>
                      <span>{canManageGroupMembers ? "Manage members" : "Show members"}</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {isEncryptionPanelOpen || (activeConversation.type === "group" && isGroupMembersExpanded) ? (
                <>
                  <button
                    aria-label="Close conversation details"
                    className="member-chat-drawer-backdrop"
                    onClick={closeConversationPanel}
                    type="button"
                  />
                  <aside className="member-chat-drawer">
                    <div className="member-chat-drawer-header">
                    <div>
                      <strong>{isEncryptionPanelOpen ? "Conversation info" : "Group members"}</strong>
                      <p>
                        {isEncryptionPanelOpen
                          ? hasConversationSecret
                            ? "Secure messaging details and recovery tools."
                            : "Set up the shared key for this conversation."
                          : canManageGroupMembers
                            ? "Manage roles, mute members, and review the group."
                            : "See who is in the conversation."}
                      </p>
                    </div>
                    <button aria-label="Close conversation panel" className="member-chat-icon-button" onClick={closeConversationPanel} type="button">
                      <span className="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                  </div>

                    {isEncryptionPanelOpen ? (
                      <div className="member-encryption-panel">
                      <label htmlFor="conversation-secret-input">Conversation encryption key</label>
                      <div className="member-encryption-panel-row">
                        <input
                          id="conversation-secret-input"
                          onChange={(event) => setConversationSecretInput(event.target.value)}
                          placeholder="Enter the shared passphrase"
                          type="password"
                          value={conversationSecretInput}
                        />
                        <button className="button primary compact" onClick={saveConversationSecret} type="button">
                          Save key
                        </button>
                        <button className="button secondary compact" onClick={clearConversationSecret} type="button">
                          Clear
                        </button>
                      </div>
                      <small>
                        Keys are managed automatically per conversation. Manual entry is optional for advanced recovery.
                      </small>
                      {conversationKeyFingerprint ? (
                        <small>Key fingerprint: {conversationKeyFingerprint}</small>
                      ) : null}
                      <div className="member-encryption-panel-row">
                        <button
                          className="button secondary compact"
                          disabled={!conversationSecret || isConversationKeyVerified}
                          onClick={markConversationSecretVerified}
                          type="button"
                        >
                          {isConversationKeyVerified ? "Key verified" : "Mark key verified"}
                        </button>
                      </div>
                      {hasDecryptionFailures ? (
                        <small className="error-text">Some messages could not be decrypted with the current key.</small>
                      ) : null}
                    </div>
                    ) : null}

                    {activeConversation.type === "group" && isGroupMembersExpanded ? (
                      <div className="member-group-summary">
                      {activeConversation.members.map((member) => (
                        <div className="member-group-member" key={member._id}>
                          <div className="member-group-member-copy">
                            <strong>{member.name}</strong>
                            <span>
                              {member.role || "member"}
                              {member.mutedUntil
                                ? ` - muted until ${new Date(member.mutedUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                                : ""}
                            </span>
                          </div>
                          {member._id !== auth.user?.id ? (
                            <div className="member-group-member-actions">
                              {activeConversation.currentUserRole === "admin" ? (
                                <>
                                  <button
                                    className="button secondary compact member-admin-action"
                                    disabled={updateRoleMutation.isPending}
                                    onClick={() =>
                                      updateRoleMutation.mutate({
                                        requestId: activeConversation._id,
                                        userId: member._id,
                                        role: member.role === "moderator" ? "member" : "moderator"
                                      })
                                    }
                                    type="button"
                                  >
                                    {member.role === "moderator" ? "Demote" : "Make mod"}
                                  </button>
                                  <button
                                    className="button secondary compact member-admin-action"
                                    disabled={removeMemberMutation.isPending}
                                    onClick={() =>
                                      removeMemberMutation.mutate({
                                        requestId: activeConversation._id,
                                        userId: member._id
                                      })
                                    }
                                    type="button"
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : null}
                              {activeConversation.currentUserRole === "admin" || activeConversation.currentUserRole === "moderator" ? (
                                member.mutedUntil ? (
                                  <button
                                    className="button secondary compact member-admin-action"
                                    disabled={unmuteMemberMutation.isPending}
                                    onClick={() =>
                                      unmuteMemberMutation.mutate({
                                        requestId: activeConversation._id,
                                        userId: member._id
                                      })
                                    }
                                    type="button"
                                  >
                                    Unmute
                                  </button>
                                ) : (
                                  <button
                                    className="button secondary compact member-admin-action"
                                    disabled={muteMemberMutation.isPending}
                                    onClick={() =>
                                      muteMemberMutation.mutate({
                                        requestId: activeConversation._id,
                                        userId: member._id,
                                        minutes: 60
                                      })
                                    }
                                    type="button"
                                  >
                                    Mute 1h
                                  </button>
                                )
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}

                        <div className="member-chat-drawer-footer">
                          <button
                            className="button secondary compact"
                            disabled={leaveGroupMutation.isPending || activeConversation.members.length <= 1}
                            onClick={handleLeaveGroup}
                            type="button"
                          >
                            {leaveGroupMutation.isPending ? "Leaving..." : "Leave group"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </aside>
                </>
              ) : null}

              <div
                className="member-message-stream"
                onClick={() => {
                  setActiveMessageMenuId(null);
                  setReactionPickerMessageId(null);
                }}
                onScroll={handleMessageStreamScroll}
                ref={messageStreamRef}
              >
                <div className="member-message-list">
                  {visibleMessages.length ? (
                    visibleMessages.map((message, index) => {
                      const isOutgoing = message.sender?._id === auth.user?.id;
                      const isPendingMessage = Boolean(message.isPending);
                      const messageContent = getMessageDisplayContent(message);
                      const replyPreviewContent = getReplyPreviewDisplayContent(message);
                      const deliveryIconName = getDeliveryIconName(message);
                      const canDeleteMessage =
                        !isPendingMessage &&
                        (isOutgoing ||
                          (activeConversation.type === "group" &&
                            ["admin", "moderator"].includes(activeConversation.currentUserRole || "")));
                      const canEditMessage =
                        isOutgoing &&
                        !message.deletedAt &&
                        !isPendingMessage &&
                        (!isEncryptedEnvelope(message.content) ||
                          (hasConversationSecret && messageContent && messageContent !== "Unable to decrypt"));
                      const canReplyToMessage = !message.deletedAt && !isPendingMessage;
                      const canReactToMessage = !message.deletedAt && !isPendingMessage;
                      const canRetryMessage = isOutgoing && isPendingMessage && message.delivery?.status === "failed";
                      const canShowMenu = canEditMessage || canReplyToMessage || canReactToMessage || canDeleteMessage;
                      const isEditingMessage = editingMessageId === message._id;
                      const deliveryLabel = getDeliveryLabel(message);
                      const isHighlightedMessage = String(message._id) === highlightedMessageId;
                      const currentDayKey = getMessageDayKey(message.sentAt);
                      const previousDayKey = index > 0 ? getMessageDayKey(visibleMessages[index - 1]?.sentAt) : "";
                      const shouldShowDaySeparator = index === 0 || currentDayKey !== previousDayKey;
                      return (
                        <div key={message._id}>
                          {shouldShowDaySeparator ? (
                            <div className="member-message-day-separator">
                              <span>{formatMessageDayLabel(message.sentAt)}</span>
                            </div>
                          ) : null}
                          <div
                            className={
                              isOutgoing
                                ? isHighlightedMessage
                                  ? "member-message-row outgoing highlighted"
                                  : "member-message-row outgoing"
                                : isHighlightedMessage
                                  ? "member-message-row incoming highlighted"
                                  : "member-message-row incoming"
                            }
                            ref={(node) => registerMessageNode(message._id, node)}
                          >
                          <div className={isOutgoing ? "member-message-bubble outgoing" : "member-message-bubble incoming"}>
                            {!isOutgoing && activeConversation.type === "group" ? (
                              <strong className="member-message-sender">{message.sender?.name || "Member"}</strong>
                            ) : null}
                            {isEditingMessage ? (
                              <div className="member-message-edit">
                                <input onChange={(event) => setEditingMessageDraft(event.target.value)} value={editingMessageDraft} />
                                <div className="member-inline-actions">
                                  <button className="button secondary compact member-message-action" onClick={cancelMessageEdit} type="button">
                                    Cancel
                                  </button>
                                  <button
                                    className="button primary compact member-message-action"
                                    disabled={editMessageMutation.isPending || !editingMessageDraft.trim()}
                                    onClick={saveMessageEdit}
                                    type="button"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {message.replyTo ? (
                                  <button
                                    className="member-reply-preview"
                                    onClick={() => jumpToMessage(message.replyTo.messageId)}
                                    type="button"
                                  >
                                    <small>{message.replyTo.senderName}</small>
                                    <p>{replyPreviewContent}</p>
                                  </button>
                                ) : null}
                                {messageContent?.trim() ? <p>{messageContent}</p> : null}
                                {message.attachments?.length ? (
                                  <div className="member-message-attachments">
                                    {message.attachments.map((attachment) => {
                                      const previewKey = buildAttachmentPreviewKey(message._id, attachment.url);
                                      const decryptedAttachmentUrl = decryptedAttachmentUrlByKey[previewKey] || "";
                                      const originalMimeType = String(attachment.originalMimeType || "");
                                      const canRenderDecryptedImage = attachment.isEncrypted && originalMimeType.startsWith("image/") && !!decryptedAttachmentUrl;
                                      const canRenderPlainImage = attachment.isImage && !attachment.isEncrypted;

                                      return (
                                        <article className="member-message-attachment" key={`${message._id}-${attachment.url}`}>
                                          {canRenderPlainImage || canRenderDecryptedImage ? (
                                            <img
                                              alt={attachment.originalName || attachment.name}
                                              loading="lazy"
                                              src={
                                                canRenderDecryptedImage
                                                  ? decryptedAttachmentUrl
                                                  : resolveApiAssetUrl(attachment.url)
                                              }
                                            />
                                          ) : (
                                            <span className="material-symbols-outlined" aria-hidden="true">attach_file</span>
                                          )}
                                          {attachment.isEncrypted ? (
                                            <div>
                                              <strong>{attachment.originalName || attachment.name}</strong>
                                              <small>Encrypted attachment</small>
                                              {!decryptedAttachmentUrl ? (
                                                <button
                                                  className="button secondary compact member-message-action"
                                                  onClick={() => {
                                                    void decryptAttachmentForPreview(message._id, attachment);
                                                  }}
                                                  type="button"
                                                >
                                                  Decrypt
                                                </button>
                                              ) : (
                                                <a
                                                  download={attachment.originalName || attachment.name}
                                                  href={decryptedAttachmentUrl}
                                                  rel="noreferrer"
                                                  target="_blank"
                                                >
                                                  Open decrypted file
                                                </a>
                                              )}
                                            </div>
                                          ) : (
                                            <a href={resolveApiAssetUrl(attachment.url)} rel="noreferrer" target="_blank">
                                              {attachment.name}
                                            </a>
                                          )}
                                        </article>
                                      );
                                    })}
                                  </div>
                                ) : null}
                                <div className="member-message-meta">
                                  <span>
                                    {formatTime(message.sentAt)}
                                    {message.editedAt ? " (edited)" : ""}
                                  </span>
                                  {isOutgoing && deliveryLabel ? (
                                    <span
                                      className={`member-message-delivery ${
                                        message.delivery?.status === "read"
                                          ? "is-read"
                                          : message.delivery?.status === "failed"
                                            ? "is-failed"
                                            : ""
                                      }`.trim()}
                                      title={
                                        message.delivery?.status === "read"
                                          ? `${message.delivery?.readCount || 0} read`
                                          : message.delivery?.status === "delivered"
                                            ? `${message.delivery?.deliveredCount || 0} delivered`
                                            : deliveryLabel
                                      }
                                    >
                                      {deliveryIconName ? (
                                        <span className="material-symbols-outlined" aria-hidden="true">
                                          {deliveryIconName}
                                        </span>
                                      ) : null}
                                      <span>{deliveryLabel}</span>
                                    </span>
                                  ) : null}
                                </div>
                                {message.deletedAt ? <small>Deleted</small> : null}
                              </>
                            )}
                            {!isEditingMessage ? (
                              <div className="member-message-actions">
                                {canRetryMessage ? (
                                  <button
                                    className="button secondary compact member-message-action"
                                    onClick={() => retryPendingMessage(activeConversation._id, message._id)}
                                    type="button"
                                  >
                                    Retry
                                  </button>
                                ) : null}
                                {canShowMenu ? (
                                  <button
                                    className="button secondary compact member-message-action icon-only"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setReactionPickerMessageId(null);
                                      setActiveMessageMenuId((current) => (current === message._id ? null : message._id));
                                    }}
                                    type="button"
                                  >
                                    <span className="material-symbols-outlined" aria-hidden="true">more_horiz</span>
                                  </button>
                                ) : null}
                                {activeMessageMenuId === message._id ? (
                                  <div className="member-message-action-popover" onClick={(event) => event.stopPropagation()}>
                                    {canEditMessage ? (
                                      <button
                                        onClick={() => {
                                          startMessageEdit(message);
                                          setActiveMessageMenuId(null);
                                        }}
                                        type="button"
                                      >
                                        Edit
                                      </button>
                                    ) : null}
                                    {canReplyToMessage ? (
                                      <button
                                        onClick={() => {
                                          startReplyToMessage(message);
                                          setActiveMessageMenuId(null);
                                        }}
                                        type="button"
                                      >
                                        Reply
                                      </button>
                                    ) : null}
                                    {canReactToMessage ? (
                                      <button
                                        disabled={reactionMutation.isPending}
                                        onClick={() => {
                                          setReactionPickerMessageId((current) => (current === message._id ? null : message._id));
                                          setActiveMessageMenuId(null);
                                        }}
                                        type="button"
                                      >
                                        React
                                      </button>
                                    ) : null}
                                    {canDeleteMessage ? (
                                      <button
                                        disabled={deleteMessageMutation.isPending}
                                        onClick={() => {
                                          deleteMessageMutation.mutate({
                                            id: activeConversation._id,
                                            messageId: message._id
                                          });
                                          setActiveMessageMenuId(null);
                                        }}
                                        type="button"
                                      >
                                        Delete
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                            {reactionPickerMessageId === message._id ? (
                              <div className="member-reaction-picker" role="group" aria-label="Choose reaction">
                                {messageReactionChoices.map((emoji) => (
                                  <button
                                    key={`${message._id}-${emoji}`}
                                    onClick={() => handleReactionToggle(message._id, emoji)}
                                    type="button"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                            {message.reactions?.length ? (
                              <div className="member-message-reactions">
                                {message.reactions.map((reaction) => (
                                  <button
                                    className={reaction.reactedByCurrentUser ? "member-reaction-chip active" : "member-reaction-chip"}
                                    key={`${message._id}-${reaction.emoji}`}
                                    onClick={() => handleReactionToggle(message._id, reaction.emoji)}
                                    type="button"
                                  >
                                    <span>{reaction.emoji}</span>
                                    <small>{reaction.count}</small>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      );
                    })
                  ) : (
                    <SectionCard title="No messages yet" subtitle="The conversation is ready when you are.">
                      <p className="muted">Send the first message to start the thread.</p>
                    </SectionCard>
                  )}
                </div>
              </div>

              <input
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="member-file-input"
                multiple
                onChange={(event) => void handleAttachmentSelection(event)}
                ref={attachmentInputRef}
                type="file"
              />

              <p className="member-toolbar-hint">Use templates for quick responses, then personalize before sending.</p>
              {isCurrentUserMuted ? (
                <p className="member-toolbar-hint">You are muted until {activeConversationMuteUntil?.toLocaleString()}.</p>
              ) : null}
              {!hasConversationSecret ? (
                <p className="member-toolbar-hint">Set an encryption key to read and send messages in this conversation.</p>
              ) : !isConversationKeyVerified ? (
                <p className="member-toolbar-hint">Verify the key fingerprint before sending messages.</p>
              ) : null}
              {attachmentUploadError ? <p className="error-text">{attachmentUploadError}</p> : null}

              {replyToMessage ? (
                <div className="member-compose-reply">
                  <div>
                    <small>Replying to {replyToMessage.senderName}</small>
                    <p>{replyToMessage.content}</p>
                  </div>
                  <button className="button secondary compact member-message-action" onClick={clearReplyToMessage} type="button">
                    Cancel
                  </button>
                </div>
              ) : null}

              {composerAttachments.length ? (
                <div className="member-compose-attachments">
                  {composerAttachments.map((attachment) => (
                    <article className="member-compose-attachment" key={attachment.id}>
                      {attachment.isImage ? (
                        <img alt={attachment.name} src={resolveApiAssetUrl(attachment.url)} />
                      ) : (
                        <span className="material-symbols-outlined">attach_file</span>
                      )}
                      <div>
                        <strong>{attachment.originalName || attachment.name}</strong>
                        {attachment.isEncrypted ? <small>Encrypted</small> : null}
                        <small>{formatFileSize(attachment.size)}</small>
                      </div>
                      <button
                        className="button secondary compact member-message-action"
                        onClick={() => removeComposerAttachment(attachment.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}

              <div className="member-message-composer">
                <div className="member-message-composer-tool">
                  <button
                    aria-label="Insert emoji"
                    className="member-chat-icon-button"
                    disabled={!canSendMessage}
                    onClick={() => {
                      setIsEmojiPickerOpen((current) => !current);
                      setIsQuickMenuOpen(false);
                    }}
                    title="Insert emoji"
                    type="button"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">mood</span>
                  </button>
                  {isEmojiPickerOpen ? (
                    <div className="member-toolbar-popover compact">
                      {reactionChoices.map((reaction) => (
                        <button key={reaction} onClick={() => handleReactionInsert(reaction)} type="button">
                          {reaction}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="member-message-composer-tool">
                  <button
                    aria-label="Insert quick template"
                    className="member-chat-icon-button"
                    disabled={!canSendMessage}
                    onClick={() => {
                      setIsQuickMenuOpen((current) => !current);
                      setIsEmojiPickerOpen(false);
                    }}
                    title="Insert template"
                    type="button"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
                  </button>
                  {isQuickMenuOpen ? (
                    <div className="member-toolbar-popover">
                      {quickInsertActions.map((action) => (
                        <button key={action.id} onClick={() => handleQuickInsert(action)} type="button">
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  aria-label="Attach image or file"
                  className="member-chat-icon-button"
                  disabled={!canSendMessage || isUploadingAttachments}
                  onClick={() => attachmentInputRef.current?.click()}
                  title="Attach image or file"
                  type="button"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">attach_file</span>
                </button>
                <textarea
                  aria-label="Message composer"
                  onChange={(event) => setDraftMessage(event.target.value)}
                  onBlur={() => sendTypingSignal(false)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder={
                    isE2eeInitializing
                      ? "Preparing secure chat..."
                      : isCurrentUserMuted
                        ? `Muted until ${activeConversationMuteUntil?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                      : !hasConversationSecret
                        ? "Secure channel is initializing..."
                        : activeConversation.type === "group"
                          ? "Message the group"
                          : activeConversation.status === "declined"
                            ? "This request was declined"
                            : activeConversation.status === "pending"
                              ? "Wait for the recipient to accept this request"
                              : "Type a message"
                  }
                  disabled={isE2eeInitializing || !hasConversationSecret || isCurrentUserMuted}
                  rows={1}
                  value={draftMessage}
                />
                <button
                  aria-label="Send message"
                  className="member-send-button"
                  disabled={
                    !canSendMessage ||
                    isE2eeInitializing ||
                    isUploadingAttachments ||
                    (!draftMessage.trim() && !composerAttachments.length) ||
                    activeConversation.status === "declined" ||
                    (activeConversation.type !== "group" && activeConversation.status === "pending")
                  }
                  onClick={() => void handleSendMessage()}
                  type="button"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {isUploadingAttachments ? "progress_activity" : "send"}
                  </span>
                </button>
              </div>

              {activeConversation.type === "direct" && activeConversation.incoming && activeConversation.status === "pending" ? (
                <div className="member-inline-actions">
                  <button
                    className="button primary"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: activeConversation._id, status: "accepted" })}
                    type="button"
                  >
                    Accept chat
                  </button>
                  <button
                    className="button secondary"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: activeConversation._id, status: "declined" })}
                    type="button"
                  >
                    Decline chat
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <SectionCard title="No conversation selected" subtitle="Pick a thread from the left to continue.">
              <p className="muted">Start with a mentorship request or create a group for an event, batch, or topic.</p>
            </SectionCard>
          )}

          {updateMutation.isError ? <p className="error-text">{updateMutation.error.message}</p> : null}
          {sendMessageMutation.isError ? <p className="error-text">{sendMessageMutation.error.message}</p> : null}
          {leaveGroupMutation.isError ? <p className="error-text">{leaveGroupMutation.error.message}</p> : null}
          {editMessageMutation.isError ? <p className="error-text">{editMessageMutation.error.message}</p> : null}
          {deleteMessageMutation.isError ? <p className="error-text">{deleteMessageMutation.error.message}</p> : null}
          {updateRoleMutation.isError ? <p className="error-text">{updateRoleMutation.error.message}</p> : null}
          {muteMemberMutation.isError ? <p className="error-text">{muteMemberMutation.error.message}</p> : null}
          {unmuteMemberMutation.isError ? <p className="error-text">{unmuteMemberMutation.error.message}</p> : null}
          {removeMemberMutation.isError ? <p className="error-text">{removeMemberMutation.error.message}</p> : null}
        </section>
      </div>
    </div>
  );
}

export default MentorshipPage;
