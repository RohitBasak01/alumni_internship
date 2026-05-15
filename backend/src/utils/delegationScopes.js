/**
 * All grantable permission scopes for role delegation.
 * When a primary admin delegates to an alumni, they choose a subset of these.
 * Primary admins (isDelegatedAdmin: false) always have all permissions implicitly.
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
};
