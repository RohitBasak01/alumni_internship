import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchMyAlumniProfile, updateMyAlumniProfile } from "../lib/api.js";

const emptyForm = {
  name: "",
  company: "",
  designation: "",
  location: "",
  industry: "",
  bio: "",
  skills: "",
  linkedinUrl: "",
  websiteUrl: "",
  twitterHandle: ""
};

function getCompletion(profile) {
  return [
    profile.name,
    profile.company,
    profile.designation,
    profile.location,
    profile.bio,
    profile.skills
  ].filter((value) => String(value || "").trim().length > 0).length;
}

const profileSections = [
  { label: "Profile Info", icon: "PI", active: true },
  { label: "Experience", icon: "EX" },
  { label: "Education", icon: "ED" },
  { label: "Privacy", icon: "PR" }
];

const industryOptions = [
  "Information Technology",
  "Software",
  "Finance",
  "Consulting",
  "Healthcare",
  "Education",
  "Media",
  "Other"
];

function AlumniProfilePage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(emptyForm);
  const [skillInput, setSkillInput] = useState("");
  const isAlumni = auth.user?.role === "alumni";
  const isEditMode = searchParams.get("mode") === "edit";

  const profileQuery = useQuery({
    queryKey: ["my-alumni-profile"],
    queryFn: fetchMyAlumniProfile,
    enabled: isAlumni
  });

  useEffect(() => {
    if (profileQuery.data) {
      setForm(buildForm(profileQuery.data));
    }
  }, [profileQuery.data]);

  const updateMutation = useMutation({
    mutationFn: updateMyAlumniProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-alumni-profile"] });
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
    }
  });

  const completion = getCompletion(form);
  const completionPercent = Math.round((completion / 6) * 100);
  const skills = useMemo(
    () =>
      form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
    [form.skills]
  );
  const profile = profileQuery.data;
  const profileName = profile?.name || auth.user?.name || "Alex Rivera";
  const profileBatch = profile?.batch || 2018;
  const profileDepartment = profile?.department || "Computer Science";
  const profileCompany = profile?.company || "Google Inc.";
  const profileRole = profile?.designation || "Senior Software Engineer";
  const profileIndustry = profile?.industry || "Technology & Software";
  const profileLocation = profile?.location || "San Francisco, CA";
  const profileBio =
    profile?.bio ||
    "Passionate software engineer focused on building scalable systems, mentoring peers, and staying connected with fellow alumni.";
  const profileLinks = [
    { label: "LinkedIn Profile", value: profile?.linkedinUrl || "" },
    { label: "Personal Portfolio", value: profile?.websiteUrl || "" },
    { label: "Twitter / X", value: profile?.twitterHandle || "" }
  ].filter((item) => item.value);
  const displayLinks = profileLinks.length
    ? profileLinks
    : [
        { label: "LinkedIn Profile", value: "#" },
        { label: "Personal Portfolio", value: "#" },
        { label: "Twitter / X", value: "#" }
      ];
  const displaySkills = skills.length
    ? skills
    : ["TypeScript", "Node.js", "React", "System Design", "Cloud Architecture"];
  const mutualConnections = [
    { id: "1", name: "Sarah Chen", batch: "Class of '17" },
    { id: "2", name: "Marcus Miller", batch: "Class of '19" },
    { id: "3", name: "Elena Rossi", batch: "Class of '18" },
    { id: "4", name: "James Wilson", batch: "Class of '16" }
  ];

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function syncSkills(nextSkills) {
    setForm((current) => ({ ...current, skills: nextSkills.join(", ") }));
  }

  function handleSkillAdd(event) {
    event.preventDefault();
    const nextSkill = skillInput.trim();
    if (!nextSkill || skills.some((skill) => skill.toLowerCase() === nextSkill.toLowerCase())) {
      return;
    }

    syncSkills([...skills, nextSkill]);
    setSkillInput("");
  }

  function handleSkillRemove(skillToRemove) {
    syncSkills(skills.filter((skill) => skill !== skillToRemove));
  }

  function handleSubmit(event) {
    event.preventDefault();
    updateMutation.mutate({
      ...form,
      skills
    });
  }

  if (!isAlumni) {
    return (
      <SectionCard title="My Profile" subtitle="Portal Access">
        <p className="muted">
          This page is for alumni users. Institute admins can manage accounts from the alumni directory.
        </p>
      </SectionCard>
    );
  }

  if (!isEditMode) {
    return (
      <div className="alumni-profile-view">
        <aside className="alumni-profile-view-sidebar">
          <section className="alumni-profile-hero-card">
            <div className="alumni-profile-hero-banner" />
            <div className="alumni-profile-hero-avatar" />
            <div className="alumni-profile-hero-body">
              <h1>{profileName}</h1>
              <p className="alumni-profile-hero-batch">Class of {profileBatch}</p>
              <p className="alumni-profile-hero-meta">
                B.S. {profileDepartment} • {auth.user?.institute?.name || "AlumNet University"}
              </p>
            </div>
            <div className="alumni-profile-hero-actions">
              <button className="button primary" type="button">
                Connect
              </button>
              <button className="button secondary" type="button">
                Message
              </button>
            </div>
          </section>

          <section className="alumni-profile-view-card">
            <h3>Professional Details</h3>
            <div className="alumni-profile-detail-list">
              <article>
                <span>Current Role</span>
                <strong>{profileRole}</strong>
                <p>{profileCompany}</p>
              </article>
              <article>
                <span>Industry</span>
                <strong>{profileIndustry}</strong>
              </article>
              <article>
                <span>Location</span>
                <strong>{profileLocation}</strong>
              </article>
            </div>
          </section>

          <section className="alumni-profile-view-card">
            <h3>Online Presence</h3>
            <div className="alumni-profile-link-stack">
              {displayLinks.map((item) => (
                <a
                  className="alumni-profile-link-pill"
                  href={item.value}
                  key={item.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </section>
        </aside>

        <div className="alumni-profile-view-main">
          <div className="alumni-profile-tab-bar">
            <button className="active" type="button">
              About
            </button>
            <button type="button">Experience</button>
            <button type="button">Education</button>
            <button type="button">Connections</button>
            <Link className="alumni-profile-edit-link" to="/portal/profile?mode=edit">
              Edit Profile
            </Link>
          </div>

          <section className="alumni-profile-content-card">
            <div className="alumni-profile-section-title">
              <span>AB</span>
              <h2>About</h2>
            </div>
            <p className="alumni-profile-about-copy">{profileBio}</p>
          </section>

          <section className="alumni-profile-content-card">
            <div className="alumni-profile-section-title">
              <span>ED</span>
              <h2>Education</h2>
            </div>
            <article className="alumni-profile-education-row">
              <div className="alumni-profile-education-icon">ED</div>
              <div>
                <h3>{auth.user?.institute?.name || "Stanford University"}</h3>
                <strong>B.S. in {profileDepartment}</strong>
                <p>2014 — {profileBatch}</p>
                <p>
                  Built a strong foundation in engineering, systems thinking, and collaborative
                  leadership through coursework and community projects.
                </p>
              </div>
            </article>
          </section>

          <section className="alumni-profile-content-card">
            <div className="alumni-profile-section-title">
              <span>SK</span>
              <h2>Skills & Expertise</h2>
            </div>
            <div className="alumni-profile-skills">
              {displaySkills.map((skill) => (
                <span className="alumni-profile-skill-pill" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section className="alumni-profile-content-card">
            <div className="alumni-profile-content-header">
              <div className="alumni-profile-section-title">
                <span>MC</span>
                <h2>Mutual Connections</h2>
              </div>
              <button className="alumni-profile-view-all" type="button">
                View All
              </button>
            </div>
            <div className="alumni-profile-mutuals">
              {mutualConnections.map((item) => (
                <article className="alumni-profile-mutual-card" key={item.id}>
                  <div className="alumni-profile-mutual-avatar">{item.name.slice(0, 1)}</div>
                  <strong>{item.name}</strong>
                  <span>{item.batch}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="alumni-edit-page">
      <aside className="alumni-edit-rail">
        {profileSections.map((section) => (
          <button
            key={section.label}
            className={section.active ? "alumni-edit-rail-link active" : "alumni-edit-rail-link"}
            type="button"
          >
            <span className="alumni-edit-rail-icon" aria-hidden="true">
              {section.icon}
            </span>
            <span>{section.label}</span>
          </button>
        ))}
      </aside>

      <form className="alumni-edit-content" onSubmit={handleSubmit}>
        <header className="alumni-edit-header">
          <div>
            <p className="alumni-edit-kicker">Alumni Profile Settings</p>
            <h1>Edit Profile</h1>
            <p>
              Keep your professional identity up to date so alumni can find and connect with you.
            </p>
          </div>

          <div className="alumni-edit-top-actions">
            <button className="button secondary compact" type="button">
              Alerts
            </button>
            <button className="button secondary compact" type="button">
              Settings
            </button>
            <button className="button primary compact" disabled={updateMutation.isPending} type="submit">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </header>

        {profileQuery.isLoading ? <p>Loading your profile...</p> : null}
        {profileQuery.isError ? <p className="error-text">{profileQuery.error.message}</p> : null}

        {profileQuery.data ? (
          <div className="alumni-edit-meta">
            <span>{profileQuery.data.email}</span>
            <span>Batch {profileQuery.data.batch}</span>
            <span>{profileQuery.data.department}</span>
            <strong>{completionPercent}% complete</strong>
          </div>
        ) : null}

        <section className="alumni-edit-card">
          <div className="alumni-edit-card-title">
            <span className="alumni-edit-card-icon">PI</span>
            <h2>Personal Information</h2>
          </div>

          <div className="alumni-edit-identity">
            <div className="alumni-edit-avatar-wrap">
              <div className="alumni-edit-avatar">
                <span>{(form.name || auth.user?.name || "A").slice(0, 1)}</span>
              </div>
              <button className="alumni-edit-avatar-button" type="button">
                +
              </button>
            </div>

            <div className="alumni-edit-form-grid">
              <label className="alumni-edit-field alumni-edit-field-full">
                <span>Full Name</span>
                <input name="name" onChange={handleChange} value={form.name} />
              </label>

              <label className="alumni-edit-field alumni-edit-field-full">
                <span>Bio</span>
                <textarea
                  className="textarea alumni-edit-textarea"
                  name="bio"
                  onChange={handleChange}
                  rows="4"
                  value={form.bio}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="alumni-edit-card">
          <div className="alumni-edit-card-title">
            <span className="alumni-edit-card-icon">PD</span>
            <h2>Professional Details</h2>
          </div>

          <div className="alumni-edit-form-grid alumni-edit-form-grid-two">
            <label className="alumni-edit-field">
              <span>Current Company</span>
              <input name="company" onChange={handleChange} value={form.company} />
            </label>

            <label className="alumni-edit-field">
              <span>Job Title</span>
              <input name="designation" onChange={handleChange} value={form.designation} />
            </label>

            <label className="alumni-edit-field">
              <span>Industry</span>
              <select name="industry" onChange={handleChange} value={form.industry}>
                <option value="">Select an industry</option>
                {industryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="alumni-edit-field">
              <span>Location</span>
              <input name="location" onChange={handleChange} value={form.location} />
            </label>
          </div>
        </section>

        <section className="alumni-edit-card">
          <div className="alumni-edit-card-title">
            <span className="alumni-edit-card-icon">SK</span>
            <h2>Professional Skills</h2>
          </div>

          <div className="alumni-edit-skill-list">
            {skills.map((skill) => (
              <button
                className="alumni-edit-skill-chip"
                key={skill}
                onClick={() => handleSkillRemove(skill)}
                type="button"
              >
                <span>{skill}</span>
                <span aria-hidden="true">x</span>
              </button>
            ))}
          </div>

          <div className="alumni-edit-skill-entry">
            <input
              onChange={(event) => setSkillInput(event.target.value)}
              placeholder="Add a skill..."
              value={skillInput}
            />
            <button className="alumni-edit-add-button" onClick={handleSkillAdd} type="button">
              +
            </button>
          </div>
        </section>

        <section className="alumni-edit-card">
          <div className="alumni-edit-card-title">
            <span className="alumni-edit-card-icon">ON</span>
            <h2>Online Presence</h2>
          </div>

          <div className="alumni-edit-links">
            <label className="alumni-edit-link-row">
              <span className="alumni-edit-link-icon">IN</span>
              <input
                name="linkedinUrl"
                onChange={handleChange}
                placeholder="https://linkedin.com/in/yourprofile"
                value={form.linkedinUrl}
              />
            </label>

            <label className="alumni-edit-link-row">
              <span className="alumni-edit-link-icon">WB</span>
              <input
                name="websiteUrl"
                onChange={handleChange}
                placeholder="https://yourwebsite.dev"
                value={form.websiteUrl}
              />
            </label>

            <label className="alumni-edit-link-row">
              <span className="alumni-edit-link-icon">X</span>
              <input
                name="twitterHandle"
                onChange={handleChange}
                placeholder="X username"
                value={form.twitterHandle}
              />
            </label>
          </div>
        </section>

        {updateMutation.isSuccess ? (
          <p className="success-text">Profile updated successfully.</p>
        ) : null}
        {updateMutation.isError ? <p className="error-text">{updateMutation.error.message}</p> : null}

        <footer className="alumni-edit-footer">
          <button
            className="button secondary"
            onClick={() => {
              setForm(profileQuery.data ? buildForm(profileQuery.data) : emptyForm);
              setSkillInput("");
            }}
            type="button"
          >
            Cancel
          </button>
          <button className="button primary" disabled={updateMutation.isPending} type="submit">
            {updateMutation.isPending ? "Saving..." : "Save Profile Changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default AlumniProfilePage;

function buildForm(profile) {
  return {
    name: profile.name || "",
    company: profile.company || "",
    designation: profile.designation || "",
    location: profile.location || "",
    industry: profile.industry || "",
    bio: profile.bio || "",
    skills: (profile.skills || []).join(", "),
    linkedinUrl: profile.linkedinUrl || "",
    websiteUrl: profile.websiteUrl || "",
    twitterHandle: profile.twitterHandle || ""
  };
}
