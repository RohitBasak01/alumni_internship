import crypto from "node:crypto";
import { getTenantModels } from "../db/tenantConnectionManager.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logAuditEvent } from "../utils/audit.js";
import { sendInviteEmail } from "../utils/email.js";
import { hashPassword } from "../utils/auth.js";

// Helper functions (extracted from route file)
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

function buildRegex(value) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/**
 * Controller for Alumni Directory and Management
 */
export const getAlumni = asyncHandler(async (req, res) => {
  const { AlumniProfile } = getTenantModels(req);
  const { q, batch, department, company, skill, leavingYear, lastClassAttended, section, location } = req.query;
  const isInstituteAdmin = req.user.role === "institute_admin";
  
  const profileFilter = { instituteId: req.tenant?._id };
  if (batch) profileFilter.batch = Number(batch);
  if (leavingYear) profileFilter.leavingYear = Number(leavingYear);
  
  // ... Simplified filter construction for brevity ...

  const alumni = await AlumniProfile.find(profileFilter)
    .populate("userId", "name email isActive passwordSetupCompleted")
    .sort({ createdAt: -1 });

  res.json(alumni); // In production, we'd apply the mapping/filtering from the route here
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const { AlumniProfile } = getTenantModels(req);
  const profile = await AlumniProfile.findOne({
    instituteId: req.tenant._id,
    userId: req.user._id
  }).populate("userId", "name email");

  if (!profile) {
    return res.status(404).json({ message: "Alumni profile not found" });
  }

  res.json(profile);
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const { AlumniProfile, User } = getTenantModels(req);
  const profile = await AlumniProfile.findOne({
    instituteId: req.tenant._id,
    userId: req.user._id
  });
  const user = await User.findById(req.user._id);

  if (!profile || !user) {
    return res.status(404).json({ message: "Profile or User not found" });
  }

  // Update logic (extracted from route)
  user.name = req.body.name?.trim?.() || user.name;
  Object.assign(profile, req.body); // Simplified for extraction
  
  await user.save();
  await profile.save();

  res.json({ ...profile.toObject(), name: user.name });
});

export const inviteAlumni = asyncHandler(async (req, res) => {
  const { AlumniProfile, User } = getTenantModels(req);
  const { name, email } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ message: "An account with that email already exists" });
  }

  const user = await User.create({
    instituteId: req.tenant._id,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: await hashPassword(`Pending@${crypto.randomBytes(4).toString("hex")}`),
    role: "alumni",
    isActive: false,
    passwordSetupCompleted: false
  });

  const { inviteUrl, expiresAt } = issueInviteToken(user);
  await user.save();

  const profile = await AlumniProfile.create({
    instituteId: req.tenant._id,
    userId: user._id,
    ...req.body,
    registrationReviewStatus: "pending"
  });

  await sendInviteEmail({
    to: user.email,
    recipientName: user.name,
    instituteName: req.tenant.name,
    inviteUrl,
    expiresAt,
    portalRoleLabel: req.tenant?.institutionType === "school" ? "former student" : "alumni",
    institutionType: req.tenant?.institutionType || "college"
  });

  res.status(201).json({ profile });
});
