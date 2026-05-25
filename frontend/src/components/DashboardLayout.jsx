import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { fetchNotificationSummary } from "../lib/api.js";
import CommandPalette from "./CommandPalette.jsx";
import NotificationDropdown from "./NotificationDropdown.jsx";
import { ARIA_LABELS, ARIA_ROLES } from "../utils/accessibility.js";
import "../styles/LegacyWorkspace.css";
import "../styles/PortalRefresh.css";
import "../styles/Dashboard.css";

function getPortalModuleClass(pathname) {
  if (pathname.includes("/portal/alumni") || pathname.includes("/portal/connections")) return "module-alumni";
  if (pathname.includes("/portal/feed") || pathname.includes("/portal/forums")) return "module-feed";
  if (pathname.includes("/portal/events") || pathname.includes("/portal/reunions")) return "module-events";
  if (pathname.includes("/portal/jobs") || pathname.includes("/portal/resume-builder") || pathname.includes("/portal/mentors")) return "module-careers";
  if (pathname.includes("/portal/groups") || pathname.includes("/portal/messages")) return "module-groups";
  if (pathname.includes("/portal/gallery")) return "module-gallery";
  if (pathname.includes("/portal/newsroom") || pathname.includes("/portal/notifications")) return "module-newsroom";
  if (pathname.includes("/portal/business-directory")) return "module-directory";
  if (pathname.includes("/portal/admin") || pathname.includes("/portal/insights") || pathname.includes("/portal/moderation") || pathname.includes("/portal/institution-settings") || pathname.includes("/portal/admins")) return "module-admin";
  return "module-platform";
}

/* ── Categorised nav sections for alumni ────────────────── */
function buildMemberSections(tenant) {
  const sections = [];

  // MAIN
  const main = { label: "MAIN", links: [] };
  main.links.push({ to: "/portal", label: "Dashboard", icon: "space_dashboard", end: true });
  main.links.push({ to: "/portal/feed", label: "Feed", icon: "newspaper" });
  main.links.push({ to: "/portal/alumni", label: "Alumni", icon: "groups" });
  if (tenant.featureFlags.enableFriendship) main.links.push({ to: "/portal/messages", label: "Messages", icon: "chat_bubble" });
  if (tenant.featureFlags.enableEvents) main.links.push({ to: "/portal/events", label: "Events", icon: "celebration" });
  if (tenant.featureFlags.enableJobs) main.links.push({ to: "/portal/jobs", label: "Jobs", icon: "business_center" });
  sections.push(main);

  // COMMUNITY
  const community = { label: "COMMUNITY", links: [] };
  if (tenant.featureFlags.enableGroups) community.links.push({ to: "/portal/groups", label: "Groups", icon: "hub" });
  if (tenant.featureFlags.enableDirectory) community.links.push({ to: "/portal/business-directory", label: "Directory", icon: "contact_page" });
  community.links.push({ to: "/portal/gallery", label: "Gallery", icon: "auto_awesome_mosaic" });
  if (tenant.featureFlags.enableAnnouncements) community.links.push({ to: "/portal/newsroom", label: "Newsroom", icon: "breaking_news" });
  community.links.push({ to: "/portal/fundraising", label: "Fundraising", icon: "favorite" });
  community.links.push({ to: "/portal/reunions", label: "Reunions", icon: "diversity_1" });
  community.links.push({ to: "/portal/forums", label: "Forums", icon: "question_answer" });
  if (community.links.length > 0) sections.push(community);

  // CAREER
  const career = { label: "CAREER", links: [] };
  career.links.push({ to: "/portal/mentors", label: "Find a Mentor", icon: "psychology" });
  if (tenant.featureFlags.enableFriendship) career.links.push({ to: "/portal/messages", label: "Friendships", icon: "loyalty" });
  career.links.push({ to: "/portal/resume-builder", label: "Resume Builder", icon: "edit_document" });
  if (career.links.length > 0) sections.push(career);

  // GENERAL
  const general = { label: "GENERAL", links: [] };
  general.links.push({ to: "/portal/connections", label: "Requests", icon: "group_add" });
  general.links.push({ to: "/portal/settings", label: "Settings", icon: "tune" });
  sections.push(general);

  return sections;
}

/* ── Categorised nav sections for admin ─────────────────── */
function buildAdminSections(tenant, user) {
  const isPrimaryAdmin = !user?.isDelegatedAdmin;
  const sections = [];


  const main = { label: "MAIN", links: [] };
  main.links.push({ to: "/portal", label: "Dashboard", icon: "space_dashboard", end: true });
  main.links.push({ to: "/portal/alumni", label: tenant.communityLabels.memberPlural, icon: "groups" });
  if (tenant.featureFlags.enableEvents) main.links.push({ to: "/portal/events", label: "Events", icon: "celebration" });
  if (tenant.featureFlags.enableJobs) main.links.push({ to: "/portal/jobs", label: "Jobs", icon: "business_center" });
  sections.push(main);

  const community = { label: "COMMUNITY", links: [] };
  if (tenant.featureFlags.enableGroups) community.links.push({ to: "/portal/groups", label: "Groups", icon: "hub" });
  if (tenant.featureFlags.enableDirectory) community.links.push({ to: "/portal/business-directory", label: "Directory", icon: "contact_page" });
  community.links.push({ to: "/portal/gallery", label: "Gallery", icon: "auto_awesome_mosaic" });
  if (tenant.featureFlags.enableAnnouncements) community.links.push({ to: "/portal/newsroom", label: "Newsroom", icon: "breaking_news" });
  community.links.push({ to: "/portal/fundraising", label: "Fundraising", icon: "favorite" });
  if (community.links.length > 0) sections.push(community);

  const admin = { label: "ADMIN", links: [] };
  admin.links.push({ to: "/portal/insights", label: "Insights", icon: "monitoring" });
  admin.links.push({ to: "/portal/moderation", label: "Content Moderation", icon: "verified_user" });
  if (!user?.isDelegatedAdmin || user.delegatedScopes?.includes("manage_fundraising")) {
    admin.links.push({ to: "/portal/admin/fundraising", label: "Manage Campaigns", icon: "paid" });
  }
  if (isPrimaryAdmin) {
    admin.links.push({ to: "/portal/admin/campaigns", label: "Email Campaigns", icon: "mark_email_read" });
    admin.links.push({ to: "/portal/admins", label: "Manage Admins", icon: "supervised_user_circle" });
    admin.links.push({ to: "/portal/institution-settings", label: "Institution Settings", icon: "domain" });
  }
  sections.push(admin);

  const general = { label: "GENERAL", links: [] };
  general.links.push({ to: "/portal/settings", label: "Settings", icon: "tune" });
  sections.push(general);

  return sections;
}

function DashboardLayout() {
  const tenant = useTenantContext();
  const auth = useAuth();
  const location = useLocation();
  const isAlumni = auth.user?.role === "alumni";
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [acknowledgedRoutes, setAcknowledgedRoutes] = useState(new Set());
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll-aware navbar compact state
  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 24);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  // Track visited routes to "clear" badges persistently in this session
  useEffect(() => {
    if (["/portal/messages", "/portal/connections", "/portal/alumni"].includes(location.pathname)) {
      setAcknowledgedRoutes(prev => new Set(prev).add(location.pathname));
    }
  }, [location.pathname]);

  const notificationsQuery = useQuery({
    queryKey: ["notification-summary"],
    queryFn: fetchNotificationSummary,
    enabled: Boolean(auth.user),
  });

  const sections = isAlumni ? buildMemberSections(tenant) : buildAdminSections(tenant, auth.user);
  const unreadCount = notificationsQuery.data?.unreadCount || 0;
  const pendingFriendshipRequests = notificationsQuery.data?.pendingFriendshipRequests || 0;
  const pendingAlumniInvites = notificationsQuery.data?.pendingAlumniInvites || 0;

  function getBadgeCount(linkTo) {
    if (acknowledgedRoutes.has(linkTo)) return 0; // Persistent hide for this session
    if (linkTo === "/portal/messages" && isAlumni) return pendingFriendshipRequests;
    if (linkTo === "/portal/alumni" && !isAlumni) return pendingAlumniInvites;
    return 0;
  }

  const userName = auth.user?.name || "User";
  const userInitial = userName[0]?.toUpperCase() || "U";
  const profileLink = isAlumni ? "/portal/profile" : "/portal/settings";
  const moduleClass = getPortalModuleClass(location.pathname);

  const handleOverlayKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      setIsMobileOpen(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest('.dl-nav-dropdown')) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`dl-shell ${moduleClass}`}>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="dl-overlay"
          onClick={() => setIsMobileOpen(false)}
          onKeyDown={handleOverlayKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Close menu overlay"
        />
      )}

      {/* Top Navbar */}
      <header className={`dl-navbar ${isScrolled ? 'dl-navbar--scrolled' : ''}`} role={ARIA_ROLES.BANNER}>
        <div className="dl-navbar-left">
          <button
            className="dl-mobile-menu-btn"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileOpen}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <Link to="/" className="dl-logo-link">
            <div className="dl-logo-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>school</span>
            </div>
            <div className="dl-logo-text">
              <div className="dl-logo-name">{tenant.displayName || "Alumni Portal"}</div>
              <div className="dl-logo-sub">Community</div>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="dl-navbar-center" aria-label="Main navigation">
          {sections.map((section) => {
            if (section.label === "MAIN") {
              return section.links.map((link) => {
                const badge = getBadgeCount(link.to);
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => `dl-nav-link ${isActive ? "dl-nav-link--active" : ""}`}
                    title={link.label}
                  >
                    <span className="material-symbols-outlined dl-nav-link-icon" aria-hidden="true">{link.icon}</span>
                    {link.label}
                    {badge > 0 && <span className="dl-nav-badge">{badge}</span>}
                  </NavLink>
                );
              });
            }

            return (
              <div 
                className={`dl-nav-dropdown ${openDropdown === section.label ? 'open' : ''}`} 
                key={section.label}
                onMouseEnter={() => setOpenDropdown(section.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button 
                  className={`dl-nav-dropdown-trigger ${openDropdown === section.label ? 'active' : ''}`}
                  onClick={() => setOpenDropdown(openDropdown === section.label ? null : section.label)}
                >
                  {section.label}
                  <span className="material-symbols-outlined dl-nav-chevron">expand_more</span>
                </button>
                <div className="dl-nav-dropdown-menu">
                  <div className="dl-dropdown-section-label">{section.label}</div>
                  {section.links.map((link) => {
                    const badge = getBadgeCount(link.to);
                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `dl-nav-dropdown-item ${isActive ? "dl-nav-dropdown-item--active" : ""}`}
                        onClick={() => setOpenDropdown(null)}
                      >
                        <span className="material-symbols-outlined dl-nav-dropdown-icon">{link.icon}</span>
                        {link.label}
                        {badge > 0 && <span className="dl-nav-badge" style={{ marginLeft: "auto" }}>{badge}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="dl-navbar-right">
          <div
            className="dl-search-bar"
            onClick={() => setIsCommandPaletteOpen(true)}
            role="search"
            aria-label="Search dashboard"
          >
            <span
              className="material-symbols-outlined dl-search-icon"
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              search
            </span>
            <input
              readOnly
              type="text"
              placeholder="Search..."
              className="dl-search-input"
              aria-label="Search alumni, events, jobs, and more"
              onFocus={() => setIsCommandPaletteOpen(true)}
            />
            <span className="dl-search-kbd" aria-hidden="true">Ctrl K</span>
          </div>

          <div className="dl-navbar-actions">
            <NotificationDropdown />
            <Link
              to="/portal/messages"
              className="dl-navbar-icon-btn"
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
                  className="dl-navbar-dot"
                  aria-label={`${pendingFriendshipRequests} unread messages`}
                />
              )}
            </Link>
            
            {/* User Profile Dropdown */}
            <div 
              className={`dl-nav-dropdown ${openDropdown === 'user' ? 'open' : ''}`}
              onMouseEnter={() => setOpenDropdown('user')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button 
                className="dl-navbar-user" 
                aria-label={`Your profile, ${userName}`}
                onClick={() => setOpenDropdown(openDropdown === 'user' ? null : 'user')}
              >
                <span className="dl-navbar-avatar" aria-hidden="true">{userInitial}</span>
              </button>
              <div className="dl-nav-dropdown-menu dl-nav-dropdown-menu--right">
                <div className="dl-user-dropdown-header">
                  <div className="dl-user-dropdown-name">{userName}</div>
                  <div className="dl-user-dropdown-role">{auth.user?.role === 'alumni' ? 'Alumni' : 'Administrator'}</div>
                </div>
                <NavLink to={profileLink} className="dl-nav-dropdown-item" onClick={() => setOpenDropdown(null)}>
                  <span className="material-symbols-outlined dl-nav-dropdown-icon">person</span>
                  My Profile
                </NavLink>
                <NavLink to="/portal/settings" className="dl-nav-dropdown-item" onClick={() => setOpenDropdown(null)}>
                  <span className="material-symbols-outlined dl-nav-dropdown-icon">settings</span>
                  Account Settings
                </NavLink>
                {auth.user?.role === "institute_admin" && (
                  <NavLink to="/portal/institution-settings" className="dl-nav-dropdown-item" onClick={() => setOpenDropdown(null)}>
                    <span className="material-symbols-outlined dl-nav-dropdown-icon">domain</span>
                    Institution Settings
                  </NavLink>
                )}
                <div className="dl-dropdown-divider" />
                <button className="dl-nav-dropdown-item dl-logout-btn" onClick={auth.logout}>
                  <span className="material-symbols-outlined dl-nav-dropdown-icon">logout</span>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`dl-mobile-drawer ${isMobileOpen ? 'open' : ''}`}>
        <div className="dl-mobile-drawer-header">
          <Link to="/" className="dl-logo-link" onClick={() => setIsMobileOpen(false)}>
            <div className="dl-logo-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>school</span>
            </div>
            <div className="dl-logo-name">{tenant.displayName || "Portal"}</div>
          </Link>
          <button className="dl-mobile-close-btn" onClick={() => setIsMobileOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="dl-mobile-drawer-content">
          {sections.map((section) => (
            <div key={section.label} className="dl-mobile-nav-group">
              <div className="dl-mobile-nav-label">{section.label}</div>
              {section.links.map((link) => {
                const badge = getBadgeCount(link.to);
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => `dl-mobile-nav-item ${isActive ? "dl-mobile-nav-item--active" : ""}`}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <span className="material-symbols-outlined dl-mobile-nav-icon">{link.icon}</span>
                    {link.label}
                    {badge > 0 && <span className="dl-nav-badge" style={{ marginLeft: "auto" }}>{badge}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
          <div className="dl-mobile-nav-group">
            <button className="dl-mobile-nav-item dl-logout-btn" onClick={auth.logout}>
                <span className="material-symbols-outlined dl-mobile-nav-icon">logout</span>
                Logout
            </button>
          </div>
        </div>
      </div>

      {/* Page content */}
      <main id="main-content" className="dl-main" role={ARIA_ROLES.MAIN} tabIndex={-1}>
        <Outlet />
      </main>
      
      <CommandPalette open={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  );
}
export default DashboardLayout;
