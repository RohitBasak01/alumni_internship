import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyMentorProfile, optInAsMentor, toggleMentorStatus } from "../lib/api.js";
import "../styles/Mentorship.css";

export default function MentorOptInPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["mentor-profile"],
    queryFn: () => fetchMyMentorProfile().catch(() => null),
  });

  const [form, setForm] = useState({
    expertise: "",
    bio: "",
    availabilityText: "",
    maxSessionsPerMonth: 4
  });

  useEffect(() => {
    if (profile) {
      setForm({
        expertise: profile.expertise.join(", "),
        bio: profile.bio,
        availabilityText: profile.availabilityText,
        maxSessionsPerMonth: profile.maxSessionsPerMonth
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: optInAsMentor,
    onSuccess: () => {
      queryClient.invalidateQueries(["mentor-profile"]);
      queryClient.invalidateQueries(["mentors"]);
      navigate("/portal/mentors");
    }
  });

  const toggleMutation = useMutation({
    mutationFn: toggleMentorStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(["mentor-profile"]);
      queryClient.invalidateQueries(["mentors"]);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      expertise: form.expertise.split(",").map(s => s.trim()).filter(Boolean)
    });
  };

  if (isLoading) return <div style={{ padding: "4rem", textAlign: "center" }}>Loading...</div>;

  return (
    <div className="mt-page-container" style={{ maxWidth: "800px" }}>
      <div style={{ background: "white", padding: "3rem", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
        <h1 style={{ fontSize: "2rem", margin: "0 0 1rem", color: "#0f172a" }}>Become a Mentor</h1>
        <p style={{ color: "#64748b", marginBottom: "2rem" }}>
          Share your experience, review resumes, and guide the next generation of alumni. Opt in by setting your availability below.
        </p>

        {profile && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem" }}>
            <div>
              <h3 style={{ margin: "0 0 0.25rem" }}>Profile Status</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                {profile.isActive ? "You are currently listed in the directory." : "Your profile is hidden from the directory."}
              </p>
            </div>
            <button 
              className={profile.isActive ? "mt-btn-outline" : "mt-btn-solid"} 
              style={{ width: "auto" }}
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
            >
              {profile.isActive ? "Pause Mentorship" : "Re-activate Profile"}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Areas of Expertise (Comma separated)</label>
            <input 
              required
              className="mt-input" 
              placeholder="e.g. Software Engineering, Resume Review, Product Management" 
              value={form.expertise}
              onChange={e => setForm({...form, expertise: e.target.value})}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Mentorship Bio</label>
            <textarea 
              required
              className="mt-input" 
              rows={4}
              placeholder="Briefly describe what you can help mentees with..." 
              value={form.bio}
              onChange={e => setForm({...form, bio: e.target.value})}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Availability</label>
              <input 
                required
                className="mt-input" 
                placeholder="e.g. Weekends only, or Mon/Wed 6PM-8PM EST" 
                value={form.availabilityText}
                onChange={e => setForm({...form, availabilityText: e.target.value})}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem" }}>Max Sessions / Month</label>
              <input 
                required
                type="number"
                min="1"
                className="mt-input" 
                value={form.maxSessionsPerMonth}
                onChange={e => setForm({...form, maxSessionsPerMonth: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <button type="submit" className="mt-btn-solid" style={{ width: "100%" }} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : profile ? "Update Profile" : "Join as Mentor"}
          </button>
        </form>
      </div>
    </div>
  );
}
