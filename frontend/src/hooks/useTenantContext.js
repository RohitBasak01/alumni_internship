import { useAuth } from "../context/AuthContext.jsx";

function detectTenant() {
  const host = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const queryTenant = searchParams.get("tenant");
  
  const reservedHosts = new Set(["localhost", "127.0.0.1"]);
  const tenantSubdomainOverride = String(window.localStorage.getItem("tenantSubdomain") || "").trim().toLowerCase();
  const tenantDomainOverride = String(window.localStorage.getItem("tenantDomain") || "").trim().toLowerCase();

  // 1. Query Param Override (Dev/Testing)
  if (queryTenant) {
    return {
      host,
      isTenant: true,
      slug: queryTenant.toLowerCase(),
      displayName: queryTenant.toUpperCase(),
      isSimulated: true
    };
  }

  // 2. Local Storage Override
  if (tenantSubdomainOverride || tenantDomainOverride) {
    return {
      host,
      isTenant: true,
      slug: tenantSubdomainOverride || null,
      displayName: (tenantSubdomainOverride || tenantDomainOverride || "Portal").toUpperCase()
    };
  }

  // 3. Platform Root check
  if (reservedHosts.has(host)) {
    return {
      host,
      isTenant: false,
      slug: null,
      displayName: "Platform"
    };
  }

  // 4. Subdomain detection
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

  // 5. Custom Domain fallback
  // If not on main platform domain, assume custom domain
  const mainDomain = "alumniconnect.com"; // Change to your actual production domain
  if (host !== mainDomain && host !== "localhost") {
    return {
      host,
      isTenant: true,
      slug: null,
      displayName: "Portal"
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
    enableFriendship: true,
    enableDirectory: true,
    enableEvents: true,
    enableAnnouncements: true,
    enableGroups: true,
    enableSocialLinks: true,
    enableCareerFields: true
  };

  const getTenantAwarePath = (path) => {
    if (!detectedTenant.isSimulated || !detectedTenant.slug) {
      return path;
    }
    const url = new URL(path, window.location.origin);
    url.searchParams.set("tenant", detectedTenant.slug);
    return url.pathname + url.search;
  };

  if (!institute) {
    return {
      ...detectedTenant,
      getTenantAwarePath,
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
    getTenantAwarePath,
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
