import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchReunions, createReunion, updateReunion, deleteReunion, rsvpReunion } from "../lib/api.js";
import "../styles/Reunion.css";

/* ── Helpers ──────────────────────────────────────────── */
const COVER_IMGS = [
  "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800&q=70",
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=70",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=70",
  "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=70",
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=70",
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=70",
];

function getCover(reunion, idx) {
  return reunion.coverImage || COVER_IMGS[idx % COVER_IMGS.length];
}

function fmtDate(v) {
  if (!v) return "";
  return new Date(v).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(v) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getCountdown(eventDate) {
  const now = new Date();
  const d = new Date(eventDate);
  const diff = d - now;
  if (diff <= 0) return "Completed";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)} months away`;
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""} away`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours} hour${hours !== 1 ? "s" : ""} away`;
}

const initialForm = {
  title: "", batch: "", department: "", description: "",
  eventDate: "", location: "", isVirtual: false, virtualLink: ""
};

const currentYear = new Date().getFullYear();
const batchOptions = Array.from({ length: 40 }, (_, i) => currentYear - i);

/* ── Create / Edit Modal ─────────────────────────────── */
function ReunionModal({ onClose, onSubmit, isPending, initial }) {
  const [form, setForm] = useState(initial || initialForm);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.batch || !form.eventDate) return;
    onSubmit(form);
  }

  return (
    <div className="rn-modal-backdrop" onClick={onClose}>
      <div className="rn-modal" onClick={e => e.stopPropagation()}>
        <div className="rn-modal-header">
          <h3 className="rn-modal-title">{initial ? "Edit Reunion" : "Plan a Reunion"}</h3>
          <button className="rn-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="rn-modal-body">
            <div className="rn-form-group full">
              <label className="rn-label">Reunion Title *</label>
              <input className="rn-input" name="title" value={form.title} onChange={handleChange} placeholder="Class of 2015 Silver Jubilee Reunion" required />
            </div>
            <div className="rn-form-grid">
              <div className="rn-form-group">
                <label className="rn-label">Batch Year *</label>
                <select className="rn-input" name="batch" value={form.batch} onChange={handleChange} required>
                  <option value="">Select batch...</option>
                  {batchOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="rn-form-group">
                <label className="rn-label">Department</label>
                <input className="rn-input" name="department" value={form.department} onChange={handleChange} placeholder="Computer Science" />
              </div>
              <div className="rn-form-group">
                <label className="rn-label">Event Date & Time *</label>
                <input className="rn-input" name="eventDate" type="datetime-local" value={form.eventDate} onChange={handleChange} required />
              </div>
              <div className="rn-form-group">
                <label className="rn-label">Location</label>
                <input className="rn-input" name="location" value={form.location} onChange={handleChange} placeholder="Campus Auditorium" />
              </div>
            </div>
            <div className="rn-form-group full" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" id="rnIsVirtual" name="isVirtual" checked={form.isVirtual} onChange={handleChange} />
              <label htmlFor="rnIsVirtual" className="rn-label" style={{ margin: 0, textTransform: "none" }}>This is a virtual reunion</label>
            </div>
            {form.isVirtual && (
              <div className="rn-form-group full">
                <label className="rn-label">Virtual Meeting Link</label>
                <input className="rn-input" name="virtualLink" value={form.virtualLink} onChange={handleChange} placeholder="https://zoom.us/..." />
              </div>
            )}
            <div className="rn-form-group full">
              <label className="rn-label">Description</label>
              <textarea className="rn-input rn-textarea" name="description" value={form.description} onChange={handleChange} placeholder="Share details about the reunion — agenda, things to bring, memories to reminisce..." />
            </div>
          </div>
          <div className="rn-modal-footer">
            <button type="button" className="rn-btn rn-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="rn-btn rn-btn-primary" disabled={isPending}>
              {isPending ? "Saving..." : initial ? "Update Reunion" : "Create Reunion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Reunion Card ────────────────────────────────────── */
function ReunionCard({ reunion, idx, onRsvp, rsvpPending, onEdit, onDelete, isAdmin }) {
  const countdown = getCountdown(reunion.eventDate);
  const isPast = countdown === "Completed";

  return (
    <div className="rn-card">
      <div className="rn-card-cover" style={{ backgroundImage: `url(${getCover(reunion, idx)})` }}>
        <div className="rn-card-cover-overlay" />
        <div className="rn-card-badges">
          <span className="rn-badge rn-badge-batch">Batch {reunion.batch}</span>
          {reunion.department && <span className="rn-badge rn-badge-dept">{reunion.department}</span>}
          {reunion.isVirtual && <span className="rn-badge rn-badge-virtual">Virtual</span>}
        </div>
        {(reunion.isOrganizer || isAdmin) && (
          <div className="rn-card-actions">
            <button className="rn-card-action-btn" title="Edit" onClick={() => onEdit(reunion)}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
            </button>
            <button className="rn-card-action-btn" title="Delete" onClick={() => onDelete(reunion._id)}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            </button>
          </div>
        )}
        <div className="rn-card-countdown">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{isPast ? "check_circle" : "timer"}</span>
          {countdown}
        </div>
      </div>
      <div className="rn-card-body">
        <h3 className="rn-card-title">{reunion.title}</h3>
        <div className="rn-card-meta">
          <span><span className="material-symbols-outlined">calendar_today</span>{fmtDate(reunion.eventDate)} at {fmtTime(reunion.eventDate)}</span>
          <span><span className="material-symbols-outlined">{reunion.isVirtual ? "videocam" : "location_on"}</span>{reunion.isVirtual ? "Virtual Reunion" : reunion.location || "TBD"}</span>
        </div>
        {reunion.description && <p className="rn-card-desc">{reunion.description}</p>}
        <div className="rn-card-organizer">
          <span className="material-symbols-outlined">person</span>
          Organized by {reunion.organizers?.map(o => o.name).join(", ") || "Alumni"}
        </div>
        <div className="rn-card-rsvp">
          <div className="rn-rsvp-counts">
            <span className="attending"><span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>{reunion.rsvpCounts?.attending || 0}</span>
            <span className="maybe"><span className="material-symbols-outlined" style={{ fontSize: 14 }}>help</span>{reunion.rsvpCounts?.maybe || 0}</span>
            <span className="declined"><span className="material-symbols-outlined" style={{ fontSize: 14 }}>cancel</span>{reunion.rsvpCounts?.declined || 0}</span>
          </div>
          {!isPast && (
            <div className="rn-rsvp-actions">
              <button className={`rn-rsvp-btn ${reunion.myRsvpStatus === "attending" ? "active-attending" : ""}`} onClick={() => onRsvp(reunion._id, "attending")} disabled={rsvpPending}>
                Going
              </button>
              <button className={`rn-rsvp-btn ${reunion.myRsvpStatus === "maybe" ? "active-maybe" : ""}`} onClick={() => onRsvp(reunion._id, "maybe")} disabled={rsvpPending}>
                Maybe
              </button>
              <button className={`rn-rsvp-btn ${reunion.myRsvpStatus === "declined" ? "active-declined" : ""}`} onClick={() => onRsvp(reunion._id, "declined")} disabled={rsvpPending}>
                Can't Go
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────── */
export default function ReunionPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = auth.user?.role === "institute_admin";

  const [showModal, setShowModal] = useState(false);
  const [editingReunion, setEditingReunion] = useState(null);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data = [], isLoading } = useQuery({
    queryKey: ["reunions", batchFilter],
    queryFn: () => fetchReunions(batchFilter ? { batch: batchFilter } : {})
  });

  const createMut = useMutation({
    mutationFn: createReunion,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reunions"] }); setShowModal(false); }
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateReunion(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reunions"] }); setEditingReunion(null); }
  });

  const deleteMut = useMutation({
    mutationFn: deleteReunion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reunions"] })
  });

  const rsvpMut = useMutation({
    mutationFn: ({ id, status }) => rsvpReunion(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reunions"] })
  });

  const filtered = useMemo(() => {
    if (!deferredSearch) return data;
    const q = deferredSearch.toLowerCase();
    return data.filter(r =>
      `${r.title} ${r.description} ${r.department} ${r.batch}`.toLowerCase().includes(q)
    );
  }, [data, deferredSearch]);

  const now = new Date();
  const upcoming = filtered.filter(r => new Date(r.eventDate) >= now);
  const past = filtered.filter(r => new Date(r.eventDate) < now).sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

  const totalAttending = data.reduce((s, r) => s + (r.rsvpCounts?.attending || 0), 0);

  function handleEdit(r) {
    setEditingReunion({
      ...initialForm,
      title: r.title,
      batch: String(r.batch),
      department: r.department || "",
      description: r.description || "",
      eventDate: r.eventDate ? new Date(r.eventDate).toISOString().slice(0, 16) : "",
      location: r.location || "",
      isVirtual: Boolean(r.isVirtual),
      virtualLink: r.virtualLink || "",
      _id: r._id
    });
  }

  function handleDelete(id) {
    if (window.confirm("Delete this reunion?")) deleteMut.mutate(id);
  }

  return (
    <div className="rn-root">
      {/* Header */}
      <div className="rn-header">
        <div>
          <h1 className="rn-title">Batch Reunions</h1>
          <p className="rn-sub">Plan and organize reunions with your batchmates.</p>
        </div>
        <button className="rn-btn rn-btn-primary" onClick={() => setShowModal(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Plan a Reunion
        </button>
      </div>

      {/* Stats */}
      <div className="rn-stats">
        <div className="rn-stat-card">
          <div className="rn-stat-icon purple"><span className="material-symbols-outlined">celebration</span></div>
          <div className="rn-stat-info"><h4>{data.length}</h4><p>Total Reunions</p></div>
        </div>
        <div className="rn-stat-card">
          <div className="rn-stat-icon emerald"><span className="material-symbols-outlined">event_upcoming</span></div>
          <div className="rn-stat-info"><h4>{upcoming.length}</h4><p>Upcoming</p></div>
        </div>
        <div className="rn-stat-card">
          <div className="rn-stat-icon amber"><span className="material-symbols-outlined">groups</span></div>
          <div className="rn-stat-info"><h4>{totalAttending}</h4><p>Total RSVPs</p></div>
        </div>
        <div className="rn-stat-card">
          <div className="rn-stat-icon rose"><span className="material-symbols-outlined">history</span></div>
          <div className="rn-stat-info"><h4>{past.length}</h4><p>Past Reunions</p></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rn-toolbar">
        <div className="rn-search-wrap">
          <span className="material-symbols-outlined rn-search-icon">search</span>
          <input className="rn-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reunions..." />
        </div>
        <select className="rn-filter-select" value={batchFilter} onChange={e => setBatchFilter(e.target.value)}>
          <option value="">All Batches</option>
          {batchOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {(search || batchFilter) && (
          <button className="rn-btn rn-btn-ghost" onClick={() => { setSearch(""); setBatchFilter(""); }}>Reset</button>
        )}
      </div>

      {isLoading && <p style={{ color: "#94a3b8", textAlign: "center", padding: "2rem" }}>Loading reunions...</p>}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <>
          <h2 className="rn-section-header"><span className="material-symbols-outlined">event_upcoming</span>Upcoming Reunions</h2>
          <div className="rn-grid">
            {upcoming.map((r, i) => (
              <ReunionCard key={r._id} reunion={r} idx={i} isAdmin={isAdmin}
                onRsvp={(id, status) => rsvpMut.mutate({ id, status })} rsvpPending={rsvpMut.isPending}
                onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}

      {/* Past */}
      {past.length > 0 && (
        <>
          <h2 className="rn-section-header"><span className="material-symbols-outlined">history</span>Past Reunions</h2>
          <div className="rn-grid">
            {past.map((r, i) => (
              <ReunionCard key={r._id} reunion={r} idx={i + upcoming.length} isAdmin={isAdmin}
                onRsvp={(id, status) => rsvpMut.mutate({ id, status })} rsvpPending={rsvpMut.isPending}
                onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}

      {/* Empty */}
      {!isLoading && data.length === 0 && (
        <div className="rn-empty">
          <span className="material-symbols-outlined">celebration</span>
          <h3>No Reunions Yet</h3>
          <p>Be the first to plan a batch reunion! Click the button above to get started.</p>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <ReunionModal
          onClose={() => setShowModal(false)}
          onSubmit={form => createMut.mutate(form)}
          isPending={createMut.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingReunion && (
        <ReunionModal
          initial={editingReunion}
          onClose={() => setEditingReunion(null)}
          onSubmit={form => updateMut.mutate({ id: editingReunion._id, payload: form })}
          isPending={updateMut.isPending}
        />
      )}
    </div>
  );
}
