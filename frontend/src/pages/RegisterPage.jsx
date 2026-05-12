import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import TenantPublicStatus from "../components/TenantPublicStatus.jsx";
import {
  clearOAuthSession,
  fetchCurrentTenantPublicProfile,
  fetchOAuthSession,
  fetchPublicInstitutes,
  getOAuthStartUrl,
  redirectToTenantPortal,
  submitAlumniRegistration
} from "../lib/api.js";
import { useTenantBranding } from "../hooks/useTenantBranding.js";
import { useTenantContext } from "../hooks/useTenantContext.js";
import { getTenantDisplayConfig } from "../utils/tenantDisplay.js";

const providerOptions = [
  { id: "google", label: "Continue with Google", tone: "light" },
  { id: "linkedin", label: "Continue with LinkedIn", tone: "brand" },
  { id: "email", label: "Continue with Email", tone: "neutral" }
];

const initialForm = {
  authProvider: "google",
  email: "",
  firstName: "",
  lastName: "",
  gender: "prefer_not_to_disclose",
  dateOfBirth: "",
  mobileNumber: "",
  currentCountry: "",
  currentCity: "",
  instituteId: "",
  batch: "",
  department: "",
  section: "",
  currentEducation: "",
  currentInstitution: "",
  occupation: "",
  company: "",
  designation: "",
  termsAccepted: false
};

function buildDateOfBirth(form) {
  if (!form.dateOfBirth) return "";
  const date = new Date(form.dateOfBirth + "T00:00:00Z");
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function RegisterPage() {
  const navigate = useNavigate();
  const tenant = useTenantContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProvider = providerOptions.some((option) => option.id === searchParams.get("provider"))
    ? searchParams.get("provider")
    : "google";
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...initialForm, authProvider: initialProvider });

  const oauthStatus = searchParams.get("oauth");
  const oauthError = searchParams.get("error");
  const oauthSource = searchParams.get("source");

  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  useEffect(() => {
    fetch("https://countriesnow.space/api/v0.1/countries")
      .then(res => res.json())
      .then(result => {
        if (!result.error) {
          const sorted = result.data.map(c => c.country).sort();
          setCountries(sorted);
        }
      })
      .catch(err => console.error("Error fetching countries:", err));
  }, []);

  useEffect(() => {
    if (!form.currentCountry) {
      setCities([]);
      return;
    }

    fetch("https://countriesnow.space/api/v0.1/countries/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: form.currentCountry })
    })
      .then(res => res.json())
      .then(result => {
        if (!result.error) {
          setCities(result.data.sort());
        }
      })
      .catch(err => console.error("Error fetching cities:", err));
  }, [form.currentCountry]);

  async function handleAutoDetectLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const data = await res.json();
          
          if (data.countryName) {
            setForm(curr => ({
              ...curr,
              currentCountry: data.countryName,
              currentCity: data.city || data.locality || ""
            }));
          }
        } catch (err) {
          console.error("Error reverse geocoding:", err);
          alert("Could not detect location. Please select manually.");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setIsDetectingLocation(false);
        alert("Location access denied or unavailable. Please select manually.");
      }
    );
  }

  const institutesQuery = useQuery({
    queryKey: ["public-institutes"],
    queryFn: fetchPublicInstitutes,
    enabled: !tenant.isTenant
  });

  const currentTenantQuery = useQuery({
    queryKey: ["tenant-public-profile", tenant.slug],
    queryFn: fetchCurrentTenantPublicProfile,
    enabled: tenant.isTenant
  });

  const oauthSessionQuery = useQuery({
    queryKey: ["oauth-session"],
    queryFn: fetchOAuthSession,
    retry: false
  });

  const clearOAuthMutation = useMutation({
    mutationFn: clearOAuthSession
  });

  const selectedInstitute = useMemo(() => {
    if (tenant.isTenant) {
      return currentTenantQuery.data || null;
    }

    return institutesQuery.data?.find((item) => item._id === form.instituteId) || null;
  }, [tenant.isTenant, currentTenantQuery.data, form.instituteId, institutesQuery.data]);
  const tenantDisplay = useMemo(
    () =>
      getTenantDisplayConfig({
        institutionType: selectedInstitute?.institutionType || "college",
        communityLabels: selectedInstitute?.communityLabels
      }),
    [selectedInstitute]
  );
  const isSchool = tenantDisplay.isSchool;
  const selectedDepartmentStreams = useMemo(() => {
    const departmentStreams = selectedInstitute?.departmentStreams;
    if (!departmentStreams || typeof departmentStreams !== "object") {
      return [];
    }

    return Array.isArray(departmentStreams[form.department]) ? departmentStreams[form.department] : [];
  }, [selectedInstitute, form.department]);
  useTenantBranding(selectedInstitute?.branding, tenant.isTenant);
  const oauthSession = oauthSessionQuery.data?.oauthSession || null;
  const hasConnectedSocialProvider = Boolean(
    oauthSession && (oauthSession.provider === "google" || oauthSession.provider === "linkedin")
  );
  const activeProviderIsConnectedSocial = hasConnectedSocialProvider && oauthSession.provider === form.authProvider;
  const tenantStatus = currentTenantQuery.error?.data?.details?.portalStatus || null;
  const tenantName = currentTenantQuery.error?.data?.details?.instituteName || "";

  const mutation = useMutation({
    mutationFn: submitAlumniRegistration,
    onSuccess: () => {
      setStep(3);
    }
  });

  useEffect(() => {
    if (!oauthSession) {
      return;
    }

    const [firstName = "", ...restNames] = (oauthSession.name || "").split(" ");
    const lastName = oauthSession.lastName || restNames.join(" ");

    setForm((current) => ({
      ...current,
      authProvider: oauthSession.provider || current.authProvider,
      email: oauthSession.email || current.email,
      firstName: oauthSession.firstName || firstName || current.firstName,
      lastName: lastName || current.lastName
    }));
    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params);
      if (oauthSession.provider) {
        nextParams.set("provider", oauthSession.provider);
      }
      return nextParams;
    });
  }, [oauthSession, setSearchParams]);

  useEffect(() => {
    if (!tenant.isTenant || !currentTenantQuery.data?._id) {
      return;
    }

    setForm((current) => ({
      ...current,
      instituteId: currentTenantQuery.data._id
    }));
  }, [tenant.isTenant, currentTenantQuery.data]);

  function updateProvider(nextProvider) {
    if (nextProvider === "google" || nextProvider === "linkedin") {
      window.location.assign(getOAuthStartUrl(nextProvider, { mode: "register" }));
      return;
    }

    setForm((current) => ({ ...current, authProvider: nextProvider }));
    setSearchParams({ provider: nextProvider });
    if (hasConnectedSocialProvider) {
      clearOAuthMutation.mutate();
    }
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function goToStepTwo(event) {
    event.preventDefault();
    setStep(2);
  }

  function handleSubmit(event) {
    event.preventDefault();

    mutation.mutate({
      authProvider: form.authProvider,
      instituteId: form.instituteId,
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      gender: form.gender,
      dateOfBirth: buildDateOfBirth(form),
      mobileNumber: form.mobileNumber,
      currentCountry: form.currentCountry,
      currentCity: form.currentCity,
      batch: form.batch,
      department: form.department,
      section: form.section,
      currentEducation: form.currentEducation,
      currentInstitution: form.currentInstitution,
      occupation: form.occupation,
      company: form.company,
      designation: form.designation,
      termsAccepted: form.termsAccepted
    });
  }

  if (tenant.isTenant && currentTenantQuery.isError) {
    return (
      <TenantPublicStatus
        status={tenantStatus || "not-found"}
        instituteName={tenantName}
        showBackHome={false}
      />
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-brand-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-8 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>

        <div className="glass-card max-w-2xl w-full p-12 text-center space-y-8 relative z-10">
          <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900">Application Submitted</h1>
            <p className="text-slate-500 font-medium leading-relaxed">
              Your registration request for <span className="text-brand-600 font-bold">{selectedInstitute?.name}</span> is now in review. 
              The {tenantDisplay.adminLabel.toLowerCase()} will verify your details soon.
            </p>
          </div>

          <div className="grid gap-4 text-left bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
            {[
              { title: "Verification", desc: tenantDisplay.approvalSummary, icon: "verified" },
              { title: "Password Setup", desc: "Once approved, we'll send a secure activation link to your email.", icon: "mail" },
              { title: "Portal Access", desc: "After setup, you can access all community features and networking.", icon: "hub" }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-brand-600">
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-500 leading-normal">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button onClick={() => navigate("/login")} className="btn-primary flex-1 py-4">Back to Login</button>
            <Link to="/" className="btn-secondary flex-1 py-4">Return Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-[1fr_1.5fr] gap-8 relative z-10">
        {/* Left: Progress & Info */}
        <div className="hidden lg:flex flex-col justify-between p-8">
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-12 w-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                <span className="material-symbols-outlined text-2xl">school</span>
              </div>
              <span className="text-2xl font-black text-slate-900 tracking-tight">AlumniConnect</span>
            </Link>

            <div className="space-y-2">
              <h1 className="text-4xl font-black text-slate-900 leading-tight">Join Your Global Community.</h1>
              <p className="text-lg text-slate-500 font-medium">{tenantDisplay.onboardingLead}</p>
            </div>

            <div className="space-y-4 pt-8">
              {[
                { step: 1, label: "Identity Details", desc: "Basic contact information", active: step === 1, complete: step > 1 },
                { step: 2, label: "Institution Records", desc: tenantDisplay.profileStepSummary, active: step === 2, complete: step > 2 }
              ].map((s) => (
                <div key={s.step} className={`flex gap-4 items-center p-4 rounded-3xl transition-all ${s.active ? 'bg-white shadow-xl shadow-slate-200/50 scale-105 border border-slate-100' : 'opacity-60'}`}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${s.complete ? 'bg-green-500 text-white' : s.active ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {s.complete ? <span className="material-symbols-outlined">check</span> : s.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-none mb-1">{s.label}</h4>
                    <p className="text-xs text-slate-500 font-medium">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-brand-50 p-6 rounded-3xl border border-brand-100 space-y-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-brand-600">verified_user</span>
              <p className="text-sm font-bold text-brand-900 leading-tight">Admin-Controlled Approval</p>
            </div>
            <p className="text-xs text-brand-700 font-medium leading-relaxed italic">
              "Your privacy is our priority. Every registration is manually verified by the institution to maintain a trusted network."
            </p>
          </div>
        </div>

        {/* Right: Registration Form Card */}
        <div className="glass-card p-8 lg:p-12 rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
          <div className="mb-10">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Step {step} of 2</p>
            <h2 className="text-3xl font-bold text-slate-900">{step === 1 ? tenantDisplay.identityTitle : tenantDisplay.historyTitle}</h2>
          </div>

          <div className="space-y-8">
            {/* Social Grid */}
            <div className="grid grid-cols-3 gap-4">
              {providerOptions.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => updateProvider(provider.id)}
                  className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-all ${
                    form.authProvider === provider.id 
                    ? "bg-brand-50 border-brand-200 ring-4 ring-brand-50" 
                    : "bg-white border-slate-100 hover:border-brand-200 hover:bg-slate-50"
                  }`}
                >
                  <img src={
                    provider.id === 'google' ? 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' :
                    provider.id === 'linkedin' ? 'https://cdn-icons-png.flaticon.com/512/174/174857.png' :
                    'https://cdn-icons-png.flaticon.com/512/561/561127.png'
                  } className="w-6 h-6" alt={provider.label} />
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{provider.id}</span>
                </button>
              ))}
            </div>

            {oauthError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold">{oauthError}</div>}
            
            {activeProviderIsConnectedSocial && (
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl text-xs font-bold flex gap-2">
                <span className="material-symbols-outlined text-sm">link</span>
                Profile verified via {form.authProvider}. Essential details pre-filled.
              </div>
            )}

            {step === 1 ? (
              <form className="space-y-6" onSubmit={goToStepTwo}>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                    <input disabled={activeProviderIsConnectedSocial} name="email" onChange={handleChange} placeholder="name@university.edu" required type="email" value={form.email} className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">First Name</label>
                    <input disabled={activeProviderIsConnectedSocial} name="firstName" onChange={handleChange} placeholder="First Name" required value={form.firstName} className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Last Name</label>
                    <input disabled={activeProviderIsConnectedSocial} name="lastName" onChange={handleChange} placeholder="Last Name" required value={form.lastName} className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder:text-slate-400" />
                  </div>
                  
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Date of Birth</label>
                    <input name="dateOfBirth" onChange={handleChange} required type="date" value={form.dateOfBirth} max={new Date().toISOString().split("T")[0]} className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-slate-700" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Mobile Number</label>
                    <input name="mobileNumber" onChange={handleChange} placeholder="Phone" required value={form.mobileNumber} className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder:text-slate-400" />
                  </div>
                  <div className="sm:col-span-2 space-y-3">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-sm font-bold text-slate-700">Location</label>
                      <button
                        type="button"
                        onClick={handleAutoDetectLocation}
                        disabled={isDetectingLocation}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isDetectingLocation ? "sync" : "my_location"}
                        </span>
                        {isDetectingLocation ? "Detecting..." : "Auto-detect"}
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Country</span>
                        <select
                          name="currentCountry"
                          onChange={handleChange}
                          required
                          value={form.currentCountry}
                          className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                        >
                          <option value="">Select Country</option>
                          {countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">City</span>
                        {cities.length > 0 ? (
                          <select
                            name="currentCity"
                            onChange={handleChange}
                            required
                            value={form.currentCity}
                            className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                          >
                            <option value="">Select City</option>
                            {cities.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input
                            name="currentCity"
                            onChange={handleChange}
                            placeholder="Type city name"
                            required
                            value={form.currentCity}
                            className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder:text-slate-400"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <Link to="/login" className="btn-secondary flex-1 py-4">Cancel</Link>
                  <button type="submit" className="btn-primary flex-1 py-4">Continue</button>
                </div>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Institute</label>
                    {tenant.isTenant ? (
                      <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-600 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        {selectedInstitute?.name}
                      </div>
                    ) : (
                      <select name="instituteId" onChange={handleChange} required value={form.instituteId} className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all">
                        <option value="">Select Institute</option>
                        {(institutesQuery.data || []).map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                      </select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">{tenantDisplay.yearLabel}</label>
                    <input name="batch" onChange={handleChange} placeholder="YYYY" required type="number" value={form.batch} className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">{tenantDisplay.educationLabel}</label>
                    {selectedInstitute?.departments?.length > 0 ? (
                      <select name="department" onChange={handleChange} required value={form.department} className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all">
                        <option value="">Select {tenantDisplay.educationLabel}</option>
                        {selectedInstitute.departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    ) : (
                      <input name="department" onChange={handleChange} placeholder="e.g. Engineering" required value={form.department} className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder:text-slate-400" />
                    )}
                  </div>

                  {!isSchool && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Stream</label>
                      {selectedDepartmentStreams.length > 0 ? (
                        <select name="section" onChange={handleChange} required value={form.section} className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all">
                          <option value="">Select Stream</option>
                          {selectedDepartmentStreams.map((stream) => <option key={stream} value={stream}>{stream}</option>)}
                        </select>
                      ) : (
                        <input name="section" onChange={handleChange} placeholder="Stream / Section" required value={form.section} className="w-full px-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder:text-slate-400" />
                      )}
                    </div>
                  )}

                  {isSchool ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Section</label>
                        <input name="section" onChange={handleChange} placeholder="A / B / C" value={form.section} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Current Occupation</label>
                        <input name="occupation" onChange={handleChange} placeholder="Your role" value={form.occupation} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Company</label>
                        <input name="company" onChange={handleChange} placeholder="Current place of work" value={form.company} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Designation</label>
                        <input name="designation" onChange={handleChange} placeholder="Job Title" value={form.designation} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
                      </div>
                    </>
                  )}
                </div>

                <label className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 cursor-pointer group">
                  <input
                    checked={form.termsAccepted}
                    name="termsAccepted"
                    onChange={handleChange}
                    type="checkbox"
                    className="mt-1 flex-shrink-0 cursor-pointer accent-brand-600"
                    style={{ width: '20px', height: '20px', minWidth: '20px' }}
                  />
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
                    I agree to the Terms of Use and understand that my account will only be activated after institute admin approval.
                  </span>
                </label>

                {mutation.isError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold">{mutation.error.message}</div>}

                <div className="flex gap-4 pt-6">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-4">Back</button>
                  <button
                    disabled={mutation.isPending || institutesQuery.isLoading || (tenant.isTenant && (currentTenantQuery.isLoading || !form.instituteId))}
                    type="submit"
                    className="btn-primary flex-1 py-4"
                  >
                    {mutation.isPending ? "Submitting..." : "Create Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
