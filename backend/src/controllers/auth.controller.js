import { getTenantModels } from "../db/tenantConnectionManager.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { 
  hashPassword, 
  comparePassword, 
  generateAccessToken, 
  generateRefreshToken, 
  hashToken, 
  setAuthCookies, 
  clearAuthCookies 
} from "../utils/auth.js";
import RefreshToken from "../models/RefreshToken.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import crypto from "node:crypto";

/**
 * Controller for Authentication
 */
export const login = asyncHandler(async (req, res) => {
  const { User } = getTenantModels(req);
  const { email, password } = req.body;

  const user = await User.findOne({ 
    email: email.toLowerCase().trim(),
    instituteId: req.tenant._id 
  }).select("+passwordHash");

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (!user.isActive && user.passwordSetupCompleted === false) {
    return res.status(403).json({ message: "Please complete your account setup via the link sent to your email." });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);

  // Store refresh token
  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await RefreshToken.findOneAndUpdate({ tokenHash }, { isRevoked: true });
  }

  clearAuthCookies(res);
  res.json({ message: "Logged out successfully" });
});

export const refresh = asyncHandler(async (req, res) => {
  const { User } = getTenantModels(req);
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await RefreshToken.findOne({ tokenHash });

  if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
    if (storedToken) {
       // Potential reuse attack or expired
       await RefreshToken.deleteMany({ userId: storedToken.userId }); // Revoke all sessions for safety
    }
    clearAuthCookies(res);
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }

  const user = await User.findById(storedToken.userId);
  if (!user || !user.isActive) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "User not found or inactive" });
  }

  // Rotate refresh token
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRefreshToken);

  storedToken.isRevoked = true;
  storedToken.replacedByToken = newTokenHash;
  await storedToken.save();

  await RefreshToken.create({
    userId: user._id,
    tokenHash: newTokenHash,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
  });

  setAuthCookies(res, newAccessToken, newRefreshToken);

  res.json({ message: "Token refreshed" });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { User } = getTenantModels(req);
  const { email } = req.body;

  const user = await User.findOne({ 
    email: email.toLowerCase().trim(),
    instituteId: req.tenant._id
  });

  // Always return 200 to prevent user enumeration
  if (!user) {
    return res.json({ message: "If an account with that email exists, a reset link has been sent." });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(resetToken);

  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

  await sendPasswordResetEmail({
    to: user.email,
    recipientName: user.name,
    resetUrl
  });

  res.json({ message: "If an account with that email exists, a reset link has been sent." });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { User } = getTenantModels(req);
  const { email, token, newPassword } = req.body;

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
    instituteId: req.tenant._id
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  user.passwordHash = await hashPassword(newPassword);
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpiresAt = null;
  user.passwordSetupCompleted = true; // Mark as setup if they reset it
  await user.save();

  // Revoke all existing sessions for safety
  await RefreshToken.deleteMany({ userId: user._id });

  res.json({ message: "Password reset successful. You can now log in." });
});
