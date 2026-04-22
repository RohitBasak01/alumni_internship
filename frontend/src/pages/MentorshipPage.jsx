import { useQueryClient } from "@tanstack/react-query";
import { PortalMetricCard, PortalMetricGrid, PortalPageHeader } from "../components/PortalPrimitives.jsx";
import { MentorshipSidebar } from "../components/mentorship/MentorshipSidebar.jsx";
import { MentorshipChat } from "../components/mentorship/MentorshipChat.jsx";
import { CreateGroupModal } from "../components/mentorship/MentorshipModals.jsx";
import "../components/mentorship/Mentorship.css";
import { useMentorship } from "../hooks/useMentorship.js";
import { useMentorshipE2EE } from "../hooks/useMentorshipE2EE.js";
import { useMentorshipSocket } from "../hooks/useMentorshipSocket.js";

const reactionChoices = ["😀", "😂", "❤️", "🎉", "👏", "🙏"];

export default function MentorshipPage() {
  const queryClient = useQueryClient();
  const mentorship = useMentorship();
  const e2ee = useMentorshipE2EE(mentorship.auth, mentorship.activeConversation);
  
  // Real-time
  useMentorshipSocket(mentorship.auth, mentorship.conversations);

  const acceptedCount = mentorship.conversations.filter(c => c.status === "accepted" || c.type === "group").length;
  const pendingCount = mentorship.conversations.filter(c => c.type === "direct" && c.status === "pending").length;

  const getThreadStatus = (item) => {
    if (item.type === "group") return { label: "Group", className: "status-active" };
    if (item.status === "pending") return { label: "Pending", className: "status-pending" };
    if (item.status === "declined") return { label: "Declined", className: "status-declined" };
    return { label: "Active", className: "status-accepted" };
  };

  const getInitials = (name) => {
    return String(name || "").trim().split(/\s+/).map(p => p[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "??";
  };

  const transmitPendingMessage = async (conversationId, pendingMessage) => {
    try {
      await mentorship.sendMessageMutation.mutateAsync({
        id: conversationId,
        content: pendingMessage.encryptedContent ?? pendingMessage.content,
        clientId: pendingMessage.clientId,
        attachments: pendingMessage.attachments || [],
        replyToMessageId: pendingMessage.replyTo?.messageId || null
      });
      mentorship.removePendingMessage(conversationId, m => m._id === pendingMessage._id);
    } catch (error) {
      mentorship.updatePendingMessage(conversationId, m => m._id === pendingMessage._id, m => ({
        ...m, delivery: { status: "failed" }, errorMessage: error?.message || "Failed to send"
      }));
    }
  };

  const handleReactionToggle = (conversationId, messageId, emoji) => {
    mentorship.reactionMutation.mutate({ id: conversationId, messageId, emoji });
  };

  if (mentorship.isLoading) {
    return (
      <div className="portal-page-content">
        <PortalPageHeader title="Mentorship & Networking" />
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
        description="Connect with alumni, seek mentorship, and build professional relationships."
        title="Mentorship & Networking"
      />

      <div className="portal-page-section">
        <PortalMetricGrid>
          <PortalMetricCard
            icon="forum"
            title="Total Conversations"
            trend={acceptedCount > 0 ? `+${acceptedCount}` : null}
            value={mentorship.conversations.length}
          />
          <PortalMetricCard
            icon="person_add"
            title="Pending Requests"
            trend={pendingCount > 0 ? `${pendingCount} new` : null}
            value={pendingCount}
          />
          <PortalMetricCard
            icon="verified_user"
            title="Secure Channels"
            value={mentorship.conversations.filter(c => c.e2ee?.envelopes?.length > 0).length}
          />
        </PortalMetricGrid>
      </div>

      <div className={`member-messages-shell ${mentorship.isMobileViewport ? "mobile-view" : ""} ${mentorship.isMobileThreadListOpen ? "mobile-sidebar-open" : "mobile-sidebar-closed"}`}>
        <MentorshipSidebar
          activeId={mentorship.activeId}
          conversations={mentorship.filteredConversations}
          getInitials={getInitials}
          getThreadStatus={getThreadStatus}
          isMobileViewport={mentorship.isMobileViewport}
          search={mentorship.search}
          setActiveId={mentorship.setActiveId}
          setIsCreateGroupOpen={mentorship.setIsCreateGroupOpen}
          setIsMobileThreadListOpen={mentorship.setIsMobileThreadListOpen}
          setSearch={mentorship.setSearch}
        />

        <MentorshipChat
          activeConversation={mentorship.activeConversation}
          auth={mentorship.auth}
          conversationKeyFingerprint={e2ee.conversationKeyFingerprint}
          conversationSecret={e2ee.conversationSecret}
          conversationSecretInput={e2ee.conversationSecretInput}
          handleReactionToggle={handleReactionToggle}
          isConversationKeyVerified={e2ee.isConversationKeyVerified}
          isE2eeInitializing={e2ee.isE2eeInitializing}
          isMobileViewport={mentorship.isMobileViewport}
          isRealtimeConnected={true} // Simplified
          markReadMutation={mentorship.markReadMutation}
          pendingActiveMessages={mentorship.pendingMessagesByConversation[mentorship.activeConversation?._id] || []}
          queryClient={queryClient}
          reactionChoices={reactionChoices}
          removePendingMessage={mentorship.removePendingMessage}
          saveSecret={e2ee.saveSecret}
          setConversationSecretInput={e2ee.setConversationSecretInput}
          setIsMobileThreadListOpen={mentorship.setIsMobileThreadListOpen}
          transmitPendingMessage={transmitPendingMessage}
          updatePendingMessage={mentorship.updatePendingMessage}
          verifySecret={e2ee.verifySecret}
        />
      </div>

      <CreateGroupModal
        createGroupMutation={mentorship.createGroupMutation}
        getInitials={getInitials}
        groupCandidateMembers={mentorship.alumni}
        groupForm={mentorship.groupForm}
        isOpen={mentorship.isCreateGroupOpen}
        setGroupForm={mentorship.setGroupForm}
        onClose={() => mentorship.setIsCreateGroupOpen(false)}
      />
    </div>
  );
}
