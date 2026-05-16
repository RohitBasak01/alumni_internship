import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext.jsx";
import { formatRelativeTime } from "../utils/formatters.js";
import {
  fetchForumThreads, fetchForumThread, createForumThread, deleteForumThread,
  postForumReply, upvoteForumThread, upvoteForumReply, pinForumThread,
  lockForumThread, acceptForumReply
} from "../lib/api.js";
import "../styles/Forum.css";

/* ── Helpers ──────────────────────────────────────────── */
const CATEGORIES = ["general", "career", "technical", "campus", "other"];

const initialForm = { title: "", body: "", category: "general", tags: "" };

/* ── Create Thread Modal ─────────────────────────────── */
function ThreadModal({ onClose, onSubmit, isPending }) {
  const [form, setForm] = useState(initialForm);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    onSubmit({
      ...form,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean)
    });
  }

  return (
    <div className="fm-modal-backdrop" onClick={onClose}>
      <div className="fm-modal" onClick={e => e.stopPropagation()}>
        <div className="fm-modal-header">
          <h3 className="fm-modal-title">Start a Discussion</h3>
          <button className="fm-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="fm-modal-body">
            <div className="fm-form-group">
              <label className="fm-label">Title *</label>
              <input className="fm-input" name="title" value={form.title} onChange={handleChange} placeholder="What's on your mind?" required />
            </div>
            <div className="fm-form-group">
              <label className="fm-label">Category</label>
              <select className="fm-input" name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="fm-form-group">
              <label className="fm-label">Body *</label>
              <textarea className="fm-input fm-textarea" name="body" value={form.body} onChange={handleChange} placeholder="Provide details, ask a question, or share information..." required />
            </div>
            <div className="fm-form-group">
              <label className="fm-label">Tags (comma separated)</label>
              <input className="fm-input" name="tags" value={form.tags} onChange={handleChange} placeholder="e.g. react, interview, help" />
            </div>
          </div>
          <div className="fm-modal-footer">
            <button type="button" className="fm-btn fm-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="fm-btn fm-btn-primary" disabled={isPending}>
              {isPending ? "Posting..." : "Post Thread"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Thread Detail View ──────────────────────────────── */
function ThreadDetail({ threadId, onBack, isAdmin, currentUser }) {
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState("");

  const { data: thread, isLoading } = useQuery({
    queryKey: ["forumThread", threadId],
    queryFn: () => fetchForumThread(threadId)
  });

  const replyMut = useMutation({
    mutationFn: body => postForumReply(threadId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forumThread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["forumThreads"] });
      setReplyBody("");
    }
  });

  const upvoteMut = useMutation({
    mutationFn: () => upvoteForumThread(threadId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forumThread", threadId] })
  });

  const upvoteReplyMut = useMutation({
    mutationFn: id => upvoteForumReply(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forumThread", threadId] })
  });

  const acceptMut = useMutation({
    mutationFn: id => acceptForumReply(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forumThread", threadId] })
  });

  const togglePinMut = useMutation({
    mutationFn: () => pinForumThread(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forumThread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["forumThreads"] });
    }
  });

  const toggleLockMut = useMutation({
    mutationFn: () => lockForumThread(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forumThread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["forumThreads"] });
    }
  });

  if (isLoading) return <div className="fm-empty">Loading discussion...</div>;
  if (!thread) return <div className="fm-empty">Thread not found.</div>;

  const isAuthor = thread.authorId?._id === currentUser._id;

  return (
    <div className="fm-main">
      <button className="fm-detail-back" onClick={onBack}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        Back to Discussions
      </button>

      {/* OP Card */}
      <div className="fm-detail-card" style={{ borderColor: thread.isPinned ? "#f59e0b" : "#e2e8f0" }}>
        <div style={{ display: "flex", gap: "1.25rem" }}>
          <div className="fm-vote-col">
            <button className={`fm-vote-btn ${thread.hasUpvoted ? "active" : ""}`} onClick={() => upvoteMut.mutate()}>
              <span className="material-symbols-outlined">expand_less</span>
            </button>
            <span className="fm-vote-count">{thread.upvoteCount}</span>
          </div>
          <div className="fm-thread-body">
            <div className="fm-thread-title-row">
              <h1 className="fm-detail-title">{thread.title}</h1>
              {thread.isPinned && <span className="fm-pin-badge">Pinned</span>}
              {thread.isLocked && <span className="fm-lock-badge">Locked</span>}
            </div>
            <div className="fm-detail-meta" style={{ borderTop: "none", paddingTop: 0, paddingBottom: "1rem" }}>
              <span><span className="material-symbols-outlined">person</span> {thread.authorId?.name || "Unknown"}</span>
              <span><span className="material-symbols-outlined">schedule</span> {formatRelativeTime(thread.createdAt)}</span>
              <span className="fm-cat-badge">{thread.category}</span>
            </div>
            <div className="fm-detail-body">{thread.body}</div>
            
            {thread.tags?.length > 0 && (
              <div style={{ display: "flex", gap: "0.4rem", marginTop: "1rem" }}>
                {thread.tags.map(t => <span key={t} className="fm-tag">#{t}</span>)}
              </div>
            )}

            <div className="fm-detail-meta" style={{ marginTop: "1rem" }}>
              <span><span className="material-symbols-outlined">visibility</span> {thread.viewCount} Views</span>
              <span><span className="material-symbols-outlined">chat_bubble</span> {thread.replyCount} Replies</span>
              
              <div style={{ flex: 1 }} />
              {isAdmin && (
                <div className="fm-detail-actions">
                  <button className="fm-btn fm-btn-ghost" onClick={() => togglePinMut.mutate()}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>keep</span>
                    {thread.isPinned ? "Unpin" : "Pin"}
                  </button>
                  <button className="fm-btn fm-btn-ghost" onClick={() => toggleLockMut.mutate()}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{thread.isLocked ? "lock_open" : "lock"}</span>
                    {thread.isLocked ? "Unlock" : "Lock"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      <h3 className="fm-replies-header">
        <span className="material-symbols-outlined">forum</span>
        {thread.replies?.length || 0} Replies
      </h3>

      {thread.replies?.map(reply => (
        <div key={reply._id} className={`fm-reply ${reply.isAccepted ? "accepted" : ""}`}>
          <div className="fm-vote-col" style={{ minWidth: 32 }}>
            <button className={`fm-vote-btn ${reply.hasUpvoted ? "active" : ""}`} onClick={() => upvoteReplyMut.mutate(reply._id)}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_less</span>
            </button>
            <span className="fm-vote-count" style={{ fontSize: "0.9rem" }}>{reply.upvoteCount}</span>
          </div>
          <div className="fm-reply-body">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="fm-reply-author">{reply.authorId?.name || "Unknown"}</span>
              {reply.authorId?._id === thread.authorId?._id && <span className="fm-tag" style={{ background: "#fef3c7", color: "#92400e" }}>OP</span>}
              <span className="fm-reply-time">{formatRelativeTime(reply.createdAt)}</span>
              {reply.isAccepted && <span className="fm-accepted-badge" style={{ marginLeft: "auto" }}>Best Answer</span>}
            </div>
            <div className="fm-reply-text">{reply.body}</div>
            
            <div className="fm-reply-actions">
              {(isAuthor || isAdmin) && (
                <button 
                  className={`fm-reply-action-btn ${reply.isAccepted ? "accepted" : ""}`}
                  onClick={() => acceptMut.mutate(reply._id)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>task_alt</span>
                  {reply.isAccepted ? "Accepted Answer" : "Mark as Best Answer"}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Reply Composer */}
      {!thread.isLocked ? (
        <div className="fm-reply-composer">
          <div className="fm-reply-avatar" style={{ background: "#6366f1" }}>
            {currentUser.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <textarea 
              className="fm-reply-textarea" 
              placeholder="Write a reply..." 
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button 
                className="fm-btn fm-btn-primary" 
                onClick={() => { if(replyBody.trim()) replyMut.mutate(replyBody); }}
                disabled={!replyBody.trim() || replyMut.isPending}
              >
                {replyMut.isPending ? "Posting..." : "Post Reply"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fm-empty" style={{ padding: "1.5rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, marginBottom: "0.5rem" }}>lock</span>
          <p>This discussion has been locked by an administrator.</p>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────── */
export default function ForumPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = auth.user?.role === "institute_admin";

  const [showModal, setShowModal] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);
  
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["forumThreads", categoryFilter, deferredSearch],
    queryFn: () => fetchForumThreads({
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      search: deferredSearch || undefined
    })
  });

  const createMut = useMutation({
    mutationFn: createForumThread,
    onSuccess: (newThread) => { 
      queryClient.invalidateQueries({ queryKey: ["forumThreads"] }); 
      setShowModal(false); 
      setActiveThreadId(newThread._id);
    }
  });

  const upvoteMut = useMutation({
    mutationFn: id => upvoteForumThread(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forumThreads"] })
  });

  const deleteMut = useMutation({
    mutationFn: id => deleteForumThread(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forumThreads"] })
  });

  if (activeThreadId) {
    return (
      <div className="fm-root">
        <ThreadDetail 
          threadId={activeThreadId} 
          onBack={() => setActiveThreadId(null)}
          isAdmin={isAdmin}
          currentUser={auth.user}
        />
      </div>
    );
  }

  const threads = data?.threads || [];

  return (
    <div className="fm-root">
      {/* Header */}
      <div className="fm-header">
        <div>
          <h1 className="fm-title">Discussion Forums</h1>
          <p className="fm-sub">Ask questions, share knowledge, and connect with peers.</p>
        </div>
        <button className="fm-btn fm-btn-primary" onClick={() => setShowModal(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Start Discussion
        </button>
      </div>

      <div className="fm-layout">
        {/* Main List */}
        <div className="fm-main">
          {/* Toolbar */}
          <div className="fm-toolbar">
            <div className="fm-search-wrap">
              <span className="material-symbols-outlined fm-search-icon">search</span>
              <input 
                className="fm-search-input" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search discussions, tags..." 
              />
            </div>
            <div className="fm-cat-pills">
              <button 
                className={`fm-cat-pill ${categoryFilter === "all" ? "active" : ""}`}
                onClick={() => setCategoryFilter("all")}
              >All</button>
              {CATEGORIES.map(c => (
                <button 
                  key={c}
                  className={`fm-cat-pill ${categoryFilter === c ? "active" : ""}`}
                  onClick={() => setCategoryFilter(c)}
                >{c}</button>
              ))}
            </div>
          </div>

          {isLoading && <p style={{ color: "#94a3b8", padding: "2rem", textAlign: "center" }}>Loading discussions...</p>}

          {!isLoading && threads.length === 0 && (
            <div className="fm-empty">
              <span className="material-symbols-outlined">forum</span>
              <h3>No discussions found</h3>
              <p>Be the first to start a conversation in this category!</p>
            </div>
          )}

          {!isLoading && threads.map(t => (
            <div 
              key={t._id} 
              className={`fm-thread ${t.isPinned ? "pinned" : ""}`}
              onClick={() => setActiveThreadId(t._id)}
            >
              <div className="fm-vote-col" onClick={e => e.stopPropagation()}>
                <button className={`fm-vote-btn ${t.hasUpvoted ? "active" : ""}`} onClick={() => upvoteMut.mutate(t._id)}>
                  <span className="material-symbols-outlined">expand_less</span>
                </button>
                <span className="fm-vote-count">{t.upvoteCount}</span>
              </div>
              <div className="fm-thread-body">
                <div className="fm-thread-title-row">
                  <h3 className="fm-thread-title">{t.title}</h3>
                  {t.isPinned && <span className="fm-pin-badge">Pinned</span>}
                  {t.isLocked && <span className="fm-lock-badge">Locked</span>}
                </div>
                <p className="fm-thread-excerpt">{t.body}</p>
                <div className="fm-thread-meta">
                  <span className="fm-cat-badge">{t.category}</span>
                  <span><span className="material-symbols-outlined">person</span> {t.authorId?.name || "Unknown"}</span>
                  <span><span className="material-symbols-outlined">schedule</span> {formatRelativeTime(t.createdAt)}</span>
                  <span><span className="material-symbols-outlined">chat_bubble</span> {t.replyCount} Replies</span>
                  <span><span className="material-symbols-outlined">visibility</span> {t.viewCount} Views</span>
                  
                  {(isAdmin || t.authorId?._id === auth.user?._id) && (
                    <button 
                      className="fm-btn-ghost" 
                      style={{ marginLeft: "auto", padding: "0.1rem", fontSize: "0.75rem" }}
                      onClick={e => { e.stopPropagation(); if(window.confirm("Delete thread?")) deleteMut.mutate(t._id); }}
                    >Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <aside className="fm-sidebar">
          <div className="fm-sidebar-card">
            <h3 className="fm-sidebar-title">Forum Stats</h3>
            <div className="fm-sidebar-stat">
              <span>Total Threads</span>
              <strong>{data?.total || 0}</strong>
            </div>
            <div className="fm-sidebar-stat" style={{ borderBottom: "none" }}>
              <span>Categories</span>
              <strong>{CATEGORIES.length}</strong>
            </div>
          </div>
          
          <div className="fm-sidebar-card">
            <h3 className="fm-sidebar-title">Guidelines</h3>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem", color: "#475569", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <li>Be respectful and constructive.</li>
              <li>Search before posting a new question.</li>
              <li>Mark helpful replies as the "Best Answer".</li>
              <li>Keep discussions relevant to the category.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Create Modal */}
      {showModal && (
        <ThreadModal
          onClose={() => setShowModal(false)}
          onSubmit={form => createMut.mutate(form)}
          isPending={createMut.isPending}
        />
      )}
    </div>
  );
}
