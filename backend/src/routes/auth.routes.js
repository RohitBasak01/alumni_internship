import crypto from "node:crypto";
import express from "express";

import { protect } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import User from "../models/User.js";
import {
  clearAuthCookie,
  comparePassword,
  generateToken,
  hashPassword,
  setAuthCookie
} from "../utils/auth.js";
import { hasMinLength, isNonEmptyString } from "../utils/validation.js";

const router = express.Router();

function hashInviteToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
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
          domain: user.instituteId.domain || null
        }
      : null
  };
}

router.post("/login", validateBody(validateLoginBody), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.trim().toLowerCase() }).populate("instituteId");

    if (!user) {
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    const validPassword = await comparePassword(password, user.passwordHash);

    if (!validPassword) {
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error("Your account is not active yet");
      error.statusCode = 403;
      throw error;
    }

    if (user.passwordSetupCompleted === false) {
      const error = new Error("Please finish setting your password from the invite link first");
      error.statusCode = 403;
      throw error;
    }

    if (
      user.role !== "super_admin" &&
      (!user.instituteId || user.instituteId.status !== "active")
    ) {
      const error = new Error("Your institute portal is not active yet");
      error.statusCode = 403;
      throw error;
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    res.json({
      token,
      user: formatUserSession(user)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/invite/:token", validateParams(validateInviteParams), async (req, res, next) => {
  try {
    const inviteTokenHash = hashInviteToken(req.params.token);

    const user = await User.findOne({
      inviteTokenHash,
      inviteTokenExpiresAt: { $gt: new Date() }
    }).populate("instituteId", "name subdomain domain status");

    if (!user) {
      const error = new Error("This invite link is invalid or has expired");
      error.statusCode = 404;
      throw error;
    }

    res.json({
      email: user.email,
      name: user.name,
      role: user.role,
      institute: user.instituteId
    });
  } catch (error) {
    next(error);
  }
});

router.post("/setup-password", validateBody(validateSetupPasswordBody), async (req, res, next) => {
  try {
    const { token: inviteToken, password } = req.body;

    if (!inviteToken || !password || password.length < 8) {
      const error = new Error("A valid invite token and password of at least 8 characters are required");
      error.statusCode = 400;
      throw error;
    }

    const inviteTokenHash = hashInviteToken(inviteToken);
    const user = await User.findOne({
      inviteTokenHash,
      inviteTokenExpiresAt: { $gt: new Date() }
    }).populate("instituteId");

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

    const canLogin = user.role === "super_admin" || user.instituteId?.status === "active";
    const sessionToken = canLogin ? generateToken(user) : null;

    if (sessionToken) {
      setAuthCookie(res, sessionToken);
    } else {
      clearAuthCookie(res);
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

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully" });
});

router.get("/me", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-passwordHash")
      .populate("instituteId", "name status subdomain domain");

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.json(formatUserSession(user));
  } catch (error) {
    next(error);
  }
});

export default router;
