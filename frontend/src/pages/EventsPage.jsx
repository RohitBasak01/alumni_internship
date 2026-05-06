import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { cancelEventRegistration, deleteEvent, fetchEvents, registerForEvent, updateEvent } from "../lib/api.js";
import SectionCard from "../components/SectionCard.jsx";
import "../styles/Events.css";

/* ── Helpers ─────────────────────────────────────────────── */
const initialForm = { title: "", description: "", eventDate: "", location: "", registrationCap: "" };
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
  { icon: "groups",         label: "Networking",     sub: "Meet alumni & industry experts", color: "#6366f1" },
  { icon: "mic",            label: "Talks & Panels", sub: "Inspiring sessions and discussions", color: "#10b981" },
  { icon: "celebration",    label: "Entertainment",  sub: "Fun activities, music and more", color: "#f59e0b" },
  { icon: "restaurant",     label: "Food & Drinks",  sub: "Delicious food and refreshments", color: "#0ea5e9" },
];
const EXPECT_LIST = ["Engaging keynotes and panel discussions","Batch reunions and networking sessions","Exciting performances and activities","Memorable moments and photo ops"];

function deriveCategory(item) {
  const t = `${item.title} ${item.description} ${item.eventType}`.toLowerCase();
  if (t.includes("reunion")) return "Reunions";
  if (t.includes("webinar") || t.includes("zoom") || t.includes("virtual")) return "Webinars";
  if (t.includes("hackathon")) return "Hackathons";
  return "Campus Events";
}

function fmtDate(v) {
  if (!v) return "";
  return new Date(v).toLocaleDateString("en-US", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
}
function fmtTime(v) {
  if (!v) return "";
  const d = new Date(v);
  return d.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" });
}
function fmtMonthDay(v) {
  if (!v) return { month:"", day:"", year:"" };
  const d = new Date(v);
  return { month: d.toLocaleString("en-US",{month:"short"}).toUpperCase(), day: d.getDate(), year: d.getFullYear() };
}

/* ── Detail tabs ─────────────────────────────────────────── */
const DETAIL_TABS = ["About","Agenda","Speakers","Attendees","Photos","Discussions"];

/* ── Event detail view ───────────────────────────────────── */
function EventDetail({ event, idx, onBack, isAdmin, canDelete, onEdit, onDelete, onRegister, registrationPending }) {
  const [tab, setTab] = useState("About");
  const img = HERO_IMGS[idx % HERO_IMGS.length];
  const { month, day, year } = fmtMonthDay(event.eventDate);
  const cap = Number(event.registrationCap) || 500;
  const reg = Array.isArray(event.registrations) ? event.registrations.length : 0;
  const pct = Math.min(100, Math.round((reg / cap) * 100));
  const category = deriveCategory(event);

  return (
    <div className="ev-detail-root">
      <button className="ev-back-btn" onClick={onBack}>
        <span className="material-symbols-outlined" style={{fontSize:17}}>arrow_back</span>
        Back to Events
      </button>

      <div className="ev-detail-layout">
        {/* Main column */}
        <div className="ev-detail-main">
          {/* Hero */}
          <div className="ev-hero" style={{backgroundImage:`url(${img})`}}>
            <div className="ev-hero-overlay"/>
            <div className="ev-hero-top">
              <span className="ev-type-badge">IN-PERSON EVENT</span>
              <span className="ev-featured-badge">Featured Event</span>
            </div>
            <div className="ev-hero-body">
              <h1 className="ev-hero-title">{event.title}</h1>
              <p className="ev-hero-desc">{event.description}</p>
              <div className="ev-hero-meta">
                <span><span className="material-symbols-outlined" style={{fontSize:15}}>calendar_today</span>{fmtDate(event.eventDate)}</span>
                <span><span className="material-symbols-outlined" style={{fontSize:15}}>schedule</span>{fmtTime(event.eventDate)} (IST)</span>
                <span><span className="material-symbols-outlined" style={{fontSize:15}}>location_on</span>{event.location||"Campus venue"}</span>
              </div>
              <div className="ev-hero-actions">
                {!isAdmin && !canDelete && (
                  <button className="ev-register-btn" disabled={registrationPending} onClick={onRegister}>
                    {event.isRegistered ? "Cancel RSVP" : "Register Now"}
                  </button>
                )}
                <button className="ev-interested-btn">
                  <span className="material-symbols-outlined" style={{fontSize:15}}>star</span>Interested
                </button>
                <button className="ev-share-btn">
                  <span className="material-symbols-outlined" style={{fontSize:15}}>share</span>Share
                </button>
                {isAdmin && <button className="ev-edit-btn" onClick={onEdit}>Edit</button>}
                {canDelete && <button className="ev-delete-btn" onClick={onDelete}>Delete</button>}
              </div>
              <div className="ev-attendees-row">
                {[0,1,2,3,4].map(i=>(
                  <div key={i} className="ev-attendee-avatar" style={{background:["#6366f1","#10b981","#0ea5e9","#f59e0b","#8b5cf6"][i]}}>{String.fromCharCode(65+i)}</div>
                ))}
                <span className="ev-attendees-text"><strong>{reg}</strong> alumni are attending</span>
              </div>
            </div>
          </div>

          {/* Tab nav */}
          <nav className="ev-tabs">
            {DETAIL_TABS.map(t=>(
              <button key={t} className={`ev-tab ${tab===t?"ev-tab--active":""}`} onClick={()=>setTab(t)}>
                {t}{t==="Attendees"&&<span className="ev-tab-badge">{reg}</span>}
              </button>
            ))}
          </nav>

          {/* Tab: About */}
          {tab==="About"&&(
            <div className="ev-about-section">
              <h2 className="ev-section-title">About This Event</h2>
              <p className="ev-about-desc">{event.description||"Join us for a memorable event with your alumni community."}</p>
              <div className="ev-features-grid">
                {FEATURES.map(f=>(
                  <div key={f.label} className="ev-feature-card">
                    <div className="ev-feature-icon" style={{background:f.color+"18",color:f.color}}>
                      <span className="material-symbols-outlined" style={{fontSize:22}}>{f.icon}</span>
                    </div>
                    <div className="ev-feature-label">{f.label}</div>
                    <div className="ev-feature-sub">{f.sub}</div>
                  </div>
                ))}
              </div>
              <h2 className="ev-section-title" style={{marginTop:"1.5rem"}}>What to Expect</h2>
              <div className="ev-expect-grid">
                <div className="ev-expect-list">
                  {EXPECT_LIST.map(e=>(
                    <div key={e} className="ev-expect-item">
                      <span className="material-symbols-outlined" style={{fontSize:16,color:"#10b981"}}>check_circle</span>
                      {e}
                    </div>
                  ))}
                </div>
                <div className="ev-dresscode-card">
                  <span className="material-symbols-outlined" style={{fontSize:28,color:"#6366f1"}}>checkroom</span>
                  <div className="ev-dresscode-label">Dress Code</div>
                  <div className="ev-dresscode-val">Smart Casual</div>
                  <div className="ev-dresscode-sub">Come comfortable and ready to enjoy!</div>
                </div>
              </div>
            </div>
          )}

          {tab!=="About"&&(
            <div className="ev-coming-soon">
              <span className="material-symbols-outlined" style={{fontSize:44,color:"#c7d2fe"}}>construction</span>
              <h3>{tab}</h3>
              <p>This section is coming soon.</p>
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
                <div className="ev-date-meta"><span className="material-symbols-outlined" style={{fontSize:13}}>schedule</span>{fmtTime(event.eventDate)} – 4:00 PM (IST)</div>
                <div className="ev-date-meta" style={{marginTop:2}}><span className="material-symbols-outlined" style={{fontSize:13}}>location_on</span>{event.location||"SPIT Campus"}</div>
              </div>
            </div>
            <div className="ev-map-placeholder">
              <span className="material-symbols-outlined" style={{fontSize:24,color:"#6366f1"}}>map</span>
            </div>
            <button className="ev-directions-btn">
              <span className="material-symbols-outlined" style={{fontSize:15}}>directions</span>
              Get Directions
            </button>
          </div>

          {/* Registration */}
          <div className="ev-sidebar-card">
            <h3 className="ev-sidebar-heading">Registration</h3>
            <div className="ev-reg-count">
              <span className="material-symbols-outlined" style={{fontSize:16,color:"#6366f1"}}>person</span>
              <span><strong>{reg} / {cap}</strong> Registered</span>
            </div>
            <div className="ev-reg-bar-bg">
              <div className="ev-reg-bar-fill" style={{width:`${pct}%`}}/>
            </div>
            <span className="ev-reg-pct">{pct}%</span>
            {!isAdmin&&!canDelete&&(
              <button className="ev-sidebar-register-btn" disabled={registrationPending} onClick={onRegister}>
                {event.isRegistered?"Cancel RSVP":"Register Now"}
              </button>
            )}
            <div className="ev-reg-note">
              <span className="material-symbols-outlined" style={{fontSize:13,color:"#f59e0b"}}>info</span>
              Registration closes in 18 days
            </div>
          </div>

          {/* Organized By */}
          <div className="ev-sidebar-card">
            <h3 className="ev-sidebar-heading">Organized By</h3>
            <div className="ev-organizer-row">
              <div className="ev-organizer-logo">
                <span className="material-symbols-outlined" style={{fontSize:22,color:"#6366f1"}}>school</span>
              </div>
              <div>
                <div className="ev-organizer-name">SPIT Alumni Association</div>
                <div className="ev-organizer-sub">Building connections since 1962</div>
              </div>
            </div>
            <button className="ev-contact-btn">
              <span className="material-symbols-outlined" style={{fontSize:14}}>mail</span>
              Contact Organizer
            </button>
          </div>

          {/* Highlights */}
          <div className="ev-sidebar-card">
            <h3 className="ev-sidebar-heading">Event Highlights</h3>
            <div className="ev-highlights-grid">
              {HIGHLIGHT_IMGS.slice(0,3).map((src,i)=>(
                <img key={i} src={src} alt="" className="ev-highlight-img" loading="lazy"/>
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
    <article className={`ev-card ${isPast?"ev-card--past":""}`}>
      <div className="ev-card-img-wrap" onClick={onSelect} style={{cursor:"pointer"}}>
        <img src={img} alt={event.title} className="ev-card-img" loading="lazy"/>
        <span className="ev-card-cat-badge">{category}</span>
        {!isPast&&<span className="ev-card-upcoming-badge">Upcoming</span>}
      </div>
      <div className="ev-card-body">
        <div className="ev-card-date-row">
          <div className="ev-card-date-chip">
            <span className="ev-chip-month">{month}</span>
            <span className="ev-chip-day">{day}</span>
          </div>
          <div className="ev-card-date-info">
            <div className="ev-card-date-text">{fmtDate(event.eventDate).split(",").slice(0,2).join(",")}</div>
            <div className="ev-card-time">{fmtTime(event.eventDate)} IST</div>
          </div>
        </div>
        <h3 className="ev-card-title" onClick={onSelect}>{event.title}</h3>
        <p className="ev-card-desc">{event.description}</p>
        <div className="ev-card-loc">
          <span className="material-symbols-outlined" style={{fontSize:14}}>location_on</span>
          {event.location||"Campus venue"}
        </div>
        {reg > 0 && <div className="ev-card-reg">{reg} registered</div>}
        <div className="ev-card-actions">
          <button className="ev-card-view-btn" onClick={onSelect}>View Details</button>
          {!isAdmin&&!canDelete&&!isPast&&(
            <button className={`ev-card-reg-btn ${event.isRegistered?"ev-card-reg-btn--cancel":""}`}
              disabled={registrationPending} onClick={onRegister}>
              {event.isRegistered?"Cancel RSVP":"Register"}
            </button>
          )}
          {isAdmin&&<button className="ev-card-edit-btn" onClick={onEdit}>Edit</button>}
          {canDelete&&<button className="ev-card-del-btn" onClick={onDelete}>Delete</button>}
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
  const [form, setForm]           = useState(initialForm);
  const [filters, setFilters]     = useState(initialFilters);
  const [activeTab, setActiveTab] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedIdx, setSelectedIdx]     = useState(0);

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

  const isAdmin = auth.user?.role === "institute_admin";
  const canCreateEvent = isAdmin || auth.user?.role === "alumni";

  function canDeleteEvent(item) {
    if (isAdmin) return true;
    const cid = typeof item.createdBy === "object" ? item.createdBy?._id || item.createdBy?.id : item.createdBy;
    return String(cid||"") === String(auth.user?.id||"");
  }

  const filteredEvents = useMemo(() => {
    return data.filter(item => {
      const hs = `${item.title} ${item.description} ${item.location} ${item.eventType}`.toLowerCase();
      const q  = deferredQuery ? hs.includes(deferredQuery.toLowerCase()) : true;
      const tp = filters.type ? deriveCategory(item) === filters.type : true;
      const tb = activeTab === "All" ? true : deriveCategory(item) === activeTab;
      return q && tp && tb;
    });
  }, [data, deferredQuery, filters.type, activeTab]);

  const now = new Date();
  const upcomingEvents = filteredEvents.filter(e => new Date(e.eventDate) >= now);
  const pastEvents     = filteredEvents.filter(e => new Date(e.eventDate) < now).sort((a,b)=>new Date(b.eventDate)-new Date(a.eventDate));

  const tabBadges = TAB_ITEMS.reduce((acc,tab)=>{
    acc[tab] = tab==="All" ? data.length : data.filter(i=>deriveCategory(i)===tab).length;
    return acc;
  },{});

  function handleChange(e) { setForm(c=>({...c,[e.target.name]:e.target.value})); }
  function handleFilterChange(e) { setFilters(c=>({...c,[e.target.name]:e.target.value})); }
  function handleSubmit(e) { e.preventDefault(); saveMutation.mutate({ id: editingId, payload: { ...form, registrationCap: form.registrationCap===''?undefined:Number(form.registrationCap) } }); }
  function handleEdit(item) { setEditingId(item._id); setShowComposer(true); setForm({ title:item.title||"", description:item.description||"", eventDate:item.eventDate?new Date(item.eventDate).toISOString().slice(0,16):"", location:item.location||"", registrationCap:Number(item.registrationCap)>0?String(item.registrationCap):"" }); }
  function handleCancel() { setEditingId(null); setForm(initialForm); setShowComposer(false); }

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
        onRegister={() => registrationMutation.mutate({ id: selectedEvent._id, isRegistered: selectedEvent.isRegistered })}
        registrationPending={registrationMutation.isPending}
      />
    );
  }

  /* List view */
  return (
    <div className="ev-root">
      {/* Header */}
      <div className="ev-page-header">
        <div>
          <h1 className="ev-page-title">Events</h1>
          <p className="ev-page-sub">Upcoming and past alumni events &amp; conferences.</p>
        </div>
        {canCreateEvent && (
          <button className="ev-create-btn" onClick={() => navigate("/portal/events/create")}>
            <span className="material-symbols-outlined" style={{fontSize:16}}>add</span>
            Create Event
          </button>
        )}
      </div>

      {/* Admin edit composer */}
      {showComposer && (
        <div className="ev-composer-card">
          <h3 className="ev-composer-title">Edit Event</h3>
          <form onSubmit={handleSubmit} className="ev-composer-form">
            <input className="ev-input" name="title" value={form.title} onChange={handleChange} placeholder="Event title" required/>
            <textarea className="ev-input" name="description" value={form.description} onChange={handleChange} placeholder="Description" rows={3}/>
            <div className="ev-composer-row">
              <input className="ev-input" name="eventDate" type="datetime-local" value={form.eventDate} onChange={handleChange}/>
              <input className="ev-input" name="location" value={form.location} onChange={handleChange} placeholder="Location"/>
              <input className="ev-input" name="registrationCap" type="number" min="0" value={form.registrationCap} onChange={handleChange} placeholder="Capacity"/>
            </div>
            <div className="ev-composer-actions">
              <button className="ev-create-btn" type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending?"Saving...":"Update Event"}</button>
              <button className="ev-cancel-btn" type="button" onClick={handleCancel}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search + filters */}
      <div className="ev-toolbar">
        <div className="ev-search-wrap">
          <span className="material-symbols-outlined ev-search-icon">search</span>
          <input className="ev-search-input" name="query" value={filters.query} onChange={handleFilterChange} placeholder="Search events by title or keyword..."/>
        </div>
        <select className="ev-filter-select" name="type" value={filters.type} onChange={handleFilterChange}>
          <option value="">All Categories</option>
          {TAB_ITEMS.filter(t=>t!=="All").map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <button className="ev-cancel-btn" onClick={()=>setFilters(initialFilters)}>Reset</button>
      </div>

      {/* Category tabs */}
      <div className="ev-tabs-row">
        {TAB_ITEMS.map(tab=>(
          <button key={tab} className={`ev-tab-pill ${activeTab===tab?"ev-tab-pill--active":""}`} onClick={()=>setActiveTab(tab)}>
            {tab}
            <span className="ev-tab-pill-badge">{tabBadges[tab]}</span>
          </button>
        ))}
      </div>

      {isLoading && <p style={{color:"#94a3b8",fontSize:"0.85rem"}}>Loading events...</p>}
      {isError   && <p style={{color:"#ef4444",fontSize:"0.85rem"}}>{error.message}</p>}

      {/* Upcoming */}
      {upcomingEvents.length > 0 && (
        <>
          <div className="ev-section-header">
            <h2 className="ev-section-label">Upcoming Events</h2>
            <span className="ev-section-count">{upcomingEvents.length} events</span>
          </div>
          <div className="ev-cards-grid">
            {upcomingEvents.map((event, idx) => (
              <EventCard
                key={event._id} event={event} idx={idx}
                isAdmin={isAdmin} canDelete={canDeleteEvent(event)}
                onSelect={() => { setSelectedEvent(event); setSelectedIdx(idx); }}
                onEdit={() => handleEdit(event)}
                onDelete={() => deleteMutation.mutate(event._id)}
                onRegister={() => registrationMutation.mutate({ id: event._id, isRegistered: event.isRegistered })}
                registrationPending={registrationMutation.isPending}
              />
            ))}
          </div>
        </>
      )}
      {!isLoading && upcomingEvents.length === 0 && (
        <div className="ev-empty"><span className="material-symbols-outlined" style={{fontSize:44,color:"#c7d2fe"}}>event_busy</span><h3>No Upcoming Events</h3><p>Check back soon or create a new event.</p></div>
      )}

      {/* Past */}
      {pastEvents.length > 0 && (
        <>
          <div className="ev-section-header" style={{marginTop:"1rem"}}>
            <h2 className="ev-section-label" style={{color:"#94a3b8"}}>Past Events</h2>
            <span className="ev-section-count">{pastEvents.length} events</span>
          </div>
          <div className="ev-cards-grid ev-cards-grid--past">
            {pastEvents.map((event,idx)=>(
              <EventCard
                key={event._id} event={event} idx={idx+upcomingEvents.length}
                isAdmin={isAdmin} canDelete={canDeleteEvent(event)}
                onSelect={() => { setSelectedEvent(event); setSelectedIdx(idx+upcomingEvents.length); }}
                onEdit={() => handleEdit(event)}
                onDelete={() => deleteMutation.mutate(event._id)}
                onRegister={() => {}}
                registrationPending={false}
              />
            ))}
          </div>
        </>
      )}

      {deleteMutation.isError      && <p style={{color:"#ef4444",fontSize:"0.8rem",marginTop:"0.5rem"}}>{deleteMutation.error.message}</p>}
      {registrationMutation.isError && <p style={{color:"#ef4444",fontSize:"0.8rem",marginTop:"0.5rem"}}>{registrationMutation.error.message}</p>}
    </div>
  );
}
