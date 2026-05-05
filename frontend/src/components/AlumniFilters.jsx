import { PortalSearchField } from "./PortalPrimitives.jsx";
import SectionCard from "./SectionCard.jsx";
import { useMemo } from "react";

const CATEGORIES = [
  { id: "location", icon: "location_on", label: "Location" },
  { id: "institute", icon: "school", label: "Institute" },
  { id: "company", icon: "apartment", label: "Company" },
  { id: "roles", icon: "person_search", label: "Roles" },
  { id: "skills", icon: "psychology", label: "Professional Skills" },
  { id: "industry", icon: "factory", label: "Industry" },
];

const TABS = [
  { id: "name", label: "Name, Email & Roll No" },
  { id: "course", label: "Course & Year" },
  { id: "location", label: "Location" },
  { id: "company", label: "Company" },
  { id: "work", label: "Work Experience" },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function AlumniFilters({
  filters,
  handleFilterChange,
  clearFilters,
  isSchool,
  directoryConfig,
  setFilters,
  totalFound = 0,
}) {
  const activeTab = filters.activeTab || "name";

  const handleTabClick = (tabId) => {
    setFilters((f) => ({ ...f, activeTab: tabId }));
  };

  const handleAlphaClick = (letter) => {
    setFilters((f) => ({
      ...f,
      alphaIndex: f.alphaIndex === letter ? "" : letter,
    }));
  };

  const toggleStatusFilter = (key) => {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  };

  return (
    <div className="directory-filters-container">
      {filters.activeTab !== "name" && (
        <div className="directory-location-header">
          <h1 className="directory-title">
            Browse Members <small>by location, institute, company, industry or role</small>
          </h1>
        </div>
      )}
      {/* Top Category Bar */}
      <div className="directory-category-bar">
        <div className="directory-search-label">
          <span className="material-symbols-outlined">search</span>
          <strong>Search</strong>
        </div>
        <div className="directory-browse-by">or browse members by</div>
        <div className="directory-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`directory-category-btn ${filters.activeTab === cat.id ? "active" : ""}`}
              onClick={() => handleTabClick(cat.id)}
            >
              <span className="material-symbols-outlined">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Filter Card */}
      <div className="directory-filter-card">
        <div className="directory-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`directory-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          <div className="directory-sort-container">
            <select className="directory-sort-select">
              <option>Sort by</option>
              <option value="name">Name (A-Z)</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>
        </div>

        <div className="directory-tab-content">
          <div className="directory-main-search">
            {activeTab === "name" && (
              <div className="directory-input-group">
                <input
                  type="text"
                  name="q"
                  placeholder="Name or Email"
                  className="directory-input main-input"
                  value={filters.q}
                  onChange={handleFilterChange}
                />
                <input
                  type="text"
                  name="rollNo"
                  placeholder="Roll No"
                  className="directory-input roll-input"
                  value={filters.rollNo || ""}
                  onChange={handleFilterChange}
                />
              </div>
            )}

            {activeTab === "course" && (
              <div className="directory-input-group">
                <input
                  type="text"
                  name="department"
                  placeholder={directoryConfig.educationFieldLabel}
                  className="directory-input"
                  value={filters.department}
                  onChange={handleFilterChange}
                />
                <input
                  type="number"
                  name="batch"
                  placeholder={directoryConfig.yearFieldLabel}
                  className="directory-input"
                  value={filters.batch}
                  onChange={handleFilterChange}
                />
              </div>
            )}

            {activeTab === "location" && (
              <input
                type="text"
                name="location"
                placeholder="City, State or Country"
                className="directory-input"
                value={filters.location || ""}
                onChange={handleFilterChange}
              />
            )}

            {activeTab === "company" && (
              <input
                type="text"
                name="company"
                placeholder="Company Name"
                className="directory-input"
                value={filters.company}
                onChange={handleFilterChange}
              />
            )}

            {activeTab === "work" && (
              <input
                type="text"
                name="skill"
                placeholder="Experience or Skills"
                className="directory-input"
                value={filters.skill}
                onChange={handleFilterChange}
              />
            )}

            <button className="directory-search-submit" type="button">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          <div className="directory-alpha-index">
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                className={`directory-alpha-btn ${filters.alphaIndex === letter ? "active" : ""}`}
                onClick={() => handleAlphaClick(letter)}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="directory-status-bar">
        <div className="directory-status-filters">
          <span className="status-label">Show:</span>
          <button
            className={`status-btn ${!filters.isFaculty && !filters.registeredOnly ? "active" : ""}`}
            onClick={clearFilters}
          >
            All
          </button>
          <button
            className={`status-btn ${filters.isFaculty ? "active" : ""}`}
            onClick={() => toggleStatusFilter("isFaculty")}
          >
            Faculty
          </button>
          <button className="status-btn">Batchmates</button>
          <button
            className={`status-btn ${filters.registeredOnly ? "active" : ""}`}
            onClick={() => toggleStatusFilter("registeredOnly")}
          >
            Registered Only
          </button>
        </div>
        <div className="directory-results-count">
          <strong>{totalFound}</strong> Member(s) Found
        </div>
      </div>
    </div>
  );
}

