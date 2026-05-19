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
 * Build a birthday-range predicate that works on month/day, ignoring the year.
 * @param {string} start  - "MM-DD" e.g. "01-15"
 * @param {string} end    - "MM-DD" e.g. "03-20"
 * @returns {(entry: object) => boolean}
 */
function buildBirthdayFilter(start, end) {
  // Parse start/end into [month, day] pairs (1-indexed month).
  const [sm, sd] = start.split("-").map(Number);
  const [em, ed] = end.split("-").map(Number);

  if (!sm || !sd || !em || !ed) return () => true; // invalid input → no filter

  const toOrdinal = (m, d) => m * 100 + d; // e.g. Jan 15 → 115, Dec 10 → 1210
  const startOrd = toOrdinal(sm, sd);
  const endOrd   = toOrdinal(em, ed);

  return (entry) => {
    if (!entry.dateOfBirth) return false;
    const dob = new Date(entry.dateOfBirth);
    if (isNaN(dob.getTime())) return false;
    const ord = toOrdinal(dob.getUTCMonth() + 1, dob.getUTCDate());
    if (startOrd <= endOrd) {
      // Normal range: e.g. Mar 01 – Nov 30
      return ord >= startOrd && ord <= endOrd;
    } else {
      // Wrap-around: e.g. Nov 15 – Feb 10
      return ord >= startOrd || ord <= endOrd;
    }
  };
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
    educationLevel,
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
    // Advanced filters
    skills, // comma-separated list
    experienceMin,
    experienceMax,
    companySize,
    availability, // comma-separated list
    // Birthday range filter (admin-only, format: MM-DD)
    birthdayStart,
    birthdayEnd,
    sort: sortParam,
    page: pageParam,
    limit: limitParam,
  } = req.query;
  const searchText = String(q || "").trim();

  // Pagination
  const page = Math.max(1, Number(pageParam) || 1);
  const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);
  const skip = (page - 1) * limit;
  const usePagination = Boolean(pageParam || limitParam);

  // Build base filter - apply all filters that can be done at database level
  const profileFilter = { instituteId: req.tenant?._id };
  
  // Exact match filters
  if (batch) profileFilter.batch = Number(batch);
  if (leavingYear) profileFilter.leavingYear = Number(leavingYear);
  if (isFaculty === "true") profileFilter.isFaculty = true;

  // Regex filters for text fields
  if (department) profileFilter.department = buildRegex(String(department));
  if (educationLevel) profileFilter.educationLevel = buildRegex(String(educationLevel));
  if (company) profileFilter.company = buildRegex(String(company));
  if (industry) profileFilter.industry = buildRegex(String(industry));
  if (lastClassAttended) profileFilter.lastClassAttended = buildRegex(String(lastClassAttended));
  if (section) profileFilter.section = buildRegex(String(section));
  if (location) profileFilter.location = buildRegex(String(location));
  if (rollNo) profileFilter.rollNo = buildRegex(String(rollNo));

  // Alpha index filter (name starts with letter)
  if (alphaIndex) {
    // We'll handle this in JavaScript after populating user data
  }

  // Skill filter - use regex for partial match
  if (skill) {
    profileFilter.skills = { $regex: buildRegex(String(skill)), $options: 'i' };
  }

  // Advanced filters
  // Multiple skills filter (comma-separated)
  if (skills) {
    const skillsArray = String(skills).split(',').map(s => s.trim()).filter(s => s);
    if (skillsArray.length > 0) {
      profileFilter.skills = { $all: skillsArray.map(skill => new RegExp(skill, 'i')) };
    }
  }

  // Experience range filter
  if (experienceMin || experienceMax) {
    profileFilter.experienceYears = {};
    if (experienceMin) {
      profileFilter.experienceYears.$gte = Number(experienceMin);
    }
    if (experienceMax) {
      profileFilter.experienceYears.$lte = Number(experienceMax);
    }
  }

  // Company size filter
  if (companySize) {
    profileFilter.companySize = buildRegex(String(companySize));
  }

  // Availability filter (comma-separated)
  if (availability) {
    const availabilityArray = String(availability).split(',').map(a => a.trim()).filter(a => a);
    if (availabilityArray.length > 0) {
      // Assuming availability is stored as an array field
      profileFilter.availability = { $in: availabilityArray };
    }
  }

  // Text search across profile fields at database level
  if (searchText) {
    const searchRegex = buildRegex(searchText);
    profileFilter.$or = [
      { company: searchRegex },
      { designation: searchRegex },
      { location: searchRegex },
      { currentInstitution: searchRegex },
      { currentEducation: searchRegex },
      { occupation: searchRegex },
      { department: searchRegex },
      { lastClassAttended: searchRegex },
      { section: searchRegex },
      { bio: searchRegex }
    ];
    // Skills are already handled by the skills filter above
  }

  // Sort options
  let sortSpec = { createdAt: -1 }; // default: newest
  if (sortParam === "name") sortSpec = { "userId.name": 1 };
  if (sortParam === "batch") sortSpec = { batch: -1, leavingYear: -1 };

  // Build query with database-level filtering
  const query = AlumniProfile.find(profileFilter)
    .populate("userId", "name email isActive passwordSetupCompleted")
    .sort(sortSpec);

  // For paginated requests, use skip/limit at database level
  if (usePagination) {
    query.skip(skip).limit(limit);
  }

  const alumni = await query;

  // Apply filters that require JavaScript processing
  let result = alumni;

  // Registered only filter
  if (registeredOnly === "true") {
    result = result.filter((entry) => entry.userId?.passwordSetupCompleted);
  }

  // Alpha index filter
  if (alphaIndex) {
    const letter = String(alphaIndex).toUpperCase();
    result = result.filter((entry) =>
      String(entry.userId?.name || "").toUpperCase().startsWith(letter),
    );
  }

  // Birthday range filter (month/day, year-agnostic)
  if (birthdayStart && birthdayEnd) {
    const birthdayPredicate = buildBirthdayFilter(birthdayStart, birthdayEnd);
    result = result.filter(birthdayPredicate);
  }

  // Text search on user fields (name, email) - only if not already filtered at DB level
  if (searchText) {
    const queryRegex = buildRegex(searchText);
    result = result.filter((entry) => {
      const userName = String(entry?.userId?.name || "");
      const userEmail = String(entry?.userId?.email || "");
      
      // Check if already matched by database $or filter
      // If not, check user fields
      return queryRegex.test(userName) || queryRegex.test(userEmail);
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

  // For paginated requests, we need total count for pagination metadata
  if (usePagination) {
    // Count total matching documents (with all filters applied)
    const countQuery = AlumniProfile.find(profileFilter);
    const totalAlumni = await countQuery;
    
    // Apply JavaScript filters to count
    let filteredCount = totalAlumni;
    if (registeredOnly === "true") {
      filteredCount = filteredCount.filter((entry) => entry.userId?.passwordSetupCompleted);
    }
    if (alphaIndex) {
      const letter = String(alphaIndex).toUpperCase();
      filteredCount = filteredCount.filter((entry) =>
        String(entry.userId?.name || "").toUpperCase().startsWith(letter),
      );
    }
    if (searchText) {
      const queryRegex = buildRegex(searchText);
      filteredCount = filteredCount.filter((entry) => {
        const userName = String(entry?.userId?.name || "");
        const userEmail = String(entry?.userId?.email || "");
        return queryRegex.test(userName) || queryRegex.test(userEmail);
      });
    }
    
    const total = filteredCount.length;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return res.json({
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: skip + limit < total
      }
    });
  }

  // Legacy behavior: return all results
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

  if (req.body.customData !== undefined && typeof req.body.customData === "object") {
    profile.customData = {
      ...(profile.customData ? Object.fromEntries(profile.customData) : {}),
      ...req.body.customData
    };
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

/**
 * Export alumni data as CSV
 */
export const exportAlumniCsv = asyncHandler(async (req, res) => {
  const { AlumniProfile } = getTenantModels(req);
  const {
    q,
    batch,
    department,
    educationLevel,
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
    // Birthday range filter (format: MM-DD)
    birthdayStart,
    birthdayEnd,
    sort: sortParam
  } = req.query;
  const searchText = String(q || "").trim();

  const profileFilter = { instituteId: req.tenant?._id };

  if (batch) profileFilter.batch = Number(batch);
  if (leavingYear) profileFilter.leavingYear = Number(leavingYear);
  if (isFaculty === "true") profileFilter.isFaculty = true;

  if (department) profileFilter.department = buildRegex(String(department));
  if (educationLevel) profileFilter.educationLevel = buildRegex(String(educationLevel));
  if (company) profileFilter.company = buildRegex(String(company));
  if (industry) profileFilter.industry = buildRegex(String(industry));
  if (lastClassAttended) profileFilter.lastClassAttended = buildRegex(String(lastClassAttended));
  if (section) profileFilter.section = buildRegex(String(section));
  if (location) profileFilter.location = buildRegex(String(location));
  if (rollNo) profileFilter.rollNo = buildRegex(String(rollNo));

  if (skill) {
    profileFilter.skills = { $regex: buildRegex(String(skill)), $options: "i" };
  }

  if (searchText) {
    const searchRegex = buildRegex(searchText);
    profileFilter.$or = [
      { company: searchRegex },
      { designation: searchRegex },
      { location: searchRegex },
      { currentInstitution: searchRegex },
      { currentEducation: searchRegex },
      { occupation: searchRegex },
      { department: searchRegex },
      { lastClassAttended: searchRegex },
      { section: searchRegex },
      { bio: searchRegex }
    ];
  }

  let sortSpec = { createdAt: -1 };
  if (sortParam === "name") sortSpec = { "userId.name": 1 };
  if (sortParam === "batch") sortSpec = { batch: -1, leavingYear: -1 };

  let alumni = await AlumniProfile.find(profileFilter)
    .populate("userId", "email name isActive passwordSetupCompleted")
    .sort(sortSpec);

  if (registeredOnly === "true") {
    alumni = alumni.filter((entry) => entry.userId?.passwordSetupCompleted);
  }

  if (alphaIndex) {
    const letter = String(alphaIndex).toUpperCase();
    alumni = alumni.filter((entry) =>
      String(entry.userId?.name || "").toUpperCase().startsWith(letter)
    );
  }

  // Birthday range filter (month/day, year-agnostic)
  if (birthdayStart && birthdayEnd) {
    const birthdayPredicate = buildBirthdayFilter(birthdayStart, birthdayEnd);
    alumni = alumni.filter(birthdayPredicate);
  }

  if (searchText) {
    const queryRegex = buildRegex(searchText);
    alumni = alumni.filter((entry) => {
      const userName = String(entry?.userId?.name || "");
      const userEmail = String(entry?.userId?.email || "");
      return queryRegex.test(userName) || queryRegex.test(userEmail);
    });
  }

  if (sortParam === "name") {
    alumni.sort((a, b) => {
      const nameA = String(a.userId?.name || "").toLowerCase();
      const nameB = String(b.userId?.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  const isSchool = getInstitutionType(req.tenant) === "school";
  const yearFieldLabel = isSchool ? "Leaving Year" : "Batch Year";
  const educationFieldLabel = isSchool ? "Last Class Attended" : "Course";
  const streamFieldLabel = isSchool ? "Section" : "Stream";

  // Build CSV rows
  const rows = [
    [
      "Name",
      "Email",
      "Status",
      yearFieldLabel,
      educationFieldLabel,
      streamFieldLabel,
      "Occupation",
      "Company",
      "Designation",
      "Location",
      "Skills",
      "Created At",
      "Last Updated"
    ],
    ...alumni.map((profile) => [
      profile.userId?.name || "",
      profile.userId?.email || "",
      profile.registrationReviewStatus || "pending",
      profile.batch || profile.leavingYear || "",
      isSchool ? profile.lastClassAttended || profile.currentEducation || "" : profile.department || "",
      profile.section || "",
      profile.occupation || "",
      profile.company || "",
      profile.designation || "",
      profile.location || "",
      Array.isArray(profile.skills) ? profile.skills.join(", ") : "",
      profile.createdAt ? new Date(profile.createdAt).toISOString().split("T")[0] : "",
      profile.updatedAt ? new Date(profile.updatedAt).toISOString().split("T")[0] : ""
    ])
  ];

  // Convert to CSV string
  const csvContent = rows.map(row =>
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const cellStr = String(cell || "");
      if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(",")
  ).join("\n");

  // Set response headers for file download
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `alumni-export-${timestamp}.csv`;
  
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csvContent);
});

/**
 * Bulk import alumni from CSV
 */
export const importAlumniCsv = asyncHandler(async (req, res) => {
  const { AlumniProfile, User } = getTenantModels(req);
  
  if (!req.file) {
    const error = new Error("No CSV file uploaded");
    error.statusCode = 400;
    throw error;
  }

  const csvContent = req.file.buffer.toString("utf-8");
  const lines = csvContent.split("\n").filter(line => line.trim());
  
  if (lines.length < 2) {
    const error = new Error("CSV file must have at least a header row and one data row");
    error.statusCode = 400;
    throw error;
  }

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const requiredHeaders = ["name", "email"];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    const error = new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const results = {
    total: lines.length - 1,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  const isSchool = getInstitutionType(req.tenant) === "school";

  // Process each row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCsvLine(line);
    
    if (values.length !== headers.length) {
      results.skipped++;
      results.errors.push({
        row: i + 1,
        error: `Column count mismatch: expected ${headers.length}, got ${values.length}`
      });
      continue;
    }

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || "";
    });

    try {
      const email = row.email.toLowerCase();
      
      // Check if user already exists
      const existingUser = await User.findOne({
        instituteId: req.tenant._id,
        email
      });

      if (existingUser) {
        // Update existing profile
        const existingProfile = await AlumniProfile.findOne({
          instituteId: req.tenant._id,
          userId: existingUser._id
        });

        if (existingProfile) {
          // Update profile fields
          const updateFields = {};
          if (row.name && row.name !== existingProfile.name) updateFields.name = row.name;
          if (row.batch) updateFields.batch = row.batch;
          if (row.department) updateFields.department = row.department;
          if (row.occupation) updateFields.occupation = row.occupation;
          if (row.company) updateFields.company = row.company;
          if (row.designation) updateFields.designation = row.designation;
          if (row.location) updateFields.location = row.location;
          
          if (Object.keys(updateFields).length > 0) {
            await AlumniProfile.updateOne(
              { _id: existingProfile._id },
              { $set: updateFields }
            );
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // Create new profile for existing user
          await AlumniProfile.create({
            instituteId: req.tenant._id,
            userId: existingUser._id,
            name: row.name || existingUser.name,
            batch: row.batch || "",
            department: row.department || "",
            occupation: row.occupation || "",
            company: row.company || "",
            designation: row.designation || "",
            location: row.location || "",
            registrationReviewStatus: "pending"
          });
          results.created++;
        }
      } else {
        // Create new user and profile
        const user = await User.create({
          instituteId: req.tenant._id,
          name: row.name,
          email,
          passwordHash: await hashPassword(
            `Pending@${crypto.randomBytes(4).toString("hex")}`
          ),
          role: "alumni",
          isActive: false,
          passwordSetupCompleted: false
        });

        const { inviteUrl, expiresAt } = issueInviteToken(user);
        await user.save();

        await AlumniProfile.create({
          instituteId: req.tenant._id,
          userId: user._id,
          name: row.name,
          batch: row.batch || "",
          department: row.department || "",
          occupation: row.occupation || "",
          company: row.company || "",
          designation: row.designation || "",
          location: row.location || "",
          registrationReviewStatus: "pending"
        });

        // Send invite email
        await sendInviteEmail({
          to: user.email,
          recipientName: user.name,
          instituteName: req.tenant.name,
          inviteUrl,
          expiresAt,
          portalRoleLabel: isSchool ? "former student" : "alumni",
          institutionType: isSchool ? "school" : "college"
        });

        results.created++;
      }

      results.processed++;
    } catch (error) {
      results.skipped++;
      results.errors.push({
        row: i + 1,
        error: error.message
      });
    }
  }

  // Log audit event
  await logAuditEvent(req, {
    action: "alumni.bulk_import",
    targetType: "AlumniProfile",
    instituteId: req.tenant._id,
    metadata: {
      totalRows: results.total,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      errorCount: results.errors.length
    }
  });

  res.json({
    message: `Bulk import completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
    ...results
  });
});

// Helper function to parse CSV line with quoted values
function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Start or end of quoted value
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  // Add last value
  values.push(current);
  return values;
}
