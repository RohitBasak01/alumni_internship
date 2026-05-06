import { useState } from "react";
import { Link } from "react-router-dom";
import { useTenantContext } from "../hooks/useTenantContext.js";

/**
 * HomePage — redesigned platform landing page matching the AlumNet hero design.
 */

const institutions = [
  { name: "SPIT", abbr: "SPIT" },
  { name: "IIT BOMBAY", abbr: "IIT" },
  { name: "IIM AHMEDABAD", abbr: "IIM" },
  { name: "BITS PILANI", abbr: "BITS" },
  { name: "NITIE MUMBAI", abbr: "NITIE" },
  { name: "XLRI JAMSHEDPUR", abbr: "XLRI" },
];

function InstitutionLogo({ name, abbr }) {
  return (
    <div className="hp-inst-logo">
      <div className="hp-inst-icon">{abbr}</div>
      <span className="hp-inst-name">{name}</span>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="hp-mockup-card">
      {/* Mockup header */}
      <div className="hp-mockup-header">
        <div className="hp-mockup-logo">
          <div className="hp-mockup-logo-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>school</span>
          </div>
          <div>
            <div className="hp-mockup-logo-name">AlumNet</div>
            <div className="hp-mockup-logo-sub">SPIT</div>
          </div>
        </div>
        <div className="hp-mockup-topbar">
          <span className="hp-mockup-greeting">Good morning, Aarav 👋</span>
          <span className="hp-mockup-sub-greeting">Your alumni community is thriving today.</span>
        </div>
        <div className="hp-mockup-search">
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#94a3b8" }}>search</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Search anything...</span>
        </div>
      </div>

      <div className="hp-mockup-body">
        {/* Sidebar */}
        <div className="hp-mockup-sidebar">
          {[
            { icon: "dashboard", label: "Dashboard", active: true },
            { icon: "dynamic_feed", label: "Feed" },
            { icon: "people", label: "Members" },
            { icon: "handshake", label: "Mentorship" },
            { icon: "work", label: "Jobs" },
            { icon: "event", label: "Events" },
            { icon: "groups", label: "Groups" },
            { icon: "contacts", label: "Directory" },
            { icon: "newspaper", label: "Newsroom" },
            { icon: "photo_library", label: "Gallery" },
            { icon: "settings", label: "Settings" },
          ].map((item) => (
            <div key={item.label} className={`hp-sidebar-item ${item.active ? "hp-sidebar-item--active" : ""}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
          <div className="hp-sidebar-upgrade">
            <div className="hp-sidebar-upgrade-title">Upgrade to Pro ✦</div>
            <div className="hp-sidebar-upgrade-sub">Unlock premium features</div>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>arrow_forward</span>
          </div>
        </div>

        {/* Main content */}
        <div className="hp-mockup-main">
          {/* Stats row */}
          <div className="hp-stats-row">
            {[
              { icon: "dynamic_feed", label: "Feed Posts", value: "128", change: "+12%", color: "#6366f1" },
              { icon: "group", label: "Network", value: "2.4K", change: "+8%", color: "#0ea5e9" },
              { icon: "handshake", label: "Mentorships", value: "320", change: "+16%", color: "#10b981" },
              { icon: "event", label: "Events", value: "24", change: "+5%", color: "#f59e0b" },
            ].map((stat) => (
              <div key={stat.label} className="hp-stat-card">
                <div className="hp-stat-icon" style={{ color: stat.color }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{stat.icon}</span>
                  <span>{stat.label}</span>
                </div>
                <div className="hp-stat-value">{stat.value}</div>
                <div className="hp-stat-change" style={{ color: "#10b981" }}>{stat.change}</div>
              </div>
            ))}
          </div>

          {/* Bottom two columns */}
          <div className="hp-mockup-bottom">
            {/* Recent activity */}
            <div className="hp-activity-section">
              <div className="hp-section-header">
                <span className="hp-section-title">Recent Activity</span>
                <span className="hp-section-viewall">View All</span>
              </div>
              {[
                { name: "Riya Desai", role: "Product Manager at Finaverse", time: "2h ago", text: "Excited to share that our community mixer was a huge success! 🎉", likes: 42, comments: 12, shares: 8, color: "#6366f1" },
                { name: "Dev Mehta", role: "Engineering Lead at Orbit Systems", time: "5h ago", text: "Looking forward to mentoring 5 final-year students this month.", likes: 25, comments: 8, shares: 4, color: "#0ea5e9" },
                { name: "SPIT Alumni Association", role: "Official", time: "1d ago", text: "Registrations open for the Annual Alumni Meet 2026!", likes: 67, comments: 18, shares: 12, color: "#10b981" },
              ].map((post) => (
                <div key={post.name} className="hp-activity-item">
                  <div className="hp-activity-avatar" style={{ background: post.color }}>{post.name[0]}</div>
                  <div className="hp-activity-content">
                    <div className="hp-activity-name">{post.name} <span className="hp-activity-role">{post.role}</span> <span className="hp-activity-time">{post.time}</span></div>
                    <div className="hp-activity-text">{post.text}</div>
                    <div className="hp-activity-actions">
                      <span>❤️ {post.likes}</span>
                      <span>💬 {post.comments}</span>
                      <span>↗ {post.shares}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Upcoming events */}
            <div className="hp-events-section">
              <div className="hp-section-header">
                <span className="hp-section-title">Upcoming Events</span>
                <span className="hp-section-viewall">View All</span>
              </div>
              {[
                { month: "MAY", day: "24", title: "Annual Alumni Meet 2026", details: "May 24, 2026 • 10:00 AM\nSPIT Campus, Mumbai", color: "#6366f1" },
                { month: "JUN", day: "07", title: "Startup Networking Night", details: "Jun 07, 2026 • 6:30 PM\nWeWork, BKC Mumbai", color: "#10b981" },
                { month: "JUN", day: "21", title: "Career Mentorship Summit", details: "Jun 21, 2026 • 11:00 AM\nOnline Event", color: "#f59e0b" },
              ].map((ev) => (
                <div key={ev.title} className="hp-event-item">
                  <div className="hp-event-date" style={{ borderLeftColor: ev.color }}>
                    <div className="hp-event-month" style={{ color: ev.color }}>{ev.month}</div>
                    <div className="hp-event-day">{ev.day}</div>
                  </div>
                  <div className="hp-event-details">
                    <div className="hp-event-title">{ev.title}</div>
                    <div className="hp-event-meta" style={{ whiteSpace: "pre-line" }}>{ev.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  const tenant = useTenantContext();
  const [instPage, setInstPage] = useState(0);

  return (
    <div className="hp-root">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="hp-navbar">
        <Link className="hp-nav-logo" to={tenant.getTenantAwarePath("/")}>
          <div className="hp-nav-logo-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>school</span>
          </div>
          <div>
            <div className="hp-nav-logo-name">AlumNet</div>
            <div className="hp-nav-logo-sub">SPIT</div>
          </div>
        </Link>

        <nav className="hp-nav-links">
          <a href="#features" className="hp-nav-link">Features</a>
          <a href="#process" className="hp-nav-link">Process</a>
          <a href="#institutes" className="hp-nav-link">Institutes</a>
          <a href="#about" className="hp-nav-link">About Us</a>
          <a href="#contact" className="hp-nav-link">Contact</a>
        </nav>

        <div className="hp-nav-actions">
          <Link to={tenant.getTenantAwarePath("/login")} className="hp-nav-login">Login</Link>
          <Link to={tenant.getTenantAwarePath("/register")} className="hp-nav-join">Join Now</Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="hp-hero" id="main-content">
        {/* Background blobs */}
        <div className="hp-blob hp-blob--tl" />
        <div className="hp-blob hp-blob--br" />

        <div className="hp-hero-inner">
          {/* Left copy */}
          <div className="hp-hero-copy">
            <div className="hp-hero-badge">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>diversity_3</span>
              The Official Alumni Network
            </div>

            <h1 className="hp-hero-headline">
              Reconnect with your <br />
              <span className="hp-hero-highlight">alumni network.</span>
            </h1>

            <p className="hp-hero-sub">
              Build meaningful connections, explore career opportunities, and give back to your alma mater.
            </p>

            <div className="hp-hero-ctas">
              <Link
                to={tenant.getTenantAwarePath("/register")}
                className="hp-cta-primary"
                id="hero-join-btn"
              >
                Join Alumni Network
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
              </Link>
              <Link
                to={tenant.getTenantAwarePath("/request-portal")}
                className="hp-cta-secondary"
                id="hero-explore-btn"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>account_balance</span>
                Explore Institutes
              </Link>
            </div>

            {/* Stats */}
            <div className="hp-hero-stats">
              <div className="hp-stat-pill">
                <span className="material-symbols-outlined hp-stat-pill-icon" style={{ color: "#6366f1" }}>diversity_3</span>
                <div>
                  <div className="hp-stat-pill-value">120K+</div>
                  <div className="hp-stat-pill-label">Alumni</div>
                </div>
              </div>
              <div className="hp-stat-divider" />
              <div className="hp-stat-pill">
                <span className="material-symbols-outlined hp-stat-pill-icon" style={{ color: "#0ea5e9" }}>account_balance</span>
                <div>
                  <div className="hp-stat-pill-value">450+</div>
                  <div className="hp-stat-pill-label">Institutes</div>
                </div>
              </div>
              <div className="hp-stat-divider" />
              <div className="hp-stat-pill">
                <span className="material-symbols-outlined hp-stat-pill-icon" style={{ color: "#f59e0b" }}>work</span>
                <div>
                  <div className="hp-stat-pill-value">15K+</div>
                  <div className="hp-stat-pill-label">Mentorships</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right dashboard mockup */}
          <div className="hp-hero-mockup-wrap">
            <DashboardMockup />

            {/* Floating join notification */}
            <div className="hp-floating-notif">
              <div className="hp-floating-notif-avatars">
                {["A", "B", "C"].map((l, i) => (
                  <div key={i} className="hp-floating-avatar" style={{ zIndex: 3 - i, background: i === 0 ? "#6366f1" : i === 1 ? "#0ea5e9" : "#10b981" }}>{l}</div>
                ))}
              </div>
              <div className="hp-floating-notif-text">
                <span className="hp-floating-notif-name">Arjun and 24 others</span>
                <span className="hp-floating-notif-sub">joined the community this week</span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#10b981" }}>trending_up</span>
            </div>
          </div>
        </div>

        {/* Trusted by institutions strip */}
        <div className="hp-trust-strip" id="institutes">
          <div className="hp-trust-title">Trusted by leading institutions</div>
          <div className="hp-trust-logos">
            <button className="hp-trust-arrow" onClick={() => setInstPage(p => Math.max(0, p - 1))} aria-label="Previous">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {institutions.map((inst) => (
              <InstitutionLogo key={inst.name} name={inst.name} abbr={inst.abbr} />
            ))}
            <button className="hp-trust-arrow" onClick={() => setInstPage(p => p + 1)} aria-label="Next">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="hp-features" id="features">
        <div className="hp-section-label">Platform Features</div>
        <h2 className="hp-features-title">Built for thriving communities</h2>
        <p className="hp-features-sub">Everything you need to maintain a vibrant, supportive institutional network.</p>
        <div className="hp-features-grid">
          {[
            { icon: "contacts", title: "Member Directory", desc: "Find graduates using institution-aware filters like batch, department, organization, and location.", color: "#6366f1" },
            { icon: "groups", title: "Community Hub", desc: "Enable mentorship, collaborations, reunions, and meaningful networking inside one trusted ecosystem.", color: "#0ea5e9" },
            { icon: "work", title: "Opportunities", desc: "Share openings, referrals, volunteering needs, and community opportunities with the right members.", color: "#f59e0b" },
            { icon: "event", title: "Event Management", desc: "Run reunions, webinars, and campus events with seamless RSVP tracking and real-time updates.", color: "#10b981" },
          ].map((f) => (
            <div key={f.title} className="hp-feature-card">
              <div className="hp-feature-icon" style={{ background: f.color + "18", color: f.color }}>
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <h3 className="hp-feature-card-title">{f.title}</h3>
              <p className="hp-feature-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-logo">
            <div className="hp-footer-logo-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>school</span>
            </div>
            <div>
              <div className="hp-footer-logo-name">AlumNet</div>
              <div className="hp-footer-logo-sub">Professional Network</div>
            </div>
          </div>
          <p className="hp-footer-copy">Empowering lifelong connections between institutions and their graduates.</p>
          <div className="hp-footer-links">
            <Link to={tenant.getTenantAwarePath("/legal/privacy")} className="hp-footer-link">Privacy Policy</Link>
            <Link to={tenant.getTenantAwarePath("/legal/terms")} className="hp-footer-link">Terms of Service</Link>
            <a href="mailto:support@alumnet.com" className="hp-footer-link">Contact</a>
          </div>
          <p className="hp-footer-cr">© 2026 AlumNet Professional Network. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
