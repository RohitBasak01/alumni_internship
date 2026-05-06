import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createAnnouncement, deleteAnnouncement,
  fetchAnnouncements, resolveApiAssetUrl, updateAnnouncement
} from "../lib/api.js";
import RichTextEditor from "../components/RichTextEditor.jsx";
import SectionCard from "../components/SectionCard.jsx";
import "../styles/Newsroom.css";

/* ── Helpers ─────────────────────────────────────────────── */
function fmtDate(v) {
  if (!v) return "";
  return new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtRelative(v) {
  if (!v) return "";
  const diff = Date.now() - new Date(v).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function excerpt(text, n = 100) {
  return text.length > n ? text.slice(0, n - 1) + "…" : text;
}

/* ── Static sample data ──────────────────────────────────── */
const CATEGORY_TABS = [
  "All", "Institute News", "Events", "Placements",
  "Alumni Stories", "Startups", "Research", "Community"
];

const CAT_COLORS = {
  "Institute News": { bg: "#dbeafe", color: "#1d4ed8" },
  "Events":         { bg: "#fef9c3", color: "#92400e" },
  "Placements":     { bg: "#dcfce7", color: "#15803d" },
  "Alumni Stories": { bg: "#ede9fe", color: "#6d28d9" },
  "Startups":       { bg: "#fee2e2", color: "#b91c1c" },
  "Research":       { bg: "#e0f2fe", color: "#0369a1" },
  "Community":      { bg: "#fce7f3", color: "#be185d" },
  "News":           { bg: "#f1f5f9", color: "#475569" },
};

const SAMPLE_FEATURED = {
  _id: "feat1",
  title: "SPIT Annual Alumni Meet 2026 Registrations Are Now Open!",
  category: "Events",
  summary: "Join us for a memorable weekend of reconnecting, networking, and celebrating our achievements.",
  imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&q=80",
  publishValue: new Date(Date.now() - 7 * 86400000).toISOString(),
  readersCount: 24,
};

const SAMPLE_ARTICLES = [
  { _id: "a1", title: "New Innovation Hub Inaugurated at SPIT", category: "Institute News",
    summary: "A state-of-the-art facility to foster innovation, collaboration, and entrepreneurship.",
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80",
    author: "SPIT News Desk", publishValue: new Date(Date.now() - 2*3600000).toISOString() },
  { _id: "a2", title: "From SPIT to Google: Riya's Inspiring Journey", category: "Alumni Stories",
    summary: "Riya Desai shares her journey from campus to leading product at Google.",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
    author: "Team Editorial", publishValue: new Date(Date.now() - 5*3600000).toISOString() },
  { _id: "a3", title: "2026 Placements: Highest Package Hits ₹54 LPA", category: "Placements",
    summary: "This year's placements have set a new benchmark with top recruiters joining in record numbers.",
    imageUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&q=80",
    author: "Placements Cell", publishValue: new Date(Date.now() - 86400000).toISOString() },
  { _id: "a4", title: "Alumni Startup 'OrbitAI' Raises $2M in Seed Round", category: "Startups",
    summary: "OrbitAI, founded by SPIT alumni, builds AI solutions for enterprises worldwide.",
    imageUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&q=80",
    author: "Startup Desk", publishValue: new Date(Date.now() - 2*86400000).toISOString() },
];

const SAMPLE_EDITOR_PICKS = [
  { _id: "ep1", title: "How SPIT Alumni Are Shaping India's AI Landscape",
    imageUrl: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80",
    category: "Research", publishValue: new Date(Date.now() - 3*86400000).toISOString() },
  { _id: "ep2", title: "Career Transitions: Alumni Who Switched Industries Successfully",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    category: "Alumni Stories", publishValue: new Date(Date.now() - 4*86400000).toISOString() },
];

const TRENDING_ITEMS = [
  { num: "01", title: "SPIT Ranked Among Top 50 Engineering Institutes", date: "Apr 29, 2026",
    img: "https://images.unsplash.com/photo-1562774053-701939374585?w=80&q=80" },
  { num: "02", title: "Alumni Startup Secures $2M Seed Funding", date: "Apr 28, 2026",
    img: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=80&q=80" },
  { num: "03", title: "Campus Drive 2026: Top Companies Onboard", date: "Apr 26, 2026",
    img: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=80&q=80" },
  { num: "04", title: "Research Paper Published in Nature by Alumni", date: "Apr 25, 2026",
    img: "https://images.unsplash.com/photo-1532094349884-543559b66e8a?w=80&q=80" },
];

const POPULAR_TAGS = ["#SPIT","#AlumniMeet2026","#Placements","#Innovation","#Research","#Startups","#Community","#Achievements"];

/* ── Category badge ──────────────────────────────────────── */
function CatBadge({ cat }) {
  const cfg = CAT_COLORS[cat] || CAT_COLORS["News"];
  return <span className="nr-badge" style={{ background: cfg.bg, color: cfg.color }}>{cat}</span>;
}

/* ── Article reader modal ────────────────────────────────── */
function ArticleModal({ article, onClose }) {
  if (!article) return null;
  return (
    <div className="nr-modal-backdrop" onClick={onClose}>
      <div className="nr-modal" onClick={e => e.stopPropagation()}>
        <div className="nr-modal-header">
          <CatBadge cat={article.category} />
          <h2>{article.title}</h2>
          <p className="nr-modal-date">{fmtDate(article.publishValue)}</p>
        </div>
        <button className="nr-modal-close" onClick={onClose} aria-label="Close">
          <span className="material-symbols-outlined">close</span>
        </button>
        {article.imageUrl && <img className="nr-modal-img" src={article.imageUrl} alt={article.title} />}
        <div className="nr-modal-body">
          <p className="nr-modal-summary">{article.summary}</p>
          {article.content && (
            <div className="nr-modal-content" dangerouslySetInnerHTML={{ __html: article.content }} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
const initialForm = { title: "", category: "News", summary: "", imageUrl: "", content: "", status: "published" };

export default function NewsroomPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = auth.user?.role === "institute_admin";
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [email, setEmail] = useState("");
  const [tabsOverflow, setTabsOverflow] = useState(false);
  const [poll, setPoll] = useState(null);

  const { data = [], isLoading } = useQuery({ queryKey: ["announcements"], queryFn: fetchAnnouncements });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateAnnouncement(id, payload) : createAnnouncement(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setForm(initialForm); setEditingId(null); setShowComposer(false);
    }
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] })
  });

  const liveArticles = useMemo(() =>
    data.filter(d => d.status === "published" || isAdmin)
      .map(d => ({
        ...d,
        imageUrl: resolveApiAssetUrl(d.imageUrl || ""),
        summary: d.summary || excerpt(stripHtml(d.content), 120),
        publishValue: d.publishedAt || d.createdAt,
        author: d.author || "Editorial Team",
        readersCount: d.readersCount || Math.floor(Math.random() * 50) + 10,
      }))
      .sort((a, b) => new Date(b.publishValue) - new Date(a.publishValue)),
    [data, isAdmin]
  );

  const dynamicCategories = useMemo(() => {
    const cats = new Set(["All"]);
    liveArticles.forEach(a => { if (a.category) cats.add(a.category); });
    return Array.from(cats);
  }, [liveArticles]);

  const trendingArticles = useMemo(() => {
    return [...liveArticles].sort((a, b) => (b.readersCount || 0) - (a.readersCount || 0)).slice(0, 4);
  }, [liveArticles]);

  const dynamicTags = useMemo(() => {
    const tags = new Set(["#SPIT", "#Alumni"]);
    liveArticles.forEach(a => {
      const words = a.title.split(" ");
      words.forEach(w => {
        if (w.length > 5 && !w.includes("'")) tags.add(`#${w.replace(/[^\w]/g, "")}`);
      });
    });
    return Array.from(tags).slice(0, 10);
  }, [liveArticles]);

  const allArticles = liveArticles.length > 0 ? liveArticles : SAMPLE_ARTICLES;
  const featured    = liveArticles.length > 0 ? liveArticles[0] : SAMPLE_FEATURED;

  const categoriesToDisplay = liveArticles.length > 0 ? dynamicCategories : CATEGORY_TABS;

  const filteredArticles = activeCategory === "All"
    ? allArticles
    : allArticles.filter(a => a.category === activeCategory);

  function handleChange(e) { setForm(c => ({ ...c, [e.target.name]: e.target.value })); }
  function handleSubmit(e) {
    e.preventDefault();
    saveMutation.mutate({ id: editingId, payload: form });
  }
  function openEdit(item) {
    setEditingId(item._id);
    setForm({ title: item.title||"", category: item.category||"News", summary: item.summary||"",
      imageUrl: item.imageUrl||"", content: item.content||"", status: item.status||"published" });
    setShowComposer(true);
  }

  return (
    <div className="nr-root">
      {/* ── Page header ───────────────────────────────────── */}
      <div className="nr-page-header">
        <div>
          <h1 className="nr-page-title">Newsroom</h1>
          <p className="nr-page-sub">Stay informed with the latest news and updates from your alumni community.</p>
        </div>
        {isAdmin && (
          <button className="nr-publish-btn" onClick={() => setShowComposer(s => !s)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
            {showComposer ? "Close Editor" : "Publish Article"}
          </button>
        )}
      </div>

      {/* ── Admin composer ────────────────────────────────── */}
      {isAdmin && showComposer && (
        <div className="nr-composer-card">
          <h3 className="nr-composer-title">{editingId ? "Edit Article" : "Create Article"}</h3>
          <form onSubmit={handleSubmit} className="nr-composer-form">
            <input className="nr-input" name="title" value={form.title} onChange={handleChange} placeholder="Article title" required />
            <div className="nr-composer-row">
              <input className="nr-input" name="category" value={form.category} onChange={handleChange} placeholder="Category" />
              <select className="nr-input" name="status" value={form.status} onChange={handleChange}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <input className="nr-input" name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="Cover image URL" />
            </div>
            <textarea className="nr-input" name="summary" value={form.summary} onChange={handleChange} placeholder="Short summary..." rows={2} />
            <RichTextEditor value={form.content} onChange={html => setForm(c => ({ ...c, content: html }))} placeholder="Article body..." />
            <div className="nr-composer-actions">
              <button className="nr-submit-btn" type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Publish"}
              </button>
              <button className="nr-cancel-btn" type="button" onClick={() => { setShowComposer(false); setEditingId(null); setForm(initialForm); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Category tabs ─────────────────────────────────── */}
      <div className="nr-tabs-wrap">
        <div className="nr-tabs">
          {categoriesToDisplay.map(cat => (
            <button
              key={cat}
              className={`nr-tab ${activeCategory === cat ? "nr-tab--active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* ── 2-column layout ───────────────────────────────── */}
      <div className="nr-layout">
        {/* Main column */}
        <div className="nr-main-col">

          {/* Featured hero */}
          {featured && (activeCategory === "All" || activeCategory === featured.category) && (
            <div className="nr-featured" style={{ backgroundImage: `url(${featured.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&q=80"})` }}>
              <div className="nr-featured-overlay" />
              <div className="nr-featured-body">
                <span className="nr-featured-badge">FEATURED</span>
                <h2 className="nr-featured-title">{featured.title}</h2>
                <p className="nr-featured-desc">{featured.summary}</p>
                <div className="nr-featured-footer">
                  <div className="nr-featured-actions">
                    <button className="nr-readmore-btn" onClick={() => setSelectedArticle(featured)}>
                      Read More →
                    </button>
                    <div className="nr-featured-readers">
                      {[1,2,3].map(i => (
                        <div key={i} className="nr-reader-avatar" style={{ background: ["#6366f1","#0ea5e9","#10b981"][i-1] }}>{String.fromCharCode(64+i)}</div>
                      ))}
                      <span>+{featured.readersCount || 24}</span>
                    </div>
                  </div>
                  <span className="nr-featured-date">{fmtDate(featured.publishValue)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Latest Articles */}
          <div className="nr-section-header">
            <h2 className="nr-section-title">Latest Articles</h2>
            <button className="nr-view-all">View All</button>
          </div>

          {isLoading && <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Loading articles...</p>}

          <div className="nr-articles-row">
            {filteredArticles.map(item => (
              <article className="nr-article-card" key={item._id} onClick={() => setSelectedArticle(item)}>
                <div className="nr-article-img-wrap">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.title} className="nr-article-img" loading="lazy" />
                    : <div className="nr-article-img-placeholder"><span className="material-symbols-outlined">campaign</span></div>
                  }
                  <CatBadge cat={item.category} />
                </div>
                <div className="nr-article-body">
                  <h3 className="nr-article-title">{item.title}</h3>
                  <p className="nr-article-desc">{item.summary}</p>
                  <div className="nr-article-footer">
                    <div className="nr-article-author">
                      <div className="nr-author-dot" style={{ background: CAT_COLORS[item.category]?.color || "#6366f1" }} />
                      <span>{item.author || "Editorial"}</span>
                    </div>
                    <span className="nr-article-time">{fmtRelative(item.publishValue)}</span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="nr-article-admin-actions" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(item)}>Edit</button>
                    <button onClick={() => deleteMutation.mutate(item._id)} style={{ color: "#ef4444" }}>Delete</button>
                  </div>
                )}
              </article>
            ))}
          </div>

          {/* Editor's Pick */}
          {activeCategory === "All" && (
            <>
              <div className="nr-section-header" style={{ marginTop: "1.5rem" }}>
                <h2 className="nr-section-title">⭐ Editor's Pick</h2>
                <span className="nr-section-sub">Handpicked stories for you</span>
              </div>
              <div className="nr-editor-picks">
                {SAMPLE_EDITOR_PICKS.map(ep => (
                  <article key={ep._id} className="nr-pick-card" onClick={() => setSelectedArticle(ep)}>
                    <img src={ep.imageUrl} alt={ep.title} className="nr-pick-img" loading="lazy" />
                    <div className="nr-pick-body">
                      <CatBadge cat={ep.category} />
                      <h3 className="nr-pick-title">{ep.title}</h3>
                      <span className="nr-pick-date">{fmtDate(ep.publishValue)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="nr-sidebar">
          {/* Trending Now */}
          <div className="nr-sidebar-card">
            <div className="nr-sidebar-header">
              <span className="nr-sidebar-title">Trending Now</span>
              <button className="nr-sidebar-view-all">View All</button>
            </div>
            <div className="nr-trending-list">
              {(liveArticles.length > 0 ? trendingArticles : TRENDING_ITEMS).map((t, idx) => (
                <div key={t._id || t.num} className="nr-trending-item">
                  <span className="nr-trending-num">{String(idx + 1).padStart(2, '0')}</span>
                  {t.imageUrl || t.img ? (
                    <img src={t.imageUrl || t.img} alt="" className="nr-trending-thumb" />
                  ) : (
                    <div className="nr-trending-thumb" style={{ background: "#f1f5f9", display: "grid", placeItems: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#cbd5e1" }}>article</span>
                    </div>
                  )}
                  <div className="nr-trending-info">
                    <div className="nr-trending-title">{t.title}</div>
                    <div className="nr-trending-date">{fmtDate(t.publishValue || t.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="nr-sidebar-card nr-newsletter-card">
            <div className="nr-newsletter-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#6366f1" }}>mail</span>
            </div>
            <div className="nr-newsletter-label">Newsletter</div>
            <h3 className="nr-newsletter-title">Stay in the loop!</h3>
            <p className="nr-newsletter-sub">Subscribe to our newsletter and get the latest updates delivered to your inbox.</p>
            <div className="nr-newsletter-form">
              <input
                className="nr-newsletter-input"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <button className="nr-newsletter-btn" onClick={() => { setEmail(""); }}>Subscribe</button>
            </div>
          </div>

          {/* Popular Tags */}
          <div className="nr-sidebar-card">
            <div className="nr-sidebar-header">
              <span className="nr-sidebar-title">Popular Tags</span>
              <button className="nr-sidebar-view-all">View All</button>
            </div>
            <div className="nr-tags-grid">
              {(liveArticles.length > 0 ? dynamicTags : POPULAR_TAGS).map(tag => (
                <button
                  key={tag}
                  className="nr-tag"
                  onClick={() => {
                    const cleanTag = tag.replace("#", "");
                    // If the tag exists as a category, filter by it
                    if (categoriesToDisplay.includes(cleanTag)) {
                      setActiveCategory(cleanTag);
                    }
                  }}
                >{tag}</button>
              ))}
            </div>
          </div>

          {/* Poll of the Week */}
          <div className="nr-sidebar-card">
            <div className="nr-sidebar-header">
              <span className="nr-sidebar-title">Poll of the Week</span>
              <button className="nr-sidebar-view-all">View All</button>
            </div>
            <p className="nr-poll-question">Which alumni initiative would you like to see more of?</p>
            <div className="nr-poll-options">
              {["Mentorship Programs","Startup Funding Help","Networking Events","Job Referrals"].map((opt, i) => (
                <button
                  key={opt}
                  className={`nr-poll-option ${poll === i ? "nr-poll-option--selected" : ""}`}
                  onClick={() => setPoll(i)}
                >
                  <div className="nr-poll-radio">{poll === i && <div className="nr-poll-radio-dot" />}</div>
                  {opt}
                </button>
              ))}
            </div>
            {poll !== null && <button className="nr-poll-vote-btn">Vote</button>}
          </div>
        </aside>
      </div>

      {/* ── Article modal ──────────────────────────────────── */}
      <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
}
