import { useLocation } from "react-router-dom";
import Header from "./Header.jsx";

function AppShell({ children }) {
  const location = useLocation();
  const isPortalRoute = location.pathname.startsWith("/portal");
  const isSuperAdminRoute = location.pathname.startsWith("/super-admin");

  const isAuthRoute = ["/login", "/register", "/forgot-password"].includes(location.pathname);

  if (isPortalRoute || isSuperAdminRoute || isAuthRoute) {
    return <div className="w-full">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header />
      <main id="main-content" className="relative pt-8 pb-20">
        {children}
      </main>
    </div>
  );
}

export default AppShell;
