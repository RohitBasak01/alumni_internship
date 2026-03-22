import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import {
  fetchAlumni,
  fetchAnnouncements,
  fetchEvents,
  fetchFeed,
  fetchJobs,
  fetchMentorshipRequests,
  fetchMyAlumniProfile,
  fetchNotificationSummary
} from "../lib/api.js";

function formatCardDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatRelativeTime(value) {
  const diffMs = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function TenantDashboardPage() {
  const tenant = useTenantContext();
  const auth = useAuth();
  const isAlumni = auth.user?.role === "alumni";
  const alumniQuery = useQuery({
    queryKey: ["alumni"],
    queryFn: fetchAlumni
  });
  const announcementsQuery = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements
  });
  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents
  });
  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs
  });
  const feedQuery = useQuery({
    queryKey: ["feed"],
    queryFn: fetchFeed
  });
  const notificationsQuery = useQuery({
    queryKey: ["notification-summary"],
    queryFn: fetchNotificationSummary
  });
  const profileQuery = useQuery({
    queryKey: ["my-alumni-profile"],
    queryFn: fetchMyAlumniProfile,
    enabled: isAlumni
  });
  const mentorshipQuery = useQuery({
    queryKey: ["mentorship-requests"],
    queryFn: fetchMentorshipRequests,
    enabled: isAlumni
  });

  const alumni = alumniQuery.data || [];
  const jobs = jobsQuery.data || [];
  const events = eventsQuery.data || [];
  const announcements = announcementsQuery.data || [];
  const feedItems = feedQuery.data || [];
  const profile = profileQuery.data;
  const mentorshipRequests = mentorshipQuery.data || [];

  const recommendedConnections = alumni
    .filter((item) => item.userId !== auth.user?.id)
    .slice(0, 3);
  const sameBatchCount = alumni.filter((item) => item.batch === profile?.batch).length;
  const sameCompanyCount = alumni.filter(
    (item) => item.company && profile?.company && item.company === profile.company
  ).length;

  const activeFeed = [
    ...feedItems.slice(0, 1),
    ...jobs.slice(0, 1).map((item) => ({
      id: item._id,
      type: "job",
      title: item.title,
      description: `${item.company} | Remote`,
      createdAt: item.createdAt
    })),
    ...events.slice(0, 1).map((item) => ({
      id: item._id,
      type: "event",
      title: item.title,
      description: `${item.location || "Campus Hall"} | ${formatCardDate(item.eventDate)}`,
      createdAt: item.createdAt
    }))
  ].slice(0, 3);

  const displayConnections = recommendedConnections;
  const displayFeed = activeFeed;
  const dashboardName = auth.user?.name || "Alex Johnson";
  const firstName = dashboardName.split(" ")[0] || "Alex";
  const jobTitle = profile?.designation || "Alumni Member";
  const companyLabel = profile?.company || tenant.displayName;
  const locationLabel = profile?.location || "Not specified";
  const batchLabel = profile?.batch || "-";
  const departmentLabel = profile?.department || "-";

  if (isAlumni) {
    return (
      <div className="alumni-dashboard">
        <section className="alumni-dashboard-header">
          <div>
            <h1>Welcome back, {firstName}!</h1>
            <p>Here&apos;s what&apos;s happening in your network today.</p>
          </div>
          <div className="alumni-header-actions">
            <Link className="button secondary" to="/portal/profile">
              View Public Profile
            </Link>
            <Link className="button primary" to="/portal/profile?mode=edit">
              Edit Profile
            </Link>
          </div>
        </section>

        <section className="alumni-dashboard-grid">
          <div className="alumni-dashboard-main">
            <section className="alumni-card-grid">
              <article className="alumni-profile-card">
                <div className="alumni-profile-avatar" />
                <h2>{dashboardName}</h2>
                <p className="alumni-profile-role">{jobTitle}</p>
                <p className="alumni-profile-meta">
                  {companyLabel} | {locationLabel}
                </p>
                <div className="alumni-profile-divider" />
                <div className="alumni-profile-stats">
                  <div>
                    <span>Batch</span>
                    <strong>{batchLabel}</strong>
                  </div>
                  <div>
                    <span>Major</span>
                    <strong>{departmentLabel}</strong>
                  </div>
                </div>
              </article>

              <article className="alumni-metric-card">
                <div className="alumni-metric-head">
                  <span className="alumni-metric-icon">CN</span>
                  <span className="alumni-metric-positive">+12%</span>
                </div>
                <strong>{alumni.length}</strong>
                <p>Total Connections</p>
              </article>

              <article className="alumni-metric-card">
                <div className="alumni-metric-head">
                  <span className="alumni-metric-icon">BT</span>
                  <span className="alumni-metric-neutral">Stable</span>
                </div>
                <strong>{sameBatchCount}</strong>
                <p>Same Batch ({batchLabel})</p>
              </article>

              <article className="alumni-metric-card">
                <div className="alumni-metric-head">
                  <span className="alumni-metric-icon">CP</span>
                  <span className="alumni-metric-positive">+4</span>
                </div>
                <strong>{sameCompanyCount}</strong>
                <p>Same Company</p>
              </article>
            </section>

            <section className="alumni-feed-panel">
              <div className="alumni-panel-header">
                <h3>Recent Feed</h3>
                <div className="alumni-tab-row">
                  <button className="active" type="button">All</button>
                  <button type="button">Jobs</button>
                  <button type="button">Events</button>
                </div>
              </div>

              <div className="alumni-feed-list">
                {displayFeed.map((item, index) => (
                  <article className="alumni-feed-item" key={`${item.type}-${item.id || index}`}>
                    <div className={`alumni-feed-icon ${item.type}`}>
                      {item.type === "job" ? "JB" : item.type === "event" ? "EV" : "NW"}
                    </div>
                    <div className="alumni-feed-content">
                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                      {item.type === "announcement" ? (
                        <span className="alumni-inline-link">{item.description}</span>
                      ) : null}
                      <span>{formatRelativeTime(item.createdAt || new Date())}</span>
                    </div>
                    {item.type === "job" ? <span className="alumni-feed-badge">New Job</span> : null}
                  </article>
                ))}
                {!displayFeed.length ? <p className="muted">No recent activity yet.</p> : null}
              </div>

              <Link className="alumni-panel-link" to="/portal/announcements">
                View All Activities
              </Link>
            </section>
          </div>

          <aside className="alumni-dashboard-side">
            <section className="alumni-side-card">
              <div className="alumni-panel-header">
                <h3>People You May Know</h3>
                <button className="alumni-refresh" type="button">R</button>
              </div>
              <div className="alumni-people-list">
                {displayConnections.map((item) => (
                  <article className="alumni-person-row" key={item._id}>
                    <div className="alumni-person-avatar">{item.name.slice(0, 1)}</div>
                    <div className="alumni-person-copy">
                      <strong>{item.name}</strong>
                      <p>{item.designation || "Product Designer"} | {item.company || tenant.displayName}</p>
                      <span className="alumni-person-tag">
                        {item.batch === profile?.batch
                          ? `Batch of ${item.batch}`
                          : item.company && item.company === profile?.company
                            ? "Same Company"
                            : item.location || "San Francisco"}
                      </span>
                    </div>
                    <button className="alumni-connect-button" type="button">
                      +
                    </button>
                  </article>
                ))}
                {!displayConnections.length ? <p className="muted">No recommendations available yet.</p> : null}
              </div>
              <Link className="button secondary alumni-wide-button" to="/portal/alumni">
                Explore Directory
              </Link>
            </section>

            <section className="alumni-side-card">
              <h3>Networking Hotspots</h3>
              <div className="alumni-hotspot-card">
                <span className="alumni-hotspot-dot" />
                <strong>{profile?.location || "San Francisco Bay Area"}</strong>
                <p>{alumni.length}+ alumni nearby</p>
              </div>
            </section>

            <section className="alumni-side-card">
              <h3>Quick Pulse</h3>
              <div className="alumni-pulse-grid">
                <article>
                  <strong>{events.filter((item) => item.isRegistered).length}</strong>
                  <span>Upcoming RSVPs</span>
                </article>
                <article>
                  <strong>{mentorshipRequests.filter((item) => item.status === "accepted").length}</strong>
                  <span>Accepted Mentorships</span>
                </article>
                <article>
                  <strong>{notificationsQuery.data?.pendingMentorshipRequests || 0}</strong>
                  <span>Pending Requests</span>
                </article>
              </div>
            </section>
          </aside>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <section className="admin-dashboard-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Welcome back, here&apos;s what&apos;s happening in AlumNet today.</p>
        </div>
      </section>

      <section className="admin-metric-grid">
        <article className="admin-metric-card">
          <div className="admin-metric-top">
            <span className="admin-metric-icon blue">AL</span>
            <span className="admin-metric-pill green">+12.5%</span>
          </div>
          <p>Total Alumni</p>
          <strong>{alumni.length.toLocaleString()}</strong>
        </article>

        <article className="admin-metric-card">
          <div className="admin-metric-top">
            <span className="admin-metric-icon orange">NR</span>
            <span className="admin-metric-pill orange">
              {(notificationsQuery.data?.pendingAlumniInvites || 0).toLocaleString()} Pending
            </span>
          </div>
          <p>New Registrations</p>
          <strong>{notificationsQuery.data?.pendingAlumniInvites || 0}</strong>
        </article>

        <article className="admin-metric-card">
          <div className="admin-metric-top">
            <span className="admin-metric-icon green">JB</span>
            <span className="admin-metric-pill mint">4 New Today</span>
          </div>
          <p>Active Jobs</p>
          <strong>{jobs.length}</strong>
        </article>

        <article className="admin-metric-card">
          <div className="admin-metric-top">
            <span className="admin-metric-icon purple">EV</span>
            <span className="admin-metric-pill purple">Next: Jun 12</span>
          </div>
          <p>Upcoming Events</p>
          <strong>{events.length}</strong>
        </article>
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-chart-card">
          <div className="admin-card-head">
            <div>
              <h3>Registration Trends</h3>
              <p>Alumni growth over the last 6 months</p>
            </div>
            <button className="admin-card-filter" type="button">
              Last 6 Months
            </button>
          </div>

          <div className="admin-chart-visual">
            <div className="admin-chart-gridlines" />
            <div className="admin-chart-area" />
            <div className="admin-chart-line">
              <span className="point point-1" />
              <span className="point point-2" />
              <span className="point point-3" />
              <span className="point point-4" />
            </div>
            <div className="admin-chart-labels">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>
        </article>

        <aside className="admin-activity-card">
          <div className="admin-card-head">
            <h3>Recent Activity</h3>
          </div>

          <div className="admin-activity-list">
            {feedItems.slice(0, 5).map((item, index) => (
              <article className="admin-activity-item" key={`${item.type}-${item.id || index}`}>
                <span className={`admin-activity-dot ${item.type || "announcement"}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <time>{formatRelativeTime(item.createdAt || new Date())}</time>
                </div>
              </article>
            ))}
            {!feedItems.length ? <p className="muted">No recent activity yet.</p> : null}
          </div>

          <Link className="admin-activity-link" to="/portal/announcements">
            View All Activity
          </Link>
        </aside>
      </section>
    </div>
  );
}

export default TenantDashboardPage;
