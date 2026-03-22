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
import AnnouncementsPage from "./pages/AnnouncementsPage.jsx";
import TenantAlumniPage from "./pages/TenantAlumniPage.jsx";
import TenantDashboardPage from "./pages/TenantDashboardPage.jsx";
import AlumniProfilePage from "./pages/AlumniProfilePage.jsx";
import ConnectionRequestsPage from "./pages/ConnectionRequestsPage.jsx";
import SetupPasswordPage from "./pages/SetupPasswordPage.jsx";

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/request-portal" element={<PortalRequestPage />} />
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
          path="/portal"
          element={
            <ProtectedRoute allow={(user) => user?.role === "institute_admin" || user?.role === "alumni"}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TenantDashboardPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="alumni" element={<TenantAlumniPage />} />
          <Route path="approvals" element={<Navigate replace to="/portal/alumni" />} />
          <Route path="mentorship" element={<MentorshipPage />} />
          <Route path="connections" element={<ConnectionRequestsPage />} />
          <Route path="profile" element={<AlumniProfilePage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="jobs" element={<JobsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
