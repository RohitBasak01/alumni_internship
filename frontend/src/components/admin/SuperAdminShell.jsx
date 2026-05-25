import { useAuth } from "../../context/AuthContext.jsx";

const sections = [
  { id: "overview", label: "Dashboard", icon: "dashboard" },
  { id: "institutes", label: "Manage Institutions", icon: "corporate_fare" },
  { id: "subscriptions", label: "Subscriptions", icon: "payments" },
  { id: "audit", label: "System Logs", icon: "terminal" },
  { id: "operations", label: "Settings", icon: "settings" }
];

function SuperAdminShell({
  activeSection,
  children,
  onSectionChange,
  title,
  subtitle
}) {
  const auth = useAuth();

  return (
    <section className="super-admin-shell flex min-h-screen bg-[#f6f6f8] text-slate-900">
      <aside className="super-admin-rail fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="super-admin-brand flex items-center gap-3 p-6">
          <div className="super-admin-brand-mark rounded-lg bg-[#1152d4] p-2 text-white">
            <span className="material-symbols-outlined">hub</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AlumNet SaaS</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Super Admin Panel
            </p>
          </div>
        </div>

        {/* Sidebar Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <nav className="space-y-1 px-4" aria-label="Super admin sections">
            {sections.map((section) => (
              <button
                className={`super-admin-nav-item flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  activeSection === section.id
                    ? "super-admin-nav-item--active bg-[#1152d4]/10 text-[#1152d4]"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                key={`${section.label}-${section.id}`}
                onClick={() => onSectionChange(section.id)}
                type="button"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {section.icon}
                </span>
                <span>{section.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4">
            <div className="super-admin-user-card rounded-xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1152d4]/15 font-bold text-[#1152d4]">
                  {auth.user?.name
                    ?.split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "CA"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{auth.user?.name || "Chief Administrator"}</p>
                  <p className="truncate text-xs text-slate-500">{auth.user?.email || "admin@alumnet.com"}</p>
                </div>
              </div>
              <div>
                <button
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                  onClick={() => void auth.logout()}
                  type="button"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="super-admin-main flex-1 lg:ml-72">
        <header className="super-admin-topbar sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-8">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative w-full max-w-xl">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                className="w-full rounded-lg border-none bg-slate-100 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#1152d4]/50"
                placeholder="Search institutions, users, or logs..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100" type="button">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
            </button>
            <button className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100" type="button">
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </header>

        <div className="super-admin-content space-y-6 p-4 sm:p-8">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {sections.map((section) => (
              <button
                className={`super-admin-mobile-tab shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
                  activeSection === section.id
                    ? "super-admin-mobile-tab--active bg-[#1152d4] text-white"
                    : "bg-white text-slate-600"
                }`}
                key={`mobile-${section.label}-${section.id}`}
                onClick={() => onSectionChange(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="super-admin-page-title space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
            <p className="text-sm text-slate-500 sm:text-base">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

export default SuperAdminShell;
