import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true
});

function getConfiguredTenantContext() {
  const configuredSubdomain = String(import.meta.env.VITE_TENANT_SUBDOMAIN || "").trim().toLowerCase();
  const configuredDomain = String(import.meta.env.VITE_TENANT_DOMAIN || "").trim().toLowerCase();
  const browserHost = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const reservedHosts = new Set(["localhost", "127.0.0.1"]);

  if (configuredSubdomain || configuredDomain) {
    return {
      tenantSubdomain: configuredSubdomain,
      tenantDomain: configuredDomain
    };
  }

  if (browserHost && !reservedHosts.has(browserHost)) {
    const parts = browserHost.split(".");
    return {
      tenantSubdomain: parts.length >= 3 ? parts[0] : "",
      tenantDomain: parts.length >= 2 ? browserHost : ""
    };
  }

  return {
    tenantSubdomain: "",
    tenantDomain: ""
  };
}

export function getApiOrigin() {
  const baseUrl = String(api.defaults.baseURL || "http://localhost:5000/api");
  const normalized = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function resolveApiAssetUrl(assetUrl) {
  const value = String(assetUrl || "").trim();
  if (!value) {
    return "";
  }

  if (/^data:/i.test(value) || /^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${getApiOrigin()}${value}`;
  }

  return `${getApiOrigin()}/${value}`;
}

api.interceptors.request.use((config) => {
  const { tenantSubdomain, tenantDomain } = getConfiguredTenantContext();
  const baseUrl = String(config.baseURL || api.defaults.baseURL || "");
  const isLocalApi = /localhost|127\.0\.0\.1/i.test(baseUrl);

  if (!config.headers) {
    config.headers = {};
  }

  if (isLocalApi && tenantSubdomain) {
    config.headers["x-tenant-subdomain"] = tenantSubdomain;
  }

  if (isLocalApi && tenantDomain) {
    config.headers["x-tenant-domain"] = tenantDomain;
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

export function getOAuthStartUrl(provider, options = {}) {
  const { tenantSubdomain, tenantDomain } = {
    ...getConfiguredTenantContext(),
    ...options
  };
  const url = new URL(`/api/auth/oauth/${provider}/start`, getApiOrigin());

  url.searchParams.set("mode", options.mode || "login");

  if (tenantSubdomain) {
    url.searchParams.set("tenantSubdomain", tenantSubdomain);
  }

  if (tenantDomain) {
    url.searchParams.set("tenantDomain", tenantDomain);
  }

  return url.toString();
}

export async function fetchOAuthSession() {
  const { data } = await api.get("/auth/oauth/session");
  return data;
}

export async function clearOAuthSession() {
  const { data } = await api.delete("/auth/oauth/session");
  return data;
}

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

export async function fetchPublicInstitutes() {
  const { data } = await api.get("/institutes/public");
  return data;
}

export async function submitAlumniRegistration(payload) {
  const { data } = await api.post("/auth/alumni-registration", payload);
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

export async function fetchAlumniPosts() {
  const { data } = await api.get("/alumni-posts");
  return data;
}

export async function createAlumniPost(payload) {
  const { data } = await api.post("/alumni-posts", payload);
  return data;
}

export async function fetchAlumniPost(id) {
  const { data } = await api.get(`/alumni-posts/${id}`);
  return data;
}

export async function toggleAlumniPostLike(id) {
  const { data } = await api.post(`/alumni-posts/${id}/like`);
  return data;
}

export async function addAlumniPostComment(id, payload) {
  const { data } = await api.post(`/alumni-posts/${id}/comments`, payload);
  return data;
}

export async function reportAlumniPost(id, payload) {
  const { data } = await api.post(`/alumni-posts/${id}/report`, payload);
  return data;
}

export async function fetchFeed() {
  const { data } = await api.get("/feed");
  return data;
}

export async function fetchGalleryItems() {
  const { data } = await api.get("/gallery");
  return data;
}

export async function createGalleryItem(payload) {
  const { data } = await api.post("/gallery", payload);
  return data;
}

export async function deleteGalleryItem(id) {
  const { data } = await api.delete(`/gallery/${id}`);
  return data;
}

export async function fetchBusinessListings() {
  const { data } = await api.get("/business-directory");
  return data;
}

export async function createBusinessListing(payload) {
  const { data } = await api.post("/business-directory", payload);
  return data;
}

export async function deleteBusinessListing(id) {
  const { data } = await api.delete(`/business-directory/${id}`);
  return data;
}

export async function fetchCommunityGroups() {
  const { data } = await api.get("/community-groups");
  return data;
}

export async function createCommunityGroup(payload) {
  const { data } = await api.post("/community-groups", payload);
  return data;
}

export async function updateCommunityGroup(id, payload) {
  const { data } = await api.patch(`/community-groups/${id}`, payload);
  return data;
}

export async function deleteCommunityGroup(id) {
  const { data } = await api.delete(`/community-groups/${id}`);
  return data;
}

export async function sendCommunityGroupMessage(id, payload) {
  const { data } = await api.post(`/community-groups/${id}/messages`, payload);
  return data;
}

export async function fetchNotifications(params = {}) {
  const { data } = await api.get("/notifications", { params });
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await api.post(`/notifications/${id}/read`);
  return data;
}

export async function dismissNotification(id) {
  const { data } = await api.post(`/notifications/${id}/dismiss`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.post("/notifications/mark-all-read");
  return data;
}
export async function fetchNotificationSummary() {
  const { data } = await api.get("/notifications/summary");
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

export async function upsertMentorshipE2eePublicKey(payload) {
  const { data } = await api.put("/mentorship/e2ee/public-key", payload);
  return data;
}

export async function syncMentorshipConversationEnvelopes(id, payload) {
  const { data } = await api.patch(`/mentorship/${id}/e2ee/envelopes`, payload);
  return data;
}

export async function uploadMentorshipAttachment(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/mentorship/uploads", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return data;
}

export async function markMentorshipConversationRead(id) {
  const { data } = await api.post(`/mentorship/${id}/read`);
  return data;
}

export async function setMentorshipTyping(id, payload) {
  const { data } = await api.post(`/mentorship/${id}/typing`, payload);
  return data;
}

export async function editMentorshipMessage(requestId, messageId, payload) {
  const { data } = await api.patch(`/mentorship/${requestId}/messages/${messageId}`, payload);
  return data;
}

export async function deleteMentorshipMessage(requestId, messageId) {
  const { data } = await api.delete(`/mentorship/${requestId}/messages/${messageId}`);
  return data;
}

export async function toggleMentorshipMessageReaction(requestId, messageId, payload) {
  const { data } = await api.post(`/mentorship/${requestId}/messages/${messageId}/reactions`, payload);
  return data;
}

export async function updateGroupMemberRole(requestId, userId, payload) {
  const { data } = await api.patch(`/mentorship/${requestId}/members/${userId}/role`, payload);
  return data;
}

export async function muteGroupMember(requestId, userId, payload) {
  const { data } = await api.patch(`/mentorship/${requestId}/members/${userId}/mute`, payload);
  return data;
}

export async function unmuteGroupMember(requestId, userId) {
  const { data } = await api.delete(`/mentorship/${requestId}/members/${userId}/mute`);
  return data;
}

export async function removeGroupMember(requestId, userId) {
  const { data } = await api.delete(`/mentorship/${requestId}/members/${userId}`);
  return data;
}

export async function leaveGroupConversation(id) {
  const { data } = await api.post(`/mentorship/${id}/leave`);
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


