import crypto from "node:crypto";
import express from "express";

import { attachTenantDatabaseContext, getTenantModels } from "../db/tenantConnectionManager.js";
import { protect } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import Institute from "../models/Institute.js";
import User from "../models/User.js";
import {
  clearAuthCookies,
  comparePassword,
  generateAccessToken,
  getAuthCookieOptions,
  hashPassword,
  setAuthCookies
} from "../utils/auth.js";
import { sendInviteEmail } from "../utils/email.js";
import { buildTenantConfigSnapshot } from "../utils/tenantConfig.js";
import { hasMinLength, isEmail, isNonEmptyString, isPositiveYear } from "../utils/validation.js";
import { login, logout, getMe, refresh, forgotPassword, resetPassword } from "../controllers/auth.controller.js";

const router = express.Router();
const OAUTH_FLOW_COOKIE = "oauthFlow";
const OAUTH_PENDING_COOKIE = "oauthPending";
const OAUTH_COOKIE_MAX_AGE = 1000 * 60 * 15;

// Helper functions (kept for OAuth)
function hashInviteToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildInviteUrl(rawInviteToken) {
  return `${process.env.CLIENT_URL || "http://localhost:5173"}/setup-password/${rawInviteToken}`;
}

function issueInviteToken(user) {
  const rawInviteToken = crypto.randomBytes(24).toString("hex");
  user.inviteTokenHash = hashInviteToken(rawInviteToken);
  user.inviteTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  user.passwordSetupCompleted = false;
  user.isActive = false;

  return {
    inviteUrl: buildInviteUrl(rawInviteToken),
    expiresAt: user.inviteTokenExpiresAt
  };
}

function getEmailDomain(email) {
  const [, domain = ""] = String(email || "").trim().toLowerCase().split("@");
  return domain;
}

function isDomainLike(value) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(value);
}

function getAutoApprovalDomains(institute) {
  const configuredDomains = Array.isArray(institute?.featureFlags?.autoApproveEmailDomains)
    ? institute.featureFlags.autoApproveEmailDomains
    : [];

  const baseDomains = configuredDomains.length ? configuredDomains : [institute?.domain || ""];
  const normalized = baseDomains
    .map((value) => String(value || "").trim().toLowerCase().replace(/^@/, ""))
    .filter((value) => value && isDomainLike(value));

  return [...new Set(normalized)];
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getFrontendBaseUrl() {
  return process.env.CLIENT_URL || "http://localhost:5173";
}

function getOAuthRedirectUri(provider) {
  const explicitRedirect = process.env[`${provider.toUpperCase()}_REDIRECT_URI`];

  if (explicitRedirect) {
    return explicitRedirect;
  }

  return `http://localhost:${process.env.PORT || 5000}/api/auth/oauth/${provider}/callback`;
}

function encodeCookiePayload(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCookiePayload(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function setCookiePayload(res, name, payload, maxAge = OAUTH_COOKIE_MAX_AGE) {
  res.cookie(name, encodeCookiePayload(payload), {
    ...getAuthCookieOptions(),
    maxAge
  });
}

function getCookiePayload(req, name) {
  return decodeCookiePayload(req.cookies?.[name]);
}

function clearCookiePayload(res, name) {
  res.clearCookie(name, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

function clearOAuthState(res) {
  clearCookiePayload(res, OAUTH_FLOW_COOKIE);
}

function clearOAuthPendingSession(res) {
  clearCookiePayload(res, OAUTH_PENDING_COOKIE);
}

function validateLoginBody(body) {
  const issues = [];

  if (!isNonEmptyString(body.email)) {
    issues.push("Email is required");
  }

  if (!hasMinLength(body.password, 6)) {
    issues.push("Password must be at least 6 characters");
  }

  return issues;
}

function validateAlumniRegistrationBody(body) {
  const issues = [];

  if (!isObject(body)) {
    return ["Registration payload is required"];
  }

  if (!isNonEmptyString(body.authProvider) || !["google", "linkedin", "email"].includes(body.authProvider)) {
    issues.push("Authentication provider must be Google, LinkedIn, or email");
  }

  if (!isNonEmptyString(body.instituteId)) {
    issues.push("Institute is required");
  }

  if (!isEmail(body.email)) {
    issues.push("A valid email address is required");
  }

  if (!isNonEmptyString(body.firstName)) {
    issues.push("First name is required");
  }

  if (!isNonEmptyString(body.lastName)) {
    issues.push("Last name is required");
  }

  if (body.termsAccepted !== true) {
    issues.push("You must accept the terms to continue");
  }

  return issues;
}

function validateSetupPasswordBody(body) {
  const issues = [];

  if (!isNonEmptyString(body.token)) {
    issues.push("Invite token is required");
  }

  if (!hasMinLength(body.password, 8)) {
    issues.push("Password must be at least 8 characters");
  }

  return issues;
}

function validateInviteParams(params) {
  const issues = [];

  if (!isNonEmptyString(params.token)) {
    issues.push("Invite token is required");
  }

  return issues;
}

function validateOAuthProvider(params) {
  return ["google", "linkedin"].includes(params.provider) ? [] : ["Unsupported OAuth provider"];
}

function formatUserSession(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    institute: user.instituteId
      ? {
          _id: user.instituteId._id,
          name: user.instituteId.name,
          status: user.instituteId.status,
          subdomain: user.instituteId.subdomain || null,
          domain: user.instituteId.domain || null,
          ...buildTenantConfigSnapshot(user.instituteId)
        }
      : null
  };
}

function getRequestUserModel(req) {
  if (req.tenantPersistence?.isolationMode === "dedicated") {
    return getTenantModels(req).User;
  }

  return User;
}

function getProviderConfig(provider) {
  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
      scope: "openid profile email"
    };
  }

  if (provider === "linkedin") {
    return {
      clientId: process.env.LINKEDIN_CLIENT_ID || "",
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
      authorizationEndpoint: "https://www.linkedin.com/oauth/v2/authorization",
      tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken",
      userInfoEndpoint: "https://api.linkedin.com/v2/userinfo",
      scope: "openid profile email"
    };
  }

  const error = new Error("Unsupported OAuth provider");
  error.statusCode = 400;
  throw error;
}

function assertProviderConfigured(provider) {
  const config = getProviderConfig(provider);

  if (!config.clientId || !config.clientSecret) {
    const error = new Error(`${provider} OAuth is not configured yet`);
    error.statusCode = 503;
    throw error;
  }

  return config;
}

function buildOAuthAuthorizationUrl(provider, statePayload) {
  const config = assertProviderConfigured(provider);
  const url = new URL(config.authorizationEndpoint);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", getOAuthRedirectUri(provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", statePayload.state);

  if (provider === "google") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account");
  }

  return url.toString();
}

async function exchangeOAuthCode(provider, code) {
  const config = assertProviderConfigured(provider);
  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: getOAuthRedirectUri(provider)
    }).toString()
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`Failed to exchange ${provider} OAuth code: ${details || response.statusText}`);
    error.statusCode = 502;
    throw error;
  }

  return response.json();
}

async function fetchOAuthProfile(provider, accessToken) {
  const config = getProviderConfig(provider);
  const response = await fetch(config.userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`Failed to fetch ${provider} profile: ${details || response.statusText}`);
    error.statusCode = 502;
    throw error;
  }

  const profile = await response.json();
  const email = String(profile.email || "").trim().toLowerCase();
  const firstName = profile.given_name || profile.localizedFirstName || "";
  const lastName = profile.family_name || profile.localizedLastName || "";

  if (!email) {
    const error = new Error(`${provider} did not return an email address`);
    error.statusCode = 400;
    throw error;
  }

  return {
    provider,
    providerUserId: String(profile.sub || profile.id || "").trim(),
    email,
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" ") || profile.name || email,
    avatarUrl: profile.picture || profile.pictureUrl || "",
    emailVerified: profile.email_verified !== false
  };
}

async function resolveInstituteFromState(statePayload) {
  const requestedSubdomain = String(statePayload?.tenantSubdomain || "").trim().toLowerCase();
  const requestedDomain = String(statePayload?.tenantDomain || "").trim().toLowerCase();

  if (!requestedSubdomain && !requestedDomain) {
    return null;
  }

  return Institute.findOne({
    status: "active",
    $or: [
      ...(requestedDomain ? [{ domain: requestedDomain }] : []),
      ...(requestedSubdomain ? [{ subdomain: requestedSubdomain }] : [])
    ]
  });
}

async function getTenantUserContext(institute) {
  if (!institute) {
    return null;
  }

  const tenantContext = {};
  await attachTenantDatabaseContext(tenantContext, institute);
  return {
    tenantContext,
    models: getTenantModels(tenantContext)
  };
}

function normalizeOAuthAccounts(user) {
  return Array.isArray(user.oauthAccounts) ? user.oauthAccounts : [];
}

function linkOAuthAccount(user, oauthProfile) {
  const accounts = normalizeOAuthAccounts(user);
  const existingAccount = accounts.find((account) => account.provider === oauthProfile.provider);

  if (existingAccount) {
    existingAccount.providerUserId = oauthProfile.providerUserId;
    existingAccount.email = oauthProfile.email;
    existingAccount.linkedAt = new Date();
  } else {
    accounts.push({
      provider: oauthProfile.provider,
      providerUserId: oauthProfile.providerUserId,
      email: oauthProfile.email,
      linkedAt: new Date()
    });
  }

  user.oauthAccounts = accounts;
}

function userHasProviderLinked(user, oauthProfile) {
  return normalizeOAuthAccounts(user).some(
    (account) => account.provider === oauthProfile.provider && account.providerUserId === oauthProfile.providerUserId
  );
}

async function findUserByOAuthOrEmail(UserModel, oauthProfile) {
  let user = await UserModel.findOne({
    oauthAccounts: {
      $elemMatch: {
        provider: oauthProfile.provider,
        providerUserId: oauthProfile.providerUserId
      }
    }
  });

  if (!user) {
    user = await UserModel.findOne({ email: oauthProfile.email });
  }

  return user;
}

async function loadUserForOAuthLogin(oauthProfile, institute) {
  if (institute) {
    const tenantUserContext = await getTenantUserContext(institute);
    const user = await findUserByOAuthOrEmail(tenantUserContext.models.User, oauthProfile);

    if (user) {
      user.instituteId = institute;
    }

    return user;
  }

  const user = await findUserByOAuthOrEmail(User, oauthProfile);

  if (user?.instituteId && typeof user.populate === "function") {
    await user.populate("instituteId");
  }

  return user;
}

function ensureUserCanLogin(user) {
  if (!user) {
    const error = new Error("No account is registered for this OAuth identity yet");
    error.statusCode = 404;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("Your account is not active yet. Wait for institute admin approval and complete password setup from email.");
    error.statusCode = 403;
    throw error;
  }

  if (user.passwordSetupCompleted === false) {
    const error = new Error("Finish setting your password from the invite email before using social sign-in.");
    error.statusCode = 403;
    throw error;
  }

  if (user.role !== "super_admin" && (!user.instituteId || user.instituteId.status !== "active")) {
    const error = new Error("Your institute portal is not active yet");
    error.statusCode = 403;
    throw error;
  }
}

function buildFrontendUrl(pathname, params = {}) {
  const url = new URL(pathname, getFrontendBaseUrl());

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function redirectWithError(res, pathname, message, extraParams = {}) {
  res.redirect(buildFrontendUrl(pathname, { ...extraParams, error: message }));
}

// Routes
router.post("/login", validateBody(validateLoginBody), login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);

router.get("/oauth/session", (req, res) => {
  const pendingSession = getCookiePayload(req, OAUTH_PENDING_COOKIE);

  res.json({
    oauthSession: pendingSession
      ? {
          provider: pendingSession.provider,
          email: pendingSession.email,
          firstName: pendingSession.firstName,
          lastName: pendingSession.lastName,
          name: pendingSession.name,
          avatarUrl: pendingSession.avatarUrl,
          emailVerified: pendingSession.emailVerified,
          tenantSubdomain: pendingSession.tenantSubdomain || "",
          tenantDomain: pendingSession.tenantDomain || ""
        }
      : null
  });
});

router.delete("/oauth/session", (_req, res) => {
  clearOAuthPendingSession(res);
  res.json({ message: "OAuth session cleared" });
});

router.get("/oauth/:provider/start", validateParams(validateOAuthProvider), async (req, res, next) => {
  try {
    const provider = req.params.provider;
    const mode = req.query.mode === "register" ? "register" : "login";
    const state = crypto.randomBytes(18).toString("hex");
    const statePayload = {
      state,
      provider,
      mode,
      tenantSubdomain: String(req.query.tenantSubdomain || "").trim().toLowerCase(),
      tenantDomain: String(req.query.tenantDomain || "").trim().toLowerCase(),
      createdAt: Date.now()
    };

    setCookiePayload(res, OAUTH_FLOW_COOKIE, statePayload);
    res.redirect(buildOAuthAuthorizationUrl(provider, statePayload));
  } catch (error) {
    next(error);
  }
});

router.get("/oauth/:provider/callback", validateParams(validateOAuthProvider), async (req, res, next) => {
  try {
    const provider = req.params.provider;
    const statePayload = getCookiePayload(req, OAUTH_FLOW_COOKIE);

    if (!statePayload || statePayload.provider !== provider || statePayload.state !== req.query.state) {
      clearOAuthState(res);
      redirectWithError(res, "/login", "OAuth session expired. Please try again.");
      return;
    }

    clearOAuthState(res);

    if (!req.query.code || typeof req.query.code !== "string") {
      redirectWithError(res, "/login", `${provider} did not return an authorization code.`);
      return;
    }

    const tokenResponse = await exchangeOAuthCode(provider, req.query.code);
    const oauthProfile = await fetchOAuthProfile(provider, tokenResponse.access_token);

    if (statePayload.mode === "register") {
      setCookiePayload(res, OAUTH_PENDING_COOKIE, {
        provider,
        email: oauthProfile.email,
        firstName: oauthProfile.firstName,
        lastName: oauthProfile.lastName,
        name: oauthProfile.name,
        avatarUrl: oauthProfile.avatarUrl,
        emailVerified: oauthProfile.emailVerified,
        providerUserId: oauthProfile.providerUserId,
        tenantSubdomain: statePayload.tenantSubdomain,
        tenantDomain: statePayload.tenantDomain
      });

      res.redirect(buildFrontendUrl("/register", { provider, oauth: "connected" }));
      return;
    }

    const institute = (await resolveInstituteFromState(statePayload)) || req.tenant || null;
    const user = await loadUserForOAuthLogin(oauthProfile, institute);

    if (!user) {
      setCookiePayload(res, OAUTH_PENDING_COOKIE, {
        provider,
        email: oauthProfile.email,
        firstName: oauthProfile.firstName,
        lastName: oauthProfile.lastName,
        name: oauthProfile.name,
        avatarUrl: oauthProfile.avatarUrl,
        emailVerified: oauthProfile.emailVerified,
        providerUserId: oauthProfile.providerUserId,
        tenantSubdomain: statePayload.tenantSubdomain,
        tenantDomain: statePayload.tenantDomain
      });

      res.redirect(buildFrontendUrl("/register", {
        provider,
        oauth: "connected",
        source: "login"
      }));
      return;
    }

    if (!userHasProviderLinked(user, oauthProfile)) {
      linkOAuthAccount(user, oauthProfile);
      await user.save();
    }

    ensureUserCanLogin(user);

    const token = generateAccessToken(user);
    setAuthCookies(res, token);
    clearOAuthPendingSession(res);

    res.redirect(buildFrontendUrl(user.role === "super_admin" ? "/super-admin" : "/portal"));
  } catch (error) {
    redirectWithError(res, "/login", error.message);
  }
});

router.post("/alumni-registration", validateBody(validateAlumniRegistrationBody), async (req, res, next) => {
  try {
    const institute = await Institute.findOne({ _id: req.body.instituteId, status: "active" });

    if (!institute) {
      const error = new Error("Selected institute is not available for registration");
      error.statusCode = 404;
      throw error;
    }

    const profileFields = institute.profileFields || [];
    const missingFields = [];
    
    for (const field of profileFields) {
      const regVis = field.showInRegistration || field.visibility;
      if (regVis === "required") {
        if (field.isStandard) {
           if (!req.body[field.fieldKey] || String(req.body[field.fieldKey]).trim() === "") {
             missingFields.push(field.label);
           }
        } else {
           if (!req.body.customData || !req.body.customData[field.fieldKey] || String(req.body.customData[field.fieldKey]).trim() === "") {
             missingFields.push(field.label);
           }
        }
      }
    }

    if (missingFields.length > 0) {
      const error = new Error(`Missing required fields: ${missingFields.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }

    const tenantContext = {};
    await attachTenantDatabaseContext(tenantContext, institute);
    const { User: TenantUser, AlumniProfile: TenantAlumniProfile } = getTenantModels(tenantContext);
    const normalizedEmail = req.body.email.trim().toLowerCase();
    const existingUser = await TenantUser.findOne({ email: normalizedEmail });

    if (existingUser) {
      const error = new Error("An account with this email already exists");
      error.statusCode = 409;
      throw error;
    }

    const oauthSession = getCookiePayload(req, OAUTH_PENDING_COOKIE);
    const oauthProvider = req.body.authProvider;
    const shouldLinkOAuth = oauthProvider === "google" || oauthProvider === "linkedin";

    if (shouldLinkOAuth) {
      const hasMatchingSession =
        oauthSession &&
        oauthSession.provider === oauthProvider &&
        oauthSession.email === normalizedEmail &&
        oauthSession.providerUserId;

      if (!hasMatchingSession) {
        const error = new Error(`Please authenticate with ${oauthProvider} before submitting this registration.`);
        error.statusCode = 400;
        throw error;
      }
    }

    const oauthAccounts = shouldLinkOAuth
      ? [
          {
            provider: oauthSession.provider,
            providerUserId: oauthSession.providerUserId,
            email: oauthSession.email,
            linkedAt: new Date()
          }
        ]
      : [];

    const isEligibleForAutoApproval =
      shouldLinkOAuth &&
      oauthSession?.emailVerified !== false &&
      Boolean(institute.featureFlags?.autoApproveAlumni) &&
      getAutoApprovalDomains(institute).includes(getEmailDomain(normalizedEmail));

    const user = await TenantUser.create({
      instituteId: institute._id,
      name: `${req.body.firstName.trim()} ${req.body.lastName.trim()}`.trim(),
      email: normalizedEmail,
      passwordHash: await hashPassword(`Pending@${crypto.randomBytes(4).toString("hex")}`),
      role: "alumni",
      isActive: false,
      passwordSetupCompleted: false,
      inviteTokenHash: null,
      inviteTokenExpiresAt: null,
      oauthAccounts
    });

    const registrationReviewStatus = isEligibleForAutoApproval ? "approved" : "pending";

    await TenantAlumniProfile.create({
      instituteId: institute._id,
      userId: user._id,
      gender: req.body.gender?.trim?.() || "",
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
      mobileNumber: req.body.mobileNumber?.trim?.() || "",
      authProvider: req.body.authProvider,
      batch: institute.institutionType === "school" ? null : Number(req.body.batch || 0),
      department: institute.institutionType === "school" ? "" : req.body.department?.trim?.() || "",
      leavingYear: institute.institutionType === "school" ? Number(req.body.batch || 0) : null,
      lastClassAttended: institute.institutionType === "school" ? req.body.department?.trim?.() || "" : "",
      section: req.body.section?.trim?.() || "",
      currentEducation: req.body.currentEducation?.trim?.() || "",
      currentInstitution: req.body.currentInstitution?.trim?.() || "",
      occupation: req.body.occupation?.trim?.() || "",
      company: req.body.company?.trim?.() || "",
      designation: req.body.designation?.trim?.() || "",
      country: req.body.currentCountry?.trim?.() || "",
      city: req.body.currentCity?.trim?.() || "",
      location: `${req.body.currentCity?.trim?.() || ""} ${req.body.currentCountry?.trim?.() || ""}`.trim(),
      customData: req.body.customData || {},
      bio: "",
      skills: [],
      registrationReviewStatus,
      registrationRejectedReason: "",
      registrationReviewedAt: isEligibleForAutoApproval ? new Date() : null
    });

    if (isEligibleForAutoApproval) {
      const { inviteUrl, expiresAt } = issueInviteToken(user);
      await user.save();

      await sendInviteEmail({
        to: user.email,
        recipientName: user.name,
        instituteName: institute.name,
        inviteUrl,
        expiresAt,
        portalRoleLabel: institute?.institutionType === "school" ? "former student" : "alumni",
        institutionType: institute?.institutionType || "college"
      });
    }

    clearOAuthPendingSession(res);

    res.status(201).json({
      message: isEligibleForAutoApproval
        ? "Registration approved automatically. A password setup link has been sent to your email."
        : "Registration submitted successfully. Your institute admin will review it and email you a password setup link after approval.",
      autoApproved: isEligibleForAutoApproval
    });
  } catch (error) {
    next(error);
  }
});

router.get("/invite/:token", validateParams(validateInviteParams), async (req, res, next) => {
  try {
    const inviteTokenHash = hashInviteToken(req.params.token);
    const RequestUser = getRequestUserModel(req);

    const user = await RequestUser.findOne({
      inviteTokenHash,
      inviteTokenExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      const error = new Error("This invite link is invalid or has expired");
      error.statusCode = 404;
      throw error;
    }

    res.json({
      email: user.email,
      name: user.name,
      role: user.role,
      institute: req.tenant || user.instituteId || null
    });
  } catch (error) {
    next(error);
  }
});

router.post("/setup-password", validateBody(validateSetupPasswordBody), async (req, res, next) => {
  try {
    const { token: inviteToken, password } = req.body;
    const RequestUser = getRequestUserModel(req);

    if (!inviteToken || !password || password.length < 8) {
      const error = new Error("A valid invite token and password of at least 8 characters are required");
      error.statusCode = 400;
      throw error;
    }

    const inviteTokenHash = hashInviteToken(inviteToken);
    const user = await RequestUser.findOne({
      inviteTokenHash,
      inviteTokenExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      const error = new Error("This invite link is invalid or has expired");
      error.statusCode = 404;
      throw error;
    }

    user.passwordHash = await hashPassword(password);
    user.passwordSetupCompleted = true;
    user.isActive = true;
    user.inviteTokenHash = null;
    user.inviteTokenExpiresAt = null;

    await user.save();

    if (req.tenant) {
      user.instituteId = req.tenant;
    }

    const canLogin = user.role === "super_admin" || req.tenant?.status === "active" || user.instituteId?.status === "active";
    const sessionToken = canLogin ? generateAccessToken(user) : null;

    if (sessionToken) {
      setAuthCookies(res, sessionToken);
    } else {
      clearAuthCookies(res);
    }

    res.json({
      token: sessionToken,
      canLogin,
      message: canLogin
        ? "Account activated successfully."
        : "Password set successfully. You can sign in after your institute is approved.",
      user: formatUserSession(user)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
