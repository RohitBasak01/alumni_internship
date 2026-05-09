import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { ARIA_LABELS, ARIA_ROLES, makeFocusable } from "../utils/accessibility.js";
import ThemeToggle from "./ThemeToggle.jsx";

const publicNavItems = [
  { to: "/", label: "Home", aria: "Go to home page" },
  { to: "/request-portal", label: "Request Portal", aria: "Request a new alumni portal" },
  { to: "/login", label: "Login", aria: "Log in to your account" },
  { to: "/register", label: "Register", aria: "Create a new account" }
];

function Header() {
  const location = useLocation();
  const tenant = useTenantContext();
  const auth = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isHomePage = location.pathname === "/";
  const isLoginPage = location.pathname === "/login";
  const isRegisterPage = location.pathname === "/register";
  const isAuthRoute = isLoginPage || isRegisterPage || location.pathname === "/forgot-password";
  const isPlatformDomain = !tenant.isTenant;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [...publicNavItems];
  if (auth.user?.role === "super_admin") {
    navItems.push({ to: "/super-admin", label: "Super Admin", aria: "Access super admin dashboard" });
  }

  const navLinkClassName = ({ isActive }) =>
    `px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
      isActive
        ? "bg-brand-50 text-brand-600 shadow-sm"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;

  const handleMobileMenuKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsMobileMenuOpen(false);
      // Focus the menu toggle button when closing with Escape
      const toggleButton = document.querySelector('[aria-label="Toggle mobile menu"]');
      if (toggleButton) toggleButton.focus();
    }
  };

  return (
    <header
      className="sticky top-6 z-50 mx-auto w-full max-w-[1280px] px-6"
      role={ARIA_ROLES.BANNER}
      aria-label={ARIA_LABELS.MAIN_NAV}
    >
      <div className="glass-card rounded-[32px] px-6 py-4 md:px-8 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.1)] border-white/40">
        <div className="flex items-center justify-between gap-8">
          {/* Logo Section */}
          <Link
            className="flex items-center gap-4 group focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded-xl"
            to={tenant.getTenantAwarePath("/")}
            aria-label="AlumNet home page"
          >
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white shadow-xl shadow-brand-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[28px] font-bold">school</span>
            </div>
            <div className="hidden sm:block">
              <strong className="block text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">
                AlumNet
              </strong>
              <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-brand-600/80">
                {tenant.isTenant ? tenant.displayName : "Global Network"}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden lg:flex items-center gap-2 p-1.5 bg-slate-100/50 rounded-[20px] border border-slate-200/50"
            aria-label="Main navigation"
            role={ARIA_ROLES.NAVIGATION}
          >
            {isHomePage && (
              <>
                <a
                  href="#features"
                  className="px-5 py-2.5 text-[15px] font-bold text-slate-500 hover:text-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded-lg"
                  aria-label="Jump to features section"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="px-5 py-2.5 text-[15px] font-bold text-slate-500 hover:text-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded-lg"
                  aria-label="Jump to how it works section"
                >
                  Process
                </a>
              </>
            )}
            {!isAuthRoute && navItems.slice(0, 2).map((item) => (
              <NavLink
                key={item.to}
                to={tenant.getTenantAwarePath(item.to)}
                className={navLinkClassName}
                aria-label={item.aria}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ThemeToggle
              size="md"
              className="hidden sm:flex"
              aria-label="Toggle between light and dark mode"
            />

            {auth.isAuthenticated ? (
              <>
                <Link
                  to={tenant.getTenantAwarePath("/portal")}
                  className="btn-primary py-2.5 px-6 text-[15px] hidden sm:flex shadow-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  aria-label="Go to dashboard"
                >
                  Dashboard
                </Link>
                <button
                  onClick={auth.logout}
                  className="h-11 w-11 rounded-2xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label="Log out of your account"
                  title="Logout"
                >
                  <span className="material-symbols-outlined">logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to={tenant.getTenantAwarePath("/login")}
                  className="hidden md:block px-6 py-2.5 text-[15px] font-black text-slate-600 hover:text-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded-lg"
                  aria-label="Log in to your account"
                >
                  Login
                </Link>
                <Link
                  to={tenant.getTenantAwarePath(isPlatformDomain ? "/request-portal" : "/register")}
                  className="btn-primary py-3 px-7 text-[15px] font-black tracking-tight focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  aria-label={isPlatformDomain ? "Start a new alumni platform" : "Join the alumni network"}
                >
                  {isPlatformDomain ? "Start Platform" : "Join Now"}
                </Link>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              aria-label={isMobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-haspopup="true"
            >
              <span className="material-symbols-outlined font-bold">
                {isMobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="mt-4 py-4 border-t border-slate-100 dark:border-surface-700 lg:hidden flex flex-col gap-2"
            role="menu"
            aria-label="Mobile navigation menu"
            onKeyDown={handleMobileMenuKeyDown}
          >
            {/* Theme Toggle for Mobile */}
            <div className="px-4 py-3 flex items-center justify-between mobile-menu-item">
              <span className="font-semibold text-slate-600 dark:text-ink-300">Theme</span>
              <ThemeToggle
                size="sm"
                className="sm:hidden"
                aria-label="Toggle between light and dark mode"
              />
            </div>
            
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={tenant.getTenantAwarePath(item.to)}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 mobile-menu-item ${
                    isActive
                      ? "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                      : "text-slate-600 dark:text-ink-300 hover:bg-slate-50 dark:hover:bg-surface-700"
                  }`
                }
                role="menuitem"
                aria-label={item.aria}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
