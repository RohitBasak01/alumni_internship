
import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  PortalMetricCard,
  PortalMetricGrid,
  PortalPageHeader,
  PortalSearchField,
  PortalSegmentedTabs
} from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import {
  approveAlumniRegistration,
  copyAlumniInviteLink,
  createMentorshipRequest,
  fetchAlumni,
  inviteAlumni,
  resendAlumniInvite,
  revokeAlumniInvite
} from "../lib/api.js";

const initialInviteForm = {
  name: "",
  email: "",
  batch: "",
  department: "",
  leavingYear: "",
  lastClassAttended: "",
  section: "",
  currentEducation: "",
  currentInstitution: "",
  occupation: "",
  company: "",
  designation: "",
  location: ""
};

const initialFilters = {
  q: "",
  batch: "",
  department: "",
  leavingYear: "",
  lastClassAttended: "",
  section: "",
  company: "",
  skill: ""
};

function getDirectoryConfig(tenant) {
  const isSchool = tenant.institutionType === "school";

  return {
    isSchool,
    memberPlural: tenant.communityLabels.memberPlural || "Alumni",
    memberSingular: tenant.communityLabels.memberSingular || "Member",
    adminLabel: tenant.communityLabels.adminLabel || "Institute Admin",
    educationFieldLabel: isSchool ? "Last Class Attended" : "Department",
    yearFieldLabel: isSchool ? "Leaving Year" : "Batch Year",
    yearShortLabel: isSchool ? "Leaving Year" : "Batch",
    roleFallback: isSchool ? "Community Member" : "Alumni Member",
    inviteTitle: isSchool ? "Invite Former Student" : "Invite Alumni",
    inviteButtonLabel: isSchool ? "Add Former Student" : "Add Alumni",
    directoryTitle: isSchool ? "Former Students Directory" : "Alumni Directory",
    directorySubtitle: isSchool ? "Reconnect across your school community." : "Discover people by batch, role, and company.",
    filterPlaceholder: isSchool
      ? "Search by name, email, institution, or location"
      : "Search by name, email, company, or role",
    publicSearchPlaceholder: isSchool
      ? "Search by name, current institution, or location"
      : "Search by name, company, skill, or role",
    approvalDescription: isSchool
      ? "Review former-student registrations before they can join the portal."
      : "Review alumni registrations before they can join the portal."
  };
}

function getUserId(value) {
  if (!value) {
    return "";
  }

  return typeof value === "string" ? value : value._id || "";
}

function getDisplayName(item) {
  return item.name || item.userId?.name || "Community member";
}

function getInviteFormErrors(inviteForm, isSchool) {
  const errors = {};

  if (!inviteForm.name.trim()) {
    errors.name = "Full name is required";
  }

  if (!inviteForm.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (isSchool) {
    if (!inviteForm.leavingYear) {
      errors.leavingYear = "Leaving year is required";
    }
    if (!inviteForm.lastClassAttended.trim()) {
      errors.lastClassAttended = "Last class attended is required";
    }
  } else {
    if (!inviteForm.batch) {
      errors.batch = "Batch year is required";
    }
    if (!inviteForm.department.trim()) {
      errors.department = "Department is required";
    }
  }

  return errors;
}

function showInvitePanel(isInvitePanelOpen, inviteMutation, inviteForm) {
  return (
    isInvitePanelOpen ||
    inviteMutation.isPending ||
    Object.values(inviteForm).some((value) => String(value || "").trim().length > 0)
  );
}

function NoticeStack({ notices }) {
  const visibleNotices = notices.filter(Boolean);

  if (!visibleNotices.length) {
    return null;
  }

  return (
    <div className="member-notice-stack">
      {visibleNotices.map((notice, index) => (
        <p className={notice.type === "error" ? "error-text" : "success-text"} key={`${notice.message}-${index}`}>
          {notice.message}
        </p>
      ))}
    </div>
  );
}

function TenantAlumniPage() {
  const auth = useAuth();
  const tenant = useTenantContext();
  const queryClient = useQueryClient();
  const [inviteForm, setInviteForm] = useState(initialInviteForm);
  const [filters, setFilters] = useState(initialFilters);
  const [activeAdminTab, setActiveAdminTab] = useState("manage");
  const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);
  const [actionNotification, setActionNotification] = useState(null);
  const [mentorshipMessages, setMentorshipMessages] = useState({});
  const deferredSearch = useDeferredValue(filters.q);
  const appliedFilters = {
    ...filters,
    q: deferredSearch
  };

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["alumni", appliedFilters],
    queryFn: () =>
      fetchAlumni(
        Object.fromEntries(
          Object.entries(appliedFilters).filter(([, value]) => String(value || "").trim() !== "")
        )
      )
  });

  const inviteMutation = useMutation({
    mutationFn: inviteAlumni,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      setInviteForm(initialInviteForm);
      setIsInvitePanelOpen(false);
    }
  });

  const resendMutation = useMutation({
    mutationFn: resendAlumniInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
    }
  });

  const copyMutation = useMutation({
    mutationFn: copyAlumniInviteLink,
    onSuccess: async (response) => {
      await navigator.clipboard.writeText(response.invite.inviteUrl);
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
    }
  });

  const revokeMutation = useMutation({
    mutationFn: revokeAlumniInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      setActionNotification({ type: "success", message: "Registration rejected successfully." });
      setTimeout(() => setActionNotification(null), 3000);
    },
    onError: (mutationError) => {
      setActionNotification({ type: "error", message: mutationError.message });
      setTimeout(() => setActionNotification(null), 3000);
    }
  });

  const approveMutation = useMutation({
    mutationFn: approveAlumniRegistration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      setActionNotification({ type: "success", message: "Registration approved successfully." });
      setTimeout(() => setActionNotification(null), 3000);
    },
    onError: (mutationError) => {
      setActionNotification({ type: "error", message: mutationError.message });
      setTimeout(() => setActionNotification(null), 3000);
    }
  });

  const mentorshipMutation = useMutation({
    mutationFn: createMentorshipRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const isAdmin = auth.user?.role === "institute_admin";
  const directoryConfig = getDirectoryConfig(tenant);
  const isSchool = directoryConfig.isSchool;
  const selfUserId = auth.user?.id || auth.user?._id;
  const directoryEntries = useMemo(
    () => (isAdmin ? data : data.filter((item) => getUserId(item.userId) !== selfUserId)),
    [data, isAdmin, selfUserId]
  );
  const activeMembers = useMemo(() => directoryEntries.filter((item) => item.isActive), [directoryEntries]);
  const featuredMember = !isAdmin && activeMembers.length ? activeMembers[0] : null;
  const listedMembers = useMemo(
    () => (featuredMember ? activeMembers.filter((item) => item._id !== featuredMember._id) : activeMembers),
    [activeMembers, featuredMember]
  );
  const pendingApprovals = useMemo(
    () => data.filter((item) => (item.registrationReviewStatus || "pending") === "pending"),
    [data]
  );
  const pendingInvites = useMemo(() => data.filter((item) => !item.isActive), [data]);
  const inviteFormErrors = getInviteFormErrors(inviteForm, isSchool);
  const canSubmitInvite = Object.keys(inviteFormErrors).length === 0;

  function handleInviteChange(event) {
    const { name, value } = event.target;
    setInviteForm((current) => ({ ...current, [name]: value }));
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleInviteSubmit(event) {
    event.preventDefault();
    inviteMutation.mutate(inviteForm);
  }

  function clearFilters() {
    setFilters(initialFilters);
  }

  function handleMentorshipMessageChange(profileId, value) {
    setMentorshipMessages((current) => ({
      ...current,
      [profileId]: value
    }));
  }

  function submitMentorshipRequest(alumni) {
    mentorshipMutation.mutate({
      recipientUserId: getUserId(alumni.userId),
      message:
        mentorshipMessages[alumni._id]?.trim() ||
        `Hi ${getDisplayName(alumni)}, I would love to connect and chat with you.`
    });
  }

  function toCsvCell(value) {
    const normalized = String(value ?? "").replace(/"/g, '""');
    return `"${normalized}"`;
  }

  function handleExportCsv() {
    if (!data.length) {
      return;
    }

    const columns = [
      "Name",
      "Email",
      isSchool ? "Leaving Year" : "Batch",
      isSchool ? "Last Class Attended" : "Department",
      isSchool ? "Current Institution" : "Company",
      isSchool ? "Occupation" : "Designation",
      "Location",
      "Invitation Status"
    ];

    const rows = data.map((alumni) => [
      getDisplayName(alumni),
      alumni.email,
      isSchool ? alumni.leavingYear : alumni.batch,
      isSchool ? alumni.lastClassAttended : alumni.department,
      isSchool ? alumni.currentInstitution : alumni.company,
      isSchool ? alumni.occupation : alumni.designation,
      alumni.location,
      alumni.invitationStatus || "active"
    ]);

    const csv = [columns, ...rows].map((row) => row.map(toCsvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.setAttribute(
      "download",
      `${directoryConfig.memberPlural.toLowerCase().replace(/\s+/g, "-")}-export-${timestamp}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  const notices = [
    actionNotification,
    copyMutation.isSuccess ? { type: "success", message: "A fresh invite link was copied to the clipboard." } : null,
    resendMutation.isSuccess ? { type: "success", message: resendMutation.data.invite.message } : null,
    revokeMutation.isSuccess ? { type: "success", message: revokeMutation.data.message } : null,
    inviteMutation.isSuccess
      ? {
          type: "success",
          message: inviteMutation.data?.invite?.inviteUrl
            ? `${inviteMutation.data?.invite?.message} Share the generated invite link if email delivery is manual.`
            : inviteMutation.data?.invite?.message || "Invite created successfully."
        }
      : null,
    mentorshipMutation.isSuccess ? { type: "success", message: "Connection request sent successfully." } : null,
    copyMutation.isError ? { type: "error", message: copyMutation.error.message } : null,
    resendMutation.isError ? { type: "error", message: resendMutation.error.message } : null,
    revokeMutation.isError ? { type: "error", message: revokeMutation.error.message } : null,
    inviteMutation.isError ? { type: "error", message: inviteMutation.error.message } : null,
    mentorshipMutation.isError ? { type: "error", message: mentorshipMutation.error.message } : null
  ];

  if (isAdmin) {
    return (
      <div className="member-directory-page admin-mode">
        <PortalPageHeader
          title={`Manage ${directoryConfig.memberPlural}`}
          subtitle={directoryConfig.approvalDescription}
          actions={
            <div className="member-inline-actions">
              <button className="button secondary" disabled={!data.length} onClick={handleExportCsv} type="button">
                Export CSV
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setActiveAdminTab("manage");
                  setIsInvitePanelOpen(true);
                }}
                type="button"
              >
                {directoryConfig.inviteButtonLabel}
              </button>
            </div>
          }
        />

        <PortalMetricGrid>
          <PortalMetricCard title="Total records" value={data.length} icon="TR" />
          <PortalMetricCard title="Active members" value={activeMembers.length} icon="AM" />
          <PortalMetricCard title="Pending approvals" value={pendingApprovals.length} icon="PA" />
          <PortalMetricCard title="Pending invites" value={pendingInvites.length} icon="PI" />
        </PortalMetricGrid>

        <PortalSegmentedTabs
          activeValue={activeAdminTab}
          ariaLabel="Member management sections"
          items={[
            { value: "manage", label: "Roster" },
            { value: "approvals", label: `Approvals (${pendingApprovals.length})` }
          ]}
          onChange={setActiveAdminTab}
        />

        <NoticeStack notices={notices} />
        {isError ? <p className="error-text">{error.message}</p> : null}

        {activeAdminTab === "manage" ? (
          <div className="member-directory-admin-grid">
            <SectionCard title="Roster filters" subtitle="Refine the member list quickly">
              <div className="member-directory-filter-grid">
                <PortalSearchField
                  name="q"
                  onChange={handleFilterChange}
                  placeholder={directoryConfig.filterPlaceholder}
                  value={filters.q}
                />
                <input
                  name={isSchool ? "leavingYear" : "batch"}
                  onChange={handleFilterChange}
                  placeholder={directoryConfig.yearFieldLabel}
                  value={isSchool ? filters.leavingYear : filters.batch}
                />
                <input
                  name={isSchool ? "lastClassAttended" : "department"}
                  onChange={handleFilterChange}
                  placeholder={directoryConfig.educationFieldLabel}
                  value={isSchool ? filters.lastClassAttended : filters.department}
                />
                <button className="button secondary" onClick={clearFilters} type="button">
                  Clear filters
                </button>
              </div>
            </SectionCard>

            {showInvitePanel(isInvitePanelOpen, inviteMutation, inviteForm) ? (
              <SectionCard title={directoryConfig.inviteTitle} subtitle="Secure onboarding">
                <form className="member-form-grid member-form-grid-two" onSubmit={handleInviteSubmit}>
                  <label className="member-form-field">
                    <span>Full name</span>
                    <input name="name" onChange={handleInviteChange} value={inviteForm.name} />
                    {inviteFormErrors.name ? <small className="error-text">{inviteFormErrors.name}</small> : null}
                  </label>
                  <label className="member-form-field">
                    <span>Email</span>
                    <input name="email" onChange={handleInviteChange} type="email" value={inviteForm.email} />
                    {inviteFormErrors.email ? <small className="error-text">{inviteFormErrors.email}</small> : null}
                  </label>

                  {isSchool ? (
                    <>
                      <label className="member-form-field">
                        <span>Leaving year</span>
                        <input name="leavingYear" onChange={handleInviteChange} type="number" value={inviteForm.leavingYear} />
                        {inviteFormErrors.leavingYear ? <small className="error-text">{inviteFormErrors.leavingYear}</small> : null}
                      </label>
                      <label className="member-form-field">
                        <span>Last class attended</span>
                        <input name="lastClassAttended" onChange={handleInviteChange} value={inviteForm.lastClassAttended} />
                        {inviteFormErrors.lastClassAttended ? <small className="error-text">{inviteFormErrors.lastClassAttended}</small> : null}
                      </label>
                      <label className="member-form-field">
                        <span>Section / house</span>
                        <input name="section" onChange={handleInviteChange} value={inviteForm.section} />
                      </label>
                      <label className="member-form-field">
                        <span>Current education</span>
                        <input name="currentEducation" onChange={handleInviteChange} value={inviteForm.currentEducation} />
                      </label>
                      <label className="member-form-field">
                        <span>Current institution</span>
                        <input name="currentInstitution" onChange={handleInviteChange} value={inviteForm.currentInstitution} />
                      </label>
                      <label className="member-form-field">
                        <span>Occupation</span>
                        <input name="occupation" onChange={handleInviteChange} value={inviteForm.occupation} />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="member-form-field">
                        <span>Batch year</span>
                        <input name="batch" onChange={handleInviteChange} type="number" value={inviteForm.batch} />
                        {inviteFormErrors.batch ? <small className="error-text">{inviteFormErrors.batch}</small> : null}
                      </label>
                      <label className="member-form-field">
                        <span>Department</span>
                        <input name="department" onChange={handleInviteChange} value={inviteForm.department} />
                        {inviteFormErrors.department ? <small className="error-text">{inviteFormErrors.department}</small> : null}
                      </label>
                      <label className="member-form-field">
                        <span>Company</span>
                        <input name="company" onChange={handleInviteChange} value={inviteForm.company} />
                      </label>
                      <label className="member-form-field">
                        <span>Designation</span>
                        <input name="designation" onChange={handleInviteChange} value={inviteForm.designation} />
                      </label>
                    </>
                  )}

                  <label className="member-form-field member-form-field-full">
                    <span>Location</span>
                    <input name="location" onChange={handleInviteChange} value={inviteForm.location} />
                  </label>

                  <div className="member-inline-actions member-form-field-full">
                    <button className="button secondary" onClick={() => setIsInvitePanelOpen(false)} type="button">
                      Close
                    </button>
                    <button className="button primary" disabled={!canSubmitInvite || inviteMutation.isPending} type="submit">
                      {inviteMutation.isPending ? "Creating invite..." : "Create invite"}
                    </button>
                  </div>
                </form>
              </SectionCard>
            ) : null}

            <div className="member-directory-grid admin-grid">
              {isLoading ? <p>Loading members...</p> : null}
              {!isLoading && !directoryEntries.length ? (
                <SectionCard title="No members found" subtitle="Try changing your filters">
                  <p className="muted">There are no member records matching the current filter set.</p>
                </SectionCard>
              ) : null}

              {directoryEntries.map((alumni) => (
                <article className="member-directory-card admin-card" key={alumni._id}>
                  <div className="member-directory-card-head">
                    <div className="member-person-avatar">{getDisplayName(alumni).slice(0, 1)}</div>
                    <div>
                      <strong>{getDisplayName(alumni)}</strong>
                      <p>{alumni.email}</p>
                    </div>
                  </div>

                  <div className="member-directory-card-meta">
                    <span>{isSchool ? `Leaving year ${alumni.leavingYear || "-"}` : `Batch ${alumni.batch || "-"}`}</span>
                    <span>{isSchool ? alumni.lastClassAttended || "Class not added" : alumni.department || "Department not added"}</span>
                    <span>{alumni.location || "Location not added"}</span>
                  </div>

                  <p className="member-directory-card-copy">
                    {isSchool
                      ? alumni.currentEducation || alumni.occupation || directoryConfig.roleFallback
                      : alumni.designation || directoryConfig.roleFallback}
                    {isSchool
                      ? alumni.currentInstitution
                        ? ` at ${alumni.currentInstitution}`
                        : ""
                      : alumni.company
                        ? ` at ${alumni.company}`
                        : ""}
                  </p>

                  <div className="member-directory-card-actions">
                    <span className={`member-status-pill status-${alumni.isActive ? "accepted" : alumni.invitationStatus || "pending"}`}>
                      {alumni.isActive ? "Active" : alumni.invitationStatus || "Pending"}
                    </span>
                    {!alumni.isActive ? (
                      <div className="member-inline-actions">
                        <button className="button secondary compact" disabled={copyMutation.isPending} onClick={() => copyMutation.mutate(alumni._id)} type="button">
                          Copy link
                        </button>
                        <button className="button secondary compact" disabled={resendMutation.isPending} onClick={() => resendMutation.mutate(alumni._id)} type="button">
                          Resend
                        </button>
                        <button className="button secondary compact" disabled={revokeMutation.isPending || alumni.invitationStatus === "revoked"} onClick={() => revokeMutation.mutate(alumni._id)} type="button">
                          Revoke
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="member-directory-admin-grid approvals-mode">
            <SectionCard title="Pending registrations" subtitle="Review and approve new members">
              <p className="muted">{directoryConfig.approvalDescription}</p>
            </SectionCard>

            <div className="member-approval-grid">
              {isLoading ? <p>Loading approvals...</p> : null}
              {!isLoading && !pendingApprovals.length ? (
                <SectionCard title="No approvals waiting" subtitle="You are all caught up">
                  <p className="muted">New registration requests will appear here as people complete signup.</p>
                </SectionCard>
              ) : null}

              {pendingApprovals.map((alumni) => (
                <article className="member-approval-card" key={alumni._id}>
                  <div className="member-approval-card-head">
                    <div className="member-person-avatar">{getDisplayName(alumni).slice(0, 1)}</div>
                    <div>
                      <strong>{getDisplayName(alumni)}</strong>
                      <p>{alumni.email}</p>
                    </div>
                  </div>

                  <div className="member-approval-card-grid">
                    <article>
                      <span>{directoryConfig.yearFieldLabel}</span>
                      <strong>{isSchool ? alumni.leavingYear || "-" : alumni.batch || "-"}</strong>
                    </article>
                    <article>
                      <span>{directoryConfig.educationFieldLabel}</span>
                      <strong>{isSchool ? alumni.lastClassAttended || "-" : alumni.department || "-"}</strong>
                    </article>
                    <article>
                      <span>Location</span>
                      <strong>{alumni.location || "Not added"}</strong>
                    </article>
                    <article>
                      <span>Current context</span>
                      <strong>
                        {isSchool
                          ? alumni.currentInstitution || alumni.currentEducation || alumni.occupation || "Pending details"
                          : alumni.company || alumni.designation || "Pending details"}
                      </strong>
                    </article>
                  </div>

                  <div className="member-inline-actions">
                    <button className="button secondary" disabled={revokeMutation.isPending} onClick={() => revokeMutation.mutate(alumni._id)} type="button">
                      Reject
                    </button>
                    <button className="button primary" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(alumni._id)} type="button">
                      {approveMutation.isPending ? "Approving..." : "Approve"}
                    </button>
                  </div>
                </article>
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
        title={directoryConfig.directoryTitle}
        subtitle={directoryConfig.directorySubtitle}
      />

      <PortalMetricGrid>
        <PortalMetricCard title="Members visible" value={activeMembers.length} icon="MB" />
        <PortalMetricCard title="Batches represented" value={new Set(activeMembers.map((item) => item.batch || item.leavingYear).filter(Boolean)).size} icon="BT" />
        <PortalMetricCard title="Companies / institutions" value={new Set(activeMembers.map((item) => item.company || item.currentInstitution).filter(Boolean)).size} icon="CP" />
      </PortalMetricGrid>

      <NoticeStack notices={notices} />
      {isError ? <p className="error-text">{error.message}</p> : null}

      <div className="member-directory-grid hero-grid">
        {featuredMember ? (
          <section className="member-directory-spotlight">
            <p className="member-card-kicker">Featured connection</p>
            <div className="member-directory-spotlight-head">
              <div className="member-profile-avatar">{getDisplayName(featuredMember).slice(0, 1)}</div>
              <div>
                <h2>{getDisplayName(featuredMember)}</h2>
                <p>
                  {isSchool
                    ? featuredMember.currentEducation || featuredMember.occupation || directoryConfig.roleFallback
                    : featuredMember.designation || directoryConfig.roleFallback}
                </p>
              </div>
            </div>
            <p className="member-directory-spotlight-copy">
              {isSchool
                ? `${featuredMember.currentInstitution || featuredMember.lastClassAttended || "School community"} · ${featuredMember.location || "Location not added"}`
                : `${featuredMember.company || "Company not added"} · ${featuredMember.location || "Location not added"}`}
            </p>
            <div className="member-profile-tags">
              <span>{isSchool ? `Leaving year ${featuredMember.leavingYear || "-"}` : `Batch ${featuredMember.batch || "-"}`}</span>
              <span>{isSchool ? featuredMember.lastClassAttended || "Class pending" : featuredMember.department || "Department pending"}</span>
              <span>{featuredMember.allowMentorRequests ? "Open to mentorship" : "Profile only"}</span>
            </div>
          </section>
        ) : null}

        <SectionCard title="Refine the directory" subtitle="Search across the network">
          <div className="member-directory-filter-grid">
            <PortalSearchField
              name="q"
              onChange={handleFilterChange}
              placeholder={directoryConfig.publicSearchPlaceholder}
              value={filters.q}
            />
            <input
              name={isSchool ? "leavingYear" : "batch"}
              onChange={handleFilterChange}
              placeholder={directoryConfig.yearFieldLabel}
              value={isSchool ? filters.leavingYear : filters.batch}
            />
            <input
              name={isSchool ? "lastClassAttended" : "department"}
              onChange={handleFilterChange}
              placeholder={directoryConfig.educationFieldLabel}
              value={isSchool ? filters.lastClassAttended : filters.department}
            />
            <input
              name={isSchool ? "section" : "company"}
              onChange={handleFilterChange}
              placeholder={isSchool ? "Section / house" : "Company"}
              value={isSchool ? filters.section : filters.company}
            />
            {!isSchool ? (
              <input name="skill" onChange={handleFilterChange} placeholder="Skill" value={filters.skill} />
            ) : null}
            <button className="button secondary" onClick={clearFilters} type="button">
              Clear filters
            </button>
          </div>
        </SectionCard>
      </div>

      {isLoading ? <p>Loading members...</p> : null}
      {!isLoading && !activeMembers.length ? (
        <SectionCard title="No members found" subtitle="Try adjusting your search">
          <p className="muted">No active members match the current filter set.</p>
        </SectionCard>
      ) : null}

      <div className="member-directory-grid cards-grid">
        {listedMembers.map((alumni) => (
          <article className="member-directory-card" key={alumni._id}>
            <div className="member-directory-card-head">
              <div className="member-person-avatar">{getDisplayName(alumni).slice(0, 1)}</div>
              <div>
                <strong>{getDisplayName(alumni)}</strong>
                <p>
                  {isSchool
                    ? alumni.currentEducation || alumni.occupation || directoryConfig.roleFallback
                    : alumni.designation || directoryConfig.roleFallback}
                </p>
              </div>
            </div>

            <div className="member-directory-card-meta">
              <span>{isSchool ? `Leaving year ${alumni.leavingYear || "-"}` : `Batch ${alumni.batch || "-"}`}</span>
              <span>{isSchool ? alumni.lastClassAttended || "Class pending" : alumni.department || "Department pending"}</span>
              <span>{alumni.location || "Location not added"}</span>
            </div>

            <p className="member-directory-card-copy">
              {isSchool
                ? alumni.currentInstitution || "Current institution not added"
                : alumni.company || "Company not added"}
            </p>

            {!isSchool && alumni.skills?.length ? (
              <div className="member-chip-cloud">
                {alumni.skills.slice(0, 4).map((skill) => (
                  <span className="member-chip-pill" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}

            {getUserId(alumni.userId) !== selfUserId && alumni.isActive ? (
              <div className="member-directory-outreach">
                <textarea
                  className="textarea member-form-textarea"
                  onChange={(event) => handleMentorshipMessageChange(alumni._id, event.target.value)}
                  placeholder={`Write a short note to ${getDisplayName(alumni)}`}
                  rows="4"
                  value={mentorshipMessages[alumni._id] || ""}
                />
                <button className="button primary" disabled={mentorshipMutation.isPending} onClick={() => submitMentorshipRequest(alumni)} type="button">
                  Request chat
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

export default TenantAlumniPage;
