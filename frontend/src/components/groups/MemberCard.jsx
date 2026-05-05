import React from 'react';

export function MemberCard({ member, isCreator }) {
  const initials = member.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="member-card">
      {isCreator && (
        <div className="creator-badge" title="Group Creator">
          <span className="material-symbols-outlined">stars</span>
          Admin
        </div>
      )}
      <div className="member-card-avatar-container">
        <div className="member-card-avatar">
          {member.avatar ? (
            <img alt={member.name} src={member.avatar} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="member-status-dot online" title="Online"></div>
      </div>

      <h3>{member.name}</h3>
      <p>{member.designation || "Member"}</p>

      <div className="member-batch-badge">
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>school</span>
        Batch of {member.graduationYear || member.batch || '2018'}
      </div>

      <div className="member-card-actions">
        <button className="member-btn secondary">
          <span className="material-symbols-outlined">person</span>
        </button>
        <button className="member-btn primary">
          <span className="material-symbols-outlined">chat</span>
          Message
        </button>
      </div>
    </div>
  );
}
