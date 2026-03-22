import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PortalMetricCard, PortalMetricGrid, PortalPageHeader, PortalSearchField } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  cancelEventRegistration,
  createEvent,
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
  type: "",
  dateRange: "",
  location: ""
};

function formatEventDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric"
  });
}

function formatEventTime(value) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}


function EventsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents
  });
  const deferredQuery = useDeferredValue(filters.query);

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateEvent(id, payload) : createEvent(payload)),
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
    mutationFn: ({ id, isRegistered }) =>
      isRegistered ? cancelEventRegistration(id) : registerForEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    }
  });

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
      registrationCap:
        String(form.registrationCap || "").trim() === ""
          ? undefined
          : Number(form.registrationCap)
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

  const isAdmin = auth.user?.role === "institute_admin";
  const displayEvents = data;
  const decoratedEvents = useMemo(
    () => displayEvents,
    [displayEvents]
  );

  const filteredEvents = useMemo(
    () =>
      decoratedEvents.filter((item) => {
        const haystack =
          `${item.title} ${item.description} ${item.location} ${item.eventType}`.toLowerCase();
        const matchesQuery = deferredQuery ? haystack.includes(deferredQuery.toLowerCase()) : true;
        const matchesType = filters.type ? item.eventType === filters.type : true;
        const matchesDateRange = filters.dateRange
          ? isAdmin
            ? item.status === filters.dateRange
            : item.dateRange === filters.dateRange
          : true;
        const matchesLocation = filters.location ? item.location === filters.location : true;
        return matchesQuery && matchesType && matchesDateRange && matchesLocation;
      }),
    [decoratedEvents, deferredQuery, filters.type, filters.dateRange, filters.location, isAdmin]
  );

  const eventTypes = [...new Set(decoratedEvents.map((item) => item.eventType))];
  const locationOptions = [...new Set(decoratedEvents.map((item) => item.location))];
  const upcomingEvents = decoratedEvents.filter((item) => item.status === "Upcoming");
  const totalRegistrations = decoratedEvents.reduce((sum, item) => sum + (item.attendeeCount || 0), 0);
  const averageEngagement = decoratedEvents.length
    ? Math.round(
        decoratedEvents.reduce(
          (sum, item) => sum + Math.min((item.attendeeCount || 0) / (item.registrationCap || 1), 1),
          0
        ) *
          (100 / decoratedEvents.length)
      )
    : 0;

  if (isAdmin) {
    return (
      <div className="admin-events-page">
        <PortalPageHeader
          actions={
            <button
              className="button primary admin-events-create"
              onClick={() => setShowComposer((current) => !current)}
              type="button"
            >
              {showComposer ? "Close Composer" : "+ Create New Event"}
            </button>
          }
          className="admin-events-header"
          subtitle="Create, edit and track alumni engagement through events."
          title="Manage Events"
        />

        <PortalMetricGrid className="admin-events-metrics">
          <PortalMetricCard
            className="admin-events-metric-card"
            icon="EV"
            title="Total Events"
            trend="Live"
            value={decoratedEvents.length}
          />
          <PortalMetricCard
            className="admin-events-metric-card"
            icon="UP"
            title="Upcoming Events"
            value={upcomingEvents.length}
          />
          <PortalMetricCard
            className="admin-events-metric-card"
            icon="RG"
            title="Total Registrations"
            trend="Current"
            value={totalRegistrations.toLocaleString()}
          />
          <PortalMetricCard
            className="admin-events-metric-card"
            icon="EG"
            title="Avg. Engagement"
            value={averageEngagement}
            valueSuffix="%"
          />
        </PortalMetricGrid>

        {showComposer ? (
          <SectionCard title={editingId ? "Edit Event" : "Create Event"} subtitle="Institute Admin">
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
              <input
                name="eventDate"
                onChange={handleChange}
                type="datetime-local"
                value={form.eventDate}
              />
              <input
                name="location"
                onChange={handleChange}
                placeholder="Location"
                value={form.location}
              />
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
                  {saveMutation.isPending ? "Saving..." : editingId ? "Update Event" : "Publish Event"}
                </button>
                <button className="button secondary" onClick={handleCancel} type="button">
                  Cancel
                </button>
              </div>
            </form>
            {saveMutation.isError ? <p className="error-text">{saveMutation.error.message}</p> : null}
          </SectionCard>
        ) : null}

        <section className="admin-events-filters">
          <PortalSearchField
            className="admin-events-search"
            name="query"
            onChange={handleFilterChange}
            placeholder="Filter by event name..."
            value={filters.query}
          />

          <select name="dateRange" onChange={handleFilterChange} value={filters.dateRange}>
            <option value="">All Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
            <option value="Draft">Draft</option>
          </select>

          <select name="type" onChange={handleFilterChange} value={filters.type}>
            <option value="">All Categories</option>
            {eventTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <button className="admin-events-reset" onClick={clearFilters} type="button">
            Reset
          </button>
        </section>

        <section className="admin-events-table-card">
          <div className="admin-events-table-head">
            <span>Event Name</span>
            <span>Date & Time</span>
            <span>Location</span>
            <span>Category</span>
            <span>Registrations</span>
            <span>Status</span>
            <span />
          </div>

          {isLoading ? <p>Loading events...</p> : null}
          {isError ? <p className="error-text">{error.message}</p> : null}
          {!isLoading && !filteredEvents.length ? <p className="muted">No events match the current filters.</p> : null}

          <div className="admin-events-table-body">
            {filteredEvents.map((item, index) => (
                <article className="admin-events-row" key={item._id}>
                  <div className="admin-events-name">
                    <div className={`admin-events-thumb media-${(index % 6) + 1}`} />
                    <strong>{item.title}</strong>
                  </div>
                  <div className="admin-events-datetime">
                    <strong>{formatEventDate(item.eventDate)}</strong>
                    <span>{formatEventTime(item.eventDate)}</span>
                  </div>
                  <span>{item.location || "Main Campus"}</span>
                  <span className={`admin-events-category type-${item.eventType.toLowerCase().replace(/\s+/g, "-")}`}>
                    {item.eventType}
                  </span>
                  <span>
                    {item.attendeeCount || 0}
                    {item.registrationCap ? ` / ${item.registrationCap}` : ""}
                  </span>
                  <span className={`admin-events-status status-${item.status.toLowerCase()}`}>{item.status}</span>
                  <div className="admin-events-actions">
                    <button className="admin-events-icon" onClick={() => handleEdit(item)} type="button">
                      ED
                    </button>
                    <button
                      className="admin-events-icon"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(item._id)}
                      type="button"
                    >
                      DL
                    </button>
                    <button className="admin-events-icon" type="button">
                      VW
                    </button>
                  </div>
                </article>
              ))}
          </div>

          <div className="admin-events-table-footer">
            <p>
              Showing 1 to {Math.min(filteredEvents.length, 4)} of <strong>{decoratedEvents.length}</strong>{" "}
              events
            </p>
            <div className="admin-events-pagination">
              <button disabled type="button">{"<"}</button>
              <button className="active" type="button">1</button>
              <button disabled type="button">{">"}</button>
            </div>
          </div>
        </section>

        {deleteMutation.isError ? <p className="error-text">{deleteMutation.error.message}</p> : null}
      </div>
    );
  }

  return (
    <div className="events-board-page">
      <header className="events-board-header">
        <div>
          <h1>Events</h1>
          <p>Discover and join upcoming alumni gatherings.</p>
        </div>
        {auth.user ? (
          <button
            className="button primary events-board-create"
            onClick={() => setShowComposer((current) => !current)}
            type="button"
          >
            {showComposer ? "Close" : "+ Create Event"}
          </button>
        ) : null}
      </header>

      {showComposer ? (
        <SectionCard title={editingId ? "Edit Event" : "Create Event"} subtitle={isAdmin ? "Institute Admin" : "Host Event"}>
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
            <input
              name="eventDate"
              onChange={handleChange}
              type="datetime-local"
              value={form.eventDate}
            />
            <input
              name="location"
              onChange={handleChange}
              placeholder="Location"
              value={form.location}
            />
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
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Event" : "Publish Event"}
              </button>
              <button className="button secondary" onClick={handleCancel} type="button">
                Cancel
              </button>
            </div>
          </form>
          {saveMutation.isError ? <p className="error-text">{saveMutation.error.message}</p> : null}
        </SectionCard>
      ) : null}

      <section className="events-board-filters">
        <label className="events-board-search">
          <span aria-hidden="true">S</span>
          <input
            name="query"
            onChange={handleFilterChange}
            placeholder="Search events by title or keyword..."
            value={filters.query}
          />
        </label>

        <div className="events-board-filter-row">
          <select name="type" onChange={handleFilterChange} value={filters.type}>
            <option value="">Event Type</option>
            {eventTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select name="dateRange" onChange={handleFilterChange} value={filters.dateRange}>
            <option value="">Date Range</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Later">Later</option>
          </select>

          <select name="location" onChange={handleFilterChange} value={filters.location}>
            <option value="">Location</option>
            {locationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </section>

      {isLoading ? <p>Loading events...</p> : null}
      {isError ? <p className="error-text">{error.message}</p> : null}
      {!isLoading && !filteredEvents.length ? (
        <p className="muted">No events match the current filters.</p>
      ) : null}

      <div className="events-board-grid">
        {filteredEvents.map((item, index) => (
          <article className="events-board-card" key={item._id}>
            <div className={`events-board-media events-board-media-${(index % 6) + 1}`}>
              <span className="events-board-tag">{item.eventType}</span>
            </div>

            <div className="events-board-body">
              <h3>{item.title}</h3>
              <div className="events-board-meta">
                <span>
                  {formatEventDate(item.eventDate)} • {formatEventTime(item.eventDate)}
                </span>
                <span>{item.location || "Alumni House"}</span>
              </div>
              <p>{item.description}</p>

              <div className="events-board-actions">
                {isAdmin ? (
                  <>
                    <button className="button primary compact" onClick={() => handleEdit(item)} type="button">
                      Edit
                    </button>
                    <button
                      className="button secondary compact"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(item._id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    className="button primary events-board-register"
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
                <button className="button secondary compact" type="button">
                  i
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="events-board-pagination">
        <button disabled type="button">{"<"}</button>
        <button className="active" type="button">1</button>
        <button disabled type="button">{">"}</button>
      </div>

      {deleteMutation.isError ? <p className="error-text">{deleteMutation.error.message}</p> : null}
      {registrationMutation.isError ? (
        <p className="error-text">{registrationMutation.error.message}</p>
      ) : null}
    </div>
  );
}

export default EventsPage;
