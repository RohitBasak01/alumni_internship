import { useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { resolveApiAssetUrl } from "../../lib/api.js";

export function MessageBubble({
  message,
  auth,
  activeConversation,
  decryptedContent,
  replyPreviewContent,
  decryptedAttachmentUrlByKey,
  formatTime,
  getInitials,
  buildAttachmentPreviewKey,
  startReplyToMessage,
  startMessageEdit,
  deleteMessageMutation,
  reactionChoices,
  handleReactionToggle,
  jumpToMessage,
  activeMessageMenuId,
  setActiveMessageMenuId,
  reactionPickerMessageId,
  setReactionPickerMessageId,
  highlightedMessageId,
  registerMessageNode,
  onRetrySend,
  onOpenImage,
  isGroupStart,
  isGroupEnd,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const messageSenderId = String(
    message.sender?._id || message.senderId?._id || message.senderId || "",
  );
  const currentUserId = String(auth.user?.id || auth.user?._id || "");
  const isOwn = Boolean(messageSenderId) && messageSenderId === currentUserId;
  const isPending = message.isPending;
  const isDeleted = Boolean(message.deletedAt);
  const isEdited = Boolean(message.editedAt);
  const isFailed = message.delivery?.status === "failed";

  const readCount = Array.isArray(message.readBy)
    ? message.readBy.filter(
        (entry) => String(entry?._id || entry) !== String(auth.user?.id || ""),
      ).length
    : 0;
  const deliveredCount = Array.isArray(message.deliveredTo)
    ? message.deliveredTo.filter(
        (entry) => String(entry?._id || entry) !== String(auth.user?.id || ""),
      ).length
    : 0;

  const deliveryStatus = isOwn
    ? message.delivery?.status ||
      (readCount > 0 ? "read" : deliveredCount > 0 ? "delivered" : "sent")
    : null;

  const reactionSummary = Object.values(
    (Array.isArray(message.reactions) ? message.reactions : []).reduce(
      (acc, reaction) => {
        const emoji = reaction?.emoji;
        const userId = String(reaction?.userId?._id || reaction?.userId || "");
        if (!emoji || !userId) return acc;
        if (!acc[emoji]) {
          acc[emoji] = { emoji, count: 0, userIds: [] };
        }
        acc[emoji].count += 1;
        acc[emoji].userIds.push(userId);
        return acc;
      },
      {},
    ),
  );

  const getAttachmentBadge = (attachment) => {
    const mimeType = String(attachment.mimeType || "").toLowerCase();
    if (mimeType.includes("pdf")) return "PDF";
    if (mimeType.includes("word") || mimeType.includes("document"))
      return "DOC";
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return "XLS";
    if (mimeType.startsWith("image/")) return "IMG";
    return "FILE";
  };

  return (
    <div
      ref={(node) => registerMessageNode(message._id, node)}
      className={`member-message-row ${isOwn ? "own" : ""} ${
        highlightedMessageId === String(message._id) ? "highlighted" : ""
      } ${isFailed ? "failed" : ""} ${!isGroupStart ? "grouped" : ""}`}
    >
      {!isOwn && isGroupStart ? (
        <div className="member-message-avatar" title={message.sender?.name}>
          {getInitials(message.sender?.name)}
        </div>
      ) : null}

      <div className="member-message-body">
        {!isOwn && isGroupStart && activeConversation.type === "group" ? (
          <span className="member-message-sender-name">
            {message.sender?.name}
          </span>
        ) : null}

        <div className="member-message-bubble-wrapper">
          <div
            className={`member-message-bubble ${isOwn ? "own" : ""} ${
              isPending ? "pending" : ""
            }`}
          >
            {message.replyTo ? (
              <button
                className="member-message-reply-preview"
                onClick={() => jumpToMessage(message.replyTo.messageId)}
                type="button"
              >
                <strong>{message.replyTo.senderName}</strong>
                <p>{replyPreviewContent || "..."}</p>
              </button>
            ) : null}

            {isDeleted ? (
              <p className="member-message-deleted-text">
                This message was deleted.
              </p>
            ) : (
              <>
                <p className="member-message-text">{decryptedContent}</p>
                {isEdited ? (
                  <span className="member-message-edited-tag">edited</span>
                ) : null}
              </>
            )}

            {message.attachments?.length > 0 && !isDeleted ? (
              <div className="member-message-attachments">
                {message.attachments.map((attachment, index) => {
                  const previewKey = buildAttachmentPreviewKey(
                    message._id,
                    attachment.url,
                  );
                  const decryptedUrl = decryptedAttachmentUrlByKey[previewKey];
                  const displayUrl =
                    decryptedUrl || resolveApiAssetUrl(attachment.url);
                  const isImage =
                    attachment.isImage ||
                    String(attachment.mimeType || "").startsWith("image/");

                  return (
                    <div
                      key={`${attachment.url}-${index}`}
                      className="member-message-attachment"
                    >
                      {isImage ? (
                        <button
                          className="member-image-button"
                          onClick={() =>
                            onOpenImage?.({
                              url: displayUrl,
                              name: attachment.name,
                              mimeType: attachment.mimeType,
                            })
                          }
                          type="button"
                        >
                          <img alt={attachment.name} src={displayUrl} />
                        </button>
                      ) : (
                        <a
                          className="member-attachment-file"
                          href={displayUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span className="material-symbols-outlined">
                            description
                          </span>
                          <div>
                            <em className="member-attachment-badge">
                              {getAttachmentBadge(attachment)}
                            </em>
                            <strong>{attachment.name}</strong>
                            <small>
                              {(attachment.size / 1024).toFixed(1)} KB
                            </small>
                          </div>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {!isDeleted ? (
            <div className="member-message-actions">
              {!isPending ? (
                <>
                  <button
                    className="member-message-action icon-only"
                    onClick={() =>
                      setReactionPickerMessageId(
                        reactionPickerMessageId === message._id
                          ? null
                          : message._id,
                      )
                    }
                    title="React"
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      add_reaction
                    </span>
                  </button>
                  <button
                    className="member-message-action icon-only"
                    onClick={() => startReplyToMessage(message)}
                    title="Reply"
                    type="button"
                  >
                    <span className="material-symbols-outlined">reply</span>
                  </button>
                </>
              ) : null}

              <button
                className="member-message-action icon-only"
                onClick={() =>
                  setActiveMessageMenuId(
                    activeMessageMenuId === message._id ? null : message._id,
                  )
                }
                title="More"
                type="button"
              >
                <span className="material-symbols-outlined">more_horiz</span>
              </button>

              {activeMessageMenuId === message._id ? (
                <div className="member-toolbar-popover">
                  {isOwn && !isPending ? (
                    <button
                      onClick={() => startMessageEdit(message)}
                      type="button"
                    >
                      <span className="material-symbols-outlined">edit</span>
                      Edit
                    </button>
                  ) : null}
                  {isOwn && !isPending ? (
                    <button
                      className="danger"
                      onClick={() => setShowDeleteConfirm(true)}
                      type="button"
                    >
                      <span className="material-symbols-outlined">delete</span>
                      Delete
                    </button>
                  ) : null}
                  {showDeleteConfirm && (
                    <div className="member-popover-confirm">
                      <p>Delete this message?</p>
                      <div className="member-popover-confirm-actions">
                        <button 
                          className="button ghost compact" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(false);
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button 
                          className="button danger compact" 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMessageMutation.mutate({
                              requestId: activeConversation._id,
                              messageId: message._id,
                            });
                            setShowDeleteConfirm(false);
                            setActiveMessageMenuId(null);
                          }}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                  {isFailed ? (
                    <button
                      onClick={() => onRetrySend?.(message)}
                      type="button"
                    >
                      <span className="material-symbols-outlined">refresh</span>
                      Retry send
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(decryptedContent || "");
                      setActiveMessageMenuId(null);
                    }}
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      content_copy
                    </span>
                    Copy
                  </button>
                </div>
              ) : null}

              {reactionPickerMessageId === message._id ? (
                <div className={`member-toolbar-popover ${showFullPicker ? 'full-picker' : 'compact emoji-grid'}`}>
                  {showFullPicker ? (
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        handleReactionToggle(message._id, emojiData.emoji);
                        setReactionPickerMessageId(null);
                        setShowFullPicker(false);
                      }}
                      autoFocusSearch={true}
                      emojiStyle="native"
                      lazyLoadEmojis={false}
                      width={280}
                      height={320}
                    />
                  ) : (
                    <>
                      {reactionChoices.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            handleReactionToggle(message._id, emoji);
                            setReactionPickerMessageId(null);
                          }}
                          type="button"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button 
                        className="member-emoji-more"
                        onClick={() => setShowFullPicker(true)}
                        type="button"
                        title="More emojis"
                      >
                        <span className="material-symbols-outlined">add</span>
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {reactionSummary.length > 0 ? (
          <div className="member-message-reactions">
            {reactionSummary.map((reaction) => (
              <button
                key={reaction.emoji}
                className={`member-reaction-pill ${
                  reaction.userIds?.includes(String(auth.user?.id || ""))
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleReactionToggle(message._id, reaction.emoji)
                }
                type="button"
              >
                <span>{reaction.emoji}</span>
                {reaction.count > 1 ? <small>{reaction.count}</small> : null}
              </button>
            ))}
          </div>
        ) : null}

        <div className="member-message-meta">
          <span>
            {formatTime(
              new Date(
                message.sentAt ||
                  message.createdAt ||
                  message.updatedAt ||
                  Date.now(),
              ).toISOString(),
            )}
          </span>
          {isOwn && deliveryStatus ? (
            <span className={`delivery-tick ${deliveryStatus === 'read' ? 'read' : ''}`} title={deliveryStatus}>
              {deliveryStatus === 'sent' && (
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              )}
              {(deliveryStatus === 'delivered' || deliveryStatus === 'read') && (
                <svg viewBox="0 0 24 24"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM1 12.5l1.41-1.41 4.24 4.24-1.41 1.41L1 12.5z"/></svg>
              )}
            </span>
          ) : null}
          {isFailed ? (
            <button
              className="link-button inline"
              onClick={() => onRetrySend?.(message)}
              type="button"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
