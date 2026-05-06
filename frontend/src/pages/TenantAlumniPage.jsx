import { useMemo, useState } from "react";
import { useAlumniLogic } from "../hooks/useAlumniLogic.js";
import { AlumniMap } from "../components/AlumniMap.jsx";
import { BrowseByEntity } from "../components/BrowseByEntity.jsx";
import SectionCard from "../components/SectionCard.jsx";
import "../styles/AlumniDirectory.css";

/* ── Helpers ──────────────────────────────────────────────── */
function getDirectoryConfig(tenant) {
  const isSchool = tenant.institutionType === "school";
  return {
    isSchool,
    memberPlural: tenant.communityLabels.memberPlural || "Alumni",
    memberSingular: tenant.communityLabels.memberSingular || "Member",
    yearFieldLabel: isSchool ? "Leaving Year" : "Batch Year",
    educationFieldLabel: isSchool ? "Last Class Attended" : "Department",
    filterPlaceholder: isSchool
      ? "Search by name, email, institution, or location"
      : "Search by name, company, skill or keyword...",
    roleFallback: isSchool ? "Community Member" : "Alumni Member",
    inviteTitle: isSchool ? "Invite Former Student" : "Invite Alumni",
    inviteButtonLabel: isSchool ? "Add Former Student" : "Add Alumni",
    approvalDescription: isSchool
      ? "Review former-student registrations."
      : "Review alumni registrations.",
  };
}

const AVATAR_COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#8b5cf6","#ef4444","#ec4899"];
function avatarColor(name = "") {
  return AVATAR_COLORS[(name.charCodeAt(0) || 65) % AVATAR_COLORS.length];
}
function initials(name = "") {
  return name.split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "?";
}

const SKILLS_MOCK = {
  "React": ["#dbeafe","#1d4ed8"],
  "Node.js": ["#dcfce7","#15803d"],
  "System Design": ["#fef3c7","#d97706"],
  "Python": ["#f3e8ff","#7c3aed"],
  "ML": ["#ffe4e6","#be123c"],
  "Data Analysis": ["#e0f2fe","#0369a1"],
  "Product": ["#fce7f3","#be185d"],
  "Analytics": ["#dcfce7","#15803d"],
  "Leadership": ["#fef9c3","#854d0e"],
  "AWS": ["#ffe4e6","#be123c"],
  "DevOps": ["#e0f2fe","#0369a1"],
  "Microservices": ["#f3e8ff","#6d28d9"],
  "Entrepreneurship": ["#fef3c7","#b45309"],
  "Strategy": ["#dcfce7","#047857"],
  "Fundraising": ["#e0f2fe","#0369a1"],
  "UI/UX": ["#fce7f3","#be185d"],
  "Figma": ["#f3e8ff","#7c3aed"],
  "Design Thinking": ["#ffe4e6","#be123c"],
};

const INDUSTRY_FILTERS = [
  { label: "All Industries", count: null },
  { label: "Technology",     count: 4512 },
  { label: "Finance",        count: 2103 },
  { label: "Consulting",     count: 1892 },
  { label: "Healthcare",     count: 1256 },
];

const AVAIL_OPTIONS = [
  { key: "mentorship", label: "Available for Mentorship", count: 1248, color: "#6366f1" },
  { key: "open",       label: "Open to Opportunities",   count: 2134, color: "#10b981" },
  { key: "looking",    label: "Actively Looking",         count: 856,  color: "#f59e0b" },
];

const INSIGHTS = [
  { icon: "groups",   label: "Total Alumni",        value: "12,843",    color: "#6366f1" },
  { icon: "public",   label: "Countries Represented", value: "56",      color: "#10b981" },
  { icon: "trending_up", label: "Top Industry",     value: "Technology", color: "#8b5cf6" },
  { icon: "bolt",     label: "Active This Month",   value: "2,341",      color: "#f59e0b" },
];

const SORT_OPTIONS = ["Relevance","Name A–Z","Batch Year","Location"];

/* ── Skill chip ───────────────────────────────────────────── */
function SkillChip({ skill }) {
  const [bg, color] = SKILLS_MOCK[skill] || ["#f1f5f9","#475569"];
  return <span className="ad-skill-chip" style={{ background: bg, color }}>{skill}</span>;
}

/* ── Alumni card ──────────────────────────────────────────── */
function AlumniDirCard({ alumni, onConnect, onViewProfile, isSelf }) {
  const name = alumni.name || alumni.userId?.name || "Alumni";
  const role = alumni.designation || alumni.occupation || "Alumni Member";
  const company = alumni.company || "";
  const batch = alumni.batch || alumni.leavingYear || "";
  const dept = alumni.department || alumni.lastClassAttended || alumni.currentEducation || "";
  const location = alumni.location || alumni.city || "";
  const skills = Array.isArray(alumni.skills)
    ? alumni.skills.slice(0, 3)
    : [];
  const extraSkills = Array.isArray(alumni.skills) ? Math.max(0, alumni.skills.length - 3) : 0;
  const avatar = alumni.profilePicture || alumni.userId?.profilePicture;

  const cardColors = [
    ["#eff0ff","#c7d2fe"],
    ["#f0fdf4","#bbf7d0"],
    ["#fff7ed","#fed7aa"],
    ["#fdf4ff","#e9d5ff"],
    ["#eff6ff","#bfdbfe"],
  ];
  const [topBg, topBorder] = cardColors[(name.charCodeAt(0) || 0) % cardColors.length];

  return (
    <div className="ad-card">
      <div className="ad-card-top" style={{ background: topBg, borderBottom: `1px solid ${topBorder}` }}>
        <div className="ad-card-top-actions">
          <span className="ad-status-dot" />
          <button className="ad-menu-btn" aria-label="More">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_horiz</span>
          </button>
        </div>
        <div className="ad-avatar-wrap">
          {avatar
            ? <img src={avatar} alt={name} className="ad-avatar-img" />
            : <div className="ad-avatar-initials" style={{ background: avatarColor(name) }}>{initials(name)}</div>
          }
        </div>
      </div>
      <div className="ad-card-body">
        <div className="ad-name-row">
          <span className="ad-name">{name}</span>
          {isSelf && <span className="ad-you-badge">You</span>}
        </div>
        <div className="ad-role">{[role, company].filter(Boolean).join(" at ")}</div>
        <div className="ad-meta">
          {batch && <span>Batch of {batch}</span>}
          {dept && <span> · {dept}</span>}
        </div>
        {location && (
          <div className="ad-location">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
            {location}
          </div>
        )}
        {skills.length > 0 && (
          <div className="ad-skills">
            {skills.map(s => <SkillChip key={s} skill={s} />)}
            {extraSkills > 0 && <span className="ad-skill-extra">+{extraSkills}</span>}
          </div>
        )}
        <div className="ad-actions">
          <button className="ad-btn-secondary" onClick={() => onViewProfile?.(alumni)}>View Profile</button>
          <button className="ad-btn-primary" onClick={() => onConnect?.(alumni)}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>person_add</span>
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Connect dialog ───────────────────────────────────────── */
function ConnectDialog({ person, chatMessage, setChatMessage, onSend, onClose, isPending, isError, error }) {
  const name = person?.name || person?.userId?.name || "Alumni";
  return (
    <div className="ad-modal-backdrop" onClick={onClose}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>
        <div className="ad-modal-header">
          <div>
            <p className="ad-modal-kicker">Request chat</p>
            <h3 className="ad-modal-title">Message {name}</h3>
          </div>
          <button className="ad-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="ad-modal-body">
          <p className="ad-modal-hint">Write a short note so your request feels personal.</p>
          <textarea
            className="ad-modal-textarea"
            rows={5}
            value={chatMessage}
            onChange={e => setChatMessage(e.target.value)}
            placeholder="Write a message of at least 10 characters"
          />
        </div>
        <div className="ad-modal-footer">
          <button
            className="ad-btn-primary"
            disabled={isPending || chatMessage.trim().length < 10}
            onClick={onSend}
          >
            {isPending ? "Sending..." : "Request Chat"}
          </button>
          <button className="ad-btn-secondary" onClick={onClose}>Cancel</button>
        </div>
        {isError && <p className="ad-modal-error">{error?.message}</p>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════════ */
export default function TenantAlumniPage() {
  const {
    tenant, auth, isAdmin,
    filters, setFilters,
    activeAdminTab, setActiveAdminTab,
    isInvitePanelOpen, setIsInvitePanelOpen,
    queries, mutations, derived,
  } = useAlumniLogic();

  const [selectedForChat, setSelectedForChat]   = useState(null);
  const [chatMessage, setChatMessage]           = useState("Hi, I'd like to connect and start a conversation with you.");
  const [sortBy, setSortBy]                     = useState("Relevance");
  const [industryFilter, setIndustryFilter]     = useState("All Industries");
  const [availFilter, setAvailFilter]           = useState([]);
  const [skillSearch, setSkillSearch]           = useState("");
  const [page, setPage]                         = useState(1);
  const [showMap, setShowMap]                   = useState(false);
  const PAGE_SIZE = 6;

  const directoryConfig = useMemo(() => getDirectoryConfig(tenant), [tenant]);
  const isSchool = directoryConfig.isSchool;
  const selfUserId = String(auth.user?._id || auth.user?.id || "");

  const resetFilters = () => setFilters({
    q: "", batch: "", department: "", leavingYear: "", lastClassAttended: "",
    section: "", company: "", skill: "", rollNo: "", industry: "",
    alphaIndex: "", isFaculty: false, registeredOnly: false, activeTab: "name",
  });

  /* ── Derived data ─────────────────────────────────────── */
  const allMembers = derived.activeMembers;
  const totalFound = allMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalFound / PAGE_SIZE));
  const pageMembers = allMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Admin view (unchanged) ───────────────────────────── */
  if (isAdmin) {
    return (
      <div className="ad-root">
        <div className="ad-page-header">
          <div>
            <h1 className="ad-page-title">Manage {directoryConfig.memberPlural}</h1>
            <p className="ad-page-sub">{directoryConfig.approvalDescription}</p>
          </div>
          <button className="ad-btn-primary" onClick={() => setIsInvitePanelOpen(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
            {directoryConfig.inviteButtonLabel}
          </button>
        </div>
        <div className="ad-search-bar-wrap">
          <span className="material-symbols-outlined ad-search-icon">search</span>
          <input
            className="ad-search-input"
            placeholder={directoryConfig.filterPlaceholder}
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value, activeTab: "name" }))}
          />
        </div>
        <div className="ad-member-grid">
          {queries.alumni.isLoading && <p style={{ color: "#94a3b8" }}>Loading...</p>}
          {derived.directoryEntries.map(alumni => (
            <AlumniDirCard
              key={alumni._id}
              alumni={alumni}
              isSelf={String(alumni.userId?._id || alumni.userId) === selfUserId}
              onConnect={item => { setSelectedForChat(item); }}
            />
          ))}
        </div>
        {selectedForChat && (
          <ConnectDialog
            person={selectedForChat}
            chatMessage={chatMessage}
            setChatMessage={setChatMessage}
            onSend={() => mutations.mentorship.mutate({
              recipientUserId: selectedForChat.userId?._id || selectedForChat.userId,
              message: chatMessage,
            })}
            onClose={() => setSelectedForChat(null)}
            isPending={mutations.mentorship.isPending}
            isError={mutations.mentorship.isError}
            error={mutations.mentorship.error}
          />
        )}
      </div>
    );
  }

  /* ── Alumni (member) view ─────────────────────────────── */
  return (
    <div className="ad-root">
      {/* ── Page header ─────────────────────────────────── */}
      <div className="ad-page-header">
        <div>
          <h1 className="ad-page-title">Alumni Directory</h1>
          <p className="ad-page-sub">Connect with {totalFound > 100 ? `${totalFound.toLocaleString()}+` : totalFound} alumni from around the world.</p>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────── */}
      <div className="ad-search-bar-wrap">
        <span className="material-symbols-outlined ad-search-icon">search</span>
        <input
          className="ad-search-input"
          placeholder={directoryConfig.filterPlaceholder}
          value={filters.q}
          onChange={e => { setFilters(f => ({ ...f, q: e.target.value, activeTab: "name" })); setPage(1); }}
        />
        <button className="ad-search-btn" aria-label="Search">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
        </button>
      </div>

      {/* ── Dropdown filter row ──────────────────────────── */}
      <div className="ad-filter-row">
        <select className="ad-filter-select" value={filters.batch || ""} onChange={e => { setFilters(f => ({ ...f, batch: e.target.value })); setPage(1); }}>
          <option value="">Batch / Year</option>
          {[2024,2023,2022,2021,2020,2019,2018,2017,2016,2015].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button
          className={`ad-filter-select ad-location-toggle ${showMap ? "ad-location-toggle--active" : ""}`}
          onClick={() => { setShowMap(s => !s); setFilters(f => ({ ...f, activeTab: showMap ? "name" : "location" })); }}
          type="button"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15, marginRight: 4, verticalAlign: "middle" }}>location_on</span>
          Location
          <span className="material-symbols-outlined" style={{ fontSize: 14, marginLeft: 4, verticalAlign: "middle" }}>{showMap ? "expand_less" : "expand_more"}</span>
        </button>
        <select className="ad-filter-select" value={filters.industry || ""} onChange={e => { setFilters(f => ({ ...f, industry: e.target.value })); setIndustryFilter(e.target.value || "All Industries"); setPage(1); }}>
          <option value="">Industry</option>
          {["Technology","Finance","Consulting","Healthcare","Education","Media"].map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select className="ad-filter-select" value={filters.company || ""} onChange={e => { setFilters(f => ({ ...f, company: e.target.value })); setPage(1); }}>
          <option value="">Company</option>
          {["Google","Microsoft","Amazon","Flipkart","Infosys","TCS","Wipro"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="ad-more-filters-btn" onClick={() => setFilters(f => ({ ...f, activeTab: "name" }))}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_list</span>
          More Filters
        </button>
        {(filters.q || filters.batch || filters.company || filters.industry) && (
          <button className="ad-reset-btn" onClick={() => { resetFilters(); setPage(1); setIndustryFilter("All Industries"); setShowMap(false); }}>
            Reset
          </button>
        )}
      </div>

      {/* ── Location Map panel ────────────────────────────── */}
      {showMap && (
        <div className="ad-map-panel">
          <div className="ad-map-panel-header">
            <div>
              <h3 className="ad-map-panel-title">Alumni Locations</h3>
              <p className="ad-map-panel-sub">Explore where alumni are located across the world</p>
            </div>
            <button className="ad-map-close-btn" onClick={() => { setShowMap(false); setFilters(f => ({ ...f, activeTab: "name" })); }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              Close Map
            </button>
          </div>
          <AlumniMap members={derived.activeMembers} />
        </div>
      )}
      <div className="ad-layout">

        {/* Main column */}
        <div className="ad-main-col">
          {/* Results header */}
          <div className="ad-results-header">
            <span className="ad-results-count">
              <span className="ad-results-num">{totalFound.toLocaleString()}</span> alumni found
            </span>
            <div className="ad-results-controls">
              <div className="ad-sort-wrap">
                <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>Sort by:</span>
                <select className="ad-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="ad-view-toggle">
                <button className="ad-view-btn ad-view-btn--active" aria-label="Grid">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>grid_view</span>
                </button>
                <button className="ad-view-btn" aria-label="List">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>view_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading / error */}
          {queries.alumni.isLoading && <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Loading members...</p>}
          {queries.alumni.isError   && <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>{queries.alumni.error.message}</p>}

          {/* Special tab views */}
          {filters.activeTab === "location" && (
            <div style={{ margin: "1rem 0" }}>
              <AlumniMap members={derived.activeMembers} />
            </div>
          )}
          {filters.activeTab === "institute" && (
            <div style={{ margin: "1rem 0" }}>
              <BrowseByEntity title="Browse by Institute" items={derived.activeMembers.map(m => m.currentInstitution)}
                onSelect={val => { setFilters(f => ({ ...f, activeTab: "name", q: val })); setPage(1); }} placeholder="Search institutes..." />
            </div>
          )}
          {filters.activeTab === "company" && (
            <div style={{ margin: "1rem 0" }}>
              <BrowseByEntity title="Browse by Company" items={derived.activeMembers.map(m => m.company)}
                onSelect={val => { setFilters(f => ({ ...f, activeTab: "name", q: val })); setPage(1); }} placeholder="Search companies..." />
            </div>
          )}
          {filters.activeTab === "industry" && (
            <div style={{ margin: "1rem 0" }}>
              <BrowseByEntity title="Browse by Industry" items={derived.activeMembers.map(m => m.industry)}
                onSelect={val => { setFilters(f => ({ ...f, activeTab: "name", q: val })); setPage(1); }} placeholder="Search industries..." />
            </div>
          )}
          {filters.activeTab === "roles" && (
            <div style={{ margin: "1rem 0" }}>
              <BrowseByEntity title="Browse by Roles" items={derived.activeMembers.map(m => m.designation)}
                onSelect={val => { setFilters(f => ({ ...f, activeTab: "name", q: val })); setPage(1); }} placeholder="Search roles..." />
            </div>
          )}

          {/* Main grid */}
          {["name","course","location","work"].includes(filters.activeTab) && (
            <>
              {!queries.alumni.isLoading && allMembers.length === 0 && (
                <div className="ad-empty">
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#c7d2fe" }}>search_off</span>
                  <h3>No members found</h3>
                  <p>Try adjusting your filters or search term.</p>
                  <button className="ad-btn-secondary" onClick={() => { resetFilters(); setPage(1); }}>Clear Filters</button>
                </div>
              )}
              <div className="ad-member-grid">
                {pageMembers.map(alumni => (
                  <AlumniDirCard
                    key={alumni._id}
                    alumni={alumni}
                    isSelf={String(alumni.userId?._id || alumni.userId) === selfUserId}
                    onConnect={item => { setSelectedForChat(item); setChatMessage("Hi, I'd like to connect and start a conversation with you."); }}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="ad-pagination">
                  <button className="ad-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      className={`ad-page-btn ${page === n ? "ad-page-btn--active" : ""}`}
                      onClick={() => setPage(n)}
                    >{n}</button>
                  ))}
                  <button className="ad-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>chevron_right</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right sidebar ─────────────────────────────── */}
        <aside className="ad-sidebar">
          {/* Quick Filters */}
          <div className="ad-sidebar-card">
            <div className="ad-sidebar-header">
              <span className="ad-sidebar-title">Quick Filters</span>
              <button className="ad-sidebar-reset" onClick={() => { resetFilters(); setPage(1); setIndustryFilter("All Industries"); setAvailFilter([]); }}>Reset</button>
            </div>

            <div className="ad-filter-section">
              <div className="ad-filter-label">Search by Skills</div>
              <div className="ad-skill-search-wrap">
                <input
                  className="ad-skill-search"
                  placeholder="e.g. Python, Marketing, Finance"
                  value={skillSearch}
                  onChange={e => { setSkillSearch(e.target.value); setFilters(f => ({ ...f, skill: e.target.value })); setPage(1); }}
                />
              </div>
            </div>

            <div className="ad-filter-section">
              <div className="ad-filter-label">Availability</div>
              {AVAIL_OPTIONS.map(opt => (
                <label key={opt.key} className="ad-checkbox-row">
                  <input
                    type="checkbox"
                    className="ad-checkbox"
                    checked={availFilter.includes(opt.key)}
                    onChange={() => setAvailFilter(prev =>
                      prev.includes(opt.key) ? prev.filter(k => k !== opt.key) : [...prev, opt.key]
                    )}
                  />
                  <span className="ad-avail-dot" style={{ background: opt.color }} />
                  <span className="ad-checkbox-label">{opt.label}</span>
                  <span className="ad-filter-count">{opt.count.toLocaleString()}</span>
                </label>
              ))}
            </div>

            <div className="ad-filter-section">
              <div className="ad-filter-label">Industry</div>
              {INDUSTRY_FILTERS.map(ind => (
                <label key={ind.label} className="ad-radio-row">
                  <input
                    type="radio"
                    className="ad-radio"
                    name="industry-filter"
                    checked={industryFilter === ind.label}
                    onChange={() => {
                      setIndustryFilter(ind.label);
                      setFilters(f => ({ ...f, industry: ind.label === "All Industries" ? "" : ind.label }));
                      setPage(1);
                    }}
                  />
                  <span className="ad-radio-label">{ind.label}</span>
                  {ind.count && <span className="ad-filter-count">{ind.count.toLocaleString()}</span>}
                </label>
              ))}
              <button className="ad-view-more-btn">View More ∨</button>
            </div>
          </div>

          {/* Directory Insights */}
          <div className="ad-sidebar-card">
            <div className="ad-sidebar-header">
              <span className="ad-sidebar-title">Directory Insights</span>
              <button className="ad-sidebar-reset">View Report</button>
            </div>
            <div className="ad-insights-list">
              {INSIGHTS.map(ins => (
                <div key={ins.label} className="ad-insight-row">
                  <div className="ad-insight-icon" style={{ background: ins.color + "18", color: ins.color }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{ins.icon}</span>
                  </div>
                  <div className="ad-insight-info">
                    <div className="ad-insight-label">{ins.label}</div>
                    <div className="ad-insight-value">{ins.value}</div>
                  </div>
                  <svg width="50" height="24" viewBox="0 0 50 24" fill="none" style={{ flex: "0 0 50px" }}>
                    <path d="M0,18 C8,12 16,20 25,10 C34,0 42,16 50,8" stroke={ins.color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Connect modal ──────────────────────────────────── */}
      {selectedForChat && (
        <ConnectDialog
          person={selectedForChat}
          chatMessage={chatMessage}
          setChatMessage={setChatMessage}
          onSend={() => mutations.mentorship.mutate({
            recipientUserId: selectedForChat.userId?._id || selectedForChat.userId,
            message: chatMessage,
          })}
          onClose={() => setSelectedForChat(null)}
          isPending={mutations.mentorship.isPending}
          isError={mutations.mentorship.isError}
          error={mutations.mentorship.error}
        />
      )}
    </div>
  );
}
