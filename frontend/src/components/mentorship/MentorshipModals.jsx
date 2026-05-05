function MemberStatusMeta({ member, isMuted }) {
  return (
    <div className="member-person-card-meta">
      <span>{member.company || member.currentInstitution || member.location || "Alumni member"}</span>
      <span>{isMuted ? "Muted" : "Can chat"}</span>
    </div>
  );
}

export function CreateGroupModal({
  isOpen,
  onClose,
  groupForm,
  setGroupForm,
  groupCandidateMembers,
  createGroupMutation,
  getInitials,
}) {
  if (!isOpen) return null;

  return (
    <div className="member-dialog-backdrop">
      <div className="member-dialog member-dialog-large">
        <div className="member-dialog-header">
          <h2>Create Alumni Group</h2>
          <button className="button secondary compact icon-only" onClick={onClose} type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="member-dialog-body">
          <div className="member-field">
            <label>Group Name</label>
            <input
              placeholder="Product founders circle"
              value={groupForm.groupName}
              onChange={(e) => setGroupForm({ ...groupForm, groupName: e.target.value })}
            />
          </div>

          <div className="member-field">
            <label>Opening Message</label>
            <textarea
              placeholder="Kick things off with context for the group..."
              rows="3"
              value={groupForm.initialMessage}
              onChange={(e) => setGroupForm({ ...groupForm, initialMessage: e.target.value })}
            />
          </div>

          <div className="member-field">
            <label>Select Members ({groupForm.memberUserIds.length})</label>
            <div className="member-group-member-picker">
              {groupCandidateMembers.map((person) => {
                const personId = person.userId?._id || person.userId;
                const isSelected = groupForm.memberUserIds.includes(personId);
                return (
                  <button
                    key={personId}
                    className={`member-picker-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      const next = isSelected
                        ? groupForm.memberUserIds.filter((id) => id !== personId)
                        : [...groupForm.memberUserIds, personId];
                      setGroupForm({ ...groupForm, memberUserIds: next });
                    }}
                    type="button"
                  >
                    <div className="member-picker-avatar">
                      {getInitials(person.name || person.userId?.name || "??")}
                    </div>
                    <div className="member-picker-copy">
                      <strong>{person.name || person.userId?.name || "Unknown Member"}</strong>
                      <small>
                        {person.designation ||
                          person.occupation ||
                          person.company ||
                          person.currentInstitution ||
                          "Alumni member"}
                      </small>
                    </div>
                    {isSelected ? (
                      <span className="material-symbols-outlined">check_circle</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="member-dialog-footer">
          <button className="button secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="button primary"
            disabled={
              !groupForm.groupName.trim() ||
              !groupForm.memberUserIds.length ||
              createGroupMutation.isPending
            }
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



export function GroupDetailsDrawer({
  isOpen,
  onClose,
  activeConversation,
  currentUserId,
  getInitials,
  updateGroupMemberRoleMutation,
  muteGroupMemberMutation,
  unmuteGroupMemberMutation,
  removeGroupMemberMutation,
  leaveGroupMutation,
}) {
  if (!isOpen || !activeConversation || activeConversation.type !== "group") return null;

  const currentUserRole = activeConversation.currentUserRole || "member";
  const isAdmin = currentUserRole === "admin";
  const mutedMembers = activeConversation.mutedMembers || [];

  return (
    <aside className="member-chat-drawer member-chat-drawer-wide">
      <div className="member-chat-drawer-header">
        <div>
          <h3>{activeConversation.name}</h3>
          <p>{activeConversation.members?.length || 0} alumni members</p>
        </div>
        <button className="button secondary compact icon-only" onClick={onClose} type="button">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="member-chat-drawer-body">
        <div className="member-drawer-card">
          <span className="member-drawer-kicker">Group details</span>
          <strong>{activeConversation.admins?.length || 0} admins managing this chat</strong>
          <p>
            Promote trusted people, mute noisy members temporarily, and remove
            access when needed.
          </p>
        </div>

        <div className="member-group-member-list">
          {(activeConversation.members || []).map((member) => {
            const memberId = member?._id;
            const roleEntry =
              memberId === currentUserId
                ? currentUserRole
                : activeConversation.admins?.some((admin) => admin?._id === memberId)
                  ? "admin"
                  : "member";
            const muteEntry = mutedMembers.find(
              (entry) => entry?.userId?._id === memberId,
            );

            return (
              <article className="member-person-card" key={memberId}>
                <div className="member-person-card-head">
                  <div className="member-person-card-avatar">{getInitials(member.name)}</div>
                  <div className="member-person-card-copy">
                    <strong>{member.name}</strong>
                    <span>{roleEntry}</span>
                    <MemberStatusMeta member={member} isMuted={Boolean(muteEntry)} />
                  </div>
                </div>

                {isAdmin && memberId !== currentUserId ? (
                  <div className="member-person-card-actions">
                    <select
                      className="select"
                      defaultValue={roleEntry}
                      onChange={(event) =>
                        updateGroupMemberRoleMutation.mutate({
                          conversationId: activeConversation._id,
                          userId: memberId,
                          role: event.target.value,
                        })
                      }
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                    {muteEntry ? (
                      <button
                        className="button secondary compact"
                        onClick={() =>
                          unmuteGroupMemberMutation.mutate({
                            conversationId: activeConversation._id,
                            userId: memberId,
                          })
                        }
                        type="button"
                      >
                        Unmute
                      </button>
                    ) : (
                      <button
                        className="button secondary compact"
                        onClick={() =>
                          muteGroupMemberMutation.mutate({
                            conversationId: activeConversation._id,
                            userId: memberId,
                            muteMinutes: 60,
                          })
                        }
                        type="button"
                      >
                        Mute 1h
                      </button>
                    )}
                    <button
                      className="button secondary compact danger"
                      onClick={() =>
                        removeGroupMemberMutation.mutate({
                          conversationId: activeConversation._id,
                          userId: memberId,
                        })
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ) : muteEntry ? (
                  <small className="member-muted-note">
                    Muted until {new Date(muteEntry.mutedUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </small>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="member-drawer-actions space-between">
          <span className="member-drawer-status">
            {isAdmin ? "You can manage roles and moderation in this group." : "You can leave this group anytime."}
          </span>
          <button
            className="button secondary danger"
            onClick={() => leaveGroupMutation.mutate(activeConversation._id)}
            type="button"
          >
            Leave Group
          </button>
        </div>
      </div>
    </aside>
  );
}
