import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { cancelEventRegistration, deleteEvent, fetchEvents, registerForEvent, updateEvent, createEventOrder, verifyEventPayment, fetchMyEventTicket, checkinEventAttendee, fetchEventAttendees } from "../lib/api.js";
import SectionCard from "../components/SectionCard.jsx";
import { QRCodeSVG } from "qrcode.react";
import "../styles/Events.css";
import "../styles/EventTicket.css";
import { useScrollReveal } from "../hooks/useScrollReveal.js";

/* ── Helpers ─────────────────────────────────────────────── */
const initialForm = { title: "", description: "", eventDate: "", location: "", registrationCap: "", isVirtual: false, meetingLink: "", meetingPassword: "", recordingLink: "" };
const initialFilters = { query: "", type: "" };
const TAB_ITEMS = ["All", "Reunions", "Webinars", "Hackathons", "Campus Events"];

const HERO_IMGS = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&q=80",
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&q=80",
  "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=900&q=80",
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=900&q=80",
  "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=900&q=80",
  "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=900&q=80",
];
const HIGHLIGHT_IMGS = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&q=70",
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=200&q=70",
  "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=200&q=70",
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=200&q=70",
];
const FEATURES = [
  { icon: "groups", label: "Networking", sub: "Meet alumni & industry experts", color: "#6366f1" },
  { icon: "mic", label: "Talks & Panels", sub: "Inspiring sessions and discussions", color: "#10b981" },
  { icon: "celebration", label: "Entertainment", sub: "Fun activities, music and more", color: "#f59e0b" },
  { icon: "restaurant", label: "Food & Drinks", sub: "Delicious food and refreshments", color: "#0ea5e9" },
];
const EXPECT_LIST = ["Engaging keynotes and panel discussions", "Batch reunions and networking sessions", "Exciting performances and activities", "Memorable moments and photo ops"];

function deriveCategory(item) {
  const t = `${item.title} ${item.description} ${item.eventType}`.toLowerCase();
  if (t.includes("reunion")) return "Reunions";
  if (t.includes("webinar") || t.includes("zoom") || t.includes("virtual")) return "Webinars";
  if (t.includes("hackathon")) return "Hackathons";
  return "Campus Events";
}

function fmtDate(v) {
  if (!v) return "";
  return new Date(v).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function fmtTime(v) {
  if (!v) return "";
  const d = new Date(v);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtMonthDay(v) {
  if (!v) return { month: "", day: "", year: "" };
  const d = new Date(v);
  return { month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(), day: d.getDate(), year: d.getFullYear() };
}

/* ── Detail tabs ─────────────────────────────────────────── */
const DETAIL_TABS = ["About", "Agenda", "Speakers", "Attendees", "Photos", "Discussions"];

const AVATAR_COLORS = ["#6366f1","#10b981","#0ea5e9","#f59e0b","#8b5cf6","#ec4899","#14b8a6"];
function pickAvatarColor(name = "") { return AVATAR_COLORS[(name.charCodeAt(0) || 65) % AVATAR_COLORS.length]; }
function nameInitials(name = "") { return name.split(" ").map(w => w[0] || "").join("").slice(0,2).toUpperCase() || "?"; }

/* ── Ticket Modal ────────────────────────────────────────── */
function TicketModal({ event, onClose }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyEventTicket(event._id)
      .then(data => { setTicket(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [event._id]);

  return (
    <div className="ticket-modal-backdrop" onClick={onClose}>
      <div className="ticket-modal" onClick={e => e.stopPropagation()}>
        <div className="ticket-modal-header">
          <button className="ticket-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
          <h3 className="ticket-modal-event-name">{event.title}</h3>
          <div className="ticket-modal-event-meta">
            <span><span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>{fmtDate(event.eventDate)}</span>
            <span><span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>{event.location || "TBA"}</span>
          </div>
        </div>

        {loading && <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading ticket...</div>}
        {error && <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>{error}</div>}

        {ticket && (
          <>
            <div className="ticket-qr-section">
              <span className="ticket-qr-label">Scan for check-in</span>
              <div className="ticket-qr-wrapper">
                <QRCodeSVG value={ticket.ticketCode} size={180} level="H" />
              </div>
              <div className="ticket-code-display">{ticket.ticketCode.slice(0, 8).toUpperCase()}</div>
            </div>
            <div className="ticket-info-section">
              <div className="ticket-info-grid">
                <div className="ticket-info-item">
                  <span className="ticket-info-label">Attendee</span>
                  <span className="ticket-info-value">{ticket.attendee?.name}</span>
                </div>
                <div className="ticket-info-item">
                  <span className="ticket-info-label">Ticket Type</span>
                  <span className="ticket-info-value" style={{ textTransform: "capitalize" }}>{ticket.ticketType}</span>
                </div>
                <div className="ticket-info-item">
                  <span className="ticket-info-label">Status</span>
                  {ticket.checkedInAt ? (
                    <span className="ticket-status-badge ticket-status-badge--checkedin">
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>Checked In
                    </span>
                  ) : (
                    <span className="ticket-status-badge ticket-status-badge--confirmed">
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>confirmation_number</span>Confirmed
                    </span>
                  )}
                </div>
                <div className="ticket-info-item">
                  <span className="ticket-info-label">Registered</span>
                  <span className="ticket-info-value">{new Date(ticket.registeredAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Admin Attendees Panel ───────────────────────────────── */
function AttendeePanel({ eventId }) {
  const [attendeesData, setAttendeesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkinCode, setCheckinCode] = useState("");
  const [checkinResult, setCheckinResult] = useState(null);
  const [checkinError, setCheckinError] = useState(null);
  const [checkinPending, setCheckinPending] = useState(false);

  const loadAttendees = () => {
    setLoading(true);
    fetchEventAttendees(eventId)
      .then(data => { setAttendeesData(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadAttendees(); }, [eventId]);

  const handleCheckin = async () => {
    if (!checkinCode.trim()) return;
    setCheckinPending(true);
    setCheckinResult(null);
    setCheckinError(null);
    try {
      const result = await checkinEventAttendee(eventId, checkinCode.trim());
      setCheckinResult(result);
      setCheckinCode("");
      loadAttendees();
    } catch (err) {
      setCheckinError(err.message);
    } finally {
      setCheckinPending(false);
    }
  };

  if (loading) return <div style={{ padding: 20, color: "#94a3b8" }}>Loading attendees...</div>;
  if (!attendeesData) return <div style={{ padding: 20, color: "#94a3b8" }}>Unable to load attendees.</div>;

  return (
    <div className="checkin-panel">
      <div className="checkin-stats">
        <div className="checkin-stat">
          <span className="checkin-stat-value">{attendeesData.total}</span>
          <span className="checkin-stat-label">Registered</span>
        </div>
        <div className="checkin-stat">
          <span className="checkin-stat-value">{attendeesData.checkedIn}</span>
          <span className="checkin-stat-label">Checked In</span>
        </div>
        <div className="checkin-stat">
          <span className="checkin-stat-value">{attendeesData.waitlistCount}</span>
          <span className="checkin-stat-label">Waitlisted</span>
        </div>
      </div>

      <h4 style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", margin: "20px 0 10px" }}>Manual Check-in</h4>
      <div className="checkin-input-row">
        <input
          className="checkin-input"
          placeholder="Enter or paste ticket code..."
          value={checkinCode}
          onChange={e => setCheckinCode(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCheckin()}
        />
        <button className="checkin-submit-btn" onClick={handleCheckin} disabled={checkinPending || !checkinCode.trim()}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>qr_code_scanner</span>
          {checkinPending ? "Checking..." : "Check In"}
        </button>
      </div>

      {checkinResult && (
        <div className="checkin-success">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
          <span><strong>{checkinResult.attendee?.name}</strong> checked in successfully</span>
        </div>
      )}
      {checkinError && (
        <div className="checkin-error">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
          {checkinError}
        </div>
      )}

      <h4 style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", margin: "16px 0 8px" }}>Attendees</h4>
      <div className="attendee-list">
        {attendeesData.attendees.map((a, i) => (
          <div key={a.userId || i} className="attendee-row">
            <div className="attendee-avatar" style={{ background: pickAvatarColor(a.name) }}>{nameInitials(a.name)}</div>
            <div className="attendee-info">
              <div className="attendee-name">{a.name}</div>
              <div className="attendee-email">{a.email}</div>
            </div>
            {a.checkedInAt ? (
              <span className="attendee-checkin-badge attendee-checkin-badge--in">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check</span>Checked In
              </span>
            ) : (
              <span className="attendee-checkin-badge attendee-checkin-badge--pending">Pending</span>
            )}
          </div>
        ))}
      </div>

      {attendeesData.waitlist.length > 0 && (
        <>
          <div className="waitlist-section-title">
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>hourglass_top</span>
            Waitlist ({attendeesData.waitlist.length})
          </div>
          <div className="attendee-list">
            {attendeesData.waitlist.map((w, i) => (
              <div key={w.userId || i} className="attendee-row">
                <div className="attendee-avatar" style={{ background: "#f59e0b" }}>{nameInitials(w.name)}</div>
                <div className="attendee-info">
                  <div className="attendee-name">{w.name}</div>
                  <div className="attendee-email">{w.email}</div>
                </div>
                <span className="ev-waitlist-badge">Waitlisted</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Event detail view ───────────────────────────────────── */
function EventDetail({ event, idx, onBack, isAdmin, canDelete, onEdit, onDelete, onRegister, registrationPending, onViewTicket }) {
  const [tab, setTab] = useState("About");
  const img = HERO_IMGS[idx % HERO_IMGS.length];
  const { month, day, year } = fmtMonthDay(event.eventDate);
  const cap = Number(event.registrationCap) || 500;
  const reg = event.attendeeCount || 0;
  const pct = Math.min(100, Math.round((reg / cap) * 100));
  const capFillClass = pct >= 100 ? "ev-capacity-fill--full" : pct >= 80 ? "ev-capacity-fill--warning" : "";
  const category = deriveCategory(event);

  return (
    <div className="ev-detail-root">
      <button className="ev-back-btn" onClick={onBack}>
        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>arrow_back</span>
        Back to Events
      </button>

      <div className="ev-detail-layout">
        {/* Main column */}
        <div className="ev-detail-main">
          {/* Hero */}
          <div className="ev-hero" style={{ backgroundImage: `url(${img})` }}>
            <div className="ev-hero-overlay" />
            <div className="ev-hero-top">
              <span className="ev-type-badge">{event.isVirtual ? "VIRTUAL EVENT" : "IN-PERSON EVENT"}</span>
              <span className="ev-featured-badge">Featured Event</span>
            </div>
            <div className="ev-hero-body">
              <h1 className="ev-hero-title">{event.title}</h1>
              <p className="ev-hero-desc">{event.description}</p>
              <div className="ev-hero-meta">
                <span><span className="material-symbols-outlined" style={{ fontSize: 15 }}>calendar_today</span>{fmtDate(event.eventDate)}</span>
                <span><span className="material-symbols-outlined" style={{ fontSize: 15 }}>schedule</span>{fmtTime(event.eventDate)} (IST)</span>
                <span><span className="material-symbols-outlined" style={{ fontSize: 15 }}>{event.isVirtual ? "videocam" : "location_on"}</span>{event.isVirtual ? "Virtual Event" : event.location || "Campus venue"}</span>
              </div>
              <div className="ev-hero-actions">
                {!isAdmin && !canDelete && !event.isWaitlisted && (
                  <button className="ev-register-btn" disabled={registrationPending} onClick={onRegister}>
                    {event.isRegistered ? "Cancel RSVP" : pct >= 100 ? "Join Waitlist" : "Register Now"}
                  </button>
                )}
                {!isAdmin && event.isRegistered && event.ticketCode && !event.isVirtual && (
                  <button className="ev-ticket-btn" onClick={onViewTicket}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>confirmation_number</span>View Ticket
                  </button>
                )}
                {event.isRegistered && event.isVirtual && event.meetingLink && (
                  <a href={event.meetingLink} target="_blank" rel="noreferrer" className="ev-ticket-btn" style={{ background: "#2563eb", color: "#fff", border: "none", textDecoration: "none" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#fff" }}>video_camera_front</span>Join Meeting
                  </a>
                )}
                {event.isRegistered && event.isVirtual && event.recordingLink && (
                  <a href={event.recordingLink} target="_blank" rel="noreferrer" className="ev-interested-btn" style={{ textDecoration: "none" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>play_circle</span>View Recording
                  </a>
                )}
                <button className="ev-interested-btn">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>star</span>Interested
                </button>
                <button className="ev-share-btn">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>share</span>Share
                </button>
                {isAdmin && <button className="ev-edit-btn" onClick={onEdit}>Edit</button>}
                {canDelete && <button className="ev-delete-btn" onClick={onDelete}>Delete</button>}
              </div>
              {event.isWaitlisted && (
                <div className="ev-waitlisted-note">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>hourglass_top</span>
                  You're on the waitlist. We'll notify you if a spot opens up.
                </div>
              )}
              <div className="ev-attendees-row">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="ev-attendee-avatar" style={{ background: ["#6366f1", "#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6"][i] }}>{String.fromCharCode(65 + i)}</div>
                ))}
                <span className="ev-attendees-text"><strong>{reg}</strong> alumni are attending{event.waitlistCount > 0 && <> · <strong>{event.waitlistCount}</strong> waitlisted</>}</span>
              </div>
            </div>
          </div>

          {/* Tab nav */}
          <nav className="ev-tabs">
            {DETAIL_TABS.map(t => (
              <button key={t} className={`ev-tab ${tab === t ? "ev-tab--active" : ""}`} onClick={() => setTab(t)}>
                {t}{t === "Attendees" && <span className="ev-tab-badge">{reg}</span>}
              </button>
            ))}
          </nav>

          {/* Tab: About */}
          {tab === "About" && (
            <div className="ev-about-section">
              <h2 className="ev-section-title">About This Event</h2>
              <p className="ev-about-desc">{event.description || "Join us for a memorable event with your alumni community."}</p>
              <div className="ev-features-grid">
                {FEATURES.map(f => (
                  <div key={f.label} className="ev-feature-card">
                    <div className="ev-feature-icon" style={{ background: f.color + "18", color: f.color }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{f.icon}</span>
                    </div>
                    <div className="ev-feature-label">{f.label}</div>
                    <div className="ev-feature-sub">{f.sub}</div>
                  </div>
                ))}
              </div>
              <h2 className="ev-section-title" style={{ marginTop: "1.5rem" }}>What to Expect</h2>
              <div className="ev-expect-grid">
                <div className="ev-expect-list">
                  {EXPECT_LIST.map(e => (
                    <div key={e} className="ev-expect-item">
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#10b981" }}>check_circle</span>
                      {e}
                    </div>
                  ))}
                </div>
                <div className="ev-dresscode-card">
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#6366f1" }}>checkroom</span>
                  <div className="ev-dresscode-label">Dress Code</div>
                  <div className="ev-dresscode-val">Smart Casual</div>
                  <div className="ev-dresscode-sub">Come comfortable and ready to enjoy!</div>
                </div>
              </div>
            </div>
          )}

          {tab === "Attendees" && isAdmin && (
            <AttendeePanel eventId={event._id} />
          )}

          {tab !== "About" && tab !== "Attendees" && (
            <div className="ev-coming-soon">
              <span className="material-symbols-outlined" style={{ fontSize: 44, color: "#c7d2fe" }}>construction</span>
              <h3>{tab}</h3>
              <p>This section is coming soon.</p>
            </div>
          )}

          {tab === "Attendees" && !isAdmin && (
            <div className="ev-coming-soon">
              <span className="material-symbols-outlined" style={{ fontSize: 44, color: "#c7d2fe" }}>groups</span>
              <h3>Attendees</h3>
              <p>{reg} alumni have registered for this event.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="ev-detail-sidebar">
          {/* Event Details */}
          <div className="ev-sidebar-card">
            <h3 className="ev-sidebar-heading">Event Details</h3>
            <div className="ev-date-block">
              <div className="ev-date-cal">
                <div className="ev-cal-month">{month}</div>
                <div className="ev-cal-day">{day}</div>
                <div className="ev-cal-year">{year}</div>
              </div>
              <div className="ev-date-info">
                <div className="ev-date-weekday">{fmtDate(event.eventDate).split(",")[0]}</div>
                <div className="ev-date-full">{month} {day}, {year}</div>
                <div className="ev-date-meta"><span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>{fmtTime(event.eventDate)} – 4:00 PM (IST)</div>
                <div className="ev-date-meta" style={{ marginTop: 2 }}><span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>{event.location || "SPIT Campus"}</div>
              </div>
            </div>
            <div className="ev-map-placeholder">
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#6366f1" }}>map</span>
            </div>
            <button className="ev-directions-btn">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>directions</span>
              Get Directions
            </button>
          </div>

          {/* Registration */}
          <div className="ev-sidebar-card">
            <h3 className="ev-sidebar-heading">Registration</h3>
            <div className="ev-capacity-section">
              <div className="ev-capacity-header">
                <span><strong>{reg}</strong> / {cap} registered</span>
                <span>{pct}%</span>
              </div>
              <div className="ev-capacity-bar">
                <div className={`ev-capacity-fill ${capFillClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              {event.waitlistCount > 0 && (
                <span className="ev-waitlist-badge">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>hourglass_top</span>
                  {event.waitlistCount} on waitlist
                </span>
              )}
            </div>
            {!isAdmin && !canDelete && !event.isWaitlisted && (
              <button className="ev-sidebar-register-btn" disabled={registrationPending} onClick={onRegister}>
                {event.isRegistered ? "Cancel RSVP" : pct >= 100 ? "Join Waitlist" : "Register Now"}
              </button>
            )}
            {!isAdmin && event.isRegistered && event.ticketCode && (
              <button className="ev-ticket-btn" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={onViewTicket}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>confirmation_number</span>View My Ticket
              </button>
            )}
            <div className="ev-reg-note">
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#f59e0b" }}>info</span>
              {pct >= 100 ? "Event is at full capacity" : "Registration is open"}
            </div>
          </div>

          {/* Organized By */}
          <div className="ev-sidebar-card">
            <h3 className="ev-sidebar-heading">Organized By</h3>
            <div className="ev-organizer-row">
              <div className="ev-organizer-logo">
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#6366f1" }}>school</span>
              </div>
              <div>
                <div className="ev-organizer-name">SPIT Alumni Association</div>
                <div className="ev-organizer-sub">Building connections since 1962</div>
              </div>
            </div>
            <button className="ev-contact-btn">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>mail</span>
              Contact Organizer
            </button>
          </div>

          {/* Highlights */}
          <div className="ev-sidebar-card">
            <h3 className="ev-sidebar-heading">Event Highlights</h3>
            <div className="ev-highlights-grid">
              {HIGHLIGHT_IMGS.slice(0, 3).map((src, i) => (
                <img key={i} src={src} alt="" className="ev-highlight-img" loading="lazy" />
              ))}
              <div className="ev-highlight-more">+15</div>
            </div>
            <button className="ev-view-photos-btn">View All Photos →</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── Event list card ─────────────────────────────────────── */
function EventCard({ event, idx, isAdmin, canDelete, onSelect, onEdit, onDelete, onRegister, registrationPending }) {
  const { month, day, year } = fmtMonthDay(event.eventDate);
  const img = HERO_IMGS[idx % HERO_IMGS.length];
  const category = deriveCategory(event);
  const isPast = new Date(event.eventDate) < new Date();
  const reg = Array.isArray(event.registrations) ? event.registrations.length : 0;

  return (
    <article className={`ev-card ${isPast ? "ev-card--past" : ""}`}>
      <div className="ev-card-img-wrap" onClick={onSelect} style={{ cursor: "pointer" }}>
        <img src={img} alt={event.title} className="ev-card-img" loading="lazy" />
        <span className="ev-card-cat-badge">{category}</span>
        {!isPast && <span className="ev-card-upcoming-badge">Upcoming</span>}
      </div>
      <div className="ev-card-body">
        <div className="ev-card-date-row">
          <div className="ev-card-date-chip">
            <span className="ev-chip-month">{month}</span>
            <span className="ev-chip-day">{day}</span>
          </div>
          <div className="ev-card-date-info">
            <div className="ev-card-date-text">{fmtDate(event.eventDate).split(",").slice(0, 2).join(",")}</div>
            <div className="ev-card-time">{fmtTime(event.eventDate)} IST</div>
          </div>
        </div>
        <h3 className="ev-card-title" onClick={onSelect}>{event.title}</h3>
        <p className="ev-card-desc">{event.description}</p>
        <div className="ev-card-loc">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
          {event.location || "Campus venue"}
        </div>
        {reg > 0 && <div className="ev-card-reg">{reg} registered</div>}
        <div className="ev-card-actions">
          <button className="ev-card-view-btn" onClick={onSelect}>View Details</button>
          {!isAdmin && !canDelete && !isPast && (
            <button className={`ev-card-reg-btn ${event.isRegistered ? "ev-card-reg-btn--cancel" : ""}`}
              disabled={registrationPending} onClick={onRegister}>
              {event.isRegistered ? "Cancel RSVP" : "Register"}
            </button>
          )}
          {isAdmin && <button className="ev-card-edit-btn" onClick={onEdit}>Edit</button>}
          {canDelete && <button className="ev-card-del-btn" onClick={onDelete}>Delete</button>}
        </div>
      </div>
    </article>
  );
}

/* ── Event list item (List View) ────────────────────────── */
function EventListItem({ event, idx, isAdmin, canDelete, onSelect, onEdit, onDelete, onRegister, registrationPending }) {
  const { month, day, year } = fmtMonthDay(event.eventDate);
  const img = HERO_IMGS[idx % HERO_IMGS.length];
  const category = deriveCategory(event);
  const isPast = new Date(event.eventDate) < new Date();
  const reg = Array.isArray(event.registrations) ? event.registrations.length : 0;

  return (
    <article className={`ev-list-item ${isPast ? "ev-list-item--past" : ""}`} onClick={onSelect} style={{ cursor: "pointer" }}>
      <div className="ev-list-img-wrap">
        <img src={img} alt={event.title} className="ev-list-img" loading="lazy" />
        <span className="ev-list-cat-badge">{category}</span>
      </div>
      <div className="ev-list-content">
        <div className="ev-list-main">
          <div className="ev-list-date-chip">
            <span className="ev-chip-month">{month}</span>
            <span className="ev-chip-day">{day}</span>
          </div>
          <div className="ev-list-info">
            <h3 className="ev-list-title" onClick={onSelect}>{event.title}</h3>
            <div className="ev-list-meta">
              <span><span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>{fmtDate(event.eventDate).split(",").slice(0, 2).join(",")}</span>
              <span><span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>{fmtTime(event.eventDate)} IST</span>
              <span><span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>{event.location || "Campus venue"}</span>
            </div>
            <p className="ev-list-desc">{event.description}</p>
          </div>
        </div>
        <div className="ev-list-side">
          {reg > 0 && <div className="ev-list-reg"><strong>{reg}</strong> registered</div>}
          <div className="ev-list-actions">
            {!isAdmin && !canDelete && !isPast && (
              <button className={`ev-list-reg-btn ${event.isRegistered ? "ev-list-reg-btn--cancel" : ""}`}
                disabled={registrationPending} onClick={(e) => { e.stopPropagation(); onRegister(); }}>
                {event.isRegistered ? "Cancel RSVP" : "Register"}
              </button>
            )}
            <button className="ev-list-view-btn" onClick={(e) => { e.stopPropagation(); onSelect(); }}>View Details</button>
            <div className="ev-list-admin-btns">
              {isAdmin && <button className="ev-list-edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span></button>}
              {canDelete && <button className="ev-list-del-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span></button>}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════════════════════
   Main EventsPage
   ══════════════════════════════════════════════════════════ */
export default function EventsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [activeTab, setActiveTab] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [viewMode, setViewMode] = useState("grid");
  const [pendingPaymentEvent, setPendingPaymentEvent] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [ticketEvent, setTicketEvent] = useState(null);

  const { data = [], isLoading, isError, error } = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const deferredQuery = useDeferredValue(filters.query);

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => updateEvent(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); setForm(initialForm); setEditingId(null); setShowComposer(false); }
  });
  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); queryClient.invalidateQueries({ queryKey: ["feed"] }); setSelectedEvent(null); }
  });
  const registrationMutation = useMutation({
    mutationFn: ({ id, isRegistered }) => isRegistered ? cancelEventRegistration(id) : registerForEvent(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); queryClient.invalidateQueries({ queryKey: ["feed"] }); }
  });

  const isAdmin = auth.hasPermission("manage_events");
  const canCreateEvent = isAdmin || auth.user?.role === "alumni";

  function canDeleteEvent(item) {
    if (isAdmin) return true;
    const cid = typeof item.createdBy === "object" ? item.createdBy?._id || item.createdBy?.id : item.createdBy;
    return String(cid || "") === String(auth.user?.id || "");
  }

  const filteredEvents = useMemo(() => {
    return data.filter(item => {
      const hs = `${item.title} ${item.description} ${item.location} ${item.eventType}`.toLowerCase();
      const q = deferredQuery ? hs.includes(deferredQuery.toLowerCase()) : true;
      const tp = filters.type ? deriveCategory(item) === filters.type : true;
      const tb = activeTab === "All" ? true : deriveCategory(item) === activeTab;
      return q && tp && tb;
    });
  }, [data, deferredQuery, filters.type, activeTab]);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcomingEvents = filteredEvents.filter(e => new Date(e.eventDate) >= startOfToday);
  const pastEvents = filteredEvents.filter(e => new Date(e.eventDate) < startOfToday).sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

  const tabBadges = TAB_ITEMS.reduce((acc, tab) => {
    acc[tab] = tab === "All" ? data.length : data.filter(i => deriveCategory(i) === tab).length;
    return acc;
  }, {});

  function handleChange(e) { setForm(c => ({ ...c, [e.target.name]: e.target.value })); }
  function handleFilterChange(e) { setFilters(c => ({ ...c, [e.target.name]: e.target.value })); }
  function handleSubmit(e) { e.preventDefault(); saveMutation.mutate({ id: editingId, payload: { ...form, registrationCap: form.registrationCap === '' ? undefined : Number(form.registrationCap) } }); }
  function handleEdit(item) { setEditingId(item._id); setShowComposer(true); setForm({ title: item.title || "", description: item.description || "", eventDate: item.eventDate ? new Date(item.eventDate).toISOString().slice(0, 16) : "", location: item.location || "", registrationCap: Number(item.registrationCap) > 0 ? String(item.registrationCap) : "", isVirtual: Boolean(item.isVirtual), meetingLink: item.meetingLink || "", meetingPassword: item.meetingPassword || "", recordingLink: item.recordingLink || "" }); }
  function handleCancel() { setEditingId(null); setForm(initialForm); setShowComposer(false); }

  function handleRegisterClick(event) {
    if (event.isRegistered) {
      registrationMutation.mutate({ id: event._id, isRegistered: true });
    } else {
      if (event.fees && event.fees.length > 0) {
        setPendingPaymentEvent(event);
      } else {
        registrationMutation.mutate({ id: event._id, isRegistered: false });
      }
    }
  }

  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handlePayNow() {
    if (!pendingPaymentEvent) return;

    setIsProcessingPayment(true);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        alert("Razorpay SDK failed to load. Are you online?");
        setIsProcessingPayment(false);
        return;
      }

      // 1. Create order on backend
      const order = await createEventOrder(pendingPaymentEvent._id);

      // 2. Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_dummy_key",
        amount: order.amount,
        currency: order.currency,
        name: auth.user?.institute?.name || "Alumni Portal",
        description: `Registration for ${pendingPaymentEvent.title}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            // 3. Verify payment on backend
            await verifyEventPayment(pendingPaymentEvent._id, response);

            // 4. Invalidate queries to update UI
            queryClient.invalidateQueries({ queryKey: ["events"] });
            queryClient.invalidateQueries({ queryKey: ["feed"] });
            setPendingPaymentEvent(null);
          } catch (err) {
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: auth.user?.name || "",
          email: auth.user?.email || "",
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert(response.error.description);
      });
      rzp.open();
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.message || error.message || "Unknown error";
      const stack = error.response?.data?.stack ? ("\n\nStack: " + error.response.data.stack.split("\n").slice(0, 3).join("\n")) : "";
      alert("Failed to initiate payment. " + errMsg + stack);
      setIsProcessingPayment(false);
    }
  }

  /* Show detail view */
  if (selectedEvent) {
    const idx = selectedIdx;
    return (
      <EventDetail
        event={selectedEvent}
        idx={idx}
        onBack={() => setSelectedEvent(null)}
        isAdmin={isAdmin}
        canDelete={canDeleteEvent(selectedEvent)}
        onEdit={() => { handleEdit(selectedEvent); setSelectedEvent(null); }}
        onDelete={() => deleteMutation.mutate(selectedEvent._id)}
        onRegister={() => handleRegisterClick(selectedEvent)}
        registrationPending={registrationMutation.isPending}
        onViewTicket={() => setTicketEvent(selectedEvent)}
      />
    );
  }

  const evPageRef = useRef(null);
  useScrollReveal(evPageRef);

  /* List view */
  return (
    <div className="ev-root module-events" ref={evPageRef}>
      {/* Header */}
      <div className="ev-page-header">
        <div>
          <p className="ev-page-kicker">Calendar hub</p>
          <h1 className="ev-page-title">Events</h1>
          <p className="ev-page-sub">Upcoming and past alumni events &amp; conferences.</p>
        </div>
        <div className="ev-header-stats" aria-label="Events summary">
          <span><strong>{upcomingEvents.length}</strong> upcoming</span>
          <span><strong>{pastEvents.length}</strong> past</span>
        </div>
        <div className="ev-header-actions">
          <div className="ev-view-toggle">
            <button type="button" className={`ev-toggle-btn ${viewMode === "grid" ? "ev-toggle-btn--active" : ""}`} onClick={() => setViewMode("grid")} title="Grid View">
              <span className="material-symbols-outlined" style={{ pointerEvents: "none" }}>grid_view</span>
            </button>
            <button type="button" className={`ev-toggle-btn ${viewMode === "list" ? "ev-toggle-btn--active" : ""}`} onClick={() => setViewMode("list")} title="List View">
              <span className="material-symbols-outlined" style={{ pointerEvents: "none" }}>view_list</span>
            </button>
          </div>
          {canCreateEvent && (
            <button className="ev-create-btn" onClick={() => navigate("/portal/events/create")}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Create Event
            </button>
          )}
        </div>
      </div>

      {/* Admin edit composer */}
      {showComposer && (
        <div className="ev-composer-card">
          <h3 className="ev-composer-title">Edit Event</h3>
          <form onSubmit={handleSubmit} className="ev-composer-form">
            <input className="ev-input" name="title" value={form.title} onChange={handleChange} placeholder="Event title" required />
            <textarea className="ev-input" name="description" value={form.description} onChange={handleChange} placeholder="Description" rows={3} />
            <div className="ev-composer-row">
              <input className="ev-input" name="eventDate" type="datetime-local" value={form.eventDate} onChange={handleChange} />
              <input className="ev-input" name="location" value={form.location} onChange={handleChange} placeholder="Location" />
              <input className="ev-input" name="registrationCap" type="number" min="0" value={form.registrationCap} onChange={handleChange} placeholder="Capacity" />
            </div>
            <div className="ev-composer-row" style={{ alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" id="isVirtual" name="isVirtual" checked={form.isVirtual} onChange={e => setForm(c => ({...c, isVirtual: e.target.checked}))} />
              <label htmlFor="isVirtual" style={{ fontSize: "0.85rem", color: "#374151", fontWeight: 600 }}>This is a Virtual Event / Webinar</label>
            </div>
            {form.isVirtual && (
              <div className="ev-composer-row">
                <input className="ev-input" name="meetingLink" value={form.meetingLink} onChange={handleChange} placeholder="Meeting Link (Zoom, Meet, etc.)" />
                <input className="ev-input" name="meetingPassword" value={form.meetingPassword} onChange={handleChange} placeholder="Meeting Password (optional)" />
                <input className="ev-input" name="recordingLink" value={form.recordingLink} onChange={handleChange} placeholder="Recording Link (added later)" />
              </div>
            )}
            <div className="ev-composer-actions">
              <button className="ev-create-btn" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Update Event"}</button>
              <button className="ev-cancel-btn" type="button" onClick={handleCancel}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search + filters */}
      <div className="ev-toolbar reveal">
        <div className="ev-search-wrap">
          <span className="material-symbols-outlined ev-search-icon">search</span>
          <input className="ev-search-input" name="query" value={filters.query} onChange={handleFilterChange} placeholder="Search events by title or keyword..." />
        </div>
        <select className="ev-filter-select" name="type" value={filters.type} onChange={handleFilterChange}>
          <option value="">All Categories</option>
          {TAB_ITEMS.filter(t => t !== "All").map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="ev-cancel-btn" onClick={() => setFilters(initialFilters)}>Reset</button>
      </div>

      {/* Category tabs */}
      <div className="ev-tabs-row">
        {TAB_ITEMS.map(tab => (
          <button key={tab} className={`ev-tab-pill ${activeTab === tab ? "ev-tab-pill--active" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab}
            <span className="ev-tab-pill-badge">{tabBadges[tab]}</span>
          </button>
        ))}
      </div>

      {isLoading && <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Loading events...</p>}
      {isError && <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>{error.message}</p>}

      {/* Upcoming */}
      {upcomingEvents.length > 0 && (
        <>
          <div className="ev-section-header reveal">
            <h2 className="ev-section-label">Upcoming Events</h2>
            <span className="ev-section-count">{upcomingEvents.length} events</span>
          </div>
          <div className={viewMode === "grid" ? "ev-cards-grid" : "ev-list-container"}>
            {upcomingEvents.map((event, idx) => (
              viewMode === "grid" ? (
                <EventCard
                  key={event._id} event={event} idx={idx}
                  isAdmin={isAdmin} canDelete={canDeleteEvent(event)}
                  onSelect={() => { setSelectedEvent(event); setSelectedIdx(idx); }}
                  onEdit={() => handleEdit(event)}
                  onDelete={() => {
                    if (window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
                      deleteMutation.mutate(event._id);
                    }
                  }}
                  onRegister={() => handleRegisterClick(event)}
                  registrationPending={registrationMutation.isPending}
                />
              ) : (
                <EventListItem
                  key={event._id} event={event} idx={idx}
                  isAdmin={isAdmin} canDelete={canDeleteEvent(event)}
                  onSelect={() => { setSelectedEvent(event); setSelectedIdx(idx); }}
                  onEdit={() => handleEdit(event)}
                  onDelete={() => {
                    if (window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
                      deleteMutation.mutate(event._id);
                    }
                  }}
                  onRegister={() => handleRegisterClick(event)}
                  registrationPending={registrationMutation.isPending}
                />
              )
            ))}
          </div>
        </>
      )}
      {!isLoading && upcomingEvents.length === 0 && (
        <div className="ev-empty"><span className="material-symbols-outlined" style={{ fontSize: 44, color: "#c7d2fe" }}>event_busy</span><h3>No Upcoming Events</h3><p>Check back soon or create a new event.</p></div>
      )}

      {/* Past */}
      {pastEvents.length > 0 && (
        <>
          <div className="ev-section-header" style={{ marginTop: "1rem" }}>
            <h2 className="ev-section-label" style={{ color: "#94a3b8" }}>Past Events</h2>
            <span className="ev-section-count">{pastEvents.length} events</span>
          </div>
          <div className={viewMode === "grid" ? "ev-cards-grid ev-cards-grid--past" : "ev-list-container ev-list-container--past"}>
            {pastEvents.map((event, idx) => (
              viewMode === "grid" ? (
                <EventCard
                  key={event._id} event={event} idx={idx + upcomingEvents.length}
                  isAdmin={isAdmin} canDelete={canDeleteEvent(event)}
                  onSelect={() => { setSelectedEvent(event); setSelectedIdx(idx + upcomingEvents.length); }}
                  onEdit={() => handleEdit(event)}
                  onDelete={() => {
                    if (window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
                      deleteMutation.mutate(event._id);
                    }
                  }}
                  onRegister={() => { }}
                  registrationPending={false}
                />
              ) : (
                <EventListItem
                  key={event._id} event={event} idx={idx + upcomingEvents.length}
                  isAdmin={isAdmin} canDelete={canDeleteEvent(event)}
                  onSelect={() => { setSelectedEvent(event); setSelectedIdx(idx + upcomingEvents.length); }}
                  onEdit={() => handleEdit(event)}
                  onDelete={() => {
                    if (window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
                      deleteMutation.mutate(event._id);
                    }
                  }}
                  onRegister={() => { }}
                  registrationPending={false}
                />
              )
            ))}
          </div>
        </>
      )}

      {deleteMutation.isError && <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem" }}>{deleteMutation.error.message}</p>}
      {registrationMutation.isError && <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem" }}>{registrationMutation.error.message}</p>}

      {/* Payment Modal */}
      {pendingPaymentEvent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400, padding: "2rem", borderRadius: "12px", background: "var(--surface-color)", boxShadow: "var(--shadow-xl)" }}>
            <h2 style={{ marginTop: 0, marginBottom: "1rem", color: "var(--text-color)" }}>Complete Registration</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              <strong>{pendingPaymentEvent.title}</strong> is a paid event. Please complete your payment to reserve your spot.
            </p>
            <div style={{ background: "var(--background-color)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
              {pendingPaymentEvent.fees.map((f, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: i === pendingPaymentEvent.fees.length - 1 ? 0 : "0.5rem" }}>
                  <span>{f.name}</span>
                  <strong>INR {f.amount}</strong>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button className="button secondary" onClick={() => setPendingPaymentEvent(null)}>Cancel</button>
              <button className="button primary" onClick={handlePayNow} disabled={isProcessingPayment}>
                {isProcessingPayment ? "Processing..." : "Pay Now & Register"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {ticketEvent && (
        <TicketModal event={ticketEvent} onClose={() => setTicketEvent(null)} />
      )}
    </div>
  );
}
