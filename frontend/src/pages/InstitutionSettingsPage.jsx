import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { PortalPageHeader, PortalSegmentedTabs } from "../components/PortalPrimitives.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchMyInstituteSettings, updateMyInstituteSettings } from "../lib/api.js";

const initialFormState = {
  name: "",
  website: "",
  email: "",
  bio: "",
  slug: "",
  tagline: "",
  primaryColor: "#2554d8",
  secondaryColor: "#163795",
  accentColor: "#eef3ff",
  logoUrl: "",
  enableJobs: true,
  enableEvents: true,
  allowStudentRegistrations: false,
  autoApproveAlumni: false,
  autoApproveEmailDomainsText: "",
  departmentsText: ""
};

function normalizeAutoApproveDomainsInput(value) {
  const values = String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);

  return [...new Set(values)];
}

function normalizeDepartmentsInput(value) {
  const values = String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(values)];
}

function mapSettingsToForm(settings) {
  return {
    name: settings?.name || "",
    website: settings?.website || "",
    email: settings?.primaryContactEmail || "",
    bio: settings?.bio || "",
    slug: settings?.subdomain || "",
    tagline: settings?.branding?.tagline || "",
    primaryColor: settings?.branding?.primaryColor || "#2554d8",
    secondaryColor: settings?.branding?.secondaryColor || "#163795",
    accentColor: settings?.branding?.accentColor || "#eef3ff",
    logoUrl: settings?.branding?.logoUrl || "",
    enableJobs: Boolean(settings?.featureFlags?.enableJobs),
    enableEvents: Boolean(settings?.featureFlags?.enableEvents),
    allowStudentRegistrations: Boolean(settings?.featureFlags?.allowStudentRegistrations),
    autoApproveAlumni: Boolean(settings?.featureFlags?.autoApproveAlumni),
    autoApproveEmailDomainsText: Array.isArray(settings?.featureFlags?.autoApproveEmailDomains)
      ? settings.featureFlags.autoApproveEmailDomains.join("\n")
      : "",
    departmentsText: Array.isArray(settings?.departments)
      ? settings.departments.join("\n")
      : ""
  };
}

function buildUpdatePayload(form) {
  return {
    name: form.name,
    website: form.website,
    primaryContactEmail: form.email,
    bio: form.bio,
    branding: {
      tagline: form.tagline,
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      accentColor: form.accentColor,
      logoUrl: form.logoUrl
    },
    featureFlags: {
      enableJobs: form.enableJobs,
      enableEvents: form.enableEvents,
      allowStudentRegistrations: form.allowStudentRegistrations,
      autoApproveAlumni: form.autoApproveAlumni,
      autoApproveEmailDomains: normalizeAutoApproveDomainsInput(form.autoApproveEmailDomainsText)
    },
    departments: normalizeDepartmentsInput(form.departmentsText)
  };
}

function InstitutionSettingsPage() {
  const auth = useAuth();
  const [settingsTab, setSettingsTab] = useState("general");
  const [form, setForm] = useState(initialFormState);
  const [saveNotice, setSaveNotice] = useState("");

  const settingsQuery = useQuery({
    queryKey: ["institute-settings"],
    queryFn: fetchMyInstituteSettings
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    setForm(mapSettingsToForm(settingsQuery.data));
  }, [settingsQuery.data]);

  const mutation = useMutation({
    mutationFn: updateMyInstituteSettings,
    onSuccess: async (response) => {
      setSaveNotice(response?.message || "Institution settings saved successfully.");
      if (response?.settings) {
        setForm(mapSettingsToForm(response.settings));
      }
      await auth.refreshSession();
    }
  });

  function handleSettingsChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
    setSaveNotice("");
  }

  function resetForm() {
    setForm(mapSettingsToForm(settingsQuery.data || initialFormState));
    setSaveNotice("");
  }

  const isDirty = useMemo(() => {
    if (!settingsQuery.data) {
      return false;
    }

    return JSON.stringify(form) !== JSON.stringify(mapSettingsToForm(settingsQuery.data));
  }, [form, settingsQuery.data]);

  if (settingsQuery.isLoading) {
    return <p className="muted">Loading institution settings...</p>;
  }

  if (settingsQuery.isError) {
    return <p className="error-text">{settingsQuery.error.message}</p>;
  }

  return (
    <div className="institution-settings-page">
      <PortalPageHeader
        className="institution-settings-header"
        subtitle="Manage your institution profile, branding, and portal settings."
        title="Institution Settings"
      />

      <PortalSegmentedTabs
        activeValue={settingsTab}
        ariaLabel="Institution settings sections"
        className="institution-settings-tabs"
        items={[
          { value: "general", label: "General Information" },
          { value: "branding", label: "Branding" },
          { value: "portal", label: "Portal Configuration" }
        ]}
        onChange={setSettingsTab}
      />

      <section className="institution-settings-card">
        <div className="institution-settings-card-head">
          <div>
            <h2>General Information</h2>
            <p>Core details about your institution.</p>
          </div>
        </div>

        <div className="institution-settings-form-grid">
          <label>
            <span>Institution Name</span>
            <input name="name" onChange={handleSettingsChange} value={form.name} />
          </label>
          <label>
            <span>Website</span>
            <input name="website" onChange={handleSettingsChange} value={form.website} />
          </label>
          <label className="full">
            <span>Contact Email</span>
            <input name="email" onChange={handleSettingsChange} value={form.email} />
          </label>
          <label className="full">
            <span>About / Bio</span>
            <textarea className="textarea" name="bio" onChange={handleSettingsChange} rows="4" value={form.bio} />
            <small>This description can be used in your public presence.</small>
          </label>
          <label className="full">
            <span>Academic Departments / Branches</span>
            <textarea
              className="textarea"
              name="departmentsText"
              onChange={handleSettingsChange}
              placeholder="Computer Science&#10;Electronics&#10;Mechanical"
              rows="5"
              value={form.departmentsText}
            />
            <small>Add one department per line. These will appear as options in the registration form.</small>
          </label>
        </div>
      </section>

      <section className="institution-settings-card">
        <div className="institution-settings-card-head">
          <div>
            <h2>Branding</h2>
            <p>Customize how your institution looks to alumni.</p>
          </div>
        </div>

        <div className="institution-settings-form-grid">
          <label className="full">
            <span>Portal Tagline</span>
            <input name="tagline" onChange={handleSettingsChange} value={form.tagline} />
          </label>
          <label className="full">
            <span>Logo URL</span>
            <input name="logoUrl" onChange={handleSettingsChange} value={form.logoUrl} />
            <small>Use a public image URL for your logo.</small>
          </label>
          <label>
            <span>Primary Color</span>
            <input name="primaryColor" onChange={handleSettingsChange} type="color" value={form.primaryColor} />
          </label>
          <label>
            <span>Secondary Color</span>
            <input name="secondaryColor" onChange={handleSettingsChange} type="color" value={form.secondaryColor} />
          </label>
          <label>
            <span>Accent Color</span>
            <input name="accentColor" onChange={handleSettingsChange} type="color" value={form.accentColor} />
          </label>
          <label>
            <span>Portal Slug</span>
            <input name="slug" readOnly value={form.slug} />
            <small>Subdomain updates require platform support.</small>
          </label>
        </div>
      </section>

      <section className="institution-settings-card">
        <div className="institution-settings-card-head">
          <div>
            <h2>Portal Configuration</h2>
            <p>Enable or disable features for your alumni community.</p>
          </div>
        </div>

        <div className="institution-toggle-list">
          <label className="institution-toggle-row">
            <div>
              <strong>Enable Jobs Board</strong>
              <p>Allow alumni to post and browse job opportunities.</p>
            </div>
            <input checked={form.enableJobs} name="enableJobs" onChange={handleSettingsChange} type="checkbox" />
          </label>

          <label className="institution-toggle-row">
            <div>
              <strong>Enable Events</strong>
              <p>Manage reunions, workshops, and seminars.</p>
            </div>
            <input checked={form.enableEvents} name="enableEvents" onChange={handleSettingsChange} type="checkbox" />
          </label>

          <label className="institution-toggle-row">
            <div>
              <strong>Allow Student Registrations</strong>
              <p>Permit currently enrolled students to join the portal.</p>
            </div>
            <input
              checked={form.allowStudentRegistrations}
              name="allowStudentRegistrations"
              onChange={handleSettingsChange}
              type="checkbox"
            />
          </label>

          <label className="institution-toggle-row">
            <div>
              <strong>Auto-approve Alumni</strong>
              <p>Automatically approve registrations matching verified email domains.</p>
            </div>
            <input checked={form.autoApproveAlumni} name="autoApproveAlumni" onChange={handleSettingsChange} type="checkbox" />
          </label>

          <label className="full">
            <span>Auto-approve Email Domains</span>
            <textarea
              className="textarea"
              name="autoApproveEmailDomainsText"
              onChange={handleSettingsChange}
              placeholder="alumni.edu\nspit.ac.in"
              rows="3"
              value={form.autoApproveEmailDomainsText}
            />
            <small>Add one domain per line (or comma-separated). These domains are used when auto-approve is enabled.</small>
          </label>
        </div>
      </section>

      <footer className="institution-settings-footer">
        <div className="institution-settings-updated">{isDirty ? "Unsaved changes" : "All changes saved"}</div>
        <div className="institution-settings-footer-actions">
          <button className="button secondary" disabled={!isDirty || mutation.isPending} onClick={resetForm} type="button">
            Discard
          </button>
          <button
            className="button primary"
            disabled={!isDirty || mutation.isPending}
            onClick={() => mutation.mutate(buildUpdatePayload(form))}
            type="button"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </footer>

      {saveNotice ? <p className="success-text">{saveNotice}</p> : null}
      {mutation.isError ? <p className="error-text">{mutation.error.message}</p> : null}
    </div>
  );
}

export default InstitutionSettingsPage;
