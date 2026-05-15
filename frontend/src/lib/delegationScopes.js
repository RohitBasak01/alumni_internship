/**
 * All grantable permission scopes for role delegation.
 * Mirrors backend/src/utils/delegationScopes.js — keep in sync.
 */
export const DELEGATION_SCOPES = [
  "approve_registrations",
  "export_csv",
  "manage_events",
  "manage_announcements",
  "manage_jobs",
  "manage_gallery",
  "manage_groups",
  "content_moderation",
  "manage_fundraising",
];

export const DELEGATION_SCOPE_LABELS = {
  approve_registrations: "Approve / Reject Registrations",
  export_csv:            "Export Alumni CSV & Birthday Filter",
  manage_events:         "Create, Edit & Delete Events",
  manage_announcements:  "Create, Edit & Delete Announcements",
  manage_jobs:           "Create, Edit & Delete Job Postings",
  manage_gallery:        "Upload & Delete Gallery Items",
  manage_groups:         "Create, Edit & Delete Community Groups",
  content_moderation:    "Content Moderation Panel",
  manage_fundraising:    "Manage Fundraising Campaigns",
};

export const DELEGATION_SCOPE_ICONS = {
  approve_registrations: "how_to_reg",
  export_csv:            "download",
  manage_events:         "event",
  manage_announcements:  "campaign",
  manage_jobs:           "work",
  manage_gallery:        "photo_library",
  manage_groups:         "groups",
  content_moderation:    "shield",
  manage_fundraising:    "payments",
};

/**
 * Returns true if the user has a given permission.
 * - Primary admins (isDelegatedAdmin: false) always pass.
 * - Delegated admins only pass if the scope is in their delegatedPermissions[].
 * - Non-admins always fail.
 */
export function hasPermission(user, scope) {
  if (!user || user.role !== "institute_admin") return false;
  if (!user.isDelegatedAdmin) return true;
  return Array.isArray(user.delegatedPermissions) &&
    user.delegatedPermissions.includes(scope);
}
