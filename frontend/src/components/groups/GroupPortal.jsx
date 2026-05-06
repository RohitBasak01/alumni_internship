import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GroupEvents } from './GroupEvents.jsx';
import { GroupNewsroom } from './GroupNewsroom.jsx';
import './GroupPortal.css';

/* ── Static sample data (shown when real data is sparse) ── */
const SAMPLE_MEMBERS = [
  { id: "m1", name: "Aarav Shah",  role: "admin",     designation: "Software Engineer", batch: "2018", location: "Mumbai",        isYou: true  },
  { id: "m2", name: "Riya Desai",  role: "moderator", designation: "Product Manager",   batch: "2017", location: "Bengaluru",      isYou: false },
  { id: "m3", name: "Dev Mehta",   role: "moderator", designation: "Engineering Lead",   batch: "2016", location: "Pune",           isYou: false },
  { id: "m4", name: "Sneha Iyer",  role: "member",    designation: "Data Scientist",     batch: "2018", location: "New York",       isYou: false },
  { id: "m5", name: "Kunal Joshi", role: "member",    designation: "Founder & CEO",      batch: "2016", location: "San Francisco",  isYou: false },
  { id: "m6", name: "Megha Nair",  role: "member",    designation: "UX Designer",        batch: "2019", location: "Mumbai",         isYou: false },
];

const SAMPLE_EVENTS = [
  { month: "MAY", day: "28", title: "AI & The Future Workshop", detail: "May 28, 2026 · 4:00 PM\nOnline (Zoom)", color: "#6366f1" },
  { month: "JUN", day: "10", title: "Startup Pitch Night",      detail: "Jun 10, 2026 · 6:30 PM\nSPIT Campus, Mumbai", color: "#10b981" },
  { month: "JUN", day: "24", title: "Tech Innovators Meetup",   detail: "Jun 24, 2026 · 5:00 PM\nWeWork, BKC Mumbai",  color: "#f59e0b" },
];

const SAMPLE_RESOURCES = [
  { name: "AI_Resources_2026.pdf",      size: "2.4 MB", type: "PDF",  icon: "picture_as_pdf",  color: "#ef4444" },
  { name: "Roadmap_to_ML.pdf",          size: "4.1 MB", type: "PDF",  icon: "picture_as_pdf",  color: "#3b82f6" },
  { name: "Startup_Toolkit_2026.xlsx",  size: "1.8 MB", type: "XLSX", icon: "table_chart",     color: "#10b981" },
];

const TABS = [
  { id: "overview",    label: "Overview" },
  { id: "members",    label: "Members" },
  { id: "discussions", label: "Discussions" },
  { id: "events",     label: "Events" },
  { id: "resources",  label: "Resources" },
  { id: "media",      label: "Media" },
  { id: "settings",   label: "Settings" },
];

const MEMBER_COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#8b5cf6","#ef4444"];

function getMemberColor(name = "") {
  const code = name.charCodeAt(0) || 65;
  return MEMBER_COLORS[code % MEMBER_COLORS.length];
}

function getInitials(name = "") {
  return name.split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "?";
}

/* ── Role badge ─────────────────────────────────────────── */
function RoleBadge({ role }) {
  const cfg = {
    admin:     { label: "Admin",     bg: "#eff0ff", color: "#6366f1" },
    moderator: { label: "Moderator", bg: "#fef3c7", color: "#d97706" },
    member:    { label: "Member",    bg: "#f0fdf4", color: "#16a34a" },
  }[role] || { label: "Member", bg: "#f0fdf4", color: "#16a34a" };

  return (
    <span className="gp-role-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

/* ── Member row ─────────────────────────────────────────── */
function MemberRow({ member, currentUserId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const memberId = String(member.id || member._id || "");
  const isYou = member.isYou || memberId === String(currentUserId || "");
  const name = member.name || "Alumni";
  const designation = member.designation || member.occupation || "";
  const batch = member.batch || member.leavingYear ? `Batch of ${member.batch || member.leavingYear}` : "";
  const location = member.location || member.city || "";
  const role = member.role || (memberId === currentUserId ? "member" : "member");
  const sub = [designation, batch, location].filter(Boolean).join(" · ");

  return (
    <div className="gp-member-row">
      <div className="gp-member-avatar" style={{ background: getMemberColor(name) }}>
        {getInitials(name)}
      </div>
      <div className="gp-member-info">
        <div className="gp-member-name-row">
          <span className="gp-member-name">{name}</span>
          {isYou && <span className="gp-you-badge">You</span>}
        </div>
        <div className="gp-member-sub">{sub}</div>
      </div>
      <RoleBadge role={role} />
      <div className="gp-member-menu-wrap">
        <button
          className="gp-member-menu-btn"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="More options"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_horiz</span>
        </button>
        {menuOpen && (
          <div className="gp-member-dropdown">
            <button onClick={() => setMenuOpen(false)}>View Profile</button>
            <button onClick={() => setMenuOpen(false)}>Send Message</button>
            <button onClick={() => setMenuOpen(false)} style={{ color: "#ef4444" }}>Remove</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main GroupPortal ────────────────────────────────────── */
export function GroupPortal({ group, isAdmin, currentUserId, onEdit, onInvite, onBack }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [memberSearch, setMemberSearch] = useState("");

  if (!group) return null;

  const members = group.members || [];
  const memberCount = group.memberCount || members.length;
  const displayMembers = members.length > 0 ? members : SAMPLE_MEMBERS;

  const filteredMembers = memberSearch.trim()
    ? displayMembers.filter(m =>
        (m.name || "").toLowerCase().includes(memberSearch.toLowerCase())
      )
    : displayMembers;

  const createdDate = group.createdAt
    ? new Date(group.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Jan 15, 2024";

  const groupInitials = getInitials(group.name || "");
  const displayCount = Math.max(memberCount, displayMembers.length);

  return (
    <div className="gp-root">
      {/* ── Back link ───────────────────────────────────────── */}
      <div className="gp-back-row">
        <button className="gp-back-btn" onClick={onBack} type="button">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back to Groups
        </button>
      </div>

      {/* ── 2-column layout ─────────────────────────────────── */}
      <div className="gp-layout">
        {/* ── Left: hero + tabs + content ─────────────────── */}
        <div className="gp-main-col">
          {/* Hero banner */}
          <div className="gp-hero">
            <div className="gp-hero-bg" />
            <div className="gp-hero-content">
              <div className="gp-hero-avatar">{groupInitials}</div>
              <div className="gp-hero-info">
                <div className="gp-hero-title-row">
                  <h1 className="gp-hero-title">{group.name}</h1>
                  <span className="gp-active-badge">● Active</span>
                </div>
                <p className="gp-hero-desc">{group.description || "A community of alumni passionate about learning, collaboration, and building impactful solutions."}</p>
                <div className="gp-hero-meta">
                  <span>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>public</span>
                    Public Group
                  </span>
                  <span>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>group</span>
                    {displayCount} Members
                  </span>
                  <span>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>calendar_today</span>
                    Created on {createdDate}
                  </span>
                </div>
              </div>
            </div>
            <div className="gp-hero-rocket" aria-hidden="true">
              <span className="material-symbols-outlined" style={{ fontSize: 72, color: "rgba(255,255,255,0.25)" }}>rocket_launch</span>
            </div>
          </div>

          {/* Tab nav */}
          <nav className="gp-tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`gp-tab ${activeTab === tab.id ? "gp-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
                {tab.id === "members" && (
                  <span className="gp-tab-badge">{displayCount}</span>
                )}
              </button>
            ))}
          </nav>

          {/* ── Tab content ───────────────────────────────── */}

          {/* Overview = Members section (default visible) */}
          {(activeTab === "overview" || activeTab === "members") && (
            <div className="gp-members-section">
              <div className="gp-members-header">
                <h2 className="gp-members-title">Members ({displayCount})</h2>
                <div className="gp-members-controls">
                  <div className="gp-member-search">
                    <span className="material-symbols-outlined" style={{ fontSize: 17, color: "#94a3b8" }}>search</span>
                    <input
                      className="gp-member-search-input"
                      placeholder="Search members..."
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                    />
                  </div>
                  <button className="gp-invite-btn" onClick={onInvite} type="button">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
                    Invite Members
                  </button>
                </div>
              </div>

              <div className="gp-member-list">
                {filteredMembers.map((member, i) => (
                  <MemberRow
                    key={member.id || member._id || i}
                    member={member}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>

              <button className="gp-view-all-members">
                View All Members →
              </button>
            </div>
          )}

          {activeTab === "discussions" && (
            <GroupNewsroom groupId={group.id || group._id} canManage={isAdmin} />
          )}

          {activeTab === "events" && (
            <GroupEvents groupId={group.id || group._id} canManage={isAdmin} />
          )}

          {(activeTab === "resources" || activeTab === "media" || activeTab === "settings") && (
            <div className="gp-coming-soon">
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#c7d2fe" }}>construction</span>
              <h3>{TABS.find(t => t.id === activeTab)?.label}</h3>
              <p>This section is coming soon.</p>
            </div>
          )}
        </div>

        {/* ── Right sidebar ────────────────────────────────── */}
        <aside className="gp-sidebar">
          {/* About This Group */}
          <div className="gp-sidebar-card">
            <h3 className="gp-sidebar-heading">About This Group</h3>
            <p className="gp-about-desc">
              {group.description || "We discuss emerging technologies, share resources, collaborate on projects, and help each other grow."}
            </p>
            <div className="gp-about-list">
              <div className="gp-about-row">
                <span className="material-symbols-outlined gp-about-icon">category</span>
                <span className="gp-about-key">Category</span>
                <span className="gp-about-val">Technology</span>
              </div>
              <div className="gp-about-row">
                <span className="material-symbols-outlined gp-about-icon">public</span>
                <span className="gp-about-key">Group Type</span>
                <span className="gp-about-val">Public</span>
              </div>
              <div className="gp-about-row">
                <span className="material-symbols-outlined gp-about-icon">person</span>
                <span className="gp-about-key">Created By</span>
                <div className="gp-about-creator">
                  <div className="gp-creator-avatar">A</div>
                  <span className="gp-about-val">Aarav Shah</span>
                </div>
              </div>
              <div className="gp-about-row gp-about-row--tags">
                <span className="material-symbols-outlined gp-about-icon">label</span>
                <span className="gp-about-key">Tags</span>
              </div>
              <div className="gp-tag-list">
                {["#technology","#innovation","#startups","#coding"].map(t => (
                  <span key={t} className="gp-tag">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="gp-sidebar-card">
            <div className="gp-sidebar-card-header">
              <h3 className="gp-sidebar-heading">Upcoming Events</h3>
              <button className="gp-sidebar-view-all">View All</button>
            </div>
            <div className="gp-events-list">
              {SAMPLE_EVENTS.map((ev, i) => (
                <div key={i} className="gp-event-item">
                  <div className="gp-event-date" style={{ borderLeftColor: ev.color }}>
                    <div className="gp-event-month" style={{ color: ev.color }}>{ev.month}</div>
                    <div className="gp-event-day">{ev.day}</div>
                  </div>
                  <div className="gp-event-info">
                    <div className="gp-event-title">{ev.title}</div>
                    <div className="gp-event-detail" style={{ whiteSpace: "pre-line" }}>{ev.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group Resources */}
          <div className="gp-sidebar-card">
            <div className="gp-sidebar-card-header">
              <h3 className="gp-sidebar-heading">Group Resources</h3>
              <button className="gp-sidebar-view-all">View All</button>
            </div>
            <div className="gp-resources-list">
              {SAMPLE_RESOURCES.map((r, i) => (
                <div key={i} className="gp-resource-item">
                  <div className="gp-resource-icon" style={{ background: r.color + "18", color: r.color }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{r.icon}</span>
                  </div>
                  <div className="gp-resource-info">
                    <div className="gp-resource-name">{r.name}</div>
                    <div className="gp-resource-meta">{r.size} · {r.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
