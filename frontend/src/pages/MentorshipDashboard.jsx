import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMySessions, respondToSession, cancelSession } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/Mentorship.css";

export default function MentorshipDashboard() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState("upcoming");

  // Mentor Acceptance Modal State
  const [sessionToAccept, setSessionToAccept] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [generateJitsi, setGenerateJitsi] = useState(true);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["mentorship-sessions"],
    queryFn: () => fetchMySessions(),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, payload }) => respondToSession(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["mentorship-sessions"]);
      closeModal();
    }
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSession,
    onSuccess: () => {
      queryClient.invalidateQueries(["mentorship-sessions"]);
    }
  });

  const openAcceptModal = (session) => {
    setSessionToAccept(session);
    setSelectedTime(session.proposedTimes[0]);
    setMeetingLink("");
    setGenerateJitsi(true);
  };

  const closeModal = () => {
    setSessionToAccept(null);
  };

  const handleAcceptSubmit = (e) => {
    e.preventDefault();
    if (!generateJitsi && !meetingLink.trim()) {
      alert("Please provide a meeting link or select the auto-generate option.");
      return;
    }

    respondMutation.mutate({
      id: sessionToAccept._id,
      payload: {
        action: "accept",
        confirmedTime: selectedTime,
        meetingLink,
        generateJitsi
      }
    });
  };

  const handleDecline = (id) => {
    if (confirm("Are you sure you want to decline this request?")) {
      respondMutation.mutate({ id, payload: { action: "decline" } });
    }
  };

  const handleCancel = (id) => {
    if (confirm("Are you sure you want to cancel this confirmed session?")) {
      cancelMutation.mutate(id);
    }
  };

  if (isLoading) return <div style={{ padding: "4rem", textAlign: "center" }}>Loading...</div>;

  const upcoming = sessions.filter(s => s.status === "confirmed");
  const pending = sessions.filter(s => s.status === "pending");
  const history = sessions.filter(s => ["completed", "cancelled", "declined"].includes(s.status));

  const renderSessionCard = (session, isPending = false) => {
    const isMentor = session.mentorId._id === auth.user._id;
    const otherPerson = isMentor ? session.menteeId : session.mentorId;

    return (
      <div key={session._id} className="mt-session-card">
        <div style={{ flex: 1 }}>
          <div className="mt-session-meta">
            <span className={`fr-badge ${session.status === 'confirmed' ? 'completed' : ''}`} style={{ background: session.status === 'pending' ? '#f59e0b' : session.status === 'declined' || session.status === 'cancelled' ? '#ef4444' : '' }}>
              {session.status}
            </span>
            <span>•</span>
            <span style={{ fontWeight: 600, color: "#334155" }}>
              {isMentor ? "You are mentoring" : "Mentored by"} {otherPerson?.name || "Unknown"}
            </span>
          </div>
          
          <div className="mt-agenda">
            <strong style={{ display: "block", marginBottom: "0.5rem" }}>Agenda:</strong>
            {session.agenda}
          </div>

          <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#475569" }}>
            {session.status === "confirmed" ? (
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <div><strong style={{ color: "#0f172a" }}>Confirmed Time:</strong> {session.confirmedTime}</div>
                {session.meetingLink && (
                  <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-btn" style={{ padding: "0.4rem 0.8rem", width: "auto" }}>
                    Join Meeting
                  </a>
                )}
              </div>
            ) : (
              <div>
                <strong style={{ color: "#0f172a" }}>Proposed Times:</strong>
                <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
                  {session.proposedTimes.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-session-actions" style={{ marginLeft: "2rem" }}>
          {isPending && isMentor && (
            <>
              <button className="mt-btn-solid" onClick={() => openAcceptModal(session)}>Accept</button>
              <button className="mt-btn-outline" onClick={() => handleDecline(session._id)}>Decline</button>
            </>
          )}
          {isPending && !isMentor && (
            <div style={{ color: "#f59e0b", textAlign: "center", fontStyle: "italic" }}>Waiting for mentor</div>
          )}
          {session.status === "confirmed" && (
            <button className="mt-btn-outline" onClick={() => handleCancel(session._id)}>Cancel Session</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-page-container" style={{ maxWidth: "1000px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", color: "#0f172a", margin: 0 }}>Mentorship Sessions</h1>
        <Link to="/portal/mentors" className="mt-btn" style={{ width: "auto", textDecoration: "none" }}>
          Find a Mentor
        </Link>
      </div>

      <div className="mt-tabs">
        <button className={`mt-tab ${activeTab === "upcoming" ? "active" : ""}`} onClick={() => setActiveTab("upcoming")}>
          Upcoming ({upcoming.length})
        </button>
        <button className={`mt-tab ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
          Requests ({pending.length})
        </button>
        <button className={`mt-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          History
        </button>
      </div>

      <div className="mt-session-list">
        {activeTab === "upcoming" && (
          upcoming.length === 0 ? <p style={{ color: "#64748b" }}>No upcoming sessions.</p> : upcoming.map(s => renderSessionCard(s))
        )}
        {activeTab === "pending" && (
          pending.length === 0 ? <p style={{ color: "#64748b" }}>No pending requests.</p> : pending.map(s => renderSessionCard(s, true))
        )}
        {activeTab === "history" && (
          history.length === 0 ? <p style={{ color: "#64748b" }}>No past sessions.</p> : history.map(s => renderSessionCard(s))
        )}
      </div>

      {sessionToAccept && (
        <div className="mt-modal-overlay">
          <div className="mt-modal">
            <h2 style={{ margin: "0 0 1.5rem" }}>Accept Mentorship Request</h2>
            <form onSubmit={handleAcceptSubmit}>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Select a Time Slot</label>
                <select className="mt-input" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} required>
                  <option value="" disabled>Select one of the proposed times...</option>
                  {sessionToAccept.proposedTimes.map((t, i) => (
                    <option key={i} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Meeting Link</label>
                
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", fontSize: "0.95rem" }}>
                  <input type="checkbox" checked={generateJitsi} onChange={e => setGenerateJitsi(e.target.checked)} />
                  Automatically generate a Jitsi Meet link
                </label>

                {!generateJitsi && (
                  <input 
                    type="url" 
                    className="mt-input" 
                    placeholder="https://zoom.us/j/..." 
                    value={meetingLink}
                    onChange={e => setMeetingLink(e.target.value)}
                    required={!generateJitsi}
                  />
                )}
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                <button type="button" className="mt-btn-outline" style={{ flex: 1 }} onClick={closeModal}>Cancel</button>
                <button type="submit" className="mt-btn-solid" style={{ flex: 1 }} disabled={respondMutation.isPending}>
                  {respondMutation.isPending ? "Accepting..." : "Confirm Session"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
