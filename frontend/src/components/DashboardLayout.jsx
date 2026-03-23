import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { fetchNotificationSummary } from "../lib/api.js";

function buildAdminLinks(tenant) {
  const links = [
    { to: "/portal", label: "Dashboard", icon: "DS", end: true },
    { to: "/portal/alumni", label: `${tenant.communityLabels.memberPlural} Management`, icon: "AM" }
  ];

  if (tenant.featureFlags.enableEvents) {
    links.push({ to: "/portal/events", label: "Events Management", icon: "EV" });
  }

  if (tenant.featureFlags.enableJobs) {
    links.push({ to: "/portal/jobs", label: "Jobs Management", icon: "JB" });
  }

  if (tenant.featureFlags.enableAnnouncements) {
    links.push({ to: "/portal/announcements", label: "Settings", icon: "ST" });
  }

  return links;
}

function buildMemberLinks(tenant) {
  const links = [{ to: "/portal", label: "Dashboard", icon: "DS", end: true }];

  if (tenant.featureFlags.enableDirectory) {
    links.push({ to: "/portal/alumni", label: "Directory", icon: "DR" });
  }

  if (tenant.featureFlags.enableJobs) {
    links.push({ to: "/portal/jobs", label: "Jobs", icon: "JB" });
  }

  if (tenant.featureFlags.enableEvents) {
    links.push({ to: "/portal/events", label: "Events", icon: "EV" });
  }

  if (tenant.featureFlags.enableMentorship) {
    links.push({ to: "/portal/mentorship", label: "Messages", icon: "MS" });
    links.push({ to: "/portal/connections", label: "Connection Requests", icon: "CR" });
  }

  if (tenant.featureFlags.enableAnnouncements) {
    links.push({ to: "/portal/announcements", label: "Notifications", icon: "NT" });
  }

  links.push({ to: "/portal/profile", label: "Profile", icon: "PR" });
  return links;
}

function DashboardLayout() {
  const tenant = useTenantContext();
  const auth = useAuth();
  const location = useLocation();
  const isAlumni = auth.user?.role === "alumni";
  const isAlumniProfileRoute = isAlumni && location.pathname === "/portal/profile";
  const notificationsQuery = useQuery({
    queryKey: ["notification-summary"],
    queryFn: fetchNotificationSummary,
    enabled: Boolean(auth.user)
  });
  const adminLinks = buildAdminLinks(tenant);
  const alumniLinks = buildMemberLinks(tenant);

  function getBadgeCount(linkTo) {
    if (linkTo === "/portal/mentorship" && auth.user?.role === "alumni") {
      return notificationsQuery.data?.pendingMentorshipRequests || 0;
    }

    if (linkTo === "/portal/announcements" && auth.user?.role === "alumni") {
      return notificationsQuery.data?.pendingMentorshipRequests || 0;
    }

    if (linkTo === "/portal/alumni" && auth.user?.role === "institute_admin") {
      return notificationsQuery.data?.pendingAlumniInvites || 0;
    }

    return 0;
  }

  if (isAlumni) {
    if (isAlumniProfileRoute) {
      return (
        <section className="alumni-profile-shell">
          <header className="alumni-profile-topbar">
            <div className="alumni-profile-topbar-brand">
              <div className="alumni-profile-topbar-mark">AN</div>
              <strong>AlumNet</strong>
            </div>

            <nav className="alumni-profile-topbar-nav" aria-label="Alumni navigation">
              {alumniLinks.slice(0, 5).map((link) => (
                <NavLink
                  key={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    isActive ? "alumni-profile-topbar-link active" : "alumni-profile-topbar-link"
                  }
                  to={link.to}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="alumni-profile-topbar-actions">
              <label className="alumni-profile-search">
                <span aria-hidden="true">S</span>
                <input placeholder="Search alumni..." type="search" />
              </label>
              <NavLink className="alumni-profile-action-button" to="/portal/announcements">
                <span className="alumni-profile-action-icon" aria-hidden="true">
                  N
                </span>
                <span>Notifications</span>
                {getBadgeCount("/portal/announcements") ? (
                  <span className="alumni-profile-action-badge">
                    {getBadgeCount("/portal/announcements")}
                  </span>
                ) : null}
              </NavLink>
              <button className="alumni-profile-avatar-chip" onClick={() => void auth.logout()} type="button">
                <span className="alumni-profile-avatar-initial">{auth.user?.name?.slice(0, 1) || "A"}</span>
                <span>Logout</span>
              </button>
            </div>
          </header>

          <main className="alumni-profile-stage">
            <Outlet />
          </main>

          <footer className="alumni-profile-footer">
            <div className="alumni-profile-footer-brand">
              <span className="alumni-profile-footer-mark">AN</span>
              <strong>AlumNet (c) 2024</strong>
            </div>
            <div className="alumni-profile-footer-links">
              <button type="button">Terms of Service</button>
              <button type="button">Privacy Policy</button>
              <button type="button">Help Center</button>
            </div>
          </footer>
        </section>
      );
    }

    return (
      <section className="alumni-shell">
        <aside className="alumni-sidebar">
          <div className="alumni-sidebar-brand">
            <div className="alumni-sidebar-mark">AN</div>
              <div>
                <strong>AlumNet</strong>
                <small>{tenant.communityLabels.memberPlural} Network</small>
              </div>
            </div>

          <nav className="alumni-sidebar-nav" aria-label="Alumni navigation">
            {alumniLinks.map((link) => (
              <NavLink
                key={link.to}
                end={link.end}
                className={({ isActive }) => (isActive ? "alumni-sidebar-link active" : "alumni-sidebar-link")}
                to={link.to}
              >
                <span className="alumni-sidebar-icon" aria-hidden="true">
                  {link.icon}
                </span>
                <span>{link.label}</span>
                {getBadgeCount(link.to) ? (
                  <span className="alumni-sidebar-badge">{getBadgeCount(link.to)}</span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="alumni-sidebar-footer">
            <div className="alumni-sidebar-user">
              <div className="alumni-mini-avatar">{auth.user?.name?.slice(0, 1) || "A"}</div>
              <div>
                <strong>{auth.user?.name || "Portal User"}</strong>
                <small>{auth.user?.institute?.name || tenant.displayName}</small>
              </div>
            </div>
            <button className="button secondary compact" onClick={() => void auth.logout()} type="button">
              Logout
            </button>
          </div>
        </aside>

        <div className="alumni-main">
          <Outlet />
        </div>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
          <div className="admin-sidebar-brand">
          <div className="admin-sidebar-mark">AN</div>
          <div>
            <strong>AlumNet</strong>
            <small>{tenant.communityLabels.adminLabel}</small>
          </div>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Institute navigation">
          {adminLinks.map((link) => (
            <NavLink
              key={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? "admin-sidebar-link active" : "admin-sidebar-link")}
              to={link.to}
            >
              <span className="admin-sidebar-icon" aria-hidden="true">
                {link.icon}
              </span>
              <span>{link.label}</span>
              {getBadgeCount(link.to) ? <span className="admin-sidebar-badge">{getBadgeCount(link.to)}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-section">System</div>
        <button className="admin-sidebar-link" type="button">
          <span className="admin-sidebar-icon" aria-hidden="true">
            SG
          </span>
          <span>Settings</span>
        </button>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">{auth.user?.name?.slice(0, 1) || "A"}</div>
            <div>
              <strong>{auth.user?.name || "Institute Admin"}</strong>
              <small>{tenant.communityLabels.adminLabel}</small>
            </div>
          </div>
          <button className="admin-sidebar-menu" onClick={() => void auth.logout()} type="button">
            ...
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <label className="admin-topbar-search">
            <span aria-hidden="true">S</span>
            <input placeholder="Search alumni, events, or job listings..." type="search" />
          </label>

          <div className="admin-topbar-actions">
            <button className="button primary compact" type="button">
              + Add New
            </button>
            <NavLink className="admin-topbar-action" to="/portal/announcements">
              <span className="admin-topbar-icon" aria-hidden="true">
                N
              </span>
              <span>Notifications</span>
            </NavLink>
            <button className="admin-topbar-avatar" onClick={() => void auth.logout()} type="button">
              <span className="admin-topbar-avatar-initial">{auth.user?.name?.slice(0, 1) || "A"}</span>
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="admin-stage">
          <Outlet />
        </main>
      </div>
    </section>
  );
}

export default DashboardLayout;
