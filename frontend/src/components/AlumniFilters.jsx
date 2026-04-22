import { PortalSearchField } from "./PortalPrimitives.jsx";
import SectionCard from "./SectionCard.jsx";

export function AlumniFilters({ 
  filters, 
  handleFilterChange, 
  clearFilters, 
  isSchool, 
  directoryConfig 
}) {
  return (
    <SectionCard title="Roster filters" subtitle="Refine the member list quickly">
      <div className="member-directory-filter-grid">
        <PortalSearchField
          name="q"
          onChange={handleFilterChange}
          placeholder={directoryConfig.filterPlaceholder}
          value={filters.q}
        />
        <input
          name={isSchool ? "leavingYear" : "batch"}
          onChange={handleFilterChange}
          placeholder={directoryConfig.yearFieldLabel}
          value={isSchool ? filters.leavingYear : filters.batch}
          type="number"
        />
        <input
          name={isSchool ? "lastClassAttended" : "department"}
          onChange={handleFilterChange}
          placeholder={directoryConfig.educationFieldLabel}
          value={isSchool ? filters.lastClassAttended : filters.department}
        />
        <button className="button secondary" onClick={clearFilters} type="button">
          Clear filters
        </button>
      </div>
    </SectionCard>
  );
}
