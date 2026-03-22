import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "authToken";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      instituteId: user.instituteId || null
    },
    process.env.JWT_SECRET || "change-me",
    { expiresIn: "7d" }
  );
}

export function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7
  };
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}
