import { useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { fetchNotificationSummary } from "../lib/api.js";
import NotificationDropdown from "./NotificationDropdown.jsx";
function buildAdminLinks(tenant) {
  const links = [
    { to: "/portal", label: "Overview", icon: "dashboard", end: true },
    {
      to: "/portal/alumni",
      label: `${tenant.communityLabels.memberPlural}`,
      icon: "groups",
    },
  ];

  if (tenant.featureFlags.enableEvents) {
    links.push({ to: "/portal/events", label: "Events", icon: "event" });
  }

  if (tenant.featureFlags.enableDirectory) {
    links.push({
      to: "/portal/business-directory",
      label: "Directory",
      icon: "storefront",
    });
  }

  if (tenant.featureFlags.enableGroups) {
    links.push({ to: "/portal/groups", label: "Groups", icon: "diversity_3" });
  }

  links.push({
    to: "/portal/gallery",
    label: "Gallery",
    icon: "photo_library",
  });

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
  const links = [
    { to: "/portal", label: "Overview", icon: "dashboard", end: true },
  ];

  if (tenant.featureFlags.enableMentorship) {
    links.push({ to: "/portal/messages", label: "Messages", icon: "forum" });
  }

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
    links.push({
      to: "/portal/business-directory",
      label: "Businesses",
      icon: "storefront",
    });
  }

  if (tenant.featureFlags.enableGroups) {
    links.push({ to: "/portal/groups", label: "Groups", icon: "diversity_3" });
  }

  links.push({
    to: "/portal/gallery",
    label: "Gallery",
    icon: "photo_library",
  });

  if (tenant.featureFlags.enableMentorship) {
    links.push({
      to: "/portal/connections",
      label: "Requests",
      icon: "person_add",
    });
  }

  if (tenant.featureFlags.enableAnnouncements) {
    links.push({ to: "/portal/newsroom", label: "Newsroom", icon: "campaign" });
  }

  return links;
}


function DashboardLayout() {
  const tenant = useTenantContext();
  const auth = useAuth();
  const isAlumni = auth.user?.role === "alumni";
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    if (linkTo === "/portal/notifications" && isAlumni) return unreadCount;
    if ((linkTo === "/portal/messages" || linkTo === "/portal/mentorship") && isAlumni) return pendingMentorshipRequests;
    if (linkTo === "/portal/alumni" && !isAlumni) return pendingAlumniInvites;
    return 0;
  }

  const profileLink = isAlumni ? "/portal/profile" : "/portal/settings";
  const profileLabel = isAlumni ? "My Profile" : "Settings";
  const profileIcon = isAlumni ? "person" : "tune";

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } ${isCollapsed ? "w-20" : "w-72"}`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar Header */}
          <div className={`p-6 transition-all duration-300 ${isCollapsed ? "px-4" : "px-6"}`}>
            <Link className="flex items-center gap-3 group" to="/portal">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/20 flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">grid_view</span>
              </div>
              {!isCollapsed && (
                <div className="min-w-0 transition-opacity duration-300">
                  <strong className="block text-lg font-bold text-slate-900 truncate leading-tight">
                    {tenant.displayName || "AlumNet"}
                  </strong>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {isAlumni ? tenant.communityLabels.memberPlural : tenant.communityLabels.adminLabel}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Sidebar Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            {/* Navigation Links */}
            <nav className="px-3 py-2 space-y-1 overflow-x-hidden">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  title={isCollapsed ? link.label : ""}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      isActive 
                        ? "bg-brand-50 text-brand-600 shadow-sm" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } ${isCollapsed ? "justify-center px-0" : ""}`
                  }
                >
                  <span className={`material-symbols-outlined transition-all duration-300 ${isCollapsed ? "text-[26px]" : "text-[22px]"}`}>
                    {link.icon}
                  </span>
                  {!isCollapsed && <span className="flex-1 truncate">{link.label}</span>}
                  {getBadgeCount(link.to) > 0 && (
                    <span className={`flex-shrink-0 min-w-[20px] h-5 grid place-items-center text-[10px] font-bold bg-brand-600 text-white rounded-full ${isCollapsed ? "absolute top-2 right-2 border-2 border-white" : ""}`}>
                      {getBadgeCount(link.to)}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* User Profile Summary */}
            <div className="p-3 border-t border-slate-100">
              <div className={`flex items-center gap-3 p-2 rounded-2xl bg-slate-50 transition-all duration-300 ${isCollapsed ? "justify-center" : ""}`}>
                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 grid place-items-center text-slate-600 flex-shrink-0">
                  <span className="material-symbols-outlined">{profileIcon}</span>
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{auth.user?.name}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight truncate">{auth.user?.role.replace("_", " ")}</p>
                  </div>
                )}
                {!isCollapsed && (
                  <button 
                    onClick={auth.logout}
                    className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Logout"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden h-10 w-10 grid place-items-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <span className="material-symbols-outlined transition-transform duration-300" style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }}>
                side_navigation
              </span>
            </button>
            <div className="hidden sm:block">
              <h3 className="text-lg font-bold text-slate-900">Dashboard</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Management Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <NotificationDropdown />
            <Link 
              to={profileLink}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="h-7 w-7 rounded-lg bg-brand-100 text-brand-600 grid place-items-center">
                <span className="material-symbols-outlined text-sm">{profileIcon}</span>
              </div>
              <span className="text-sm font-bold text-slate-700 hidden md:block">{profileLabel}</span>
            </Link>
            <button
              onClick={auth.logout}
              className="h-10 w-10 grid place-items-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
              title="Logout"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        {/* Content Section */}
        <main id="main-content" className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}


export default DashboardLayout;
