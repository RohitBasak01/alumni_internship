import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";

import { PortalSearchField } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createGroupConversation,
  fetchAlumni,
  fetchMentorshipRequests,
  leaveGroupConversation,
  sendMentorshipMessage,
  updateMentorshipRequest
} from "../lib/api.js";

function formatTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
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
    label: "Profile Link",
    value: "Here is my profile for context: "
  }
];

const emojiChoices = ["🙂", "👏", "🎉", "🔥", "💡", "🚀", "🙏", "😊"];

const initialGroupForm = {
  groupName: "",
  initialMessage: "",
  memberUserIds: []
};

function MentorshipPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const deferredSearch = useDeferredValue(search);
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["mentorship-requests"],
    queryFn: fetchMentorshipRequests,
    enabled: auth.user?.role === "alumni"
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
    mutationFn: ({ id, content }) => sendMentorshipMessage(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      setDraftMessage("");
      setIsQuickMenuOpen(false);
      setIsEmojiPickerOpen(false);
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: createGroupConversation,
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      setActiveId(conversation._id);
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

  const conversations = useMemo(() => {
    return data.map((item) => {
      if (item.conversationType === "group") {
        return {
          _id: item._id,
          type: "group",
          name: item.groupName || "Untitled Group",
          preview: item.messages?.[item.messages.length - 1]?.content || item.message || "Group created",
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
          admins: item.admins || []
        };
      }

      const isMentor = item.mentor?._id === auth.user?.id;
      const partner = isMentor ? item.requester : item.mentor;
      return {
        _id: item._id,
        type: "direct",
        name: partner?.name || "Alumni Contact",
        preview: item.messages?.[item.messages.length - 1]?.content || item.message,
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
        mentor: item.mentor
      };
    });
  }, [auth.user?.id, data]);

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

  const groupCandidateMembers = useMemo(
    () => alumni.filter((item) => item.userId !== auth.user?.id && item.isActive),
    [alumni, auth.user?.id]
  );

  const canCreateGroup =
    groupForm.groupName.trim().length > 0 && groupForm.memberUserIds.length > 0 && !createGroupMutation.isPending;

  function handleSendMessage() {
    const content = draftMessage.trim();

    if (!activeConversation || !content) {
      return;
    }

    sendMessageMutation.mutate({
      id: activeConversation._id,
      content
    });
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

  function handleEmojiInsert(emoji) {
    appendToDraft(emoji);
    setIsEmojiPickerOpen(false);
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

  if (auth.user?.role !== "alumni") {
    return (
      <SectionCard title="Mentorship" subtitle="Portal Access">
        <p className="muted">Mentorship requests are available for alumni accounts.</p>
      </SectionCard>
    );
  }

  return (
    <div className="messages-page">
      <aside className="messages-sidebar">
        <div className="messages-sidebar-header">
          <div className="messages-sidebar-topline">
            <h1>Messages</h1>
            <button
              className="button primary compact"
              onClick={() => setIsCreateGroupOpen((current) => !current)}
              type="button"
            >
              New Group
            </button>
          </div>
          <PortalSearchField
            className="messages-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations..."
            value={search}
          />
        </div>

        {isCreateGroupOpen ? (
          <section className="messages-group-builder">
            <strong>Create Group Chat</strong>
            <input
              name="groupName"
              onChange={handleGroupFormChange}
              placeholder="Group name"
              value={groupForm.groupName}
            />
            <textarea
              className="textarea"
              name="initialMessage"
              onChange={handleGroupFormChange}
              placeholder="Optional welcome message"
              rows="3"
              value={groupForm.initialMessage}
            />
            <div className="messages-group-member-list">
              {groupCandidateMembers.map((member) => (
                <label className="messages-group-member" key={member._id}>
                  <input
                    checked={groupForm.memberUserIds.includes(member.userId)}
                    onChange={() => toggleGroupMember(member.userId)}
                    type="checkbox"
                  />
                  <div>
                    <strong>{member.name}</strong>
                    <span>{member.designation || "Alumni Member"}</span>
                  </div>
                </label>
              ))}
              {!groupCandidateMembers.length ? (
                <p className="muted">No other active alumni are available to add yet.</p>
              ) : null}
            </div>
            <div className="messages-group-actions">
              <button
                className="button secondary compact"
                onClick={() => {
                  setGroupForm(initialGroupForm);
                  setIsCreateGroupOpen(false);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button primary compact"
                disabled={!canCreateGroup}
                onClick={handleCreateGroup}
                type="button"
              >
                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
              </button>
            </div>
            {createGroupMutation.isError ? <p className="error-text">{createGroupMutation.error.message}</p> : null}
          </section>
        ) : null}

        {isLoading ? <p>Loading conversations...</p> : null}
        {isError ? <p className="error-text">{error.message}</p> : null}
        {!isLoading && !filteredConversations.length ? (
          <p className="muted">No conversations found.</p>
        ) : null}

        <div className="messages-conversation-list">
          {filteredConversations.map((item) => (
            <button
              className={item._id === activeConversation?._id ? "messages-thread active" : "messages-thread"}
              key={item._id}
              onClick={() => setActiveId(item._id)}
              type="button"
            >
              <div className={`messages-thread-avatar ${item.type === "group" ? "group" : ""}`}>
                {item.type === "group"
                  ? "GR"
                  : item.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                {item.online ? <span className="messages-thread-status" /> : null}
              </div>
              <div className="messages-thread-copy">
                <div className="messages-thread-head">
                  <strong>{item.name}</strong>
                  <span>{item.when}</span>
                </div>
                <p>{item.preview}</p>
                {item.type === "group" ? (
                  <span className="messages-thread-meta">{item.members.length} members</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="messages-panel">
        {activeConversation ? (
          <>
            <header className="messages-panel-header">
              <div className="messages-panel-profile">
                <div className={`messages-panel-avatar ${activeConversation.type === "group" ? "group" : ""}`}>
                  {activeConversation.type === "group"
                    ? "GR"
                    : activeConversation.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                </div>
                <div>
                  <strong>{activeConversation.name}</strong>
                  <p>
                    {activeConversation.type === "group"
                      ? `${activeConversation.members.length} members`
                      : activeConversation.online
                        ? "Online"
                        : activeConversation.status}
                  </p>
                </div>
              </div>

              <div className="messages-panel-actions">
                {activeConversation.type === "group" ? (
                  <button
                    disabled={leaveGroupMutation.isPending}
                    onClick={() => leaveGroupMutation.mutate(activeConversation._id)}
                    type="button"
                  >
                    {leaveGroupMutation.isPending ? "Leaving..." : "Leave Group"}
                  </button>
                ) : (
                  <>
                    <button type="button">Call</button>
                    <button type="button">Video</button>
                    <button type="button">Info</button>
                  </>
                )}
              </div>
            </header>

            {activeConversation.type === "group" ? (
              <div className="messages-group-summary">
                <strong>Members</strong>
                <div className="messages-group-member-chips">
                  {activeConversation.members.map((member) => (
                    <span className="messages-group-chip" key={member._id}>
                      {member.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="messages-panel-body">
              <span className="messages-day-pill">
                {activeConversation.type === "group" ? "Group Chat" : "Today"}
              </span>

              {activeConversation.messages.length ? (
                activeConversation.messages.map((message) => {
                  const isOutgoing = message.sender?._id === auth.user?.id;
                  return (
                    <div className={`messages-bubble-row ${isOutgoing ? "outgoing" : "incoming"}`} key={message._id}>
                      {!isOutgoing ? (
                        <div className="messages-bubble-avatar">
                          {(message.sender?.name || activeConversation.name).slice(0, 1)}
                        </div>
                      ) : null}
                      <div className="messages-bubble-wrap">
                        {!isOutgoing && activeConversation.type === "group" ? (
                          <strong className="messages-bubble-sender">{message.sender?.name || "Member"}</strong>
                        ) : null}
                        <div className={`messages-bubble ${isOutgoing ? "outgoing" : "incoming"}`}>{message.content}</div>
                        <span className="messages-bubble-time">{formatTime(message.sentAt)}</span>
                      </div>
                      {isOutgoing ? (
                        <div className="messages-bubble-avatar self">{auth.user?.name?.slice(0, 1) || "Y"}</div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="muted">No messages yet.</p>
              )}
            </div>

            <footer className="messages-composer">
              <div className="messages-composer-tool">
                <button
                  aria-expanded={isQuickMenuOpen}
                  aria-label="Open quick insert menu"
                  className="messages-composer-icon"
                  onClick={() => {
                    setIsQuickMenuOpen((current) => !current);
                    setIsEmojiPickerOpen(false);
                  }}
                  type="button"
                >
                  +
                </button>
                {isQuickMenuOpen ? (
                  <div className="messages-composer-popover">
                    {quickInsertActions.map((action) => (
                      <button
                        className="messages-popover-item"
                        key={action.id}
                        onClick={() => handleQuickInsert(action)}
                        type="button"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="messages-composer-tool">
                <button
                  aria-expanded={isEmojiPickerOpen}
                  aria-label="Open emoji picker"
                  className="messages-composer-icon"
                  onClick={() => {
                    setIsEmojiPickerOpen((current) => !current);
                    setIsQuickMenuOpen(false);
                  }}
                  type="button"
                >
                  :)
                </button>
                {isEmojiPickerOpen ? (
                  <div className="messages-composer-popover messages-composer-popover-emoji">
                    {emojiChoices.map((emoji) => (
                      <button
                        className="messages-emoji-button"
                        key={emoji}
                        onClick={() => handleEmojiInsert(emoji)}
                        type="button"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <input
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  activeConversation.type === "group"
                    ? "Message the group..."
                    : activeConversation.status === "declined"
                      ? "This mentorship request was declined"
                      : activeConversation.status === "pending"
                        ? "Wait for the recipient to accept this chat request"
                        : "Type a message..."
                }
                value={draftMessage}
              />
              <button
                className="messages-send"
                disabled={
                  sendMessageMutation.isPending ||
                  !draftMessage.trim() ||
                  activeConversation.status === "declined" ||
                  (activeConversation.type !== "group" && activeConversation.status === "pending")
                }
                onClick={handleSendMessage}
                type="button"
              >
                Send
              </button>
            </footer>

            {activeConversation.type === "direct" && activeConversation.incoming && activeConversation.status === "pending" ? (
              <div className="messages-request-actions">
                <button
                  className="button primary compact"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: activeConversation._id, status: "accepted" })}
                  type="button"
                >
                  Accept Chat
                </button>
                <button
                  className="button secondary compact"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: activeConversation._id, status: "declined" })}
                  type="button"
                >
                  Decline Chat
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p className="muted">No conversation selected. Start by creating a mentorship request or group chat.</p>
          </div>
        )}

        {updateMutation.isError ? <p className="error-text">{updateMutation.error.message}</p> : null}
        {sendMessageMutation.isError ? <p className="error-text">{sendMessageMutation.error.message}</p> : null}
        {leaveGroupMutation.isError ? <p className="error-text">{leaveGroupMutation.error.message}</p> : null}
      </section>
    </div>
  );
}

export default MentorshipPage;
