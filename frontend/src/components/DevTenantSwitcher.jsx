import { useMemo, useState } from "react";

import { redirectToTenantPortal } from "../lib/api.js";

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function DevTenantSwitcher({ institutes = [], currentTenantSlug = "" }) {
  const [query, setQuery] = useState("");
  const [selectedInstituteId, setSelectedInstituteId] = useState("");
  const normalizedCurrentTenantSlug = normalizeValue(currentTenantSlug);

  const filteredInstitutes = useMemo(() => {
    const normalizedQuery = normalizeValue(query);
    if (!normalizedQuery) {
      return institutes;
    }

    return institutes.filter((institute) => {
      const haystacks = [
        institute?.name,
        institute?.subdomain,
        institute?.domain,
      ].map(normalizeValue);
      return haystacks.some((value) => value.includes(normalizedQuery));
    });
  }, [institutes, query]);

  const selectedInstitute = useMemo(
    () =>
      filteredInstitutes.find(
        (institute) => String(institute?._id || "") === selectedInstituteId,
      ) || null,
    [filteredInstitutes, selectedInstituteId],
  );

  function handleRedirect() {
    if (!selectedInstitute) {
      return;
    }
    redirectToTenantPortal(selectedInstitute, "/login");
  }

  return (
    <div className="auth-field">
      <span>Switch institution portal</span>
      <input
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedInstituteId("");
        }}
        placeholder="Search by institution, subdomain, or domain"
        type="text"
        value={query}
      />
      <select
        onChange={(event) => setSelectedInstituteId(event.target.value)}
        value={selectedInstituteId}
      >
        <option value="">Select institution login</option>
        {filteredInstitutes.map((institute) => {
          const slug = normalizeValue(institute?.subdomain);
          const isCurrent = Boolean(
            normalizedCurrentTenantSlug && slug === normalizedCurrentTenantSlug,
          );
          const suffix = isCurrent ? " (current)" : "";
          const label = `${institute?.name || "Institution"}${
            slug ? ` (${slug})` : ""
          }${suffix}`;

          return (
            <option key={institute._id} value={institute._id}>
              {label}
            </option>
          );
        })}
      </select>
      <button
        className="button secondary auth-submit"
        disabled={!selectedInstitute}
        onClick={handleRedirect}
        type="button"
      >
        Open selected login
      </button>
    </div>
  );
}

export default DevTenantSwitcher;
