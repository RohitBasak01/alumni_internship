import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { fetchNotificationSummary } from "../lib/api.js";

function buildAdminLinks(tenant) {
  const links = [
    { to: "/portal", label: "Overview", icon: "dashboard", end: true },
    { to: "/portal/alumni", label: `${tenant.communityLabels.memberPlural}`, icon: "groups" }
  ];

  if (tenant.featureFlags.enableEvents) {
    links.push({ to: "/portal/events", label: "Events", icon: "event" });
  }

  if (tenant.featureFlags.enableDirectory) {
    links.push({ to: "/portal/business-directory", label: "Directory", icon: "storefront" });
  }

  if (tenant.featureFlags.enableGroups) {
    links.push({ to: "/portal/groups", label: "Groups", icon: "diversity_3" });
  }

  links.push({ to: "/portal/gallery", label: "Gallery", icon: "photo_library" });

  if (tenant.featureFlags.enableJobs) {
    links.push({ to: "/portal/jobs", label: "Jobs", icon: "work" });
  }

  if (tenant.featureFlags.enableAnnouncements) {
    links.push({ to: "/portal/newsroom", label: "Newsroom", icon: "campaign" });
  }

  links.push({ to: "/portal/settings", label: "Settings", icon: "tune" });
  return links;
}

function buildMemberLinks(tenant) {
  const links = [{ to: "/portal", label: "Overview", icon: "dashboard", end: true }];

  links.push({ to: "/portal/notifications", label: "Notifications", icon: "notifications" });

  if (tenant.featureFlags.enableDirectory) {
    links.push({ to: "/portal/alumni", label: "Members", icon: "groups" });
  }

  if (tenant.featureFlags.enableJobs) {
    links.push({ to: "/portal/jobs", label: "Jobs", icon: "work" });
  }

  if (tenant.featureFlags.enableEvents) {
    links.push({ to: "/portal/events", label: "Events", icon: "event" });
  }

  if (tenant.featureFlags.enableDirectory) {
    links.push({ to: "/portal/business-directory", label: "Businesses", icon: "storefront" });
  }

  if (tenant.featureFlags.enableGroups) {
    links.push({ to: "/portal/groups", label: "Groups", icon: "diversity_3" });
  }

  links.push({ to: "/portal/gallery", label: "Gallery", icon: "photo_library" });

  if (tenant.featureFlags.enableMentorship) {
    links.push({ to: "/portal/mentorship", label: "Messages", icon: "forum" });
    links.push({ to: "/portal/connections", label: "Requests", icon: "person_add" });
  }

  if (tenant.featureFlags.enableAnnouncements) {
    links.push({ to: "/portal/newsroom", label: "Newsroom", icon: "campaign" });
  }

  links.push({ to: "/portal/profile", label: "Profile", icon: "badge" });
  return links;
}

function DashboardLayout() {
  const tenant = useTenantContext();
  const auth = useAuth();
  const isAlumni = auth.user?.role === "alumni";
  const notificationsQuery = useQuery({
    queryKey: ["notification-summary"],
    queryFn: fetchNotificationSummary,
    enabled: Boolean(auth.user)
  });
  const adminLinks = buildAdminLinks(tenant);
  const alumniLinks = buildMemberLinks(tenant);
  const links = isAlumni ? alumniLinks : adminLinks;
  const pendingMentorshipRequests = notificationsQuery.data?.pendingMentorshipRequests || 0;
  const pendingAlumniInvites = notificationsQuery.data?.pendingAlumniInvites || 0;
  const unreadCount = notificationsQuery.data?.unreadCount || 0;

  function getBadgeCount(linkTo) {
    if (linkTo === "/portal/notifications" && isAlumni) {
      return unreadCount;
    }

    if (linkTo === "/portal/mentorship" && isAlumni) {
      return pendingMentorshipRequests;
    }

    if (linkTo === "/portal/alumni" && !isAlumni) {
      return pendingAlumniInvites;
    }

    return 0;
  }

  return (
    <section className={isAlumni ? "member-workspace" : "admin-shell"}>
      <aside className={isAlumni ? "member-rail" : "admin-sidebar"}>
        <div className={isAlumni ? "member-rail-brand" : "admin-sidebar-brand"}>
          <div className={isAlumni ? "member-rail-mark" : "admin-sidebar-mark"}>AN</div>
          <div>
            <strong>{tenant.displayName || "AlumNet"}</strong>
            <small>{isAlumni ? tenant.communityLabels.memberPlural : tenant.communityLabels.adminLabel}</small>
          </div>
        </div>

        <div className={isAlumni ? "member-rail-context" : "admin-sidebar-section"}>
          {isAlumni ? (
            <>
              <span>Member workspace</span>
              <strong>{auth.user?.institute?.name || tenant.displayName}</strong>
            </>
          ) : (
            "Operations"
          )}
        </div>

        <nav className={isAlumni ? "member-rail-nav" : "admin-sidebar-nav"} aria-label="Portal navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              end={link.end}
              className={({ isActive }) =>
                isAlumni
                  ? isActive
                    ? "member-rail-link active"
                    : "member-rail-link"
                  : isActive
                    ? "admin-sidebar-link active"
                    : "admin-sidebar-link"
              }
              to={link.to}
            >
              <span className={isAlumni ? "member-rail-icon" : "admin-sidebar-icon"} aria-hidden="true">
                <span className="material-symbols-outlined">{link.icon}</span>
              </span>
              <span>{link.label}</span>
              {getBadgeCount(link.to) ? (
                <span className={isAlumni ? "member-rail-badge" : "admin-sidebar-badge"}>{getBadgeCount(link.to)}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className={isAlumni ? "member-rail-footer" : "admin-sidebar-footer"}>
          <div className={isAlumni ? "member-rail-user" : "admin-sidebar-user"}>
            <div className={isAlumni ? "member-rail-avatar" : "admin-sidebar-avatar"}>{auth.user?.name?.slice(0, 1) || "A"}</div>
            <div>
              <strong>{auth.user?.name || (isAlumni ? "Portal User" : "Institute Admin")}</strong>
              <small>{isAlumni ? auth.user?.institute?.name || tenant.displayName : tenant.communityLabels.adminLabel}</small>
            </div>
          </div>
          <button className="button secondary compact" onClick={() => void auth.logout()} type="button">
            Logout
          </button>
        </div>
      </aside>

      <div className={isAlumni ? "member-stage" : "admin-main"}>
        <header className={isAlumni ? "member-topbar" : "admin-topbar"}>
          <div>
            <p className={isAlumni ? "member-topbar-eyebrow" : "auth-panel-kicker"}>{isAlumni ? "Alumni portal" : "Institute operations"}</p>
            <h1>{tenant.displayName || "AlumNet"}</h1>
          </div>

          <div className={isAlumni ? "member-topbar-actions" : "admin-topbar-actions"}>
            <NavLink className={isAlumni ? "member-topbar-link" : "admin-topbar-action"} to={isAlumni ? "/portal/notifications" : "/portal/settings"}>
              {isAlumni ? "Notifications" : "Settings"}
              {isAlumni && unreadCount ? <span className="member-topbar-badge">{unreadCount}</span> : null}
            </NavLink>
            <NavLink className={isAlumni ? "member-topbar-link" : "admin-topbar-action"} to={isAlumni ? "/portal/profile" : "/portal/alumni"}>
              {isAlumni ? "My Profile" : "Manage Members"}
            </NavLink>
          </div>
        </header>

        <main className={isAlumni ? "member-content" : "admin-stage"}>
          <Outlet />
        </main>
      </div>
    </section>
  );
}

export default DashboardLayout;
