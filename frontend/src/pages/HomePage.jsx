import { useState } from "react";
import { Link } from "react-router-dom";

import TenantPublicStatus from "../components/TenantPublicStatus.jsx";
import { useCurrentTenantPublicProfile } from "../hooks/useCurrentTenantPublicProfile.js";
import { useTenantBranding } from "../hooks/useTenantBranding.js";
import { useTenantContext } from "../hooks/useTenantContext.js";

const featureCards = [
  {
    title: "Member Directory",
    description:
      "Find graduates or former students using institution-aware filters like batch or leaving year, class or department, organization, and location.",
    icon: "AD"
  },
  {
    title: "Community Hub",
    description:
      "Enable mentorship, collaborations, reunions, and meaningful networking inside one trusted ecosystem.",
    icon: "PH"
  },
  {
    title: "Opportunities",
    description:
      "Share openings, referrals, volunteering needs, and community opportunities with the right members first.",
    icon: "JO"
  },
  {
    title: "Event Management",
    description:
      "Run reunions, webinars, assemblies, and campus events with seamless RSVP tracking and updates.",
    icon: "EM"
  }
];

const steps = [
  {
    number: "1",
    title: "Institution Registration",
    description:
      "Schools, colleges, and universities launch branded portals and import member records through a guided onboarding flow."
  },
  {
    number: "2",
    title: "Member Joining",
    description:
      "Graduates and former students activate their accounts, complete profiles, and verify institutional access."
  },
  {
    number: "3",
    title: "Build Your Network",
    description:
      "Communities grow through opportunities, mentorship, event participation, and ongoing engagement."
  }
];

const testimonials = [
  {
    quote:
      "I found my current mentor through the platform. It has made reconnecting with my institute effortless.",
    name: "Sarah Johnson",
    role: "Business Admin '18",
    rating: 5
  },
  {
    quote:
      "We unified graduate outreach across departments and saw stronger engagement within the first semester.",
    name: "Dr. Robert Lee",
    role: "Dean of Community Relations",
    rating: 5
  },
  {
    quote:
      "We posted a junior developer role and received highly relevant community referrals almost immediately.",
    name: "Michael Chen",
    role: "Computer Science '12",
    rating: 5
  }
];

function StarRating({ rating = 5, max = 5 }) {
  return (
    <span
      className="landing-stars"
      role="img"
      aria-label={`${rating} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span key={i} aria-hidden="true" style={{ color: i < rating ? "#f59e0b" : "#d1d5db" }}>
          ★
        </span>
      ))}
    </span>
  );
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function HomePage() {
  const tenant = useTenantContext();
  const tenantProfileQuery = useCurrentTenantPublicProfile();
  const tenantProfile = tenantProfileQuery.data || null;
  const portalTitle = tenantProfile?.name || tenant.displayName;
  const isTenantPortal = tenant.isTenant;
  useTenantBranding(tenantProfile?.branding, isTenantPortal);

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");

  const tenantStatus = tenantProfileQuery.error?.data?.details?.portalStatus || null;
  const tenantName = tenantProfileQuery.error?.data?.details?.instituteName || "";

  if (isTenantPortal && tenantProfileQuery.isError) {
    return (
      <TenantPublicStatus
        status={tenantStatus || "not-found"}
        instituteName={tenantName}
        showBackHome={false}
      />
    );
  }

  function handleNewsletterSubmit(event) {
    event.preventDefault();
    const email = newsletterEmail.trim();

    if (!email) {
      setNewsletterStatus("error:Please enter your email address.");
      return;
    }

    if (!validateEmail(email)) {
      setNewsletterStatus("error:Please enter a valid email address.");
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem("newsletter_subscribers") || "[]");
      if (stored.includes(email.toLowerCase())) {
        setNewsletterStatus("success:You're already subscribed! We'll keep you updated.");
        return;
      }
      stored.push(email.toLowerCase());
      localStorage.setItem("newsletter_subscribers", JSON.stringify(stored));
    } catch {
      // localStorage unavailable — still show success
    }

    setNewsletterEmail("");
    setNewsletterStatus("success:Thanks for subscribing! We'll keep you updated.");

    setTimeout(() => setNewsletterStatus(""), 5000);
  }

  const newsletterIsError = newsletterStatus.startsWith("error:");
  const newsletterMessage = newsletterStatus.replace(/^(error:|success:)/, "");

  return (
    <div className="landing-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-xl focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>

      <section className="landing-hero" id="main-content" role="banner">
        <div className="landing-hero-copy">
          <p className="landing-kicker">
            {isTenantPortal ? "Institution community portal" : "Platform for modern institution communities"}
          </p>
          <h1>
            {isTenantPortal ? (
              <>
                Welcome to the <span>{portalTitle}</span> community portal.
              </>
            ) : (
              <>
                Reconnect, collaborate, and grow with your <span>institution community.</span>
              </>
            )}
          </h1>
          <p className="landing-hero-text">
            {isTenantPortal
              ? tenantProfile?.branding?.tagline ||
                "Access alumni updates, events, mentorship, and opportunities tailored to your institution."
              : "The all-in-one platform for schools, colleges, and universities to engage graduates, foster mentorship, promote opportunities, and keep lifelong relationships active."}
          </p>
          <div className="landing-hero-actions">
            {isTenantPortal ? (
              <>
                <Link className="button primary" to="/login">
                  Login
                </Link>
                <Link className="button secondary" to="/register">
                  Alumni Signup
                </Link>
              </>
            ) : (
              <>
                <Link className="button primary" to="/request-portal">
                  Get Started
                </Link>
                <Link className="button secondary" to="/portal">
                  View Demo
                </Link>
              </>
            )}
          </div>
          <div className="landing-social-proof">
            <div className="landing-avatar-stack" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p>
              {isTenantPortal
                ? `${portalTitle} members can join using institution-verified registration.`
                : "Join growing institutions building stronger alumni communities"}
            </p>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-photo-frame">
            <div className="landing-photo-scene">
              <span className="landing-person left" />
              <span className="landing-person center" />
              <span className="landing-person right" />
            </div>
          </div>
          <article className="landing-stat-card" aria-label="Community growth indicator">
            <span className="landing-stat-icon" aria-hidden="true">
              <span className="material-symbols-outlined">school</span>
            </span>
            <div>
              <p>Growing Community</p>
              <strong>Alumni Network</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-section" id="features" aria-labelledby="features-heading">
        <div className="landing-section-heading centered">
          <p className="landing-kicker">Platform Features</p>
          <h2 id="features-heading">Empowering your institution ecosystem</h2>
          <p>
            Everything you need to maintain a vibrant, supportive institution community in
            one place.
          </p>
        </div>
        <div className="landing-feature-grid" role="list">
          {featureCards.map((feature) => (
            <article className="landing-feature-card" key={feature.title} role="listitem">
              <span className="landing-feature-icon" aria-hidden="true">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-muted" id="how-it-works" aria-labelledby="how-it-works-heading">
        <div className="landing-section-heading centered">
          <h2 id="how-it-works-heading">How to get started</h2>
        </div>
        <div className="landing-timeline" role="list">
          {steps.map((step) => (
            <article className="landing-step" key={step.number} role="listitem">
              <div className="landing-step-copy">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              <span className="landing-step-number" aria-hidden="true">{step.number}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-soft" id="testimonials" aria-labelledby="testimonials-heading">
        <div className="landing-section-heading centered">
          <h2 id="testimonials-heading">Success stories</h2>
        </div>
        <div className="landing-testimonial-grid" role="list">
          {testimonials.map((testimonial) => (
            <article className="landing-testimonial-card" key={testimonial.name} role="listitem">
              <StarRating rating={testimonial.rating} />
              <blockquote>"{testimonial.quote}"</blockquote>
              <div className="landing-testimonial-author">
                <span className="landing-avatar-badge" aria-hidden="true">{testimonial.name.slice(0, 1)}</span>
                <div>
                  <strong>{testimonial.name}</strong>
                  <p>{testimonial.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer" role="contentinfo">
        <div className="landing-footer-grid">
          <div>
            <div className="landing-footer-brand">
              <span className="landing-footer-mark" aria-hidden="true">AN</span>
              <strong>AlumNet</strong>
            </div>
            <p>
              Empowering lifelong connections between institutions and their graduates
              through modern community infrastructure.
            </p>
          </div>
          <div>
            <h3>Company</h3>
            <a href="#features">About Us</a>
            <a href="mailto:support@alumniconnect.com">Contact</a>
            <a href="#how-it-works" title="Learn how to get started">How It Works</a>
          </div>
          <div>
            <h3>Legal</h3>
            <Link to="/legal/privacy">Privacy Policy</Link>
            <Link to="/legal/terms">Terms of Service</Link>
            <Link to="/legal/cookies">Cookie Policy</Link>
          </div>
          <div>
            <h3>Subscribe</h3>
            <p>Stay updated with the latest in institution engagement.</p>
            <form
              className="landing-subscribe-form"
              onSubmit={handleNewsletterSubmit}
              noValidate
            >
              <input
                placeholder="Email"
                type="email"
                value={newsletterEmail}
                onChange={(e) => {
                  setNewsletterEmail(e.target.value);
                  if (newsletterStatus) setNewsletterStatus("");
                }}
                aria-label="Email address for newsletter"
                required
              />
              <button className="button primary compact" type="submit">
                Join
              </button>
            </form>
            {newsletterMessage ? (
              <p
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: newsletterIsError ? "#dc2626" : "#16a34a",
                }}
                role={newsletterIsError ? "alert" : "status"}
              >
                {newsletterMessage}
              </p>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
