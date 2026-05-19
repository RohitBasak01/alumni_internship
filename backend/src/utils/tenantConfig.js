export function getDefaultCommunityLabels(institutionType = "college") {
  if (institutionType === "school") {
    return {
      memberPlural: "Former Students",
      memberSingular: "Former Student",
      adminLabel: "School Admin"
    };
  }

  return {
    memberPlural: "Alumni",
    memberSingular: "Alumnus/Alumna",
    adminLabel: "Institute Admin"
  };
}

export function getDefaultFeatureFlags(institutionType = "college") {
  if (institutionType === "school") {
    return {
      enableJobs: false,
      enableMentorship: false,
      enableDirectory: true,
      enableEvents: true,
      enableAnnouncements: true,
      enableGroups: true,
      enableSocialLinks: false,
      enableCareerFields: false,
      allowStudentRegistrations: false,
      autoApproveAlumni: false,
      autoApproveEmailDomains: []
    };
  }

  return {
    enableJobs: true,
    enableMentorship: true,
    enableDirectory: true,
    enableEvents: true,
    enableAnnouncements: true,
    enableGroups: true,
    enableSocialLinks: true,
    enableCareerFields: true,
    allowStudentRegistrations: false,
    autoApproveAlumni: false,
    autoApproveEmailDomains: []
  };
}

export function getDefaultBranding(institutionType = "college") {
  if (institutionType === "school") {
    return {
      tagline: "Stay connected with your school community.",
      primaryColor: "#1f7a5c",
      secondaryColor: "#0f4f3c",
      accentColor: "#e7f6ef",
      logoUrl: ""
    };
  }

  return {
    tagline: "Build lifelong alumni relationships.",
    primaryColor: "#2554d8",
    secondaryColor: "#163795",
    accentColor: "#eef3ff",
    logoUrl: ""
  };
}

export function getDefaultProfileFields(institutionType = "college") {
  const commonFields = [
    { fieldKey: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Non-binary", "Prefer not to say"], visibility: "required", showInRegistration: "required", showInProfile: true, isStandard: true },
    { fieldKey: "dateOfBirth", label: "Date of Birth", type: "date", options: [], visibility: "required", showInRegistration: "required", showInProfile: true, isStandard: true },
    { fieldKey: "mobileNumber", label: "Mobile Number", type: "text", options: [], visibility: "required", showInRegistration: "required", showInProfile: true, isStandard: true },
    { fieldKey: "currentCountry", label: "Current Country", type: "text", options: [], visibility: "required", showInRegistration: "required", showInProfile: true, isStandard: true },
    { fieldKey: "currentCity", label: "Current City", type: "text", options: [], visibility: "required", showInRegistration: "required", showInProfile: true, isStandard: true },
    { fieldKey: "batch", label: institutionType === "school" ? "Leaving Year" : "Batch/Graduation Year", type: "number", options: [], visibility: "required", showInRegistration: "required", showInProfile: true, isStandard: true },
    { fieldKey: "department", label: institutionType === "school" ? "Last Class Attended" : "Department/Branch", type: "text", options: [], visibility: "required", showInRegistration: "required", showInProfile: true, isStandard: true },
    { fieldKey: "section", label: "Section/Stream", type: "text", options: [], visibility: "optional", showInRegistration: "optional", showInProfile: true, isStandard: true },
    { fieldKey: "currentEducation", label: "Current Education", type: "text", options: [], visibility: "optional", showInRegistration: "optional", showInProfile: true, isStandard: true },
    { fieldKey: "currentInstitution", label: "Current Institution", type: "text", options: [], visibility: "optional", showInRegistration: "optional", showInProfile: true, isStandard: true },
    { fieldKey: "occupation", label: "Occupation", type: "text", options: [], visibility: "optional", showInRegistration: "optional", showInProfile: true, isStandard: true },
    { fieldKey: "company", label: "Company/Organization", type: "text", options: [], visibility: "optional", showInRegistration: "optional", showInProfile: true, isStandard: true },
    { fieldKey: "designation", label: "Designation/Job Title", type: "text", options: [], visibility: "optional", showInRegistration: "optional", showInProfile: true, isStandard: true }
  ];

  return commonFields;
}

export function buildTenantConfigSnapshot(institute) {
  if (!institute) {
    return null;
  }

  const institutionType = institute.institutionType || "college";
  const communityDefaults = getDefaultCommunityLabels(institutionType);
  const featureDefaults = getDefaultFeatureFlags(institutionType);
  const brandingDefaults = getDefaultBranding(institutionType);
  const profileFieldDefaults = getDefaultProfileFields(institutionType);

  return {
    institutionType,
    educationLevel: institute.educationLevel || (institutionType === "school" ? "k10" : "higher_ed"),
    communityLabels: {
      ...communityDefaults,
      ...(institute.communityLabels || {})
    },
    featureFlags: {
      ...featureDefaults,
      ...(institute.featureFlags || {})
    },
    branding: {
      ...brandingDefaults,
      ...(institute.branding || {})
    },
    profileFields: institute.profileFields && institute.profileFields.length > 0 
      ? institute.profileFields 
      : profileFieldDefaults,
    departments: Array.isArray(institute.departments) ? institute.departments : [],
    departmentStreams: institute.departmentStreams && typeof institute.departmentStreams === "object" ? institute.departmentStreams : {},
    streams: Array.isArray(institute.streams) ? institute.streams : []
  };
}

