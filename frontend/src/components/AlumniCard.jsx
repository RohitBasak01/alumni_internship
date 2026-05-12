export function AlumniCard({
  alumni,
  isAdmin,
  isSchool,
  directoryConfig,
  onCopyLink,
  onResend,
  onRevoke,
  onRequestChat,
  isPendingAction,
}) {
  const displayName = alumni.name || alumni.userId?.name || "Community member";
  const isActive =
    typeof alumni.userId?.isActive === "boolean"
      ? alumni.userId.isActive
      : Boolean(alumni.isActive);
  const statusLabel = isActive
    ? "Active"
    : alumni.invitationStatus || "Pending";
  const statusClass = isActive
    ? "accepted"
    : alumni.invitationStatus || "pending";

  return (
    <article className="member-directory-card admin-card">
      <div
        className="member-directory-card-head"
        style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "nowrap" }}
      >
        <div className="member-person-avatar-wrap">
          <div className="member-person-avatar">{displayName.slice(0, 2)}</div>
          {isActive && <div className="avatar-online-dot" />}
        </div>

        <div className="member-directory-card-head-copy" style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <strong className="member-name">{displayName}</strong>
            <span className="role-badge">{directoryConfig?.roleFallback || "Student"}</span>
          </div>

          <p className="member-degree">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.45rem' }}>school</span>
            {isSchool
              ? `Batch of ${alumni.leavingYear || "-"} • ${alumni.currentEducation || alumni.occupation || "-"}`
              : `Batch of ${alumni.batch || "-"} • ${alumni.designation || alumni.department || "-"}`}
          </p>
        </div>
      </div>

      <div className="member-directory-card-meta">
        <span className="location-pill">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '0.4rem' }}>place</span>
          {alumni.location || "Location not added"}
        </span>
      </div>

      <div className="member-directory-card-actions profile-actions">
        <div className="action-left">
          <button className="button outline view-profile" type="button"> 
            <span className="material-symbols-outlined" aria-hidden>person</span>
            View Profile
          </button>
        </div>

        <div className="action-right">
          <button className="button primary connect" type="button">
            <span className="material-symbols-outlined" aria-hidden>person_add</span>
            Connect
          </button>
        </div>
      </div>
    </article>
  );
}
