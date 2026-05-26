import { useState } from "react";
import { Link } from "react-router-dom";
import { useTenantContext } from "../hooks/useTenantContext.js";
import "../styles/HomePage.css";

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

const mockupStats = [
  { icon: "dynamic_feed", label: "Feed Posts", value: "128", change: "+12%", tone: "coral" },
  { icon: "group", label: "Network", value: "2.4K", change: "+8%", tone: "violet" },
  { icon: "work", label: "Referrals", value: "320", change: "+16%", tone: "emerald" },
  { icon: "event", label: "Events", value: "24", change: "+5%", tone: "amber" },
];

const featureCards = [
  {
    icon: "contacts",
    title: "Member Directory",
    desc: "Find graduates using institution-aware filters like batch, department, organization, and location.",
    tone: "violet"
  },
  {
    icon: "groups",
    title: "Community Hub",
    desc: "Enable mentorship, collaborations, reunions, and meaningful networking inside one trusted ecosystem.",
    tone: "teal"
  },
  {
    icon: "work",
    title: "Opportunities",
    desc: "Share openings, referrals, volunteering needs, and community opportunities with the right members.",
    tone: "emerald"
  },
  {
    icon: "event",
    title: "Event Management",
    desc: "Run reunions, webinars, and campus events with seamless RSVP tracking and real-time updates.",
    tone: "amber"
  },
];

const journeySteps = [
  { icon: "account_balance", title: "Launch a branded portal", text: "Create a trusted home that looks connected to the institution from day one.", tone: "blue" },
  { icon: "diversity_3", title: "Activate alumni circles", text: "Bring batches, departments, mentors, and clubs into one shared community rhythm.", tone: "teal" },
  { icon: "rocket_launch", title: "Grow career momentum", text: "Turn alumni goodwill into referrals, events, advice, and measurable engagement.", tone: "rose" },
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
          <span className="hp-mockup-greeting">Good morning, Aarav</span>
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
            { icon: "handshake", label: "Friendship" },
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
            {mockupStats.map((stat) => (
              <div key={stat.label} className={`hp-stat-card hp-tone-${stat.tone}`}>
                <div className="hp-stat-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{stat.icon}</span>
                  <span>{stat.label}</span>
                </div>
                <div className="hp-stat-value">{stat.value}</div>
                <div className="hp-stat-change">{stat.change}</div>
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
                { name: "Riya Desai", role: "Product Manager at Finaverse", time: "2h ago", text: "Community mixer highlights are live now.", likes: 42, comments: 12, shares: 8, tone: "violet" },
                { name: "Dev Mehta", role: "Engineering Lead at Orbit Systems", time: "5h ago", text: "Looking forward to mentoring five final-year students this month.", likes: 25, comments: 8, shares: 4, tone: "cyan" },
                { name: "SPIT Alumni Association", role: "Official", time: "1d ago", text: "Registrations open for the Annual Alumni Meet 2026.", likes: 67, comments: 18, shares: 12, tone: "emerald" },
              ].map((post) => (
                <div key={post.name} className="hp-activity-item">
                  <div className={`hp-activity-avatar hp-tone-${post.tone}`}>{post.name[0]}</div>
                  <div className="hp-activity-content">
                    <div className="hp-activity-name">{post.name} <span className="hp-activity-role">{post.role}</span> <span className="hp-activity-time">{post.time}</span></div>
                    <div className="hp-activity-text">{post.text}</div>
                    <div className="hp-activity-actions">
                      <span>favorite {post.likes}</span>
                      <span>comment {post.comments}</span>
                      <span>share {post.shares}</span>
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
                { month: "MAY", day: "24", title: "Annual Alumni Meet 2026", details: "May 24, 2026 - 10:00 AM\nSPIT Campus, Mumbai", tone: "violet" },
                { month: "JUN", day: "07", title: "Startup Networking Night", details: "Jun 07, 2026 - 6:30 PM\nWeWork, BKC Mumbai", tone: "emerald" },
                { month: "JUN", day: "21", title: "Career Mentorship Summit", details: "Jun 21, 2026 - 11:00 AM\nOnline Event", tone: "amber" },
              ].map((ev) => (
                <div key={ev.title} className={`hp-event-item hp-tone-${ev.tone}`}>
                  <div className="hp-event-date">
                    <div className="hp-event-month">{ev.month}</div>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleInstitutions = institutions.slice(
    instPage % institutions.length
  ).concat(institutions.slice(0, instPage % institutions.length));

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
          <Link to={tenant.getTenantAwarePath("/request-portal")} className="hp-nav-request">
            Request Portal
          </Link>
          <Link to={tenant.getTenantAwarePath("/login")} className="hp-nav-login">Login</Link>
          <Link to={tenant.getTenantAwarePath("/register")} className="hp-nav-join">Join Now</Link>
          <button
            className="hp-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="hp-mobile-menu"
          >
            <span className="material-symbols-outlined">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div
            className="hp-mobile-menu-overlay"
            onClick={() => setMobileMenuOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <div className="hp-mobile-menu" onClick={(e) => e.stopPropagation()}>
              <nav
                id="hp-mobile-menu"
                className="hp-mobile-nav-links"
                aria-label="Mobile navigation"
              >
                <a href="#features" className="hp-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Features</a>
                <a href="#process" className="hp-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Process</a>
                <a href="#institutes" className="hp-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Institutes</a>
                <a href="#about" className="hp-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>About Us</a>
                <a href="#contact" className="hp-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Contact</a>
                <div className="hp-mobile-nav-actions">
                  <Link to={tenant.getTenantAwarePath("/request-portal")} className="hp-mobile-nav-request" onClick={() => setMobileMenuOpen(false)}>Request Portal</Link>
                  <Link to={tenant.getTenantAwarePath("/login")} className="hp-mobile-nav-login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  <Link to={tenant.getTenantAwarePath("/register")} className="hp-mobile-nav-join" onClick={() => setMobileMenuOpen(false)}>Join Now</Link>
                </div>
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="hp-hero" id="main-content">
        <div className="hp-hero-pattern" aria-hidden="true" />

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
                Request Portal
              </Link>
            </div>

            {/* Stats */}
            <div className="hp-hero-stats">
              <div className="hp-stat-pill">
                <span className="material-symbols-outlined hp-stat-pill-icon" style={{ color: "#7c3aed" }}>diversity_3</span>
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
                  <div className="hp-stat-pill-label">Friendships</div>
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
                  <div key={i} className="hp-floating-avatar" style={{ zIndex: 3 - i, background: i === 0 ? "#7c3aed" : i === 1 ? "#0ea5e9" : "#10b981" }}>{l}</div>
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
            <button className="hp-trust-arrow" onClick={() => setInstPage((p) => Math.max(0, p - 1))} aria-label="Previous">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {visibleInstitutions.map((inst) => (
              <InstitutionLogo key={inst.name} name={inst.name} abbr={inst.abbr} />
            ))}
            <button className="hp-trust-arrow" onClick={() => setInstPage((p) => p + 1)} aria-label="Next">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      <section className="hp-network" id="process">
        <div className="hp-network-copy">
          <div className="hp-section-label">Community rhythm</div>
          <h2 className="hp-features-title">From quiet database to living alumni network</h2>
          <p className="hp-features-sub">
            AlumNet turns institution records into an active portal where alumni can find each other, show up for events, and create useful career momentum.
          </p>
        </div>
        <div className="hp-journey-grid">
          {journeySteps.map((step, index) => (
            <article key={step.title} className={`hp-journey-card hp-tone-${step.tone}`}>
              <div className="hp-journey-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="hp-journey-icon">
                <span className="material-symbols-outlined">{step.icon}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="hp-features" id="features">
        <div className="hp-section-label">Platform Features</div>
        <h2 className="hp-features-title">Built for thriving communities</h2>
        <p className="hp-features-sub">Everything you need to maintain a vibrant, supportive institutional network.</p>
        <div className="hp-features-grid">
          {featureCards.map((f) => (
            <div key={f.title} className={`hp-feature-card hp-tone-${f.tone}`}>
              <div className="hp-feature-icon">
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <h3 className="hp-feature-card-title">{f.title}</h3>
              <p className="hp-feature-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="hp-cta-band" id="about">
        <div className="hp-cta-band-inner">
          <div>
            <div className="hp-section-label hp-section-label--light">For institutions</div>
            <h2>Launch a portal that feels alive on day one.</h2>
            <p>
              Pair institution branding with community tools for alumni discovery, events, jobs, groups, announcements, and a cleaner admin workflow.
            </p>
          </div>
          <Link to={tenant.getTenantAwarePath("/request-portal")} className="hp-cta-band-button">
            Request Portal
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="hp-footer" id="contact">
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
            <Link to={tenant.getTenantAwarePath("/request-portal")} className="hp-footer-link">Request Portal</Link>
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
