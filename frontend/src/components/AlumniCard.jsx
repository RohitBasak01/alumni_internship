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
      <div className="member-directory-card-head">
        <div className="member-person-avatar">{displayName.slice(0, 1)}</div>
        <div>
          <strong>{displayName}</strong>
          <p>{alumni.email}</p>
        </div>
      </div>

      <div className="member-directory-card-meta">
        <span>
          {isSchool
            ? `Leaving year ${alumni.leavingYear || "-"}`
            : `Batch ${alumni.batch || "-"}`}
        </span>
        <span>
          {isSchool
            ? alumni.lastClassAttended || "-"
            : alumni.department || "-"}
        </span>
        <span>{alumni.location || "Location not added"}</span>
      </div>

      <p className="member-directory-card-copy">
        {isSchool
          ? (alumni.currentEducation ||
              alumni.occupation ||
              directoryConfig.roleFallback) +
            (alumni.currentInstitution
              ? ` at ${alumni.currentInstitution}`
              : "")
          : (alumni.designation || directoryConfig.roleFallback) +
            (alumni.company ? ` at ${alumni.company}` : "")}
      </p>

      <div className="member-directory-card-actions">
        <span className={`member-status-pill status-${statusClass}`}>
          {statusLabel}
        </span>
        {!isAdmin && isActive && onRequestChat ? (
          <button
            className="button primary compact"
            onClick={() => onRequestChat(alumni)}
            type="button"
          >
            Request Chat
          </button>
        ) : null}
        {!isActive && isAdmin && (
          <div className="member-inline-actions">
            <button
              className="button secondary compact"
              disabled={isPendingAction}
              onClick={() => onCopyLink(alumni._id)}
            >
              Copy link
            </button>
            <button
              className="button secondary compact"
              disabled={isPendingAction}
              onClick={() => onResend(alumni._id)}
            >
              Resend
            </button>
            <button
              className="button secondary compact"
              disabled={isPendingAction}
              onClick={() => onRevoke(alumni._id)}
            >
              Revoke
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
