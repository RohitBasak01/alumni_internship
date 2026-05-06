import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { useTenantContext } from "./hooks/useTenantContext.js";

import AppShell from "./components/AppShell.jsx";
import DashboardLayout from "./components/DashboardLayout.jsx";
import PageLoader from "./components/PageLoader.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DevTenantSwitcher from "./components/DevTenantSwitcher.jsx";

const AlumniProfilePage = lazy(() => import("./pages/AlumniProfilePage.jsx"));
const BusinessDirectoryPage = lazy(
  () => import("./pages/BusinessDirectoryPage.jsx"),
);
const CommunityGroupsPage = lazy(
  () => import("./pages/CommunityGroupsPage.jsx"),
);
const ConnectionRequestsPage = lazy(
  () => import("./pages/ConnectionRequestsPage.jsx"),
);
const CreateEventPage = lazy(() => import("./pages/CreateEventPage.jsx"));
const EventsPage = lazy(() => import("./pages/EventsPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx"));
const GalleryPage = lazy(() => import("./pages/GalleryPage.jsx"));
const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const InstitutionSettingsPage = lazy(
  () => import("./pages/InstitutionSettingsPage.jsx"),
);
const JobsPage = lazy(() => import("./pages/JobsPage.jsx"));
const LegalPage = lazy(() => import("./pages/LegalPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const MentorshipPage = lazy(() => import("./pages/MentorshipPage.jsx"));
const NewsroomPage = lazy(() => import("./pages/NewsroomPage.jsx"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.jsx"));
const PortalRequestPage = lazy(() => import("./pages/PortalRequestPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const SetupPasswordPage = lazy(() => import("./pages/SetupPasswordPage.jsx"));
const SuperAdminPage = lazy(() => import("./pages/SuperAdminPage.jsx"));
const TenantAlumniPage = lazy(() => import("./pages/TenantAlumniPage.jsx"));
const TenantDashboardPage = lazy(
  () => import("./pages/TenantDashboardPage.jsx"),
);
const TenantHomePage = lazy(() => import("./pages/TenantHomePage.jsx"));
const FeedPage = lazy(() => import("./pages/FeedPage.jsx"));

/**
 * RootPage — serves the platform landing page for the main domain
 * and the per-institution home page for tenant subdomains / domains.
 */
function RootPage() {
  const { isTenant } = useTenantContext();
  return isTenant ? <TenantHomePage /> : <HomePage />;
}

function App() {
  return (
    <AppShell>
      <DevTenantSwitcher />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<RootPage />} />
          <Route path="/request-portal" element={<PortalRequestPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/setup-password/:token"
            element={<SetupPasswordPage />}
          />
          <Route path="/legal/:type" element={<LegalPage />} />
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute allow={(user) => user?.role === "super_admin"}>
                <SuperAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/*"
            element={
              <ProtectedRoute
                allow={(user) =>
                  user?.role === "institute_admin" || user?.role === "alumni"
                }
              >
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TenantDashboardPage />} />
            <Route path="feed" element={<FeedPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route
              path="announcements"
              element={<Navigate replace to="/portal/newsroom" />}
            />
            <Route path="newsroom" element={<NewsroomPage />} />
            <Route path="settings" element={<InstitutionSettingsPage />} />
            <Route path="alumni" element={<TenantAlumniPage />} />
            <Route
              path="approvals"
              element={<Navigate replace to="/portal/alumni" />}
            />
            <Route path="messages" element={<MentorshipPage />} />
            <Route
              path="mentorship"
              element={<Navigate replace to="/portal/messages" />}
            />
            <Route path="connections" element={<ConnectionRequestsPage />} />
            <Route path="groups" element={<CommunityGroupsPage />} />
            <Route path="profile" element={<AlumniProfilePage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/create" element={<CreateEventPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route
              path="business-directory"
              element={<BusinessDirectoryPage />}
            />
            <Route
              path="business-directory/add"
              element={<BusinessDirectoryPage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default App;
