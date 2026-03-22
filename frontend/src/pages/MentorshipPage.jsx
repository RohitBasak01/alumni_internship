import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";

import { PortalSearchField } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchMentorshipRequests, sendMentorshipMessage, updateMentorshipRequest } from "../lib/api.js";

function formatTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function MentorshipPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [draftMessage, setDraftMessage] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["mentorship-requests"],
    queryFn: fetchMentorshipRequests,
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
    }
  });

  const conversations = useMemo(() => {
    const mapped = data.map((item) => {
      const isMentor = item.mentor?._id === auth.user?.id;
      const partner = isMentor ? item.requester : item.mentor;
      return {
        _id: item._id,
        name: partner?.name || "Alumni Contact",
        preview: item.messages?.[item.messages.length - 1]?.content || item.message,
        status: item.status,
        when: new Date(item.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric"
        }),
        online: item.status === "accepted",
        incoming: isMentor,
        messages: item.messages || [],
        createdAt: item.createdAt
      };
    });

    return mapped;
  }, [auth.user?.id, data]);

  const filteredConversations = useMemo(() => {
    if (!deferredSearch) {
      return conversations;
    }

    const query = deferredSearch.toLowerCase();
    return conversations.filter(
      (item) =>
        item.name.toLowerCase().includes(query) || item.preview.toLowerCase().includes(query)
    );
  }, [conversations, deferredSearch]);

  const activeConversation =
    filteredConversations.find((item) => item._id === activeId) || filteredConversations[0] || null;

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
          <h1>Messages</h1>
          <PortalSearchField
            className="messages-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations..."
            value={search}
          />
        </div>

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
              <div className="messages-thread-avatar">
                {item.name
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
                <div className="messages-panel-avatar">
                  {activeConversation.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <strong>{activeConversation.name}</strong>
                  <p>{activeConversation.online ? "Online" : activeConversation.status}</p>
                </div>
              </div>

              <div className="messages-panel-actions">
                <button type="button">Call</button>
                <button type="button">Video</button>
                <button type="button">Info</button>
              </div>
            </header>

            <div className="messages-panel-body">
              <span className="messages-day-pill">Today</span>

              {activeConversation.messages.length ? (
                activeConversation.messages.map((message) => {
                  const isOutgoing = message.sender?._id === auth.user?.id;
                  return (
                    <div className={`messages-bubble-row ${isOutgoing ? "outgoing" : "incoming"}`} key={message._id}>
                      {!isOutgoing ? (
                        <div className="messages-bubble-avatar">{activeConversation.name.slice(0, 1)}</div>
                      ) : null}
                      <div className="messages-bubble-wrap">
                        <div className={`messages-bubble ${isOutgoing ? "outgoing" : "incoming"}`}>{message.content}</div>
                        <span>{formatTime(message.sentAt)}</span>
                      </div>
                      {isOutgoing ? <div className="messages-bubble-avatar self">{auth.user?.name?.slice(0, 1) || "Y"}</div> : null}
                    </div>
                  );
                })
              ) : (
                <p className="muted">No messages yet.</p>
              )}
            </div>

            <footer className="messages-composer">
              <button className="messages-composer-icon" type="button">
                +
              </button>
              <button className="messages-composer-icon" type="button">
                []
              </button>
              <input
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  activeConversation.status === "declined"
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
                  activeConversation.status === "pending"
                }
                onClick={handleSendMessage}
                type="button"
              >
                Send
              </button>
            </footer>

            {activeConversation.incoming && activeConversation.status === "pending" ? (
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
            <p className="muted">No conversation selected. Start by creating a mentorship request from the alumni directory.</p>
          </div>
        )}

        {updateMutation.isError ? <p className="error-text">{updateMutation.error.message}</p> : null}
        {sendMessageMutation.isError ? <p className="error-text">{sendMessageMutation.error.message}</p> : null}
      </section>
    </div>
  );
}

export default MentorshipPage;
