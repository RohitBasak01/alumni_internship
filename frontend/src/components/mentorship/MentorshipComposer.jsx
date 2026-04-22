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
  isQuickMenuOpen,
  setIsQuickMenuOpen,
  isEmojiPickerOpen,
  setIsEmojiPickerOpen,
  quickInsertActions,
  handleQuickInsert,
  reactionChoices,
  handleReactionInsert,
}) {
  return (
    <div className="member-message-composer-wrap">
      {replyToMessage && (
        <div className="member-compose-reply">
          <div className="member-compose-reply-copy">
            <span>Replying to <strong>{replyToMessage.senderName}</strong></span>
            <p>{replyToMessage.content}</p>
          </div>
          <button className="member-message-action icon-only" onClick={clearReplyToMessage} type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {composerAttachments.length > 0 && (
        <div className="member-compose-attachments">
          {composerAttachments.map((file) => (
            <div key={file.id} className="member-compose-attachment">
              <span className="material-symbols-outlined">
                {file.isImage ? "image" : "description"}
              </span>
              <div className="member-compose-attachment-copy">
                <strong>{file.name}</strong>
                <small>{(file.size / 1024).toFixed(1)} KB</small>
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
      )}

      {attachmentUploadError && (
        <div className="member-composer-error">
          <span className="material-symbols-outlined">error</span>
          <p>{attachmentUploadError}</p>
        </div>
      )}

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
            {isEmojiPickerOpen && (
              <div className="member-toolbar-popover compact">
                {reactionChoices.map((emoji) => (
                  <button key={emoji} onClick={() => handleReactionInsert(emoji)} type="button">
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="member-composer-menu-wrap">
            <button
              className="member-message-action icon-only"
              onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
              title="Quick actions"
              type="button"
            >
              <span className="material-symbols-outlined">bolt</span>
            </button>
            {isQuickMenuOpen && (
              <div className="member-toolbar-popover">
                {quickInsertActions.map((action) => (
                  <button key={action.id} onClick={() => handleQuickInsert(action)} type="button">
                    <span className="material-symbols-outlined">subdirectory_arrow_right</span>
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <textarea
          disabled={!canSendMessage}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={canSendMessage ? "Write a message..." : "Messaging disabled"}
          rows="1"
          value={draftMessage}
          onChange={(e) => setDraftMessage(e.target.value)}
        />

        <button
          className="member-send-button"
          disabled={!canSendMessage || (!draftMessage.trim() && !composerAttachments.length) || isUploadingAttachments}
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
