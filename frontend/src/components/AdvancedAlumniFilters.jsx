import { useState } from "react";
import { PortalSearchField } from "./PortalPrimitives.jsx";

const ADVANCED_FILTERS = [
  { id: "skills", label: "Skills", icon: "psychology", type: "multi-select" },
  { id: "industry", label: "Industry", icon: "factory", type: "select" },
  { id: "experience", label: "Experience", icon: "work_history", type: "range" },
  { id: "location", label: "Location Radius", icon: "location_on", type: "radius" },
  { id: "companySize", label: "Company Size", icon: "groups", type: "select" },
  { id: "availability", label: "Availability", icon: "event_available", type: "multi-select" },
];

const INDUSTRY_OPTIONS = [
  "Technology", "Finance", "Healthcare", "Education", "Manufacturing",
  "Consulting", "Retail", "Energy", "Media", "Government", "Non-profit"
];

const SKILLS_OPTIONS = [
  "JavaScript", "Python", "React", "Node.js", "AWS", "Machine Learning",
  "Data Analysis", "Project Management", "Leadership", "Marketing",
  "Sales", "Product Management", "UI/UX Design", "DevOps", "Cybersecurity"
];

const COMPANY_SIZE_OPTIONS = [
  "1-10 employees", "11-50 employees", "51-200 employees",
  "201-500 employees", "501-1000 employees", "1000+ employees"
];

const AVAILABILITY_OPTIONS = [
  { id: "friendship", label: "Available for Friendship" },
  { id: "opportunities", label: "Open to Opportunities" },
  { id: "freelance", label: "Available for Freelance" },
  { id: "advising", label: "Open to Advising" },
  { id: "hiring", label: "Currently Hiring" },
];

export function AdvancedAlumniFilters({
  filters,
  onFilterChange,
  onSaveSearch,
  savedSearches = [],
}) {
  const [expandedFilter, setExpandedFilter] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchName, setSearchName] = useState("");

  const handleFilterToggle = (filterId) => {
    setExpandedFilter(expandedFilter === filterId ? null : filterId);
  };

  const handleSkillToggle = (skill) => {
    const currentSkills = filters.skills || [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];
    
    onFilterChange({ ...filters, skills: newSkills });
  };

  const handleIndustryChange = (industry) => {
    onFilterChange({ ...filters, industry });
  };

  const handleExperienceChange = (min, max) => {
    onFilterChange({ ...filters, experienceMin: min, experienceMax: max });
  };

  const handleLocationRadiusChange = (radius, unit) => {
    onFilterChange({ ...filters, locationRadius: radius, locationUnit: unit });
  };

  const handleSaveSearch = () => {
    if (!searchName.trim()) return;
    
    const searchConfig = {
      id: Date.now().toString(),
      name: searchName,
      filters: { ...filters },
      timestamp: new Date().toISOString(),
    };
    
    onSaveSearch(searchConfig);
    setSearchName("");
  };

  const handleLoadSearch = (savedSearch) => {
    onFilterChange(savedSearch.filters);
  };

  const handleDeleteSearch = (searchId, e) => {
    e.stopPropagation();
    // In a real app, this would call a delete function passed as prop
    console.log("Delete search", searchId);
  };

  return (
    <div className="advanced-filters-container">
      <div className="advanced-filters-header">
        <button
          className="advanced-toggle-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span className="material-symbols-outlined">
            {showAdvanced ? "expand_less" : "expand_more"}
          </span>
          Advanced Search & Filters
          {showAdvanced && (
            <span className="filter-count">
              {Object.keys(filters).filter(k => 
                !["q", "activeTab", "alphaIndex"].includes(k) && filters[k]
              ).length} active
            </span>
          )}
        </button>

        {savedSearches.length > 0 && (
          <div className="saved-searches-dropdown">
            <button className="saved-searches-btn">
              <span className="material-symbols-outlined">bookmark</span>
              Saved Searches ({savedSearches.length})
            </button>
            <div className="saved-searches-menu">
              {savedSearches.map(search => (
                <div key={search.id} className="saved-search-item">
                  <button
                    className="saved-search-load"
                    onClick={() => handleLoadSearch(search)}
                  >
                    {search.name}
                  </button>
                  <button
                    className="saved-search-delete"
                    onClick={(e) => handleDeleteSearch(search.id, e)}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAdvanced && (
        <div className="advanced-filters-content">
          {/* Quick Filter Chips */}
          <div className="filter-chips-container">
            <div className="filter-chips-label">Quick Filters:</div>
            <div className="filter-chips">
              {AVAILABILITY_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`filter-chip ${filters[opt.id] ? "active" : ""}`}
                  onClick={() => onFilterChange({
                    ...filters,
                    [opt.id]: !filters[opt.id]
                  })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Filter Sections */}
          <div className="advanced-filter-sections">
            {ADVANCED_FILTERS.map(filter => (
              <div key={filter.id} className="advanced-filter-section">
                <button
                  className="filter-section-header"
                  onClick={() => handleFilterToggle(filter.id)}
                >
                  <span className="material-symbols-outlined">
                    {filter.icon}
                  </span>
                  {filter.label}
                  <span className="material-symbols-outlined">
                    {expandedFilter === filter.id ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {expandedFilter === filter.id && (
                  <div className="filter-section-content">
                    {filter.type === "multi-select" && filter.id === "skills" && (
                      <div className="skills-filter">
                        <div className="skills-search">
                          <input
                            type="text"
                            placeholder="Search skills..."
                            className="skills-search-input"
                          />
                        </div>
                        <div className="skills-grid">
                          {SKILLS_OPTIONS.map(skill => (
                            <button
                              key={skill}
                              className={`skill-chip ${(filters.skills || []).includes(skill) ? "active" : ""}`}
                              onClick={() => handleSkillToggle(skill)}
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {filter.type === "select" && filter.id === "industry" && (
                      <div className="industry-filter">
                        <select
                          className="industry-select"
                          value={filters.industry || ""}
                          onChange={(e) => handleIndustryChange(e.target.value)}
                        >
                          <option value="">All Industries</option>
                          {INDUSTRY_OPTIONS.map(ind => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {filter.type === "range" && filter.id === "experience" && (
                      <div className="experience-filter">
                        <div className="range-inputs">
                          <div className="range-input-group">
                            <label>Min (years)</label>
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={filters.experienceMin || ""}
                              onChange={(e) => handleExperienceChange(
                                e.target.value,
                                filters.experienceMax
                              )}
                              className="range-input"
                            />
                          </div>
                          <div className="range-input-group">
                            <label>Max (years)</label>
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={filters.experienceMax || ""}
                              onChange={(e) => handleExperienceChange(
                                filters.experienceMin,
                                e.target.value
                              )}
                              className="range-input"
                            />
                          </div>
                        </div>
                        <div className="range-presets">
                          <button
                            className="range-preset"
                            onClick={() => handleExperienceChange(0, 5)}
                          >
                            0-5 years
                          </button>
                          <button
                            className="range-preset"
                            onClick={() => handleExperienceChange(5, 10)}
                          >
                            5-10 years
                          </button>
                          <button
                            className="range-preset"
                            onClick={() => handleExperienceChange(10, 20)}
                          >
                            10-20 years
                          </button>
                          <button
                            className="range-preset"
                            onClick={() => handleExperienceChange(20, 50)}
                          >
                            20+ years
                          </button>
                        </div>
                      </div>
                    )}

                    {filter.type === "radius" && filter.id === "location" && (
                      <div className="location-radius-filter">
                        <div className="radius-inputs">
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={filters.locationRadius || 50}
                            onChange={(e) => handleLocationRadiusChange(
                              e.target.value,
                              filters.locationUnit || "km"
                            )}
                            className="radius-input"
                          />
                          <select
                            className="radius-unit"
                            value={filters.locationUnit || "km"}
                            onChange={(e) => handleLocationRadiusChange(
                              filters.locationRadius || 50,
                              e.target.value
                            )}
                          >
                            <option value="km">km</option>
                            <option value="miles">miles</option>
                          </select>
                        </div>
                        <div className="radius-presets">
                          <button
                            className="radius-preset"
                            onClick={() => handleLocationRadiusChange(25, "km")}
                          >
                            25 km
                          </button>
                          <button
                            className="radius-preset"
                            onClick={() => handleLocationRadiusChange(50, "km")}
                          >
                            50 km
                          </button>
                          <button
                            className="radius-preset"
                            onClick={() => handleLocationRadiusChange(100, "km")}
                          >
                            100 km
                          </button>
                          <button
                            className="radius-preset"
                            onClick={() => handleLocationRadiusChange(200, "km")}
                          >
                            200 km
                          </button>
                        </div>
                      </div>
                    )}

                    {filter.type === "select" && filter.id === "companySize" && (
                      <div className="company-size-filter">
                        <div className="company-size-options">
                          {COMPANY_SIZE_OPTIONS.map(size => (
                            <button
                              key={size}
                              className={`company-size-option ${filters.companySize === size ? "active" : ""}`}
                              onClick={() => onFilterChange({
                                ...filters,
                                companySize: filters.companySize === size ? "" : size
                              })}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save Search Section */}
          <div className="save-search-section">
            <div className="save-search-inputs">
              <input
                type="text"
                placeholder="Name this search..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="save-search-name"
              />
              <button
                className="save-search-btn"
                onClick={handleSaveSearch}
                disabled={!searchName.trim()}
              >
                <span className="material-symbols-outlined">bookmark_add</span>
                Save Search
              </button>
            </div>
            <div className="search-tips">
              <span className="material-symbols-outlined">lightbulb</span>
              <span>Saved searches will appear in your dropdown for quick access</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="filter-actions">
            <button
              className="filter-action-btn secondary"
              onClick={() => onFilterChange({})}
            >
              <span className="material-symbols-outlined">clear_all</span>
              Clear All Filters
            </button>
            <button
              className="filter-action-btn primary"
              onClick={() => {
                // Apply filters
                setShowAdvanced(false);
              }}
            >
              <span className="material-symbols-outlined">check</span>
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}