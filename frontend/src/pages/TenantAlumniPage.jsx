import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAlumniLogic } from "../hooks/useAlumniLogic.js";
import { AlumniMap } from "../components/AlumniMap.jsx";
import { fetchBusinessListings } from "../lib/api.js";
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
  };
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#0ea5e9,#38bdf8)",
  "linear-gradient(135deg,#10b981,#34d399)",
  "linear-gradient(135deg,#f59e0b,#fbbf24)",
  "linear-gradient(135deg,#ec4899,#f472b6)",
];

function avatarColor(name = "") {
  return AVATAR_COLORS[(name.charCodeAt(0) || 65) % AVATAR_COLORS.length];
}

function initials(name = "") {
  return name.split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "?";
}

function companyInitials(name = "") {
  return name.split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "CO";
}

const SKILLS_MOCK = {
  "React": ["#eff0ff","#6366f1"],
  "Node.js": ["#f0fdf4","#10b981"],
  "System Design": ["#fff7ed","#f59e0b"],
  "Python": ["#fdf4ff","#8b5cf6"],
  "Accessibility": ["#eff6ff","#3b82f6"],
  "Design Systems": ["#fef2f2","#ef4444"],
  "Embedded": ["#f1f5f9","#475569"],
  "Leadership": ["#fefce8","#a16207"],
  "Friendship": ["#ecfdf5","#059669"],
};

const SORT_OPTIONS = ["Relevance","Name A–Z","Batch Year","Location"];

const COMMON_INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Engineering",
  "Manufacturing", "Consulting", "Retail", "Energy", "Media",
  "Real Estate", "Legal", "Hospitality", "Government", "Other"
];

/* ── Skill chip ───────────────────────────────────────────── */
function SkillChip({ skill }) {
  const [bg, color] = SKILLS_MOCK[skill] || ["#f8fafc","#64748b"];
  return <span className="ad-card-v2-tag" style={{ background: bg, color }}>{skill}</span>;
}

/* ── Alumni card V2 ───────────────────────────────────────── */
function AlumniDirCardV2({ alumni, onConnect, onViewProfile, isSelf }) {
  const name = alumni.name || alumni.userId?.name || "Alumni";
  const role = alumni.designation || alumni.occupation || "Alumni Member";
  const company = alumni.company || "";
  const batch = alumni.batch || alumni.leavingYear || "";
  const dept = alumni.department || alumni.lastClassAttended || "";
  const location = alumni.location || alumni.city || "";
  const skills = Array.isArray(alumni.skills) ? alumni.skills.slice(0, 3) : ["React", "Node.js", "Leadership"].slice(0, 3);
  const avatar = alumni.profilePicture || alumni.userId?.profilePicture;

  return (
    <div className="ad-card-v2">
      <div className="ad-card-v2-status">
        <span className="ad-status-dot-v2" />
        <span className="material-symbols-outlined ad-more-menu-v2" style={{ fontSize: 20 }}>more_horiz</span>
      </div>

      <div className="ad-card-v2-header">
        <div className="ad-card-v2-avatar" style={{ background: avatarColor(name) }}>
          {avatar ? <img src={avatar} alt={name} /> : initials(name)}
        </div>
        <h3 className="ad-card-v2-name">
          {name}
          {isSelf && <span className="ad-you-badge" style={{ marginLeft: 6 }}>You</span>}
        </h3>
        <p className="ad-card-v2-title">{[role, company].filter(Boolean).join(" at ")}</p>
        <p className="ad-card-v2-batch">Batch of {batch} · {dept}</p>
        {location && (
          <div className="ad-card-v2-loc">
            <span className="material-symbols-outlined">location_on</span>
            {location}
          </div>
        )}
      </div>

      <div className="ad-card-v2-tags">
        {skills.map(s => <SkillChip key={s} skill={s} />)}
      </div>

      <div className="ad-card-v2-footer">
        <button className="ad-btn-ghost" onClick={() => onViewProfile?.(alumni)}>View Profile</button>
        <button className="ad-btn-solid" onClick={() => onConnect?.(alumni)}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
          Connect
        </button>
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
            className="ad-btn-solid"
            style={{ flex: 1, height: 44 }}
            disabled={isPending || chatMessage.trim().length < 10}
            onClick={onSend}
          >
            {isPending ? "Sending..." : "Request Chat"}
          </button>
          <button className="ad-btn-ghost" style={{ height: 44 }} onClick={onClose}>Cancel</button>
        </div>
        {isError && <p className="ad-modal-error">{error?.message}</p>}
      </div>
    </div>
  );
}

function CompanyList({ listings, selectedCompany, onSelectCompany, onViewDetails, isLoading, isError, error }) {
  if (isLoading) {
    return <p className="ad-company-muted">Loading registered companies...</p>;
  }

  if (isError) {
    return <p className="ad-company-error">{error?.message || "Unable to load companies."}</p>;
  }

  if (!listings.length) {
    return <p className="ad-company-muted">No registered businesses yet.</p>;
  }

  return (
    <div className="ad-company-list">
      {listings.map(item => {
        const isActive = selectedCompany === item.businessName;
        return (
          <article key={item._id} className={`ad-company-item ${isActive ? "ad-company-item--active" : ""}`}>
            <button
              className="ad-company-main"
              onClick={() => onSelectCompany(isActive ? "" : item.businessName)}
              title={isActive ? "Clear company filter" : `Show alumni at ${item.businessName}`}
            >
              <div className="ad-company-logo">
                {item.logoUrl ? <img src={item.logoUrl} alt="" /> : companyInitials(item.businessName)}
              </div>
              <div className="ad-company-copy">
                <span className="ad-company-name">{item.businessName}</span>
                <span className="ad-company-meta">{[item.industry || "Business", item.location].filter(Boolean).join(" | ")}</span>
              </div>
            </button>
            <button className="ad-company-detail-btn" onClick={() => onViewDetails(item)}>
              Details
            </button>
          </article>
        );
      })}
    </div>
  );
}

function CompanyDetailsDialog({ company, onClose }) {
  if (!company) return null;

  const tags = [company.industry, company.product, company.service].filter(Boolean);
  const ownerName = company.owner?.name || "Alumni";

  return (
    <div className="ad-modal-backdrop" onClick={onClose}>
      <div className="ad-modal ad-company-modal" onClick={e => e.stopPropagation()}>
        <div className="ad-modal-header">
          <div className="ad-company-modal-heading">
            <div className="ad-company-logo ad-company-logo--lg">
              {company.logoUrl ? <img src={company.logoUrl} alt="" /> : companyInitials(company.businessName)}
            </div>
            <div>
              <p className="ad-modal-kicker">Registered business</p>
              <h3 className="ad-modal-title">{company.businessName}</h3>
            </div>
          </div>
          <button className="ad-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="ad-modal-body">
          {company.description && <p className="ad-company-description">{company.description}</p>}
          {tags.length > 0 && (
            <div className="ad-company-tags">
              {tags.map(tag => <span key={tag} className="ad-card-v2-tag">{tag}</span>)}
            </div>
          )}
          <div className="ad-company-details-grid">
            <div>
              <span className="ad-company-detail-label">Founder</span>
              <strong>{ownerName}</strong>
            </div>
            <div>
              <span className="ad-company-detail-label">Location</span>
              <strong>{company.location || "Not added"}</strong>
            </div>
            <div>
              <span className="ad-company-detail-label">Email</span>
              <strong>{company.contactEmail || "Not added"}</strong>
            </div>
            <div>
              <span className="ad-company-detail-label">Phone</span>
              <strong>{[company.contactCountry, company.contactNumber].filter(Boolean).join(" ") || "Not added"}</strong>
            </div>
          </div>
        </div>
        <div className="ad-modal-footer">
          {company.website && (
            <a href={company.website} target="_blank" rel="noreferrer" className="ad-btn-solid ad-company-link">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
              Website
            </a>
          )}
          <button className="ad-btn-ghost" style={{ height: 44 }} onClick={onClose}>Close</button>
        </div>
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
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState(null);
  const PAGE_SIZE = 9;

  const directoryConfig = useMemo(() => getDirectoryConfig(tenant), [tenant]);
  const selfUserId = String(auth.user?._id || auth.user?.id || "");
  const businessListingsQuery = useQuery({
    queryKey: ["business-listings"],
    queryFn: fetchBusinessListings,
  });
  const registeredCompanies = businessListingsQuery.data || [];

  const resetFilters = () => setFilters({
    q: "", batch: "", department: "", leavingYear: "", lastClassAttended: "",
    section: "", company: "", skill: "", rollNo: "", industry: "",
    alphaIndex: "", isFaculty: false, registeredOnly: false, activeTab: "name",
  });

  const allMembers = derived.activeMembers;
  const totalFound = allMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalFound / PAGE_SIZE));
  const pageMembers = allMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const { uniqueValues, filterStats } = derived;
  
  const INDUSTRY_FILTERS = [
    { label: "All Industries", count: null },
    ...Array.from(new Set([...COMMON_INDUSTRIES, ...uniqueValues.industries])).sort().map(ind => ({
      label: ind,
      count: filterStats.industry[ind] || 0
    }))
  ];

  const AVAIL_OPTIONS = [
    { key: "friendship", label: "Available for Friendship", count: filterStats.availability.friendship, color: "#6366f1" },
    { key: "open",       label: "Open to Opportunities",   count: filterStats.availability.open, color: "#10b981" },
    { key: "looking",    label: "Actively Looking",         count: filterStats.availability.looking, color: "#f59e0b" },
  ];

  const activeFiltersCount = [filters.batch, filters.industry, filters.company, filters.skill].filter(Boolean).length;

  return (
    <div className="ad-root">
      {/* ── Page header ─────────────────────────────────── */}
      <div className="ad-page-header">
        <div>
          <h1 className="ad-page-title">Alumni Directory</h1>
          <p className="ad-page-sub">Connect with {totalFound > 100 ? `${totalFound.toLocaleString()}+` : totalFound} alumni from around the world.</p>
        </div>
      </div>

      {/* ── Filter Card ─────────────────────────────────── */}
      <div className="ad-filter-card">
        <div className="ad-search-input-group">
          <span className="material-symbols-outlined ad-search-icon-main">search</span>
          <input
            className="ad-search-input-main"
            placeholder={directoryConfig.filterPlaceholder}
            value={filters.q}
            onChange={e => { setFilters(f => ({ ...f, q: e.target.value, activeTab: "name" })); setPage(1); }}
          />
          <span className="material-symbols-outlined ad-search-icon-main" style={{ opacity: 0.5 }}>search</span>
        </div>

        <div className="ad-filter-controls-row">
          <div className="ad-dropdown-filter">
            <span className="material-symbols-outlined">event</span>
            <select value={filters.batch || filters.leavingYear || ""} onChange={e => { setFilters(f => ({ ...f, batch: e.target.value, leavingYear: e.target.value })); setPage(1); }}>
              <option value="">{directoryConfig.yearFieldLabel}</option>
              {uniqueValues.years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="ad-dropdown-filter" onClick={() => setShowMap(!showMap)}>
            <span className="material-symbols-outlined">location_on</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: showMap ? "#6366f1" : "#1e293b" }}>
              {showMap ? "Hide Map" : "Location"}
            </span>
          </div>

          <div className="ad-dropdown-filter">
            <span className="material-symbols-outlined">work</span>
            <select value={filters.industry || ""} onChange={e => { setFilters(f => ({ ...f, industry: e.target.value })); setIndustryFilter(e.target.value || "All Industries"); setPage(1); }}>
              <option value="">Industry</option>
              {Array.from(new Set([...COMMON_INDUSTRIES, ...uniqueValues.industries])).sort().map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <button className="ad-more-filters-btn-v2">
            <span className="material-symbols-outlined">tune</span>
            More Filters
            {activeFiltersCount > 0 && <span className="ad-filter-badge">{activeFiltersCount}</span>}
          </button>

          {(filters.q || activeFiltersCount > 0) && (
            <button className="ad-clear-all-link" onClick={() => { resetFilters(); setPage(1); setIndustryFilter("All Industries"); setShowMap(false); }}>
              <span className="material-symbols-outlined">restart_alt</span>
              Clear all
            </button>
          )}
        </div>
      </div>

      {showMap && (
        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #e8edf3", height: 350 }}>
          <AlumniMap members={derived.activeMembers} />
        </div>
      )}

      <div className="ad-layout">
        {/* Main column */}
        <div className="ad-main-col">
          <div className="ad-results-header">
            <span className="ad-results-count">
              <span className="ad-results-num">{totalFound.toLocaleString()}</span> alumni found
            </span>
            <div className="ad-results-controls">
              <div className="ad-sort-wrap-v2">
                <span className="ad-sort-label">Sort by:</span>
                <select className="ad-sort-select-v2" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="ad-view-toggle-v2">
                <button className="ad-view-btn-v2 ad-view-btn-v2--active" aria-label="Grid">
                  <span className="material-symbols-outlined">grid_view</span>
                </button>
                <button className="ad-view-btn-v2" aria-label="List">
                  <span className="material-symbols-outlined">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grid */}
          {!queries.alumni.isLoading && allMembers.length === 0 ? (
            <div className="ad-empty">
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#c7d2fe" }}>search_off</span>
              <h3>No members found</h3>
              <p>Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="ad-member-grid">
              {pageMembers.map(alumni => (
                <AlumniDirCardV2
                  key={alumni._id}
                  alumni={alumni}
                  isSelf={String(alumni.userId?._id || alumni.userId) === selfUserId}
                  onConnect={item => setSelectedForChat(item)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="ad-pagination" style={{ marginTop: "1.5rem" }}>
              <button className="ad-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={`ad-page-btn ${page === n ? "ad-page-btn--active" : ""}`}
                  onClick={() => setPage(n)}
                >{n}</button>
              ))}
              <button className="ad-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="ad-sidebar">
          <div className="ad-sidebar-card-v2">
            <div className="ad-sidebar-header-v2">
              <span className="ad-sidebar-title-v2">Registered Companies</span>
              {filters.company && (
                <button className="ad-sidebar-reset-v2" onClick={() => { setFilters(f => ({ ...f, company: "" })); setPage(1); }}>
                  Clear
                </button>
              )}
            </div>
            <CompanyList
              listings={registeredCompanies}
              selectedCompany={filters.company}
              onSelectCompany={company => { setFilters(f => ({ ...f, company })); setPage(1); }}
              onViewDetails={setSelectedCompanyDetails}
              isLoading={businessListingsQuery.isLoading}
              isError={businessListingsQuery.isError}
              error={businessListingsQuery.error}
            />
          </div>

          <div className="ad-sidebar-card-v2">
            <div className="ad-sidebar-header-v2">
              <span className="ad-sidebar-title-v2">Quick Filters</span>
              <button className="ad-sidebar-reset-v2" onClick={() => { resetFilters(); setPage(1); setAvailFilter([]); }}>Reset</button>
            </div>

            <div className="ad-filter-section-v2">
              <div className="ad-filter-label-v2">Search by Skills</div>
              <div className="ad-skill-search-wrap">
                <input
                  className="ad-skill-search"
                  placeholder="e.g. Python, Marketing, Finance"
                  value={skillSearch}
                  onChange={e => { setSkillSearch(e.target.value); setFilters(f => ({ ...f, skill: e.target.value })); setPage(1); }}
                />
              </div>
            </div>

            <div className="ad-filter-section-v2">
              <div className="ad-filter-label-v2">Availability</div>
              {AVAIL_OPTIONS.map(opt => (
                <label key={opt.key} className="ad-checkbox-row-v2">
                  <input
                    type="checkbox"
                    hidden
                    checked={availFilter.includes(opt.key)}
                    onChange={() => setAvailFilter(prev =>
                      prev.includes(opt.key) ? prev.filter(k => k !== opt.key) : [...prev, opt.key]
                    )}
                  />
                  <div className="ad-custom-check">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#fff" }}>check</span>
                  </div>
                  <span className="ad-avail-dot-v2" style={{ background: opt.color }} />
                  <span className="ad-check-label-v2">{opt.label}</span>
                  <span className="ad-count-v2">{opt.count.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {selectedForChat && (
        <ConnectDialog
          person={selectedForChat}
          chatMessage={chatMessage}
          setChatMessage={setChatMessage}
          onSend={() => mutations.friendship.mutate({
            recipientUserId: selectedForChat.userId?._id || selectedForChat.userId,
            message: chatMessage,
          })}
          onClose={() => setSelectedForChat(null)}
          isPending={mutations.friendship.isPending}
          isError={mutations.friendship.isError}
          error={mutations.friendship.error}
        />
      )}

      <CompanyDetailsDialog company={selectedCompanyDetails} onClose={() => setSelectedCompanyDetails(null)} />
    </div>
  );
}
