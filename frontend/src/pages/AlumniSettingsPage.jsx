import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { useConfirm } from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import {
  changePassword,
  deactivateAccount,
  fetchMyAlumniProfile,
  updateMyAlumniProfile,
  updateNotificationPreferences,
  updateSecurityPreferences
} from "../lib/api.js";
import "../styles/AlumniSettings.css";

const defaultPrivacyForm = {
  profileVisibility: "institute_only",
  showEmail: false,
  showPhone: false,
  allowMentorRequests: true
};

const defaultNotificationForm = {
  emailDigest: "daily",
  categories: {
    connections: true,
    jobs: true,
    events: true,
    system: true
  }
};

function buildPrivacyForm(profile) {
  return {
    profileVisibility: profile?.profileVisibility || "institute_only",
    showEmail: profile?.showEmail ?? false,
    showPhone: profile?.showPhone ?? false,
    allowMentorRequests: profile?.allowMentorRequests ?? true
  };
}

function buildNotificationForm(user) {
  return {
    ...defaultNotificationForm,
    ...(user?.notificationPreferences || {}),
    categories: {
      ...defaultNotificationForm.categories,
      ...(user?.notificationPreferences?.categories || {})
    }
  };
}

export default function AlumniSettingsPage() {
  const auth = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenant = useTenantContext();
  const theme = useTheme();
  const toast = useToast();
  const [privacyForm, setPrivacyForm] = useState(defaultPrivacyForm);
  const [notificationForm, setNotificationForm] = useState(buildNotificationForm(auth.user));
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const profileQuery = useQuery({
    queryKey: ["my-alumni-profile"],
    queryFn: fetchMyAlumniProfile,
    enabled: auth.user?.role === "alumni"
  });

  useEffect(() => {
    if (profileQuery.data) {
      setPrivacyForm(buildPrivacyForm(profileQuery.data));
    }
  }, [profileQuery.data]);

  useEffect(() => {
    setNotificationForm(buildNotificationForm(auth.user));
  }, [auth.user]);

  const privacyMutation = useMutation({
    mutationFn: updateMyAlumniProfile,
    onSuccess: async (updated) => {
      setPrivacyForm(buildPrivacyForm(updated));
      await queryClient.invalidateQueries({ queryKey: ["my-alumni-profile"] });
      toast.success("Privacy settings saved.");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Unable to save privacy settings.")
  });

  const notificationMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Notification preferences saved.");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Unable to save notification preferences.")
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password updated successfully.");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Unable to update password.")
  });

  const securityMutation = useMutation({
    mutationFn: updateSecurityPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(["current-user"], (current) => ({
        ...(current || auth.user),
        twoFactorEnabled: data.twoFactorEnabled
      }));
      toast.success(data.message || "Security preference updated.");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Unable to update security preference.")
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateAccount,
    onSuccess: async () => {
      toast.info("Your account has been deactivated.");
      await auth.logout();
      navigate("/login");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Unable to deactivate account.")
  });

  const isPrivacyDirty = useMemo(() => {
    if (!profileQuery.data) return false;
    return JSON.stringify(privacyForm) !== JSON.stringify(buildPrivacyForm(profileQuery.data));
  }, [privacyForm, profileQuery.data]);

  function handlePrivacyChange(event) {
    const { checked, name, type, value } = event.target;
    setPrivacyForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleNotificationChange(event) {
    const { checked, name, type, value } = event.target;

    if (name.startsWith("category.")) {
      const category = name.replace("category.", "");
      setNotificationForm((current) => ({
        ...current,
        categories: {
          ...current.categories,
          [category]: checked
        }
      }));
      return;
    }

    setNotificationForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function savePrivacy(event) {
    event.preventDefault();
    privacyMutation.mutate(privacyForm);
  }

  function saveNotifications(event) {
    event.preventDefault();
    notificationMutation.mutate(notificationForm);
  }

  function savePassword(event) {
    event.preventDefault();
    passwordMutation.mutate(passwordForm);
  }

  async function confirmDeactivate() {
    const confirmed = await confirm({
      title: "Deactivate your account?",
      message: "You will be signed out immediately and your account will no longer be active.",
      confirmLabel: "Deactivate",
      destructive: true
    });

    if (confirmed) {
      deactivateMutation.mutate();
    }
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
          <p>Manage privacy, security, notifications, appearance, and account status.</p>
        </div>
        <Link className="as-edit-profile-btn" to="/portal/profile?mode=edit">Edit Full Profile</Link>
      </header>

      <section className="as-account-card">
        <h2 className="as-section-title"><span className="material-symbols-outlined">badge</span>Account</h2>
        <div className="as-account-grid">
          <div><span>Name</span><strong>{profile?.name || auth.user?.name || "-"}</strong></div>
          <div><span>Email</span><strong>{profile?.userId?.email || auth.user?.email || "-"}</strong></div>
          <div><span>Community</span><strong>{communityName}</strong></div>
          <div><span>Institute</span><strong>{tenant?.displayName || "Your Institute"}</strong></div>
        </div>
      </section>

      <form className="as-settings-card" onSubmit={savePassword}>
        <h2 className="as-section-title"><span className="material-symbols-outlined">lock</span>Security</h2>
        <div className="as-form-grid">
          <label className="as-field"><span>Current password</span><input name="currentPassword" onChange={handlePasswordChange} type="password" value={passwordForm.currentPassword} /></label>
          <label className="as-field"><span>New password</span><input name="newPassword" onChange={handlePasswordChange} type="password" value={passwordForm.newPassword} /></label>
          <label className="as-field"><span>Confirm new password</span><input name="confirmPassword" onChange={handlePasswordChange} type="password" value={passwordForm.confirmPassword} /></label>
        </div>
        <label className="as-toggle-row">
          <input
            checked={Boolean(auth.user?.twoFactorEnabled)}
            onChange={(event) => securityMutation.mutate({ twoFactorEnabled: event.target.checked })}
            type="checkbox"
          />
          <div><strong>Two-factor authentication</strong><p>Mark this account as using an extra verification step.</p></div>
        </label>
        <div className="as-footer"><button className="as-btn-solid" disabled={passwordMutation.isPending} type="submit">{passwordMutation.isPending ? "Updating..." : "Update Password"}</button></div>
      </form>

      <form className="as-settings-card" onSubmit={saveNotifications}>
        <h2 className="as-section-title"><span className="material-symbols-outlined">notifications</span>Notifications</h2>
        <label className="as-field">
          <span>Email digest frequency</span>
          <select name="emailDigest" onChange={handleNotificationChange} value={notificationForm.emailDigest}>
            <option value="realtime">Real-time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="off">Off</option>
          </select>
        </label>
        {[
          ["connections", "Connection requests and messages"],
          ["jobs", "Jobs and career updates"],
          ["events", "Events and reunions"],
          ["system", "System and account alerts"]
        ].map(([key, label]) => (
          <label className="as-toggle-row" key={key}>
            <input checked={Boolean(notificationForm.categories[key])} name={`category.${key}`} onChange={handleNotificationChange} type="checkbox" />
            <div><strong>{label}</strong><p>Receive updates for this notification category.</p></div>
          </label>
        ))}
        <div className="as-footer"><button className="as-btn-solid" disabled={notificationMutation.isPending} type="submit">{notificationMutation.isPending ? "Saving..." : "Save Notifications"}</button></div>
      </form>

      <form className="as-settings-card" onSubmit={savePrivacy}>
        <h2 className="as-section-title"><span className="material-symbols-outlined">shield_lock</span>Privacy and Visibility</h2>
        <label className="as-field">
          <span>Profile visibility</span>
          <select name="profileVisibility" onChange={handlePrivacyChange} value={privacyForm.profileVisibility}>
            <option value="public">Public</option>
            <option value="institute_only">Institute only</option>
            <option value="private">Private</option>
          </select>
        </label>
        {[
          ["showEmail", "Show email in directory", "Allow verified members to see your email."],
          ["showPhone", "Show phone in profile", "Expose your phone number based on your visibility level."],
          ["allowMentorRequests", "Allow mentorship and connect requests", "Members can send you guidance and networking requests."]
        ].map(([key, title, description]) => (
          <label className="as-toggle-row" key={key}>
            <input checked={Boolean(privacyForm[key])} name={key} onChange={handlePrivacyChange} type="checkbox" />
            <div><strong>{title}</strong><p>{description}</p></div>
          </label>
        ))}
        <div className="as-footer">
          <button className="as-btn-ghost" disabled={!isPrivacyDirty || privacyMutation.isPending} onClick={() => setPrivacyForm(buildPrivacyForm(profileQuery.data || defaultPrivacyForm))} type="button">Reset</button>
          <button className="as-btn-solid" disabled={!isPrivacyDirty || privacyMutation.isPending} type="submit">{privacyMutation.isPending ? "Saving..." : "Save Privacy"}</button>
        </div>
      </form>

      <section className="as-settings-card">
        <h2 className="as-section-title"><span className="material-symbols-outlined">palette</span>Appearance</h2>
        <label className="as-field">
          <span>Theme preference</span>
          <select onChange={(event) => event.target.value === "dark" ? theme.setDarkTheme() : theme.setLightTheme()} value={theme.theme}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </section>

      <section className="as-settings-card as-danger-zone">
        <h2 className="as-section-title"><span className="material-symbols-outlined">warning</span>Danger Zone</h2>
        <p>Deactivate your account if you no longer want access to this alumni portal.</p>
        <button className="as-btn-danger" disabled={deactivateMutation.isPending} onClick={confirmDeactivate} type="button">
          {deactivateMutation.isPending ? "Deactivating..." : "Deactivate Account"}
        </button>
      </section>
    </div>
  );
}
