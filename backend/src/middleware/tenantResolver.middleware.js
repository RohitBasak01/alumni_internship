import Institute from "../models/Institute.js";

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
    const host = extractHost(req.headers.host);

    if (!host || RESERVED_HOSTS.has(host)) {
      return next();
    }

    const subdomain = extractSubdomain(host);

    const institute = await Institute.findOne({
      $or: [{ domain: host }, ...(subdomain ? [{ subdomain }] : [])],
      status: "active"
    });

    if (institute) {
      req.tenant = institute;
    }

    next();
  } catch (error) {
    next(error);
  }
}
