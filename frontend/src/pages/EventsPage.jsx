import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { PortalSearchField } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  cancelEventRegistration,
  deleteEvent,
  fetchEvents,
  registerForEvent,
  updateEvent
} from "../lib/api.js";

const initialForm = {
  title: "",
  description: "",
  eventDate: "",
  location: "",
  registrationCap: ""
};

const initialFilters = {
  query: "",
  type: ""
};

const tabItems = ["All", "Reunions", "Webinars", "Hackathons", "Campus Events"];

function getOrdinal(day) {
  const remainder = day % 10;
  const teens = day % 100;

  if (teens >= 11 && teens <= 13) return `${day}th`;
  if (remainder === 1) return `${day}st`;
  if (remainder === 2) return `${day}nd`;
  if (remainder === 3) return `${day}rd`;
  return `${day}th`;
}

function formatClassicDate(value) {
  const date = new Date(value);
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const month = date.toLocaleDateString(undefined, { month: "short" });
  const year = date.getFullYear();
  const day = getOrdinal(date.getDate());
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase();
  return `${weekday}, ${day} ${month} ${year}, ${time} (IST)`;
}

function deriveTabCategory(item) {
  const text = `${item.title || ""} ${item.description || ""} ${item.eventType || ""}`.toLowerCase();

  if (text.includes("reunion")) return "Reunions";
  if (text.includes("webinar") || text.includes("zoom") || text.includes("virtual")) return "Webinars";
  if (text.includes("hackathon")) return "Hackathons";
  return "Campus Events";
}

function EventsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [activeTab, setActiveTab] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents
  });

  const deferredQuery = useDeferredValue(filters.query);

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => updateEvent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setForm(initialForm);
      setEditingId(null);
      setShowComposer(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    }
  });

  const registrationMutation = useMutation({
    mutationFn: ({ id, isRegistered }) => (isRegistered ? cancelEventRegistration(id) : registerForEvent(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    }
  });

  const isAdmin = auth.user?.role === "institute_admin";
  const canCreateEvent = auth.user?.role === "institute_admin" || auth.user?.role === "alumni";
  const decoratedEvents = useMemo(() => data, [data]);

  const filteredEvents = useMemo(() => {
    return decoratedEvents.filter((item) => {
      const haystack = `${item.title} ${item.description} ${item.location} ${item.eventType}`.toLowerCase();
      const matchesQuery = deferredQuery ? haystack.includes(deferredQuery.toLowerCase()) : true;
      const matchesType = filters.type ? deriveTabCategory(item) === filters.type : true;
      const matchesTab = activeTab === "All" ? true : deriveTabCategory(item) === activeTab;
      return matchesQuery && matchesType && matchesTab;
    });
  }, [decoratedEvents, deferredQuery, filters.type, activeTab]);

  const now = new Date();
  const upcomingEvents = filteredEvents.filter((item) => new Date(item.eventDate) >= now);
  const pastEvents = filteredEvents
    .filter((item) => new Date(item.eventDate) < now)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  const tabBadges = tabItems.reduce((accumulator, tab) => {
    if (tab === "All") {
      accumulator[tab] = decoratedEvents.length;
      return accumulator;
    }

    accumulator[tab] = decoratedEvents.filter((item) => deriveTabCategory(item) === tab).length;
    return accumulator;
  }, {});

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...form,
      registrationCap: String(form.registrationCap || "").trim() === "" ? undefined : Number(form.registrationCap)
    };

    saveMutation.mutate({ id: editingId, payload });
  }

  function handleEdit(item) {
    setEditingId(item._id);
    setShowComposer(true);
    setForm({
      title: item.title || "",
      description: item.description || "",
      eventDate: item.eventDate ? new Date(item.eventDate).toISOString().slice(0, 16) : "",
      location: item.location || "",
      registrationCap:
        Number.isFinite(Number(item.registrationCap)) && Number(item.registrationCap) > 0
          ? String(item.registrationCap)
          : ""
    });
  }

  function handleCancel() {
    setEditingId(null);
    setForm(initialForm);
    setShowComposer(false);
  }

  function clearFilters() {
    setFilters(initialFilters);
  }

  function canDeleteEvent(item) {
    if (isAdmin) {
      return true;
    }

    const createdById =
      typeof item.createdBy === "object" && item.createdBy !== null
        ? item.createdBy._id || item.createdBy.id
        : item.createdBy;

    return String(createdById || "") === String(auth.user?.id || "");
  }

  return (
    <div className="events-classic-page">
      <section className="events-classic-shell">
        <header className="events-classic-header">
          <div className="events-classic-title-wrap">
            <h1>Events</h1>
            <p>
              View upcoming and previous alumni events & conferences from {auth.user?.institute?.name || "your institute"}
            </p>
          </div>

          {canCreateEvent ? (
            <div className="events-classic-actions">
              <button
                className="button primary compact"
                onClick={() => {
                  navigate("/portal/events/create");
                }}
                type="button"
              >
                + Create Event
              </button>
            </div>
          ) : null}
        </header>

        {showComposer ? (
          <SectionCard title={editingId ? "Edit Association Event" : "Create Association Event"} subtitle="SPIT Alumni Association Committee">
            <form className="form-grid" onSubmit={handleSubmit}>
              <input name="title" onChange={handleChange} placeholder="Event title" value={form.title} />
              <textarea
                className="textarea"
                name="description"
                onChange={handleChange}
                placeholder="Event description"
                rows="4"
                value={form.description}
              />
              <input name="eventDate" onChange={handleChange} type="datetime-local" value={form.eventDate} />
              <input name="location" onChange={handleChange} placeholder="Location" value={form.location} />
              <input
                min="0"
                name="registrationCap"
                onChange={handleChange}
                placeholder="Registration capacity"
                type="number"
                value={form.registrationCap}
              />
              <div className="inline-actions">
                <button className="button primary" disabled={saveMutation.isPending} type="submit">
                  {saveMutation.isPending ? "Saving..." : "Update Event"}
                </button>
                <button className="button secondary" onClick={handleCancel} type="button">
                  Cancel
                </button>
              </div>
            </form>
            {saveMutation.isError ? <p className="error-text">{saveMutation.error.message}</p> : null}
          </SectionCard>
        ) : null}

        <div className="events-classic-toolbar">
          <PortalSearchField
            className="events-board-search"
            name="query"
            onChange={handleFilterChange}
            placeholder="Search events by title or keyword..."
            value={filters.query}
          />
          <select className="select" name="type" onChange={handleFilterChange} value={filters.type}>
            <option value="">All Categories</option>
            {tabItems.filter((tab) => tab !== "All").map((tab) => (
              <option key={tab} value={tab}>
                {tab}
              </option>
            ))}
          </select>
          <button className="button secondary compact" onClick={clearFilters} type="button">
            Reset
          </button>
        </div>

        <div aria-label="Event categories" className="events-classic-tabs" role="tablist">
          {tabItems.map((tab) => (
            <button className={tab === activeTab ? "active" : ""} key={tab} onClick={() => setActiveTab(tab)} type="button">
              {tab}
              {tab === activeTab ? null : <span>{tabBadges[tab]}</span>}
            </button>
          ))}
        </div>

        <section className="events-classic-upcoming">
          {isLoading ? <p>Loading events...</p> : null}
          {isError ? <p className="error-text">{error.message}</p> : null}

          {!isLoading && !isError ? (
            upcomingEvents.length ? (
              <div className="events-classic-upcoming-grid">
                {upcomingEvents.map((item, index) => (
                  <article className="events-classic-card" key={item._id}>
                    <div className={`events-classic-image media-${(index % 6) + 1}`} />
                    <div className="events-classic-content">
                      <div className="events-classic-topline">
                        <h3>{item.title}</h3>
                        <span className="events-classic-pill">{deriveTabCategory(item).toLowerCase()}</span>
                      </div>
                      <p>{item.location || "Campus venue"}</p>
                      <p>{formatClassicDate(item.eventDate)}</p>
                      <div className="events-classic-card-actions">
                        {isAdmin || canDeleteEvent(item) ? (
                          <>
                            {isAdmin ? (
                              <button className="button secondary compact" onClick={() => handleEdit(item)} type="button">
                                Edit
                              </button>
                            ) : null}
                            <button className="button secondary compact" onClick={() => deleteMutation.mutate(item._id)} type="button">
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            className="button primary compact"
                            disabled={registrationMutation.isPending}
                            onClick={() =>
                              registrationMutation.mutate({
                                id: item._id,
                                isRegistered: item.isRegistered
                              })
                            }
                            type="button"
                          >
                            {item.isRegistered ? "Cancel RSVP" : "Register"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="events-classic-empty">No Upcoming Events</p>
            )
          ) : null}
        </section>

        <section className="events-classic-past">
          <h2>PAST EVENTS</h2>
          {!pastEvents.length ? <p className="muted">No past events in this category yet.</p> : null}
          <div className="events-classic-past-grid">
            {pastEvents.map((item, index) => (
              <article className="events-classic-card" key={item._id}>
                <div className={`events-classic-image media-${(index % 6) + 1}`} />
                <div className="events-classic-content">
                  <div className="events-classic-topline">
                    <h3>{item.title}</h3>
                    <span className="events-classic-pill">{deriveTabCategory(item).toLowerCase()}</span>
                  </div>
                  <p>{item.location || "Campus venue"}</p>
                  <p>{formatClassicDate(item.eventDate)}</p>

                  <div className="events-classic-card-actions">
                    {isAdmin || canDeleteEvent(item) ? (
                      <>
                        {isAdmin ? (
                          <button className="button secondary compact" onClick={() => handleEdit(item)} type="button">
                            Edit
                          </button>
                        ) : null}
                        <button className="button secondary compact" onClick={() => deleteMutation.mutate(item._id)} type="button">
                          Delete
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {deleteMutation.isError ? <p className="error-text">{deleteMutation.error.message}</p> : null}
        {registrationMutation.isError ? <p className="error-text">{registrationMutation.error.message}</p> : null}
      </section>
    </div>
  );
}

export default EventsPage;
