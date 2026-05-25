import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import "../styles/TenantHome.css";
import PageLoader from "../components/PageLoader.jsx";
import TenantPublicStatus from "../components/TenantPublicStatus.jsx";
import { ButtonLoadingSpinner } from "../components/LoadingSpinner.jsx";
import { useCurrentTenantPublicProfile } from "../hooks/useCurrentTenantPublicProfile.js";
import { useTenantBranding } from "../hooks/useTenantBranding.js";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { usePublicHomeContent } from "../hooks/usePublicHomeContent.js";
import { useScrollReveal } from "../hooks/useScrollReveal.js";
import { useAuth } from "../context/AuthContext.jsx";
import { login, getOAuthStartUrl, fetchPublicInstitutes, resolveApiAssetUrl } from "../lib/api.js";

function getDemoAccounts() {
  if (import.meta.env.PROD) {
    return [];
  }

  const rawValue = import.meta.env.VITE_DEMO_ACCOUNTS;

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (account) =>
        account &&
        typeof account.label === "string" &&
        typeof account.email === "string" &&
        typeof account.password === "string" &&
        !account.email.includes("@example.") &&
        account.password !== "YourPassword",
    );
  } catch {
    return [];
  }
}

function TenantHomePage() {
  const tenant = useTenantContext();
  const profileQuery = useCurrentTenantPublicProfile();
  const profile = profileQuery.data || null;
  const homeContentQuery = usePublicHomeContent();
  const homeContent = homeContentQuery.data || {};

  // Apply institution branding (CSS vars) as soon as we have data
  useTenantBranding(profile?.branding, true);

  const auth = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("signin"); // "signin" | "signup"
  const [activeContentTab, setActiveContentTab] = useState("updates"); // "updates" | "announcements" | "events"

  // Sign In Form State
  const [signInForm, setSignInForm] = useState({ email: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [signInError, setSignInError] = useState("");

  // Sign Up Form State
  const [signUpEmail, setSignUpEmail] = useState("");

  // Scroll reveal hook (must be before any early returns)
  const pageRef = useRef(null);
  useScrollReveal(pageRef);

  // Slideshow Logic
  const galleryImages = homeContent.gallery && homeContent.gallery.length > 0
    ? homeContent.gallery.filter(item => item.mediaType !== 'video').map(item => ({
        url: resolveApiAssetUrl(item.url),
        caption: item.caption || "Campus Moments"
      }))
    : [];

  const DEFAULT_SLIDES = [
    {
      url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80",
      caption: "Empowering Next-Generation Leaders"
    },
    {
      url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
      caption: "A Legacy of Innovation & Excellence"
    },
    {
      url: "https://images.unsplash.com/photo-1525921429624-479b6c294b4e?auto=format&fit=crop&w=1200&q=80",
      caption: "Building Lifelong Connections Globally"
    }
  ];

  const slides = galleryImages.length > 0 ? galleryImages : DEFAULT_SLIDES;
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      auth.login(data.user);
      navigate(data.user.role === "super_admin" ? "/super-admin" : "/portal");
    },
    onError: (err) => {
      setSignInError(err.response?.data?.message || "Invalid email or password");
    }
  });

  // While loading show a spinner
  if (profileQuery.isLoading || homeContentQuery.isLoading) {
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
    communityLabels = {},
    socialLinks = {},
    primaryContactEmail = ""
  } = profile;

  const memberPlural = communityLabels.memberPlural || "Alumni";
  const tagline =
    branding.tagline || `Welcome to the ${name} alumni community.`;
  const logoUrl = branding.logoUrl || "";

  const allDemoAccounts = getDemoAccounts();
  const demoAccounts = tenant.isTenant
    ? allDemoAccounts.filter(
        (account) =>
          String(account.tenantSubdomain || "")
            .trim()
            .toLowerCase() ===
          String(profile?.subdomain || tenant.slug || "")
            .trim()
            .toLowerCase(),
      )
    : allDemoAccounts;

  const handleSignInSubmit = (e) => {
    e.preventDefault();
    setSignInError("");

    if (typeof window !== "undefined") {
      const matchedDemoAccount = demoAccounts.find(
        (account) =>
          String(account.email || "")
            .trim()
            .toLowerCase() === signInForm.email.trim().toLowerCase(),
      );

      if (matchedDemoAccount) {
        const tenantSubdomain = String(matchedDemoAccount.tenantSubdomain || "")
          .trim()
          .toLowerCase();
        const tenantDomain = String(matchedDemoAccount.tenantDomain || "")
          .trim()
          .toLowerCase();

        if (tenantSubdomain) {
          window.localStorage.setItem("tenantSubdomain", tenantSubdomain);
        } else {
          window.localStorage.removeItem("tenantSubdomain");
        }

        if (tenantDomain) {
          window.localStorage.setItem("tenantDomain", tenantDomain);
        } else {
          window.localStorage.removeItem("tenantDomain");
        }
      }
    }

    loginMutation.mutate({
      email: signInForm.email,
      password: signInForm.password,
    });
  };

  const handleSocialAction = (provider, mode = "login") => {
    window.location.assign(getOAuthStartUrl(provider, { mode }));
  };

  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    const regPath = tenant.getTenantAwarePath("/register");
    navigate(`${regPath}?provider=email&email=${encodeURIComponent(signUpEmail)}`);
  };


  return (
    <div className="th-page" ref={pageRef}>
      {/* ── Skip link ─────────────────────────────────────────────────── */}
      <a href="#th-main" className="th-skip-link">
        Skip to content
      </a>

      {/* ── Split Hero Layout ─────────────────────────────────────────── */}
      <section className="th-hero" id="th-main" role="banner">
        <div className="th-hero-glow" aria-hidden="true" />
        
        <div className="th-hero-split-container">
          
          {/* Left Column: Rotating Media Slideshow Banner */}
          <div className="th-hero-slider-col">
            <div className="th-hero-slider">
              {slides.map((slide, idx) => (
                <div 
                  key={idx} 
                  className={`th-slide ${idx === currentSlideIdx ? 'th-slide--active' : ''}`}
                >
                  <img src={slide.url} alt={slide.caption} className="th-slide-image" />
                  <div className="th-slide-overlay" />
                </div>
              ))}
              
              {/* Institution Logo & Floating Badge Overlay */}
              <div className="th-slider-badge-overlay">
                <div className="th-hero-badge">
                  {logoUrl ? (
                    <img
                      alt={`${name} logo`}
                      className="th-logo-img"
                      src={resolveApiAssetUrl(logoUrl)}
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
                <div className="th-slider-brand-info">
                  <span className="th-kicker">{memberPlural} Portal</span>
                  <h2 className="th-slider-brand-title">{name}</h2>
                </div>
              </div>

              {/* Dynamic Slideshow Caption */}
              <div className="th-slider-caption-overlay">
                <p className="th-slider-caption-text">
                  {slides[currentSlideIdx]?.caption}
                </p>
                <div className="th-slider-indicator-dots">
                  {slides.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentSlideIdx(idx)}
                      className={`th-slider-dot ${idx === currentSlideIdx ? 'th-slider-dot--active' : ''}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Compact Tabbed Glassmorphic Authentication Card */}
          <div className="th-hero-auth-col">
            <div className="th-hero-auth-card">
              
              {/* Tab Switcher */}
              <div className="th-auth-tabs">
                <button 
                  onClick={() => setActiveTab("signin")}
                  className={`th-auth-tab ${activeTab === "signin" ? "th-auth-tab--active" : ""}`}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setActiveTab("signup")}
                  className={`th-auth-tab ${activeTab === "signup" ? "th-auth-tab--active" : ""}`}
                >
                  Quick Sign Up
                </button>
              </div>

              {/* Tab Content: Sign In Form */}
              {activeTab === "signin" && (
                <form className="th-auth-form" onSubmit={handleSignInSubmit}>
                  <div className="th-form-header">
                    <h3>Welcome Back</h3>
                    <p>Enter your credentials to access the portal.</p>
                  </div>

                  <div className="th-input-group">
                    <label className="th-input-label">Email Address</label>
                    <div className="th-input-wrapper">
                      <span className="material-symbols-outlined th-input-icon">mail</span>
                      <input 
                        type="email"
                        required
                        placeholder="name@university.edu"
                        value={signInForm.email}
                        onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                        className="th-form-input"
                      />
                    </div>
                  </div>

                  <div className="th-input-group">
                    <label className="th-input-label">Password</label>
                    <div className="th-input-wrapper">
                      <span className="material-symbols-outlined th-input-icon">lock</span>
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={signInForm.password}
                        onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                        className="th-form-input"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="th-password-toggle"
                      >
                        <span className="material-symbols-outlined">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {signInError && (
                    <div className="th-form-error-msg">
                      <span className="material-symbols-outlined">error</span>
                      <span>{signInError}</span>
                    </div>
                  )}

                  <div className="th-form-meta">
                    <Link to={tenant.getTenantAwarePath("/forgot-password")} className="th-forgot-password-link">
                      Forgot Password?
                    </Link>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loginMutation.isPending}
                    className="th-btn th-btn-primary th-auth-submit-btn"
                  >
                    {loginMutation.isPending && <ButtonLoadingSpinner />}
                    {loginMutation.isPending ? "Signing In..." : "Sign In to Portal"}
                  </button>

                  {/* Social Sign In options */}
                  <div className="th-social-divider">
                    <span>or continue with</span>
                  </div>
                  <div className="th-social-grid">
                    <button 
                      type="button"
                      onClick={() => handleSocialAction("google", "login")}
                      className="th-social-btn"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                      Google
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSocialAction("linkedin", "login")}
                      className="th-social-btn th-social-btn--linkedin"
                    >
                      <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" className="brightness-0 invert" />
                      LinkedIn
                    </button>
                  </div>

                  {/* Demo Accounts Quick-Select panel */}
                  {demoAccounts.length > 0 && (
                    <div className="th-demo-accounts-panel">
                      <p className="th-demo-header">
                        <span className="material-symbols-outlined">science</span>
                        Quick-Select Demo Accounts
                      </p>
                      <div className="th-demo-grid">
                        {demoAccounts.map((account) => (
                          <button
                            type="button"
                            key={account.email}
                            onClick={() => setSignInForm({ ...signInForm, email: account.email, password: account.password })}
                            className="th-demo-btn"
                          >
                            <span className="th-demo-label">{account.label}</span>
                            <span className="material-symbols-outlined">login</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* Tab Content: Quick Sign Up Form */}
              {activeTab === "signup" && (
                <form className="th-auth-form" onSubmit={handleSignUpSubmit}>
                  <div className="th-form-header">
                    <h3>Get Started</h3>
                    <p>Enter your email to verify and start the onboarding wizard.</p>
                  </div>

                  <div className="th-input-group">
                    <label className="th-input-label">Email Address</label>
                    <div className="th-input-wrapper">
                      <span className="material-symbols-outlined th-input-icon">mail</span>
                      <input 
                        type="email"
                        required
                        placeholder="name@university.edu"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        className="th-form-input"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="th-btn th-btn-primary th-auth-submit-btn"
                  >
                    Get Started
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>

                  {/* Social Sign Up Options */}
                  <div className="th-social-divider">
                    <span>or register with</span>
                  </div>
                  <div className="th-social-grid">
                    <button 
                      type="button"
                      onClick={() => handleSocialAction("google", "register")}
                      className="th-social-btn"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                      Google
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSocialAction("linkedin", "register")}
                      className="th-social-btn th-social-btn--linkedin"
                    >
                      <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" className="brightness-0 invert" />
                      LinkedIn
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Scrolling News Ticker Section (Eye-catching Place) ─────────── */}
      {homeContent.latestUpdates && homeContent.latestUpdates.length > 0 && (
        <div className="th-news-ticker" role="region" aria-label="Latest updates ticker">
          <div className="th-ticker-label">
            <span className="material-symbols-outlined">campaign</span>
            <span>LATEST</span>
          </div>
          <div className="th-ticker-content">
            <div className="th-ticker-track">
              {/* Duplicate the items once to allow seamless looping infinite marquee scroll */}
              {[...homeContent.latestUpdates, ...homeContent.latestUpdates].map((update, idx) => {
                let icon = "info";
                if (update.category === "Announcement") icon = "campaign";
                if (update.category === "Event") icon = "event";
                if (update.category === "Career") icon = "work";
                if (update.category === "Campus") icon = "school";
                
                return (
                  <span key={idx} className="th-ticker-item">
                    <span className="material-symbols-outlined th-ticker-item-icon">{icon}</span>
                    <span className="th-ticker-item-text">{update.text}</span>
                    <span className="th-ticker-bullet">•</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── About ─────────────────────────────────────────────────────── */}
      {bio && (
        <section className="th-section th-section-muted reveal" id="th-about" aria-labelledby="th-about-heading">
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

      {/* ── Quick Links ────────────────────────────────────────────────── */}
      {profile.quickLinks && profile.quickLinks.filter(l => l.enabled).length > 0 && (
        <section className="th-section th-section-muted reveal" aria-labelledby="th-quick-links-heading">
          <div className="th-section-inner th-quick-links-container">
            {profile.quickLinks.filter(l => l.enabled).map((link, i) => (
              <a key={i} href={link.url} className="th-quick-link-card" target={link.url.startsWith("http") ? "_blank" : "_self"} rel="noreferrer">
                <span className="material-symbols-outlined">{link.icon || "link"}</span>
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── Dynamic News & Updates Section ────────────────────────────── */}
      <section className="th-section th-news-updates-section reveal" aria-labelledby="th-updates-heading">
        <div className="th-section-inner">
          <div className="th-updates-section-header">
            <div>
              <p className="th-kicker">Stay Informed</p>
              <h2 id="th-updates-heading">Campus Bulletins & Updates</h2>
            </div>
            
            {/* Updates Tab Selector */}
            <div className="th-updates-tabs">
              <button 
                onClick={() => setActiveContentTab("updates")}
                className={`th-updates-tab ${activeContentTab === "updates" ? "th-updates-tab--active" : ""}`}
              >
                <span className="material-symbols-outlined">timeline</span>
                Updates Timeline
              </button>
              <button 
                onClick={() => setActiveContentTab("announcements")}
                className={`th-updates-tab ${activeContentTab === "announcements" ? "th-updates-tab--active" : ""}`}
              >
                <span className="material-symbols-outlined">campaign</span>
                Newsroom
              </button>
              <button 
                onClick={() => setActiveContentTab("events")}
                className={`th-updates-tab ${activeContentTab === "events" ? "th-updates-tab--active" : ""}`}
              >
                <span className="material-symbols-outlined">event</span>
                Events
              </button>
            </div>
          </div>

          <div className="th-updates-content-area">
            {/* Tab 1: Updates Timeline */}
            {activeContentTab === "updates" && (
              <div className="th-timeline-container">
                {homeContent.latestUpdates && homeContent.latestUpdates.length > 0 ? (
                  <div className="th-timeline">
                    {homeContent.latestUpdates.map((update, idx) => {
                      let icon = "info";
                      let badgeClass = "th-badge-general";
                      if (update.category === "Announcement") {
                        icon = "campaign";
                        badgeClass = "th-badge-announcement";
                      } else if (update.category === "Event") {
                        icon = "event";
                        badgeClass = "th-badge-event";
                      } else if (update.category === "Career") {
                        icon = "work";
                        badgeClass = "th-badge-career";
                      } else if (update.category === "Campus") {
                        icon = "school";
                        badgeClass = "th-badge-campus";
                      }
                      
                      return (
                        <div key={idx} className="th-timeline-item">
                          <div className="th-timeline-badge-col">
                            <div className={`th-timeline-badge ${badgeClass}`}>
                              <span className="material-symbols-outlined">{icon}</span>
                            </div>
                            {idx < homeContent.latestUpdates.length - 1 && <div className="th-timeline-connector" />}
                          </div>
                          <div className="th-timeline-content-card">
                            <div className="th-timeline-meta">
                              <span className={`th-category-tag ${badgeClass}`}>{update.category}</span>
                              <span className="th-timeline-time">
                                {new Date(update.date).toLocaleDateString(undefined, { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </span>
                            </div>
                            <p className="th-timeline-text">{update.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="th-empty-updates">
                    <span className="material-symbols-outlined">notifications_off</span>
                    <p>No recent bulletins or updates posted yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Newsroom (Official Announcements) */}
            {activeContentTab === "announcements" && (
              <div className="th-announcements-grid-view">
                {homeContent.announcements && homeContent.announcements.length > 0 ? (
                  <div className="th-news-list">
                    {homeContent.announcements.map(item => (
                      <div key={item._id} className="th-news-item">
                        <div className="th-news-date">
                          {new Date(item.publishedAt || item.createdAt).toLocaleDateString(undefined, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <Link to={tenant.getTenantAwarePath("/portal/announcements")} className="th-news-title">
                          {item.title}
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="th-empty-updates">
                    <span className="material-symbols-outlined">campaign</span>
                    <p>No official announcements found.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Events */}
            {activeContentTab === "events" && (
              <div className="th-events-grid-view">
                {homeContent.events && homeContent.events.length > 0 ? (
                  <div className="th-events-list">
                    {homeContent.events.map(event => {
                      const date = new Date(event.eventDate);
                      return (
                        <div key={event._id} className="th-event-card">
                          <div className="th-event-date-badge">
                            <span className="th-event-month">{date.toLocaleString('default', { month: 'short' })}</span>
                            <span className="th-event-day">{date.getDate()}</span>
                          </div>
                          <div className="th-event-info">
                            <Link to={tenant.getTenantAwarePath("/portal/events")} className="th-event-title">{event.title}</Link>
                            <div className="th-event-meta">
                              <span className="material-symbols-outlined">location_on</span>
                              {event.isVirtual ? "Virtual" : event.location || "TBA"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="th-empty-updates">
                    <span className="material-symbols-outlined">event_busy</span>
                    <p>No upcoming events scheduled.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Leadership Messages ─────────────────────────────────────── */}
      {profile.leadershipMessages && profile.leadershipMessages.map((msg, i) => (
        <section key={i} className={`th-section reveal ${i % 2 === 0 ? "th-section-muted" : ""}`}>
          <div className={`th-section-inner th-leadership-message ${i % 2 !== 0 ? "th-leadership-message-reverse" : ""}`}>
            <div className="th-leadership-photo">
              {msg.photoUrl ? (
                <img src={resolveApiAssetUrl(msg.photoUrl)} alt={msg.name} />
              ) : (
                <div className="th-leadership-photo-placeholder">
                  <span className="material-symbols-outlined">person</span>
                </div>
              )}
              <div className="th-leadership-nameplate">
                <strong>{msg.name}</strong>
                <span>{msg.title || msg.role}</span>
              </div>
            </div>
            <div className="th-leadership-content">
              <h3>Message from {msg.role}</h3>
              {msg.salutation && <p className="th-leadership-salutation">{msg.salutation}</p>}
              <p className="th-leadership-text">{msg.message}</p>
              <Link to={tenant.getTenantAwarePath("/login")} className="th-btn th-btn-ghost">
                Read Full Message
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      ))}

      {/* ── Gallery ──────────────────────────────────────────────────── */}
      {homeContent.gallery?.length > 0 && (
        <section className="th-section reveal" aria-labelledby="th-gallery-heading">
          <div className="th-section-inner">
            <h2 id="th-gallery-heading" className="th-section-title">Gallery</h2>
            <div className="th-gallery-row">
              {homeContent.gallery.map(item => (
                <div key={item._id} className="th-gallery-item">
                  {item.mediaType === 'video' ? (
                    <div className="th-gallery-video-placeholder">
                      <span className="material-symbols-outlined">play_circle</span>
                    </div>
                  ) : (
                    <img src={resolveApiAssetUrl(item.url)} alt={item.caption || "Gallery item"} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Latest Members ───────────────────────────────────────────── */}
      {homeContent.latestMembers?.length > 0 && (
        <section className="th-section th-section-muted reveal" aria-labelledby="th-members-heading">
          <div className="th-section-inner">
            <h2 id="th-members-heading" className="th-section-title">Latest Members</h2>
            <div className="th-members-row">
              {homeContent.latestMembers.map(member => (
                <div key={member._id} className="th-member-card">
                  {member.profilePhotoUrl ? (
                    <img src={resolveApiAssetUrl(member.profilePhotoUrl)} alt={member.userId?.name} />
                  ) : (
                    <div className="th-member-placeholder">
                      {member.userId?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <span className="th-member-name">{member.userId?.name}</span>
                  <span className="th-member-meta">{member.batch || member.department || ""}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA banner ────────────────────────────────────────────────── */}
      <section className="th-cta-section reveal reveal-scale" aria-label="Join the community">
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
          <div className="th-footer-grid">
            {/* Column 1: Brand details & Tagline */}
            <div className="th-footer-brand-col">
              <div className="th-footer-brand">
                {logoUrl ? (
                  <img
                    alt={name}
                    className="th-footer-logo"
                    src={resolveApiAssetUrl(logoUrl)}
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
              <p className="th-footer-tagline">
                {tagline || bio || "Connecting alumni, fostering professional growth, and celebrating lifelong institutional pride."}
              </p>
            </div>

            {/* Column 2: Navigation Links */}
            <div className="th-footer-links-col">
              <h4 className="th-footer-column-title">Community</h4>
              <nav className="th-footer-column-links" aria-label="Footer community navigation">
                <Link to={tenant.getTenantAwarePath("/login")}>Sign In</Link>
                <Link to={tenant.getTenantAwarePath("/register")}>Register</Link>
                {featureFlags.enableEvents && (
                  <Link to={tenant.getTenantAwarePath("/portal/events")}>Events</Link>
                )}
                {featureFlags.enableJobs && (
                  <Link to={tenant.getTenantAwarePath("/portal/jobs")}>Careers</Link>
                )}
              </nav>
            </div>

            {/* Column 3: Resources */}
            <div className="th-footer-links-col">
              <h4 className="th-footer-column-title">Resources</h4>
              <nav className="th-footer-column-links" aria-label="Footer resource navigation">
                {website && (
                  <a
                    href={website.startsWith("http") ? website : `https://${website}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Institution Website
                  </a>
                )}
                <Link to={tenant.getTenantAwarePath("/legal/privacy")}>Privacy Policy</Link>
                <Link to={tenant.getTenantAwarePath("/legal/terms")}>Terms of Service</Link>
              </nav>
            </div>

            {/* Column 4: Stay Connected & Socials */}
            <div className="th-footer-socials-col">
              <h4 className="th-footer-column-title">Stay Connected</h4>
              <div className="th-footer-social-icons">
                {socialLinks.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="th-social-icon-btn"
                  >
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512" height="1.15em" width="1.15em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"></path>
                    </svg>
                  </a>
                )}
                {socialLinks.twitter && (
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                    className="th-social-icon-btn"
                  >
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1.15em" width="1.15em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path>
                    </svg>
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a
                    href={socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="th-social-icon-btn"
                  >
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1.15em" width="1.15em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"></path>
                    </svg>
                  </a>
                )}
                {socialLinks.youtube && (
                  <a
                    href={socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="th-social-icon-btn"
                  >
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1.15em" width="1.15em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.537V175.185l142.739 81.205-142.739 81.23z"></path>
                    </svg>
                  </a>
                )}
                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="th-social-icon-btn"
                  >
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1.15em" width="1.15em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"></path>
                    </svg>
                  </a>
                )}
              </div>
              {primaryContactEmail && (
                <div className="th-footer-contact">
                  <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--th-primary)" }}>mail</span>
                  <a href={`mailto:${primaryContactEmail}`}>{primaryContactEmail}</a>
                </div>
              )}
            </div>
          </div>

          <div className="th-footer-bottom">
            <p className="th-footer-credit">
              Powered by <strong>AlumNet</strong> — the alumni community platform.
            </p>
            <p className="th-footer-copyright">
              &copy; {new Date().getFullYear()} {name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default TenantHomePage;
