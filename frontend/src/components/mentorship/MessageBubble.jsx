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
}) {
  const isOwn = message.sender?._id === auth.user?.id;
  const isPending = message.isPending;
  const isDeleted = Boolean(message.deletedAt);
  const isEdited = Boolean(message.editedAt);

  return (
    <div
      ref={(node) => registerMessageNode(message._id, node)}
      className={`member-message-row ${isOwn ? "own" : ""} ${
        highlightedMessageId === String(message._id) ? "highlighted" : ""
      }`}
    >
      {!isOwn && (
        <div className="member-message-avatar" title={message.sender?.name}>
          {getInitials(message.sender?.name)}
        </div>
      )}

      <div className="member-message-body">
        {!isOwn && activeConversation.type === "group" && (
          <span className="member-message-sender-name">{message.sender?.name}</span>
        )}

        <div className="member-message-bubble-wrapper">
          <div className={`member-message-bubble ${isOwn ? "own" : ""} ${isPending ? "pending" : ""}`}>
            {message.replyTo && (
              <button
                className="member-message-reply-preview"
                onClick={() => jumpToMessage(message.replyTo.messageId)}
                type="button"
              >
                <strong>{message.replyTo.senderName}</strong>
                <p>{replyPreviewContent || "..."}</p>
              </button>
            )}

            {isDeleted ? (
              <p className="member-message-deleted-text">This message was deleted.</p>
            ) : (
              <>
                <p className="member-message-text">{decryptedContent}</p>
                {isEdited && <span className="member-message-edited-tag">(edited)</span>}
              </>
            )}

            {message.attachments?.length > 0 && !isDeleted && (
              <div className="member-message-attachments">
                {message.attachments.map((attachment, idx) => {
                  const previewKey = buildAttachmentPreviewKey(message._id, attachment.url);
                  const decryptedUrl = decryptedAttachmentUrlByKey[previewKey];
                  const displayUrl = decryptedUrl || resolveApiAssetUrl(attachment.url);

                  return (
                    <div key={idx} className="member-message-attachment">
                      {attachment.isImage ? (
                        <a href={displayUrl} rel="noreferrer" target="_blank">
                          <img alt={attachment.name} src={displayUrl} />
                        </a>
                      ) : (
                        <a
                          className="member-attachment-file"
                          href={displayUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span className="material-symbols-outlined">description</span>
                          <div>
                            <strong>{attachment.name}</strong>
                            <small>{(attachment.size / 1024).toFixed(1)} KB</small>
                          </div>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!isPending && !isDeleted && (
            <div className="member-message-actions">
              <button
                className="member-message-action icon-only"
                onClick={() => setReactionPickerMessageId(message._id)}
                title="React"
                type="button"
              >
                <span className="material-symbols-outlined">add_reaction</span>
              </button>
              <button
                className="member-message-action icon-only"
                onClick={() => startReplyToMessage(message)}
                title="Reply"
                type="button"
              >
                <span className="material-symbols-outlined">reply</span>
              </button>
              <button
                className="member-message-action icon-only"
                onClick={() =>
                  setActiveMessageMenuId(activeMessageMenuId === message._id ? null : message._id)
                }
                title="More"
                type="button"
              >
                <span className="material-symbols-outlined">more_vert</span>
              </button>

              {activeMessageMenuId === message._id && (
                <div className="member-toolbar-popover">
                  {isOwn && (
                    <button onClick={() => startMessageEdit(message)} type="button">
                      <span className="material-symbols-outlined">edit</span> Edit
                    </button>
                  )}
                  {isOwn && (
                    <button
                      className="danger"
                      onClick={() => {
                        if (window.confirm("Delete this message?")) {
                          deleteMessageMutation.mutate({
                            id: activeConversation._id,
                            messageId: message._id,
                          });
                        }
                      }}
                      type="button"
                    >
                      <span className="material-symbols-outlined">delete</span> Delete
                    </button>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(decryptedContent);
                      setActiveMessageMenuId(null);
                    }}
                    type="button"
                  >
                    <span className="material-symbols-outlined">content_copy</span> Copy
                  </button>
                </div>
              )}

              {reactionPickerMessageId === message._id && (
                <div className="member-toolbar-popover compact">
                  {reactionChoices.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReactionToggle(message._id, emoji)}
                      type="button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {message.reactions?.length > 0 && (
          <div className="member-message-reactions">
            {message.reactions.map((r, idx) => (
              <button
                key={idx}
                className={`member-reaction-pill ${
                  r.userIds?.includes(auth.user?.id) ? "active" : ""
                }`}
                onClick={() => handleReactionToggle(message._id, r.emoji)}
                type="button"
              >
                <span>{r.emoji}</span>
                {r.count > 1 && <small>{r.count}</small>}
              </button>
            ))}
          </div>
        )}

        <div className="member-message-meta">
          <span>{formatTime(message.sentAt)}</span>
          {isOwn && message.delivery?.status && (
            <span className={`delivery-status ${message.delivery.status}`}>
              {message.delivery.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
