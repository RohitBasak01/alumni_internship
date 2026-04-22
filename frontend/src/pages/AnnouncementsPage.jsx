import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PortalPageHeader, PortalSegmentedTabs } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { createAnnouncement, deleteAnnouncement, fetchAnnouncements, updateAnnouncement } from "../lib/api.js";
import { getTenantDisplayConfig } from "../utils/tenantDisplay.js";

const initialForm = {
  title: "",
  content: "",
  status: "published"
};

function formatRelativeTime(value) {
  const diffMs = Date.now() - new Date(value).getTime();
  const hour = 1000 * 60 * 60;
  const day = hour * 24;

  if (diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / (1000 * 60)))} min ago`;
  }

  if (diffMs < day) {
    return `${Math.max(1, Math.floor(diffMs / hour))} hr ago`;
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function AnnouncementsPage() {
  const auth = useAuth();
  const tenant = useTenantContext();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [activeTab, setActiveTab] = useState("published");
  const isAdmin = auth.user?.role === "institute_admin";
  const tenantDisplay = getTenantDisplayConfig(tenant);

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateAnnouncement(id, payload) : createAnnouncement(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["announcements"] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notification-summary"] });
      setForm(initialForm);
      setEditingId(null);
      setShowComposer(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["announcements"] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
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

  const visibleAnnouncements = useMemo(() => {
    if (!isAdmin) {
      return data;
    }

    if (activeTab === "all") {
      return data;
    }

    return data.filter((item) => item.status === activeTab);
  }, [activeTab, data, isAdmin]);

  return (
    <div className="notifications-page">
      <PortalPageHeader
        className="notifications-header"
        title="Updates"
        subtitle={`Announcements, notices, and official updates for the ${tenantDisplay.memberPlural.toLowerCase()} community.`}
        actions={
          isAdmin ? (
            <div className="notifications-header-actions">
              <button className="button secondary" type="button" onClick={() => setShowComposer((current) => !current)}>
                {showComposer ? "Close composer" : "Create update"}
              </button>
            </div>
          ) : null
        }
      />

      {isAdmin ? (
        <PortalSegmentedTabs
          activeValue={activeTab}
          ariaLabel="Announcement status"
          className="notifications-tabs"
          items={[
            { value: "published", label: "Published" },
            { value: "draft", label: "Drafts" },
            { value: "all", label: "All" }
          ]}
          onChange={setActiveTab}
        />
      ) : null}

      {isAdmin && showComposer ? (
        <SectionCard title={editingId ? "Edit update" : "Create update"} subtitle={`${tenantDisplay.adminLabel} composer`}>
          <form className="form-grid" onSubmit={handleSubmit}>
            <input name="title" onChange={handleChange} placeholder="Update title" value={form.title} />
            <textarea
              className="textarea"
              name="content"
              onChange={handleChange}
              placeholder={`Share an update with ${tenantDisplay.memberPlural.toLowerCase()}`}
              rows="5"
              value={form.content}
            />
            <select className="select" name="status" onChange={handleChange} value={form.status}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <div className="inline-actions">
              <button className="button primary" disabled={saveMutation.isPending} type="submit">
                {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Publish"}
              </button>
              <button className="button secondary" onClick={() => { setEditingId(null); setForm(initialForm); setShowComposer(false); }} type="button">
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      {isLoading ? <p>Loading updates...</p> : null}
      {isError ? <p className="error-text">{error.message}</p> : null}
      {!isLoading && !visibleAnnouncements.length ? <p className="muted">No updates in this view yet.</p> : null}

      <div className="notifications-list">
        {visibleAnnouncements.map((item) => (
          <article className="notifications-card gray" key={item._id}>
            <div className="notifications-icon gray">
              <span className="material-symbols-outlined">campaign</span>
            </div>
            <div className="notifications-copy">
              <h3>{item.title}</h3>
              <p>{item.content}</p>
              <div className="notifications-card-actions">
                {isAdmin ? (
                  <>
                    <button className="button secondary compact" onClick={() => handleEdit(item)} type="button">Edit</button>
                    <button className="button secondary compact" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(item._id)} type="button">Delete</button>
                  </>
                ) : (
                  <span className="member-status-pill status-active">{tenantDisplay.adminLabel} update</span>
                )}
              </div>
            </div>
            <time>{formatRelativeTime(item.createdAt || new Date())}</time>
          </article>
        ))}
      </div>
    </div>
  );
}

export default AnnouncementsPage;

