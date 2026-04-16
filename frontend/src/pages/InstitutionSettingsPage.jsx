import { useState } from "react";

import { PortalPageHeader, PortalSegmentedTabs } from "../components/PortalPrimitives.jsx";

const initialInstitutionSettings = {
  name: "St. Patrick's Institute of Technology",
  website: "https://www.stpatricks.edu",
  email: "admin@stpatricks.edu",
  bio: "St. Patrick's Institute of Technology is dedicated to providing world-class technical education and fostering a strong community of alumni worldwide. Founded in 1954, we pride ourselves on innovation and excellence.",
  slug: "spit",
  enableJobs: true,
  enableEvents: true,
  allowStudentRegistrations: false,
  autoApproveAlumni: false
};

function InstitutionSettingsPage() {
  const [institutionSettings, setInstitutionSettings] = useState(initialInstitutionSettings);
  const [settingsTab, setSettingsTab] = useState("general");
  const [saveNotice, setSaveNotice] = useState("");

  function handleSettingsChange(event) {
    const { name, value, type, checked } = event.target;
    setInstitutionSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
    setSaveNotice("");
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
          { value: "portal", label: "Portal Configuration" },
          { value: "security", label: "Security & Access" }
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
            <input name="name" onChange={handleSettingsChange} value={institutionSettings.name} />
          </label>
          <label>
            <span>Website</span>
            <input name="website" onChange={handleSettingsChange} value={institutionSettings.website} />
          </label>
          <label className="full">
            <span>Contact Email</span>
            <input name="email" onChange={handleSettingsChange} value={institutionSettings.email} />
          </label>
          <label className="full">
            <span>About / Bio</span>
            <textarea
              className="textarea"
              name="bio"
              onChange={handleSettingsChange}
              rows="4"
              value={institutionSettings.bio}
            />
            <small>This description will appear on the public portal.</small>
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

        <div className="institution-branding-block">
          <div className="institution-logo-dropzone" />
          <div className="institution-branding-copy">
            <strong>Institution Logo</strong>
            <p>PNG or SVG, max size 2MB. A square logo works best.</p>
          </div>
        </div>

        <div className="institution-settings-divider" />

        <label className="institution-settings-slug">
          <span>Portal Domain / Slug</span>
          <div className="institution-settings-slug-row">
            <span>https://</span>
            <input name="slug" onChange={handleSettingsChange} value={institutionSettings.slug} />
            <span>.alumnet.com</span>
          </div>
          <small>This is the unique URL where alumni will access your portal.</small>
        </label>
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
            <input checked={institutionSettings.enableJobs} name="enableJobs" onChange={handleSettingsChange} type="checkbox" />
          </label>

          <label className="institution-toggle-row">
            <div>
              <strong>Enable Events</strong>
              <p>Manage reunions, workshops, and seminars.</p>
            </div>
            <input checked={institutionSettings.enableEvents} name="enableEvents" onChange={handleSettingsChange} type="checkbox" />
          </label>

          <label className="institution-toggle-row">
            <div>
              <strong>Allow Student Registrations</strong>
              <p>Permit currently enrolled students to join the portal.</p>
            </div>
            <input checked={institutionSettings.allowStudentRegistrations} name="allowStudentRegistrations" onChange={handleSettingsChange} type="checkbox" />
          </label>

          <label className="institution-toggle-row">
            <div>
              <strong>Auto-approve Alumni</strong>
              <p>Automatically approve registrations matching verified email domains.</p>
            </div>
            <input checked={institutionSettings.autoApproveAlumni} name="autoApproveAlumni" onChange={handleSettingsChange} type="checkbox" />
          </label>
        </div>
      </section>

      <section className="institution-settings-card muted-card">
        <div className="institution-settings-card-head">
          <div>
            <h2>Security & Access</h2>
            <p>Review admin access, password policy, and moderation rules.</p>
          </div>
        </div>
        <div className="institution-security-placeholder">
          <div>
            <strong>Admin Access Controls</strong>
            <p>Configure role permissions, session timeout, and 2FA enforcement in the next setup step.</p>
          </div>
          <button className="button secondary" type="button">Open Security Controls</button>
        </div>
      </section>

      <footer className="institution-settings-footer">
        <div className="institution-settings-updated">Last updated: just now</div>
        <div className="institution-settings-footer-actions">
          <button className="button secondary" onClick={() => { setInstitutionSettings(initialInstitutionSettings); setSaveNotice(""); }} type="button">
            Discard
          </button>
          <button className="button primary" onClick={() => setSaveNotice("Institution settings saved successfully.")} type="button">
            Save Changes
          </button>
        </div>
      </footer>

      {saveNotice ? <p className="success-text">{saveNotice}</p> : null}
    </div>
  );
}

export default InstitutionSettingsPage;
