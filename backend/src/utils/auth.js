import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "authToken";
export const REFRESH_COOKIE_NAME = "refreshToken";

export function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();
  
  if (!secret) {
    throw new Error("JWT_SECRET is required. Refusing to use an insecure fallback secret.");
  }

  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("JWT_SECRET is too weak for production. Must be at least 32 characters (64+ recommended).");
  }

  return secret;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      instituteId: user.instituteId?._id || user.instituteId || null
    },
    getJwtSecret(),
    { expiresIn: "15m" }
  );
}

export function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 15 // 15 minutes for access token
  };

  if (isProduction && process.env.AUTH_COOKIE_DOMAIN) {
    options.domain = process.env.AUTH_COOKIE_DOMAIN;
  }

  return options;
}

export function getRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    path: "/api/auth/refresh", // Only send refresh token to the refresh endpoint
    sameSite: "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  };

  if (isProduction && process.env.AUTH_COOKIE_DOMAIN) {
    options.domain = process.env.AUTH_COOKIE_DOMAIN;
  }

  return options;
}

export function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(AUTH_COOKIE_NAME, accessToken, getAuthCookieOptions());
  if (refreshToken) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
  }
}

export function clearAuthCookies(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(process.env.NODE_ENV === "production" && process.env.AUTH_COOKIE_DOMAIN
      ? { domain: process.env.AUTH_COOKIE_DOMAIN }
      : {})
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    path: "/api/auth/refresh",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(process.env.NODE_ENV === "production" && process.env.AUTH_COOKIE_DOMAIN
      ? { domain: process.env.AUTH_COOKIE_DOMAIN }
      : {})
  });
}

