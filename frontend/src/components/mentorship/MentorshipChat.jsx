import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageBubble } from "./MessageBubble.jsx";
import { MentorshipComposer } from "./MentorshipComposer.jsx";
import { EncryptionPanel, GroupDetailsDrawer } from "./MentorshipModals.jsx";
import {
  setAlumniConversationTyping,
  uploadMentorshipAttachment,
  resolveApiAssetUrl,
} from "../../lib/api.js";
import {
  encryptMessageContent,
  decryptMessageContent,
  isEncryptedEnvelope,
  encryptFileAttachment,
  decryptFileAttachment,
  generateConversationSecret,
} from "../../lib/e2ee.js";
import { groupConsecutiveMessages } from "../../utils/chatUtils.js";

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
  conversationSecret,
  conversationSecretInput,
  setConversationSecretInput,
  saveSecret,
  verifySecret,
  isConversationKeyVerified,
  conversationKeyFingerprint,
  isE2eeInitializing,
  pendingActiveMessages,
  transmitPendingMessage,
  removePendingMessage,
  updatePendingMessage,
  reactionChoices,
  handleReactionToggle,
  editMessageMutation,
  deleteMessageMutation,
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
  rtc,
}) {
  const [draftMessage, setDraftMessage] = useState("");
  const [composerAttachments, setComposerAttachments] = useState([]);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [isEncryptionPanelOpen, setIsEncryptionPanelOpen] = useState(false);
  const [isGroupMembersExpanded, setIsGroupMembersExpanded] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState("");
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [decryptedContentByMessageId, setDecryptedContentByMessageId] =
    useState({});
  const [replyPreviewContentByMessageId, setReplyPreviewContentByMessageId] =
    useState({});
  const [decryptedAttachmentUrlByKey, setDecryptedAttachmentUrlByKey] =
    useState({});
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [messageSearch, setMessageSearch] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxAttachment, setLightboxAttachment] = useState(null);

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
  const filteredMessages = useMemo(() => {
    if (!normalizedSearch) return visibleMessages;

    return visibleMessages.filter((message) => {
      const content = String(
        decryptedContentByMessageId[message._id] || message.content || "",
      ).toLowerCase();
      const senderName = String(message.sender?.name || "").toLowerCase();
      const replyContent = String(
        replyPreviewContentByMessageId[message._id] || "",
      ).toLowerCase();
      return (
        content.includes(normalizedSearch) ||
        senderName.includes(normalizedSearch) ||
        replyContent.includes(normalizedSearch)
      );
    });
  }, [
    decryptedContentByMessageId,
    normalizedSearch,
    replyPreviewContentByMessageId,
    visibleMessages,
  ]);

  const groupedMessages = useMemo(() => {
    return groupConsecutiveMessages(filteredMessages);
  }, [filteredMessages]);

  const firstUnreadMessageId = useMemo(() => {
    for (const message of filteredMessages) {
      const senderId = String(
        message.sender?._id || message.senderId?._id || message.senderId || "",
      );
      if (!senderId || senderId === currentUserId) continue;
      const hasRead = Array.isArray(message.readBy)
        ? message.readBy.some(
            (entry) => String(entry?._id || entry) === currentUserId,
          )
        : false;
      if (!hasRead) {
        return String(message._id);
      }
    }
    return null;
  }, [currentUserId, filteredMessages]);

  const quickInsertActions = useMemo(
    () => [
      {
        id: "intro",
        icon: "waving_hand",
        label: "Warm intro",
        content: "Hello! Great to connect with a fellow alum. ",
      },
      {
        id: "coffee",
        icon: "coffee",
        label: "Coffee chat",
        content:
          "Would you be open to a quick 15 minute coffee chat this week? ",
      },
      {
        id: "followup",
        icon: "mail",
        label: "Follow up",
        content: "Following up on my last note in case it got buried. ",
      },
    ],
    [],
  );
  const mutedStatus = formatMutedStatus(activeConversation, currentUserId);
  const canManageGroup =
    activeConversation?.type === "group" &&
    activeConversation?.currentUserRole === "admin";

  const ensureConversationSecret = useCallback(() => {
    if (conversationSecret) {
      return conversationSecret;
    }

    const generatedSecret = generateConversationSecret();
    saveSecret(generatedSecret);
    return generatedSecret;
  }, [conversationSecret, saveSecret]);

  useEffect(() => {
    let cancelled = false;

    async function decrypt() {
      const contentPatch = {};
      const repliesPatch = {};

      for (const message of visibleMessages) {
        const id = message._id;
        const raw = String(message.content || "");

        // Only decrypt if not already successfully decrypted
        const alreadyDecrypted = decryptedContentByMessageId[id] &&
          decryptedContentByMessageId[id] !== "Unable to decrypt" &&
          decryptedContentByMessageId[id] !== "Encrypted message";

        if (!alreadyDecrypted) {
          if (!isEncryptedEnvelope(raw)) {
            contentPatch[id] = raw;
          } else if (!conversationSecret) {
            contentPatch[id] = "Encrypted message";
          } else {
            try {
              contentPatch[id] = await decryptMessageContent(
                raw,
                conversationSecret,
                activeConversation._id,
              );
            } catch {
              contentPatch[id] = "Unable to decrypt";
            }
          }
        }

        if (message.replyTo) {
          const alreadyDecryptedReply = replyPreviewContentByMessageId[id] &&
            replyPreviewContentByMessageId[id] !== "Unable to decrypt" &&
            replyPreviewContentByMessageId[id] !== "Encrypted message";

          if (!alreadyDecryptedReply) {
            const replyRaw = String(message.replyTo.content || "");
            if (!isEncryptedEnvelope(replyRaw)) {
              repliesPatch[id] = replyRaw;
            } else if (!conversationSecret) {
              repliesPatch[id] = "Encrypted message";
            } else {
              try {
                repliesPatch[id] = await decryptMessageContent(
                  replyRaw,
                  conversationSecret,
                  activeConversation._id,
                );
              } catch {
                repliesPatch[id] = "Unable to decrypt";
              }
            }
          }
        }
      }

      if (!cancelled) {
        if (Object.keys(contentPatch).length > 0) {
          setDecryptedContentByMessageId((prev) => ({ ...prev, ...contentPatch }));
        }
        if (Object.keys(repliesPatch).length > 0) {
          setReplyPreviewContentByMessageId((prev) => ({ ...prev, ...repliesPatch }));
        }
      }
    }

    decrypt();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?._id, conversationSecret, visibleMessages]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls = [];

    async function decryptAttachments() {
      const patch = {};

      for (const message of visibleMessages) {
        for (const attachment of message.attachments || []) {
          const key = `${message._id}:${attachment.url}`;

          // Skip if already resolved to an object URL (blob:) or non-encrypted URL
          if (decryptedAttachmentUrlByKey[key] && decryptedAttachmentUrlByKey[key].startsWith("blob:")) {
            continue;
          }

          const encryptedUrl = resolveApiAssetUrl(attachment.url);

          if (!attachment.isEncrypted) {
            patch[key] = encryptedUrl;
            continue;
          }

          if (!conversationSecret) {
            patch[key] = encryptedUrl;
            continue;
          }

          try {
            const response = await fetch(encryptedUrl, {
              credentials: "include",
            });
            const encryptedBuffer = await response.arrayBuffer();
            const decryptedBuffer = await decryptFileAttachment(
              encryptedBuffer,
              attachment,
              conversationSecret,
              activeConversation._id,
            );
            const blob = new Blob([decryptedBuffer], {
              type:
                attachment.originalMimeType ||
                attachment.mimeType ||
                "application/octet-stream",
            });
            const objectUrl = URL.createObjectURL(blob);
            objectUrls.push(objectUrl);
            patch[key] = objectUrl;
          } catch {
            patch[key] = encryptedUrl;
          }
        }
      }

      if (!cancelled && Object.keys(patch).length > 0) {
        setDecryptedAttachmentUrlByKey((prev) => ({ ...prev, ...patch }));
      }
    }

    decryptAttachments();

    return () => {
      cancelled = true;
      for (const objectUrl of objectUrls) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?._id, conversationSecret, visibleMessages]);

  useEffect(() => {
    const stream = messageStreamRef.current;
    if (!stream) return;
    if (shouldAutoScrollRef.current) {
      stream.scrollTop = stream.scrollHeight;
    }
  }, [filteredMessages.length]);

  const typingMutation = useMutation({
    mutationFn: ({ id, isTyping }) =>
      setAlumniConversationTyping(id, { isTyping }),
  });

  useEffect(() => {
    typingMutationRef.current = typingMutation;
  }, [typingMutation]);

  const sendTypingSignal = useCallback(
    (isTyping) => {
      if (!activeConversation?._id) return;
      typingMutationRef.current?.mutate({
        id: activeConversation._id,
        isTyping,
      });
    },
    [activeConversation?._id],
  );

  useEffect(() => {
    if (!activeConversation?._id) return undefined;

    const isTyping = Boolean(draftMessage.trim());

    if (lastTypingStateRef.current !== isTyping) {
      sendTypingSignal(isTyping);
      lastTypingStateRef.current = isTyping;
    }

    if (!isTyping) {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      return undefined;
    }

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }
    typingStopTimerRef.current = setTimeout(() => {
      if (lastTypingStateRef.current) {
        sendTypingSignal(false);
        lastTypingStateRef.current = false;
      }
    }, 1800);

    return () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
    };
  }, [activeConversation?._id, draftMessage, sendTypingSignal]);

  useEffect(() => {
    if (!activeConversation?._id) return;
    if (lastReadSyncRef.current.get(activeConversation._id)) return;
    lastReadSyncRef.current.set(activeConversation._id, true);
    markReadMutation.mutate(activeConversation._id);
  }, [activeConversation?._id, markReadMutation]);

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }
      if (activeConversation?._id && lastTypingStateRef.current) {
        sendTypingSignal(false);
        lastTypingStateRef.current = false;
      }
    };
  }, [activeConversation?._id, sendTypingSignal]);

  useEffect(() => {
    setDraftMessage("");
    setComposerAttachments([]);
    setReplyToMessage(null);
    setEditingMessage(null);
    setAttachmentUploadError("");
    setIsEmojiPickerOpen(false);
    setIsQuickMenuOpen(false);
  }, [activeConversation?._id]);

  const uploadFiles = async (files, resetTarget) => {
    if (!files.length) return;

    const workingSecret = ensureConversationSecret();

    setAttachmentUploadError("");
    setIsUploadingAttachments(true);

    try {
      for (const file of files) {
        const attachmentId = `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 6)}`;
        const previewUrl = String(file.type || "").startsWith("image/")
          ? URL.createObjectURL(file)
          : "";
        const encryptedAttachment = await encryptFileAttachment(
          file,
          workingSecret,
          activeConversation._id,
        );

        setComposerAttachments((curr) => [
          ...curr,
          {
            id: attachmentId,
            name: file.name,
            url: "",
            mimeType: encryptedAttachment.metadata.originalMimeType,
            size: file.size,
            isImage: String(file.type).startsWith("image/"),
            previewUrl,
            progress: 0,
            isUploading: true,
            isEncrypted: true,
            encryptionIv: encryptedAttachment.metadata.encryptionIv,
            encryptionVersion: encryptedAttachment.metadata.encryptionVersion,
            encryptionAlgorithm:
              encryptedAttachment.metadata.encryptionAlgorithm,
            originalMimeType: encryptedAttachment.metadata.originalMimeType,
            originalName: encryptedAttachment.metadata.originalName,
          },
        ]);

        const uploaded = await uploadMentorshipAttachment(
          encryptedAttachment.encryptedFile,
          {
            onUploadProgress: (progress) => {
              setComposerAttachments((curr) =>
                curr.map((attachment) =>
                  attachment.id === attachmentId
                    ? { ...attachment, progress }
                    : attachment,
                ),
              );
            },
          },
        );
        setComposerAttachments((curr) => [
          ...curr.filter((attachment) => attachment.id !== attachmentId),
          {
            id: attachmentId,
            name: file.name,
            url: uploaded.url,
            mimeType:
              uploaded.mimeType ||
              encryptedAttachment.metadata.originalMimeType ||
              file.type,
            size: uploaded.size || file.size,
            isImage: String(uploaded.mimeType || file.type).startsWith(
              "image/",
            ),
            previewUrl,
            progress: 100,
            isUploading: false,
            isEncrypted: true,
            encryptionIv: encryptedAttachment.metadata.encryptionIv,
            encryptionVersion: encryptedAttachment.metadata.encryptionVersion,
            encryptionAlgorithm:
              encryptedAttachment.metadata.encryptionAlgorithm,
            originalMimeType: encryptedAttachment.metadata.originalMimeType,
            originalName: encryptedAttachment.metadata.originalName,
          },
        ]);
      }
    } catch (error) {
      setAttachmentUploadError(error?.message || "Upload failed.");
    } finally {
      setIsUploadingAttachments(false);
      if (resetTarget) {
        resetTarget.value = "";
      }
    }
  };

  const uploadAttachments = async (event) => {
    const files = Array.from(event.target.files || []);
    await uploadFiles(files, event.target);
  };

  const handleSendMessage = async () => {
    const content = draftMessage.trim();
    if (
      !activeConversation ||
      (!content && !composerAttachments.length) ||
      isUploadingAttachments
    ) {
      return;
    }

    const workingSecret = ensureConversationSecret();

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

    let encrypted = "";
    if (content) {
      try {
        encrypted = await encryptMessageContent(
          content,
          workingSecret,
          activeConversation._id,
        );
      } catch {
        setAttachmentUploadError("Secure channel encryption failed.");
        return;
      }
    }

    const clientId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const optimistic = {
      _id: `temp-${clientId}`,
      clientId,
      content,
      encryptedContent: encrypted,
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
      ...message,
      isPending: true,
      delivery: { status: "sending" },
    });
  };

  const startMessageEdit = (message) => {
    setEditingMessage(message);
    setReplyToMessage(null);
    setComposerAttachments([]);
    setDraftMessage(decryptedContentByMessageId[message._id] || "");
    setActiveMessageMenuId(null);
  };

  const cancelEditingMessage = () => {
    setEditingMessage(null);
    setDraftMessage("");
  };

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
            {activeConversation.conversationType === "group" ? (
              <span className="material-symbols-outlined">groups</span>
            ) : (
              (activeConversation.name || (String(activeConversation.requester?._id) === currentUserId ? activeConversation.mentor?.name : activeConversation.requester?.name) || "??")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            )}
            {activeConversation.online ? (
              <span className="member-chat-header-online" />
            ) : null}
          </div>

          <div className="member-messages-panel-info">
            <h2>
              {activeConversation.conversationType === "group" 
                ? (activeConversation.groupName || "Unnamed Group")
                : (activeConversation.name || (String(activeConversation.requester?._id) === currentUserId ? activeConversation.mentor?.name : activeConversation.requester?.name) || "Alumni Contact")
              }
            </h2>
            <p>
              {typingUsers.length
                ? typingUsers.length === 1
                  ? `${typingUsers[0].name} is typing...`
                  : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`
                : activeConversation.conversationType === "group"
                  ? `${activeConversation.members?.length || 0} members${canManageGroup ? " • You can manage this group" : ""}`
                  : isRealtimeConnected
                    ? "Connected now"
                    : "Reconnecting..."}
            </p>
          </div>
        </div>

        <div className="member-chat-topbar-actions">
          {activeConversation.conversationType !== "group" && (
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
          <button
            className="member-chat-action-button"
            onClick={() => setIsEncryptionPanelOpen(!isEncryptionPanelOpen)}
            type="button"
          >
            <span className="material-symbols-outlined">
              {isConversationKeyVerified ? "lock" : "lock_open"}
            </span>
          </button>
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
          <button className="member-chat-action-button ghost" type="button">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
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
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) {
            setIsDragOver(false);
          }
        }}
        onDrop={async (event) => {
          event.preventDefault();
          setIsDragOver(false);
          const files = Array.from(event.dataTransfer.files || []);
          await uploadFiles(files);
        }}
        onScroll={(event) => {
          const stream = event.currentTarget;
          const isAtBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 80;
          shouldAutoScrollRef.current = isAtBottom;

          const scrollButton = document.getElementById('chat-scroll-bottom');
          if (scrollButton) {
            if (!isAtBottom && stream.scrollHeight > stream.clientHeight * 1.5) {
              scrollButton.classList.add('visible');
            } else {
              scrollButton.classList.remove('visible');
            }
          }

          if (stream.scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
            const previousHeight = stream.scrollHeight;
            fetchNextPage().then(() => {
              setTimeout(() => {
                stream.scrollTop = stream.scrollHeight - previousHeight;
              }, 0);
            });
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
            <button
              className="button ghost compact"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              type="button"
            >
              {isFetchingNextPage ? "Loading..." : "Load earlier messages"}
            </button>
          </div>
        ) : null}

        {isMessagesLoading && !filteredMessages.length ? (
          <div className="chat-loading-placeholder">
            <p>Loading conversation...</p>
          </div>
        ) : null}

        {!isMessagesLoading && !filteredMessages.length ? (
          <div className="member-empty-thread-state">
            <span className="material-symbols-outlined">
              {normalizedSearch ? "manage_search" : "chat_bubble"}
            </span>
            <strong>
              {normalizedSearch ? "No matching messages" : "No messages yet"}
            </strong>
            <p>
              {normalizedSearch
                ? "Try a different keyword or clear the in-chat search."
                : "Say hello and get the conversation moving."}
            </p>
          </div>
        ) : null}

        {groupedMessages.map((message) => (
          <div className="member-message-stack" key={message._id}>
            {message.dateLabel && (
              <div className="member-date-separator">
                <span>{message.dateLabel}</span>
              </div>
            )}
            {firstUnreadMessageId === String(message._id) ? (
              <div className="member-unread-divider">
                <span>Unread messages</span>
              </div>
            ) : null}
            <MessageBubble
              isGroupStart={message.isGroupStart}
              isGroupEnd={message.isGroupEnd}
              message={message}
              auth={auth}
              activeConversation={activeConversation}
              decryptedContent={decryptedContentByMessageId[message._id]}
              replyPreviewContent={replyPreviewContentByMessageId[message._id]}
              decryptedAttachmentUrlByKey={decryptedAttachmentUrlByKey}
              formatTime={(value) =>
                new Date(value).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              }
              getInitials={(name) =>
                name
                  ?.split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "??"
              }
              buildAttachmentPreviewKey={(messageId, url) =>
                `${messageId}:${url}`
              }
              startReplyToMessage={(msg) =>
                setReplyToMessage({
                  messageId: msg._id,
                  senderName: msg.sender?.name,
                  content: decryptedContentByMessageId[msg._id] || msg.content,
                })
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
                if (node) {
                  messageNodeRefs.current.set(String(id), node);
                } else {
                  messageNodeRefs.current.delete(String(id));
                }
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
              messageStreamRef.current.scrollTo({
                top: messageStreamRef.current.scrollHeight,
                behavior: 'smooth'
              });
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
          setComposerAttachments((curr) =>
            curr.filter((attachment) => attachment.id !== id),
          )
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
        handleQuickInsert={(action) =>
          setDraftMessage((curr) => `${curr}${action.content}`)
        }
        reactionChoices={reactionChoices}
        handleReactionInsert={(emoji) =>
          setDraftMessage((curr) => `${curr}${emoji}`)
        }
      />

      <EncryptionPanel
        isOpen={isEncryptionPanelOpen}
        onClose={() => setIsEncryptionPanelOpen(false)}
        conversationSecretInput={conversationSecretInput}
        setConversationSecretInput={setConversationSecretInput}
        saveConversationSecret={saveSecret}
        clearConversationSecret={() => saveSecret("")}
        conversationKeyFingerprint={conversationKeyFingerprint}
        isConversationKeyVerified={isConversationKeyVerified}
        markConversationSecretVerified={verifySecret}
        isE2eeInitializing={isE2eeInitializing}
      />

      <GroupDetailsDrawer
        isOpen={isGroupMembersExpanded}
        onClose={() => setIsGroupMembersExpanded(false)}
        activeConversation={activeConversation}
        currentUserId={currentUserId}
        getInitials={(name) =>
          name
            ?.split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "??"
        }
        updateGroupMemberRoleMutation={updateGroupMemberRoleMutation}
        muteGroupMemberMutation={muteGroupMemberMutation}
        unmuteGroupMemberMutation={unmuteGroupMemberMutation}
        removeGroupMemberMutation={removeGroupMemberMutation}
        leaveGroupMutation={leaveGroupMutation}
      />

      {lightboxAttachment ? (
        <div
          className="member-dialog-backdrop"
          onClick={() => setLightboxAttachment(null)}
        >
          <div
            className="member-lightbox"
            onClick={(event) => event.stopPropagation()}
          >
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
