import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { fetchNotificationSummary } from "../lib/api.js";
import NotificationDropdown from "./NotificationDropdown.jsx";
import "../styles/Dashboard.css";

function buildAdminLinks(tenant) {
  const links = [
    { to: "/portal", label: "Dashboard", icon: "dashboard", end: true },
    { to: "/portal/alumni", label: tenant.communityLabels.memberPlural, icon: "people" },
  ];
  if (tenant.featureFlags.enableEvents) links.push({ to: "/portal/events", label: "Events", icon: "event" });
  if (tenant.featureFlags.enableDirectory) links.push({ to: "/portal/business-directory", label: "Directory", icon: "contacts" });
  if (tenant.featureFlags.enableGroups) links.push({ to: "/portal/groups", label: "Groups", icon: "diversity_3" });
  links.push({ to: "/portal/gallery", label: "Gallery", icon: "photo_library" });
  if (tenant.featureFlags.enableJobs) links.push({ to: "/portal/jobs", label: "Jobs", icon: "work" });
  if (tenant.featureFlags.enableAnnouncements) links.push({ to: "/portal/newsroom", label: "Newsroom", icon: "campaign" });
  links.push({ to: "/portal/settings", label: "Settings", icon: "settings" });
  return links;
}

function buildMemberLinks(tenant) {
  const links = [
    { to: "/portal", label: "Dashboard", icon: "dashboard", end: true },
    { to: "/portal/feed", label: "Feed", icon: "dynamic_feed" },
    { to: "/portal/alumni", label: "Alumni", icon: "people" },
  ];
  if (tenant.featureFlags.enableMentorship) links.push({ to: "/portal/messages", label: "Messages", icon: "forum" });
  if (tenant.featureFlags.enableJobs) links.push({ to: "/portal/jobs", label: "Jobs", icon: "work" });
  if (tenant.featureFlags.enableEvents) links.push({ to: "/portal/events", label: "Events", icon: "event" });
  if (tenant.featureFlags.enableGroups) links.push({ to: "/portal/groups", label: "Groups", icon: "diversity_3" });
  if (tenant.featureFlags.enableDirectory) links.push({ to: "/portal/business-directory", label: "Directory", icon: "contacts" });
  if (tenant.featureFlags.enableAnnouncements) links.push({ to: "/portal/newsroom", label: "Newsroom", icon: "campaign" });
  links.push({ to: "/portal/gallery", label: "Gallery", icon: "photo_library" });
  if (tenant.featureFlags.enableMentorship) links.push({ to: "/portal/connections", label: "Requests", icon: "person_add" });
  return links;
}

function DashboardLayout() {
  const tenant = useTenantContext();
  const auth = useAuth();
  const isAlumni = auth.user?.role === "alumni";
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ["notification-summary"],
    queryFn: fetchNotificationSummary,
    enabled: Boolean(auth.user),
  });

  const links = isAlumni ? buildMemberLinks(tenant) : buildAdminLinks(tenant);
  const unreadCount = notificationsQuery.data?.unreadCount || 0;
  const pendingMentorshipRequests = notificationsQuery.data?.pendingMentorshipRequests || 0;
  const pendingAlumniInvites = notificationsQuery.data?.pendingAlumniInvites || 0;

  function getBadgeCount(linkTo) {
    if (linkTo === "/portal/messages" && isAlumni) return pendingMentorshipRequests;
    if (linkTo === "/portal/alumni" && !isAlumni) return pendingAlumniInvites;
    return 0;
  }

  const userName = auth.user?.name || "User";
  const userInitial = userName[0]?.toUpperCase() || "U";
  const profileLink = isAlumni ? "/portal/profile" : "/portal/settings";

  return (
    <div className="dl-shell">
      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {isMobileOpen && (
        <div className="dl-overlay" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className={`dl-sidebar ${isMobileOpen ? "dl-sidebar--open" : ""}`}>
        {/* Logo */}
        <div className="dl-sidebar-logo">
          <Link to="/portal" className="dl-logo-link">
            <div className="dl-logo-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>school</span>
            </div>
            <div className="dl-logo-text">
              <div className="dl-logo-name">AlumNet</div>
              <div className="dl-logo-sub">{tenant.displayName || "SPIT"}</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="dl-nav">
          {links.map((link) => {
            const badge = getBadgeCount(link.to);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `dl-nav-item ${isActive ? "dl-nav-item--active" : ""}`}
                onClick={() => setIsMobileOpen(false)}
              >
                <span className="material-symbols-outlined dl-nav-icon">{link.icon}</span>
                <span className="dl-nav-label">{link.label}</span>
                {badge > 0 && <span className="dl-nav-badge">{badge}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Upgrade card */}
        {isAlumni && (
          <div className="dl-upgrade-card">
            <button
              className="dl-upgrade-close"
              onClick={(e) => e.currentTarget.closest(".dl-upgrade-card").style.display = "none"}
              aria-label="Dismiss"
            >✕</button>
            <div className="dl-upgrade-crown">👑</div>
            <div className="dl-upgrade-title">Upgrade to Pro</div>
            <div className="dl-upgrade-sub">Unlock exclusive features and more opportunities.</div>
            <button className="dl-upgrade-btn">Upgrade Now →</button>
          </div>
        )}

        {/* User profile */}
        <div className="dl-user-row">
          <Link to={profileLink} className="dl-user-avatar">{userInitial}</Link>
          <div className="dl-user-info">
            <div className="dl-user-name">{userName}</div>
            <div className="dl-user-role">View Profile</div>
          </div>
          <button
            onClick={auth.logout}
            className="dl-logout-btn"
            title="Logout"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          </button>
        </div>
      </aside>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="dl-right">
        {/* Topbar */}
        <header className="dl-topbar">
          <button
            className="dl-mobile-menu-btn"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="dl-search-bar">
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#94a3b8" }}>search</span>
            <input type="text" placeholder="Search anything..." className="dl-search-input" />
          </div>

          <div className="dl-topbar-actions">
            <NotificationDropdown />
            <Link to={profileLink} className="dl-topbar-avatar" title={userName}>
              {userInitial}
            </Link>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#94a3b8", cursor: "pointer" }}>expand_more</span>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="dl-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
