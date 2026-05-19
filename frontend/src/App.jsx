import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./context/AuthContext.jsx";
import { useTenantContext } from "./hooks/useTenantContext.js";

import AppShell from "./components/AppShell.jsx";
import DashboardLayout from "./components/DashboardLayout.jsx";
import PageLoader from "./components/PageLoader.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DevTenantSwitcher from "./components/DevTenantSwitcher.jsx";

const AlumniProfilePage = lazy(() => import("./pages/AlumniProfilePage.jsx"));
const AlumniSettingsPage = lazy(() => import("./pages/AlumniSettingsPage.jsx"));
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
const ResumeBuilderPage = lazy(() => import("./pages/ResumeBuilderPage.jsx"));
const ReunionPage = lazy(() => import("./pages/ReunionPage.jsx"));
const ForumPage = lazy(() => import("./pages/ForumPage.jsx"));
const ConnectionsPage = lazy(() => import("./pages/ConnectionsPage.jsx"));
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
const ContentModerationPage = lazy(() => import("./pages/ContentModerationPage.jsx"));
const ManageAdminsPage = lazy(() => import("./pages/ManageAdminsPage.jsx"));
const FundraisingPage = lazy(() => import("./pages/FundraisingPage.jsx"));
const CampaignDetailsPage = lazy(() => import("./pages/CampaignDetailsPage.jsx"));
const AdminFundraisingPage = lazy(() => import("./pages/AdminFundraisingPage.jsx"));
const MentorsDirectoryPage = lazy(() => import("./pages/MentorsDirectoryPage.jsx"));
const MentorOptInPage = lazy(() => import("./pages/MentorOptInPage.jsx"));
const MentorshipDashboard = lazy(() => import("./pages/MentorshipDashboard.jsx"));
const EmailCampaignPage = lazy(() => import("./pages/EmailCampaignPage.jsx"));
const AdminInsightPage = lazy(() => import("./pages/AdminInsightPage.jsx"));

/**
 * RootPage — serves the platform landing page for the main domain
 * and the per-institution home page for tenant subdomains / domains.
 */
function RootPage() {
  const tenant = useTenantContext();
  if (tenant.isTenant) {
    return <TenantHomePage />;
  }
  return <HomePage />;
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
            path="/portal"
            element={
              <ProtectedRoute
                allow={(user) =>
                  user?.role === "alumni" || user?.role === "institute_admin"
                }
              >
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TenantDashboardPage />} />
            <Route path="alumni" element={<TenantAlumniPage />} />
            <Route path="feed" element={<FeedPage />} />
            <Route
              path="friendship"
              element={<Navigate replace to="/portal/messages" />}
            />
            <Route path="connections" element={<ConnectionRequestsPage />} />
            <Route path="groups" element={<CommunityGroupsPage />} />
            <Route path="profile" element={<AlumniProfilePage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/create" element={<CreateEventPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="resume-builder" element={<ResumeBuilderPage />} />
            <Route path="reunions" element={<ReunionPage />} />
            <Route path="forums" element={<ForumPage />} />
            
            {/* Mentorship Routes */}
            <Route path="mentors" element={<MentorsDirectoryPage />} />
            <Route path="mentors/join" element={<MentorOptInPage />} />
            <Route path="mentorship-sessions" element={<MentorshipDashboard />} />
            
            <Route path="gallery" element={<GalleryPage />} />
            
            <Route path="fundraising" element={<FundraisingPage />} />
            <Route path="fundraising/:id" element={<CampaignDetailsPage />} />
            <Route
              path="admin/fundraising"
              element={
                <ProtectedRoute allow={(user) => user?.role === "institute_admin"}>
                  <AdminFundraisingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/campaigns"
              element={
                <ProtectedRoute allow={(user) => user?.role === "institute_admin"}>
                  <EmailCampaignPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="insights"
              element={
                <ProtectedRoute allow={(user) => user?.role === "institute_admin"}>
                  <AdminInsightPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="business-directory"
              element={<BusinessDirectoryPage />}
            />
            <Route path="newsroom" element={<NewsroomPage />} />
            <Route
              path="notifications"
              element={<NotificationsPage />}
            />
            <Route path="settings" element={<AlumniSettingsPage />} />
            <Route
              path="institution-settings"
              element={
                <ProtectedRoute allow={(user) => user?.role === "institute_admin"}>
                  <InstitutionSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="moderation"
              element={
                <ProtectedRoute allow={(user) => user?.role === "institute_admin"}>
                  <ContentModerationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admins"
              element={
                <ProtectedRoute allow={(user) => user?.role === "institute_admin"}>
                  <ManageAdminsPage />
                </ProtectedRoute>
              }
            />
            <Route path="requests" element={<ConnectionsPage />} />
            <Route path="*" element={<Navigate replace to="/portal" />} />
          </Route>
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default App;
