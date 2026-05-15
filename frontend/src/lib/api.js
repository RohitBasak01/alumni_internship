/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {'alumni' | 'institute_admin' | 'super_admin'} role
 */

/**
 * @typedef {Object} AlumniProfile
 * @property {string} _id
 * @property {string} name
 * @property {string} email
 * @property {string} batch
 * @property {string} department
 * @property {string} company
 * @property {string} designation
 * @property {boolean} isActive
 */

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true
});

let csrfWarmupPromise = null;

function readCsrfTokenFromCookie() {
  if (typeof document === "undefined") {
    return "";
  }

  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrfToken="))
      ?.split("=")[1] || ""
  );
}

async function ensureCsrfTokenCookie() {
  const existingToken = readCsrfTokenFromCookie();
  if (existingToken) {
    return existingToken;
  }

  if (!csrfWarmupPromise) {
    csrfWarmupPromise = api
      .get("/auth/oauth/session")
      .catch(() => null)
      .finally(() => {
        csrfWarmupPromise = null;
      });
  }

  await csrfWarmupPromise;
  return readCsrfTokenFromCookie();
}

function getConfiguredTenantContext() {
  const browserHost = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const storage = typeof window !== "undefined" ? window.localStorage : null;
  const searchParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const queryTenant = searchParams?.get("tenant")?.trim()?.toLowerCase();

  const tenantSubdomainOverride = String(storage?.getItem("tenantSubdomain") || "")
    .trim()
    .toLowerCase();
  const tenantDomainOverride = String(storage?.getItem("tenantDomain") || "")
    .trim()
    .toLowerCase();

  const configuredSubdomain = String(import.meta.env.VITE_TENANT_SUBDOMAIN || "")
    .trim()
    .toLowerCase();
  const configuredDomain = String(import.meta.env.VITE_TENANT_DOMAIN || "")
    .trim()
    .toLowerCase();
  const reservedHosts = new Set(["localhost", "127.0.0.1"]);

  // 1. Query Param Override (Dev/Testing)
  if (queryTenant) {
    return {
      tenantSubdomain: queryTenant,
      tenantDomain: ""
    };
  }

  // 2. Local Storage Override
  if (tenantSubdomainOverride || tenantDomainOverride) {
    return {
      tenantSubdomain: tenantSubdomainOverride,
      tenantDomain: tenantDomainOverride
    };
  }

  // 3. Platform Configuration
  if (configuredSubdomain || configuredDomain) {
    return {
      tenantSubdomain: configuredSubdomain,
      tenantDomain: configuredDomain
    };
  }

  // 4. Subdomain Detection
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

function isLocalHost(hostname) {
  const normalizedHost = String(hostname || "")
    .trim()
    .toLowerCase();
  return normalizedHost === "localhost" || normalizedHost === "127.0.0.1";
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

api.interceptors.request.use(async (config) => {
  const { tenantSubdomain, tenantDomain } = getConfiguredTenantContext();
  const baseUrl = String(config.baseURL || api.defaults.baseURL || "");
  const isLocalApi = /localhost|127\.0\.0\.1/i.test(baseUrl);
  const method = String(config.method || "get").toUpperCase();
  const isSafeMethod = method === "GET" || method === "HEAD" || method === "OPTIONS";

  if (!config.headers) {
    config.headers = {};
  }

  let csrfToken = readCsrfTokenFromCookie();
  if (!isSafeMethod && !csrfToken) {
    csrfToken = await ensureCsrfTokenCookie();
  }

  if (csrfToken) {
    config.headers["x-csrf-token"] = csrfToken;
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

    const normalizedError = new Error(message);
    normalizedError.status = error?.response?.status || null;
    normalizedError.response = error?.response || null;
    normalizedError.data = error?.response?.data || null;

    return Promise.reject(normalizedError);
  }
);

export function buildTenantPortalUrl(institute, path = "/login") {
  const targetPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedDomain = String(institute?.domain || "")
    .trim()
    .toLowerCase();
  const normalizedSubdomain = String(institute?.subdomain || "")
    .trim()
    .toLowerCase();

  if (typeof window !== "undefined") {
    const currentUrl = new URL(window.location.href);
    const protocol = currentUrl.protocol || "https:";

    if (isLocalHost(currentUrl.hostname)) {
      return `${currentUrl.origin}${targetPath}`;
    }

    if (normalizedDomain) {
      return `${protocol}//${normalizedDomain}${targetPath}`;
    }

    const hostnameParts = currentUrl.hostname.split(".");
    if (normalizedSubdomain && hostnameParts.length >= 2) {
      const rootHost = hostnameParts.slice(-2).join(".");
      return `${protocol}//${normalizedSubdomain}.${rootHost}${targetPath}`;
    }
  }

  if (normalizedDomain) {
    return `https://${normalizedDomain}${targetPath}`;
  }

  if (normalizedSubdomain) {
    return `https://${normalizedSubdomain}.yourplatform.com${targetPath}`;
  }

  return targetPath;
}

export function redirectToTenantPortal(institute, path = "/login") {
  if (typeof window === "undefined") {
    return false;
  }

  const normalizedDomain = String(institute?.domain || "")
    .trim()
    .toLowerCase();
  const normalizedSubdomain = String(institute?.subdomain || "")
    .trim()
    .toLowerCase();

  if (normalizedSubdomain) {
    window.localStorage.setItem("tenantSubdomain", normalizedSubdomain);
  } else {
    window.localStorage.removeItem("tenantSubdomain");
  }

  if (normalizedDomain && !isLocalHost(window.location.hostname)) {
    window.localStorage.setItem("tenantDomain", normalizedDomain);
  } else {
    window.localStorage.removeItem("tenantDomain");
  }

  window.location.assign(buildTenantPortalUrl(institute, path));
  return true;
}

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

export async function savePortalOnboardingDraft(payload) {
  const { data } = await api.post("/institutes/onboarding/draft", payload);
  return data;
}

export async function fetchPortalOnboardingDraft(draftId) {
  const { data } = await api.get(`/institutes/onboarding/draft/${draftId}`);
  return data;
}

export async function submitPortalOnboarding(payload) {
  const { data } = await api.post("/institutes/onboarding/submit", payload);
  return data;
}

async function readLocationApiResponse(response) {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.msg || "Failed to fetch location data");
  }

  if (payload?.error) {
    throw new Error(payload?.msg || "Location service returned an error");
  }

  return payload?.data;
}

export async function fetchCountries() {
  const response = await fetch("https://countriesnow.space/api/v0.1/countries/positions");
  const data = await readLocationApiResponse(response);
  const list = Array.isArray(data) ? data : [];

  return list
    .map((item) => String(item?.name || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export async function fetchStatesByCountry(country) {
  if (!country) {
    return [];
  }

  const response = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country })
  });

  const data = await readLocationApiResponse(response);
  const states = Array.isArray(data?.states) ? data.states : [];

  return states
    .map((item) => String(item?.name || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export async function fetchCitiesByState(country, state) {
  if (!country || !state) {
    return [];
  }

  const response = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country, state })
  });

  const data = await readLocationApiResponse(response);
  const list = Array.isArray(data) ? data : [];

  return list
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export async function login(payload) {
  const { data } = await api.post("/auth/login", payload);
  if (data?.user) {
    return data;
  }

  return {
    ...data,
    user: data
  };
}

export async function logout() {
  const { data } = await api.post("/auth/logout");
  return data;
}

export async function fetchPublicInstitutes() {
  const { data } = await api.get("/institutes/public");
  return data;
}

export async function fetchCurrentTenantPublicProfile() {
  const { data } = await api.get("/institutes/public/current");
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

export async function fetchMyInstituteSettings() {
  const { data } = await api.get("/institutes/me/settings");
  return data;
}

export async function updateMyInstituteSettings(payload) {
  const { data } = await api.patch("/institutes/me/settings", payload);
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

export async function createInstitutePaymentCheckout(id, payload) {
  const { data } = await api.post(`/admin/institutes/${id}/payment-checkout`, payload);
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

export async function revokeAlumniInvite(profileId, payload = {}) {
  const { data } = await api.post(`/alumni/${profileId}/revoke-invite`, payload);
  return data;
}

export async function approveAlumniRegistration(profileId) {
  const { data } = await api.post(`/alumni/${profileId}/approve-registration`);
  return data;
}

export async function bulkReviewAlumniRegistrations(payload) {
  const { data } = await api.post("/alumni/bulk-review", payload);
  return data;
}

export async function bulkResendAlumniInvites(payload) {
  const { data } = await api.post("/alumni/bulk-resend-invite", payload);
  return data;
}

export async function exportAlumniCsv(params = {}) {
  const { data } = await api.get("/alumni/export/csv", {
    params,
    responseType: "blob"
  });
  return data;
}

export async function importAlumniCsv(file) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/alumni/import/csv", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return data;
}

export async function fetchAlumniApprovalTurnaroundKpi() {
  const { data } = await api.get("/alumni/approval-turnaround-kpi");
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

export async function fetchEvents(params = {}) {
  const { data } = await api.get("/events", { params });
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

export async function createEventOrder(id) {
  const { data } = await api.post(`/events/${id}/create-order`);
  return data;
}

export async function verifyEventPayment(id, paymentDetails) {
  const { data } = await api.post(`/events/${id}/verify-payment`, paymentDetails);
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

export async function fetchUserApplications() {
  const { data } = await api.get("/jobs/applications/user");
  return data;
}

export async function fetchAnnouncements(params = {}) {
  const { data } = await api.get("/announcements", { params });
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

export async function uploadPostAttachment(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/alumni-posts/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
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

// Admin moderation functions
export async function fetchReportedPosts(params = {}) {
  const { data } = await api.get("/alumni-posts/admin/reported", { params });
  return data;
}

export async function fetchModerationStats() {
  const { data } = await api.get("/alumni-posts/admin/moderation-stats");
  return data;
}

export async function moderatePost(id, payload) {
  const { data } = await api.post(`/alumni-posts/admin/${id}/moderate`, payload);
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

export async function uploadGalleryMedia(file) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/gallery/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return data;
}

export async function deleteGalleryItem(id) {
  const { data } = await api.delete(`/gallery/${id}`);
  return data;
}

export async function toggleGalleryItemLike(id) {
  const { data } = await api.post(`/gallery/${id}/like`);
  return data;
}

export async function addGalleryItemComment(id, payload) {
  const { data } = await api.post(`/gallery/${id}/comments`, payload);
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

export async function joinCommunityGroup(id) {
  const { data } = await api.post(`/community-groups/${id}/join`);
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

export async function updateFriendshipRequest(id, payload) {
  const { data } = await api.patch(`/friendships/${id}`, payload);
  return data;
}

export const updateAlumniConversationRequest = updateFriendshipRequest;

export function sendFriendshipMessage(id, payload) {
  return api.post(`/friendships/${id}/messages`, payload).then((res) => res.data);
}

export const sendAlumniConversationMessage = sendFriendshipMessage;

export function fetchFriendshipMessages(id, params = {}) {
  return api.get(`/friendships/${id}/messages`, { params }).then((res) => res.data);
}

export const fetchAlumniConversationMessages = fetchFriendshipMessages;

export async function upsertFriendshipE2eePublicKey(payload) {
  const { data } = await api.put("/friendships/e2ee/public-key", payload);
  return data;
}

export async function syncFriendshipConversationEnvelopes(id, payload) {
  const { data } = await api.patch(`/friendships/${id}/e2ee/envelopes`, payload);
  return data;
}

export async function uploadFriendshipAttachment(file, options = {}) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/friendships/uploads", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    },
    onUploadProgress: (event) => {
      if (!options.onUploadProgress || !event.total) return;
      options.onUploadProgress(Math.round((event.loaded / event.total) * 100));
    }
  });
  return data;
}

export async function markFriendshipConversationRead(id) {
  const { data } = await api.post(`/friendships/${id}/read`);
  return data;
}

export const markAlumniConversationRead = markFriendshipConversationRead;

export async function setFriendshipTyping(id, payload) {
  const { data } = await api.post(`/friendships/${id}/typing`, payload);
  return data;
}

export const setAlumniConversationTyping = setFriendshipTyping;

export async function editFriendshipMessage(requestId, messageId, payload) {
  const { data } = await api.patch(`/friendships/${requestId}/messages/${messageId}`, payload);
  return data;
}

export const editAlumniConversationMessage = editFriendshipMessage;

export async function deleteFriendshipMessage(requestId, messageId) {
  const { data } = await api.delete(`/friendships/${requestId}/messages/${messageId}`);
  return data;
}

export const deleteAlumniConversationMessage = deleteFriendshipMessage;

export async function clearFriendshipMessages(requestId) {
  const { data } = await api.delete(`/friendships/${requestId}/messages`);
  return data;
}

export const clearAlumniConversationMessages = clearFriendshipMessages;

export async function toggleFriendshipMessageReaction(requestId, messageId, payload) {
  const { data } = await api.post(
    `/friendships/${requestId}/messages/${messageId}/reactions`,
    payload
  );
  return data;
}

export const toggleAlumniConversationReaction = toggleFriendshipMessageReaction;

export async function updateGroupMemberRole(requestId, userId, payload) {
  const { data } = await api.patch(`/friendships/${requestId}/members/${userId}/role`, payload);
  return data;
}

export async function muteGroupMember(requestId, userId, payload) {
  const { data } = await api.patch(`/friendships/${requestId}/members/${userId}/mute`, payload);
  return data;
}

export async function unmuteGroupMember(requestId, userId) {
  const { data } = await api.delete(`/friendships/${requestId}/members/${userId}/mute`);
  return data;
}

export async function removeGroupMember(requestId, userId) {
  const { data } = await api.delete(`/friendships/${requestId}/members/${userId}`);
  return data;
}

export async function leaveGroupConversation(id) {
  const { data } = await api.post(`/friendships/${id}/leave`);
  return data;
}
export async function fetchFriendshipRequests() {
  const { data } = await api.get("/friendships");
  return data;
}

export const fetchAlumniConversations = fetchFriendshipRequests;

export async function createFriendshipRequest(payload) {
  const { data } = await api.post("/friendships", payload);
  return data;
}

export const createAlumniConversationRequest = createFriendshipRequest;

export async function createGroupConversation(payload) {
  const { data } = await api.post("/friendships/groups", payload);
  return data;
}

export const createAlumniConversationGroup = createGroupConversation;

export async function toggleMuteAlumniConversation(id) {
  const { data } = await api.post(`/friendships/${id}/mute`);
  return data;
}

export async function toggleBlockAlumniContact(id) {
  const { data } = await api.post(`/friendships/${id}/block`);
  return data;
}

export async function deleteFriendshipConversation(id) {
  const { data } = await api.delete(`/friendships/${id}`);
  return data;
}

export const deleteAlumniConversation = deleteFriendshipConversation;

// ─── Role Delegation ───────────────────────────────────────────────────────

export async function fetchDelegatedAdmins() {
  const { data } = await api.get("/institutes/me/admins");
  return data;
}

export async function grantDelegation({ userId, permissions, expiresAt, note }) {
  const { data } = await api.post("/institutes/me/admins", { userId, permissions, expiresAt, note });
  return data;
}

export async function revokeDelegation(userId) {
  const { data } = await api.delete(`/institutes/me/admins/${userId}`);
  return data;
}

// ─── Fundraising ───────────────────────────────────────────────────────────

export const fetchCampaigns = async (status) => {
  const url = status ? `/fundraising/campaigns?status=${status}` : "/fundraising/campaigns";
  const { data } = await api.get(url);
  return data.data;
};

export const fetchCampaign = async (id) => {
  const { data } = await api.get(`/fundraising/campaigns/${id}`);
  return data.data;
};

export const createCampaign = async (payload) => {
  const { data } = await api.post("/fundraising/campaigns", payload);
  return data.data;
};

export const updateCampaign = async (id, payload) => {
  const { data } = await api.patch(`/fundraising/campaigns/${id}`, payload);
  return data.data;
};

export const initiateDonation = async (id, payload) => {
  const { data } = await api.post(`/fundraising/campaigns/${id}/donate`, payload);
  return data.data;
};

export const verifyDonation = async (id, payload) => {
  const { data } = await api.post(`/fundraising/campaigns/${id}/verify`, payload);
  return data.data;
};

// ─── Mentorship ────────────────────────────────────────────────────────────

export const fetchMentors = async (expertise) => {
  const url = expertise ? `/mentorship/mentors?expertise=${expertise}` : "/mentorship/mentors";
  const { data } = await api.get(url);
  return data.data;
};

export const fetchMyMentorProfile = async () => {
  const { data } = await api.get("/mentorship/profile/me");
  return data.data;
};

export const optInAsMentor = async (payload) => {
  const { data } = await api.post("/mentorship/profile", payload);
  return data.data;
};

export const toggleMentorStatus = async () => {
  const { data } = await api.patch("/mentorship/profile/toggle");
  return data.data;
};

export const fetchMySessions = async () => {
  const { data } = await api.get("/mentorship/sessions");
  return data.data;
};

export const requestMentorshipSession = async (payload) => {
  const { data } = await api.post("/mentorship/sessions/request", payload);
  return data.data;
};

export const respondToSession = async (id, payload) => {
  const { data } = await api.patch(`/mentorship/sessions/${id}/respond`, payload);
  return data.data;
};

export const cancelSession = async (id) => {
  const { data } = await api.patch(`/mentorship/sessions/${id}/cancel`);
  return data.data;
};

// ─── Digital ID Card ───────────────────────────────────────────────────────

export const fetchIdCardPayload = async () => {
  const { data } = await api.get("/idcard/payload");
  return data.data;
};

// ─── Analytics ─────────────────────────────────────────────────────────────

export const fetchAdminAnalytics_duplicate = async () => {
  const { data } = await api.get("/analytics/admin");
  return data.data;
};



