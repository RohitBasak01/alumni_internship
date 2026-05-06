const COLLEGE_REQUIRED_FIELDS = [
  { key: "name", label: "Name" },
  { key: "batch", label: "Batch" },
  { key: "department", label: "Department" },
  { key: "company", label: "Company" },
  { key: "designation", label: "Designation" },
  { key: "location", label: "Location" },
  { key: "skills", label: "Skills" },
  { key: "bio", label: "Bio" }
];

const SCHOOL_REQUIRED_FIELDS = [
  { key: "name", label: "Name" },
  { key: "leavingYear", label: "Leaving year" },
  { key: "lastClassAttended", label: "Last class attended" },
  { key: "currentInstitution", label: "Current institution" },
  { key: "occupation", label: "Occupation" },
  { key: "location", label: "Location" },
  { key: "skills", label: "Skills" },
  { key: "bio", label: "Bio" }
];

function hasValue(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => String(entry || "").trim().length > 0);
  }

  return value !== null && value !== undefined && String(value).trim().length > 0;
}

export function buildProfileCompletion(profile, options = {}) {
  const institutionType = options.institutionType === "school" ? "school" : "college";
  const user = options.user || profile?.userId || {};
  const snapshot = {
    ...(profile?.toObject ? profile.toObject() : profile || {}),
    name: user?.name || profile?.name || "",
    email: user?.email || profile?.email || ""
  };
  const fields = institutionType === "school" ? SCHOOL_REQUIRED_FIELDS : COLLEGE_REQUIRED_FIELDS;
  const missingFields = fields
    .filter((field) => !hasValue(snapshot[field.key]))
    .map((field) => field.label);
  const completedCount = fields.length - missingFields.length;
  const completionScore = fields.length ? Math.round((completedCount / fields.length) * 100) : 0;

  return {
    completionScore,
    missingFields,
    requiredFieldCount: fields.length,
    completedFieldCount: completedCount
  };
}

export function buildProfilePrivacy(profile = {}) {
  return {
    visibility: profile.profileVisibility || "institute_only",
    showEmail: Boolean(profile.showEmail),
    showPhone: Boolean(profile.showPhone),
    allowMentorRequests: profile.allowMentorRequests !== false
  };
}
