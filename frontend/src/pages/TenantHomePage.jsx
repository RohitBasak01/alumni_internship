import { Link } from "react-router-dom";

import "../styles/TenantHome.css";
import PageLoader from "../components/PageLoader.jsx";
import TenantPublicStatus from "../components/TenantPublicStatus.jsx";
import { useCurrentTenantPublicProfile } from "../hooks/useCurrentTenantPublicProfile.js";
import { useTenantBranding } from "../hooks/useTenantBranding.js";
import { useTenantContext } from "../hooks/useTenantContext.js";

// Feature definitions — icon, label, description, and the featureFlag key that gates them.
const ALL_FEATURES = [
  {
    key: "enableDirectory",
    icon: "people",
    label: "Member Directory",
    description:
      "Browse graduates and former students with institution-aware filters — batch, department, location, and more."
  },
  {
    key: "enableFriendship",
    icon: "school",
    label: "Friendship",
    description:
      "Connect with experienced alumni for career guidance, skill development, and long-term friendship."
  },
  {
    key: "enableJobs",
    icon: "work",
    label: "Jobs & Opportunities",
    description:
      "Discover job openings, referrals, and volunteering needs shared by trusted community members."
  },
  {
    key: "enableEvents",
    icon: "event",
    label: "Events",
    description:
      "Attend reunions, webinars, seminars, and campus events with seamless RSVP tracking."
  },
  {
    key: "enableAnnouncements",
    icon: "campaign",
    label: "Newsroom",
    description:
      "Stay informed with official announcements, news, and updates from your institution."
  },
  {
    key: "enableGroups",
    icon: "groups",
    label: "Community Groups",
    description:
      "Join batch groups, departmental circles, or interest-based communities within your network."
  }
];

function FeatureCard({ icon, label, description }) {
  return (
    <article className="th-feature-card">
      <span className="th-feature-icon material-symbols-outlined" aria-hidden="true">
        {icon}
      </span>
      <h3>{label}</h3>
      <p>{description}</p>
    </article>
  );
}

function TenantHomePage() {
  const tenant = useTenantContext();
  const profileQuery = useCurrentTenantPublicProfile();
  const profile = profileQuery.data || null;

  // Apply institution branding (CSS vars) as soon as we have data
  useTenantBranding(profile?.branding, true);

  // While loading show a spinner
  if (profileQuery.isLoading) {
    return <PageLoader />;
  }

  // If the portal is inactive / not found show the status screen
  if (profileQuery.isError) {
    const status = profileQuery.error?.data?.details?.portalStatus || "not-found";
    const instituteName = profileQuery.error?.data?.details?.instituteName || "";
    return (
      <TenantPublicStatus
        status={status}
        instituteName={instituteName}
        showBackHome={false}
      />
    );
  }

  const {
    name,
    bio,
    website,
    branding = {},
    featureFlags = {},
    communityLabels = {}
  } = profile;

  const memberPlural = communityLabels.memberPlural || "Alumni";
  const tagline =
    branding.tagline || `Welcome to the ${name} alumni community.`;
  const logoUrl = branding.logoUrl || "";

  // Only show feature cards for enabled features
  const enabledFeatures = ALL_FEATURES.filter(
    (f) => featureFlags[f.key] !== false
  );

  return (
    <div className="th-page">
      {/* ── Skip link ─────────────────────────────────────────────────── */}
      <a href="#th-main" className="th-skip-link">
        Skip to content
      </a>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="th-hero" id="th-main" role="banner">
        <div className="th-hero-glow" aria-hidden="true" />

        <div className="th-hero-inner">
          <div className="th-hero-badge">
            {logoUrl ? (
              <img
                alt={`${name} logo`}
                className="th-logo-img"
                src={logoUrl}
              />
            ) : (
              <span className="th-logo-initials" aria-hidden="true">
                {name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </span>
            )}
          </div>

          <p className="th-kicker">
            {memberPlural} Portal
          </p>

          <h1 className="th-hero-title">
            Connect with the <br/>
            <span className="th-brand-highlight" style={{ color: 'var(--th-primary)' }}>{name}</span> legacy.
          </h1>

          <p className="th-hero-tagline">{tagline}</p>

          <div className="th-hero-actions">
            <Link className="th-btn th-btn-primary" to={tenant.getTenantAwarePath("/login")}>
              Sign In
            </Link>
            <Link className="th-btn th-btn-secondary" to={tenant.getTenantAwarePath("/register")}>
              {memberPlural} Sign Up
            </Link>
          </div>
        </div>
      </section>

      {/* ── About ─────────────────────────────────────────────────────── */}
      {bio && (
        <section className="th-section th-section-muted" id="th-about" aria-labelledby="th-about-heading">
          <div className="th-section-inner th-section-inner--narrow">
            <p className="th-kicker">About Us</p>
            <h2 id="th-about-heading">{name}</h2>
            <p className="th-about-bio">{bio}</p>
            {website && (
              <a
                className="th-btn th-btn-ghost"
                href={website.startsWith("http") ? website : `https://${website}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  language
                </span>
                Visit our website
              </a>
            )}
          </div>
        </section>
      )}

      {/* ── Features ──────────────────────────────────────────────────── */}
      {enabledFeatures.length > 0 && (
        <section className="th-section" id="th-features" aria-labelledby="th-features-heading">
          <div className="th-section-inner">
            <div className="th-section-heading">
              <p className="th-kicker">What's inside</p>
              <h2 id="th-features-heading">
                Everything your community needs
              </h2>
              <p className="th-section-subtitle">
                Your portal brings together the tools that keep{" "}
                {memberPlural.toLowerCase()} connected and engaged.
              </p>
            </div>

            <div className="th-feature-grid" role="list">
              {enabledFeatures.map((feature) => (
                <div key={feature.key} role="listitem">
                  <FeatureCard
                    icon={feature.icon}
                    label={feature.label}
                    description={feature.description}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA banner ────────────────────────────────────────────────── */}
      <section className="th-cta-section" aria-label="Join the community">
        <div className="th-cta-inner">
          <h2>Ready to reconnect?</h2>
          <p>
            Join thousands of {memberPlural.toLowerCase()} already on the
            platform.
          </p>
          <div className="th-cta-actions">
            <Link className="th-btn th-btn-primary th-btn-lg" to={tenant.getTenantAwarePath("/register")}>
              Create your account
            </Link>
            <Link className="th-btn th-btn-outline-white th-btn-lg" to={tenant.getTenantAwarePath("/login")}>
              Already a member? Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="th-footer" role="contentinfo">
        <div className="th-footer-inner">
          <div className="th-footer-brand">
            {logoUrl ? (
              <img
                alt={name}
                className="th-footer-logo"
                src={logoUrl}
              />
            ) : (
              <span className="th-footer-initials" aria-hidden="true">
                {name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </span>
            )}
            <strong>{name}</strong>
          </div>

          <nav className="th-footer-links" aria-label="Footer navigation">
            <Link to={tenant.getTenantAwarePath("/login")}>Sign In</Link>
            <Link to={tenant.getTenantAwarePath("/register")}>Register</Link>
            {website && (
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Institution Website
              </a>
            )}
            <Link to={tenant.getTenantAwarePath("/legal/privacy")}>Privacy</Link>
            <Link to={tenant.getTenantAwarePath("/legal/terms")}>Terms</Link>
          </nav>

          <p className="th-footer-credit">
            Powered by{" "}
            <strong>AlumNet</strong> — the alumni community platform.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default TenantHomePage;
