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


/* ── Mini sparkline ──────────────────────────────────────── */
function Sparkline({ wave, color }) {
  return (
    <svg width="70" height="24" viewBox="0 0 90 24" fill="none">
      <path d={wave} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ── Post card ───────────────────────────────────────────── */
function PostCard({ post, onLike }) {
  const [liked, setLiked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLike() {
    setLiked(l => !l);
    onLike?.(post._id);
  }

  return (
    <article className="feed-post-card">
      {/* Header */}
      <div className="feed-post-header">
        <div className="feed-post-avatar" style={{ background: post.color }}>
          {post.author?.initials || post.author?.name?.[0]}
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
          <button className="feed-post-menu-btn" onClick={() => setMenuOpen(o => !o)} aria-label="More">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_horiz</span>
          </button>
          {menuOpen && (
            <div className="feed-post-menu-dropdown">
              <button onClick={() => setMenuOpen(false)}>Save post</button>
              <button onClick={() => setMenuOpen(false)}>Hide post</button>
              <button onClick={() => setMenuOpen(false)} style={{ color: "#ef4444" }}>Report</button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="feed-post-content">{post.content}</p>

      {/* Images */}
      {post.images?.length > 0 && (
        <div className={`feed-post-images feed-post-images--${Math.min(post.images.length, 3)}`}>
          {post.images.slice(0, 3).map((src, i) => (
            <img key={i} src={src} alt="" className="feed-post-img" loading="lazy" />
          ))}
        </div>
      )}

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="feed-post-tags">
          {post.tags.map(t => (
            <span key={t} className="feed-post-tag">{t}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="feed-post-actions">
        <button className={`feed-action-btn ${liked ? "feed-action-btn--liked" : ""}`} onClick={handleLike}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {liked ? "favorite" : "favorite_border"}
          </span>
          {(post.likeCount || 0) + (liked ? 1 : 0)}
        </button>
        <button className="feed-action-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat_bubble_outline</span>
          {post.commentCount || 0}
        </button>
        <button className="feed-action-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>reply</span>
          {post.shareCount || 0}
        </button>
        <button className="feed-action-btn feed-action-btn--bookmark" aria-label="Bookmark">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bookmark_border</span>
        </button>
      </div>

      {/* Liked-by row */}
      {post.likedBy?.length > 0 && (
        <div className="feed-liked-by">
          <div className="feed-liked-avatars">
            {["#6366f1","#0ea5e9","#10b981"].slice(0, 3).map((c, i) => (
              <div key={i} className="feed-liked-avatar" style={{ background: c }}>{String.fromCharCode(65+i)}</div>
            ))}
          </div>
          <span className="feed-liked-text">{post.likedBy.join(" ")}</span>
        </div>
      )}
    </article>
  );
}

/* ── Post composer ───────────────────────────────────────── */
function PostComposerCard({ userName, userInitial, onPost }) {
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
          className={`feed-composer-input-wrap ${focused ? "feed-composer-input-wrap--focused" : ""}`}
          onClick={() => setFocused(true)}
        >
          <textarea
            className="feed-composer-input"
            placeholder="Share an update with your network..."
            value={text}
            onChange={e => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            rows={focused ? 3 : 1}
          />
        </div>
      </div>

      <div className="feed-composer-actions">
        <div className="feed-composer-types">
          <button className="feed-composer-type-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 17, color: "#22c55e" }}>image</span>
            Photo
          </button>
          <button className="feed-composer-type-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 17, color: "#6366f1" }}>videocam</span>
            Video
          </button>
          <button className="feed-composer-type-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 17, color: "#f59e0b" }}>event</span>
            Event
          </button>
          <button className="feed-composer-type-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 17, color: "#ef4444" }}>bar_chart</span>
            Poll
          </button>
        </div>
        <button
          className="feed-composer-post-btn"
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
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
    mutationFn: payload => createAlumniPost(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alumni-posts"] }),
  });

  const likeMutation = useMutation({
    mutationFn: toggleAlumniPostLike,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alumni-posts"] }),
  });

  /* Build display posts: live data only */
  const displayPosts = (postsQuery.data || []).map(p => {
    // Extract hashtags from content
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
      likedBy: [],
      images: p.attachments?.filter(a => a.mimeType?.startsWith("image"))?.map(a => a.url) || [],
      tags,
      color: ["#6366f1","#0ea5e9","#10b981","#f59e0b","#8b5cf6"][
        (Math.abs(((p._id || "a").charCodeAt(0) || 48) - 48)) % 5
      ] || "#6366f1",
    };
  });

  /* Calculate Trending Topics */
  const trendingTopics = useMemo(() => {
    const rawPosts = postsQuery.data || [];
    const tagMap = {};
    
    // Filter posts from "today" (last 24h for better results)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    rawPosts.forEach(p => {
      const isRecent = new Date(p.createdAt) >= oneDayAgo;
      const tags = p.content?.match(/#(\w+)/g) || [];
      tags.forEach(tag => {
        const t = tag.replace("#", "");
        if (!tagMap[t]) tagMap[t] = { tag: t, posts: 0, recent: 0 };
        tagMap[t].posts += 1;
        if (isRecent) tagMap[t].recent += 1;
      });
    });

    const colors = ["#6366f1", "#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6"];
    return Object.values(tagMap)
      .sort((a, b) => b.recent - a.recent || b.posts - a.posts)
      .slice(0, 5)
      .map((t, i) => {
        // Generate a random wave path based on post count
        const color = colors[i % colors.length];
        const h1 = 12 + Math.sin(t.posts) * 8;
        const h2 = 12 + Math.cos(t.posts) * 8;
        const h3 = 12 + Math.tan(t.posts) * 4;
        const wave = `M0,${h1} C20,${h2} 40,${h3} 60,${h2} 90,${h1}`;
        return { ...t, color, wave };
      });
  }, [postsQuery.data]);

  /* Events */
  /* Events */
  const displayEvents = (eventsQuery.data || []).slice(0, 3).map((ev, i) => ({
    month: new Date(ev.date || ev.startDate || Date.now()).toLocaleString("default", { month: "short" }).toUpperCase(),
    day: new Date(ev.date || ev.startDate || Date.now()).getDate(),
    title: ev.title,
    detail: ev.location || "Online",
    color: ["#6366f1","#10b981","#f59e0b"][i % 3] || "#6366f1",
  }));

  /* Suggested people */
  /* Suggested people */
  const displayPeople = (alumniQuery.data || [])
    .filter(a => a && a.name && a.userId !== auth.user?.id)
    .slice(0, 3)
    .map(a => ({
      id: a._id,
      name: a.name,
      sub: `${a.batch || a.leavingYear ? `Batch of ${a.batch || a.leavingYear} · ` : ""}${a.designation || a.occupation || "Alumni"}`,
      color: ["#6366f1","#10b981","#0ea5e9","#f59e0b"][
        (Math.abs(((a._id || "a").charCodeAt(0) || 48) - 48)) % 4
      ] || "#6366f1",
    }));

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
            onPost={text => createPostMutation.mutate({ content: text })}
          />

          <div className="feed-posts-list">
            {displayPosts.length > 0 ? (
              displayPosts.map(post => (
                <PostCard
                  key={post._id}
                  post={post}
                  onLike={id => likeMutation.mutate(id)}
                />
              ))
            ) : (
              <div className="feed-empty-state">
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#cbd5e1" }}>forum</span>
                <p>No posts in the feed yet. Be the first to share an update!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="feed-sidebar-col">
          {/* Trending Topics */}
          <div className="feed-sidebar-card">
            <div className="feed-sidebar-header">
              <span className="feed-sidebar-title">Trending Topics</span>
              <Link to="/portal" className="feed-sidebar-view-all">View All</Link>
            </div>
            <div className="feed-trending-list">
              {trendingTopics.length > 0 ? (
                trendingTopics.map((t, i) => (
                  <div key={t.tag} className="feed-trending-item">
                    <div className="feed-trending-rank" style={{ background: t.color + "18", color: t.color }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>tag</span>
                    </div>
                    <div className="feed-trending-info">
                      <div className="feed-trending-tag">{t.tag}</div>
                      <div className="feed-trending-count">{t.posts} posts</div>
                    </div>
                    <Sparkline wave={t.wave} color={t.color} />
                  </div>
                ))
              ) : (
                <div className="feed-sidebar-empty">
                  No trending topics today. Use hashtags in your posts!
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="feed-sidebar-card">
            <div className="feed-sidebar-header">
              <span className="feed-sidebar-title">Upcoming Events</span>
              <Link to="/portal/events" className="feed-sidebar-view-all">View All</Link>
            </div>
            <div className="feed-events-list">
              {displayEvents.length > 0 ? (
                displayEvents.map((ev, i) => (
                  <div key={i} className="feed-event-item">
                    <div className="feed-event-date" style={{ borderLeftColor: ev.color }}>
                      <div className="feed-event-month" style={{ color: ev.color }}>{ev.month}</div>
                      <div className="feed-event-day">{ev.day}</div>
                    </div>
                    <div className="feed-event-info">
                      <div className="feed-event-title">{ev.title}</div>
                      <div className="feed-event-detail" style={{ whiteSpace: "pre-line" }}>{ev.detail}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="feed-sidebar-empty">No upcoming events scheduled.</div>
              )}
            </div>
          </div>

          {/* People You May Know */}
          <div className="feed-sidebar-card">
            <div className="feed-sidebar-header">
              <span className="feed-sidebar-title">People You May Know</span>
              <Link to="/portal/alumni" className="feed-sidebar-view-all">View All</Link>
            </div>
            <div className="feed-people-list">
              {displayPeople.map(p => (
                <div key={p.id} className="feed-person-item">
                  <div className="feed-person-avatar" style={{ background: p.color }}>{(p.name || "A")[0]}</div>
                  <div className="feed-person-info">
                    <div className="feed-person-name">{p.name}</div>
                    <div className="feed-person-sub">{p.sub}</div>
                  </div>
                  <Link to="/portal/alumni" className="feed-connect-btn">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person_add</span>
                    Connect
                  </Link>
                </div>
              ))}
              <Link to="/portal/alumni" className="feed-see-more">See More Suggestions →</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
