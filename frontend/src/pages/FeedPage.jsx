import { useRef, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAlumniPosts,
  fetchEvents,
  fetchAlumni,
  createAlumniPost,
  toggleAlumniPostLike,
  addAlumniPostComment,
  reportAlumniPost,
} from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatRelativeTime } from "../utils/formatters.js";
import "../styles/Feed.css";

/* ── Avatar color palette ─────────────────────────────────── */
const AVATAR_COLORS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#0ea5e9,#38bdf8)",
  "linear-gradient(135deg,#10b981,#34d399)",
  "linear-gradient(135deg,#f59e0b,#fbbf24)",
  "linear-gradient(135deg,#ec4899,#f472b6)",
];

function avatarColor(seed) {
  const n = Math.abs(((seed || "a").charCodeAt(0) || 65) - 65) % AVATAR_COLORS.length;
  return AVATAR_COLORS[n];
}

function readStoredPostIds(key) {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

/* ── Post card ───────────────────────────────────────────── */
function PostCard({
  post,
  onLike,
  commentsOpen,
  commentDraft,
  onToggleComments,
  onCommentDraftChange,
  onCommentSubmit,
  onShare,
  onSave,
  onHide,
  onReport,
  pendingComment,
  pendingReport,
  shareStatus,
  isSaved,
}) {
  const [liked, setLiked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLike() {
    setLiked((l) => !l);
    onLike?.(post._id);
  }

  return (
    <article className="feed-post-card">
      {/* Header */}
      <div className="feed-post-header">
        <div
          className="feed-post-avatar"
          style={{ background: avatarColor(post._id) }}
        >
          {post.author?.initials || (post.author?.name || "A")[0]}
        </div>
        <div className="feed-post-meta">
          <div className="feed-post-author-row">
            <span className="feed-post-author">{post.author?.name}</span>
            <span className="feed-post-badge">Alumni</span>
          </div>
          <div className="feed-post-sub">
            {post.author?.designation}
            {post.author?.batch ? ` · ${post.author.batch}` : ""}
          </div>
        </div>
        <span className="feed-post-time">{formatRelativeTime(post.createdAt)}</span>
        <div className="feed-post-menu-wrap">
          <button
            className="feed-post-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              more_horiz
            </span>
          </button>
          {menuOpen && (
            <div className="feed-post-menu-dropdown">
              <button
                onClick={() => {
                  onSave(post._id);
                  setMenuOpen(false);
                }}
              >
                {isSaved ? "Unsave post" : "Save post"}
              </button>
              <button
                onClick={() => {
                  onHide(post._id);
                  setMenuOpen(false);
                }}
              >
                Hide post
              </button>
              <button
                onClick={() => {
                  onReport(post);
                  setMenuOpen(false);
                }}
                disabled={pendingReport || post.reportedByCurrentUser}
                style={{ color: "#ef4444" }}
              >
                {post.reportedByCurrentUser ? "Reported" : pendingReport ? "Reporting..." : "Report"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="feed-post-content">{post.content}</p>

      {/* Images */}
      {post.images?.length > 0 && (
        <div
          className={`feed-post-images feed-post-images--${Math.min(
            post.images.length,
            3
          )}`}
        >
          {post.images.slice(0, 3).map((src, i) => (
            <img key={i} src={src} alt="" className="feed-post-img" loading="lazy" />
          ))}
        </div>
      )}

      {post.videos?.length > 0 && (
        <div className="feed-post-videos">
          {post.videos.map((video, i) => (
            <a key={`${video.url}-${i}`} href={video.url} target="_blank" rel="noreferrer" className="feed-post-video-link">
              <span className="material-symbols-outlined">play_circle</span>
              <span>{video.name || "Watch video"}</span>
              <span className="material-symbols-outlined">open_in_new</span>
            </a>
          ))}
        </div>
      )}

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="feed-post-tags">
          {post.tags.map((t) => (
            <span key={t} className="feed-post-tag">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="feed-post-actions">
        <button
          className={`feed-action-btn ${liked ? "feed-action-btn--liked" : ""}`}
          onClick={handleLike}
          aria-label="Like"
        >
          <span className="material-symbols-outlined">
            {liked ? "favorite" : "favorite_border"}
          </span>
          {(post.likeCount || 0) + (liked ? 1 : 0)}
        </button>
        <button
          className={`feed-action-btn ${commentsOpen ? "feed-action-btn--active" : ""}`}
          onClick={() => onToggleComments(post._id)}
          aria-label="Comment"
        >
          <span className="material-symbols-outlined">chat_bubble_outline</span>
          {post.commentCount || 0}
        </button>
        <button className="feed-action-btn" onClick={() => onShare(post)} aria-label="Share">
          <span className="material-symbols-outlined">reply</span>
          {shareStatus === "copied" ? "Copied" : post.shareCount || 0}
        </button>
        <button
          className={`feed-action-btn feed-action-btn--bookmark ${isSaved ? "feed-action-btn--active" : ""}`}
          onClick={() => onSave(post._id)}
          aria-label="Bookmark"
        >
          <span className="material-symbols-outlined">{isSaved ? "bookmark" : "bookmark_border"}</span>
        </button>
      </div>

      {commentsOpen && (
        <div className="feed-post-comments">
          <div className="feed-comment-list">
            {post.comments?.length ? (
              post.comments.map((comment) => (
                <article className="feed-comment-item" key={comment._id}>
                  <div
                    className="feed-comment-avatar"
                    style={{ background: avatarColor(comment.author?.id || comment._id) }}
                  >
                    {comment.author?.initials || (comment.author?.name || "A")[0]}
                  </div>
                  <div className="feed-comment-body">
                    <div className="feed-comment-meta">
                      <strong>{comment.author?.name || "Alumni"}</strong>
                      <span>{formatRelativeTime(comment.createdAt)}</span>
                    </div>
                    <p>{comment.content}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="feed-comment-empty">No comments yet. Start the conversation.</p>
            )}
          </div>

          <form
            className="feed-comment-form"
            onSubmit={(event) => {
              event.preventDefault();
              onCommentSubmit(post._id);
            }}
          >
            <textarea
              className="feed-comment-input"
              rows={2}
              value={commentDraft}
              onChange={(event) => onCommentDraftChange(post._id, event.target.value)}
              placeholder="Write a comment..."
            />
            <button
              className="feed-comment-submit"
              type="submit"
              disabled={pendingComment || commentDraft.trim().length < 2}
            >
              {pendingComment ? "Posting..." : "Post"}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

/* ── Post composer ───────────────────────────────────────── */
function PostComposerCard({ userInitial, onPost, onCreateEvent }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const photoInputRef = useRef(null);

  const trimmedPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean);

  function buildPostPayload() {
    const fallbackContent = attachments.some((attachment) => attachment.mimeType.startsWith("image/"))
      ? "Shared a photo"
      : attachments.some((attachment) => attachment.mimeType.startsWith("video"))
        ? "Shared a video"
        : "";
    const pollText =
      pollOpen && pollQuestion.trim() && trimmedPollOptions.length >= 2
        ? [
            "",
            `Poll: ${pollQuestion.trim()}`,
            ...trimmedPollOptions.map((option, index) => `${index + 1}. ${option}`),
          ].join("\n")
        : "";

    return {
      content: `${text.trim() || fallbackContent}${pollText}`.trim(),
      attachments,
    };
  }

  function handleSubmit() {
    const payload = buildPostPayload();
    if (!payload.content || payload.content.length < 10) return;
    onPost?.(payload);
    setText("");
    setAttachments([]);
    setPollOpen(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setFocused(false);
  }

  function handlePhotoSelect(event) {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((current) => [
          ...current,
          {
            name: file.name,
            url: String(reader.result || ""),
            mimeType: file.type,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  }

  function handleVideoAdd() {
    const url = window.prompt("Paste a video URL");
    const trimmedUrl = String(url || "").trim();
    if (!trimmedUrl) return;

    setAttachments((current) => [
      ...current,
      {
        name: "Video link",
        url: trimmedUrl,
        mimeType: "video/link",
        size: 0,
      },
    ]);
  }

  function updatePollOption(index, value) {
    setPollOptions((current) => current.map((option, i) => (i === index ? value : option)));
  }

  function addPollOption() {
    setPollOptions((current) => (current.length >= 4 ? current : [...current, ""]));
  }

  function removeAttachment(url) {
    setAttachments((current) => current.filter((attachment) => attachment.url !== url));
  }

  return (
    <div className="feed-composer-card">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handlePhotoSelect}
      />
      <div className="feed-composer-top">
        <div className="feed-composer-avatar">{userInitial}</div>
        <div
          className={`feed-composer-input-wrap ${
            focused ? "feed-composer-input-wrap--focused" : ""
          }`}
          onClick={() => setFocused(true)}
        >
          <textarea
            className="feed-composer-input"
            placeholder="Share an update with your network..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            rows={focused ? 3 : 1}
          />
        </div>
      </div>

      <div className="feed-composer-divider" />

      <div className="feed-composer-actions">
        <div className="feed-composer-types">
          <button className="feed-composer-type-btn" type="button" onClick={() => photoInputRef.current?.click()}>
            <span
              className="material-symbols-outlined"
              style={{ color: "#22c55e" }}
            >
              image
            </span>
            Photo
          </button>
          <button className="feed-composer-type-btn" type="button" onClick={handleVideoAdd}>
            <span
              className="material-symbols-outlined"
              style={{ color: "#6366f1" }}
            >
              videocam
            </span>
            Video
          </button>
          <button className="feed-composer-type-btn" type="button" onClick={onCreateEvent}>
            <span
              className="material-symbols-outlined"
              style={{ color: "#f59e0b" }}
            >
              event
            </span>
            Event
          </button>
          <button
            className={`feed-composer-type-btn ${pollOpen ? "feed-composer-type-btn--active" : ""}`}
            type="button"
            onClick={() => setPollOpen((open) => !open)}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: "#ef4444" }}
            >
              bar_chart
            </span>
            Poll
          </button>
        </div>
        <button
          className="feed-composer-post-btn"
          onClick={handleSubmit}
          disabled={buildPostPayload().content.length < 10}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            send
          </span>
          Post
        </button>
      </div>

      {(attachments.length > 0 || pollOpen) && (
        <div className="feed-composer-extras">
          {attachments.length > 0 && (
            <div className="feed-composer-attachments">
              {attachments.map((attachment) => (
                <div className="feed-composer-attachment" key={attachment.url}>
                  <span className="material-symbols-outlined">
                    {attachment.mimeType.startsWith("image/") ? "image" : "videocam"}
                  </span>
                  <span>{attachment.name}</span>
                  <button type="button" onClick={() => removeAttachment(attachment.url)} aria-label={`Remove ${attachment.name}`}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {pollOpen && (
            <div className="feed-composer-poll">
              <input
                className="feed-poll-input"
                value={pollQuestion}
                onChange={(event) => setPollQuestion(event.target.value)}
                placeholder="Poll question"
              />
              <div className="feed-poll-options">
                {pollOptions.map((option, index) => (
                  <input
                    key={index}
                    className="feed-poll-input"
                    value={option}
                    onChange={(event) => updatePollOption(index, event.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                ))}
              </div>
              {pollOptions.length < 4 && (
                <button type="button" className="feed-poll-add" onClick={addPollOption}>
                  <span className="material-symbols-outlined">add</span>
                  Add option
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main FeedPage ───────────────────────────────────────── */
export default function FeedPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userName = auth.user?.name || "User";
  const userInitial = (auth.user?.name || "U")[0]?.toUpperCase();
  const [openComments, setOpenComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [shareStatus, setShareStatus] = useState({});
  const savedStorageKey = `feed-saved-posts:${auth.user?.id || "guest"}`;
  const hiddenStorageKey = `feed-hidden-posts:${auth.user?.id || "guest"}`;
  const [savedPosts, setSavedPosts] = useState(() => readStoredPostIds(savedStorageKey));
  const [hiddenPosts, setHiddenPosts] = useState(() => readStoredPostIds(hiddenStorageKey));

  const postsQuery = useQuery({ queryKey: ["alumni-posts"], queryFn: fetchAlumniPosts });
  const eventsQuery = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const alumniQuery = useQuery({ queryKey: ["alumni"], queryFn: fetchAlumni });

  const createPostMutation = useMutation({
    mutationFn: (payload) => createAlumniPost(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alumni-posts"] }),
  });

  const likeMutation = useMutation({
    mutationFn: toggleAlumniPostLike,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alumni-posts"] }),
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }) => addAlumniPostComment(id, { content }),
    onSuccess: (_, vars) => {
      setCommentDrafts((drafts) => ({ ...drafts, [vars.id]: "" }));
      queryClient.invalidateQueries({ queryKey: ["alumni-posts"] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: ({ id, reason }) => reportAlumniPost(id, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alumni-posts"] }),
  });

  function toggleComments(postId) {
    setOpenComments((current) => ({ ...current, [postId]: !current[postId] }));
  }

  function updateCommentDraft(postId, value) {
    setCommentDrafts((current) => ({ ...current, [postId]: value }));
  }

  function submitComment(postId) {
    const content = String(commentDrafts[postId] || "").trim();
    if (content.length < 2) return;
    commentMutation.mutate({ id: postId, content });
  }

  function persistPostIds(key, updater, setter) {
    setter((current) => {
      const next = updater(current);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }

  function toggleSavePost(postId) {
    persistPostIds(
      savedStorageKey,
      (current) => current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId],
      setSavedPosts
    );
  }

  function hidePost(postId) {
    persistPostIds(
      hiddenStorageKey,
      (current) => current.includes(postId) ? current : [...current, postId],
      setHiddenPosts
    );
  }

  function reportPost(post) {
    if (post.reportedByCurrentUser || reportMutation.isPending) return;

    const reason = window.prompt("Why are you reporting this post?");
    const trimmedReason = String(reason || "").trim();
    if (trimmedReason.length < 5) return;

    reportMutation.mutate({ id: post._id, reason: trimmedReason });
  }

  async function sharePost(post) {
    const url = `${window.location.origin}/portal/feed?post=${post._id}`;
    const title = `Post by ${post.author?.name || "Alumni"}`;
    const text = post.content || title;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt("Copy this post link", url);
      }

      setShareStatus((current) => ({ ...current, [post._id]: "copied" }));
      window.setTimeout(() => {
        setShareStatus((current) => ({ ...current, [post._id]: "" }));
      }, 1600);
    } catch (error) {
      if (error?.name !== "AbortError") {
        window.prompt("Copy this post link", url);
      }
    }
  }

  /* Build display posts */
  const displayPosts = (postsQuery.data || []).filter((p) => !hiddenPosts.includes(p._id)).map((p) => {
    const tags = p.content?.match(/#(\w+)/g) || [];
    return {
      ...p,
      author: {
        name: p.author?.name || "Alumni",
        initials: p.author?.initials || (p.author?.name || "A")[0],
        designation: p.author?.designation || p.author?.occupation || "Member",
        batch: p.author?.batch ? `Batch of ${p.author.batch}` : "",
      },
      likeCount: p.likes?.length ?? 0,
      commentCount: p.comments?.length ?? 0,
      shareCount: 0,
      images:
        p.attachments
          ?.filter((a) => a.mimeType?.startsWith("image"))
          ?.map((a) => a.url) || [],
      videos:
        p.attachments
          ?.filter((a) => a.mimeType?.startsWith("video"))
          ?.map((a) => ({ name: a.name, url: a.url })) || [],
      tags,
    };
  });

  /* Trending Topics */
  const trendingTopics = useMemo(() => {
    const rawPosts = postsQuery.data || [];
    const tagMap = {};
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    rawPosts.forEach((p) => {
      const isRecent = new Date(p.createdAt) >= oneDayAgo;
      const tags = p.content?.match(/#(\w+)/g) || [];
      tags.forEach((tag) => {
        const t = tag.replace("#", "");
        if (!tagMap[t]) tagMap[t] = { tag: t, posts: 0, recent: 0 };
        tagMap[t].posts += 1;
        if (isRecent) tagMap[t].recent += 1;
      });
    });

    return Object.values(tagMap)
      .sort((a, b) => b.recent - a.recent || b.posts - a.posts)
      .slice(0, 5);
  }, [postsQuery.data]);

  /* Upcoming Events */
  const displayEvents = (eventsQuery.data || []).slice(0, 3).map((ev) => ({
    month: new Date(ev.date || ev.startDate || Date.now())
      .toLocaleString("default", { month: "short" })
      .toUpperCase(),
    day: new Date(ev.date || ev.startDate || Date.now()).getDate(),
    title: ev.title,
    detail: ev.location || "Online",
    id: ev._id,
  }));

  /* ── Suggested people (Personalized Algorithm) ── */
  const displayPeople = useMemo(() => {
    const allAlumni = alumniQuery.data || [];
    const myProfile = allAlumni.find(a => (a.userId?._id || a.userId) === auth.user?.id);
    
    if (!myProfile || allAlumni.length === 0) {
      return allAlumni
        .filter(a => a && a.name && (a.userId?._id || a.userId) !== auth.user?.id)
        .slice(0, 3)
        .map(a => ({
          id: a._id,
          name: a.name,
          sub: [a.designation || a.occupation || "Alumni", a.batch ? `Batch of ${a.batch}` : ""].filter(Boolean).join(" · "),
          color: avatarColor(a._id),
          avatar: a.avatar || null
        }));
    }

    return allAlumni
      .filter(a => a && a.name && (a.userId?._id || a.userId) !== auth.user?.id)
      .map(a => {
        let score = 0;
        // Same Batch (High relevance)
        if (a.batch && a.batch === myProfile.batch) score += 10;
        // Same Department (Medium relevance)
        if (a.department && a.department === myProfile.department) score += 5;
        // Same Industry (Professional relevance)
        if (a.industry && a.industry === myProfile.industry) score += 3;
        // Same Location (Geographical relevance)
        if (a.location && a.location === myProfile.location) score += 2;
        
        // Randomize slightly for discovery
        score += Math.random();

        return {
          ...a,
          score,
          sub: [
            a.designation || a.occupation || "Alumni",
            a.batch || a.leavingYear ? `Batch of ${a.batch || a.leavingYear}` : "",
          ].filter(Boolean).join(" · "),
          color: avatarColor(a._id),
          avatar: a.avatar || null,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [alumniQuery.data, auth.user?.id]);

  return (
    <div className="feed-root module-feed">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="feed-page-header">
        <div>
          <h1 className="feed-page-title">Feed</h1>
          <p className="feed-page-sub">Stay updated with your alumni community</p>
        </div>
      </div>

      {/* ── 2-column layout ─────────────────────────────────── */}
      <div className="feed-layout">
        {/* Main column */}
        <div className="feed-main-col">
          <PostComposerCard
            userName={userName}
            userInitial={userInitial}
            onPost={(payload) => createPostMutation.mutate(payload)}
            onCreateEvent={() => navigate("/portal/events/create")}
          />

          <div className="feed-posts-list">
            {displayPosts.length > 0 ? (
              displayPosts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onLike={(id) => likeMutation.mutate(id)}
                  commentsOpen={Boolean(openComments[post._id])}
                  commentDraft={commentDrafts[post._id] || ""}
                  onToggleComments={toggleComments}
                  onCommentDraftChange={updateCommentDraft}
                  onCommentSubmit={submitComment}
                  onShare={sharePost}
                  onSave={toggleSavePost}
                  onHide={hidePost}
                  onReport={reportPost}
                  pendingComment={commentMutation.isPending && commentMutation.variables?.id === post._id}
                  pendingReport={reportMutation.isPending && reportMutation.variables?.id === post._id}
                  shareStatus={shareStatus[post._id]}
                  isSaved={savedPosts.includes(post._id)}
                />
              ))
            ) : (
              <div className="feed-empty-state">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 46, color: "#cbd5e1" }}
                >
                  forum
                </span>
                <p>No posts yet. Be the first to share an update!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="feed-sidebar-col">
          {/* ── Trending Topics ── */}
          <div className="feed-sidebar-card">
            <div className="feed-sidebar-header">
              <span className="feed-sidebar-title">Trending Topics</span>
              <Link to="/portal" className="feed-sidebar-view-all">
                View All
              </Link>
            </div>
            <div className="feed-trending-list">
              {trendingTopics.length > 0 ? (
                trendingTopics.map((t) => (
                  <div key={t.tag} className="feed-trending-item">
                    <div className="feed-trending-icon">
                      <span className="material-symbols-outlined">tag</span>
                    </div>
                    <div className="feed-trending-info">
                      <div className="feed-trending-tag">#{t.tag}</div>
                      <div className="feed-trending-count">{t.posts} posts</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="feed-sidebar-empty-box">
                  <div className="feed-sidebar-empty-icon">
                    <span className="material-symbols-outlined">tag</span>
                  </div>
                  <span className="feed-sidebar-empty-text">
                    No trending topics today.{"\n"}Use hashtags in your posts!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Upcoming Events ── */}
          <div className="feed-sidebar-card">
            <div className="feed-sidebar-header">
              <span className="feed-sidebar-title">Upcoming Events</span>
              <Link to="/portal/events" className="feed-sidebar-view-all">
                View All
              </Link>
            </div>
            <div className="feed-events-list">
              {displayEvents.length > 0 ? (
                displayEvents.map((ev, i) => (
                  <Link
                    key={ev.id || i}
                    to="/portal/events"
                    className="feed-event-item"
                  >
                    <div className="feed-event-date-badge">
                      <div className="feed-event-month">{ev.month}</div>
                      <div className="feed-event-day">{ev.day}</div>
                    </div>
                    <div className="feed-event-info">
                      <div className="feed-event-title">{ev.title}</div>
                      <div className="feed-event-detail">{ev.detail}</div>
                    </div>
                    <div className="feed-event-chevron">
                      <span className="material-symbols-outlined">
                        chevron_right
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="feed-sidebar-empty-box">
                  <div className="feed-sidebar-empty-icon">
                    <span className="material-symbols-outlined">event</span>
                  </div>
                  <span className="feed-sidebar-empty-text">
                    No upcoming events scheduled.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── People You May Know ── */}
          <div className="feed-sidebar-card">
            <div className="feed-sidebar-header">
              <span className="feed-sidebar-title">People You May Know</span>
              <Link to="/portal/alumni" className="feed-sidebar-view-all">
                View All
              </Link>
            </div>
            <div className="feed-people-list">
              {displayPeople.length > 0 ? (
                <>
                  {displayPeople.map((p) => (
                    <div key={p.id} className="feed-person-item">
                      <div
                        className="feed-person-avatar"
                        style={{ background: p.color }}
                      >
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} />
                        ) : (
                          (p.name || "A")[0]
                        )}
                      </div>
                      <div className="feed-person-info">
                        <div className="feed-person-name">{p.name}</div>
                        <div className="feed-person-sub">{p.sub}</div>
                      </div>
                      <Link to="/portal/alumni" className="feed-connect-btn">
                        Connect
                      </Link>
                    </div>
                  ))}
                  <Link to="/portal/alumni" className="feed-see-more">
                    See More Suggestions →
                  </Link>
                </>
              ) : (
                <div className="feed-sidebar-empty-box">
                  <div className="feed-sidebar-empty-icon">
                    <span className="material-symbols-outlined">person_search</span>
                  </div>
                  <span className="feed-sidebar-empty-text">
                    No suggestions available yet.
                  </span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
