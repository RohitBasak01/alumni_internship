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

export function buildTenantConfigSnapshot(institute) {
  if (!institute) {
    return null;
  }

  const institutionType = institute.institutionType || "college";
  const communityDefaults = getDefaultCommunityLabels(institutionType);
  const featureDefaults = getDefaultFeatureFlags(institutionType);
  const brandingDefaults = getDefaultBranding(institutionType);

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
    departments: Array.isArray(institute.departments) ? institute.departments : [],
    departmentStreams: institute.departmentStreams && typeof institute.departmentStreams === "object" ? institute.departmentStreams : {},
    streams: Array.isArray(institute.streams) ? institute.streams : []
  };
}
