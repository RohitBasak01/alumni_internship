import jwt from "jsonwebtoken";

import { attachTenantDatabaseContext, getTenantModels } from "../db/tenantConnectionManager.js";
import Institute from "../models/Institute.js";
import User from "../models/User.js";
import { AUTH_COOKIE_NAME, getJwtSecret } from "../utils/auth.js";

export async function protect(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token =
      req.cookies?.[AUTH_COOKIE_NAME] ||
      (authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null);

    if (!token) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    const decoded = jwt.verify(token, getJwtSecret());
    let institute = req.tenant || null;

    if (!institute && decoded.instituteId) {
      institute = await Institute.findById(decoded.instituteId);
      if (institute) {
        req.tenant = institute;
        await attachTenantDatabaseContext(req, institute);
      }
    }

    let user;

    if (decoded.role === "super_admin") {
      user = await User.findById(decoded.userId)
        .select("-passwordHash")
        .populate("instituteId", "name status subdomain domain");
    } else {
      const TenantUser = getTenantModels(req).User;
      user = await TenantUser.findById(decoded.userId).select("-passwordHash");

      if (user && institute) {
        user.instituteId = institute;
      } else if (user?.instituteId) {
        const hydratedInstitute = await Institute.findById(user.instituteId);
        if (hydratedInstitute) {
          req.tenant = hydratedInstitute;
          await attachTenantDatabaseContext(req, hydratedInstitute);
          user.instituteId = hydratedInstitute;
          institute = hydratedInstitute;
        }
      }
    }

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error("Your account is not active");
      error.statusCode = 403;
      throw error;
    }

    if (user.role !== "super_admin") {
      if (!user.instituteId) {
        const error = new Error("Your institute access is unavailable");
        error.statusCode = 403;
        throw error;
      }

      if (user.instituteId.status !== "active") {
        const error = new Error("Your institute portal is not active");
        error.statusCode = 403;
        throw error;
      }
    }

    req.user = user;
    next();
  } catch (error) {
    error.statusCode = error.statusCode || 401;
    next(error);
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error("You do not have permission to access this resource");
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
}

export async function requireTenantAccess(req, _res, next) {
  try {
    if (!req.tenant && req.user?.instituteId) {
      const instituteId = req.user.instituteId?._id || req.user.instituteId;
      const institute =
        req.user.instituteId?.status
          ? req.user.instituteId
          : await Institute.findById(instituteId);

      if (institute) {
        req.tenant = institute;
        await attachTenantDatabaseContext(req, institute);
      }
    }

    if (!req.tenant) {
      const error = new Error("Tenant context is missing");
      error.statusCode = 400;
      throw error;
    }

    if (req.user.role === "super_admin") {
      return next();
    }

    const userInstituteId = req.user.instituteId?._id?.toString?.() || req.user.instituteId?.toString?.();

    if (!userInstituteId || userInstituteId !== req.tenant._id.toString()) {
      const error = new Error("Tenant access denied");
      error.statusCode = 403;
      throw error;
    }

    next();
  } catch (error) {
    next(error);
  }
}
