import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { searchPortal } from "../lib/api.js";
import "./CommandPalette.css";

const TYPE_LABELS = {
  alumni: "Alumni",
  events: "Events",
  jobs: "Jobs",
  forums: "Forums",
  groups: "Groups"
};

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const searchQuery = useQuery({
    queryKey: ["portal-search", debouncedQuery],
    queryFn: () => searchPortal({ q: debouncedQuery }),
    enabled: open && debouncedQuery.length >= 2
  });

  const flatResults = useMemo(() => {
    const results = searchQuery.data?.results || {};
    return Object.entries(results).flatMap(([type, items]) =>
      (items || []).map((item) => ({
        ...item,
        type
      }))
    );
  }, [searchQuery.data]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  function goToResult(result) {
    if (!result) return;
    navigate(result.url);
    onClose();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      onClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(flatResults.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      goToResult(flatResults[activeIndex]);
    }
  }

  if (!open) {
    return null;
  }

  const groupedResults = searchQuery.data?.results || {};

  return (
    <div className="command-palette" onMouseDown={onClose} role="presentation">
      <div
        aria-label="Search portal"
        aria-modal="true"
        className="command-palette__panel"
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="command-palette__search">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search alumni, events, jobs, forums, groups..."
            value={query}
          />
          <kbd>Esc</kbd>
        </div>

        <div className="command-palette__body">
          {query.trim().length < 2 ? (
            <div className="command-palette__empty">
              <span className="material-symbols-outlined" aria-hidden="true">keyboard_command_key</span>
              <p>Type at least two characters to search across the portal.</p>
            </div>
          ) : null}
          {searchQuery.isFetching ? <p className="command-palette__loading">Searching...</p> : null}
          {!searchQuery.isFetching && debouncedQuery.length >= 2 && flatResults.length === 0 ? (
            <div className="command-palette__empty">
              <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
              <p>No results found.</p>
            </div>
          ) : null}
          {Object.entries(groupedResults).map(([type, items]) =>
            items?.length ? (
              <section className="command-palette__group" key={type}>
                <h3>{TYPE_LABELS[type] || type}</h3>
                {items.map((item) => {
                  const globalIndex = flatResults.findIndex((result) => result.id === item.id && result.type === type);
                  return (
                    <button
                      className={`command-palette__item ${globalIndex === activeIndex ? "command-palette__item--active" : ""}`}
                      key={`${type}-${item.id}`}
                      onClick={() => goToResult({ ...item, type })}
                      type="button"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">{item.icon || "search"}</span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.subtitle || TYPE_LABELS[type]}</small>
                      </span>
                    </button>
                  );
                })}
              </section>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
