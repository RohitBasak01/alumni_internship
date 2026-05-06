import crypto from "node:crypto";
import { getTenantModels } from "../db/tenantConnectionManager.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logAuditEvent } from "../utils/audit.js";
import { sendInviteEmail } from "../utils/email.js";
import { hashPassword } from "../utils/auth.js";
import { buildProfileCompletion, buildProfilePrivacy } from "../utils/profileCompletion.js";
import { buildTenantConfigSnapshot } from "../utils/tenantConfig.js";

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

function getInstitutionType(tenant) {
  return buildTenantConfigSnapshot(tenant)?.institutionType === "school" ? "school" : "college";
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
    sort: sortParam,
    page: pageParam,
    limit: limitParam,
  } = req.query;
  const searchText = String(q || "").trim();

  // Pagination
  const page = Math.max(1, Number(pageParam) || 1);
  const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);
  const usePagination = Boolean(pageParam || limitParam);

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
    ];
  }

  if (skill) profileFilter.skills = { $in: [buildRegex(String(skill))] };

  // Sort options
  let sortSpec = { createdAt: -1 }; // default: newest
  if (sortParam === "name") sortSpec = { "userId.name": 1 };
  if (sortParam === "batch") sortSpec = { batch: -1, leavingYear: -1 };

  const alumni = await AlumniProfile.find(profileFilter)
    .populate("userId", "name email isActive passwordSetupCompleted")
    .sort(sortSpec);

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

  // Text search filter
  if (searchText) {
    const queryRegex = buildRegex(searchText);
    result = result.filter((entry) => {
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
  }

  // Sort by name (post-populate since name is on User model)
  if (sortParam === "name") {
    result.sort((a, b) => {
      const nameA = String(a.userId?.name || "").toLowerCase();
      const nameB = String(b.userId?.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  // Return paginated or legacy format
  if (usePagination) {
    const total = result.length;
    const startIndex = (page - 1) * limit;
    const paginatedData = result.slice(startIndex, startIndex + limit);
    return res.json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: startIndex + limit < total
      }
    });
  }

  res.json(result);
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

  const institutionType = getInstitutionType(req.tenant);
  const profileCompletion = buildProfileCompletion(profile, {
    institutionType,
    user: profile.userId
  });
  const privacy = buildProfilePrivacy(profile);

  res.json({
    ...profile.toObject(),
    profileCompletion,
    privacy
  });
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

  // Update user name if provided
  user.name = req.body.name?.trim?.() || user.name;

  // Allowlisted profile fields
  const allowedFields = [
    "gender", "dateOfBirth", "mobileNumber", "profilePhotoUrl",
    "rollNo", "isFaculty", "batch", "department", "leavingYear",
    "lastClassAttended", "section", "currentEducation", "currentInstitution",
    "occupation", "company", "designation", "location", "country", "state",
    "city", "industry", "bio", "skills", "linkedinUrl", "websiteUrl",
    "twitterHandle", "profileVisibility", "showEmail", "showPhone",
    "allowMentorRequests"
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      profile[field] = req.body[field];
    }
  }

  await user.save();
  await profile.save();

  const institutionType = getInstitutionType(req.tenant);
  const profileCompletion = buildProfileCompletion(profile, {
    institutionType,
    user
  });
  const privacy = buildProfilePrivacy(profile);

  res.json({
    ...profile.toObject(),
    name: user.name,
    profileCompletion,
    privacy
  });
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
