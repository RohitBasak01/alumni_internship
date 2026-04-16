import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell.jsx";
import DashboardLayout from "./components/DashboardLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import SuperAdminPage from "./pages/SuperAdminPage.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import JobsPage from "./pages/JobsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MentorshipPage from "./pages/MentorshipPage.jsx";
import PortalRequestPage from "./pages/PortalRequestPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import NewsroomPage from "./pages/NewsroomPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import InstitutionSettingsPage from "./pages/InstitutionSettingsPage.jsx";
import TenantAlumniPage from "./pages/TenantAlumniPage.jsx";
import TenantDashboardPage from "./pages/TenantDashboardPage.jsx";
import AlumniProfilePage from "./pages/AlumniProfilePage.jsx";
import ConnectionRequestsPage from "./pages/ConnectionRequestsPage.jsx";
import SetupPasswordPage from "./pages/SetupPasswordPage.jsx";
import GalleryPage from "./pages/GalleryPage.jsx";
import BusinessDirectoryPage from "./pages/BusinessDirectoryPage.jsx";
import CreateEventPage from "./pages/CreateEventPage.jsx";
import CommunityGroupsPage from "./pages/CommunityGroupsPage.jsx";

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/request-portal" element={<PortalRequestPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/setup-password/:token" element={<SetupPasswordPage />} />
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
            <ProtectedRoute allow={(user) => user?.role === "institute_admin" || user?.role === "alumni"}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TenantDashboardPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="announcements" element={<Navigate replace to="/portal/newsroom" />} />
          <Route path="newsroom" element={<NewsroomPage />} />
          <Route path="settings" element={<InstitutionSettingsPage />} />
          <Route path="alumni" element={<TenantAlumniPage />} />
          <Route path="approvals" element={<Navigate replace to="/portal/alumni" />} />
          <Route path="mentorship" element={<MentorshipPage />} />
          <Route path="connections" element={<ConnectionRequestsPage />} />
          <Route path="groups" element={<CommunityGroupsPage />} />
          <Route path="profile" element={<AlumniProfilePage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/create" element={<CreateEventPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="business-directory" element={<BusinessDirectoryPage />} />
          <Route path="business-directory/add" element={<BusinessDirectoryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
