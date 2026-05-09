import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { fetchNotificationSummary } from "../lib/api.js";
import NotificationDropdown from "./NotificationDropdown.jsx";
import { ARIA_LABELS, ARIA_ROLES } from "../utils/accessibility.js";
import "../styles/Dashboard.css";

/* ── Categorised nav sections for alumni ────────────────── */
function buildMemberSections(tenant) {
  const sections = [];

  // MAIN
  const main = { label: "MAIN", links: [] };
  main.links.push({ to: "/portal", label: "Dashboard", icon: "dashboard", end: true });
  main.links.push({ to: "/portal/feed", label: "Feed", icon: "dynamic_feed" });
  main.links.push({ to: "/portal/alumni", label: "Alumni", icon: "people" });
  if (tenant.featureFlags.enableFriendship) main.links.push({ to: "/portal/messages", label: "Messages", icon: "forum" });
  if (tenant.featureFlags.enableEvents) main.links.push({ to: "/portal/events", label: "Events", icon: "event" });
  if (tenant.featureFlags.enableJobs) main.links.push({ to: "/portal/jobs", label: "Jobs", icon: "work" });
  sections.push(main);

  // COMMUNITY
  const community = { label: "COMMUNITY", links: [] };
  if (tenant.featureFlags.enableGroups) community.links.push({ to: "/portal/groups", label: "Groups", icon: "diversity_3" });
  if (tenant.featureFlags.enableDirectory) community.links.push({ to: "/portal/business-directory", label: "Directory", icon: "contacts" });
  community.links.push({ to: "/portal/gallery", label: "Gallery", icon: "photo_library" });
  if (tenant.featureFlags.enableAnnouncements) community.links.push({ to: "/portal/newsroom", label: "Newsroom", icon: "campaign" });
  if (community.links.length > 0) sections.push(community);

  // CAREER
  const career = { label: "CAREER", links: [] };
  if (tenant.featureFlags.enableFriendship) career.links.push({ to: "/portal/messages", label: "Friendships", icon: "handshake" });
  career.links.push({ to: "/portal/jobs", label: "Career Resources", icon: "school" });
  if (career.links.length > 0) sections.push(career);

  // GENERAL
  const general = { label: "GENERAL", links: [] };
  general.links.push({ to: "/portal/connections", label: "Requests", icon: "person_add" });
  general.links.push({ to: "/portal/settings", label: "Settings", icon: "settings" });
  sections.push(general);

  return sections;
}

/* ── Categorised nav sections for admin ─────────────────── */
function buildAdminSections(tenant) {
  const sections = [];

  const main = { label: "MAIN", links: [] };
  main.links.push({ to: "/portal", label: "Dashboard", icon: "dashboard", end: true });
  main.links.push({ to: "/portal/alumni", label: tenant.communityLabels.memberPlural, icon: "people" });
  if (tenant.featureFlags.enableEvents) main.links.push({ to: "/portal/events", label: "Events", icon: "event" });
  if (tenant.featureFlags.enableJobs) main.links.push({ to: "/portal/jobs", label: "Jobs", icon: "work" });
  sections.push(main);

  const community = { label: "COMMUNITY", links: [] };
  if (tenant.featureFlags.enableGroups) community.links.push({ to: "/portal/groups", label: "Groups", icon: "diversity_3" });
  if (tenant.featureFlags.enableDirectory) community.links.push({ to: "/portal/business-directory", label: "Directory", icon: "contacts" });
  community.links.push({ to: "/portal/gallery", label: "Gallery", icon: "photo_library" });
  if (tenant.featureFlags.enableAnnouncements) community.links.push({ to: "/portal/newsroom", label: "Newsroom", icon: "campaign" });
  if (community.links.length > 0) sections.push(community);

  const admin = { label: "ADMIN", links: [] };
  admin.links.push({ to: "/portal/moderation", label: "Content Moderation", icon: "shield" });
  sections.push(admin);

  const general = { label: "GENERAL", links: [] };
  general.links.push({ to: "/portal/settings", label: "Settings", icon: "settings" });
  sections.push(general);

  return sections;
}

const SIDEBAR_KEY = "alumnet-sidebar-collapsed";

function DashboardLayout() {
  const tenant = useTenantContext();
  const auth = useAuth();
  const isAlumni = auth.user?.role === "alumni";
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === "1"; } catch { return false; }
  });
  const sidebarRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_KEY, isCollapsed ? "1" : "0"); } catch { /* noop */ }
  }, [isCollapsed]);

  const notificationsQuery = useQuery({
    queryKey: ["notification-summary"],
    queryFn: fetchNotificationSummary,
    enabled: Boolean(auth.user),
  });

  const sections = isAlumni ? buildMemberSections(tenant) : buildAdminSections(tenant);
  const unreadCount = notificationsQuery.data?.unreadCount || 0;
  const pendingFriendshipRequests = notificationsQuery.data?.pendingFriendshipRequests || 0;
  const pendingAlumniInvites = notificationsQuery.data?.pendingAlumniInvites || 0;

  function getBadgeCount(linkTo) {
    if (linkTo === "/portal/messages" && isAlumni) return pendingFriendshipRequests;
    if (linkTo === "/portal/alumni" && !isAlumni) return pendingAlumniInvites;
    return 0;
  }

  const userName = auth.user?.name || "User";
  const userInitial = userName[0]?.toUpperCase() || "U";
  const profileLink = isAlumni ? "/portal/profile" : "/portal/settings";

  const sidebarCls = [
    "dl-sidebar",
    isMobileOpen ? "dl-sidebar--open" : "",
    isCollapsed ? "dl-sidebar--collapsed" : "",
  ].filter(Boolean).join(" ");

  const handleOverlayKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      setIsMobileOpen(false);
      const menuButton = document.querySelector('[aria-label="Toggle menu"]');
      if (menuButton) menuButton.focus();
    }
  };

  const handleSidebarKeyDown = (e) => {
    if (e.key === 'Escape' && isMobileOpen) {
      setIsMobileOpen(false);
      const menuButton = document.querySelector('[aria-label="Toggle menu"]');
      if (menuButton) menuButton.focus();
    }
  };

  return (
    <div className="dl-shell">
      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {isMobileOpen && (
        <div
          className="dl-overlay"
          onClick={() => setIsMobileOpen(false)}
          onKeyDown={handleOverlayKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar menu"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside
        className={sidebarCls}
        aria-label="Dashboard sidebar navigation"
        role={ARIA_ROLES.NAVIGATION}
        onKeyDown={handleSidebarKeyDown}
        ref={sidebarRef}
      >
        {/* Categorised nav */}
        <nav
          className="dl-nav"
          id="sidebar-nav"
          aria-label="Dashboard navigation"
        >
          {sections.map((section) => (
            <div key={section.label} className="dl-nav-group">
              <div
                className="dl-nav-group-label"
                aria-label={`${section.label} section`}
              >
                {section.label}
              </div>
              {section.links.map((link) => {
                const badge = getBadgeCount(link.to);
                const badgeText = badge > 0 ? `, ${badge} unread` : '';
                return (
                  <NavLink
                    key={link.to + link.label}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => `dl-nav-item ${isActive ? "dl-nav-item--active" : ""}`}
                    onClick={() => setIsMobileOpen(false)}
                    data-tooltip={link.label}
                    aria-label={`${link.label}${badgeText}`}
                    aria-current={({ isActive }) => isActive ? "page" : undefined}
                  >
                    <span
                      className="material-symbols-outlined dl-nav-icon"
                      aria-hidden="true"
                    >
                      {link.icon}
                    </span>
                    <span className="dl-nav-label">{link.label}</span>
                    {badge > 0 && (
                      <span
                        className="dl-nav-badge"
                        aria-label={`${badge} unread notifications`}
                      >
                        {badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}

          {/* Logout link inside nav (GENERAL section) */}
          <div className="dl-nav-group">
            <button
              className="dl-nav-item dl-nav-item--logout"
              onClick={auth.logout}
              data-tooltip="Logout"
              aria-label="Log out of your account"
            >
              <span
                className="material-symbols-outlined dl-nav-icon"
                aria-hidden="true"
              >
                logout
              </span>
              <span className="dl-nav-label">Logout</span>
            </button>
          </div>
        </nav>

        {/* Bottom collapse toggle */}
        <div className="dl-sidebar-bottom">
          <button
            className="dl-collapse-btn dl-collapse-btn--bottom"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            aria-controls="sidebar-nav"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
          </button>
        </div>
      </aside>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="dl-right">
        {/* Topbar */}
        <header
          className="dl-topbar"
          role={ARIA_ROLES.BANNER}
          aria-label="Dashboard top bar"
        >
          <button
            className="dl-mobile-menu-btn"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileOpen}
            aria-controls="sidebar-nav"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div
            className="dl-search-bar"
            role="search"
            aria-label="Search dashboard"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18, color: "#94a3b8" }}
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search anything..."
              className="dl-search-input"
              aria-label="Search alumni, events, jobs, and more"
            />
            <span
              className="dl-search-kbd"
              aria-hidden="true"
            >
              ⌘ K
            </span>
          </div>

          <div className="dl-topbar-actions">
            <NotificationDropdown />
            <button
              className="dl-topbar-icon-btn"
              aria-label={`Messages${pendingFriendshipRequests > 0 ? `, ${pendingFriendshipRequests} unread` : ''}`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20 }}
                aria-hidden="true"
              >
                mail
              </span>
              {pendingFriendshipRequests > 0 && (
                <span
                  className="dl-topbar-dot"
                  aria-label={`${pendingFriendshipRequests} unread messages`}
                />
              )}
            </button>
            <Link
              to={profileLink}
              className="dl-topbar-user"
              aria-label={`Your profile, ${userName}`}
            >
              <span
                className="dl-topbar-avatar"
                aria-hidden="true"
              >
                {userInitial}
              </span>
              <span className="dl-topbar-username">{userName.split(" ")[0]}</span>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16, color: "#94a3b8" }}
                aria-hidden="true"
              >
                expand_more
              </span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main
          id="main-content"
          className="dl-main"
          role={ARIA_ROLES.MAIN}
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
