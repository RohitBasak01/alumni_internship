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
    expiresAt: user.inviteTokenExpiresAt,
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
  const {
    q,
    batch,
    department,
    company,
    skill,
    leavingYear,
    lastClassAttended,
    section,
    location,
    rollNo,
    industry,
    alphaIndex,
    isFaculty,
    registeredOnly,
  } = req.query;
  const searchText = String(q || "").trim();

  const profileFilter = { instituteId: req.tenant?._id };
  if (batch) profileFilter.batch = Number(batch);
  if (leavingYear) profileFilter.leavingYear = Number(leavingYear);

  if (department) profileFilter.department = buildRegex(String(department));
  if (company) profileFilter.company = buildRegex(String(company));
  if (industry) profileFilter.industry = buildRegex(String(industry));
  if (lastClassAttended)
    profileFilter.lastClassAttended = buildRegex(String(lastClassAttended));
  if (section) profileFilter.section = buildRegex(String(section));
  if (location) profileFilter.location = buildRegex(String(location));
  if (rollNo) profileFilter.rollNo = buildRegex(String(rollNo));
  if (isFaculty === "true") profileFilter.isFaculty = true;

  if (alphaIndex) {
    profileFilter.$or = [
      { name: { $regex: new RegExp(`^${alphaIndex}`, "i") } },
      // Since name is on the User model, we'll need to handle this via the filter later
      // or aggregate. For now, we'll handle it in the filter step below for simplicity.
    ];
  }

  if (skill) profileFilter.skills = { $in: [buildRegex(String(skill))] };

  const alumni = await AlumniProfile.find(profileFilter)
    .populate("userId", "name email isActive passwordSetupCompleted")
    .sort({ createdAt: -1 });

  let result = alumni;

  if (registeredOnly === "true") {
    result = result.filter((entry) => entry.userId?.passwordSetupCompleted);
  }

  if (alphaIndex) {
    const letter = String(alphaIndex).toUpperCase();
    result = result.filter((entry) =>
      String(entry.userId?.name || "").toUpperCase().startsWith(letter),
    );
  }

  if (!searchText) {
    return res.json(result);
  }

  const queryRegex = buildRegex(searchText);
  const filtered = result.filter((entry) => {
    const userName = String(entry?.userId?.name || "");
    const userEmail = String(entry?.userId?.email || "");

    const searchableProfileFields = [
      entry?.company,
      entry?.designation,
      entry?.location,
      entry?.currentInstitution,
      entry?.currentEducation,
      entry?.occupation,
      entry?.department,
      entry?.lastClassAttended,
      entry?.section,
      entry?.bio,
    ].map((value) => String(value || ""));

    const skillValues = Array.isArray(entry?.skills)
      ? entry.skills.map((value) => String(value || ""))
      : [];

    if (queryRegex.test(userName) || queryRegex.test(userEmail)) {
      return true;
    }

    if (searchableProfileFields.some((value) => queryRegex.test(value))) {
      return true;
    }

    return skillValues.some((value) => queryRegex.test(value));
  });

  res.json(filtered);
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const { AlumniProfile } = getTenantModels(req);
  const profile = await AlumniProfile.findOne({
    instituteId: req.tenant._id,
    userId: req.user._id,
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
    userId: req.user._id,
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
    return res
      .status(409)
      .json({ message: "An account with that email already exists" });
  }

  const user = await User.create({
    instituteId: req.tenant._id,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: await hashPassword(
      `Pending@${crypto.randomBytes(4).toString("hex")}`,
    ),
    role: "alumni",
    isActive: false,
    passwordSetupCompleted: false,
  });

  const { inviteUrl, expiresAt } = issueInviteToken(user);
  await user.save();

  const profile = await AlumniProfile.create({
    instituteId: req.tenant._id,
    userId: user._id,
    ...req.body,
    registrationReviewStatus: "pending",
  });

  await sendInviteEmail({
    to: user.email,
    recipientName: user.name,
    instituteName: req.tenant.name,
    inviteUrl,
    expiresAt,
    portalRoleLabel:
      req.tenant?.institutionType === "school" ? "former student" : "alumni",
    institutionType: req.tenant?.institutionType || "college",
  });

  res.status(201).json({ profile });
});
