import { DELEGATION_SCOPES } from "../utils/delegationScopes.js";

/**
 * authorizeWithDelegation(scope)
 *
 * Middleware factory used instead of bare `authorize("institute_admin")` on routes
 * that delegated admins should be scope-gated on.
 *
 * - Primary admins (isDelegatedAdmin: false) → always pass.
 * - Delegated admins (isDelegatedAdmin: true) → pass only if scope is in
 *   their delegatedPermissions[].
 * - Non-admins → 403 immediately.
 *
 * Must be used AFTER `protect` (which populates req.user).
 */
export function authorizeWithDelegation(scope) {
  if (!DELEGATION_SCOPES.includes(scope)) {
    throw new Error(`Unknown delegation scope: "${scope}"`);
  }

  return (req, _res, next) => {
    const user = req.user;

    if (!user || user.role !== "institute_admin") {
      const error = new Error("You do not have permission to access this resource");
      error.statusCode = 403;
      return next(error);
    }

    // Primary admin — unrestricted
    if (!user.isDelegatedAdmin) {
      return next();
    }

    // Delegated admin — must have the specific scope
    if (Array.isArray(user.delegatedPermissions) && user.delegatedPermissions.includes(scope)) {
      return next();
    }

    const error = new Error(
      `Your delegated admin access does not include the "${scope}" permission`
    );
    error.statusCode = 403;
    return next(error);
  };
}

/**
 * blockDelegatedAdmins
 *
 * Middleware that allows only the primary (non-delegated) institute admin.
 * Used on delegation-management routes (grant, revoke) so delegated admins
 * cannot change delegation settings.
 *
 * Must be used AFTER `protect` and `authorize("institute_admin")`.
 */
export function blockDelegatedAdmins(req, _res, next) {
  if (req.user?.isDelegatedAdmin) {
    const error = new Error(
      "Only the primary institute admin can manage role delegations"
    );
    error.statusCode = 403;
    return next(error);
  }
  next();
}
