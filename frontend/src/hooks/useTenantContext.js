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
  return detectTenant();
}
