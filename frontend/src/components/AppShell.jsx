import { Link, NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";

const publicNavItems = [
  { to: "/", label: "Home" },
  { to: "/request-portal", label: "Request Portal" },
  { to: "/login", label: "Login" }
];

function AppShell({ children }) {
  const location = useLocation();
  const tenant = useTenantContext();
  const auth = useAuth();
  const navItems = [...publicNavItems];
  const isPortalRoute = location.pathname.startsWith("/portal");
  const isHomePage = location.pathname === "/";
  const isLoginPage = location.pathname === "/login";
  const isRequestPortalPage = location.pathname === "/request-portal";
  const isForgotPasswordPage = location.pathname === "/forgot-password";

  if (auth.user?.role === "super_admin") {
    navItems.push({ to: "/super-admin", label: "Super Admin" });
  }

  if (isPortalRoute) {
    return <div className="w-full pb-16">{children}</div>;
  }

  const topbarClassName = isHomePage
    ? "border-b border-slate-200/70 bg-white/80 backdrop-blur"
    : isRequestPortalPage || isForgotPasswordPage || isLoginPage
      ? "sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md"
      : "";

  const navLinkClassName = ({ isActive }) =>
    isActive
      ? "text-sm font-semibold text-brand-600"
      : "text-sm font-medium text-slate-600 transition hover:text-slate-900";

  if (isHomePage) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-[1320px] px-4 pb-16 lg:px-6">
        <header className="-mx-4 mb-8 border-b border-slate-200 bg-white px-6 py-3 lg:-mx-6 lg:px-12">
          <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-4">
            <Link className="flex items-center gap-2.5 text-slate-900" to="/">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600/10 text-brand-600">
                <span className="material-symbols-outlined text-[20px]">school</span>
              </span>
              <strong className="text-[2rem] font-bold tracking-[-0.03em] text-slate-800 sm:text-[2.15rem]">
                AlumniConnect
              </strong>
            </Link>

            <nav className="hidden items-center gap-12 md:flex">
              <a className="text-[1.05rem] font-semibold text-slate-600 transition hover:text-slate-900" href="#features">
                Features
              </a>
              <a className="text-[1.05rem] font-semibold text-slate-600 transition hover:text-slate-900" href="#how-it-works">
                How It Works
              </a>
              <a className="text-[1.05rem] font-semibold text-slate-600 transition hover:text-slate-900" href="#testimonials">
                Testimonials
              </a>
            </nav>

            <div className="flex items-center gap-3">
              {auth.isAuthenticated ? (
                <>
                  <NavLink
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    to="/portal"
                  >
                    Portal
                  </NavLink>
                  <button
                    className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                    onClick={auth.logout}
                    type="button"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    className="rounded-xl bg-slate-100 px-7 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
                    to="/login"
                  >
                    Login
                  </NavLink>
                  <NavLink
                    className="rounded-xl bg-brand-600 px-7 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,84,216,0.22)] transition hover:bg-brand-700"
                    to="/request-portal"
                  >
                    Register Institution
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1320px] px-4 pb-16 lg:px-6">
      <header
        className={`mb-8 flex items-center justify-between gap-6 py-4 ${topbarClassName}`}
      >
        <Link className="min-w-0 flex shrink-0 items-center gap-4 text-slate-900" to="/">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-base font-extrabold text-white shadow-[0_10px_22px_rgba(37,84,216,0.22)]">
            AN
          </span>
          <span className="flex min-w-0 flex-col">
            <strong className="truncate text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[1.5rem]">
              AlumNet
            </strong>
            <small className="truncate text-[0.82rem] text-slate-500 sm:text-[0.9rem]">
              {tenant.isTenant ? tenant.displayName : "Alumni networking platform"}
            </small>
          </span>
        </Link>

        <nav className="flex items-center justify-end gap-6 md:gap-9">
          {isHomePage ? (
            <>
              <a className="text-[0.95rem] font-semibold text-slate-700 transition hover:text-slate-900" href="#features">
                Features
              </a>
              <a className="text-[0.95rem] font-semibold text-slate-700 transition hover:text-slate-900" href="#how-it-works">
                How It Works
              </a>
              <a className="text-[0.95rem] font-semibold text-slate-700 transition hover:text-slate-900" href="#testimonials">
                Testimonials
              </a>
            </>
          ) : isRequestPortalPage ? (
            <>
              <span className="text-sm text-slate-500">Already registered?</span>
              <NavLink
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,84,216,0.22)] transition hover:bg-brand-700"
                to="/login"
              >
                Login
              </NavLink>
            </>
          ) : isForgotPasswordPage ? (
            <button
              className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-lg font-semibold text-slate-600"
              type="button"
            >
              ?
            </button>
          ) : isLoginPage ? (
            <NavLink
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-[0.9rem] font-bold tracking-wide text-white shadow-[0_10px_20px_rgba(37,84,216,0.2)] transition hover:bg-brand-700"
              to="/request-portal"
            >
              Register Institution
            </NavLink>
          ) : (
            navItems.map((item) => (
              <NavLink key={item.to} className={navLinkClassName} to={item.to}>
                {item.label}
              </NavLink>
            ))
          )}
          {!auth.isAuthenticated && isHomePage ? (
            <NavLink className={navLinkClassName} to="/login">
              Login
            </NavLink>
          ) : null}
          {!auth.isAuthenticated && isHomePage ? (
            <NavLink
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,84,216,0.22)] transition hover:bg-brand-700"
              to="/request-portal"
            >
              Register Institution
            </NavLink>
          ) : null}
          {tenant.isTenant || auth.user?.role === "institute_admin" || auth.user?.role === "alumni" ? (
            <NavLink className={navLinkClassName} to="/portal">
              Portal
            </NavLink>
          ) : null}
          {auth.isAuthenticated ? (
            <button className="text-sm font-medium text-slate-600 transition hover:text-slate-900" onClick={auth.logout} type="button">
              Logout
            </button>
          ) : null}
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}

export default AppShell;
