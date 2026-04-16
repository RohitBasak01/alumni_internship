import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PortalPageHeader, PortalSegmentedTabs } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { createAnnouncement, deleteAnnouncement, fetchAnnouncements, resolveApiAssetUrl, updateAnnouncement } from "../lib/api.js";

const initialForm = {
  title: "",
  category: "News",
  summary: "",
  imageUrl: "",
  content: "",
  status: "published"
};

function formatArticleDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatArchiveLabel(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function buildArchiveKey(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function createSummary(item) {
  const explicitSummary = String(item.summary || "").trim();
  if (explicitSummary) {
    return explicitSummary;
  }

  const text = String(item.content || "").replace(/\s+/g, " ").trim();
  if (text.length <= 260) {
    return text;
  }

  return `${text.slice(0, 257).trim()}...`;
}

function splitArticleContent(value) {
  return String(value || "")
    .split(/\r?\n\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function NewsroomPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [activeTab, setActiveTab] = useState("published");
  const [selectedArchiveKey, setSelectedArchiveKey] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const isAdmin = auth.user?.role === "institute_admin";

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

  const newsroomArticles = useMemo(
    () =>
      data.map((item) => {
        const publishValue = item.publishedAt || item.createdAt || item.updatedAt;

        return {
          ...item,
          category: item.category || "News",
          imageUrl: resolveApiAssetUrl(item.imageUrl || ""),
          summary: createSummary(item),
          publishValue
        };
      }),
    [data]
  );

  const archiveItems = useMemo(() => {
    const counts = newsroomArticles.reduce((accumulator, item) => {
      if (item.status !== "published") {
        return accumulator;
      }

      const key = buildArchiveKey(item.publishValue);
      if (!key) {
        return accumulator;
      }

      const current = accumulator.get(key) || {
        key,
        label: formatArchiveLabel(item.publishValue),
        count: 0,
        timestamp: new Date(item.publishValue).getTime()
      };
      current.count += 1;
      accumulator.set(key, current);
      return accumulator;
    }, new Map());

    return [...counts.values()].sort((a, b) => b.timestamp - a.timestamp);
  }, [newsroomArticles]);

  const visibleArticles = useMemo(() => {
    let nextArticles = newsroomArticles;

    if (isAdmin && activeTab !== "all") {
      nextArticles = nextArticles.filter((item) => item.status === activeTab);
    }

    if (!isAdmin) {
      nextArticles = nextArticles.filter((item) => item.status === "published");
    }

    if (selectedArchiveKey !== "all") {
      nextArticles = nextArticles.filter((item) => buildArchiveKey(item.publishValue) === selectedArchiveKey);
    }

    return nextArticles.sort((a, b) => new Date(b.publishValue || 0).getTime() - new Date(a.publishValue || 0).getTime());
  }, [activeTab, isAdmin, newsroomArticles, selectedArchiveKey]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    saveMutation.mutate({
      id: editingId,
      payload: {
        ...form,
        title: form.title.trim(),
        category: form.category.trim(),
        summary: form.summary.trim(),
        imageUrl: form.imageUrl.trim(),
        content: form.content.trim()
      }
    });
  }

  function handleEdit(item) {
    setEditingId(item._id);
    setShowComposer(true);
    setForm({
      title: item.title || "",
      category: item.category || "News",
      summary: item.summary || "",
      imageUrl: item.imageUrl || "",
      content: item.content || "",
      status: item.status || "published"
    });
  }

  return (
    <div className="newsroom-page">
      <PortalPageHeader
        className="newsroom-header"
        title="Newsroom"
        subtitle="All the news and updates from your alumni network, organized like a real institute newsroom."
        actions={
          isAdmin ? (
            <div className="newsroom-header-actions">
              <button className="button secondary" type="button" onClick={() => setShowComposer((current) => !current)}>
                {showComposer ? "Close editor" : "Publish article"}
              </button>
            </div>
          ) : null
        }
      />

      {isAdmin ? (
        <PortalSegmentedTabs
          activeValue={activeTab}
          ariaLabel="Newsroom article status"
          className="newsroom-tabs"
          items={[
            { value: "published", label: "Published" },
            { value: "draft", label: "Drafts" },
            { value: "all", label: "All" }
          ]}
          onChange={setActiveTab}
        />
      ) : null}

      {isAdmin && showComposer ? (
        <SectionCard title={editingId ? "Edit newsroom article" : "Create newsroom article"} subtitle="Publish a polished update for your community">
          <form className="newsroom-composer" onSubmit={handleSubmit}>
            <input name="title" onChange={handleChange} placeholder="Article title" value={form.title} />
            <div className="newsroom-composer-row">
              <input name="category" onChange={handleChange} placeholder="Category e.g. Blog, Event, Notice" value={form.category} />
              <select className="select" name="status" onChange={handleChange} value={form.status}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <input name="imageUrl" onChange={handleChange} placeholder="Cover image URL (optional)" value={form.imageUrl} />
            <textarea
              className="textarea"
              name="summary"
              onChange={handleChange}
              placeholder="Short summary for the newsroom listing"
              rows="3"
              value={form.summary}
            />
            <textarea
              className="textarea"
              name="content"
              onChange={handleChange}
              placeholder="Write the full article body"
              rows="8"
              value={form.content}
            />
            <div className="inline-actions">
              <button className="button primary" disabled={saveMutation.isPending} type="submit">
                {saveMutation.isPending ? "Saving..." : editingId ? "Update article" : "Publish article"}
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
        </SectionCard>
      ) : null}

      <div className="newsroom-layout">
        <section className="newsroom-main">
          {isLoading ? <p>Loading newsroom...</p> : null}
          {isError ? <p className="error-text">{error.message}</p> : null}
          {!isLoading && !visibleArticles.length ? <p className="muted">No newsroom articles in this view yet.</p> : null}

          <div className="newsroom-list">
            {visibleArticles.map((item) => (
              <article className="newsroom-card" key={item._id}>
                <div className="newsroom-card-media">
                  {item.imageUrl ? (
                    <img alt={item.title} src={item.imageUrl} />
                  ) : (
                    <div className="newsroom-card-placeholder">
                      <span className="material-symbols-outlined" aria-hidden="true">campaign</span>
                    </div>
                  )}
                </div>
                <div className="newsroom-card-body">
                  <span className="newsroom-badge">{item.category}</span>
                  <h2>{item.title}</h2>
                  <p>{item.summary}</p>
                  <div className="newsroom-card-footer">
                    <div className="newsroom-card-actions">
                      <button className="button secondary compact" onClick={() => setSelectedArticle(item)} type="button">
                        Read More
                      </button>
                      {isAdmin ? (
                        <>
                          <button className="button ghost compact" onClick={() => handleEdit(item)} type="button">
                            Edit
                          </button>
                          <button
                            className="button ghost compact"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(item._id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                    <time>Posted on {formatArticleDate(item.publishValue)}</time>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="newsroom-sidebar">
          <SectionCard title="Archive" subtitle="Browse by month">
            <div className="newsroom-archive">
              <button
                className={selectedArchiveKey === "all" ? "newsroom-archive-link active" : "newsroom-archive-link"}
                onClick={() => setSelectedArchiveKey("all")}
                type="button"
              >
                <span>All articles</span>
                <small>{archiveItems.reduce((total, item) => total + item.count, 0)}</small>
              </button>
              {archiveItems.map((item) => (
                <button
                  className={selectedArchiveKey === item.key ? "newsroom-archive-link active" : "newsroom-archive-link"}
                  key={item.key}
                  onClick={() => setSelectedArchiveKey(item.key)}
                  type="button"
                >
                  <span>{item.label}</span>
                  <small>{item.count}</small>
                </button>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>

      {selectedArticle ? (
        <div className="member-dialog-backdrop" role="presentation" onClick={() => setSelectedArticle(null)}>
          <div className="member-dialog newsroom-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="member-dialog-header newsroom-dialog-header">
              <div>
                <span className="newsroom-badge">{selectedArticle.category}</span>
                <h2>{selectedArticle.title}</h2>
                <p className="muted">Posted on {formatArticleDate(selectedArticle.publishValue)}</p>
              </div>
              <button className="member-dialog-close" onClick={() => setSelectedArticle(null)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            <div className="newsroom-dialog-body">
              {selectedArticle.imageUrl ? (
                <div className="newsroom-dialog-image">
                  <img alt={selectedArticle.title} src={selectedArticle.imageUrl} />
                </div>
              ) : null}
              <p className="newsroom-dialog-summary">{selectedArticle.summary}</p>
              <div className="newsroom-dialog-content">
                {splitArticleContent(selectedArticle.content).map((paragraph, index) => (
                  <p key={`${selectedArticle._id}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default NewsroomPage;
