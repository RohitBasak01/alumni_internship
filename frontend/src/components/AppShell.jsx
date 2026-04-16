import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";

const publicNavItems = [
  { to: "/", label: "Home" },
  { to: "/request-portal", label: "Request Portal" },
  { to: "/login", label: "Login" },
  { to: "/register", label: "Register" }
];

function AppShell({ children }) {
  const location = useLocation();
  const tenant = useTenantContext();
  const auth = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = [...publicNavItems];
  const isPortalRoute = location.pathname.startsWith("/portal");
  const isSuperAdminRoute = location.pathname.startsWith("/super-admin");
  const isHomePage = location.pathname === "/";
  const isLoginPage = location.pathname === "/login";
  const isRegisterPage = location.pathname === "/register";
  const isRequestPortalPage = location.pathname === "/request-portal";
  const isForgotPasswordPage = location.pathname === "/forgot-password";
  const isAuthRoute = isLoginPage || isRegisterPage || isForgotPasswordPage;
  const isPlatformDomain = !tenant.isTenant;

  if (auth.user?.role === "super_admin") {
    navItems.push({ to: "/super-admin", label: "Super Admin" });
  }

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  if (isPortalRoute || isSuperAdminRoute) {
    return <div className="w-full">{children}</div>;
  }

  const topbarClassName = isHomePage
    ? "border-b border-slate-200/70 bg-white/80 backdrop-blur"
    : isRequestPortalPage || isForgotPasswordPage || isLoginPage || isRegisterPage
      ? "sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md"
      : "";

  const navLinkClassName = ({ isActive }) =>
    isActive
      ? "text-sm font-semibold text-brand-600"
      : "text-sm font-medium text-slate-600 transition hover:text-slate-900";

  if (isHomePage) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-[1240px] px-4 pb-16 pt-4 lg:px-6 lg:pt-6">
        <header className="mb-7 rounded-[24px] border border-slate-200/80 bg-white/88 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link className="flex min-w-0 items-center gap-3 text-slate-900" to="/">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_rgba(37,84,216,0.25)]">
                <span className="material-symbols-outlined text-[22px]">school</span>
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-[1.55rem] font-black tracking-[-0.04em] text-slate-900 sm:text-[1.75rem]">
                  AlumniConnect
                </strong>
                <span className="block text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Modern Alumni Platform
                </span>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50/85 p-1.5 md:flex">
              <a
                className="rounded-xl px-4 py-2 text-[0.95rem] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                href="#features"
              >
                Features
              </a>
              <a
                className="rounded-xl px-4 py-2 text-[0.95rem] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                href="#how-it-works"
              >
                How It Works
              </a>
              <a
                className="rounded-xl px-4 py-2 text-[0.95rem] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                href="#testimonials"
              >
                Testimonials
              </a>
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              {isPlatformDomain ? (
                <>
                  <NavLink
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    to="/login"
                  >
                    Login
                  </NavLink>
                  <NavLink
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,84,216,0.2)] transition hover:bg-brand-700"
                    to="/request-portal"
                  >
                    Register Institution
                  </NavLink>
                </>
              ) : auth.isAuthenticated ? (
                <>
                  <NavLink
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    to="/portal"
                  >
                    Portal
                  </NavLink>
                  <button
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    onClick={auth.logout}
                    type="button"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    to="/login"
                  >
                    Login
                  </NavLink>
                  <NavLink
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,84,216,0.2)] transition hover:bg-brand-700"
                    to="/register"
                  >
                    Alumni Signup
                  </NavLink>
                </>
              )}
            </div>

            <button
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">
                {isMobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>

          {isMobileMenuOpen ? (
            <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 md:hidden">
              <a
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                href="#features"
              >
                Features
              </a>
              <a
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                href="#how-it-works"
              >
                How It Works
              </a>
              <a
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                href="#testimonials"
              >
                Testimonials
              </a>

              <div className="mt-1 grid gap-2">
                {isPlatformDomain ? (
                  <>
                    <NavLink
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
                      to="/login"
                    >
                      Login
                    </NavLink>
                    <NavLink
                      className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white"
                      to="/request-portal"
                    >
                      Register Institution
                    </NavLink>
                  </>
                ) : auth.isAuthenticated ? (
                  <>
                    <NavLink
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
                      to="/portal"
                    >
                      Portal
                    </NavLink>
                    <button
                      className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white"
                      onClick={auth.logout}
                      type="button"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
                      to="/login"
                    >
                      Login
                    </NavLink>
                    <NavLink
                      className="rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white"
                      to="/register"
                    >
                      Alumni Signup
                    </NavLink>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </header>

        <main>{children}</main>
      </div>
    );
  }

  if (isAuthRoute) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-[1240px] px-4 pb-16 pt-4 lg:px-6 lg:pt-6">
        <header className="mb-6 rounded-[24px] border border-slate-200/80 bg-white/88 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link className="flex min-w-0 items-center gap-3 text-slate-900" to="/">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_rgba(37,84,216,0.25)]">
                <span className="material-symbols-outlined text-[22px]">school</span>
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-[1.55rem] font-black tracking-[-0.04em] text-slate-900 sm:text-[1.75rem]">
                  AlumniConnect
                </strong>
                <span className="block text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Secure Alumni Access
                </span>
              </div>
            </Link>

            <div className="hidden items-center gap-2 md:flex">
              <Link className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900" to="/">
                Back Home
              </Link>
              <Link
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                to={isLoginPage ? "/register" : "/login"}
              >
                {isLoginPage ? "Alumni Signup" : "Back to Login"}
              </Link>
              <Link
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,84,216,0.2)] transition hover:bg-brand-700"
                to="/request-portal"
              >
                Register Institution
              </Link>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700" to="/">
                Home
              </Link>
              <Link className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white" to={isLoginPage ? "/register" : "/login"}>
                {isLoginPage ? "Signup" : "Login"}
              </Link>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1320px] px-4 pb-16 lg:px-6">
      <header className={`mb-8 mt-4 rounded-[28px] border border-amber-200/70 bg-gradient-to-r from-amber-50 via-sky-50 to-white px-5 py-3 shadow-[0_14px_32px_rgba(15,23,42,0.08)] lg:mt-6 lg:px-8 ${topbarClassName}`}>
        <div className="mx-auto w-full max-w-[1160px]">
          <div className="flex items-center justify-between gap-4">
            <Link className="flex items-center gap-3 text-slate-900" to="/">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_8px_20px_rgba(37,84,216,0.35)]">
                <span className="material-symbols-outlined text-[20px]">school</span>
              </span>
              <strong className="text-[1.8rem] font-bold tracking-[-0.035em] text-slate-800 sm:text-[2rem]">
                AlumniConnect
              </strong>
            </Link>

            <nav className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 md:flex">
              <a
                className="rounded-xl px-4 py-2 text-[0.96rem] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                href="#features"
              >
                Features
              </a>
              <a
                className="rounded-xl px-4 py-2 text-[0.96rem] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                href="#how-it-works"
              >
                How It Works
              </a>
              <a
                className="rounded-xl px-4 py-2 text-[0.96rem] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                href="#testimonials"
              >
                Testimonials
              </a>
            </nav>

            <div className="flex items-center justify-end gap-3">
              {isRequestPortalPage ? (
                <>
                  <span className="hidden text-sm font-medium text-slate-500 sm:inline">Already registered?</span>
                  <NavLink
                    className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,84,216,0.22)] transition hover:bg-brand-700"
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
              ) : (
                <>
                  {navItems.map((item) => (
                    <NavLink key={item.to} className={navLinkClassName} to={item.to}>
                      {item.label}
                    </NavLink>
                  ))}
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
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

export default AppShell;
