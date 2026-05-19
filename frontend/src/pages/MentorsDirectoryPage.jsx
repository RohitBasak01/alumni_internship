import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMentors, requestMentorshipSession } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import "../styles/Mentorship.css";

export default function MentorsDirectoryPage() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMentor, setSelectedMentor] = useState(null);
  
  // Modal state
  const [proposedTimes, setProposedTimes] = useState(["", "", ""]);
  const [agenda, setAgenda] = useState("");

  const { data: mentors = [], isLoading } = useQuery({
    queryKey: ["mentors"],
    queryFn: () => fetchMentors(),
  });

  const requestMutation = useMutation({
    mutationFn: requestMentorshipSession,
    onSuccess: () => {
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["mentorship-sessions"] });
      toast.success("Session requested successfully. You can track it in your Mentorship Dashboard.");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to request session.");
    }
  });

  const filteredMentors = mentors.filter(m => {
    const text = `${m.userId.name} ${m.expertise.join(" ")} ${m.bio}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const openModal = (mentor) => {
    if (mentor.userId._id === auth.user?._id) {
      toast.warning("You cannot request a session with yourself.");
      return;
    }
    setSelectedMentor(mentor);
    setProposedTimes(["", "", ""]);
    setAgenda("");
  };

  const closeModal = () => setSelectedMentor(null);

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    const validTimes = proposedTimes.filter(t => t.trim() !== "");
    if (validTimes.length === 0) {
      toast.warning("Please propose at least one date/time slot.");
      return;
    }
    requestMutation.mutate({
      mentorId: selectedMentor.userId._id,
      proposedTimes: validTimes,
      agenda
    });
  };

  return (
    <div className="mt-page-container">
      <div className="mt-hero">
        <div className="mt-hero-content">
          <h1 className="mt-hero-title">Find a Mentor</h1>
          <p className="mt-hero-subtitle">Connect with experienced alumni who can guide you through your career journey, review your resume, or provide industry insights.</p>
        </div>
        <div className="mt-hero-actions">
          <Link to="/portal/mentorship-sessions" className="mt-hero-btn mt-hero-btn--ghost">
            My Sessions
          </Link>
          <Link to="/portal/mentors/join" className="mt-hero-btn">
            Become a Mentor
          </Link>
        </div>
      </div>

      <div className="mt-search-block">
        <input 
          type="text" 
          className="mt-input" 
          placeholder="Search by name, expertise, or keywords..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="mt-empty-state">Loading mentors...</div>
      ) : filteredMentors.length === 0 ? (
        <div className="mt-empty-state mt-empty-state--card">
          <span className="material-symbols-outlined">search_off</span>
          <h3>No mentors found</h3>
        </div>
      ) : (
        <div className="mt-grid">
          {filteredMentors.map(mentor => (
            <div key={mentor._id} className="mt-card">
              <div className="mt-card-header">
                {mentor.userId.profilePicture ? (
                  <img src={mentor.userId.profilePicture} alt={mentor.userId.name} className="mt-avatar" />
                ) : (
                  <div className="mt-avatar-placeholder"><span className="material-symbols-outlined">person</span></div>
                )}
                <div className="mt-info">
                  <h3>{mentor.userId.name}</h3>
                  <p>{mentor.userId.headline}</p>
                </div>
              </div>

              <div className="mt-expertise">
                {mentor.expertise.map((exp, i) => (
                  <span key={i} className="mt-tag">{exp}</span>
                ))}
              </div>

              <p className="mt-bio">{mentor.bio}</p>

              <div className="mt-availability">
                <span className="material-symbols-outlined">event_available</span>
                {mentor.availabilityText}
              </div>

              <button className="mt-btn" onClick={() => openModal(mentor)}>Request Session</button>
            </div>
          ))}
        </div>
      )}

      {selectedMentor && (
        <div className="mt-modal-overlay">
          <div className="mt-modal">
            <h2 className="mt-modal-title">Request Session with {selectedMentor.userId.name}</h2>
            <form onSubmit={handleSubmitRequest}>
              <div className="mt-form-group">
                <label className="mt-form-label">What do you want to discuss? (Agenda)</label>
                <textarea 
                  required
                  className="mt-input" 
                  rows={4} 
                  value={agenda}
                  onChange={e => setAgenda(e.target.value)}
                  placeholder="E.g., I would like you to review my resume and give me tips for applying to Product Management roles."
                />
              </div>

              <div className="mt-form-group">
                <label className="mt-form-label">
                  Propose 3 Dates & Times <br/>
                  <span>Mentor's Availability: {selectedMentor.availabilityText}</span>
                </label>
                {proposedTimes.map((time, idx) => (
                  <input 
                    key={idx}
                    type="datetime-local" 
                    className="mt-input" 
                    value={time}
                    onChange={e => {
                      const newTimes = [...proposedTimes];
                      newTimes[idx] = e.target.value;
                      setProposedTimes(newTimes);
                    }}
                    required={idx === 0}
                  />
                ))}
              </div>

              <div className="mt-modal-actions">
                <button type="button" className="mt-btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="mt-btn-solid" disabled={requestMutation.isPending}>
                  {requestMutation.isPending ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
