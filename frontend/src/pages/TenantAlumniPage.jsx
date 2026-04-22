import { useMemo } from "react";
import {
  PortalMetricCard,
  PortalMetricGrid,
  PortalPageHeader,
  PortalSegmentedTabs
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
    filterPlaceholder: isSchool ? "Search by name, email, institution, or location" : "Search by name, email, company, or role",
    roleFallback: isSchool ? "Community Member" : "Alumni Member",
    inviteTitle: isSchool ? "Invite Former Student" : "Invite Alumni",
    inviteButtonLabel: isSchool ? "Add Former Student" : "Add Alumni",
    approvalDescription: isSchool ? "Review former-student registrations." : "Review alumni registrations."
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
    derived
  } = useAlumniLogic();

  const directoryConfig = useMemo(() => getDirectoryConfig(tenant), [tenant]);
  const isSchool = directoryConfig.isSchool;

  if (isAdmin) {
    return (
      <div className="member-directory-page admin-mode">
        <PortalPageHeader
          title={`Manage ${directoryConfig.memberPlural}`}
          subtitle={directoryConfig.approvalDescription}
          actions={
            <div className="member-inline-actions">
              <button className="button primary" onClick={() => setIsInvitePanelOpen(true)}>{directoryConfig.inviteButtonLabel}</button>
            </div>
          }
        />

        <PortalMetricGrid>
          <PortalMetricCard title="Total records" value={queries.alumni.data?.length || 0} icon="TR" />
          <PortalMetricCard title="Active members" value={derived.activeMembers.length} icon="AM" />
          <PortalMetricCard title="Pending approvals" value={derived.pendingApprovals.length} icon="PA" />
        </PortalMetricGrid>

        <PortalSegmentedTabs
          activeValue={activeAdminTab}
          items={[
            { value: "manage", label: "Roster" },
            { value: "approvals", label: `Approvals (${derived.pendingApprovals.length})` }
          ]}
          onChange={setActiveAdminTab}
        />

        {activeAdminTab === "manage" && (
          <div className="member-directory-admin-grid">
            <AlumniFilters
              filters={filters}
              handleFilterChange={(e) => setFilters(f => ({ ...f, [e.target.name]: e.target.value }))}
              clearFilters={() => setFilters({ q: "", batch: "", department: "" })}
              isSchool={isSchool}
              directoryConfig={directoryConfig}
            />
            
            <div className="member-directory-grid admin-grid">
              {derived.directoryEntries.map(alumni => (
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
       <PortalPageHeader title={directoryConfig.memberPlural} subtitle="Reconnect across your network." />
       <div className="member-directory-grid cards-grid">
          {derived.activeMembers.map(alumni => (
             <AlumniCard key={alumni._id} alumni={alumni} isSchool={isSchool} directoryConfig={directoryConfig} />
          ))}
       </div>
    </div>
  );
}

export default TenantAlumniPage;
