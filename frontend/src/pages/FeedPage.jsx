import { useState } from "react";
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

/* ── Static / seed data ──────────────────────────────────── */
const TRENDING = [
  { tag: "AlumniMeet2026", posts: 128, color: "#6366f1", wave: "M0,12 C10,4 20,18 30,10 C40,2 50,16 60,8 C70,0 80,14 90,6" },
  { tag: "CareerGrowth",   posts: 96,  color: "#10b981", wave: "M0,8 C10,16 20,4 30,12 C40,18 50,6 60,14 C70,20 80,8 90,16" },
  { tag: "Startups",       posts: 84,  color: "#0ea5e9", wave: "M0,14 C10,6 20,16 30,8 C40,2 50,12 60,4 C70,10 80,2 90,12" },
  { tag: "Mentorship",     posts: 76,  color: "#f59e0b", wave: "M0,10 C10,18 20,6 30,14 C40,4 50,16 60,8 C70,14 80,4 90,10" },
  { tag: "Networking",     posts: 62,  color: "#8b5cf6", wave: "M0,6 C10,14 20,2 30,10 C40,16 50,8 60,18 C70,6 80,12 90,4" },
];

const SAMPLE_POSTS = [
  {
    _id: "fp1",
    author: { name: "Riya Desai", initials: "RD", designation: "Product Manager at Finverse", batch: "Batch of 2017" },
    content: "Excited to share that our community mixer was a huge success! 🎉\nThanks to everyone who joined and made it special.",
    images: [
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&q=80",
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80",
      "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&q=80",
    ],
    likeCount: 124, commentCount: 23, shareCount: 18,
    likedBy: ["You", "Arjun Kapoor", "and 122 others"],
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    color: "#6366f1",
  },
  {
    _id: "fp2",
    author: { name: "Dev Mehta", initials: "DM", designation: "Engineering Lead at Orbit Systems", batch: "Batch of 2016" },
    content: "Looking forward to mentoring 5 final-year students this month.\nFeel free to reach out if you need guidance!",
    images: [],
    tags: ["#Mentorship", "#Engineering", "#CareerAdvice"],
    likeCount: 87, commentCount: 15, shareCount: 6,
    likedBy: [],
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    color: "#0ea5e9",
  },
  {
    _id: "fp3",
    author: { name: "SPIT Alumni Association", initials: "SA", designation: "Official", batch: "" },
    content: "Registrations are now open for the Annual Alumni Meet 2026! 🏛️\nJoin us for an unforgettable evening of reconnection, inspiration, and celebration.\nDon't miss it — spots are limited!",
    images: [],
    tags: ["#AlumniMeet2026", "#SPIT", "#Community"],
    likeCount: 203, commentCount: 41, shareCount: 29,
    likedBy: [],
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    color: "#10b981",
  },
];

const SUGGESTED_PEOPLE = [
  { id: "p1", name: "Sneha Iyer",   sub: "Batch of 2018 · Data Scientist at Google",   color: "#6366f1" },
  { id: "p2", name: "Kunal Joshi",  sub: "Batch of 2016 · Founder & CEO at TechNova",  color: "#10b981" },
];

const UPCOMING_EVENTS_STATIC = [
  { month: "MAY", day: "24", title: "Annual Alumni Meet 2026", detail: "May 24, 2026 · 10:00 AM\nSPIT Campus, Mumbai", color: "#6366f1" },
  { month: "JUN", day: "07", title: "Startup Networking Night", detail: "Jun 07, 2026 · 6:30 PM\nWeWork, BKC Mumbai", color: "#10b981" },
  { month: "JUN", day: "21", title: "Career Mentorship Summit", detail: "Jun 21, 2026 · 11:00 AM\nOnline Event", color: "#f59e0b" },
];

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
  const userInitial = userName[0]?.toUpperCase() || "U";

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

  /* Build display posts: live data or samples */
  const livePosts = (postsQuery.data || []).map(p => ({
    ...p,
    author: {
      name: p.author?.name || p.authorName || "Alumni",
      initials: (p.author?.name || "A")[0],
      designation: p.author?.designation || p.author?.occupation || "",
      batch: p.author?.batch ? `Batch of ${p.author.batch}` : "",
    },
    likeCount: p.likes?.length ?? 0,
    commentCount: p.comments?.length ?? 0,
    shareCount: 0,
    likedBy: [],
    images: p.attachments?.filter(a => a.type?.startsWith("image"))?.map(a => a.url) || [],
    tags: [],
    color: ["#6366f1","#0ea5e9","#10b981","#f59e0b","#8b5cf6"][
      (Math.abs(((p._id || "a").charCodeAt(0) || 48) - 48)) % 5
    ] || "#6366f1",
  }));

  const displayPosts = livePosts.length > 0 ? livePosts : SAMPLE_POSTS;

  /* Events */
  const displayEvents = (eventsQuery.data || []).length > 0
    ? (eventsQuery.data || []).slice(0, 3).map((ev, i) => ({
        month: new Date(ev.date || ev.startDate || Date.now()).toLocaleString("default", { month: "short" }).toUpperCase(),
        day: new Date(ev.date || ev.startDate || Date.now()).getDate(),
        title: ev.title,
        detail: ev.location || "Online",
        color: UPCOMING_EVENTS_STATIC[i]?.color || "#6366f1",
      }))
    : UPCOMING_EVENTS_STATIC;

  /* Suggested people */
  const livePeople = (alumniQuery.data || []).slice(0, 2)
    .filter(a => a && a.name)
    .map(a => ({
      id: a._id || Math.random().toString(36).slice(2),
      name: a.name || "Alumni",
      sub: `${a.batch ? `Batch of ${a.batch} · ` : ""}${a.designation || a.occupation || "Alumni"}`,
      color: ["#6366f1","#10b981","#0ea5e9","#f59e0b"][
        (Math.abs(((a._id || "a").charCodeAt(0) || 48) - 48)) % 4
      ] || "#6366f1",
    }));
  const displayPeople = livePeople.length > 0 ? livePeople : SUGGESTED_PEOPLE;

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
            {displayPosts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                onLike={id => likeMutation.mutate(id)}
              />
            ))}
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
              {TRENDING.map((t, i) => (
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
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="feed-sidebar-card">
            <div className="feed-sidebar-header">
              <span className="feed-sidebar-title">Upcoming Events</span>
              <Link to="/portal/events" className="feed-sidebar-view-all">View All</Link>
            </div>
            <div className="feed-events-list">
              {displayEvents.map((ev, i) => (
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
              ))}
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
