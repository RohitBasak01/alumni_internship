import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import SectionCard from "../components/SectionCard.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import {
  approveAlumniRegistration,
  fetchAlumni,
  inviteAlumni,
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
  lastClassAttended: ""
};

function getRegistrationConfig(tenant) {
  const isSchool = tenant.institutionType === "school";

  return {
    isSchool,
    memberPlural: tenant.communityLabels.memberPlural || "Alumni",
    memberSingular: tenant.communityLabels.memberSingular || "Member",
    adminLabel: tenant.communityLabels.adminLabel || "Institute Admin",
    yearFieldLabel: isSchool ? "Leaving Year" : "Batch Year",
    educationFieldLabel: isSchool ? "Last Class Attended" : "Course",
    inviteTitle: isSchool ? "Add Former Student Manually" : "Add Alumni Manually",
    verificationLabel: isSchool ? "Student Record" : "LinkedIn Profile",
    subtitle: isSchool
      ? "Verify and approve former students joining your school community."
      : "Verify and approve new alumni joining your institution's network."
  };
}

function ApproveRegistrationsPage() {
  const tenant = useTenantContext();
  const queryClient = useQueryClient();
  const [inviteForm, setInviteForm] = useState(initialInviteForm);
  const [filters, setFilters] = useState(initialFilters);
  const [actionNotification, setActionNotification] = useState(null);
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

  const revokeMutation = useMutation({
    mutationFn: revokeAlumniInvite,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      setActionNotification({ type: "success", message: "Invitation revoked successfully" });
      setTimeout(() => setActionNotification(null), 3000);
    },
    onError: (error) => {
      setActionNotification({ type: "error", message: error.message });
      setTimeout(() => setActionNotification(null), 3000);
    }
  });

  const pendingApprovals = useMemo(
    () => data.filter((item) => (item.registrationReviewStatus || "pending") === "pending"),
    [data]
  );
  const config = getRegistrationConfig(tenant);
  const isSchool = config.isSchool;
  const isInviteFormValid = useMemo(
    () =>
      Boolean(inviteForm.name.trim()) &&
      Boolean(inviteForm.email.trim()) &&
      (isSchool
        ? Boolean(inviteForm.lastClassAttended.trim()) &&
          /^\d{4}$/.test(inviteForm.leavingYear) &&
          Number(inviteForm.leavingYear) >= 1900 &&
          Number(inviteForm.leavingYear) <= 2100
        : Boolean(inviteForm.department.trim()) &&
          /^\d{4}$/.test(inviteForm.batch) &&
          Number(inviteForm.batch) >= 1900 &&
          Number(inviteForm.batch) <= 2100),
    [inviteForm, isSchool]
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
    } else if (!/^\S+@\S+\.\S+$/.test(inviteForm.email.trim())) {
      errors.email = "Enter a valid email address";
    }
    if (isSchool) {
      if (!inviteForm.leavingYear) {
        errors.leavingYear = "Leaving year is required";
      } else if (
        !/^\d{4}$/.test(inviteForm.leavingYear) ||
        inviteForm.leavingYear < 1900 ||
        inviteForm.leavingYear > 2100
      ) {
        errors.leavingYear = "Enter a year between 1900 and 2100";
      }
      if (!inviteForm.lastClassAttended.trim()) {
        errors.lastClassAttended = "Last class attended is required";
      }
    } else {
      if (!inviteForm.batch) {
        errors.batch = "Batch year is required";
      } else if (!/^\d{4}$/.test(inviteForm.batch) || inviteForm.batch < 1900 || inviteForm.batch > 2100) {
        errors.batch = "Enter a year between 1900 and 2100";
      }
      if (!inviteForm.department.trim()) {
        errors.department = "Department is required";
      }
    }
    return errors;
  }

  const inviteFormErrors = getInviteFormErrors();

  return (
    <div className="admin-approvals-page">
      <header className="admin-approvals-header">
        <div>
          <h1>Approve Registrations</h1>
          <p>{config.subtitle}</p>
        </div>
      </header>

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

        <select
          name={isSchool ? "leavingYear" : "batch"}
          onChange={handleFilterChange}
          value={isSchool ? filters.leavingYear : filters.batch}
        >
          <option value="">{config.yearFieldLabel}</option>
          {[...new Set(pendingApprovals.map((item) => (isSchool ? item.leavingYear : item.batch)).filter(Boolean))].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          name={isSchool ? "lastClassAttended" : "department"}
          onChange={handleFilterChange}
          value={isSchool ? filters.lastClassAttended : filters.department}
        >
          <option value="">{config.educationFieldLabel}</option>
          {[...new Set(pendingApprovals.map((item) => (isSchool ? item.lastClassAttended : item.department)).filter(Boolean))].map((option) => (
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
          <span>{config.memberSingular} Details</span>
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
                <strong>{isSchool ? alumni.lastClassAttended || "-" : alumni.department}</strong>
                <p>{isSchool ? `Leaving year ${alumni.leavingYear || "-"}` : `Batch of ${alumni.batch}`}</p>
              </div>

              <div className="admin-approvals-verification">
                <button className="admin-approvals-link" type="button">
                  {config.verificationLabel}
                </button>
                <span className="admin-approvals-doc">
                  {isSchool
                    ? index === 0
                      ? "School Record.pdf"
                      : index === 1
                        ? "Transfer Certificate.pdf"
                        : "Guardian Note.pdf"
                    : index === 0
                      ? "ID Card.pdf"
                      : index === 1
                        ? "Degree.pdf"
                        : "Provisional.pdf"}
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
                  {revokeMutation.isPending ? "Rejecting..." : "Reject"}
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

      {showInvitePanel(inviteMutation, inviteForm) ? (
        <SectionCard title={config.inviteTitle} subtitle={config.adminLabel}>
          <p className="muted">
            Create a secure onboarding link so {config.memberPlural.toLowerCase()} can set their own password.
          </p>

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
            {isSchool ? (
              <>
                <div>
                  <input
                    max="2100"
                    min="1900"
                    name="leavingYear"
                    onChange={handleInviteChange}
                    placeholder="Leaving year (1900-2100)"
                    required
                    type="number"
                    value={inviteForm.leavingYear}
                  />
                  {inviteFormErrors.leavingYear ? <p className="muted" style={{ fontSize: "0.85em", color: "#d32f2f", marginTop: "0.5rem" }}>{inviteFormErrors.leavingYear}</p> : null}
                </div>
                <div>
                  <input
                    name="lastClassAttended"
                    onChange={handleInviteChange}
                    placeholder="Last class attended"
                    required
                    value={inviteForm.lastClassAttended}
                  />
                  {inviteFormErrors.lastClassAttended ? <p className="muted" style={{ fontSize: "0.85em", color: "#d32f2f", marginTop: "0.5rem" }}>{inviteFormErrors.lastClassAttended}</p> : null}
                </div>
                <input name="section" onChange={handleInviteChange} placeholder="Section / House" value={inviteForm.section} />
                <input
                  name="currentEducation"
                  onChange={handleInviteChange}
                  placeholder="Current education"
                  value={inviteForm.currentEducation}
                />
                <input
                  name="currentInstitution"
                  onChange={handleInviteChange}
                  placeholder="Current institution"
                  value={inviteForm.currentInstitution}
                />
                <input
                  name="occupation"
                  onChange={handleInviteChange}
                  placeholder="Occupation"
                  value={inviteForm.occupation}
                />
              </>
            ) : (
              <>
                <div>
                  <input
                    max="2100"
                    min="1900"
                    name="batch"
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
                <input name="company" onChange={handleInviteChange} placeholder="Company" value={inviteForm.company} />
                <input
                  name="designation"
                  onChange={handleInviteChange}
                  placeholder="Designation"
                  value={inviteForm.designation}
                />
              </>
            )}
            <input name="location" onChange={handleInviteChange} placeholder="Location" value={inviteForm.location} />
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
          </form>
        </SectionCard>
      ) : null}

      {actionNotification ? (
        <p className={actionNotification.type === "success" ? "success-text" : "error-text"}>
          {actionNotification.message}
        </p>
      ) : null}
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
      {inviteMutation.isError ? <p className="error-text">{inviteMutation.error.message}</p> : null}
    </div>
  );
}

export default ApproveRegistrationsPage;

function showInvitePanel(inviteMutation, inviteForm) {
  return (
    inviteMutation.isPending ||
    Object.values(inviteForm).some((value) => String(value || "").trim().length > 0)
  );
}
