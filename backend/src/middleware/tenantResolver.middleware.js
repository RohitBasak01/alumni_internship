import Institute from "../models/Institute.js";
import { attachTenantDatabaseContext } from "../db/tenantConnectionManager.js";

const RESERVED_HOSTS = new Set(["localhost", "127.0.0.1"]);

function extractHost(hostHeader = "") {
  return hostHeader.split(":")[0].toLowerCase();
}

function extractSubdomain(host) {
  const parts = host.split(".");
  if (parts.length < 3) {
    return null;
  }

  return parts[0];
}

export async function resolveTenant(req, _res, next) {
  try {
    const requestedSubdomain = String(req.headers["x-tenant-subdomain"] || "").trim().toLowerCase();
    const requestedDomain = String(req.headers["x-tenant-domain"] || "").trim().toLowerCase();
    const host = extractHost(req.headers.host);

    const subdomain = requestedSubdomain || (!RESERVED_HOSTS.has(host) ? extractSubdomain(host) : null);
    const domain = requestedDomain || (!RESERVED_HOSTS.has(host) ? host : null);

    const institute = await Institute.findOne({
      $or: [
        ...(domain ? [{ domain }] : []),
        ...(subdomain ? [{ subdomain }] : [])
      ],
      status: "active"
    });

    if (institute) {
      req.tenant = institute;
      await attachTenantDatabaseContext(req, institute);
    }

    next();
  } catch (error) {
    next(error);
  }
}
