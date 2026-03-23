import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const configuredSubdomain = String(import.meta.env.VITE_TENANT_SUBDOMAIN || "").trim().toLowerCase();
  const configuredDomain = String(import.meta.env.VITE_TENANT_DOMAIN || "").trim().toLowerCase();
  const baseUrl = String(config.baseURL || api.defaults.baseURL || "");
  const isLocalApi = /localhost|127\.0\.0\.1/i.test(baseUrl);

  if (!config.headers) {
    config.headers = {};
  }

  if (isLocalApi && configuredSubdomain) {
    config.headers["x-tenant-subdomain"] = configuredSubdomain;
  }

  if (isLocalApi && configuredDomain) {
    config.headers["x-tenant-domain"] = configuredDomain;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const details = error?.response?.data?.details;
    const message =
      (Array.isArray(details) && details.length ? details.join(". ") : null) ||
      error?.response?.data?.message ||
      error.message ||
      "Request failed";

    return Promise.reject(new Error(message));
  }
);

export async function requestPortal(payload) {
  const { data } = await api.post("/institutes/request", payload);
  return data;
}

export async function login(payload) {
  const { data } = await api.post("/auth/login", payload);
  return data;
}

export async function logout() {
  const { data } = await api.post("/auth/logout");
  return data;
}

export async function fetchInstitutes() {
  const { data } = await api.get("/institutes");
  return data;
}

export async function fetchAdminAnalytics() {
  const { data } = await api.get("/admin/analytics");
  return data;
}

export async function fetchAuditLogs() {
  const { data } = await api.get("/admin/audit-logs");
  return data;
}

export async function fetchFilteredAuditLogs(params = {}) {
  const { data } = await api.get("/admin/audit-logs", { params });
  return data;
}

export async function fetchSupportOverview() {
  const { data } = await api.get("/admin/support-overview");
  return data;
}

export async function fetchInstituteDetail(id) {
  const { data } = await api.get(`/admin/institutes/${id}`);
  return data;
}

export async function updateInstituteSubscription(id, payload) {
  const { data } = await api.patch(`/admin/institutes/${id}/subscription`, payload);
  return data;
}

export async function resendInstituteAdminInvite(id) {
  const { data } = await api.post(`/admin/institutes/${id}/resend-admin-invite`);
  return data;
}

export async function fetchOpsStatus() {
  const { data } = await api.get("/ops/status");
  return data;
}

export async function approveInstitute(id, payload = {}) {
  const { data } = await api.patch(`/institutes/${id}/approve`, payload);
  return data;
}

export async function suspendInstitute(id) {
  const { data } = await api.patch(`/institutes/${id}/suspend`);
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function fetchAlumni(params = {}) {
  const { data } = await api.get("/alumni", { params });
  return data;
}

export async function inviteAlumni(payload) {
  const { data } = await api.post("/alumni/invite", payload);
  return data;
}

export async function resendAlumniInvite(profileId) {
  const { data } = await api.post(`/alumni/${profileId}/resend-invite`);
  return data;
}

export async function copyAlumniInviteLink(profileId) {
  const { data } = await api.post(`/alumni/${profileId}/copy-invite-link`);
  return data;
}

export async function revokeAlumniInvite(profileId) {
  const { data } = await api.post(`/alumni/${profileId}/revoke-invite`);
  return data;
}

export async function approveAlumniRegistration(profileId) {
  const { data } = await api.post(`/alumni/${profileId}/approve-registration`);
  return data;
}

export async function fetchMyAlumniProfile() {
  const { data } = await api.get("/alumni/me");
  return data;
}

export async function updateMyAlumniProfile(payload) {
  const { data } = await api.patch("/alumni/me", payload);
  return data;
}

export async function fetchInviteDetails(token) {
  const { data } = await api.get(`/auth/invite/${token}`);
  return data;
}

export async function setupPassword(payload) {
  const { data } = await api.post("/auth/setup-password", payload);
  return data;
}

export async function fetchEvents() {
  const { data } = await api.get("/events");
  return data;
}

export async function createEvent(payload) {
  const { data } = await api.post("/events", payload);
  return data;
}

export async function updateEvent(id, payload) {
  const { data } = await api.patch(`/events/${id}`, payload);
  return data;
}

export async function deleteEvent(id) {
  const { data } = await api.delete(`/events/${id}`);
  return data;
}

export async function registerForEvent(id) {
  const { data } = await api.post(`/events/${id}/register`);
  return data;
}

export async function cancelEventRegistration(id) {
  const { data } = await api.delete(`/events/${id}/register`);
  return data;
}

export async function fetchJobs() {
  const { data } = await api.get("/jobs");
  return data;
}

export async function createJob(payload) {
  const { data } = await api.post("/jobs", payload);
  return data;
}

export async function updateJob(id, payload) {
  const { data } = await api.patch(`/jobs/${id}`, payload);
  return data;
}

export async function deleteJob(id) {
  const { data } = await api.delete(`/jobs/${id}`);
  return data;
}

export async function applyToJob(jobId, payload) {
  const { data } = await api.post(`/jobs/${jobId}/apply`, payload);
  return data;
}

export async function fetchAnnouncements() {
  const { data } = await api.get("/announcements");
  return data;
}

export async function createAnnouncement(payload) {
  const { data } = await api.post("/announcements", payload);
  return data;
}

export async function updateAnnouncement(id, payload) {
  const { data } = await api.patch(`/announcements/${id}`, payload);
  return data;
}

export async function deleteAnnouncement(id) {
  const { data } = await api.delete(`/announcements/${id}`);
  return data;
}

export async function fetchFeed() {
  const { data } = await api.get("/feed");
  return data;
}

export async function fetchMentorshipRequests() {
  const { data } = await api.get("/mentorship");
  return data;
}

export async function createMentorshipRequest(payload) {
  const { data } = await api.post("/mentorship", payload);
  return data;
}

export async function createGroupConversation(payload) {
  const { data } = await api.post("/mentorship/groups", payload);
  return data;
}

export async function updateMentorshipRequest(id, payload) {
  const { data } = await api.patch(`/mentorship/${id}`, payload);
  return data;
}

export async function sendMentorshipMessage(id, payload) {
  const { data } = await api.post(`/mentorship/${id}/messages`, payload);
  return data;
}

export async function leaveGroupConversation(id) {
  const { data } = await api.post(`/mentorship/${id}/leave`);
  return data;
}

export async function fetchNotificationSummary() {
  const { data } = await api.get("/notifications/summary");
  return data;
}

export default api;
