import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PortalMetricCard, PortalMetricGrid, PortalPageHeader, PortalSearchField } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { applyToJob, createJob, deleteJob, fetchJobs, updateJob } from "../lib/api.js";

const initialForm = {
  title: "",
  company: "",
  description: "",
  location: "",
  industry: "",
  status: "published"
};

const initialFilters = {
  query: "",
  jobType: "",
  location: "",
  industry: ""
};

function formatRelativeTime(value) {
  const diffMs = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function JobsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [applicationSuccess, setApplicationSuccess] = useState(null);
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs
  });
  const deferredQuery = useDeferredValue(filters.query);

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateJob(id, payload) : createJob(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setForm(initialForm);
      setEditingId(null);
      setShowComposer(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  });

  const applyMutation = useMutation({
    mutationFn: async (payload) => {
      let resumeUrl = "";
      let resumeFileName = "";
      
      if (resumeFile) {
        const reader = new FileReader();
        resumeFileName = resumeFile.name;
        
        return new Promise((resolve, reject) => {
          reader.onload = async () => {
            try {
              resumeUrl = reader.result; // Data URL
              const result = await applyToJob(selectedJobId, {
                ...payload,
                resumeUrl,
                resumeFileName
              });
              resolve(result);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(resumeFile);
        });
      }
      
      return applyToJob(selectedJobId, payload);
    },
    onSuccess: () => {
      setApplicationSuccess(true);
      setCoverLetter("");
      setResumeFile(null);
      setTimeout(() => {
        setApplicationSuccess(null);
        setSelectedJobId(null);
      }, 2000);
    }
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    saveMutation.mutate({ id: editingId, payload: form });
  }

  function handleEdit(item) {
    setEditingId(item._id);
    setShowComposer(true);
    setForm({
      title: item.title || "",
      company: item.company || "",
      description: item.description || "",
      location: item.location || item.locationLabel || "",
      industry: item.industry || item.industryLabel || "",
      status: item.status || "published"
    });
  }

  function handleCancel() {
    setEditingId(null);
    setForm(initialForm);
    setShowComposer(false);
  }

  function clearFilters() {
    setFilters(initialFilters);
  }

  const isAdmin = auth.user?.role === "institute_admin";
  const displayJobs = data;
  const decoratedJobs = useMemo(
    () => displayJobs,
    [displayJobs]
  );

  const filteredJobs = useMemo(
    () =>
      decoratedJobs.filter((item) => {
        const haystack =
          `${item.title} ${item.company} ${item.description} ${item.industryLabel}`.toLowerCase();
        const matchesQuery = deferredQuery ? haystack.includes(deferredQuery.toLowerCase()) : true;
        const matchesType = filters.jobType
          ? isAdmin
            ? item.adminStatus === filters.jobType
            : item.jobType === filters.jobType
          : true;
        const matchesLocation = filters.location ? item.locationLabel === filters.location : true;
        const matchesIndustry = filters.industry ? item.industryLabel === filters.industry : true;
        return matchesQuery && matchesType && matchesLocation && matchesIndustry;
      }),
    [decoratedJobs, deferredQuery, filters.jobType, filters.location, filters.industry, isAdmin]
  );

  const locationOptions = [...new Set(decoratedJobs.map((item) => item.locationLabel))];
  const industryOptions = [...new Set(decoratedJobs.map((item) => item.industryLabel))];
  const pendingJobs = decoratedJobs.filter((item) => item.adminStatus === "Pending");
  const activeJobs = decoratedJobs.filter((item) => item.adminStatus === "Approved");
  const archivedJobs = decoratedJobs.filter((item) => item.adminStatus === "Expired" || item.adminStatus === "Rejected");

  if (isAdmin) {
    return (
      <div className="admin-jobs-page">
        <PortalPageHeader
          actions={
            <button
              className="button primary admin-jobs-post"
              onClick={() => setShowComposer((current) => !current)}
              type="button"
            >
              {showComposer ? "Close Composer" : "+ Post New Job"}
            </button>
          }
          className="admin-jobs-header"
          subtitle="Review, approve, and moderate career opportunities submitted by the alumni community."
          title="Manage Jobs"
        />

        <PortalMetricGrid className="admin-jobs-metrics">
          <PortalMetricCard
            className="admin-jobs-metric-card"
            title="Total Jobs Posted"
            trend="Live"
            value={decoratedJobs.length.toLocaleString()}
          />
          <PortalMetricCard
            className="admin-jobs-metric-card highlight"
            title="Pending Approvals"
            trend="Action Required"
            value={pendingJobs.length}
          />
          <PortalMetricCard
            className="admin-jobs-metric-card"
            title="Active Job Listings"
            trend="Open"
            value={activeJobs.length}
          />
          <PortalMetricCard
            className="admin-jobs-metric-card"
            title="Expired / Archived"
            trend="Closed"
            value={archivedJobs.length}
          />
        </PortalMetricGrid>

        {showComposer ? (
          <SectionCard title={editingId ? "Edit Job" : "Post a New Job"} subtitle="Institute Admin">
            <form className="form-grid" onSubmit={handleSubmit}>
              <input name="title" onChange={handleChange} placeholder="Job title" value={form.title} />
              <input name="company" onChange={handleChange} placeholder="Company" value={form.company} />
              <input name="location" onChange={handleChange} placeholder="Location" value={form.location} />
              <input name="industry" onChange={handleChange} placeholder="Industry" value={form.industry} />
              <textarea
                className="textarea"
                name="description"
                onChange={handleChange}
                placeholder="Job description"
                rows="5"
                value={form.description}
              />
              <select className="select" name="status" onChange={handleChange} value={form.status}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
              <div className="inline-actions">
                <button className="button primary" disabled={saveMutation.isPending} type="submit">
                  {saveMutation.isPending ? "Saving..." : editingId ? "Update Job" : "Publish Job"}
                </button>
                <button className="button secondary" onClick={handleCancel} type="button">
                  Cancel
                </button>
              </div>
            </form>
            {saveMutation.isError ? <p className="error-text">{saveMutation.error.message}</p> : null}
          </SectionCard>
        ) : null}

        <section className="admin-jobs-filters">
          <PortalSearchField
            className="admin-jobs-search"
            name="query"
            onChange={handleFilterChange}
            placeholder="Search by job title or company..."
            value={filters.query}
          />

          <select name="jobType" onChange={handleFilterChange} value={filters.jobType}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Expired">Expired</option>
          </select>

          <select name="industry" onChange={handleFilterChange} value={filters.industry}>
            <option value="">All Industries</option>
            {industryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <button className="admin-jobs-more" onClick={clearFilters} type="button">
            More Filters
          </button>
        </section>

        <section className="admin-jobs-table-card">
          <div className="admin-jobs-table-head">
            <span>Job Title & Company</span>
            <span>Posted By</span>
            <span>Date Posted</span>
            <span>Industry</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {isLoading ? <p>Loading jobs...</p> : null}
          {isError ? <p className="error-text">{error.message}</p> : null}
          {!isLoading && !filteredJobs.length ? <p className="muted">No job openings match the current filters.</p> : null}

          <div className="admin-jobs-table-body">
            {filteredJobs.map((item, index) => (
              <article className="admin-jobs-row" key={item._id}>
                <div className="admin-jobs-role">
                  <div className={`admin-jobs-avatar tone-${(index % 4) + 1}`}>{item.company.slice(0, 1)}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {item.company} • {item.cityLabel}
                    </p>
                  </div>
                </div>

                <div className="admin-jobs-poster">
                  <div className="admin-jobs-poster-dot">{item.postedByLabel.slice(0, 1)}</div>
                  <span>
                    {item.postedByLabel} &apos;{String(item.posterBatch).padStart(2, "0")}
                  </span>
                </div>

                <span>{new Date(item.createdAt || new Date()).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                <span>{item.industryLabel}</span>
                <span className={`admin-jobs-status status-${item.adminStatus.toLowerCase()}`}>{item.adminStatus}</span>

                <div className="admin-jobs-actions">
                  {item.adminStatus === "Pending" ? (
                    <>
                      <button className="admin-jobs-icon approve" onClick={() => handleEdit(item)} type="button">
                        AP
                      </button>
                      <button className="admin-jobs-icon reject" onClick={() => deleteMutation.mutate(item._id)} type="button">
                        RJ
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="admin-jobs-icon" onClick={() => handleEdit(item)} type="button">
                        ED
                      </button>
                      <button
                        className="admin-jobs-icon"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(item._id)}
                        type="button"
                      >
                        DL
                      </button>
                    </>
                  )}
                  <button className="admin-jobs-icon" type="button">
                    VW
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="admin-jobs-table-footer">
            <p>
              Showing 1 to {Math.min(filteredJobs.length, 10)} of <strong>{decoratedJobs.length.toLocaleString()}</strong> jobs
            </p>
            <div className="admin-jobs-pagination">
              <button disabled type="button">{"<"}</button>
              <button className="active" type="button">1</button>
              <button disabled type="button">{">"}</button>
            </div>
          </div>
        </section>

        {deleteMutation.isError ? <p className="error-text">{deleteMutation.error.message}</p> : null}
      </div>
    );
  }

  return (
    <div className="jobs-board-page">
      <header className="jobs-board-header">
        <div>
          <h1>Jobs Board</h1>
          <p>Find your next opportunity or hire from our alumni network.</p>
        </div>
        {auth.user ? (
          <button
            className="button primary jobs-board-post"
            onClick={() => setShowComposer((current) => !current)}
            type="button"
          >
            {showComposer ? "Close" : "+ Post New Job"}
          </button>
        ) : null}
      </header>

      {showComposer ? (
        <SectionCard title={editingId ? "Edit Job" : "Post a New Job"} subtitle={isAdmin ? "Institute Admin" : "Post Opportunity"}>
          <form className="form-grid" onSubmit={handleSubmit}>
            <input name="title" onChange={handleChange} placeholder="Job title" value={form.title} />
            <input name="company" onChange={handleChange} placeholder="Company" value={form.company} />
            <input name="location" onChange={handleChange} placeholder="Location" value={form.location} />
            <input name="industry" onChange={handleChange} placeholder="Industry" value={form.industry} />
            <textarea
              className="textarea"
              name="description"
              onChange={handleChange}
              placeholder="Job description"
              rows="5"
              value={form.description}
            />
            <select className="select" name="status" onChange={handleChange} value={form.status}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>
            <div className="inline-actions">
              <button className="button primary" disabled={saveMutation.isPending} type="submit">
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Job" : "Publish Job"}
              </button>
              <button className="button secondary" onClick={handleCancel} type="button">
                Cancel
              </button>
            </div>
          </form>
          {saveMutation.isError ? <p className="error-text">{saveMutation.error.message}</p> : null}
        </SectionCard>
      ) : null}

      <section className="jobs-board-filters">
        <label className="jobs-board-search">
          <span aria-hidden="true">S</span>
          <input
            name="query"
            onChange={handleFilterChange}
            placeholder="Search by job title, company, or keywords..."
            value={filters.query}
          />
        </label>

        <div className="jobs-board-filter-row">
          <select name="jobType" onChange={handleFilterChange} value={filters.jobType}>
            <option value="">Job Type</option>
            <option value="Full-time">Full-time</option>
            <option value="Internship">Internship</option>
            <option value="Contract">Contract</option>
          </select>

          <select name="location" onChange={handleFilterChange} value={filters.location}>
            <option value="">Location</option>
            {locationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select name="industry" onChange={handleFilterChange} value={filters.industry}>
            <option value="">Industry</option>
            {industryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <button className="jobs-board-clear" onClick={clearFilters} type="button">
            Clear Filters
          </button>
        </div>
      </section>

      {isLoading ? <p>Loading jobs...</p> : null}
      {isError ? <p className="error-text">{error.message}</p> : null}
      {!isLoading && !filteredJobs.length ? (
        <p className="muted">No job openings match the current filters.</p>
      ) : null}

      <div className="jobs-board-list">
        {filteredJobs.map((item, index) => (
          <article className="jobs-board-card" key={item._id}>
            <div className={`jobs-board-logo jobs-board-logo-${(index % 4) + 1}`}>{item.company.slice(0, 1)}</div>

            <div className="jobs-board-copy">
              <div className="jobs-board-card-head">
                <div>
                  <h3>{item.title}</h3>
                  <div className="jobs-board-meta">
                    <span>{item.company}</span>
                    <span>{item.locationLabel}</span>
                    <span>{formatRelativeTime(item.createdAt || new Date())}</span>
                  </div>
                </div>
                <span className={`jobs-board-badge ${item.jobType === "Internship" ? "internship" : ""}`}>
                  {item.jobType}
                </span>
              </div>

              <p className="jobs-board-description">{item.description}</p>

              <div className="jobs-board-footer">
                <p>
                  Posted by <strong>{item.postedByLabel || "Institute Admin"}</strong>
                </p>

                <div className="jobs-board-actions">
                  <button className="button secondary jobs-board-detail" onClick={() => setSelectedJobId(item._id)} type="button">
                    View Details
                  </button>
                  {isAdmin && data.some((job) => job._id === item._id) ? (
                    <>
                      <button className="button secondary compact" onClick={() => handleEdit(item)} type="button">
                        Edit
                      </button>
                      <button
                        className="button secondary compact"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(item._id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="jobs-board-pagination">
        <button disabled type="button">{"<"}</button>
        <button className="active" type="button">1</button>
        <button disabled type="button">{">"}</button>
      </div>

      {selectedJobId ? (() => {
        const selectedJob = filteredJobs.find((job) => job._id === selectedJobId);
        return selectedJob ? (
          <div className="modal-overlay" onClick={() => setSelectedJobId(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedJob.title}</h2>
                <button className="modal-close" onClick={() => setSelectedJobId(null)} type="button">×</button>
              </div>
              <div className="modal-body">
                <div className="job-detail-grid">
                  <div>
                    <h4>Company</h4>
                    <p>{selectedJob.company}</p>
                  </div>
                  <div>
                    <h4>Location</h4>
                    <p>{selectedJob.locationLabel}</p>
                  </div>
                  <div>
                    <h4>Job Type</h4>
                    <p>{selectedJob.jobType}</p>
                  </div>
                  <div>
                    <h4>Industry</h4>
                    <p>{selectedJob.industryLabel}</p>
                  </div>
                </div>
                <div className="job-detail-description">
                  <h4>Description</h4>
                  <p>{selectedJob.description}</p>
                </div>
                <p className="job-detail-posted">Posted by <strong>{selectedJob.postedByLabel || "Institute Admin"}</strong></p>
              </div>
              <div className="modal-footer">
                {applicationSuccess ? (
                  <div className="application-success">
                    <p>✓ Your application has been submitted successfully!</p>
                  </div>
                ) : (
                  <>
                    <textarea
                      className="textarea"
                      placeholder="Share your cover letter or why you're interested in this role (optional)..."
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows="3"
                    />
                    <div className="resume-upload-section">
                      <label htmlFor="resume-upload" className="resume-upload-label">
                        📄 Upload Resume (optional)
                      </label>
                      <input
                        id="resume-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        className="resume-upload-input"
                      />
                      {resumeFile && (
                        <p className="resume-file-name">Selected: {resumeFile.name}</p>
                      )}
                    </div>
                    <div className="modal-actions">
                      <button 
                        className="button primary" 
                        disabled={applyMutation.isPending}
                        onClick={() => applyMutation.mutate({ coverLetter })}
                        type="button"
                      >
                        {applyMutation.isPending ? "Submitting..." : "Apply Now"}
                      </button>
                      <button className="button secondary" onClick={() => setSelectedJobId(null)} type="button">Close</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null;
      })() : null}

      {deleteMutation.isError ? <p className="error-text">{deleteMutation.error.message}</p> : null}
    </div>
  );
}

export default JobsPage;
