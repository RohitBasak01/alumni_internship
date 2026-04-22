import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageBubble } from "./MessageBubble.jsx";
import { MentorshipComposer } from "./MentorshipComposer.jsx";
import { EncryptionPanel } from "./MentorshipModals.jsx";
import { setMentorshipTyping, uploadMentorshipAttachment, editMentorshipMessage, deleteMentorshipMessage, leaveGroupConversation, resolveApiAssetUrl } from "../../lib/api.js";
import { encryptMessageContent, decryptMessageContent, isEncryptedEnvelope, encryptFileAttachment, decryptFileAttachment } from "../../lib/e2ee.js";

export function MentorshipChat({
  activeConversation,
  auth,
  isMobileViewport,
  setIsMobileThreadListOpen,
  isRealtimeConnected,
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
  markReadMutation,
  queryClient,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isMessagesLoading
}) {
  const [draftMessage, setDraftMessage] = useState("");
  const [composerAttachments, setComposerAttachments] = useState([]);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [isEncryptionPanelOpen, setIsEncryptionPanelOpen] = useState(false);
  const [isGroupMembersExpanded, setIsGroupMembersExpanded] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState("");
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [decryptedContentByMessageId, setDecryptedContentByMessageId] = useState({});
  const [replyPreviewContentByMessageId, setReplyPreviewContentByMessageId] = useState({});
  const [decryptedAttachmentUrlByKey, setDecryptedAttachmentUrlByKey] = useState({});
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  
  const messageStreamRef = useRef(null);
  const messageNodeRefs = useRef(new Map());
  const attachmentInputRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const typingStopTimerRef = useRef(null);
  const typingHeartbeatRef = useRef(0);
  const lastReadSyncRef = useRef(new Map());

  // Logic from MentorshipPage...
  const visibleMessages = useMemo(() => {
    const base = activeConversation?.messages || [];
    return [...base, ...pendingActiveMessages].sort((a, b) => 
      new Date(a.sentAt || 0).getTime() - new Date(b.sentAt || 0).getTime()
    );
  }, [activeConversation?.messages, pendingActiveMessages]);

  // Decryption effect
  useEffect(() => {
    let cancelled = false;
    async function decrypt() {
      const content = {};
      const replies = {};
      for (const msg of visibleMessages) {
        const raw = String(msg.content || "");
        if (!isEncryptedEnvelope(raw)) {
          content[msg._id] = raw;
        } else if (!conversationSecret) {
          content[msg._id] = "Encrypted message";
        } else {
          try {
            content[msg._id] = await decryptMessageContent(raw, conversationSecret, activeConversation._id);
          } catch {
            content[msg._id] = "Unable to decrypt";
          }
        }
        // Handle reply previews
        if (msg.replyTo) {
          const rRaw = String(msg.replyTo.content || "");
          if (!isEncryptedEnvelope(rRaw)) replies[msg._id] = rRaw;
          else if (!conversationSecret) replies[msg._id] = "Encrypted message";
          else {
            try {
              replies[msg._id] = await decryptMessageContent(rRaw, conversationSecret, activeConversation._id);
            } catch { replies[msg._id] = "Unable to decrypt"; }
          }
        }
      }
      if (!cancelled) {
        setDecryptedContentByMessageId(content);
        setReplyPreviewContentByMessageId(replies);
      }
    }
    decrypt();
    return () => { cancelled = true; };
  }, [activeConversation?._id, conversationSecret, visibleMessages]);

  // Scroll effect
  useEffect(() => {
    const stream = messageStreamRef.current;
    if (!stream) return;
    if (shouldAutoScrollRef.current) stream.scrollTop = stream.scrollHeight;
  }, [visibleMessages.length]);

  // Typing logic
  const typingMutation = useMutation({
    mutationFn: ({ id, isTyping }) => setMentorshipTyping(id, { isTyping })
  });

  const sendTypingSignal = useCallback((isTyping) => {
    if (!activeConversation) return;
    typingMutation.mutate({ id: activeConversation._id, isTyping });
  }, [activeConversation, typingMutation]);

  const handleSendMessage = async () => {
    const content = draftMessage.trim();
    if (!activeConversation || (!content && !composerAttachments.length) || isUploadingAttachments) return;

    let encrypted = "";
    if (content) {
      try {
        encrypted = await encryptMessageContent(content, conversationSecret, activeConversation._id);
      } catch {
        setAttachmentUploadError("Encryption failed.");
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
      isPending: true
    };

    setDraftMessage("");
    setComposerAttachments([]);
    setReplyToMessage(null);
    transmitPendingMessage(activeConversation._id, optimistic);
  };

  // ... (Other functions like jumpToMessage, handleReactionToggle, etc.)
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
    <main className="member-messages-panel">
      <div className="member-messages-panel-header">
        {isMobileViewport && (
          <button className="member-messages-back-button" onClick={() => setIsMobileThreadListOpen(true)}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        <div className="member-messages-panel-info">
          <h2>{activeConversation.name}</h2>
          <p>{activeConversation.type === "group" ? `${activeConversation.members?.length} members` : "Active now"}</p>
        </div>
        <div className="member-chat-topbar-actions">
          <button className="button secondary compact icon-only" onClick={() => setIsEncryptionPanelOpen(!isEncryptionPanelOpen)}>
            <span className="material-symbols-outlined">{isConversationKeyVerified ? "lock" : "lock_open"}</span>
          </button>
          {activeConversation.type === "group" && (
            <button className="button secondary compact icon-only" onClick={() => setIsGroupMembersExpanded(!isGroupMembersExpanded)}>
              <span className="material-symbols-outlined">info</span>
            </button>
          )}
        </div>
      </div>

      <div className="member-messages-stream" ref={messageStreamRef} onScroll={(e) => {
        const s = e.currentTarget;
        shouldAutoScrollRef.current = (s.scrollHeight - s.scrollTop - s.clientHeight) < 80;
        
        // Trigger load more when scrolling to top
        if (s.scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
          const oldScrollHeight = s.scrollHeight;
          fetchNextPage().then(() => {
             // Try to maintain scroll position after loading more
             setTimeout(() => {
               s.scrollTop = s.scrollHeight - oldScrollHeight;
             }, 0);
          });
        }
      }}>
        {hasNextPage && (
          <div className="chat-pagination-sentinel">
            <button 
              className="button ghost compact" 
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading..." : "Load earlier messages"}
            </button>
          </div>
        )}
        {isMessagesLoading && !visibleMessages.length && (
          <div className="chat-loading-placeholder">
            <p>Loading conversation...</p>
          </div>
        )}
        {visibleMessages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            auth={auth}
            activeConversation={activeConversation}
            decryptedContent={decryptedContentByMessageId[msg._id]}
            replyPreviewContent={replyPreviewContentByMessageId[msg._id]}
            decryptedAttachmentUrlByKey={decryptedAttachmentUrlByKey}
            formatTime={(v) => new Date(v).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            getInitials={(n) => n?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "??"}
            buildAttachmentPreviewKey={(m, u) => `${m}:${u}`}
            startReplyToMessage={(m) => setReplyToMessage({ messageId: m._id, senderName: m.sender?.name, content: m.content })}
            reactionChoices={reactionChoices}
            handleReactionToggle={(mid, e) => handleReactionToggle(activeConversation._id, mid, e)}
            jumpToMessage={jumpToMessage}
            activeMessageMenuId={activeMessageMenuId}
            setActiveMessageMenuId={setActiveMessageMenuId}
            reactionPickerMessageId={reactionPickerMessageId}
            setReactionPickerMessageId={setReactionPickerMessageId}
            highlightedMessageId={highlightedMessageId}
            registerMessageNode={(id, n) => { if (n) messageNodeRefs.current.set(String(id), n); else messageNodeRefs.current.delete(String(id)); }}
          />
        ))}
      </div>

      <MentorshipComposer
        draftMessage={draftMessage}
        setDraftMessage={setDraftMessage}
        composerAttachments={composerAttachments}
        removeComposerAttachment={(id) => setComposerAttachments(curr => curr.filter(a => a.id !== id))}
        isUploadingAttachments={isUploadingAttachments}
        attachmentUploadError={attachmentUploadError}
        canSendMessage={true} // Add real logic here
        handleSendMessage={handleSendMessage}
        handleAttachmentSelection={async (e) => {
          // Add attachment upload logic...
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          setIsUploadingAttachments(true);
          try {
             // Mock upload for now or call real api
             for (const f of files) {
               const uploaded = await uploadMentorshipAttachment(f);
               setComposerAttachments(curr => [...curr, { id: Date.now(), name: f.name, url: uploaded.url, size: f.size, isImage: f.type.startsWith("image/") }]);
             }
          } finally { setIsUploadingAttachments(false); }
        }}
        attachmentInputRef={attachmentInputRef}
        replyToMessage={replyToMessage}
        clearReplyToMessage={() => setReplyToMessage(null)}
        isQuickMenuOpen={isQuickMenuOpen}
        setIsQuickMenuOpen={setIsQuickMenuOpen}
        isEmojiPickerOpen={isEmojiPickerOpen}
        setIsEmojiPickerOpen={setIsEmojiPickerOpen}
        quickInsertActions={[]}
        handleQuickInsert={() => {}}
        reactionChoices={reactionChoices}
        handleReactionInsert={(e) => setDraftMessage(curr => curr + e)}
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
    </main>
  );
}
