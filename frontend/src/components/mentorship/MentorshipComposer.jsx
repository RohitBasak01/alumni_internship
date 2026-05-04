import { useEffect, useRef } from "react";
import EmojiPicker from "emoji-picker-react";

export function MentorshipComposer({
  draftMessage,
  setDraftMessage,
  composerAttachments,
  removeComposerAttachment,
  isUploadingAttachments,
  attachmentUploadError,
  canSendMessage,
  handleSendMessage,
  handleAttachmentSelection,
  attachmentInputRef,
  replyToMessage,
  clearReplyToMessage,
  editingMessage,
  cancelEditingMessage,
  isQuickMenuOpen,
  setIsQuickMenuOpen,
  isEmojiPickerOpen,
  setIsEmojiPickerOpen,
  quickInsertActions,
  handleQuickInsert,
  reactionChoices,
  handleReactionInsert,
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${nextHeight}px`;
  }, [draftMessage]);

  return (
    <div className="member-message-composer-wrap">
      {/* ... existing reply/edit/attachment UI ... */}
      {editingMessage ? (
        <div className="member-compose-reply mode-editing">
          <div className="member-compose-reply-copy">
            <span>
              Editing{" "}
              <strong>{editingMessage.sender?.name || "message"}</strong>
            </span>
            <p>{draftMessage || "Update the message and send when ready."}</p>
          </div>
          <button
            className="member-compose-reply-dismiss"
            onClick={cancelEditingMessage}
            aria-label="Cancel edit"
            title="Cancel edit"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      ) : null}

      {replyToMessage ? (
        <div className="member-compose-reply">
          <div className="member-compose-reply-copy">
            <span>
              Replying to <strong>{replyToMessage.senderName}</strong>
            </span>
            <p>{replyToMessage.content}</p>
          </div>
          <button
            className="member-compose-reply-dismiss"
            onClick={clearReplyToMessage}
            aria-label="Back out"
            title="Back out"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      ) : null}

      {composerAttachments.length > 0 ? (
        <div className="member-compose-attachments">
          {composerAttachments.map((file) => (
            <div key={file.id} className="member-compose-attachment">
              {file.isImage ? (
                <img
                  alt={file.name}
                  className="member-compose-attachment-thumb"
                  src={file.previewUrl || file.url}
                />
              ) : (
                <span className="material-symbols-outlined">description</span>
              )}
              <div className="member-compose-attachment-copy">
                <strong>{file.name}</strong>
                <small>
                  {file.isUploading
                    ? `Uploading ${file.progress || 0}%`
                    : `${(file.size / 1024).toFixed(1)} KB`}
                </small>
              </div>
              <button
                className="member-message-action icon-only"
                onClick={() => removeComposerAttachment(file.id)}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {attachmentUploadError ? (
        <div className="member-composer-error">
          <span className="material-symbols-outlined">error</span>
          <p>{attachmentUploadError}</p>
        </div>
      ) : null}

      <div className="member-message-composer">
        <div className="member-composer-toolbar">
          <button
            className="member-message-action icon-only"
            onClick={() => attachmentInputRef.current?.click()}
            title="Attach file"
            type="button"
          >
            <span className="material-symbols-outlined">attach_file</span>
          </button>
          <input
            ref={attachmentInputRef}
            hidden
            multiple
            onChange={handleAttachmentSelection}
            type="file"
          />

          <div className="member-composer-menu-wrap">
            <button
              className="member-message-action icon-only"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              title="Add emoji"
              type="button"
            >
              <span className="material-symbols-outlined">mood</span>
            </button>
            {isEmojiPickerOpen ? (
              <div className="member-composer-emoji-picker">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    handleReactionInsert(emojiData.emoji);
                    setIsEmojiPickerOpen(false);
                  }}
                  autoFocusSearch={false}
                  emojiStyle="native"
                  lazyLoadEmojis={false}
                  width={320}
                  height={400}
                />
              </div>
            ) : null}
          </div>

          <div className="member-composer-menu-wrap">
            <button
              className="member-message-action icon-only"
              onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
              title="Quick inserts"
              type="button"
            >
              <span className="material-symbols-outlined">auto_awesome</span>
            </button>
            {isQuickMenuOpen ? (
              <div className="member-toolbar-popover">
                {quickInsertActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickInsert(action)}
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      {action.icon || "subdirectory_arrow_right"}
                    </span>
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="member-message-composer-input">
          <textarea
            ref={textareaRef}
            disabled={!canSendMessage}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              canSendMessage
                ? editingMessage
                  ? "Edit your message..."
                  : "Write to your alumni network..."
                : "Messaging disabled"
            }
            rows="1"
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
          />
          <small className="member-composer-hint">
            Press <kbd>Enter</kbd> to send. Use <kbd>Shift</kbd> +{" "}
            <kbd>Enter</kbd> for a new line.
          </small>
        </div>

        <button
          className="member-send-button"
          disabled={
            !canSendMessage ||
            (!draftMessage.trim() && !composerAttachments.length) ||
            isUploadingAttachments
          }
          onClick={handleSendMessage}
          type="button"
        >
          <span className="material-symbols-outlined">
            {isUploadingAttachments ? "sync" : "send"}
          </span>
        </button>
      </div>
    </div>
  );
}
