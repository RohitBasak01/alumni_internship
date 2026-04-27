import { useMemo, useState } from "react";
import {
  PortalMetricCard,
  PortalMetricGrid,
  PortalPageHeader,
  PortalSegmentedTabs,
} from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { AlumniFilters } from "../components/AlumniFilters.jsx";
import { AlumniCard } from "../components/AlumniCard.jsx";
import "../styles/Directory.css";
import { useAlumniLogic } from "../hooks/useAlumniLogic.js";

function getDirectoryConfig(tenant) {
  const isSchool = tenant.institutionType === "school";
  return {
    isSchool,
    memberPlural: tenant.communityLabels.memberPlural || "Alumni",
    memberSingular: tenant.communityLabels.memberSingular || "Member",
    yearFieldLabel: isSchool ? "Leaving Year" : "Batch Year",
    educationFieldLabel: isSchool ? "Last Class Attended" : "Department",
    filterPlaceholder: isSchool
      ? "Search by name, email, institution, or location"
      : "Search by name, email, company, or role",
    roleFallback: isSchool ? "Community Member" : "Alumni Member",
    inviteTitle: isSchool ? "Invite Former Student" : "Invite Alumni",
    inviteButtonLabel: isSchool ? "Add Former Student" : "Add Alumni",
    approvalDescription: isSchool
      ? "Review former-student registrations."
      : "Review alumni registrations.",
  };
}

function TenantAlumniPage() {
  const {
    tenant,
    isAdmin,
    filters,
    setFilters,
    activeAdminTab,
    setActiveAdminTab,
    isInvitePanelOpen,
    setIsInvitePanelOpen,
    queries,
    mutations,
    derived,
  } = useAlumniLogic();
  const [selectedForChat, setSelectedForChat] = useState(null);
  const [chatMessage, setChatMessage] = useState(
    "Hi, I'd like to connect and start a conversation with you.",
  );
  const chatMutation = mutations.mentorship;

  const directoryConfig = useMemo(() => getDirectoryConfig(tenant), [tenant]);
  const isSchool = directoryConfig.isSchool;
  const resetFilters = () =>
    setFilters({
      q: "",
      batch: "",
      department: "",
      leavingYear: "",
      lastClassAttended: "",
      section: "",
      company: "",
      skill: "",
    });

  if (isAdmin) {
    return (
      <div className="member-directory-page admin-mode">
        <PortalPageHeader
          title={`Manage ${directoryConfig.memberPlural}`}
          subtitle={directoryConfig.approvalDescription}
          actions={
            <div className="member-inline-actions">
              <button
                className="button primary"
                onClick={() => setIsInvitePanelOpen(true)}
              >
                {directoryConfig.inviteButtonLabel}
              </button>
            </div>
          }
        />

        <PortalMetricGrid>
          <PortalMetricCard
            title="Total records"
            value={queries.alumni.data?.length || 0}
            icon="TR"
          />
          <PortalMetricCard
            title="Active members"
            value={derived.activeMembers.length}
            icon="AM"
          />
          <PortalMetricCard
            title="Pending approvals"
            value={derived.pendingApprovals.length}
            icon="PA"
          />
        </PortalMetricGrid>

        <PortalSegmentedTabs
          activeValue={activeAdminTab}
          items={[
            { value: "manage", label: "Roster" },
            {
              value: "approvals",
              label: `Approvals (${derived.pendingApprovals.length})`,
            },
          ]}
          onChange={setActiveAdminTab}
        />

        {activeAdminTab === "manage" && (
          <div className="member-directory-admin-grid">
            <AlumniFilters
              filters={filters}
              handleFilterChange={(e) =>
                setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))
              }
              clearFilters={resetFilters}
              isSchool={isSchool}
              directoryConfig={directoryConfig}
            />

            <div className="member-directory-grid admin-grid">
              {derived.directoryEntries.map((alumni) => (
                <AlumniCard
                  key={alumni._id}
                  alumni={alumni}
                  isAdmin={true}
                  isSchool={isSchool}
                  directoryConfig={directoryConfig}
                  onCopyLink={(id) => mutations.resend.mutate(id)}
                  onResend={(id) => mutations.resend.mutate(id)}
                  onRevoke={(id) => mutations.revoke.mutate({ profileId: id })}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="member-directory-page">
      <PortalPageHeader
        title={directoryConfig.memberPlural}
        subtitle="Reconnect across your network."
      />
      <AlumniFilters
        filters={filters}
        handleFilterChange={(e) =>
          setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))
        }
        clearFilters={resetFilters}
        isSchool={isSchool}
        directoryConfig={directoryConfig}
      />
      {queries.alumni.isLoading ? (
        <p className="muted">Loading members...</p>
      ) : null}
      {queries.alumni.isError ? (
        <p className="error-text">{queries.alumni.error.message}</p>
      ) : null}
      {!queries.alumni.isLoading &&
      !queries.alumni.isError &&
      !derived.activeMembers.length ? (
        <SectionCard
          title="No members to show"
          subtitle="Try adjusting filters or check back after records sync"
        >
          <p className="muted">No active member profiles are available yet.</p>
        </SectionCard>
      ) : null}
      <div className="member-directory-grid cards-grid">
        {derived.activeMembers.map((alumni) => (
          <AlumniCard
            key={alumni._id}
            alumni={alumni}
            isSchool={isSchool}
            directoryConfig={directoryConfig}
            onRequestChat={(item) => {
              setSelectedForChat(item);
              setChatMessage(
                "Hi, I'd like to connect and start a conversation with you.",
              );
            }}
          />
        ))}
      </div>

      {selectedForChat ? (
        <div
          className="member-dialog-backdrop"
          onClick={() => setSelectedForChat(null)}
        >
          <div
            className="member-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="member-dialog-header">
              <div>
                <p className="member-card-kicker">Request chat</p>
                <h3>
                  Message{" "}
                  {selectedForChat.name ||
                    selectedForChat.userId?.name ||
                    directoryConfig.memberSingular}
                </h3>
              </div>
              <button
                className="member-dialog-close"
                onClick={() => setSelectedForChat(null)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="member-dialog-body">
              <p className="muted">
                Write a short note so your request feels personal.
              </p>
              <textarea
                className="textarea member-form-textarea"
                onChange={(event) => setChatMessage(event.target.value)}
                placeholder="Write a message of at least 10 characters"
                rows="5"
                value={chatMessage}
              />
            </div>

            <div className="member-inline-actions">
              <button
                className="button primary"
                disabled={
                  chatMutation.isPending || chatMessage.trim().length < 10
                }
                onClick={() =>
                  chatMutation.mutate({
                    recipientUserId:
                      selectedForChat.userId?._id || selectedForChat.userId,
                    message: chatMessage,
                  })
                }
                type="button"
              >
                {chatMutation.isPending ? "Sending..." : "Request Chat"}
              </button>
              <button
                className="button secondary"
                onClick={() => setSelectedForChat(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
            {chatMutation.isError ? (
              <p className="error-text">{chatMutation.error?.message}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TenantAlumniPage;
