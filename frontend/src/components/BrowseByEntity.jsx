import { useState, useMemo } from "react";

export function BrowseByEntity({ 
  items = [], 
  title = "Browse", 
  onSelect,
  placeholder = "Search..." 
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("count"); // 'alpha' or 'count'

  const aggregates = useMemo(() => {
    const counts = {};
    items.forEach(item => {
      if (!item) return;
      const normalized = item.trim();
      counts[normalized] = (counts[normalized] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .filter(entry => entry.name.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  const sortedItems = useMemo(() => {
    return [...aggregates].sort((a, b) => {
      if (sortBy === "alpha") {
        return a.name.localeCompare(b.name);
      }
      return b.count - a.count;
    });
  }, [aggregates, sortBy]);

  return (
    <div className="browse-entity-container">
      <div className="browse-entity-header">
        <h3>{title}</h3>
        <div className="browse-entity-sort">
          <span>Sort:</span>
          <button 
            className={`sort-btn ${sortBy === "alpha" ? "active" : ""}`}
            onClick={() => setSortBy("alpha")}
          >
            Alphabetically
          </button>
          <button 
            className={`sort-btn ${sortBy === "count" ? "active" : ""}`}
            onClick={() => setSortBy("count")}
          >
            Count
          </button>
        </div>
      </div>

      <div className="browse-entity-search">
        <input 
          type="text" 
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="directory-input"
        />
      </div>

      <div className="browse-entity-grid">
        {sortedItems.map((item, idx) => (
          <div 
            key={idx} 
            className="browse-entity-item"
            onClick={() => onSelect(item.name)}
          >
            <span className="entity-name">{item.name}</span>
            <span className="entity-count">({item.count})</span>
          </div>
        ))}
        {sortedItems.length === 0 && (
          <p className="muted">No results found.</p>
        )}
      </div>
    </div>
  );
}
