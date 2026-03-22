import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PortalPageHeader, PortalSearchField, PortalSegmentedTabs } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
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
  company: "",
  designation: "",
  location: ""
};

const initialFilters = {
  q: "",
  batch: "",
  department: "",
  company: "",
  skill: ""
};

function TenantAlumniPage() {
  const auth = useAuth();
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
      setActionNotification({ type: "success", message: "Registration rejected successfully" });
      setTimeout(() => setActionNotification(null), 3000);
    },
    onError: (error) => {
      setActionNotification({ type: "error", message: error.message });
      setTimeout(() => setActionNotification(null), 3000);
    }
  });
  const approveMutation = useMutation({
    mutationFn: approveAlumniRegistration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      setActionNotification({ type: "success", message: "Registration approved successfully" });
      setTimeout(() => setActionNotification(null), 3000);
    },
    onError: (error) => {
      setActionNotification({ type: "error", message: error.message });
      setTimeout(() => setActionNotification(null), 3000);
    }
  });
  const mentorshipMutation = useMutation({
    mutationFn: createMentorshipRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
    }
  });

  const featuredAlumni = data[0];
  const totalConnections = data.length;
  const alumniCards = useMemo(() => data.slice(featuredAlumni ? 1 : 0), [data, featuredAlumni]);
  const isAdmin = auth.user?.role === "institute_admin";
  const pendingApprovals = useMemo(
    () => data.filter((item) => (item.registrationReviewStatus || "pending") === "pending"),
    [data]
  );
  const isInviteFormValid = useMemo(
    () =>
      Boolean(inviteForm.name.trim()) &&
      Boolean(inviteForm.email.trim()) &&
      Boolean(inviteForm.department.trim()) &&
      Number.isInteger(Number(inviteForm.batch)) &&
      Number(inviteForm.batch) >= 1900 &&
      Number(inviteForm.batch) <= 2100,
    [inviteForm]
  );

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

  function getInviteFormErrors() {
    const errors = {};
    if (!inviteForm.name.trim()) {
      errors.name = "Full name is required";
    }
    if (!inviteForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email.trim())) {
      errors.email = "Enter a valid email address";
    }
    if (!inviteForm.batch) {
      errors.batch = "Batch year is required";
    } else if (!/^\d{4}$/.test(inviteForm.batch) || inviteForm.batch < 1900 || inviteForm.batch > 2100) {
      errors.batch = "Enter a year between 1900 and 2100";
    }
    if (!inviteForm.department.trim()) {
      errors.department = "Department is required";
    }
    return errors;
  }

  const inviteFormErrors = getInviteFormErrors();

  function handleMentorshipMessageChange(profileId, value) {
    setMentorshipMessages((current) => ({
      ...current,
      [profileId]: value
    }));
  }

  function submitMentorshipRequest(alumni) {
    mentorshipMutation.mutate({
      recipientUserId: alumni.userId,
      message:
        mentorshipMessages[alumni._id]?.trim() ||
        `Hi ${alumni.name}, I would love to connect and chat with you.`
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
      "Batch",
      "Department",
      "Company",
      "Designation",
      "Location",
      "Invitation Status"
    ];

    const rows = data.map((alumni) => [
      alumni.name,
      alumni.email,
      alumni.batch,
      alumni.department,
      alumni.company,
      alumni.designation,
      alumni.location,
      alumni.invitationStatus || "active"
    ]);

    const csv = [columns, ...rows].map((row) => row.map(toCsvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.setAttribute("download", `alumni-export-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  if (isAdmin) {
    return (
      <div className="admin-alumni-page">
        <PortalPageHeader
          actions={
            <div className="admin-alumni-header-actions">
              <button
                className="button secondary"
                disabled={!data.length}
                onClick={handleExportCsv}
                type="button"
              >
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
                + Add Alumni
              </button>
            </div>
          }
          className="admin-alumni-header"
          subtitle="View, filter, and moderate the university&apos;s registered alumni base, including pending approvals."
          title="Manage Alumni"
        />

        <PortalSegmentedTabs
          activeValue={activeAdminTab}
          ariaLabel="Alumni management sections"
          className="admin-alumni-tabs"
          items={[
            { value: "manage", label: "Alumni Directory" },
            {
              value: "approvals",
              label: "Approve Registrations",
              badge: pendingApprovals.length || null
            }
          ]}
          onChange={setActiveAdminTab}
        />

        {activeAdminTab === "manage" ? (
          <>
            <section className="admin-alumni-filters">
              <PortalSearchField
                className="admin-alumni-search"
                icon="F"
                name="q"
                onChange={handleFilterChange}
                placeholder="Filter by name, email or company..."
                value={filters.q}
              />

              <select name="batch" onChange={handleFilterChange} value={filters.batch}>
                <option value="">Batch Year: All</option>
                {[...new Set(data.map((item) => item.batch).filter(Boolean))].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select name="department" onChange={handleFilterChange} value={filters.department}>
                <option value="">Course: All</option>
                {[...new Set(data.map((item) => item.department).filter(Boolean))].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <button className="admin-alumni-refresh" onClick={clearFilters} type="button">
                R
              </button>
            </section>

            {showInvitePanel(isInvitePanelOpen, inviteMutation, inviteForm) ? (
              <SectionCard title="Invite Alumni" subtitle="Institute Admin">
                <p className="muted">Create a secure onboarding link so alumni can set their own password.</p>

                <form className="form-grid two-column" onSubmit={handleInviteSubmit}>
                  <div>
                    <input name="name" onChange={handleInviteChange} placeholder="Full name" value={inviteForm.name} />
                    {inviteFormErrors.name ? <p className="muted" style={{ fontSize: "0.85em", color: "#d32f2f", marginTop: "0.5rem" }}>{inviteFormErrors.name}</p> : null}
                  </div>
                  <div>
                    <input
                      name="email"
                      onChange={handleInviteChange}
                      placeholder="Email address"
                      required
                      type="email"
                      value={inviteForm.email}
                    />
                    {inviteFormErrors.email ? <p className="muted" style={{ fontSize: "0.85em", color: "#d32f2f", marginTop: "0.5rem" }}>{inviteFormErrors.email}</p> : null}
                  </div>
                  <div>
                    <input
                      name="batch"
                      max="2100"
                      min="1900"
                      onChange={handleInviteChange}
                      placeholder="Batch year (1900-2100)"
                      required
                      type="number"
                      value={inviteForm.batch}
                    />
                    {inviteFormErrors.batch ? <p className="muted" style={{ fontSize: "0.85em", color: "#d32f2f", marginTop: "0.5rem" }}>{inviteFormErrors.batch}</p> : null}
                  </div>
                  <div>
                    <input
                      name="department"
                      onChange={handleInviteChange}
                      placeholder="Department"
                      required
                      value={inviteForm.department}
                    />
                    {inviteFormErrors.department ? <p className="muted" style={{ fontSize: "0.85em", color: "#d32f2f", marginTop: "0.5rem" }}>{inviteFormErrors.department}</p> : null}
                  </div>
                  <input
                    name="company"
                    onChange={handleInviteChange}
                    placeholder="Company"
                    value={inviteForm.company}
                  />
                  <input
                    name="designation"
                    onChange={handleInviteChange}
                    placeholder="Designation"
                    value={inviteForm.designation}
                  />
                  <input
                    name="location"
                    onChange={handleInviteChange}
                    placeholder="Location"
                    value={inviteForm.location}
                  />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <button className="button primary" disabled={inviteMutation.isPending || !isInviteFormValid} style={{ width: "100%" }} type="submit">
                      {inviteMutation.isPending ? "Creating..." : "Create Invite Link"}
                    </button>
                    {!isInviteFormValid && Object.keys(inviteFormErrors).length > 0 ? (
                      <p className="muted" style={{ fontSize: "0.85em", color: "#d32f2f", marginTop: "0.5rem", textAlign: "center" }}>
                        Fix the errors above to create an invite
                      </p>
                    ) : null}
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setInviteForm(initialInviteForm);
                      setIsInvitePanelOpen(false);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </form>
              </SectionCard>
            ) : null}

            <section className="admin-alumni-table-card">
              <div className="admin-alumni-table-head">
                <span>Name & Contact</span>
                <span>Batch Year</span>
                <span>Course</span>
                <span>Company</span>
                <span>Actions</span>
              </div>

              {isLoading ? <p>Loading alumni...</p> : null}
              {isError ? <p className="error-text">{error.message}</p> : null}
              {!isLoading && !data.length ? <p className="muted">No alumni profiles match these filters yet.</p> : null}

              <div className="admin-alumni-table-body">
                {data.map((alumni) => (
                  <article className="admin-alumni-row" key={alumni._id}>
                    <div className="admin-alumni-person">
                      <div className="admin-alumni-avatar">{alumni.name.slice(0, 1)}</div>
                      <div>
                        <strong>{alumni.name}</strong>
                        <p>{alumni.email}</p>
                      </div>
                    </div>

                    <span>{alumni.batch}</span>
                    <span className="admin-alumni-course">{alumni.department}</span>
                    <span>{alumni.company || "Independent"}</span>

                    <div className="admin-alumni-actions">
                      {alumni.invitationStatus !== "active" ? (
                        <>
                          <button
                            className="admin-alumni-icon"
                            disabled={copyMutation.isPending}
                            onClick={() => copyMutation.mutate(alumni._id)}
                            type="button"
                          >
                            CP
                          </button>
                          <button
                            className="admin-alumni-icon"
                            disabled={resendMutation.isPending}
                            onClick={() => resendMutation.mutate(alumni._id)}
                            type="button"
                          >
                            RS
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="admin-alumni-icon" type="button">
                            VW
                          </button>
                          <button className="admin-alumni-icon" type="button">
                            ED
                          </button>
                        </>
                      )}
                      <button
                        className="admin-alumni-icon"
                        disabled={revokeMutation.isPending || alumni.invitationStatus === "revoked"}
                        onClick={() => revokeMutation.mutate(alumni._id)}
                        type="button"
                      >
                        DL
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="admin-alumni-table-footer">
                <p>
                  Showing 1 to {Math.min(data.length, 4)} of <strong>{data.length}</strong> alumni
                </p>
                <div className="admin-alumni-pagination">
                  <button disabled type="button">{"<"}</button>
                  <button className="active" type="button">1</button>
                  <button disabled type="button">{">"}</button>
                </div>
              </div>
            </section>

            <section className="admin-alumni-stats">
              <article className="admin-alumni-stat-card">
                <span className="admin-alumni-stat-icon blue">NR</span>
                <div>
                  <p>New Registrations</p>
                  <strong>+24</strong>
                  <small>this week</small>
                </div>
              </article>

              <article className="admin-alumni-stat-card">
                <span className="admin-alumni-stat-icon purple">VP</span>
                <div>
                  <p>Verified Profiles</p>
                  <strong>92%</strong>
                  <small>of total</small>
                </div>
              </article>

              <article className="admin-alumni-stat-card">
                <span className="admin-alumni-stat-icon gold">AT</span>
                <div>
                  <p>Active Threads</p>
                  <strong>156</strong>
                  <small>mentorships</small>
                </div>
              </article>

              <article className="admin-alumni-stat-card">
                <span className="admin-alumni-stat-icon green">ER</span>
                <div>
                  <p>Engagement Rate</p>
                  <strong>12.5%</strong>
                  <small>up 2%</small>
                </div>
              </article>
            </section>
          </>
        ) : (
          <>
            <section className="admin-approvals-metrics">
              <article className="admin-approvals-metric">
                <p>Total Pending</p>
                <strong>{pendingApprovals.length}</strong>
                <span className="admin-approvals-trend danger">12%</span>
              </article>

              <article className="admin-approvals-metric">
                <p>New Today</p>
                <strong>{Math.min(pendingApprovals.length, 12)}</strong>
                <span className="admin-approvals-pill">Priority</span>
              </article>

              <article className="admin-approvals-metric">
                <p>Avg. Verification Time</p>
                <strong>4h</strong>
                <span className="admin-approvals-trend success">-15m</span>
              </article>
            </section>

            <section className="admin-approvals-filters">
              <label className="admin-approvals-search">
                <span aria-hidden="true">S</span>
                <input
                  name="q"
                  onChange={handleFilterChange}
                  placeholder="Search pending requests by name or email..."
                  value={filters.q}
                />
              </label>

              <select name="batch" onChange={handleFilterChange} value={filters.batch}>
                <option value="">Batch Year</option>
                {[...new Set(pendingApprovals.map((item) => item.batch).filter(Boolean))].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select name="department" onChange={handleFilterChange} value={filters.department}>
                <option value="">Course</option>
                {[...new Set(pendingApprovals.map((item) => item.department).filter(Boolean))].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <button className="admin-approvals-clear" onClick={clearFilters} type="button">
                Clear all filters
              </button>
            </section>

            <section className="admin-approvals-table-card">
              <div className="admin-approvals-table-head">
                <span>Alumni Details</span>
                <span>Education</span>
                <span>Verification</span>
                <span>Actions</span>
              </div>

              {isLoading ? <p>Loading alumni...</p> : null}
              {isError ? <p className="error-text">{error.message}</p> : null}
              {!isLoading && !pendingApprovals.length ? (
                <p className="muted">No pending registrations match these filters yet.</p>
              ) : null}

              <div className="admin-approvals-table-body">
                {pendingApprovals.map((alumni, index) => (
                  <article className="admin-approvals-row" key={alumni._id}>
                    <div className="admin-approvals-person">
                      <div className={`admin-approvals-avatar tone-${(index % 3) + 1}`}>
                        {alumni.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <strong>{alumni.name}</strong>
                        <p>{alumni.email}</p>
                      </div>
                    </div>

                    <div className="admin-approvals-education">
                      <strong>{alumni.department}</strong>
                      <p>Batch of {alumni.batch}</p>
                    </div>

                    <div className="admin-approvals-verification">
                      <button className="admin-approvals-link" type="button">
                        LinkedIn Profile
                      </button>
                      <span className="admin-approvals-doc">
                        {index === 0 ? "ID Card.pdf" : index === 1 ? "Degree.pdf" : "Provisional.pdf"}
                      </span>
                    </div>

                    <div className="admin-approvals-actions">
                      <button className="admin-approvals-info" type="button">
                        i
                      </button>
                      <button
                        className="admin-approvals-reject"
                        disabled={revokeMutation.isPending || alumni.invitationStatus === "revoked"}
                        onClick={() => revokeMutation.mutate(alumni._id)}
                        type="button"
                      >
                        Reject
                      </button>
                      <button
                        className="button primary compact"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(alumni._id)}
                        type="button"
                      >
                        {approveMutation.isPending ? "Approving..." : "Approve"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="admin-approvals-table-footer">
                <p>
                  Showing {Math.min(pendingApprovals.length, 3)} of <strong>{pendingApprovals.length}</strong>{" "}
                  pending registrations
                </p>
                <div className="admin-approvals-pagination">
                  <button type="button">Previous</button>
                  <button type="button">Next</button>
                </div>
              </div>
            </section>
          </>
        )}

        {copyMutation.isSuccess ? <p className="success-text">A fresh invite link was copied to the clipboard.</p> : null}
        {actionNotification ? (
          <p className={actionNotification.type === "success" ? "success-text" : "error-text"}>
            {actionNotification.message}
          </p>
        ) : null}
        {resendMutation.isSuccess ? <p className="success-text">{resendMutation.data.invite.message}</p> : null}
        {revokeMutation.isSuccess ? <p className="success-text">{revokeMutation.data.message}</p> : null}
        {inviteMutation.isSuccess ? (
          <div className="success-text">
            <p>{inviteMutation.data?.invite?.message || "Invite created successfully."}</p>
            {inviteMutation.data?.invite?.inviteUrl ? (
              <p>
                Invite link: <a href={inviteMutation.data.invite.inviteUrl}>{inviteMutation.data.invite.inviteUrl}</a>
              </p>
            ) : null}
          </div>
        ) : null}
        {copyMutation.isError ? <p className="error-text">{copyMutation.error.message}</p> : null}
        {resendMutation.isError ? <p className="error-text">{resendMutation.error.message}</p> : null}
        {revokeMutation.isError ? <p className="error-text">{revokeMutation.error.message}</p> : null}
        {inviteMutation.isError ? <p className="error-text">{inviteMutation.error.message}</p> : null}
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="directory-showcase">
        <div className="directory-showcase-grid">
          {featuredAlumni ? (
            <article className="alumni-profile-card directory-featured-card">
              <div className="alumni-profile-avatar" />
              <h2>{featuredAlumni.name}</h2>
              <p className="alumni-profile-role">{featuredAlumni.designation || "Software Engineer"}</p>
              <p className="alumni-profile-meta">
                {featuredAlumni.company || "Open Systems Labs"} | {featuredAlumni.location || "Mumbai"}
              </p>
              <div className="alumni-profile-divider" />
              <div className="alumni-profile-stats">
                <div>
                  <span>Batch</span>
                  <strong>{featuredAlumni.batch}</strong>
                </div>
                <div>
                  <span>Major</span>
                  <strong>{featuredAlumni.department}</strong>
                </div>
              </div>
            </article>
          ) : null}

          <article className="alumni-metric-card directory-stat-card">
            <div className="alumni-metric-head">
              <span className="alumni-metric-icon">CN</span>
              <span className="alumni-metric-positive">+12%</span>
            </div>
            <strong>{totalConnections}</strong>
            <p>Total Connections</p>
          </article>
        </div>
      </section>

      <SectionCard title="Alumni Directory" subtitle="Networking Search">
        <div className="filter-grid">
          <input
            name="q"
            onChange={handleFilterChange}
            placeholder="Search name, company, skill..."
            value={filters.q}
          />
          <input name="batch" onChange={handleFilterChange} placeholder="Batch year" value={filters.batch} />
          <input
            name="department"
            onChange={handleFilterChange}
            placeholder="Department"
            value={filters.department}
          />
          <input name="company" onChange={handleFilterChange} placeholder="Company" value={filters.company} />
          <input name="skill" onChange={handleFilterChange} placeholder="Skill" value={filters.skill} />
          <button className="button secondary" onClick={clearFilters} type="button">
            Clear Filters
          </button>
        </div>

        {isLoading ? <p>Loading alumni...</p> : null}
        {isError ? <p className="error-text">{error.message}</p> : null}

        {!isLoading && !data.length ? (
          <p className="muted">No alumni profiles match these filters yet.</p>
        ) : null}

        <div className="directory-card-grid">
          {alumniCards.map((alumni) => (
            <article className="directory-member-card" key={alumni._id}>
              <div className="directory-member-header">
                <div className="directory-member-avatar">{alumni.name.slice(0, 1)}</div>
                <div>
                  <h4>{alumni.name}</h4>
                  <p className="muted">
                    {alumni.designation || "Alumni Member"}
                    {alumni.company ? ` | ${alumni.company}` : ""}
                  </p>
                </div>
              </div>

              <p className="muted">
                Batch {alumni.batch} | {alumni.department}
                {alumni.location ? ` | ${alumni.location}` : ""}
              </p>

              {alumni.skills?.length ? (
                <p className="muted">Skills: {alumni.skills.join(", ")}</p>
              ) : null}

              {auth.user?.role === "alumni" && alumni.userId !== auth.user?.id && alumni.isActive ? (
                <div className="mentorship-box">
                  <textarea
                    className="textarea"
                    onChange={(event) => handleMentorshipMessageChange(alumni._id, event.target.value)}
                    placeholder={`Send ${alumni.name} a chat request`}
                    rows="3"
                    value={mentorshipMessages[alumni._id] || ""}
                  />
                  <button
                    className="button primary compact"
                    disabled={mentorshipMutation.isPending}
                    onClick={() => submitMentorshipRequest(alumni)}
                    type="button"
                  >
                    Request Chat
                  </button>
                </div>
              ) : null}

              <div className="list-item-actions">
                <span className={`badge ${alumni.isActive ? "active" : "pending"}`}>
                  {alumni.isActive ? "active" : "inactive"}
                </span>
                {auth.user?.role === "institute_admin" ? (
                  <span
                    className={`badge ${
                      alumni.isActive
                        ? "active"
                        : alumni.invitationStatus === "revoked"
                          ? "suspended"
                          : "pending"
                    }`}
                  >
                    {alumni.isActive ? "active" : alumni.invitationStatus}
                  </span>
                ) : null}
                {auth.user?.role === "institute_admin" && alumni.invitationStatus !== "active" ? (
                  <>
                    <button
                      className="button secondary compact"
                      disabled={copyMutation.isPending}
                      onClick={() => copyMutation.mutate(alumni._id)}
                      type="button"
                    >
                      Copy Link
                    </button>
                    <button
                      className="button secondary compact"
                      disabled={resendMutation.isPending}
                      onClick={() => resendMutation.mutate(alumni._id)}
                      type="button"
                    >
                      Resend
                    </button>
                    <button
                      className="button secondary compact"
                      disabled={revokeMutation.isPending || alumni.invitationStatus === "revoked"}
                      onClick={() => revokeMutation.mutate(alumni._id)}
                      type="button"
                    >
                      Revoke
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {copyMutation.isSuccess ? (
          <p className="success-text">A fresh invite link was copied to the clipboard.</p>
        ) : null}
        {resendMutation.isSuccess ? (
          <p className="success-text">{resendMutation.data.invite.message}</p>
        ) : null}
        {revokeMutation.isSuccess ? (
          <p className="success-text">{revokeMutation.data.message}</p>
        ) : null}
        {mentorshipMutation.isSuccess ? (
          <p className="success-text">Mentorship request sent successfully.</p>
        ) : null}
        {copyMutation.isError ? <p className="error-text">{copyMutation.error.message}</p> : null}
        {resendMutation.isError ? <p className="error-text">{resendMutation.error.message}</p> : null}
        {revokeMutation.isError ? <p className="error-text">{revokeMutation.error.message}</p> : null}
        {mentorshipMutation.isError ? (
          <p className="error-text">{mentorshipMutation.error.message}</p>
        ) : null}
      </SectionCard>
    </div>
  );
}

export default TenantAlumniPage;

function showInvitePanel(isInvitePanelOpen, inviteMutation, inviteForm) {
  return (
    isInvitePanelOpen ||
    inviteMutation.isPending ||
    Object.values(inviteForm).some((value) => String(value || "").trim().length > 0)
  );
}
