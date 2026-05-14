import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { fetchMyAlumniProfile, updateMyAlumniProfile } from "../lib/api.js";
import "../styles/AlumniSettings.css";

const defaultForm = {
  profileVisibility: "institute_only",
  showEmail: false,
  showPhone: false,
  allowMentorRequests: true,
};

function buildSettingsForm(profile) {
  return {
    profileVisibility: profile?.profileVisibility || "institute_only",
    showEmail: profile?.showEmail ?? false,
    showPhone: profile?.showPhone ?? false,
    allowMentorRequests: profile?.allowMentorRequests ?? true,
  };
}

export default function AlumniSettingsPage() {
  const auth = useAuth();
  const tenant = useTenantContext();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [saveNotice, setSaveNotice] = useState("");

  const profileQuery = useQuery({
    queryKey: ["my-alumni-profile"],
    queryFn: fetchMyAlumniProfile,
    enabled: auth.user?.role === "alumni"
  });

  useEffect(() => {
    if (profileQuery.data) {
      setForm(buildSettingsForm(profileQuery.data));
    }
  }, [profileQuery.data]);

  const mutation = useMutation({
    mutationFn: updateMyAlumniProfile,
    onSuccess: async (updated) => {
      setSaveNotice("Settings saved.");
      setForm(buildSettingsForm(updated));
      await queryClient.invalidateQueries({ queryKey: ["my-alumni-profile"] });
      setTimeout(() => setSaveNotice(""), 2500);
    }
  });

  const isDirty = useMemo(() => {
    if (!profileQuery.data) {
      return false;
    }

    return JSON.stringify(form) !== JSON.stringify(buildSettingsForm(profileQuery.data));
  }, [form, profileQuery.data]);

  function handleChange(event) {
    const { name, checked, type, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSaveNotice("");
  }

  function resetSettings() {
    setForm(buildSettingsForm(profileQuery.data || defaultForm));
    setSaveNotice("");
  }

  function saveSettings(event) {
    event.preventDefault();
    mutation.mutate(form);
  }

  if (profileQuery.isLoading) {
    return <p className="as-loading">Loading settings...</p>;
  }

  if (profileQuery.isError) {
    return <p className="as-error">{profileQuery.error?.message || "Failed to load settings"}</p>;
  }

  const profile = profileQuery.data || {};
  const communityName = tenant?.communityLabels?.memberPlural || "Alumni";

  return (
    <div className="as-page">
      <header className="as-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account privacy and contact preferences.</p>
        </div>
        <Link to="/portal/profile?mode=edit" className="as-edit-profile-btn">
          Edit Full Profile
        </Link>
      </header>

      <section className="as-account-card">
        <h2 className="as-section-title">
          <span className="material-symbols-outlined" aria-hidden="true">badge</span>
          Account
        </h2>
        <div className="as-account-grid">
          <div>
            <span>Name</span>
            <strong>{profile?.name || auth.user?.name || "-"}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{profile?.userId?.email || auth.user?.email || "-"}</strong>
          </div>
          <div>
            <span>Community</span>
            <strong>{communityName}</strong>
          </div>
          <div>
            <span>Institute</span>
            <strong>{tenant?.displayName || "Your Institute"}</strong>
          </div>
        </div>
      </section>

      <form className="as-settings-card" onSubmit={saveSettings}>
        <h2 className="as-section-title">
          <span className="material-symbols-outlined" aria-hidden="true">shield_lock</span>
          Privacy and Visibility
        </h2>

        <label className="as-field">
          <span>Profile visibility</span>
          <select name="profileVisibility" value={form.profileVisibility} onChange={handleChange}>
            <option value="public">Public</option>
            <option value="institute_only">Institute only</option>
            <option value="private">Private</option>
          </select>
        </label>

        <label className="as-toggle-row">
          <input
            type="checkbox"
            name="showEmail"
            checked={form.showEmail}
            onChange={handleChange}
          />
          <div>
            <strong>Show email in directory</strong>
            <p>Allow verified members to see your email in your profile card.</p>
          </div>
        </label>

        <label className="as-toggle-row">
          <input
            type="checkbox"
            name="showPhone"
            checked={form.showPhone}
            onChange={handleChange}
          />
          <div>
            <strong>Show phone in profile</strong>
            <p>Expose your phone number to members based on your visibility level.</p>
          </div>
        </label>

        <label className="as-toggle-row">
          <input
            type="checkbox"
            name="allowMentorRequests"
            checked={form.allowMentorRequests}
            onChange={handleChange}
          />
          <div>
            <strong>Allow mentorship and connect requests</strong>
            <p>Members can send you guidance and networking requests.</p>
          </div>
        </label>

        <div className="as-footer">
          <button type="button" className="as-btn-ghost" onClick={resetSettings} disabled={!isDirty || mutation.isPending}>
            Reset
          </button>
          <button type="submit" className="as-btn-solid" disabled={!isDirty || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {saveNotice && <p className="as-success">{saveNotice}</p>}
        {mutation.isError && <p className="as-error">{mutation.error?.message || "Unable to save settings"}</p>}
      </form>
    </div>
  );
}
