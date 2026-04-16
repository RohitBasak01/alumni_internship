import { useAuth } from "../context/AuthContext.jsx";

function detectTenant() {
  const host = window.location.hostname.toLowerCase();
  const reservedHosts = new Set(["localhost", "127.0.0.1"]);

  if (reservedHosts.has(host)) {
    return {
      host,
      isTenant: false,
      slug: null,
      displayName: "Platform"
    };
  }

  const parts = host.split(".");

  if (parts.length >= 3) {
    const slug = parts[0];
    return {
      host,
      isTenant: true,
      slug,
      displayName: slug.toUpperCase()
    };
  }

  return {
    host,
    isTenant: false,
    slug: null,
    displayName: "Platform"
  };
}

export function useTenantContext() {
  const auth = useAuth();
  const detectedTenant = detectTenant();
  const institute = auth.user?.institute;
  const defaultFeatureFlags = {
    enableJobs: true,
    enableMentorship: true,
    enableDirectory: true,
    enableEvents: true,
    enableAnnouncements: true,
    enableGroups: true,
    enableSocialLinks: true,
    enableCareerFields: true
  };

  if (!institute) {
    return {
      ...detectedTenant,
      institutionType: "college",
      educationLevel: "higher_ed",
      communityLabels: {
        memberPlural: "Alumni",
        memberSingular: "Alumnus/Alumna",
        adminLabel: "Institute Admin"
      },
      featureFlags: defaultFeatureFlags
    };
  }

  return {
    ...detectedTenant,
    displayName: institute.name || detectedTenant.displayName,
    slug: institute.subdomain || detectedTenant.slug,
    institutionType: institute.institutionType || "college",
    educationLevel: institute.educationLevel || "higher_ed",
    communityLabels: institute.communityLabels || {
      memberPlural: "Alumni",
      memberSingular: "Alumnus/Alumna",
      adminLabel: "Institute Admin"
    },
    featureFlags: {
      ...defaultFeatureFlags,
      ...(institute.featureFlags || {})
    }
  };
}
