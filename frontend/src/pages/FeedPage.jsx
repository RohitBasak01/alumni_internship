import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAlumniPosts,
  fetchEvents,
  fetchAlumni,
  createAlumniPost,
  toggleAlumniPostLike,
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

/* ── Post card ───────────────────────────────────────────── */
function PostCard({ post, onLike }) {
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
              <button onClick={() => setMenuOpen(false)}>Save post</button>
              <button onClick={() => setMenuOpen(false)}>Hide post</button>
              <button
                onClick={() => setMenuOpen(false)}
                style={{ color: "#ef4444" }}
              >
                Report
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
        <button className="feed-action-btn" aria-label="Comment">
          <span className="material-symbols-outlined">chat_bubble_outline</span>
          {post.commentCount || 0}
        </button>
        <button className="feed-action-btn" aria-label="Share">
          <span className="material-symbols-outlined">reply</span>
          {post.shareCount || 0}
        </button>
        <button
          className="feed-action-btn feed-action-btn--bookmark"
          aria-label="Bookmark"
        >
          <span className="material-symbols-outlined">bookmark_border</span>
        </button>
      </div>
    </article>
  );
}

/* ── Post composer ───────────────────────────────────────── */
function PostComposerCard({ userInitial, onPost }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  function handleSubmit() {
    if (!text.trim()) return;
    onPost?.(text.trim());
    setText("");
    setFocused(false);
  }

  return (
    <div className="feed-composer-card">
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
          <button className="feed-composer-type-btn">
            <span
              className="material-symbols-outlined"
              style={{ color: "#22c55e" }}
            >
              image
            </span>
            Photo
          </button>
          <button className="feed-composer-type-btn">
            <span
              className="material-symbols-outlined"
              style={{ color: "#6366f1" }}
            >
              videocam
            </span>
            Video
          </button>
          <button className="feed-composer-type-btn">
            <span
              className="material-symbols-outlined"
              style={{ color: "#f59e0b" }}
            >
              event
            </span>
            Event
          </button>
          <button className="feed-composer-type-btn">
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
          disabled={!text.trim()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            send
          </span>
          Post
        </button>
      </div>
    </div>
  );
}

/* ── Main FeedPage ───────────────────────────────────────── */
export default function FeedPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userName = auth.user?.name || "User";
  const userInitial = (auth.user?.name || "U")[0]?.toUpperCase();

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

  /* Build display posts */
  const displayPosts = (postsQuery.data || []).map((p) => {
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
    <div className="feed-root">
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
            onPost={(text) => createPostMutation.mutate({ content: text })}
          />

          <div className="feed-posts-list">
            {displayPosts.length > 0 ? (
              displayPosts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onLike={(id) => likeMutation.mutate(id)}
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
