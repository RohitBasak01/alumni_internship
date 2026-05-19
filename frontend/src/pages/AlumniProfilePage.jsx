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
    customData: profile.customData ? (profile.customData instanceof Map ? Object.fromEntries(profile.customData) : profile.customData) : {}
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
  const showFriendship = tenant.featureFlags.enableFriendship !== false;
  const isEditMode = searchParams.get("mode") === "edit";
  const [form, setForm] = useState(emptyForm);
  const [skillInput, setSkillInput] = useState("");
  const [activeSection, setActiveSection] = useState(profileSections[0].id);
  const isAlumni = auth.user?.role === "alumni";

  const companyConfig = getFieldConfig("company", "optional");
  const designationConfig = getFieldConfig("designation", "optional");
  const eduConfig = getFieldConfig("currentEducation", "optional");
  const instConfig = getFieldConfig("currentInstitution", "optional");
  const countryConfig = getFieldConfig("country", "optional");
  const cityConfig = getFieldConfig("city", "optional");
  const customFields = (tenant?.profileFields || []).filter(f => !f.isStandard);

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
  const profileDepartment = profile?.department || (isSchool ? "School Community" : "Department pending");
  const leavingYear = profile?.leavingYear || "-";
  const lastClassAttended = profile?.lastClassAttended || "-";
  const currentEducation = profile?.currentEducation || "";
  const currentInstitution = profile?.currentInstitution || "";
  const occupation = profile?.occupation || "";
  const profileCompany = profile?.company || "Independent";
  const profileRole = profile?.designation || (isSchool ? "Community Member" : "Alumni Member");
  const profileIndustry = profile?.industry || "Not added yet";
  const profileLocation = buildLocationValue(profile?.country, profile?.state, profile?.city) || profile?.location || "Location not added";
  const profileBio = profile?.bio || (isSchool ? "Add a short introduction so other members of your school community can reconnect with you." : "Share what you are building, where you work, and what kind of community conversations you enjoy.");
  const displaySkills = skills.length ? skills : (showFriendship ? ["Profile", "Community", "Friendship"] : ["Profile", "Community", "Network"]);

  const connections = [
    { id: "1", name: "Sarah Chen", note: "Product leadership - Class of 2017" },
    { id: "2", name: "Marcus Miller", note: "Engineering manager - Class of 2019" },
    { id: "3", name: "Elena Rossi", note: "Founder network - Class of 2018" },
  ];

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    if (name === "country") {
      setForm(c => ({ ...c, country: value, state: "", city: "", location: buildLocationValue(value, "", "") }));
      return;
    }
    if (name === "state") {
      setForm(c => ({ ...c, state: value, city: "", location: buildLocationValue(c.country, value, "") }));
      return;
    }
    if (name === "city") {
      setForm(c => ({ ...c, city: value, location: buildLocationValue(c.country, c.state, value) }));
      return;
    }
    setForm(c => ({ ...c, [name]: type === "checkbox" ? checked : value }));
  }

  function handleCustomDataChange(key, value) {
    setForm((current) => ({
      ...current,
      customData: {
        ...(current.customData || {}),
        [key]: value
      }
    }));
  }

  function getFieldConfig(key, defaultVisibility = "optional") {
    const fields = tenant?.profileFields || [];
    const f = fields.find(field => field.fieldKey === key);
    if (!f) {
      return {
        required: defaultVisibility === "required",
        hidden: defaultVisibility === "hidden",
        label: ""
      };
    }
    const isProfileHidden = f.showInProfile !== undefined ? !f.showInProfile : f.visibility === "hidden";
    const isProfileRequired = f.showInRegistration === "required" || f.visibility === "required";
    return {
      required: isProfileRequired,
      hidden: isProfileHidden,
      label: f.label
    };
  }

  function handleSkillAdd(event) {
    event.preventDefault();
    const nextSkill = skillInput.trim();
    if (!nextSkill || skills.some(s => s.toLowerCase() === nextSkill.toLowerCase())) return;
    setForm(c => ({ ...c, skills: [...skills, nextSkill].join(", ") }));
    setSkillInput("");
  }

  function handleSkillRemove(skillToRemove) {
    setForm(c => ({ ...c, skills: skills.filter(s => s !== skillToRemove).join(", ") }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    updateMutation.mutate({ ...form, location: buildLocationValue(form.country, form.state, form.city), skills, customData: form.customData || {} });
  }

  function jumpToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (!element) return;
    setActiveSection(sectionId);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!isAlumni) {
    return (
      <div className="premium-card p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-6">lock</span>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-500">This area is for verified alumni members only.</p>
      </div>
    );
  }

  if (profileQuery.isLoading && !profileQuery.data) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isEditMode) {
    return (
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar Nav */}
        <aside className="lg:w-80 space-y-6">
          <div className="premium-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-brand-600 text-white flex items-center justify-center text-xl font-bold">
                {profileName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 truncate w-40">{profileName}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Member Editor</p>
              </div>
            </div>
            
            <div className="space-y-1">
              {profileSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => jumpToSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeSection === section.id 
                      ? "bg-brand-50 text-brand-600 shadow-sm" 
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs">
                    {section.icon}
                  </span>
                  {section.label}
                </button>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profile Strength</span>
                <span className="text-sm font-bold text-brand-600">{completionPercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-600 transition-all duration-500" style={{ width: `${completionPercent}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">{completion} of 6 essential fields completed.</p>
            </div>
          </div>
        </aside>

        {/* Main Editor Form */}
        <div className="flex-1">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-24 z-30">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
                <p className="text-sm text-slate-500">Updates will be visible to your community instantly.</p>
              </div>
              <div className="flex gap-3">
                <Link to="/portal/profile" className="btn-secondary py-2 px-6">Cancel</Link>
                <button disabled={updateMutation.isPending} type="submit" className="btn-primary py-2 px-6">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {updateMutation.isSuccess && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-sm font-bold flex gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                Profile updated successfully.
              </div>
            )}

            <div className="space-y-8">
              <section id="profile-info" className="premium-card p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-600">person</span>
                  Personal Identity
                </h3>
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Display Name</label>
                    <input name="name" onChange={handleChange} value={form.name} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Biography</label>
                    <textarea name="bio" onChange={handleChange} value={form.bio} rows="4" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" placeholder="Tell the community about yourself..." />
                  </div>
                </div>
              </section>

              <section id="experience" className="premium-card p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-600">work</span>
                  {isSchool ? "Current Journey" : "Professional Experience"}
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {isSchool ? (
                    <>
                      {!eduConfig.hidden && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">{eduConfig.label || "Current Education"}</label>
                          <input name="currentEducation" onChange={handleChange} value={form.currentEducation} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                        </div>
                      )}
                      {!instConfig.hidden && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">{instConfig.label || "Current Institution"}</label>
                          <input name="currentInstitution" onChange={handleChange} value={form.currentInstitution} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {!companyConfig.hidden && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">{companyConfig.label || "Company / Organization"}</label>
                          <input name="company" onChange={handleChange} value={form.company} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                        </div>
                      )}
                      {!designationConfig.hidden && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">{designationConfig.label || "Job Title / Designation"}</label>
                          <input name="designation" onChange={handleChange} value={form.designation} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                        </div>
                      )}
                    </>
                  )}
                  {!countryConfig.hidden && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">{countryConfig.label || "Country"}</label>
                      <select name="country" onChange={handleChange} value={form.country} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all">
                        <option value="">Select Country</option>
                        {(countriesQuery.data || []).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                  {!cityConfig.hidden && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">{cityConfig.label || "Location (City)"}</label>
                      <input name="city" onChange={handleChange} value={form.city} placeholder="e.g. New York" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                    </div>
                  )}
                </div>
              </section>

              {customFields.some(f => f.showInProfile !== undefined ? f.showInProfile : f.visibility !== "hidden") && (
                <section id="custom-fields" className="premium-card p-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-600">badge</span>
                    Institutional Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {customFields.map(field => {
                      const isVisible = field.showInProfile !== undefined ? field.showInProfile : field.visibility !== "hidden";
                      if (!isVisible) return null;
                      const value = form.customData?.[field.fieldKey] || "";
                      const isRequired = field.showInRegistration === "required" || field.visibility === "required";
                      return (
                        <div key={field.fieldKey} className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">
                            {field.label} {isRequired && <span className="text-red-500">*</span>}
                          </label>
                          {field.inputType === "select" ? (
                            <select
                              name={field.fieldKey}
                              onChange={(e) => handleCustomDataChange(field.fieldKey, e.target.value)}
                              required={isRequired}
                              value={value}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-slate-700"
                            >
                              <option value="">Select {field.label}</option>
                              {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : field.inputType === "date" ? (
                            <input
                              type="date"
                              name={field.fieldKey}
                              onChange={(e) => handleCustomDataChange(field.fieldKey, e.target.value)}
                              required={isRequired}
                              value={value}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-slate-700"
                            />
                          ) : field.inputType === "number" ? (
                            <input
                              type="number"
                              name={field.fieldKey}
                              onChange={(e) => handleCustomDataChange(field.fieldKey, e.target.value)}
                              required={isRequired}
                              value={value}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                            />
                          ) : (
                            <input
                              type="text"
                              name={field.fieldKey}
                              onChange={(e) => handleCustomDataChange(field.fieldKey, e.target.value)}
                              required={isRequired}
                              value={value}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section id="education" className="premium-card p-8 opacity-75 grayscale-[0.5]">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-600">school</span>
                    Academic Foundation
                  </h3>
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-lg">Verified Data</span>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
                    <p className="font-bold text-slate-900">{profileDepartment}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Graduation Year</p>
                    <p className="font-bold text-slate-900">{isSchool ? leavingYear : profileBatch}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Record Status</p>
                    <p className="font-bold text-green-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Active
                    </p>
                  </div>
                </div>
                <p className="mt-6 p-4 bg-slate-50 rounded-xl text-xs text-slate-500 leading-relaxed italic">
                  Academic details are synced from the institution's master database. To request changes, please contact the alumni relations office.
                </p>
              </section>

              <section id="privacy" className="premium-card p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-600">shield</span>
                  Privacy & Connectivity
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Profile Visibility</label>
                    <select name="profileVisibility" onChange={handleChange} value={form.profileVisibility} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all">
                      <option value="public">Global (Visible to all users)</option>
                      <option value="institute_only">Restricted (Members of my institution only)</option>
                      <option value="private">Private (Only visible to myself)</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                    <input type="checkbox" name="allowMentorRequests" checked={form.allowMentorRequests} onChange={handleChange} className="w-5 h-5 rounded-lg text-brand-600 focus:ring-brand-500" />
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">Enable Networking Requests</p>
                      <p className="text-xs text-slate-500">Allow other alumni to reach out for friendship or professional connections.</p>
                    </div>
                  </label>
                </div>
              </section>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Profile Hero Header */}
      <div className="premium-card overflow-hidden">
        <div className="h-48 bg-gradient-to-r from-brand-600 to-indigo-700 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        </div>
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 -mt-12">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="relative">
                <div className="h-40 w-40 rounded-[2.5rem] bg-white p-2 shadow-2xl ring-8 ring-white/40">
                  <div className="h-full w-full rounded-[2rem] bg-brand-600 text-white flex items-center justify-center text-5xl font-black shadow-inner">
                    {profileName.charAt(0)}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 h-10 w-10 bg-green-500 border-4 border-white rounded-full flex items-center justify-center shadow-lg" title="Active Member">
                  <span className="material-symbols-outlined text-white text-lg">check</span>
                </div>
              </div>
              
              <div className="space-y-2 md:pt-10">
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{profileName}</h1>
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-brand-50 text-brand-600 shadow-sm" title="Verified Member">
                    <span className="material-symbols-outlined text-lg font-bold">verified</span>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-slate-500 font-bold">
                  <p className="flex items-center gap-2 justify-center md:justify-start">
                    <span className="material-symbols-outlined text-base">school</span>
                    {isSchool ? `Class of ${leavingYear}` : `Batch ${profileBatch}`}
                  </p>
                  <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  <p className="flex items-center gap-2 justify-center md:justify-start text-brand-600">
                    <span className="material-symbols-outlined text-base">hub</span>
                    {auth.user?.institute?.name || tenant.displayName}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="md:pt-10">
              <Link to="/portal/profile?mode=edit" className="btn-primary flex items-center gap-2 shadow-xl px-8 py-4">
                <span className="material-symbols-outlined text-lg">edit</span>
                Update Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          <section className="premium-card p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Professional Bio</h3>
            <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">{profileBio}</p>
            
            <div className="mt-8 flex flex-wrap gap-2">
              {displaySkills.map(skill => (
                <span key={skill} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold border border-slate-100 hover:border-brand-200 hover:text-brand-600 transition-all cursor-default">
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section className="premium-card p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">Identity & Career</h3>
            <div className="grid md:grid-cols-2 gap-8">
              {!isSchool && (!companyConfig.hidden || !designationConfig.hidden) && (
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined">work</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Current Role</p>
                    <p className="font-bold text-slate-900">{profileRole}</p>
                    <p className="text-sm text-slate-500 font-semibold">{profileCompany}</p>
                  </div>
                </div>
              )}
              {isSchool && (!eduConfig.hidden || !instConfig.hidden) && (
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined">school</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Education</p>
                    <p className="font-bold text-slate-900">{currentEducation || "Student"}</p>
                    <p className="text-sm text-slate-500 font-semibold">{currentInstitution || auth.user?.institute?.name}</p>
                  </div>
                </div>
              )}
              {(!countryConfig.hidden || !cityConfig.hidden) && (
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Base Location</p>
                    <p className="font-bold text-slate-900">{profileLocation}</p>
                    <p className="text-sm text-slate-500 font-semibold">{profileIndustry}</p>
                  </div>
                </div>
              )}
            </div>

            {/* View Mode Custom Fields display */}
            {customFields.some(f => f.showInProfile !== undefined ? f.showInProfile : f.visibility !== "hidden") && (
              <div className="mt-8 pt-8 border-t border-slate-100 grid md:grid-cols-2 gap-6">
                {customFields.map(field => {
                  const isVisible = field.showInProfile !== undefined ? field.showInProfile : field.visibility !== "hidden";
                  if (!isVisible) return null;
                  const value = form.customData?.[field.fieldKey] || "Not provided";
                  return (
                    <div key={field.fieldKey} className="flex gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined">badge</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{field.label}</p>
                        <p className="font-bold text-slate-900">{value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Sidebar info */}
        <div className="space-y-8">
          <section className="premium-card p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Profile Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-sm font-bold text-slate-600">Visibility</span>
                <span className="text-xs font-black text-brand-600 uppercase bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                  {form.profileVisibility.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-sm font-bold text-slate-600">Requests</span>
                <span className={`text-xs font-black uppercase bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm ${form.allowMentorRequests ? 'text-green-600' : 'text-slate-400'}`}>
                  {form.allowMentorRequests ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </section>

          <section className="premium-card p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Suggested Peers</h3>
            <div className="space-y-4">
              {connections.map(person => (
                <div key={person.id} className="flex items-center gap-3 group cursor-pointer">
                  <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg group-hover:bg-brand-600 group-hover:text-white transition-all">
                    {person.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{person.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate">{person.note}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-brand-600 transition-colors">chevron_right</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors border-t border-slate-50">
              View All Directory
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AlumniProfilePage;
