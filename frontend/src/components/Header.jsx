import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";

const publicNavItems = [
  { to: "/", label: "Home" },
  { to: "/request-portal", label: "Request Portal" },
  { to: "/login", label: "Login" },
  { to: "/register", label: "Register" }
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
    navItems.push({ to: "/super-admin", label: "Super Admin" });
  }

  const navLinkClassName = ({ isActive }) =>
    `px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
      isActive
        ? "bg-brand-50 text-brand-600 shadow-sm"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-6 z-50 mx-auto w-full max-w-[1280px] px-6">
      <div className="glass-card rounded-[32px] px-6 py-4 md:px-8 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.1)] border-white/40">
        <div className="flex items-center justify-between gap-8">
          {/* Logo Section */}
          <Link className="flex items-center gap-4 group" to={tenant.getTenantAwarePath("/")}>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white shadow-xl shadow-brand-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
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
          <nav className="hidden lg:flex items-center gap-2 p-1.5 bg-slate-100/50 rounded-[20px] border border-slate-200/50">
            {isHomePage && (
              <>
                <a href="#features" className="px-5 py-2.5 text-[15px] font-bold text-slate-500 hover:text-brand-600 transition-colors">Features</a>
                <a href="#how-it-works" className="px-5 py-2.5 text-[15px] font-bold text-slate-500 hover:text-brand-600 transition-colors">Process</a>
              </>
            )}
            {!isAuthRoute && navItems.slice(0, 2).map((item) => (
              <NavLink key={item.to} to={tenant.getTenantAwarePath(item.to)} className={navLinkClassName}>
                {item.label}
              </NavLink>
            ))}
          </nav>
 
          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {auth.isAuthenticated ? (
              <>
                <Link to={tenant.getTenantAwarePath("/portal")} className="btn-primary py-2.5 px-6 text-[15px] hidden sm:flex shadow-none">
                  Dashboard
                </Link>
                <button 
                  onClick={auth.logout}
                  className="h-11 w-11 rounded-2xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center"
                  title="Logout"
                >
                  <span className="material-symbols-outlined">logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to={tenant.getTenantAwarePath("/login")} className="hidden md:block px-6 py-2.5 text-[15px] font-black text-slate-600 hover:text-brand-600 transition-colors">
                  Login
                </Link>
                <Link to={tenant.getTenantAwarePath(isPlatformDomain ? "/request-portal" : "/register")} className="btn-primary py-3 px-7 text-[15px] font-black tracking-tight">
                  {isPlatformDomain ? "Start Platform" : "Join Now"}
                </Link>
              </>
            )}
 
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined font-bold">
                {isMobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="mt-4 py-4 border-t border-slate-100 lg:hidden flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink 
                key={item.to} 
                to={tenant.getTenantAwarePath(item.to)} 
                className={({ isActive }) => 
                  `px-4 py-3 rounded-xl font-semibold transition-colors ${
                    isActive ? "bg-brand-50 text-brand-600" : "text-slate-600 hover:bg-slate-50"
                  }`
                }
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
