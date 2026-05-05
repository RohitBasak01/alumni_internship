import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchEvents, registerForEvent, cancelEventRegistration } from '../../lib/api.js';

export function GroupEvents({ groupId, canManage }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ['group-events', groupId],
    queryFn: () => fetchEvents({ groupId })
  });

  const formatEventDate = (dateStr) => {
    const date = new Date(dateStr);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      full: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    };
  };

  const registrationMutation = useMutation({
    mutationFn: ({ id, isRegistered }) => 
      isRegistered ? cancelEventRegistration(id) : registerForEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-events', groupId] });
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading group events...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-red-500">Failed to load events.</div>;
  }

  return (
    <div className="group-events-view">
      <div className="group-portal-section-header">
        <h2>
          <span className="material-symbols-outlined">event</span>
          Upcoming Events
        </h2>
        {canManage && (
          <button 
            className="button primary compact"
            onClick={() => navigate(`/portal/events/create?groupId=${groupId}`)}
          >
            <span className="material-symbols-outlined">add</span>
            Create Event
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="portal-empty-state">
          <span className="material-symbols-outlined">event_busy</span>
          <h3>No Events Yet</h3>
          <p>There are no events scheduled for this group at the moment. Stay tuned!</p>
        </div>
      ) : (
        <div className="group-events-grid">
          {events.map((event) => {
            const date = formatEventDate(event.eventDate);
            return (
              <div className="group-event-card" key={event._id}>
                <div className="event-card-date-badge">
                  <span className="month">{date.month}</span>
                  <span className="day">{date.day}</span>
                </div>
                
                <div className="event-card-content">
                  <div className="event-card-main">
                    <h3>{event.title}</h3>
                    <div className="event-meta-row">
                      <span className="material-symbols-outlined">schedule</span>
                      {date.full}
                    </div>
                    <div className="event-meta-row">
                      <span className="material-symbols-outlined">location_on</span>
                      {event.location || "Online"}
                    </div>
                  </div>

                  <p className="event-card-description">
                    {event.description || "Join us for this group event to connect and share with fellow alumni."}
                  </p>

                  <div className="event-card-footer">
                    <div className="event-attendees-summary">
                      <span className="material-symbols-outlined">group</span>
                      {event.attendeeCount} attending
                    </div>
                    
                    <button 
                      className={`button ${event.isRegistered ? 'secondary' : 'primary'}`}
                      disabled={registrationMutation.isPending}
                      onClick={() => registrationMutation.mutate({ 
                        id: event._id, 
                        isRegistered: event.isRegistered 
                      })}
                    >
                      {event.isRegistered ? 'Cancel RSVP' : 'Register Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
