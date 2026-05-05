import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MentorshipSidebar } from "../components/mentorship/MentorshipSidebar.jsx";
import { MentorshipChat } from "../components/mentorship/MentorshipChat.jsx";
import { CreateGroupModal } from "../components/mentorship/MentorshipModals.jsx";
import { useMentorshipRTC } from "../hooks/useMentorshipRTC.js";
import { CallingOverlay } from "../components/mentorship/CallingOverlay.jsx";
import "../components/mentorship/Mentorship.css";
import { useAlumniConversations } from "../hooks/useMentorship.js";

import { useAlumniConversationSocket } from "../hooks/useMentorshipSocket.js";

const reactionChoices = ["😀", "😂", "❤️", "🎉", "👏", "🙏"];

function getConversationContact(conversation, currentUserId, getInitials) {
  if (!conversation) return null;

  if (conversation.conversationType === "group") {
    const groupName = conversation.groupName || "Unnamed Group";
    return {
      about: "Alumni group conversation",
      initials: getInitials(groupName),
      isGroup: true,
      meta: "Shared alumni network",
      name: groupName,
      status: `${conversation.members?.length || 0} members`,
    };
  }

  const currentId = String(currentUserId || "");
  const partner =
    String(conversation.requester?._id || conversation.requester?.id || "") ===
    currentId
      ? conversation.mentor
      : conversation.requester;

  const partnerName = partner?.name || "Alumni Contact";

  return {
    about:
      partner?.headline ||
      partner?.role ||
      partner?.currentRole ||
      "Alumni contact",
    initials: getInitials(partnerName),
    isGroup: false,
    meta:
      partner?.batch || partner?.graduationYear
        ? `Alumni - Batch of ${partner.batch || partner.graduationYear}`
        : "Alumni network member",
    name: partnerName,
    status: conversation.online ? "Online" : "Offline",
  };
}

export default function AlumniMessagesPage() {
  const queryClient = useQueryClient();
  const [isContactPanelVisible, setIsContactPanelVisible] = useState(false);
  const [toasts, setToasts] = useState([]);
  const conversationsState = useAlumniConversations();

  const realtime = useAlumniConversationSocket(
    conversationsState.auth,
    conversationsState.conversations,
  );

  const rtc = useMentorshipRTC(
    realtime.socket,
    conversationsState.auth,
    {
      _id: conversationsState.activeConversation?._id,
      partnerId: String(conversationsState.activeConversation?.requester?._id || conversationsState.activeConversation?.requester?.id) === String(conversationsState.auth.user?.id || conversationsState.auth.user?._id)
        ? conversationsState.activeConversation?.mentor?._id || conversationsState.activeConversation?.mentor?.id
        : conversationsState.activeConversation?.requester?._id || conversationsState.activeConversation?.requester?.id
    },
    null,
    (error) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message: error }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }
  );

  const getThreadStatus = (item) => {
    if (item.type === "group")
      return { label: "Group", className: "status-active" };
    if (item.status === "pending")
      return { label: "Pending", className: "status-pending" };
    if (item.status === "declined")
      return { label: "Declined", className: "status-declined" };
    return { label: "Active", className: "status-accepted" };
  };

  const getInitials = (name) =>
    String(name || "")
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";

  const transmitPendingMessage = async (conversationId, pendingMessage) => {
    conversationsState.setPendingMessagesByConversation((curr) => {
      const existing = curr[conversationId] || [];
      if (existing.some((item) => item._id === pendingMessage._id)) {
        return curr;
      }
      return {
        ...curr,
        [conversationId]: [...existing, pendingMessage],
      };
    });

    const payload = {
      id: conversationId,
      content: pendingMessage.encryptedContent ?? pendingMessage.content,
      clientId: pendingMessage.clientId,
      attachments: pendingMessage.attachments || [],
      replyToMessageId: pendingMessage.replyTo?.messageId || null,
    };

    const isRetryableSendError = (error) => {
      const status = Number(error?.status || error?.response?.status || 0);
      const message = String(error?.message || "").toLowerCase();

      if (!status) {
        return true;
      }

      if (
        status === 401 ||
        status === 403 ||
        status === 408 ||
        status === 409 ||
        status === 429
      ) {
        return true;
      }

      if (status >= 500) {
        return true;
      }

      return /csrf|network|timeout|temporar|session/i.test(message);
    };

    try {
      await conversationsState.sendMessageMutation.mutateAsync(payload);
      conversationsState.removePendingMessage(
        conversationId,
        (message) => message._id === pendingMessage._id,
      );
      return;
    } catch (error) {
      if (isRetryableSendError(error)) {
        try {
          await conversationsState.sendMessageMutation.mutateAsync(payload);
          conversationsState.removePendingMessage(
            conversationId,
            (message) => message._id === pendingMessage._id,
          );
          return;
        } catch (retryError) {
          error = retryError;
        }
      }

      conversationsState.updatePendingMessage(
        conversationId,
        (message) => message._id === pendingMessage._id,
        (message) => ({
          ...message,
          delivery: { status: "failed" },
          errorMessage: error?.message || "Failed to send",
        }),
      );
    }
  };

  const showToast = (message) => {
    const id = Date.now();
    setToasts((curr) => [...curr, { id, message }]);
    setTimeout(() => {
      setToasts((curr) => curr.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleUnimplemented = (feature) => {
    showToast(`${feature} is coming soon!`);
  };

  const handleToggleMute = async () => {
    if (!conversationsState.activeConversation) return;
    try {
      await conversationsState.toggleMuteMutation.mutateAsync(
        conversationsState.activeConversation._id,
      );
      showToast(
        conversationsState.activeConversation.isMuted
          ? "Notifications unmuted"
          : "Notifications muted",
      );
    } catch (err) {
      showToast("Failed to update mute settings");
    }
  };

  const handleToggleBlock = async () => {
    if (!conversationsState.activeConversation) return;
    const isBlocked = conversationsState.activeConversation.isBlocked;
    if (
      !isBlocked &&
      !window.confirm(
        "Are you sure you want to block this contact? You will no longer receive messages from them.",
      )
    ) {
      return;
    }

    try {
      await conversationsState.toggleBlockMutation.mutateAsync(
        conversationsState.activeConversation._id,
      );
      showToast(isBlocked ? "Contact unblocked" : "Contact blocked");
    } catch (err) {
      showToast("Failed to update block settings");
    }
  };

  const handleReactionToggle = (conversationId, messageId, emoji) => {
    conversationsState.reactionMutation.mutate({
      id: conversationId,
      messageId,
      emoji,
    });
  };

  if (conversationsState.isLoading) {
    return (
      <div className="portal-page-content messages-portal-page">
        <div className="member-messages-shell skeleton">
          <div className="skeleton-sidebar" />
          <div className="skeleton-main" />
        </div>
      </div>
    );
  }

  const contact = getConversationContact(
    conversationsState.activeConversation,
    conversationsState.auth.user?.id,
    getInitials,
  );

  return (
    <div className="portal-page-content messages-portal-page">
      {conversationsState.isError ? (
        <p className="error-text">
          {conversationsState.error?.message || "Unable to load conversations."}
        </p>
      ) : null}

      <div
        className={`member-messages-shell alumni-messages-thread-section ${conversationsState.isMobileViewport ? "mobile-view" : ""} ${conversationsState.isMobileThreadListOpen ? "mobile-sidebar-open" : "mobile-sidebar-closed"} ${!isContactPanelVisible ? "contact-panel-hidden" : ""}`}
      >
        <MentorshipSidebar
          activeId={conversationsState.activeId}
          conversations={conversationsState.filteredConversations}
          getInitials={getInitials}
          getThreadStatus={getThreadStatus}
          isMobileViewport={conversationsState.isMobileViewport}
          search={conversationsState.search}
          setActiveId={conversationsState.setActiveId}
          setIsCreateGroupOpen={conversationsState.setIsCreateGroupOpen}
          setIsMobileThreadListOpen={
            conversationsState.setIsMobileThreadListOpen
          }
          setSearch={conversationsState.setSearch}
          activeFilter={conversationsState.activeFilter}
          setActiveFilter={conversationsState.setActiveFilter}
        />

        {conversationsState.activeConversation ? (
          <MentorshipChat
            activeConversation={conversationsState.activeConversation}
            auth={conversationsState.auth}
            fetchNextPage={conversationsState.fetchNextPage}
            handleReactionToggle={handleReactionToggle}
            hasNextPage={conversationsState.hasNextPage}
            isFetchingNextPage={conversationsState.isFetchingNextPage}
            isMessagesLoading={conversationsState.isMessagesLoading}
            isMobileViewport={conversationsState.isMobileViewport}
            isRealtimeConnected={realtime.isRealtimeConnected}
            isContactPanelVisible={isContactPanelVisible}
            setIsContactPanelVisible={setIsContactPanelVisible}
            editMessageMutation={conversationsState.editMessageMutation}
            deleteMessageMutation={conversationsState.deleteMessageMutation}
            clearMessagesMutation={conversationsState.clearMessagesMutation}
            markReadMutation={conversationsState.markReadMutation}
            updateGroupMemberRoleMutation={
              conversationsState.updateGroupMemberRoleMutation
            }
            muteGroupMemberMutation={conversationsState.muteGroupMemberMutation}
            unmuteGroupMemberMutation={
              conversationsState.unmuteGroupMemberMutation
            }
            removeGroupMemberMutation={
              conversationsState.removeGroupMemberMutation
            }
            leaveGroupMutation={conversationsState.leaveGroupMutation}
            pendingActiveMessages={
              conversationsState.pendingMessagesByConversation[
                conversationsState.activeConversation?._id
              ] || []
            }
            reactionChoices={reactionChoices}
            removePendingMessage={conversationsState.removePendingMessage}
            setIsMobileThreadListOpen={
              conversationsState.setIsMobileThreadListOpen
            }
            transmitPendingMessage={transmitPendingMessage}
            updatePendingMessage={conversationsState.updatePendingMessage}
            rtc={rtc}
          />
        ) : (
          <main className="member-messages-panel">
            <div
              className="member-messages-empty-state"
              style={{ minHeight: "260px" }}
            >
              <span className="material-symbols-outlined">chat</span>
              <p>No conversation selected.</p>
              <small className="muted">
                Start a group or begin an alumni chat from the alumni directory
                to see messages here.
              </small>
            </div>
          </main>
        )}

        {contact ? (
          <aside className={`member-contact-panel ${!isContactPanelVisible ? "hidden" : ""}`} aria-label="Contact info">
            <div className="member-contact-panel-header">
              <h2>Contact info</h2>
              <button className="member-contact-icon-button" onClick={() => setIsContactPanelVisible(false)} type="button">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="member-contact-identity">
              <div className="member-contact-avatar">
                {contact.isGroup ? (
                  <span className="material-symbols-outlined">groups</span>
                ) : (
                  contact.initials
                )}
                {!contact.isGroup &&
                conversationsState.activeConversation?.online ? (
                  <span className="member-contact-online" />
                ) : null}
              </div>
              <strong>{contact.name}</strong>
              <span>{contact.status}</span>
            </div>

            <div className="member-contact-actions">
              <button onClick={() => rtc.startCall("audio")} type="button">
                <span className="material-symbols-outlined">call</span>
                Audio
              </button>
              <button onClick={() => rtc.startCall("video")} type="button">
                <span className="material-symbols-outlined">videocam</span>
                Video
              </button>
              <button onClick={() => handleUnimplemented("In-chat search")} type="button">
                <span className="material-symbols-outlined">search</span>
                Search
              </button>
              <button onClick={() => handleUnimplemented("More options")} type="button">
                <span className="material-symbols-outlined">more_horiz</span>
                More
              </button>
            </div>

            <section className="member-contact-card">
              <h3>About</h3>
              <p>{contact.about}</p>
              <span>{contact.meta}</span>
            </section>

            <section className="member-contact-card">
              <div className="member-contact-card-head">
                <h3>Media, links and docs</h3>
                <button onClick={() => handleUnimplemented("Media gallery")} type="button">See all</button>
              </div>
              <div className="member-contact-media-grid">
                {(conversationsState.activeConversation?.messages || [])
                  .flatMap((m) => m.attachments || [])
                  .slice(0, 4)
                  .map((att, idx, arr) => {
                    const isLast = idx === 3;
                    const totalCount = (conversationsState.activeConversation?.messages || [])
                      .flatMap((m) => m.attachments || []).length;
                    
                    if (att.mimeType?.startsWith("image/")) {
                      return (
                        <div key={att.url || idx} className={isLast ? "more-tile" : ""}>
                          <img src={att.url} alt="Attachment" />
                          {isLast && totalCount > 4 && `+${totalCount - 4}`}
                        </div>
                      );
                    }
                    return (
                      <div key={att.url || idx} className={isLast ? "more-tile" : ""}>
                        <span className="material-symbols-outlined">
                          {att.mimeType?.includes("pdf") ? "picture_as_pdf" : "description"}
                        </span>
                        {isLast && totalCount > 4 && `+${totalCount - 4}`}
                      </div>
                    );
                  })}
                {!(conversationsState.activeConversation?.messages || []).some(m => m.attachments?.length) && (
                  <p className="muted" style={{ gridColumn: 'span 3', fontSize: '0.8rem' }}>No media shared yet.</p>
                )}
              </div>
            </section>

            <section className="member-contact-card compact">
              <button onClick={() => handleUnimplemented("Starred messages")} type="button">
                <span className="material-symbols-outlined">star</span>
                Starred messages
              </button>
              <button onClick={handleToggleMute} type="button">
                <span className="material-symbols-outlined">
                  {conversationsState.activeConversation?.isMuted ? "notifications" : "notifications_off"}
                </span>
                {conversationsState.activeConversation?.isMuted ? "Unmute notifications" : "Mute notifications"}
                <span className={`member-contact-toggle ${conversationsState.activeConversation?.isMuted ? "active" : ""}`} />
              </button>
              <button onClick={() => handleUnimplemented("Disappearing messages")} type="button">
                <span className="material-symbols-outlined">timer</span>
                Disappearing messages
                <strong>Off</strong>
              </button>
              <button className="danger" onClick={handleToggleBlock} type="button">
                <span className="material-symbols-outlined">
                  {conversationsState.activeConversation?.isBlocked ? "undo" : "block"}
                </span>
                {conversationsState.activeConversation?.isBlocked ? "Unblock contact" : "Block contact"}
              </button>
            </section>
          </aside>
        ) : null}
      </div>

      <CreateGroupModal
        createGroupMutation={conversationsState.createGroupMutation}
        getInitials={getInitials}
        groupCandidateMembers={conversationsState.alumni}
        groupForm={conversationsState.groupForm}
        isOpen={conversationsState.isCreateGroupOpen}
        setGroupForm={conversationsState.setGroupForm}
        onClose={() => conversationsState.setIsCreateGroupOpen(false)}
      />

      <CallingOverlay
        callState={rtc.callState}
        incomingCallData={rtc.incomingCallData}
        localStream={rtc.localStream}
        remoteStream={rtc.remoteStream}
        onAccept={rtc.answerCall}
        onReject={rtc.rejectCall}
        onEnd={rtc.endCall}
        isAudioOnly={rtc.isAudioOnly}
      />

      {toasts.map((t) => (
        <div key={t.id} className="member-toast">
          <span className="material-symbols-outlined">info</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
