import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelSession, fetchMySessions, respondToSession } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";
import "../styles/Mentorship.css";

export default function MentorshipDashboard() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [sessionToAccept, setSessionToAccept] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [generateJitsi, setGenerateJitsi] = useState(true);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["mentorship-sessions"],
    queryFn: () => fetchMySessions()
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, payload }) => respondToSession(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-sessions"] });
      closeModal();
      toast.success("Mentorship session updated.");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update mentorship session.");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-sessions"] });
      toast.success("Mentorship session cancelled.");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to cancel mentorship session.");
    }
  });

  function openAcceptModal(session) {
    setSessionToAccept(session);
    setSelectedTime(session.proposedTimes[0]);
    setMeetingLink("");
    setGenerateJitsi(true);
  }

  function closeModal() {
    setSessionToAccept(null);
  }

  function handleAcceptSubmit(event) {
    event.preventDefault();
    if (!generateJitsi && !meetingLink.trim()) {
      toast.warning("Please provide a meeting link or select the auto-generate option.");
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
  }

  async function handleDecline(id) {
    const confirmed = await confirm({
      title: "Decline mentorship request?",
      message: "This will notify the mentee that you cannot take this session.",
      confirmLabel: "Decline",
      destructive: true
    });
    if (confirmed) {
      respondMutation.mutate({ id, payload: { action: "decline" } });
    }
  }

  async function handleCancel(id) {
    const confirmed = await confirm({
      title: "Cancel confirmed session?",
      message: "This will cancel the scheduled mentorship session for both participants.",
      confirmLabel: "Cancel session",
      destructive: true
    });
    if (confirmed) {
      cancelMutation.mutate(id);
    }
  }

  if (isLoading) {
    return <div className="mt-empty-state">Loading...</div>;
  }

  const upcoming = sessions.filter((session) => session.status === "confirmed");
  const pending = sessions.filter((session) => session.status === "pending");
  const history = sessions.filter((session) => ["completed", "cancelled", "declined"].includes(session.status));

  function renderSessionCard(session, isPending = false) {
    const isMentor = session.mentorId._id === auth.user._id;
    const otherPerson = isMentor ? session.menteeId : session.mentorId;

    return (
      <div className="mt-session-card" key={session._id}>
        <div className="mt-session-main">
          <div className="mt-session-meta">
            <span className={`mt-session-status mt-session-status--${session.status}`}>{session.status}</span>
            <span>•</span>
            <span className="mt-session-person">
              {isMentor ? "You are mentoring" : "Mentored by"} {otherPerson?.name || "Unknown"}
            </span>
          </div>

          <div className="mt-agenda">
            <strong>Agenda:</strong>
            {session.agenda}
          </div>

          <div className="mt-session-schedule">
            {session.status === "confirmed" ? (
              <div className="mt-confirmed-row">
                <div>
                  <strong>Confirmed Time:</strong> {session.confirmedTime}
                </div>
                {session.meetingLink ? (
                  <a className="mt-link-btn" href={session.meetingLink} rel="noopener noreferrer" target="_blank">
                    Join Meeting
                  </a>
                ) : null}
              </div>
            ) : (
              <div>
                <strong>Proposed Times:</strong>
                <ul className="mt-time-list">
                  {session.proposedTimes.map((time, index) => (
                    <li key={`${time}-${index}`}>{time}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-session-actions">
          {isPending && isMentor ? (
            <>
              <button className="mt-btn-solid" onClick={() => openAcceptModal(session)} type="button">
                Accept
              </button>
              <button className="mt-btn-outline" onClick={() => handleDecline(session._id)} type="button">
                Decline
              </button>
            </>
          ) : null}
          {isPending && !isMentor ? <div className="mt-waiting-note">Waiting for mentor</div> : null}
          {session.status === "confirmed" ? (
            <button className="mt-btn-outline" onClick={() => handleCancel(session._id)} type="button">
              Cancel Session
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-page-container mt-page-container--narrow">
      <div className="mt-page-header">
        <h1>Mentorship Sessions</h1>
        <Link className="mt-btn mt-btn--auto" to="/portal/mentors">
          Find a Mentor
        </Link>
      </div>

      <div className="mt-tabs">
        <button className={`mt-tab ${activeTab === "upcoming" ? "active" : ""}`} onClick={() => setActiveTab("upcoming")} type="button">
          Upcoming ({upcoming.length})
        </button>
        <button className={`mt-tab ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")} type="button">
          Requests ({pending.length})
        </button>
        <button className={`mt-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")} type="button">
          History
        </button>
      </div>

      <div className="mt-session-list">
        {activeTab === "upcoming" ? (upcoming.length ? upcoming.map((session) => renderSessionCard(session)) : <p className="mt-muted">No upcoming sessions.</p>) : null}
        {activeTab === "pending" ? (pending.length ? pending.map((session) => renderSessionCard(session, true)) : <p className="mt-muted">No pending requests.</p>) : null}
        {activeTab === "history" ? (history.length ? history.map((session) => renderSessionCard(session)) : <p className="mt-muted">No past sessions.</p>) : null}
      </div>

      {sessionToAccept ? (
        <div className="mt-modal-overlay">
          <div className="mt-modal">
            <h2 className="mt-modal-title">Accept Mentorship Request</h2>
            <form onSubmit={handleAcceptSubmit}>
              <div className="mt-form-group">
                <label className="mt-form-label">Select a Time Slot</label>
                <select className="mt-input" onChange={(event) => setSelectedTime(event.target.value)} required value={selectedTime}>
                  <option disabled value="">Select one of the proposed times...</option>
                  {sessionToAccept.proposedTimes.map((time, index) => (
                    <option key={`${time}-${index}`} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <div className="mt-form-group">
                <label className="mt-form-label">Meeting Link</label>
                <label className="mt-checkbox-row">
                  <input checked={generateJitsi} onChange={(event) => setGenerateJitsi(event.target.checked)} type="checkbox" />
                  Automatically generate a Jitsi Meet link
                </label>

                {!generateJitsi ? (
                  <input
                    className="mt-input"
                    onChange={(event) => setMeetingLink(event.target.value)}
                    placeholder="https://zoom.us/j/..."
                    required={!generateJitsi}
                    type="url"
                    value={meetingLink}
                  />
                ) : null}
              </div>

              <div className="mt-modal-actions">
                <button className="mt-btn-outline" onClick={closeModal} type="button">Cancel</button>
                <button className="mt-btn-solid" disabled={respondMutation.isPending} type="submit">
                  {respondMutation.isPending ? "Accepting..." : "Confirm Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
