import { useQueryClient } from "@tanstack/react-query";
import {
  PortalMetricCard,
  PortalMetricGrid,
  PortalPageHeader,
} from "../components/PortalPrimitives.jsx";
import { MentorshipSidebar } from "../components/mentorship/MentorshipSidebar.jsx";
import { MentorshipChat } from "../components/mentorship/MentorshipChat.jsx";
import { CreateGroupModal } from "../components/mentorship/MentorshipModals.jsx";
import "../components/mentorship/Mentorship.css";
import { useAlumniConversations } from "../hooks/useMentorship.js";
import { useAlumniConversationE2EE } from "../hooks/useMentorshipE2EE.js";
import { useAlumniConversationSocket } from "../hooks/useMentorshipSocket.js";

const reactionChoices = ["😀", "😂", "❤️", "🎉", "👏", "🙏"];

export default function AlumniMessagesPage() {
  const queryClient = useQueryClient();
  const conversationsState = useAlumniConversations();
  const e2ee = useAlumniConversationE2EE(
    conversationsState.auth,
    conversationsState.activeConversation,
  );
  const realtime = useAlumniConversationSocket(
    conversationsState.auth,
    conversationsState.conversations,
  );

  const acceptedCount = conversationsState.conversations.filter(
    (conversation) =>
      conversation.status === "accepted" || conversation.type === "group",
  ).length;
  const pendingCount = conversationsState.conversations.filter(
    (conversation) =>
      conversation.type === "direct" && conversation.status === "pending",
  ).length;

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

  const handleReactionToggle = (conversationId, messageId, emoji) => {
    conversationsState.reactionMutation.mutate({
      id: conversationId,
      messageId,
      emoji,
    });
  };

  if (conversationsState.isLoading) {
    return (
      <div className="portal-page-content">
        <PortalPageHeader title="Alumni Messages" />
        <div className="member-messages-shell skeleton">
          <div className="skeleton-sidebar" />
          <div className="skeleton-main" />
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page-content">
      <PortalPageHeader
        description="Chat with fellow alumni, collaborate in groups, and stay connected across your alumni network."
        title="Alumni Messages"
      />

      <div className="portal-page-section">
        <PortalMetricGrid>
          <PortalMetricCard
            icon="forum"
            title="Total Conversations"
            trend={acceptedCount > 0 ? `+${acceptedCount}` : null}
            value={conversationsState.conversations.length}
          />
          <PortalMetricCard
            icon="person_add"
            title="Pending Chat Requests"
            trend={pendingCount > 0 ? `${pendingCount} new` : null}
            value={pendingCount}
          />
          <PortalMetricCard
            icon="verified_user"
            title="Secure Channels"
            value={
              conversationsState.conversations.filter(
                (conversation) => conversation.e2ee?.envelopes?.length > 0,
              ).length
            }
          />
        </PortalMetricGrid>
      </div>

      {conversationsState.isError ? (
        <p className="error-text">
          {conversationsState.error?.message || "Unable to load conversations."}
        </p>
      ) : null}

      <div
        className={`member-messages-shell alumni-messages-thread-section ${conversationsState.isMobileViewport ? "mobile-view" : ""} ${conversationsState.isMobileThreadListOpen ? "mobile-sidebar-open" : "mobile-sidebar-closed"}`}
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
        />

        {conversationsState.activeConversation ? (
          <MentorshipChat
            activeConversation={conversationsState.activeConversation}
            auth={conversationsState.auth}
            conversationKeyFingerprint={e2ee.conversationKeyFingerprint}
            conversationSecret={e2ee.conversationSecret}
            conversationSecretInput={e2ee.conversationSecretInput}
            fetchNextPage={conversationsState.fetchNextPage}
            handleReactionToggle={handleReactionToggle}
            hasNextPage={conversationsState.hasNextPage}
            isConversationKeyVerified={e2ee.isConversationKeyVerified}
            isE2eeInitializing={e2ee.isE2eeInitializing}
            isFetchingNextPage={conversationsState.isFetchingNextPage}
            isMessagesLoading={conversationsState.isMessagesLoading}
            isMobileViewport={conversationsState.isMobileViewport}
            isRealtimeConnected={realtime.isRealtimeConnected}
            editMessageMutation={conversationsState.editMessageMutation}
            deleteMessageMutation={conversationsState.deleteMessageMutation}
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
            queryClient={queryClient}
            reactionChoices={reactionChoices}
            removePendingMessage={conversationsState.removePendingMessage}
            saveSecret={e2ee.saveSecret}
            setConversationSecretInput={e2ee.setConversationSecretInput}
            setIsMobileThreadListOpen={
              conversationsState.setIsMobileThreadListOpen
            }
            transmitPendingMessage={transmitPendingMessage}
            updatePendingMessage={conversationsState.updatePendingMessage}
            verifySecret={e2ee.verifySecret}
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
    </div>
  );
}
