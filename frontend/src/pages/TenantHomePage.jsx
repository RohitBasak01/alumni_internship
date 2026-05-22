import { useState, useEffect } from "react";
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
    communityLabels = {}
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
    <div className="th-page">
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

      {/* ── Quick Links ────────────────────────────────────────────────── */}
      {profile.quickLinks && profile.quickLinks.filter(l => l.enabled).length > 0 && (
        <section className="th-section th-section-muted" aria-labelledby="th-quick-links-heading">
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
      <section className="th-section th-news-updates-section" aria-labelledby="th-updates-heading">
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
        <section key={i} className={`th-section ${i % 2 === 0 ? "th-section-muted" : ""}`}>
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
        <section className="th-section" aria-labelledby="th-gallery-heading">
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
        <section className="th-section th-section-muted" aria-labelledby="th-members-heading">
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
