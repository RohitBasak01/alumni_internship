import { useLocation } from "react-router-dom";
import Header from "./Header.jsx";
import "../styles/accessibility.css";

function AppShell({ children }) {
  const location = useLocation();
  const isPortalRoute = location.pathname.startsWith("/portal");
  const isSuperAdminRoute = location.pathname.startsWith("/super-admin");
  const isAuthRoute = ["/login", "/register", "/forgot-password"].includes(location.pathname);
  const isHomePage = location.pathname === "/";

  // Portal and super-admin get a full-height wrapper so DashboardLayout flex works correctly
  if (isPortalRoute || isSuperAdminRoute) {
    return (
      <>
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>{children}</div>
      </>
    );
  }

  if (isAuthRoute || isHomePage) {
    return (
      <>
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <div className="w-full">{children}</div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="relative pt-8 pb-20" tabIndex="-1">
        {children}
      </main>
    </div>
  );
}

export default AppShell;
