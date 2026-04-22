export function CreateGroupModal({
  isOpen,
  onClose,
  groupForm,
  setGroupForm,
  groupCandidateMembers,
  createGroupMutation,
  getInitials
}) {
  if (!isOpen) return null;

  return (
    <div className="member-dialog-backdrop">
      <div className="member-dialog">
        <div className="member-dialog-header">
          <h2>Create Group Conversation</h2>
          <button className="button secondary compact icon-only" onClick={onClose} type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="member-dialog-body">
          <div className="member-field">
            <label>Group Name</label>
            <input
              placeholder="E.g. Study Group 2024"
              value={groupForm.groupName}
              onChange={(e) => setGroupForm({ ...groupForm, groupName: e.target.value })}
            />
          </div>

          <div className="member-field">
            <label>Initial Message</label>
            <textarea
              placeholder="Hi everyone! Starting this group to..."
              rows="3"
              value={groupForm.initialMessage}
              onChange={(e) => setGroupForm({ ...groupForm, initialMessage: e.target.value })}
            />
          </div>

          <div className="member-field">
            <label>Select Members ({groupForm.memberUserIds.length})</label>
            <div className="member-group-member-picker">
              {groupCandidateMembers.map((person) => {
                const isSelected = groupForm.memberUserIds.includes(person.userId);
                return (
                  <button
                    key={person.userId}
                    className={`member-picker-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      const next = isSelected
                        ? groupForm.memberUserIds.filter((id) => id !== person.userId)
                        : [...groupForm.memberUserIds, person.userId];
                      setGroupForm({ ...groupForm, memberUserIds: next });
                    }}
                    type="button"
                  >
                    <div className="member-picker-avatar">{getInitials(person.name)}</div>
                    <div className="member-picker-copy">
                      <strong>{person.name}</strong>
                      <small>{person.headline}</small>
                    </div>
                    {isSelected && <span className="material-symbols-outlined">check_circle</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="member-dialog-footer">
          <button className="button secondary" onClick={onClose} type="button">Cancel</button>
          <button
            className="button primary"
            disabled={!groupForm.groupName.trim() || !groupForm.memberUserIds.length || createGroupMutation.isPending}
            onClick={() => createGroupMutation.mutate(groupForm)}
            type="button"
          >
            {createGroupMutation.isPending ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EncryptionPanel({
  isOpen,
  onClose,
  conversationSecretInput,
  setConversationSecretInput,
  saveConversationSecret,
  clearConversationSecret,
  conversationKeyFingerprint,
  isConversationKeyVerified,
  markConversationSecretVerified,
  isE2eeInitializing,
  error
}) {
  if (!isOpen) return null;

  return (
    <div className="member-chat-drawer">
      <div className="member-chat-drawer-header">
        <h3>Secure Channel Settings</h3>
        <button className="button secondary compact icon-only" onClick={onClose} type="button">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="member-chat-drawer-body">
        <p className="member-drawer-help">
          Conversations are secured with end-to-end encryption. Only participants with the conversation key can read messages.
        </p>

        {error && <div className="member-composer-error"><p>{error}</p></div>}

        <div className="member-field">
          <label>Conversation Secret Key</label>
          <div className="member-encryption-panel-row">
            <input
              placeholder="Enter or generate key..."
              type="password"
              value={conversationSecretInput}
              onChange={(e) => setConversationSecretInput(e.target.value)}
            />
            <button className="button secondary compact" onClick={saveConversationSecret} type="button">
              Save
            </button>
          </div>
        </div>

        {conversationKeyFingerprint && (
          <div className="member-field">
            <label>Key Fingerprint</label>
            <div className="member-fingerprint-box">
              <code>{conversationKeyFingerprint}</code>
              {isConversationKeyVerified ? (
                <span className="verified-badge">
                  <span className="material-symbols-outlined">verified</span> Verified
                </span>
              ) : (
                <button className="link-button" onClick={markConversationSecretVerified} type="button">
                  Verify Key
                </button>
              )}
            </div>
          </div>
        )}

        <div className="member-drawer-actions">
          <button className="button secondary danger compact" onClick={clearConversationSecret} type="button">
            Reset Device Key
          </button>
        </div>
      </div>
    </div>
  );
}
