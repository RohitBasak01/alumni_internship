import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import SectionCard from "../components/SectionCard.jsx";
import {
  PortalMetricCard,
  PortalMetricGrid,
  PortalPageHeader,
} from "../components/PortalPrimitives.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import {
  fetchCitiesByState,
  fetchCountries,
  fetchMyAlumniProfile,
  fetchStatesByCountry,
  updateMyAlumniProfile,
} from "../lib/api.js";
import { getTenantDisplayConfig } from "../utils/tenantDisplay.js";

const emptyForm = {
  name: "",
  batch: "",
  department: "",
  leavingYear: "",
  lastClassAttended: "",
  section: "",
  currentEducation: "",
  currentInstitution: "",
  occupation: "",
  company: "",
  designation: "",
  country: "",
  state: "",
  city: "",
  location: "",
  industry: "",
  bio: "",
  skills: "",
  linkedinUrl: "",
  websiteUrl: "",
  twitterHandle: "",
  profileVisibility: "institute_only",
  showEmail: false,
  allowMentorRequests: true,
};

const industryOptions = [
  "Information Technology",
  "Software",
  "Finance",
  "Consulting",
  "Healthcare",
  "Education",
  "Media",
  "Other",
];

const profileSections = [
  { id: "profile-info", label: "Profile", icon: "PF" },
  { id: "experience", label: "Experience", icon: "EX" },
  { id: "education", label: "Education", icon: "ED" },
  { id: "privacy", label: "Privacy", icon: "PV" },
];

function getCompletion(profile) {
  return [
    profile.name,
    profile.company,
    profile.designation,
    profile.location,
    profile.bio,
    profile.skills,
  ].filter((value) => String(value || "").trim().length > 0).length;
}

function buildLocationValue(country, state, city) {
  return [city, state, country]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
}

function splitLegacyLocation(location) {
  const parts = String(location || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 3) {
    return {
      country: "",
      state: "",
      city: "",
    };
  }

  return {
    city: parts[0] || "",
    state: parts[1] || "",
    country: parts[2] || "",
  };
}

function buildForm(profile) {
  const parsedLocation = splitLegacyLocation(profile.location);
  const country = profile.country || parsedLocation.country;
  const state = profile.state || parsedLocation.state;
  const city = profile.city || parsedLocation.city;

  return {
    name: profile.name || "",
    batch: profile.batch || "",
    department: profile.department || "",
    leavingYear: profile.leavingYear || "",
    lastClassAttended: profile.lastClassAttended || "",
    section: profile.section || "",
    currentEducation: profile.currentEducation || "",
    currentInstitution: profile.currentInstitution || "",
    occupation: profile.occupation || "",
    company: profile.company || "",
    designation: profile.designation || "",
    country,
    state,
    city,
    location:
      buildLocationValue(country, state, city) || profile.location || "",
    industry: profile.industry || "",
    bio: profile.bio || "",
    skills: (profile.skills || []).join(", "),
    linkedinUrl: profile.linkedinUrl || "",
    websiteUrl: profile.websiteUrl || "",
    twitterHandle: profile.twitterHandle || "",
    profileVisibility: profile.profileVisibility || "institute_only",
    showEmail: profile.showEmail ?? false,
    allowMentorRequests: profile.allowMentorRequests ?? true,
  };
}

function AlumniProfilePage() {
  const auth = useAuth();
  const tenant = useTenantContext();
  const tenantDisplay = getTenantDisplayConfig(tenant);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isSchool = tenantDisplay.isSchool;
  const showCareerFields = tenant.featureFlags.enableCareerFields;
  const showSocialLinks = tenant.featureFlags.enableSocialLinks;
  const showMentorship = tenant.featureFlags.enableMentorship !== false;
  const isEditMode = searchParams.get("mode") === "edit";
  const [form, setForm] = useState(emptyForm);
  const [skillInput, setSkillInput] = useState("");
  const [activeSection, setActiveSection] = useState(profileSections[0].id);
  const isAlumni = auth.user?.role === "alumni";

  const profileQuery = useQuery({
    queryKey: ["my-alumni-profile"],
    queryFn: fetchMyAlumniProfile,
    enabled: isAlumni,
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
    },
  });

  const countriesQuery = useQuery({
    queryKey: ["location-countries"],
    queryFn: fetchCountries,
    enabled: isAlumni,
  });

  const statesQuery = useQuery({
    queryKey: ["location-states", form.country],
    queryFn: () => fetchStatesByCountry(form.country),
    enabled: isAlumni && Boolean(form.country),
  });

  const citiesQuery = useQuery({
    queryKey: ["location-cities", form.country, form.state],
    queryFn: () => fetchCitiesByState(form.country, form.state),
    enabled: isAlumni && Boolean(form.country) && Boolean(form.state),
  });

  const skills = useMemo(
    () =>
      form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
    [form.skills],
  );

  const completion = getCompletion(form);
  const completionPercent = Math.round((completion / 6) * 100);
  const profile = profileQuery.data;
  const profileName = profile?.name || auth.user?.name || "Community Member";
  const profileBatch = profile?.batch || "-";
  const profileDepartment =
    profile?.department ||
    (isSchool ? "School Community" : "Department pending");
  const leavingYear = profile?.leavingYear || "-";
  const lastClassAttended = profile?.lastClassAttended || "-";
  const currentEducation = profile?.currentEducation || "";
  const currentInstitution = profile?.currentInstitution || "";
  const occupation = profile?.occupation || "";
  const profileCompany = profile?.company || "Independent";
  const profileRole =
    profile?.designation || (isSchool ? "Community Member" : "Alumni Member");
  const profileIndustry = profile?.industry || "Not added yet";
  const profileLocation =
    buildLocationValue(profile?.country, profile?.state, profile?.city) ||
    profile?.location ||
    "Location not added";
  const profileBio =
    profile?.bio ||
    (isSchool
      ? "Add a short introduction so other members of your school community can reconnect with you."
      : "Share what you are building, where you work, and what kind of community conversations you enjoy.");
  const links = [
    { label: "LinkedIn", value: profile?.linkedinUrl || "" },
    { label: "Website", value: profile?.websiteUrl || "" },
    { label: "Twitter / X", value: profile?.twitterHandle || "" },
  ].filter((item) => item.value);
  const displaySkills = skills.length
    ? skills
    : showMentorship
      ? ["Profile", "Community", "Mentorship"]
      : ["Profile", "Community", "Network"];
  const connections = [
    { id: "1", name: "Sarah Chen", note: "Product leadership - Class of 2017" },
    {
      id: "2",
      name: "Marcus Miller",
      note: "Engineering manager - Class of 2019",
    },
    { id: "3", name: "Elena Rossi", note: "Founder network - Class of 2018" },
  ];

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    if (name === "country") {
      setForm((current) => ({
        ...current,
        country: value,
        state: "",
        city: "",
        location: buildLocationValue(value, "", ""),
      }));
      return;
    }

    if (name === "state") {
      setForm((current) => ({
        ...current,
        state: value,
        city: "",
        location: buildLocationValue(current.country, value, ""),
      }));
      return;
    }

    if (name === "city") {
      setForm((current) => ({
        ...current,
        city: value,
        location: buildLocationValue(current.country, current.state, value),
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function syncSkills(nextSkills) {
    setForm((current) => ({ ...current, skills: nextSkills.join(", ") }));
  }

  function handleSkillAdd(event) {
    event.preventDefault();
    const nextSkill = skillInput.trim();

    if (
      !nextSkill ||
      skills.some((skill) => skill.toLowerCase() === nextSkill.toLowerCase())
    ) {
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
      location: buildLocationValue(form.country, form.state, form.city),
      skills,
    });
  }

  function jumpToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (!element) {
      return;
    }

    setActiveSection(sectionId);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!isAlumni) {
    return (
      <SectionCard title="My Profile" subtitle="Portal Access">
        <p className="muted">
          This page is for member accounts. Institution admins can manage
          records from the members directory.
        </p>
      </SectionCard>
    );
  }

  if (profileQuery.isLoading && !profileQuery.data) {
    return <p>Loading your profile...</p>;
  }

  if (isEditMode) {
    return (
      <div className="member-profile-editor">
        <aside className="member-profile-editor-rail">
          <div className="member-profile-editor-rail-copy">
            <p className="member-card-kicker">Profile editor</p>
            <h2>Keep your member identity current.</h2>
            <p>
              Update the details that help people discover you, understand your
              journey, and reach out with confidence.
            </p>
          </div>
          <nav
            className="member-profile-editor-nav"
            aria-label="Profile edit sections"
          >
            {profileSections.map((section) => (
              <button
                key={section.id}
                className={
                  activeSection === section.id
                    ? "member-profile-editor-link active"
                    : "member-profile-editor-link"
                }
                onClick={() => jumpToSection(section.id)}
                type="button"
              >
                <span>{section.icon}</span>
                <strong>{section.label}</strong>
              </button>
            ))}
          </nav>
          <div className="member-profile-editor-summary">
            <span>Profile completion</span>
            <strong>{completionPercent}%</strong>
            <p>{completion} of 6 key details filled in.</p>
          </div>
        </aside>

        <form className="member-profile-editor-body" onSubmit={handleSubmit}>
          <PortalPageHeader
            title="Edit profile"
            subtitle={`Every update improves how you appear across the ${tenantDisplay.memberPlural.toLowerCase()} network.`}
            actions={
              <div className="member-inline-actions">
                <Link className="button secondary" to="/portal/profile">
                  Back to profile
                </Link>
                <button
                  className="button primary"
                  disabled={updateMutation.isPending}
                  type="submit"
                >
                  {updateMutation.isPending ? "Saving..." : "Save changes"}
                </button>
              </div>
            }
          />

          {profileQuery.isError ? (
            <p className="error-text">{profileQuery.error.message}</p>
          ) : null}
          {updateMutation.isSuccess ? (
            <p className="success-text">Profile updated successfully.</p>
          ) : null}
          {updateMutation.isError ? (
            <p className="error-text">{updateMutation.error.message}</p>
          ) : null}

          <PortalMetricGrid>
            <PortalMetricCard
              title="Completion"
              value={completionPercent}
              valueSuffix="%"
              icon="CM"
            />
            <PortalMetricCard
              title="Visibility"
              value={form.profileVisibility.replaceAll("_", " ")}
              icon="VS"
            />
            <PortalMetricCard
              title={showMentorship ? "Mentorship" : "Access"}
              value={
                showMentorship
                  ? form.allowMentorRequests
                    ? "Open"
                    : "Paused"
                  : "Profile only"
              }
              icon="MT"
            />
          </PortalMetricGrid>

          <SectionCard
            title="Personal details"
            subtitle="How people recognize you"
            id="profile-info"
          >
            <div className="member-form-grid member-form-grid-two">
              <label className="member-form-field member-form-field-full">
                <span>Full name</span>
                <input name="name" onChange={handleChange} value={form.name} />
              </label>
              <label className="member-form-field member-form-field-full">
                <span>Bio</span>
                <textarea
                  className="textarea member-form-textarea"
                  name="bio"
                  onChange={handleChange}
                  rows="5"
                  value={form.bio}
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title={isSchool ? "Current journey" : "Professional details"}
            subtitle={`The details ${tenantDisplay.memberPlural.toLowerCase()} use when they search for you`}
            id="experience"
          >
            <div className="member-form-grid member-form-grid-two">
              {isSchool ? (
                <>
                  <label className="member-form-field">
                    <span>Current education</span>
                    <input
                      name="currentEducation"
                      onChange={handleChange}
                      value={form.currentEducation}
                    />
                  </label>
                  <label className="member-form-field">
                    <span>Current institution</span>
                    <input
                      name="currentInstitution"
                      onChange={handleChange}
                      value={form.currentInstitution}
                    />
                  </label>
                  <label className="member-form-field">
                    <span>Occupation</span>
                    <input
                      name="occupation"
                      onChange={handleChange}
                      value={form.occupation}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="member-form-field">
                    <span>Current company</span>
                    <input
                      name="company"
                      onChange={handleChange}
                      value={form.company}
                    />
                  </label>
                  <label className="member-form-field">
                    <span>Job title</span>
                    <input
                      name="designation"
                      onChange={handleChange}
                      value={form.designation}
                    />
                  </label>
                  <label className="member-form-field">
                    <span>Industry</span>
                    <select
                      name="industry"
                      onChange={handleChange}
                      value={form.industry}
                    >
                      <option value="">Select an industry</option>
                      {industryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label className="member-form-field">
                <span>Country</span>
                <select
                  name="country"
                  onChange={handleChange}
                  value={form.country}
                >
                  <option value="">Select a country</option>
                  {(countriesQuery.data || []).map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>

              <label className="member-form-field">
                <span>State</span>
                <select
                  disabled={!form.country || statesQuery.isLoading}
                  name="state"
                  onChange={handleChange}
                  value={form.state}
                >
                  <option value="">
                    {form.country ? "Select a state" : "Select country first"}
                  </option>
                  {(statesQuery.data || []).map((stateItem) => (
                    <option key={stateItem} value={stateItem}>
                      {stateItem}
                    </option>
                  ))}
                </select>
              </label>

              <label className="member-form-field">
                <span>City</span>
                <select
                  disabled={
                    !form.country || !form.state || citiesQuery.isLoading
                  }
                  name="city"
                  onChange={handleChange}
                  value={form.city}
                >
                  <option value="">
                    {form.state ? "Select a city" : "Select state first"}
                  </option>
                  {(citiesQuery.data || []).map((cityItem) => (
                    <option key={cityItem} value={cityItem}>
                      {cityItem}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Education record"
            subtitle="These are tied to your institute record"
            id="education"
          >
            <div className="member-form-grid member-form-grid-two">
              <label className="member-form-field">
                <span>Institute</span>
                <input
                  readOnly
                  value={
                    auth.user?.institute?.name ||
                    tenant.displayName ||
                    "Institute"
                  }
                />
              </label>
              <label className="member-form-field">
                <span>{isSchool ? "Last class attended" : "Department"}</span>
                <input
                  readOnly
                  value={isSchool ? lastClassAttended : profileDepartment}
                />
              </label>
              <label className="member-form-field">
                <span>{isSchool ? "Leaving year" : "Batch"}</span>
                <input readOnly value={isSchool ? leavingYear : profileBatch} />
              </label>
              <div className="member-note-card">
                <strong>Need a correction?</strong>
                <p>
                  Contact your institution admin if your academic record needs
                  an update. These fields are managed from your verified member
                  record.
                </p>
              </div>
            </div>
          </SectionCard>

          {showSocialLinks ? (
            <SectionCard
              title="Online presence"
              subtitle="Optional links that help people know more about you"
            >
              <div className="member-form-grid">
                <label className="member-form-field">
                  <span>LinkedIn</span>
                  <input
                    name="linkedinUrl"
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={form.linkedinUrl}
                  />
                </label>
                <label className="member-form-field">
                  <span>Website</span>
                  <input
                    name="websiteUrl"
                    onChange={handleChange}
                    placeholder="https://yourportfolio.dev"
                    value={form.websiteUrl}
                  />
                </label>
                <label className="member-form-field">
                  <span>Twitter / X</span>
                  <input
                    name="twitterHandle"
                    onChange={handleChange}
                    placeholder="@yourhandle"
                    value={form.twitterHandle}
                  />
                </label>
              </div>
            </SectionCard>
          ) : null}

          {showCareerFields ? (
            <SectionCard
              title="Skills"
              subtitle="Add keywords that improve discovery across the network"
            >
              <div className="member-skill-editor">
                <div className="member-skill-list">
                  {skills.map((skill) => (
                    <button
                      className="member-skill-chip"
                      key={skill}
                      onClick={() => handleSkillRemove(skill)}
                      type="button"
                    >
                      <span>{skill}</span>
                      <span aria-hidden="true">x</span>
                    </button>
                  ))}
                  {!skills.length ? (
                    <p className="muted">No skills added yet.</p>
                  ) : null}
                </div>
                <div className="member-skill-input-row">
                  <input
                    onChange={(event) => setSkillInput(event.target.value)}
                    placeholder="Add a skill"
                    value={skillInput}
                  />
                  <button
                    className="button secondary"
                    onClick={handleSkillAdd}
                    type="button"
                  >
                    Add skill
                  </button>
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Privacy and outreach"
            subtitle="Choose how visible and reachable you want to be"
            id="privacy"
          >
            <div className="member-form-grid">
              <label className="member-form-field member-form-field-full">
                <span>Profile visibility</span>
                <select
                  name="profileVisibility"
                  onChange={handleChange}
                  value={form.profileVisibility}
                >
                  <option value="public">Everyone on the platform</option>
                  <option value="institute_only">
                    Only members from my institute
                  </option>
                  <option value="private">Only me</option>
                </select>
              </label>
              <label className="member-toggle-row">
                <input
                  checked={form.showEmail}
                  name="showEmail"
                  onChange={handleChange}
                  type="checkbox"
                />
                <div>
                  <strong>Show my email on my profile</strong>
                  <p>
                    Let other members contact you directly from your profile
                    card.
                  </p>
                </div>
              </label>
              {showMentorship ? (
                <label className="member-toggle-row">
                  <input
                    checked={form.allowMentorRequests}
                    name="allowMentorRequests"
                    onChange={handleChange}
                    type="checkbox"
                  />
                  <div>
                    <strong>Allow mentorship and networking requests</strong>
                    <p>
                      Pause inbound requests anytime if you need to quiet your
                      inbox.
                    </p>
                  </div>
                </label>
              ) : null}
            </div>
          </SectionCard>
        </form>
      </div>
    );
  }

  return (
    <div className="member-profile-page">
      <PortalPageHeader
        title="My profile"
        subtitle={
          isSchool
            ? "Your verified identity across the school community."
            : "Your professional identity across the institute network."
        }
        actions={
          <Link className="button primary" to="/portal/profile?mode=edit">
            Edit profile
          </Link>
        }
      />

      <div className="member-profile-grid">
        <section className="member-profile-hero">
          <div className="member-profile-identity">
            <div className="member-profile-avatar">
              {profileName.slice(0, 1)}
            </div>
            <div>
              <p className="member-card-kicker">Verified member</p>
              <h2>{profileName}</h2>
              <p>
                {isSchool
                  ? `Leaving year ${leavingYear}`
                  : `Class of ${profileBatch}`}{" "}
                at {auth.user?.institute?.name || tenant.displayName}
              </p>
            </div>
          </div>
          <p className="member-profile-hero-role">
            {isSchool
              ? currentEducation || occupation || "Community member"
              : `${profileRole} at ${profileCompany}`}
          </p>
          <p className="member-profile-hero-location">{profileLocation}</p>
          <div className="member-profile-tags">
            <span>{isSchool ? lastClassAttended : profileDepartment}</span>
            <span>
              {isSchool
                ? currentInstitution || "Current journey pending"
                : profileIndustry}
            </span>
            <span>
              {showMentorship
                ? form.allowMentorRequests
                  ? "Open to mentorship"
                  : "Mentorship paused"
                : "Profile only"}
            </span>
          </div>
        </section>

        <PortalMetricGrid className="member-profile-metrics">
          <PortalMetricCard
            title="Completion"
            value={completionPercent}
            valueSuffix="%"
            icon="CM"
          />
          <PortalMetricCard
            title="Skills"
            value={displaySkills.length}
            icon="SK"
          />
          <PortalMetricCard
            title="Visibility"
            value={form.profileVisibility.replaceAll("_", " ")}
            icon="VS"
          />
        </PortalMetricGrid>
      </div>

      <div className="member-profile-content-grid">
        <SectionCard
          title="About"
          subtitle={`What ${tenantDisplay.memberPlural.toLowerCase()} should know about you`}
        >
          <p className="member-reading-copy">{profileBio}</p>
        </SectionCard>

        <SectionCard
          title={isSchool ? "Current snapshot" : "Professional snapshot"}
          subtitle="The quick version"
        >
          <div className="member-detail-stack">
            <article>
              <span>{isSchool ? "Current path" : "Current role"}</span>
              <strong>
                {isSchool
                  ? currentEducation || occupation || "Community member"
                  : profileRole}
              </strong>
              <p>
                {isSchool
                  ? currentInstitution || "Institution not added"
                  : profileCompany}
              </p>
            </article>
            <article>
              <span>{isSchool ? "Last class attended" : "Industry"}</span>
              <strong>{isSchool ? lastClassAttended : profileIndustry}</strong>
            </article>
            <article>
              <span>Location</span>
              <strong>{profileLocation}</strong>
            </article>
          </div>
        </SectionCard>

        <SectionCard title="Education" subtitle="Verified institute record">
          <div className="member-detail-stack">
            <article>
              <span>Institute</span>
              <strong>
                {auth.user?.institute?.name ||
                  tenant.displayName ||
                  "Institute"}
              </strong>
            </article>
            <article>
              <span>{isSchool ? "Last class attended" : "Department"}</span>
              <strong>
                {isSchool ? lastClassAttended : profileDepartment}
              </strong>
            </article>
            <article>
              <span>{isSchool ? "Leaving year" : "Graduation batch"}</span>
              <strong>{isSchool ? leavingYear : profileBatch}</strong>
            </article>
          </div>
        </SectionCard>

        <SectionCard
          title="Skills and expertise"
          subtitle="How people find you in the directory"
        >
          <div className="member-chip-cloud">
            {displaySkills.map((skill) => (
              <span className="member-chip-pill" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </SectionCard>

        {showSocialLinks ? (
          <SectionCard
            title="Online presence"
            subtitle="Optional profile links"
          >
            <div className="member-link-stack">
              {links.length ? (
                links.map((item) => (
                  <a
                    className="member-link-row"
                    href={item.value}
                    key={item.label}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <strong>{item.label}</strong>
                    <span>{item.value}</span>
                  </a>
                ))
              ) : (
                <p className="muted">No public links added yet.</p>
              )}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          title="Network"
          subtitle={`Suggested ${tenantDisplay.memberPlural.toLowerCase()} you may know`}
        >
          <div className="member-people-list">
            {connections.map((item) => (
              <article className="member-person-card" key={item.id}>
                <div className="member-person-avatar">
                  {item.name.slice(0, 1)}
                </div>
                <div className="member-person-copy">
                  <strong>{item.name}</strong>
                  <p>{item.note}</p>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default AlumniProfilePage;
