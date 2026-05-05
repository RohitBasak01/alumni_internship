import { useMemo, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageBubble } from "./MessageBubble.jsx";
import { MentorshipComposer } from "./MentorshipComposer.jsx";
import { GroupDetailsDrawer } from "./MentorshipModals.jsx";
import {
  setAlumniConversationTyping,
  uploadMentorshipAttachment,
  resolveApiAssetUrl,
} from "../../lib/api.js";
import { groupConsecutiveMessages } from "../../utils/chatUtils.js";
import {
  isEncryptedEnvelope,
  decryptMessageContent,
  ensureE2eeDeviceKeyPair,
  decryptConversationSecretEnvelope,
} from "../../lib/e2ee.js";


function formatMutedStatus(activeConversation, currentUserId) {
  const mutedEntry = (activeConversation?.mutedMembers || []).find(
    (entry) => entry?.userId?._id === currentUserId,
  );
  if (!mutedEntry) return null;
  return `Muted until ${new Date(mutedEntry.mutedUntil).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function MentorshipChat({
  activeConversation,
  auth,
  isMobileViewport,
  setIsMobileThreadListOpen,
  isRealtimeConnected,
  isContactPanelVisible,
  setIsContactPanelVisible,
  pendingActiveMessages,
  transmitPendingMessage,
  removePendingMessage,
  updatePendingMessage,
  reactionChoices,
  handleReactionToggle,
  editMessageMutation,
  deleteMessageMutation,
  clearMessagesMutation,
  markReadMutation,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isMessagesLoading,
  updateGroupMemberRoleMutation,
  muteGroupMemberMutation,
  unmuteGroupMemberMutation,
  removeGroupMemberMutation,
  leaveGroupMutation,
  deleteConversationMutation,
  rtc,
}) {
  const [draftMessage, setDraftMessage] = useState("");
  const [composerAttachments, setComposerAttachments] = useState([]);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [isGroupMembersExpanded, setIsGroupMembersExpanded] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState("");
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [messageSearch, setMessageSearch] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxAttachment, setLightboxAttachment] = useState(null);
  const [attachmentUrlByKey, setAttachmentUrlByKey] = useState({});
  const [decryptedContents, setDecryptedContents] = useState({});
  const [conversationSecret, setConversationSecret] = useState(null);
  const [isDecryptionRunning, setIsDecryptionRunning] = useState(false);


  const queryClient = useQueryClient();
  const messageStreamRef = useRef(null);
  const messageNodeRefs = useRef(new Map());
  const attachmentInputRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const typingStopTimerRef = useRef(null);
  const lastReadSyncRef = useRef(new Map());
  const lastTypingStateRef = useRef(false);
  const typingMutationRef = useRef(null);

  const typingUsers = useMemo(() => {
    const typingMembers = activeConversation?.typingMembers || [];
    const currentUserId = String(auth.user?.id || "");
    const now = Date.now();
    return typingMembers
      .map((entry) => ({
        userId: String(entry?.userId?._id || entry?.userId || ""),
        name: entry?.userId?.name || "Someone",
        startedAt: entry?.startedAt ? new Date(entry.startedAt).getTime() : 0,
      }))
      .filter(
        (entry) =>
          entry.userId &&
          entry.userId !== currentUserId &&
          now - entry.startedAt < 15000,
      );
  }, [activeConversation?.typingMembers, auth.user?.id]);

  const visibleMessages = useMemo(() => {
    const base = activeConversation?.messages || [];
    return [...base, ...pendingActiveMessages].sort(
      (a, b) =>
        new Date(a.sentAt || 0).getTime() - new Date(b.sentAt || 0).getTime(),
    );
  }, [activeConversation?.messages, pendingActiveMessages]);

  const normalizedSearch = messageSearch.trim().toLowerCase();
  const currentUserId = String(auth.user?.id || "");
  const unreadIncomingMessageIds = useMemo(
    () =>
      visibleMessages
        .filter((message) => {
          if (message.isPending) return false;
          const senderId = String(
            message.sender?._id ||
              message.senderId?._id ||
              message.senderId ||
              "",
          );
          if (!senderId || senderId === currentUserId) return false;
          return !Array.isArray(message.readBy)
            ? true
            : !message.readBy.some(
                (entry) => String(entry?._id || entry) === currentUserId,
              );
        })
        .map((message) => String(message._id))
        .join("|"),
    [currentUserId, visibleMessages],
  );

  const filteredMessages = useMemo(() => {
    if (!normalizedSearch) return visibleMessages;
    return visibleMessages.filter((message) => {
      const content = String(message.content || "").toLowerCase();
      const senderName = String(message.sender?.name || "").toLowerCase();
      const replyContent = String(message.replyTo?.content || "").toLowerCase();
      return (
        content.includes(normalizedSearch) ||
        senderName.includes(normalizedSearch) ||
        replyContent.includes(normalizedSearch)
      );
    });
  }, [normalizedSearch, visibleMessages]);

  const groupedMessages = useMemo(() => groupConsecutiveMessages(filteredMessages), [filteredMessages]);

  const firstUnreadMessageId = useMemo(() => {
    for (const message of filteredMessages) {
      const senderId = String(message.sender?._id || message.senderId?._id || message.senderId || "");
      if (!senderId || senderId === currentUserId) continue;
      const hasRead = Array.isArray(message.readBy)
        ? message.readBy.some((entry) => String(entry?._id || entry) === currentUserId)
        : false;
      if (!hasRead) return String(message._id);
    }
    return null;
  }, [currentUserId, filteredMessages]);

  const quickInsertActions = useMemo(() => [
    { id: "intro", icon: "waving_hand", label: "Warm intro", content: "Hello! Great to connect with a fellow alum. " },
    { id: "coffee", icon: "coffee", label: "Coffee chat", content: "Would you be open to a quick 15 minute coffee chat this week? " },
    { id: "followup", icon: "mail", label: "Follow up", content: "Following up on my last note in case it got buried. " },
  ], []);

  const mutedStatus = formatMutedStatus(activeConversation, currentUserId);
  const canManageGroup =
    activeConversation?.type === "group" &&
    activeConversation?.currentUserRole === "admin";

  // Resolve attachment URLs (plain, no decryption)
  useEffect(() => {
    const patch = {};
    for (const message of visibleMessages) {
      for (const attachment of message.attachments || []) {
        const key = `${message._id}:${attachment.url}`;
        if (!attachmentUrlByKey[key]) {
          patch[key] = resolveApiAssetUrl(attachment.url);
        }
      }
    }
    if (Object.keys(patch).length > 0) {
      setAttachmentUrlByKey((prev) => ({ ...prev, ...patch }));
    }
  }, [visibleMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const stream = messageStreamRef.current;
    if (!stream) return;
    if (shouldAutoScrollRef.current) stream.scrollTop = stream.scrollHeight;
  }, [filteredMessages.length]);

  const typingMutation = useMutation({
    mutationFn: ({ id, isTyping }) => setAlumniConversationTyping(id, { isTyping }),
  });

  useEffect(() => { typingMutationRef.current = typingMutation; }, [typingMutation]);

  const sendTypingSignal = (isTyping) => {
    if (!activeConversation?._id) return;
    typingMutationRef.current?.mutate({ id: activeConversation._id, isTyping });
  };

  useEffect(() => {
    if (!activeConversation?._id) return undefined;
    const isTyping = Boolean(draftMessage.trim());
    if (lastTypingStateRef.current !== isTyping) {
      sendTypingSignal(isTyping);
      lastTypingStateRef.current = isTyping;
    }
    if (!isTyping) {
      if (typingStopTimerRef.current) { clearTimeout(typingStopTimerRef.current); typingStopTimerRef.current = null; }
      return undefined;
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      if (lastTypingStateRef.current) { sendTypingSignal(false); lastTypingStateRef.current = false; }
    }, 1800);
    return () => { if (typingStopTimerRef.current) { clearTimeout(typingStopTimerRef.current); typingStopTimerRef.current = null; } };
  }, [activeConversation?._id, draftMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeConversation?._id) return;
    if (!unreadIncomingMessageIds) return;
    if (lastReadSyncRef.current.get(activeConversation._id) === unreadIncomingMessageIds) return;
    lastReadSyncRef.current.set(activeConversation._id, unreadIncomingMessageIds);
    markReadMutation.mutate(activeConversation._id);
  }, [activeConversation?._id, markReadMutation, unreadIncomingMessageIds]);

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      if (activeConversation?._id && lastTypingStateRef.current) {
        sendTypingSignal(false);
        lastTypingStateRef.current = false;
      }
    };
  }, [activeConversation?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDraftMessage("");
    setComposerAttachments([]);
    setReplyToMessage(null);
    setEditingMessage(null);
    setAttachmentUploadError("");
    setIsEmojiPickerOpen(false);
    setIsQuickMenuOpen(false);
    setAttachmentUrlByKey({});
    setDecryptedContents({});
    setConversationSecret(null);
  }, [activeConversation?._id]);

  // Handle conversation secret resolution (for passive decryption)
  useEffect(() => {
    async function resolveSecret() {
      if (!activeConversation?._id || !activeConversation?.e2ee?.envelopes?.length) {
        setConversationSecret(null);
        return;
      }

      try {
        const keyPair = await ensureE2eeDeviceKeyPair();
        if (!keyPair) return;

        const currentUserId = String(auth.user?.id || auth.user?._id || "");
        const myEnvelope = activeConversation.e2ee.envelopes.find(
          (e) => String(e.userId?._id || e.userId || "") === currentUserId
        );

        if (myEnvelope) {
          const secret = await decryptConversationSecretEnvelope(myEnvelope, keyPair.privateKey);
          setConversationSecret(secret);
        }
      } catch (err) {
        console.error("[Decryption] Failed to resolve conversation secret:", err);
      }
    }
    resolveSecret();
  }, [activeConversation?._id, activeConversation?.e2ee, auth.user?.id]);

  // Passive decryption effect: decrypt any messages starting with enc:v1:
  useEffect(() => {
    async function runDecryption() {
      if (!conversationSecret || isDecryptionRunning) return;

      const encryptedMessages = visibleMessages.filter(
        (m) => {
          const mainEncrypted = m.content && isEncryptedEnvelope(m.content) && !decryptedContents[m._id];
          const replyEncrypted = m.replyTo?.content && isEncryptedEnvelope(m.replyTo.content) && !decryptedContents[`reply-${m._id}`];
          return mainEncrypted || replyEncrypted;
        }
      );

      if (!encryptedMessages.length) return;

      setIsDecryptionRunning(true);
      const patch = {};

      for (const message of encryptedMessages) {
        // Decrypt main content
        if (message.content && isEncryptedEnvelope(message.content) && !decryptedContents[message._id]) {
          try {
            const decrypted = await decryptMessageContent(
              message.content,
              conversationSecret,
              activeConversation._id
            );
            patch[message._id] = decrypted;
          } catch (err) {
            console.warn(`[Decryption] Failed for message ${message._id}:`, err);
            patch[message._id] = "[Unable to decrypt message]";
          }
        }

        // Decrypt reply content
        if (message.replyTo?.content && isEncryptedEnvelope(message.replyTo.content) && !decryptedContents[`reply-${message._id}`]) {
          try {
            const decryptedReply = await decryptMessageContent(
              message.replyTo.content,
              conversationSecret,
              activeConversation._id
            );
            patch[`reply-${message._id}`] = decryptedReply;
          } catch (err) {
            console.warn(`[Decryption] Failed for reply in ${message._id}:`, err);
            patch[`reply-${message._id}`] = "[Unable to decrypt reply]";
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        setDecryptedContents((curr) => ({ ...curr, ...patch }));
      }
      setIsDecryptionRunning(false);
    }

    runDecryption();
  }, [visibleMessages, conversationSecret, decryptedContents, activeConversation?._id, isDecryptionRunning]);


  const handleClearChat = async () => {
    if (!activeConversation?._id) return;
    const confirmed = window.confirm(
      "Delete all past messages in this chat? This cannot be undone.",
    );
    if (!confirmed) return;

    await clearMessagesMutation.mutateAsync(activeConversation._id);
    setActiveMessageMenuId(null);
    setReactionPickerMessageId(null);
  };

  const handleDeleteGroup = async () => {
    if (!activeConversation?._id) return;
    const confirmed = window.confirm(
      "Are you sure you want to PERMANENTLY delete this group and all its messages? This action cannot be undone.",
    );
    if (!confirmed) return;

    try {
      await deleteConversationMutation.mutateAsync(activeConversation._id);
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  };

  const uploadFiles = async (files, resetTarget) => {
    if (!files.length) return;
    setAttachmentUploadError("");
    setIsUploadingAttachments(true);
    try {
      for (const file of files) {
        const attachmentId = `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 6)}`;
        const previewUrl = String(file.type || "").startsWith("image/") ? URL.createObjectURL(file) : "";
        setComposerAttachments((curr) => [
          ...curr,
          { id: attachmentId, name: file.name, url: "", mimeType: file.type, size: file.size,
            isImage: String(file.type).startsWith("image/"), previewUrl, progress: 0, isUploading: true },
        ]);
        const uploaded = await uploadMentorshipAttachment(file, {
          onUploadProgress: (progress) => {
            setComposerAttachments((curr) =>
              curr.map((a) => a.id === attachmentId ? { ...a, progress } : a)
            );
          },
        });
        setComposerAttachments((curr) => [
          ...curr.filter((a) => a.id !== attachmentId),
          { id: attachmentId, name: file.name, url: uploaded.url,
            mimeType: uploaded.mimeType || file.type, size: uploaded.size || file.size,
            isImage: String(uploaded.mimeType || file.type).startsWith("image/"),
            previewUrl, progress: 100, isUploading: false },
        ]);
      }
    } catch (error) {
      setAttachmentUploadError(error?.message || "Upload failed.");
    } finally {
      setIsUploadingAttachments(false);
      if (resetTarget) resetTarget.value = "";
    }
  };

  const uploadAttachments = async (event) => {
    const files = Array.from(event.target.files || []);
    await uploadFiles(files, event.target);
  };

  const handleSendMessage = async () => {
    const content = draftMessage.trim();
    if (!activeConversation || (!content && !composerAttachments.length) || isUploadingAttachments) return;

    if (editingMessage) {
      await editMessageMutation.mutateAsync({
        requestId: activeConversation._id,
        messageId: editingMessage._id,
        content,
      });
      setDraftMessage("");
      setEditingMessage(null);
      setReplyToMessage(null);
      setComposerAttachments([]);
      return;
    }

    const clientId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const optimistic = {
      _id: `temp-${clientId}`,
      clientId,
      content,
      encryptedContent: content, // plain text — no encryption
      sentAt: new Date().toISOString(),
      attachments: [...composerAttachments],
      replyTo: replyToMessage,
      sender: { _id: auth.user?.id, name: auth.user?.name || "You" },
      delivery: { status: "sending" },
      isPending: true,
    };

    setDraftMessage("");
    setComposerAttachments([]);
    setReplyToMessage(null);
    transmitPendingMessage(activeConversation._id, optimistic);
  };

  const handleRetrySend = async (message) => {
    updatePendingMessage(
      activeConversation._id,
      (entry) => entry._id === message._id,
      (entry) => ({ ...entry, delivery: { status: "sending" } }),
    );
    await transmitPendingMessage(activeConversation._id, {
      ...message, isPending: true, delivery: { status: "sending" },
    });
  };

  const startMessageEdit = (message) => {
    setEditingMessage(message);
    setReplyToMessage(null);
    setComposerAttachments([]);
    setDraftMessage(message.content || "");
    setActiveMessageMenuId(null);
  };

  const cancelEditingMessage = () => { setEditingMessage(null); setDraftMessage(""); };

  const jumpToMessage = (id) => {
    const node = messageNodeRefs.current.get(String(id));
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(String(id));
      setTimeout(() => setHighlightedMessageId(null), 1800);
    }
  };

  if (!activeConversation) return null;

  return (
    <main className="member-messages-panel alumni-chat-panel">
      <div className="member-messages-panel-header polished">
        <div className="member-chat-header-main">
          <button
            className="member-messages-back-button"
            onClick={() => setIsMobileThreadListOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>

          <div className="member-chat-header-avatar">
            {activeConversation.type === "group" ? (
              <span className="material-symbols-outlined">groups</span>
            ) : (
              (activeConversation.name || "??")
                .split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
            )}
            {activeConversation.online ? <span className="member-chat-header-online" /> : null}
          </div>

          <div className="member-messages-panel-info">
            <h2>
              {activeConversation.type === "group"
                ? (activeConversation.name || "Unnamed Group")
                : (activeConversation.name || "Alumni Contact")}
            </h2>
            <p>
              {typingUsers.length
                ? typingUsers.length === 1
                  ? `${typingUsers[0].name} is typing...`
                  : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`
                : activeConversation.type === "group"
                  ? `${activeConversation.members?.length || 0} members${canManageGroup ? " • You can manage this group" : ""}`
                  : isRealtimeConnected ? "Connected now" : "Reconnecting..."}
            </p>
          </div>
        </div>

        <div className="member-chat-topbar-actions">
          {activeConversation.type !== "group" && (
            <>
              <button
                className="member-chat-action-button"
                type="button"
                onClick={() => rtc.startCall("audio")}
                disabled={!isRealtimeConnected}
                title={!isRealtimeConnected ? "Connecting to call service..." : "Audio call"}
              >
                <span className="material-symbols-outlined">call</span>
              </button>
              <button
                className="member-chat-action-button"
                type="button"
                onClick={() => rtc.startCall("video")}
                disabled={!isRealtimeConnected}
                title={!isRealtimeConnected ? "Connecting to call service..." : "Video call"}
              >
                <span className="material-symbols-outlined">videocam</span>
              </button>
            </>
          )}
          <label className="member-chat-search">
            <span className="material-symbols-outlined">search</span>
            <input
              onChange={(event) => setMessageSearch(event.target.value)}
              placeholder="Search inside chat"
              value={messageSearch}
            />
          </label>
          {activeConversation.type === "group" ? (
            <button
              className="member-chat-action-button"
              onClick={() => setIsGroupMembersExpanded(!isGroupMembersExpanded)}
              type="button"
            >
              <span className="material-symbols-outlined">group</span>
            </button>
          ) : null}
          {!isContactPanelVisible ? (
            <button
              className="member-chat-action-button"
              onClick={() => setIsContactPanelVisible(true)}
              type="button"
              title="Show contact info"
            >
              <span className="material-symbols-outlined">info</span>
            </button>
          ) : null}
          <button
            className="member-chat-action-button danger"
            disabled={!visibleMessages.length || clearMessagesMutation.isPending}
            onClick={handleClearChat}
            title="Clear chat history"
            type="button"
          >
            <span className="material-symbols-outlined">delete_sweep</span>
          </button>
          {activeConversation.type === "group" && canManageGroup && (
            <button
              className="member-chat-action-button danger"
              disabled={deleteConversationMutation.isPending}
              onClick={handleDeleteGroup}
              title="Delete group permanently"
              type="button"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          )}
        </div>
      </div>

      <div className="member-chat-banner-row">
        <div className="member-message-day-separator inline">
          <span>Today</span>
        </div>
        <div className="member-chat-status-pill">
          <span className="material-symbols-outlined">
            {isRealtimeConnected ? "wifi" : "wifi_off"}
          </span>
          {isRealtimeConnected ? "Live sync" : "Realtime reconnecting"}
        </div>
        {mutedStatus ? (
          <div className="member-chat-status-pill muted">{mutedStatus}</div>
        ) : null}
        {normalizedSearch ? (
          <div className="member-chat-status-pill accent">
            {filteredMessages.length} search{" "}
            {filteredMessages.length === 1 ? "result" : "results"}
          </div>
        ) : null}
      </div>

      <div
        className="member-messages-stream"
        ref={messageStreamRef}
        onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setIsDragOver(false); }}
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragOver(false);
          await uploadFiles(Array.from(e.dataTransfer.files || []));
        }}
        onScroll={(e) => {
          const stream = e.currentTarget;
          const isAtBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 80;
          shouldAutoScrollRef.current = isAtBottom;
          const btn = document.getElementById("chat-scroll-bottom");
          if (btn) {
            if (!isAtBottom && stream.scrollHeight > stream.clientHeight * 1.5) btn.classList.add("visible");
            else btn.classList.remove("visible");
          }
          if (stream.scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
            const previousHeight = stream.scrollHeight;
            fetchNextPage().then(() => setTimeout(() => { stream.scrollTop = stream.scrollHeight - previousHeight; }, 0));
          }
        }}
      >
        {isDragOver ? (
          <div className="member-drag-overlay">
            <span className="material-symbols-outlined">file_upload</span>
            <strong>Drop files to share with this chat</strong>
            <p>Images, PDFs, and documents will be added to the composer.</p>
          </div>
        ) : null}
        {hasNextPage ? (
          <div className="chat-pagination-sentinel">
            <button className="button ghost compact" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} type="button">
              {isFetchingNextPage ? "Loading..." : "Load earlier messages"}
            </button>
          </div>
        ) : null}

        {isMessagesLoading && !filteredMessages.length ? (
          <div className="chat-loading-placeholder"><p>Loading conversation...</p></div>
        ) : null}

        {!isMessagesLoading && !filteredMessages.length ? (
          <div className="member-empty-thread-state">
            <span className="material-symbols-outlined">
              {normalizedSearch ? "manage_search" : "chat_bubble"}
            </span>
            <strong>{normalizedSearch ? "No matching messages" : "No messages yet"}</strong>
            <p>{normalizedSearch ? "Try a different keyword or clear the in-chat search." : "Say hello and get the conversation moving."}</p>
          </div>
        ) : null}

        {groupedMessages.map((message) => (
          <div className="member-message-stack" key={message._id}>
            {message.dateLabel && (
              <div className="member-date-separator"><span>{message.dateLabel}</span></div>
            )}
            {firstUnreadMessageId === String(message._id) ? (
              <div className="member-unread-divider"><span>Unread messages</span></div>
            ) : null}
            <MessageBubble
              isGroupStart={message.isGroupStart}
              isGroupEnd={message.isGroupEnd}
              message={message}
              auth={auth}
              activeConversation={activeConversation}
              decryptedContent={decryptedContents[message._id] || message.content || ""}
              isDecrypted={!!decryptedContents[message._id]}
              replyPreviewContent={decryptedContents[`reply-${message._id}`] || message.replyTo?.content || ""}
              decryptedAttachmentUrlByKey={attachmentUrlByKey}
              formatTime={(value) =>
                new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
              }
              getInitials={(name) =>
                name?.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "??"
              }
              buildAttachmentPreviewKey={(messageId, url) => `${messageId}:${url}`}
              startReplyToMessage={(msg) =>
                setReplyToMessage({ messageId: msg._id, senderName: msg.sender?.name, content: msg.content || "" })
              }
              startMessageEdit={startMessageEdit}
              deleteMessageMutation={deleteMessageMutation}
              reactionChoices={reactionChoices}
              handleReactionToggle={(messageId, emoji) =>
                handleReactionToggle(activeConversation._id, messageId, emoji)
              }
              jumpToMessage={jumpToMessage}
              activeMessageMenuId={activeMessageMenuId}
              setActiveMessageMenuId={setActiveMessageMenuId}
              reactionPickerMessageId={reactionPickerMessageId}
              setReactionPickerMessageId={setReactionPickerMessageId}
              highlightedMessageId={highlightedMessageId}
              registerMessageNode={(id, node) => {
                if (node) messageNodeRefs.current.set(String(id), node);
                else messageNodeRefs.current.delete(String(id));
              }}
              onRetrySend={handleRetrySend}
              onOpenImage={setLightboxAttachment}
            />
          </div>
        ))}

        <button
          id="chat-scroll-bottom"
          className="member-scroll-to-bottom"
          onClick={() => {
            if (messageStreamRef.current) {
              messageStreamRef.current.scrollTo({ top: messageStreamRef.current.scrollHeight, behavior: "smooth" });
            }
          }}
          type="button"
          aria-label="Scroll to bottom"
        >
          <span className="material-symbols-outlined">arrow_downward</span>
        </button>
      </div>

      <MentorshipComposer
        draftMessage={draftMessage}
        setDraftMessage={setDraftMessage}
        composerAttachments={composerAttachments}
        removeComposerAttachment={(id) =>
          setComposerAttachments((curr) => curr.filter((a) => a.id !== id))
        }
        isUploadingAttachments={isUploadingAttachments}
        attachmentUploadError={attachmentUploadError}
        canSendMessage={!mutedStatus}
        handleSendMessage={handleSendMessage}
        handleAttachmentSelection={uploadAttachments}
        attachmentInputRef={attachmentInputRef}
        replyToMessage={replyToMessage}
        clearReplyToMessage={() => setReplyToMessage(null)}
        editingMessage={editingMessage}
        cancelEditingMessage={cancelEditingMessage}
        isQuickMenuOpen={isQuickMenuOpen}
        setIsQuickMenuOpen={setIsQuickMenuOpen}
        isEmojiPickerOpen={isEmojiPickerOpen}
        setIsEmojiPickerOpen={setIsEmojiPickerOpen}
        quickInsertActions={quickInsertActions}
        handleQuickInsert={(action) => setDraftMessage((curr) => `${curr}${action.content}`)}
        reactionChoices={reactionChoices}
        handleReactionInsert={(emoji) => setDraftMessage((curr) => `${curr}${emoji}`)}
      />

      <GroupDetailsDrawer
        isOpen={isGroupMembersExpanded}
        onClose={() => setIsGroupMembersExpanded(false)}
        activeConversation={activeConversation}
        currentUserId={currentUserId}
        getInitials={(name) =>
          name?.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "??"
        }
        updateGroupMemberRoleMutation={updateGroupMemberRoleMutation}
        muteGroupMemberMutation={muteGroupMemberMutation}
        unmuteGroupMemberMutation={unmuteGroupMemberMutation}
        removeGroupMemberMutation={removeGroupMemberMutation}
        leaveGroupMutation={leaveGroupMutation}
      />

      {lightboxAttachment ? (
        <div className="member-dialog-backdrop" onClick={() => setLightboxAttachment(null)}>
          <div className="member-lightbox" onClick={(e) => e.stopPropagation()}>
            <button
              className="button secondary compact icon-only member-lightbox-close"
              onClick={() => setLightboxAttachment(null)}
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <img alt={lightboxAttachment.name} src={lightboxAttachment.url} />
            <div className="member-lightbox-meta">
              <strong>{lightboxAttachment.name}</strong>
              <span>{lightboxAttachment.mimeType || "image"}</span>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
