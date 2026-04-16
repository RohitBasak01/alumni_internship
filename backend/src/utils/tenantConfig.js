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
      enableCareerFields: false
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
    enableCareerFields: true
  };
}

export function buildTenantConfigSnapshot(institute) {
  if (!institute) {
    return null;
  }

  const institutionType = institute.institutionType || "college";
  const communityDefaults = getDefaultCommunityLabels(institutionType);
  const featureDefaults = getDefaultFeatureFlags(institutionType);

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
    }
  };
}
