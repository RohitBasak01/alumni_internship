import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";

import { createMockStore, buildSessionUser } from "../mock/devData.js";
import {
  AUTH_COOKIE_NAME,
  clearAuthCookies,
  generateAccessToken,
  getJwtSecret,
  setAuthCookies
} from "../utils/auth.js";

const router = express.Router();

router.use((req, _res, next) => {
  if (!req.app.locals.mockMode) {
    return next("router");
  }

  if (!req.app.locals.mockStore) {
    req.app.locals.mockStore = createMockStore();
  }

  next();
});

function getStore(req) {
  return req.app.locals.mockStore;
}

function getDraftStore(req) {
  if (!req.app.locals.portalOnboardingDrafts) {
    req.app.locals.portalOnboardingDrafts = new Map();
  }
  return req.app.locals.portalOnboardingDrafts;
}

function getRequestedTenantSubdomain(req) {
  return String(req.headers["x-tenant-subdomain"] || req.query.tenantSubdomain || "")
    .trim()
    .toLowerCase();
}

function getInstituteById(req, instituteId) {
  return getStore(req).institutes.find((item) => item._id === instituteId) || null;
}

function getInstitute(req) {
  const requestedSubdomain = getRequestedTenantSubdomain(req);

  if (requestedSubdomain) {
    return getStore(req).institutes.find((item) => item.subdomain === requestedSubdomain) || null;
  }

  return getStore(req).institutes[0] || null;
}

function getMockPerson(req, userId) {
  const store = getStore(req);
  const user = store.users.find((item) => item._id === userId);
  const profile = store.profiles.find((item) => item.userId === userId);

  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    batch: profile?.batch,
    department: profile?.department,
    leavingYear: profile?.leavingYear,
    lastClassAttended: profile?.lastClassAttended,
    section: profile?.section,
    currentEducation: profile?.currentEducation,
    currentInstitution: profile?.currentInstitution,
    occupation: profile?.occupation,
    company: profile?.company,
    designation: profile?.designation,
    location: profile?.location
  };
}

function formatMockConversation(req, conversation) {
  if (conversation.conversationType === "group") {
    return {
      _id: conversation._id,
      conversationType: "group",
      groupName: conversation.groupName,
      status: conversation.status,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      message: conversation.message || "",
      messages: (conversation.messages || []).map((message) => ({
        ...message,
        sender: getMockPerson(req, message.senderId)
      })),
      members: (conversation.memberIds || []).map((memberId) => getMockPerson(req, memberId)).filter(Boolean),
      admins: (conversation.adminIds || []).map((adminId) => getMockPerson(req, adminId)).filter(Boolean)
    };
  }

  return {
    _id: conversation._id,
    conversationType: "direct",
    message: conversation.message,
    status: conversation.status,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: (conversation.messages || []).map((message) => ({
      ...message,
      sender: getMockPerson(req, message.senderId)
    })),
    requester: getMockPerson(req, conversation.requesterId),
    mentor: getMockPerson(req, conversation.mentorId)
  };
}

function formatMockCommunityGroup(req, group) {
  const messages = (group.messages || []).map((message) => ({
    _id: message._id,
    content: message.content,
    sentAt: message.sentAt,
    sender: {
      id: message.senderId,
      ...getMockPerson(req, message.senderId)
    }
  }));
  const isAdminViewer = req.mockUser?.role === "institute_admin";
  const viewerId = req.mockUser?._id || "";
  const isMemberViewer = (group.memberIds || []).includes(viewerId);
  const canViewChat = isAdminViewer || isMemberViewer;

  return {
    _id: group._id,
    name: group.name,
    description: group.description || "",
    groupType: group.groupType,
    audienceLabel: group.audienceLabel || "",
    memberCount: (group.memberIds || []).length,
    members: (group.memberIds || []).map((memberId) => {
      const person = getMockPerson(req, memberId);
      return {
        id: person?._id || memberId,
        name: person?.name || "Unknown Member",
        email: person?.email || "",
        batch: person?.batch ?? null,
        department: person?.department || "",
        leavingYear: person?.leavingYear ?? null,
        lastClassAttended: person?.lastClassAttended || "",
        section: person?.section || "",
        currentInstitution: person?.currentInstitution || "",
        occupation: person?.occupation || "",
        company: person?.company || "",
        designation: person?.designation || "",
        location: person?.location || ""
      };
    }),
    createdBy: group.createdBy,
    canViewChat,
    messages: canViewChat ? messages : [],
    latestMessage: canViewChat ? messages[messages.length - 1] || null : null,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt
  };
}

function getUserFromToken(req) {
  const authHeader = req.headers.authorization;
  const token =
    req.cookies?.[AUTH_COOKIE_NAME] ||
    (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return getStore(req).users.find((user) => user._id === decoded.userId) || null;
  } catch {
    return null;
  }
}

function requireMockAuth(req, res, next) {
  const user = getUserFromToken(req);

  if (!user) {
    return res.status(401).json({
      message: "Authentication required",
      requestId: req.requestId
    });
  }

  req.user = buildSessionUser(user);
  req.mockUser = user;
  req.tenant = user.instituteId ? getInstituteById(req, user.instituteId) : null;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.mockUser || !roles.includes(req.mockUser.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource",
        requestId: req.requestId
      });
    }

    next();
  };
}

function ensureTenant(req, res, next) {
  if (req.mockUser?.role === "super_admin") {
    return next();
  }

  if (!req.tenant) {
    return res.status(400).json({
      message: "Tenant context is missing",
      requestId: req.requestId
    });
  }

  next();
}

function formatAlumniProfile(req, profile) {
  const user = getStore(req).users.find((item) => item._id === profile.userId);
  const isInstituteAdmin = req.mockUser?.role === "institute_admin";

  return {
    _id: profile._id,
    instituteId: profile.instituteId,
    userId: profile.userId,
    name: user?.name || "Unknown Alumni",
    email: user?.email || "",
    isActive: user?.isActive || false,
    batch: profile.batch,
    department: profile.department,
    leavingYear: profile.leavingYear,
    lastClassAttended: profile.lastClassAttended || "",
    section: profile.section || "",
    currentEducation: profile.currentEducation || "",
    currentInstitution: profile.currentInstitution || "",
    occupation: profile.occupation || "",
    company: profile.company,
    designation: profile.designation,
    location: profile.location,
    bio: profile.bio,
    skills: profile.skills || [],
    ...(isInstituteAdmin
      ? {
          invitationStatus: user?.passwordSetupCompleted ? "active" : "invited",
          inviteExpiresAt: null
        }
      : {})
  };
}

function formatEvent(req, event) {
  const isRegistered = (event.registrations || []).some((entry) => entry.userId === req.mockUser._id);

  return {
    _id: event._id,
    instituteId: event.instituteId,
    title: event.title,
    description: event.description,
    eventDate: event.eventDate,
    location: event.location,
    groupId: event.groupId || null,
    createdBy: event.createdBy,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    attendeeCount: event.registrations?.length || 0,
    isRegistered,
    attendees:
      req.mockUser.role === "institute_admin"
        ? (event.registrations || []).map((entry) => {
            const user = getStore(req).users.find((item) => item._id === entry.userId);
            return {
              userId: entry.userId,
              name: user?.name || "Unknown User",
              email: user?.email || "",
              registeredAt: entry.registeredAt
            };
          })
        : []
  };
}

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "alumni-network-api",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    mockMode: true
  });
});

router.get("/institutes/public", (req, res) => {
  const institutes = getStore(req)
    .institutes.filter((item) => item.status === "active")
    .map((item) => ({
      _id: item._id,
      name: item.name,
      subdomain: item.subdomain,
      domain: item.domain || null,
      institutionType: item.institutionType,
      educationLevel: item.educationLevel,
      communityLabels: item.communityLabels
    }));

  res.json(institutes);
});

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = getStore(req).users.find((item) => item.email === String(email || "").trim().toLowerCase());
  const institute = user?.instituteId ? getInstituteById(req, user.instituteId) : null;

  if (!user || user.password !== password) {
    return res.status(401).json({
      message: "Invalid credentials",
      requestId: req.requestId
    });
  }

  const token = generateAccessToken(user);
  setAuthCookies(res, token);

  res.json({
    token,
    user: buildSessionUser(user, institute),
    mockMode: true
  });
});

router.post("/auth/logout", (_req, res) => {
  clearAuthCookies(res);
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireMockAuth, (req, res) => {
  res.json(buildSessionUser(req.mockUser, req.tenant));
});

router.get("/auth/oauth/session", (_req, res) => {
  res.json({ oauthSession: null });
});

router.delete("/auth/oauth/session", (_req, res) => {
  res.json({ message: "OAuth session cleared" });
});

router.post("/auth/alumni-registration", (req, res) => {
  const institute = getInstituteById(req, req.body?.instituteId);

  if (!institute || institute.status !== "active") {
    return res.status(404).json({
      message: "Selected institute is not available for registration",
      requestId: req.requestId
    });
  }

  const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return res.status(400).json({ message: "Email is required", requestId: req.requestId });
  }

  const existingUser = getStore(req).users.find((item) => item.email === normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ message: "An account with this email already exists", requestId: req.requestId });
  }

  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const displayName = `${String(req.body?.firstName || "").trim()} ${String(req.body?.lastName || "").trim()}`.trim() || normalizedEmail;
  const batchYear = req.body?.batch ? Number(req.body.batch) : null;

  getStore(req).users.push({
    _id: userId,
    name: displayName,
    email: normalizedEmail,
    password: "Pending@123",
    role: "alumni",
    isActive: false,
    passwordSetupCompleted: false,
    instituteId: institute._id
  });

  getStore(req).profiles.push({
    _id: profileId,
    instituteId: institute._id,
    userId,
    batch: institute.institutionType === "school" ? null : batchYear,
    department: institute.institutionType === "school" ? "" : String(req.body?.department || "").trim(),
    leavingYear: institute.institutionType === "school" ? batchYear : null,
    lastClassAttended: institute.institutionType === "school" ? String(req.body?.department || "").trim() : "",
    section: String(req.body?.section || "").trim(),
    currentEducation: String(req.body?.currentEducation || "").trim(),
    currentInstitution: String(req.body?.currentInstitution || "").trim(),
    occupation: String(req.body?.occupation || "").trim(),
    company: String(req.body?.company || "").trim(),
    designation: String(req.body?.designation || "").trim(),
    location: String(req.body?.currentCity || "").trim(),
    industry: "",
    bio: "",
    skills: [],
    linkedinUrl: "",
    websiteUrl: "",
    twitterHandle: "",
    profileVisibility: "institute_only",
    showEmail: false,
    allowMentorRequests: institute.featureFlags?.enableMentorship !== false,
    registrationReviewStatus: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  res.status(201).json({
    message: "Registration submitted successfully. Your institution admin will review it in mock mode."
  });
});

router.post("/institutes/request", (req, res) => {
  res.status(201).json({
    institute: {
      _id: crypto.randomUUID(),
      name: req.body?.name || "Requested Institute",
      subdomain: req.body?.subdomain || "requested",
      domain: req.body?.domain || null,
      status: "pending"
    },
    onboarding: {
      contactEmail: req.body?.primaryContactEmail || "",
      status: "pending_approval",
      message: "Portal request submitted in development mock mode."
    },
    invite: null,
    emailDelivery: {
      delivered: false,
      mode: "mock",
      message: "Mock mode is enabled. No email was sent."
    }
  });
});

router.post("/institutes/onboarding/draft", (req, res) => {
  const draftId = String(req.body?.draftId || "").trim() || crypto.randomUUID();
  const currentStep = Math.max(1, Math.min(4, Number(req.body?.currentStep || 1)));
  const data = {
    name: String(req.body?.name || "").trim(),
    institutionType: req.body?.institutionType === "school" ? "school" : "college",
    educationLevel: String(req.body?.educationLevel || "higher_ed").trim(),
    subdomain: String(req.body?.subdomain || "").trim().toLowerCase(),
    domain: String(req.body?.domain || "").trim().toLowerCase(),
    primaryContactName: String(req.body?.primaryContactName || "").trim(),
    primaryContactEmail: String(req.body?.primaryContactEmail || "").trim().toLowerCase(),
    primaryContactPhone: String(req.body?.primaryContactPhone || "").trim(),
    website: String(req.body?.website || "").trim(),
    bio: String(req.body?.bio || "").trim(),
    branding: {
      logoUrl: String(req.body?.branding?.logoUrl || "").trim(),
      primaryColor: String(req.body?.branding?.primaryColor || "").trim(),
      secondaryColor: String(req.body?.branding?.secondaryColor || "").trim(),
      accentColor: String(req.body?.branding?.accentColor || "").trim(),
      tagline: String(req.body?.branding?.tagline || "").trim()
    },
    featureFlags: req.body?.featureFlags && typeof req.body.featureFlags === "object" ? req.body.featureFlags : {}
  };

  const savedAt = new Date().toISOString();
  getDraftStore(req).set(draftId, { draftId, currentStep, data, savedAt });
  res.status(201).json({ draftId, currentStep, savedAt });
});

router.get("/institutes/onboarding/draft/:draftId", (req, res) => {
  const draft = getDraftStore(req).get(req.params.draftId);
  if (!draft) {
    return res.status(404).json({ message: "Draft not found", requestId: req.requestId });
  }
  res.json(draft);
});

router.post("/institutes/onboarding/submit", (req, res) => {
  const draftId = String(req.body?.draftId || "").trim();
  let payload = req.body || {};
  const draft = draftId ? getDraftStore(req).get(draftId) : null;
  if (draft?.data) {
    payload = { ...draft.data, ...payload };
  }

  if (draftId) {
    getDraftStore(req).delete(draftId);
  }

  const instituteName = payload.name || "Requested Institute";
  const subdomain = payload.subdomain || "requested";
  const domain = payload.domain || null;
  const primaryContactEmail = payload.primaryContactEmail || "";
  const inviteUrl = "http://localhost:5173/setup-password/mock";

  res.status(201).json({
    institute: {
      _id: crypto.randomUUID(),
      name: instituteName,
      subdomain,
      domain,
      status: "pending"
    },
    onboarding: {
      contactEmail: primaryContactEmail,
      status: "pending_approval",
      message: "Portal request submitted in development mock mode."
    },
    invite: {
      email: primaryContactEmail,
      inviteUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    emailDelivery: {
      delivered: false,
      mode: "mock",
      message: "Mock mode is enabled. No email was sent."
    }
  });
});

router.get("/institutes", requireMockAuth, requireRole("super_admin"), (req, res) => {
  res.json(getStore(req).institutes);
});

router.patch("/institutes/:id/approve", requireMockAuth, requireRole("super_admin"), (req, res) => {
  const institute = getStore(req).institutes.find((item) => item._id === req.params.id);

  if (!institute) {
    return res.status(404).json({ message: "Institute not found", requestId: req.requestId });
  }

  institute.status = "active";
  institute.subscriptionStatus = "active";
  if (req.body?.subscriptionPlan) {
    institute.subscriptionPlan = req.body.subscriptionPlan;
  }

  res.json({ institute, message: "Institute approved." });
});

router.patch("/institutes/:id/suspend", requireMockAuth, requireRole("super_admin"), (req, res) => {
  const institute = getStore(req).institutes.find((item) => item._id === req.params.id);

  if (!institute) {
    return res.status(404).json({ message: "Institute not found", requestId: req.requestId });
  }

  institute.status = "suspended";
  institute.subscriptionStatus = "inactive";

  res.json({ institute, message: "Institute suspended." });
});

router.get("/admin/analytics", requireMockAuth, requireRole("super_admin"), (req, res) => {
  const store = getStore(req);
  res.json({
    totals: {
      totalInstitutes: store.institutes.length,
      activeInstitutes: store.institutes.filter((item) => item.status === "active").length,
      pendingInstitutes: store.institutes.filter((item) => item.status === "pending").length,
      suspendedInstitutes: store.institutes.filter((item) => item.status === "suspended").length,
      totalAlumniProfiles: store.profiles.length,
      activeAlumniUsers: store.users.filter((item) => item.role === "alumni" && item.isActive).length,
      totalEvents: store.events.length,
      totalJobs: store.jobs.length,
      publishedJobs: store.jobs.filter((item) => item.status === "published").length,
      totalRsvps: store.events.reduce((sum, item) => sum + (item.registrations?.length || 0), 0),
      totalMentorshipRequests: store.mentorshipRequests.length,
      pendingMentorshipRequests: store.mentorshipRequests.filter((item) => item.status === "pending").length
    },
    institutesByPlan: [
      {
        plan: getInstitute(req).subscriptionPlan,
        count: 1
      }
    ]
  });
});

router.get("/admin/support-overview", requireMockAuth, requireRole("super_admin"), (_req, res) => {
  const store = getStore(_req);
  res.json({
    pendingInstituteRequests: 0,
    suspendedInstitutes: 0,
    pendingInstituteAdminSetup: 0,
    inactiveInstituteAdmins: 0,
    pendingAlumniInvites: store.users.filter((item) => item.role === "alumni" && !item.passwordSetupCompleted).length,
    expiredInvites: 0
  });
});

router.get("/admin/audit-logs", requireMockAuth, requireRole("super_admin"), (req, res) => {
  res.json(getStore(req).auditLogs);
});

router.get("/admin/institutes/:id", requireMockAuth, requireRole("super_admin"), (req, res) => {
  const institute = getStore(req).institutes.find((item) => item._id === req.params.id);

  if (!institute) {
    return res.status(404).json({ message: "Institute not found", requestId: req.requestId });
  }

  res.json({
    institute,
    admins: getStore(req).users
      .filter((item) => item.role === "institute_admin" && item.instituteId === institute._id)
      .map((item) => ({
        _id: item._id,
        name: item.name,
        email: item.email,
        isActive: item.isActive,
        passwordSetupCompleted: item.passwordSetupCompleted,
        inviteExpiresAt: null,
        onboardingStatus: item.passwordSetupCompleted ? "ready" : "pending_setup",
        createdAt: institute.createdAt
      })),
    metrics: {
      adminsCount: 1,
      alumniProfilesCount: getStore(req).profiles.length,
      activeAlumniUsersCount: getStore(req).users.filter((item) => item.role === "alumni" && item.isActive).length,
      eventsCount: getStore(req).events.length,
      jobsCount: getStore(req).jobs.length,
      announcementsCount: getStore(req).announcements.length,
      pendingMentorshipRequests: 0
    },
    support: {
      hasPendingAdminSetup: false,
      inactiveAdminCount: 0,
      pendingMentorshipRequests: 0
    },
    recentActivity: []
  });
});

router.patch("/admin/institutes/:id/subscription", requireMockAuth, requireRole("super_admin"), (req, res) => {
  const institute = getStore(req).institutes.find((item) => item._id === req.params.id);

  if (!institute) {
    return res.status(404).json({ message: "Institute not found", requestId: req.requestId });
  }

  institute.subscriptionPlan = req.body?.subscriptionPlan || institute.subscriptionPlan;
  institute.subscriptionStatus = req.body?.subscriptionStatus || institute.subscriptionStatus;
  institute.subscriptionRenewsAt = req.body?.renewalDate || institute.subscriptionRenewsAt;

  res.json({
    institute,
    admins: [],
    metrics: {
      adminsCount: 1,
      alumniProfilesCount: getStore(req).profiles.length,
      activeAlumniUsersCount: getStore(req).users.filter((item) => item.role === "alumni" && item.isActive).length,
      eventsCount: getStore(req).events.length,
      jobsCount: getStore(req).jobs.length,
      announcementsCount: getStore(req).announcements.length,
      pendingMentorshipRequests: 0
    },
    support: {
      hasPendingAdminSetup: false,
      inactiveAdminCount: 0,
      pendingMentorshipRequests: 0
    },
    recentActivity: []
  });
});

router.post("/admin/institutes/:id/resend-admin-invite", requireMockAuth, requireRole("super_admin"), (_req, res) => {
  res.json({
    invite: {
      email: "admin@spit.edu",
      inviteUrl: "http://localhost:5173/setup-password/mock",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    emailDelivery: {
      delivered: false,
      mode: "mock",
      message: "Mock mode is enabled. No email was sent."
    }
  });
});

router.get("/ops/status", requireMockAuth, requireRole("super_admin"), (req, res) => {
  res.json({
    ok: true,
    service: "alumni-network-api",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    timestamp: new Date().toISOString(),
    database: {
      state: "mock",
      host: null,
      name: "in-memory-demo"
    },
    memory: {
      rss: process.memoryUsage().rss,
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal
    },
    nodeVersion: process.version,
    requestId: req.requestId,
    mockMode: true
  });
});

router.get("/alumni", requireMockAuth, ensureTenant, (req, res) => {
  const { q, batch, department, company, skill, leavingYear, lastClassAttended, section, location } = req.query;
  const normalizedQuery = String(q || "").trim().toLowerCase();

  const results = getStore(req).profiles
    .filter((profile) => profile.instituteId === req.tenant._id)
    .filter((profile) => (!batch ? true : String(profile.batch) === String(batch)))
    .filter((profile) => (!department ? true : profile.department.toLowerCase().includes(String(department).toLowerCase())))
    .filter((profile) => (!leavingYear ? true : String(profile.leavingYear) === String(leavingYear)))
    .filter((profile) =>
      !lastClassAttended ? true : String(profile.lastClassAttended || "").toLowerCase().includes(String(lastClassAttended).toLowerCase())
    )
    .filter((profile) => (!section ? true : String(profile.section || "").toLowerCase().includes(String(section).toLowerCase())))
    .filter((profile) => (!company ? true : String(profile.company || "").toLowerCase().includes(String(company).toLowerCase())))
    .filter((profile) => (!location ? true : String(profile.location || "").toLowerCase().includes(String(location).toLowerCase())))
    .filter((profile) => (!skill ? true : (profile.skills || []).some((item) => item.toLowerCase().includes(String(skill).toLowerCase()))))
    .map((profile) => formatAlumniProfile(req, profile))
    .filter((profile) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        profile.name,
        profile.email,
        profile.department,
        profile.lastClassAttended,
        profile.currentInstitution,
        profile.occupation,
        profile.company,
        profile.designation,
        profile.location,
        profile.bio
      ]
        .concat(profile.skills || [])
        .filter(Boolean)
        .some((item) => String(item).toLowerCase().includes(normalizedQuery));
    });

  res.json(results);
});

router.get("/alumni/me", requireMockAuth, ensureTenant, (req, res) => {
  const profile = getStore(req).profiles.find((item) => item.userId === req.mockUser._id);

  if (!profile) {
    return res.status(404).json({ message: "Alumni profile not found", requestId: req.requestId });
  }

  res.json({
    _id: profile._id,
    userId: req.mockUser._id,
    name: req.mockUser.name,
    email: req.mockUser.email,
    batch: profile.batch,
    department: profile.department,
    leavingYear: profile.leavingYear,
    lastClassAttended: profile.lastClassAttended || "",
    section: profile.section || "",
    currentEducation: profile.currentEducation || "",
    currentInstitution: profile.currentInstitution || "",
    occupation: profile.occupation || "",
    company: profile.company || "",
    designation: profile.designation || "",
    location: profile.location || "",
    industry: profile.industry || "",
    bio: profile.bio || "",
    skills: profile.skills || [],
    linkedinUrl: profile.linkedinUrl || "",
    websiteUrl: profile.websiteUrl || "",
    twitterHandle: profile.twitterHandle || "",
    profileVisibility: profile.profileVisibility || "institute_only",
    showEmail: profile.showEmail ?? false,
    allowMentorRequests: profile.allowMentorRequests ?? true
  });
});

router.patch("/alumni/me", requireMockAuth, requireRole("alumni"), ensureTenant, (req, res) => {
  const profile = getStore(req).profiles.find((item) => item.userId === req.mockUser._id);

  if (!profile) {
    return res.status(404).json({ message: "Alumni profile not found", requestId: req.requestId });
  }

  req.mockUser.name = req.body?.name?.trim?.() || req.mockUser.name;
  profile.batch = req.body?.batch !== undefined && req.body?.batch !== "" ? Number(req.body.batch) : profile.batch;
  profile.department = req.body?.department?.trim?.() ?? profile.department;
  profile.leavingYear = req.body?.leavingYear !== undefined && req.body?.leavingYear !== "" ? Number(req.body.leavingYear) : profile.leavingYear;
  profile.lastClassAttended = req.body?.lastClassAttended?.trim?.() ?? profile.lastClassAttended;
  profile.section = req.body?.section?.trim?.() ?? profile.section;
  profile.currentEducation = req.body?.currentEducation?.trim?.() ?? profile.currentEducation;
  profile.currentInstitution = req.body?.currentInstitution?.trim?.() ?? profile.currentInstitution;
  profile.occupation = req.body?.occupation?.trim?.() ?? profile.occupation;
  profile.company = req.body?.company?.trim?.() ?? profile.company;
  profile.designation = req.body?.designation?.trim?.() ?? profile.designation;
  profile.location = req.body?.location?.trim?.() ?? profile.location;
  profile.industry = req.body?.industry?.trim?.() ?? profile.industry;
  profile.bio = req.body?.bio?.trim?.() ?? profile.bio;
  profile.skills = Array.isArray(req.body?.skills) ? req.body.skills : profile.skills;
  profile.linkedinUrl = req.body?.linkedinUrl?.trim?.() ?? profile.linkedinUrl;
  profile.websiteUrl = req.body?.websiteUrl?.trim?.() ?? profile.websiteUrl;
  profile.twitterHandle = req.body?.twitterHandle?.trim?.() ?? profile.twitterHandle;
  profile.profileVisibility = req.body?.profileVisibility ?? profile.profileVisibility;
  profile.showEmail = typeof req.body?.showEmail === "boolean" ? req.body.showEmail : profile.showEmail;
  profile.allowMentorRequests =
    typeof req.body?.allowMentorRequests === "boolean"
      ? req.body.allowMentorRequests
      : profile.allowMentorRequests;
  profile.updatedAt = new Date().toISOString();

  res.json({
    ...profile,
    name: req.mockUser.name
  });
});

router.get("/announcements", requireMockAuth, ensureTenant, (req, res) => {
  let items = getStore(req).announcements.filter((item) => item.instituteId === req.tenant._id);
  
  if (req.mockUser.role !== "institute_admin") {
    items = items.filter((item) => item.status === "published");
  }

  if (req.query.groupId) {
    items = items.filter((item) => item.groupId === req.query.groupId);
  } else {
    items = items.filter((item) => !item.groupId);
  }
  
  res.json(items);
});

router.get("/events", requireMockAuth, ensureTenant, (req, res) => {
  let events = getStore(req).events.filter((item) => item.instituteId === req.tenant._id);
  if (req.query.groupId) {
    events = events.filter((item) => item.groupId === req.query.groupId);
  } else {
    events = events.filter((item) => !item.groupId);
  }
  res.json(events.map((item) => formatEvent(req, item)));
});

router.get("/jobs", requireMockAuth, ensureTenant, (req, res) => {
  const jobs = getStore(req).jobs.filter((item) => item.instituteId === req.tenant._id);
  res.json(req.mockUser.role === "institute_admin" ? jobs : jobs.filter((item) => item.status === "published"));
});

router.get("/feed", requireMockAuth, ensureTenant, (req, res) => {
  const store = getStore(req);
  const announcements = store.announcements.map((item) => ({
    id: item._id,
    type: "announcement",
    title: item.title,
    description: item.content,
    meta: item.status,
    createdAt: item.createdAt
  }));
  const events = store.events.map((item) => ({
    id: item._id,
    type: "event",
    title: item.title,
    description: item.description || item.location || "Upcoming institute event",
    meta: item.eventDate,
    createdAt: item.createdAt
  }));
  const jobs = store.jobs.map((item) => ({
    id: item._id,
    type: "job",
    title: item.title,
    description: item.company,
    meta: item.status,
    createdAt: item.createdAt
  }));

  res.json([...announcements, ...events, ...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.get("/mentorship", requireMockAuth, requireRole("alumni"), ensureTenant, (req, res) => {
  const conversations = getStore(req).mentorshipRequests
    .filter((item) => {
      if (item.conversationType === "group") {
        return (item.memberIds || []).includes(req.mockUser._id);
      }

      return item.requesterId === req.mockUser._id || item.mentorId === req.mockUser._id;
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .map((item) => formatMockConversation(req, item));

  res.json(conversations);
});

router.post("/mentorship", requireMockAuth, requireRole("alumni"), ensureTenant, (req, res) => {
  const recipientUserId = req.body?.recipientUserId || req.body?.mentorUserId;
  const message = String(req.body?.message || "").trim();

  if (!recipientUserId || !message) {
    return res.status(400).json({ message: "Recipient and message are required", requestId: req.requestId });
  }

  if (recipientUserId === req.mockUser._id) {
    return res.status(400).json({ message: "You cannot start a chat with yourself", requestId: req.requestId });
  }

  const recipient = getStore(req).users.find(
    (item) => item._id === recipientUserId && item.role === "alumni" && item.isActive
  );

  if (!recipient) {
    return res.status(404).json({ message: "Selected alumni was not found", requestId: req.requestId });
  }

  const conversation = {
    _id: crypto.randomUUID(),
    conversationType: "direct",
    requesterId: req.mockUser._id,
    mentorId: recipient._id,
    message,
    status: "pending",
    messages: [
      {
        _id: crypto.randomUUID(),
        senderId: req.mockUser._id,
        content: message,
        sentAt: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  getStore(req).mentorshipRequests.unshift(conversation);
  res.status(201).json(formatMockConversation(req, conversation));
});

router.post("/mentorship/groups", requireMockAuth, requireRole("alumni"), ensureTenant, (req, res) => {
  const groupName = String(req.body?.groupName || "").trim();
  const requestedMemberIds = Array.isArray(req.body?.memberUserIds) ? req.body.memberUserIds.map(String) : [];
  const initialMessage = String(req.body?.initialMessage || "").trim();

  if (!groupName) {
    return res.status(400).json({ message: "Group name is required", requestId: req.requestId });
  }

  if (!requestedMemberIds.length) {
    return res.status(400).json({ message: "Choose at least one member for the group", requestId: req.requestId });
  }

  const memberIds = [...new Set([req.mockUser._id, ...requestedMemberIds])];
  const members = getStore(req).users.filter(
    (item) => memberIds.includes(item._id) && item.role === "alumni" && item.isActive
  );

  if (members.length !== memberIds.length) {
    return res.status(400).json({ message: "One or more selected members are invalid", requestId: req.requestId });
  }

  const conversation = {
    _id: crypto.randomUUID(),
    conversationType: "group",
    groupName,
    memberIds,
    adminIds: [req.mockUser._id],
    message: initialMessage || `${req.mockUser.name} created the group`,
    status: "active",
    messages: initialMessage
      ? [
          {
            _id: crypto.randomUUID(),
            senderId: req.mockUser._id,
            content: initialMessage,
            sentAt: new Date().toISOString()
          }
        ]
      : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  getStore(req).mentorshipRequests.unshift(conversation);
  res.status(201).json(formatMockConversation(req, conversation));
});

router.patch("/mentorship/:id", requireMockAuth, requireRole("alumni"), ensureTenant, (req, res) => {
  const conversation = getStore(req).mentorshipRequests.find(
    (item) =>
      item._id === req.params.id &&
      item.conversationType !== "group" &&
      item.mentorId === req.mockUser._id
  );

  if (!conversation) {
    return res.status(404).json({ message: "Mentorship request not found", requestId: req.requestId });
  }

  if (!["accepted", "declined"].includes(req.body?.status)) {
    return res.status(400).json({ message: "Status must be accepted or declined", requestId: req.requestId });
  }

  conversation.status = req.body.status;
  conversation.updatedAt = new Date().toISOString();
  res.json(formatMockConversation(req, conversation));
});

router.post("/mentorship/:id/messages", requireMockAuth, requireRole("alumni"), ensureTenant, (req, res) => {
  const content = String(req.body?.content || "").trim();

  if (!content) {
    return res.status(400).json({ message: "Message content is required", requestId: req.requestId });
  }

  const conversation = getStore(req).mentorshipRequests.find((item) => {
    if (item._id !== req.params.id) {
      return false;
    }

    if (item.conversationType === "group") {
      return (item.memberIds || []).includes(req.mockUser._id);
    }

    return item.requesterId === req.mockUser._id || item.mentorId === req.mockUser._id;
  });

  if (!conversation) {
    return res.status(404).json({ message: "Mentorship conversation not found", requestId: req.requestId });
  }

  if (conversation.conversationType !== "group") {
    if (conversation.status === "declined") {
      return res.status(400).json({ message: "This mentorship request has been declined", requestId: req.requestId });
    }

    if (conversation.status === "pending") {
      return res.status(403).json({
        message: "Wait for the recipient to accept this chat request before sending more messages",
        requestId: req.requestId
      });
    }
  }

  const message = {
    _id: crypto.randomUUID(),
    senderId: req.mockUser._id,
    content,
    sentAt: new Date().toISOString()
  };

  conversation.messages = [...(conversation.messages || []), message];
  conversation.message = content;
  conversation.updatedAt = new Date().toISOString();

  res.status(201).json({
    requestId: conversation._id,
    message: {
      ...message,
      sender: getMockPerson(req, req.mockUser._id)
    }
  });
});

router.post("/mentorship/:id/leave", requireMockAuth, requireRole("alumni"), ensureTenant, (req, res) => {
  const conversation = getStore(req).mentorshipRequests.find(
    (item) =>
      item._id === req.params.id &&
      item.conversationType === "group" &&
      (item.memberIds || []).includes(req.mockUser._id)
  );

  if (!conversation) {
    return res.status(404).json({ message: "Group conversation not found", requestId: req.requestId });
  }

  if ((conversation.memberIds || []).length <= 1) {
    return res.status(400).json({
      message: "You cannot leave the last remaining member in the group",
      requestId: req.requestId
    });
  }

  conversation.memberIds = (conversation.memberIds || []).filter((id) => id !== req.mockUser._id);
  conversation.adminIds = (conversation.adminIds || []).filter((id) => id !== req.mockUser._id);
  if (!conversation.adminIds.length && conversation.memberIds.length) {
    conversation.adminIds = [conversation.memberIds[0]];
  }
  conversation.message = `${req.mockUser.name} left the group`;
  conversation.updatedAt = new Date().toISOString();

  res.json({
    message: "You left the group successfully",
    conversationId: conversation._id
  });
});

router.delete("/mentorship/:id", requireMockAuth, requireRole("alumni"), ensureTenant, (req, res) => {
  const store = getStore(req);
  const index = store.mentorshipRequests.findIndex(
    (item) =>
      item._id === req.params.id &&
      item.conversationType === "group" &&
      (item.adminIds || []).includes(req.mockUser._id)
  );

  if (index === -1) {
    return res.status(404).json({ message: "Group conversation not found or you are not an admin", requestId: req.requestId });
  }

  store.mentorshipRequests.splice(index, 1);
  res.json({ message: "Group deleted successfully", conversationId: req.params.id });
});

router.get("/community-groups", requireMockAuth, ensureTenant, (req, res) => {
  const items = getStore(req).communityGroups
    .filter((item) => item.instituteId === req.tenant._id)
    .map((item) => formatMockCommunityGroup(req, item));

  res.json(items);
});

router.post("/community-groups", requireMockAuth, ensureTenant, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const groupType = String(req.body?.groupType || "").trim();
  const audienceLabel = String(req.body?.audienceLabel || "").trim();
  const description = String(req.body?.description || "").trim();
  const memberUserIds = Array.isArray(req.body?.memberUserIds) ? req.body.memberUserIds.map(String) : [];

  if (req.mockUser.role !== "institute_admin") {
    if (groupType !== "interest") {
      return res.status(403).json({ message: "Alumni can only create interest groups", requestId: req.requestId });
    }
  }

  if (!name) {
    return res.status(400).json({ message: "Group name is required", requestId: req.requestId });
  }

  if (!["interest", "class", "year"].includes(groupType)) {
    return res.status(400).json({ message: "Group type must be interest, class, or year", requestId: req.requestId });
  }

  if (!memberUserIds.length) {
    return res.status(400).json({ message: "Member list is required", requestId: req.requestId });
  }

  const group = {
    _id: crypto.randomUUID(),
    instituteId: req.tenant._id,
    name,
    description,
    groupType,
    audienceLabel,
    memberIds: [...new Set(memberUserIds)],
    createdBy: req.mockUser._id,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  getStore(req).communityGroups.unshift(group);
  res.status(201).json(formatMockCommunityGroup(req, group));
});

router.patch("/community-groups/:id", requireMockAuth, requireRole("institute_admin"), ensureTenant, (req, res) => {
  const group = getStore(req).communityGroups.find(
    (item) => item._id === req.params.id && item.instituteId === req.tenant._id
  );

  if (!group) {
    return res.status(404).json({ message: "Group not found", requestId: req.requestId });
  }

  const name = String(req.body?.name || "").trim();
  const groupType = String(req.body?.groupType || "").trim();
  const audienceLabel = String(req.body?.audienceLabel || "").trim();
  const description = String(req.body?.description || "").trim();
  const memberUserIds = Array.isArray(req.body?.memberUserIds) ? req.body.memberUserIds.map(String) : [];

  if (!name) {
    return res.status(400).json({ message: "Group name is required", requestId: req.requestId });
  }

  if (!["interest", "class", "year"].includes(groupType)) {
    return res.status(400).json({ message: "Group type must be interest, class, or year", requestId: req.requestId });
  }

  if (!memberUserIds.length) {
    return res.status(400).json({ message: "Member list is required", requestId: req.requestId });
  }

  group.name = name;
  group.groupType = groupType;
  group.audienceLabel = audienceLabel;
  group.description = description;
  group.memberIds = [...new Set(memberUserIds)];
  group.updatedAt = new Date().toISOString();

  res.json(formatMockCommunityGroup(req, group));
});

router.post("/community-groups/:id/messages", requireMockAuth, ensureTenant, (req, res) => {
  const content = String(req.body?.content || "").trim();

  if (!content) {
    return res.status(400).json({ message: "Message content is required", requestId: req.requestId });
  }

  const group = getStore(req).communityGroups.find(
    (item) =>
      item._id === req.params.id &&
      item.instituteId === req.tenant._id &&
      (req.mockUser.role === "institute_admin" || (item.memberIds || []).includes(req.mockUser._id))
  );

  if (!group) {
    return res.status(404).json({ message: "Group not found or access denied", requestId: req.requestId });
  }

  const message = {
    _id: crypto.randomUUID(),
    senderId: req.mockUser._id,
    content,
    sentAt: new Date().toISOString()
  };

  group.messages = [...(group.messages || []), message];
  group.updatedAt = new Date().toISOString();

  res.status(201).json({
    groupId: group._id,
    message: {
      _id: message._id,
      content: message.content,
      sentAt: message.sentAt,
      sender: {
        id: req.mockUser._id,
        ...getMockPerson(req, req.mockUser._id)
      }
    }
  });
});

router.post("/community-groups/:id/join", requireMockAuth, ensureTenant, (req, res) => {
  let group = getStore(req).communityGroups.find(
    (item) => item._id === req.params.id && item.instituteId === req.tenant._id
  );

  if (!group) {
    group = getStore(req).mentorshipRequests.find(
      (item) => item._id === req.params.id && item.conversationType === "group" && item.instituteId === req.tenant._id
    );
  }

  if (!group) {
    return res.status(404).json({ message: "Group not found", requestId: req.requestId });
  }

  const isMember = (group.memberIds || []).includes(req.mockUser._id);
  if (isMember) {
    return res.status(200).json({ message: "You are already a member of this group" });
  }

  group.memberIds = [...(group.memberIds || []), req.mockUser._id];
  group.updatedAt = new Date().toISOString();

  res.status(200).json({ message: "Successfully joined the group" });
});

router.delete("/community-groups/:id", requireMockAuth, requireRole("institute_admin"), ensureTenant, (req, res) => {
  const index = getStore(req).communityGroups.findIndex(
    (item) => item._id === req.params.id && item.instituteId === req.tenant._id
  );

  if (index === -1) {
    return res.status(404).json({ message: "Group not found", requestId: req.requestId });
  }

  getStore(req).communityGroups.splice(index, 1);
  res.json({ message: "Group deleted successfully" });
});

router.get("/notifications/summary", requireMockAuth, ensureTenant, (req, res) => {
  const pendingAlumniInvites = getStore(req).users.filter(
    (item) => item.instituteId === req.tenant?._id && item.role === "alumni" && !item.passwordSetupCompleted
  ).length;

  res.json({
    pendingMentorshipRequests: req.tenant?.featureFlags?.enableMentorship === false ? 0 : 0,
    pendingAlumniInvites
  });
});

export default router;
