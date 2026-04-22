import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import PageLoader from "./PageLoader.jsx";

function ProtectedRoute({ allow, children }) {
  const location = useLocation();
  const auth = useAuth();

  if (auth.isLoading) {
    return <PageLoader label="Checking your session..." />;
  }

  if (auth.sessionError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <div className="rounded-[24px] border border-rose-200/70 bg-white/95 p-8 shadow-[0_10px_24px_rgba(20,33,61,0.05)]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Session Error</p>
          <h1 className="m-0 text-3xl font-semibold tracking-[-0.04em] text-slate-900">
            We could not verify your session
          </h1>
          <p className="mt-3 text-slate-500">{auth.sessionError.message}</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (!allow(auth.user)) {
    return <Navigate replace to={auth.user?.role === "super_admin" ? "/super-admin" : "/portal"} />;
  }

  return children;
}

export default ProtectedRoute;
