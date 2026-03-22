import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PortalPageHeader, PortalSegmentedTabs } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement
} from "../lib/api.js";

const initialForm = {
  title: "",
  content: "",
  status: "published"
};

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

function formatRelativeTime(value) {
  const diffMs = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  return "Yesterday";
}

function inferNotificationType(item) {
  const text = `${item.title} ${item.content}`.toLowerCase();
  if (text.includes("job") || text.includes("role")) return "jobs";
  if (text.includes("event") || text.includes("gala")) return "events";
  if (text.includes("connection") || text.includes("liked")) return "connections";
  return "system";
}

function inferAccent(type) {
  if (type === "jobs") return "green";
  if (type === "events") return "gold";
  if (type === "connections") return "blue";
  return "gray";
}

function AnnouncementsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [institutionSettings, setInstitutionSettings] = useState(initialInstitutionSettings);
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [settingsTab, setSettingsTab] = useState("general");
  const [saveNotice, setSaveNotice] = useState("");
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateAnnouncement(id, payload) : createAnnouncement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      setForm(initialForm);
      setEditingId(null);
      setShowComposer(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    }
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    saveMutation.mutate({ id: editingId, payload: form });
  }

  function handleEdit(item) {
    setEditingId(item._id);
    setShowComposer(true);
    setForm({
      title: item.title || "",
      content: item.content || "",
      status: item.status || "published"
    });
  }

  function handleSettingsChange(event) {
    const { name, value, type, checked } = event.target;
    setInstitutionSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
    setSaveNotice("");
  }

  const notifications = useMemo(() => {
    const mapped = data.map((item) => {
      const type = inferNotificationType(item);
      return {
        ...item,
        type,
        accent: inferAccent(type),
        actionLabel:
          type === "jobs"
            ? "Apply Now"
            : type === "events"
              ? "View Event Details"
              : type === "connections"
                ? "View Profile"
                : "Read Release Notes"
      };
    });

    return mapped;
  }, [data]);

  const visibleNotifications = useMemo(() => {
    if (activeTab === "all") {
      return notifications;
    }

    return notifications.filter((item) => item.type === activeTab);
  }, [activeTab, notifications]);

  const isAdmin = auth.user?.role === "institute_admin";

  if (isAdmin) {
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
              <small>This description will appear on the "About" page of your public portal.</small>
            </label>
          </div>
        </section>

        <section className="institution-settings-card">
          <div className="institution-settings-card-head">
            <div>
              <h2>Branding</h2>
              <p>Customize how your institution looks to the alumni.</p>
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
              <input
                checked={institutionSettings.enableJobs}
                name="enableJobs"
                onChange={handleSettingsChange}
                type="checkbox"
              />
            </label>

            <label className="institution-toggle-row">
              <div>
                <strong>Enable Events</strong>
                <p>Manage reunions, workshops, and seminars.</p>
              </div>
              <input
                checked={institutionSettings.enableEvents}
                name="enableEvents"
                onChange={handleSettingsChange}
                type="checkbox"
              />
            </label>

            <label className="institution-toggle-row">
              <div>
                <strong>Allow Student Registrations</strong>
                <p>Permit currently enrolled students to join the portal.</p>
              </div>
              <input
                checked={institutionSettings.allowStudentRegistrations}
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
              <input
                checked={institutionSettings.autoApproveAlumni}
                name="autoApproveAlumni"
                onChange={handleSettingsChange}
                type="checkbox"
              />
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
            <button className="button secondary" type="button">
              Open Security Controls
            </button>
          </div>
        </section>

        <footer className="institution-settings-footer">
          <div className="institution-settings-updated">Last updated: Oct 24, 2023 at 11:45 AM</div>
          <div className="institution-settings-footer-actions">
            <button
              className="button secondary"
              onClick={() => {
                setInstitutionSettings(initialInstitutionSettings);
                setSaveNotice("");
              }}
              type="button"
            >
              Discard
            </button>
            <button
              className="button primary"
              onClick={() => setSaveNotice("Institution settings saved successfully.")}
              type="button"
            >
              Save Changes
            </button>
          </div>
        </footer>

        {saveNotice ? <p className="success-text">{saveNotice}</p> : null}
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <PortalPageHeader
        actions={
          <div className="notifications-header-actions">
            <button className="button secondary" type="button">
              Mark all as read
            </button>
            {isAdmin ? (
              <button
                className="button primary"
                onClick={() => setShowComposer((current) => !current)}
                type="button"
              >
                {showComposer ? "Close" : "Create Notice"}
              </button>
            ) : null}
          </div>
        }
        className="notifications-header"
        subtitle="Stay updated with your network and career opportunities."
        title="Notifications"
      />

      {isAdmin && showComposer ? (
        <SectionCard title={editingId ? "Edit Notice" : "Create Notice"} subtitle="Institute Admin">
          <form className="form-grid" onSubmit={handleSubmit}>
            <input name="title" onChange={handleChange} placeholder="Notification title" value={form.title} />
            <textarea
              className="textarea"
              name="content"
              onChange={handleChange}
              placeholder="Notification content"
              rows="5"
              value={form.content}
            />
            <select className="select" name="status" onChange={handleChange} value={form.status}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <div className="inline-actions">
              <button className="button primary" disabled={saveMutation.isPending} type="submit">
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Notice" : "Publish Notice"}
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                  setShowComposer(false);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
          {saveMutation.isError ? <p className="error-text">{saveMutation.error.message}</p> : null}
        </SectionCard>
      ) : null}

      <PortalSegmentedTabs
        activeValue={activeTab}
        ariaLabel="Notification categories"
        className="notifications-tabs"
        items={[
          { value: "all", label: "All" },
          { value: "connections", label: "Connections" },
          { value: "jobs", label: "Jobs" },
          { value: "events", label: "Events" },
          { value: "system", label: "System" }
        ]}
        onChange={setActiveTab}
      />

      {isLoading ? <p>Loading notifications...</p> : null}
      {isError ? <p className="error-text">{error.message}</p> : null}
      {!isLoading && !visibleNotifications.length ? (
        <p className="muted">No notifications in this view yet.</p>
      ) : null}

      <div className="notifications-list">
        {visibleNotifications.map((item) => (
          <article className={`notifications-card ${item.accent}`} key={item._id}>
            <div className={`notifications-icon ${item.accent}`}>{item.type.slice(0, 2).toUpperCase()}</div>

            <div className="notifications-copy">
              <h3>{item.title}</h3>
              <p>{item.content}</p>
              <div className="notifications-card-actions">
                <button className="button primary compact" type="button">
                  {item.actionLabel}
                </button>
                {isAdmin && data.some((announcement) => announcement._id === item._id) ? (
                  <>
                    <button className="button secondary compact" onClick={() => handleEdit(item)} type="button">
                      Edit
                    </button>
                    <button
                      className="button secondary compact"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(item._id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button className="button secondary compact" type="button">
                    Dismiss
                  </button>
                )}
              </div>
            </div>

            <time>{formatRelativeTime(item.createdAt || new Date())}</time>
          </article>
        ))}
      </div>

      <button className="notifications-load" type="button">
        Load earlier notifications
      </button>

      {deleteMutation.isError ? <p className="error-text">{deleteMutation.error.message}</p> : null}
    </div>
  );
}

export default AnnouncementsPage;
