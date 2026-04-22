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
  birthMonth: "",
  birthDay: "",
  birthYear: "",
  mobileNumber: "",
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

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function buildDateOfBirth(form) {
  if (!form.birthMonth || !form.birthDay || !form.birthYear) {
    return "";
  }

  const monthIndex = months.findIndex((month) => month === form.birthMonth);
  if (monthIndex < 0) {
    return "";
  }

  const date = new Date(Date.UTC(Number(form.birthYear), monthIndex, Number(form.birthDay)));

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
      <div className="auth-shell">
        <section className="auth-grid auth-grid-compact">
          <aside className="auth-aside auth-aside-success">
            <p className="auth-eyebrow">Application submitted</p>
            <h1>Your registration request is now in review.</h1>
            <p className="auth-lead">
              The {tenantDisplay.adminLabel.toLowerCase()} will verify your details. After approval, a password setup link will be sent to <strong>{form.email}</strong>.
            </p>
          </aside>

          <section className="auth-panel">
            <div className="auth-panel-header">
              <p className="auth-panel-kicker">Next steps</p>
              <h2>We will take it from here</h2>
              <p>Your registration has been recorded successfully.</p>
            </div>

            <div className="auth-highlight-list compact">
              <article>
                <strong>1. Admin verification</strong>
                <span>{tenantDisplay.approvalSummary}</span>
              </article>
              <article>
                <strong>2. Password setup</strong>
                <span>Once approved, you will receive a secure email link to activate your account.</span>
              </article>
              <article>
                <strong>3. Portal access</strong>
                <span>After setting your password, you can sign in with email or your linked social provider.</span>
              </article>
            </div>

            <div className="auth-action-row">
              <button className="button primary auth-submit" onClick={() => navigate("/login")} type="button">
                Back to Login
              </button>
              <Link className="button secondary auth-submit" to="/">
                Return Home
              </Link>
            </div>
          </section>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <section className="auth-grid auth-grid-wide">
        <aside className="auth-aside">
          <p className="auth-eyebrow">Community onboarding</p>
          <h1>Create an account that your institution can trust.</h1>
          <p className="auth-lead">
            {tenantDisplay.onboardingLead}
          </p>

          <div className="auth-stepper">
            <div className={step === 1 ? "active" : "complete"}>
              <span>1</span>
              <div>
                <strong>Identity details</strong>
                <small>Basic contact information and verification method</small>
              </div>
            </div>
            <div className={step === 2 ? "active" : "pending"}>
              <span>2</span>
              <div>
                <strong>Institute details</strong>
                <small>{tenantDisplay.profileStepSummary}</small>
              </div>
            </div>
          </div>

          <div className="auth-highlight-list">
            <article>
              <strong>Admin-controlled approval</strong>
              <span>Registrations stay pending until your institution verifies your details.</span>
            </article>
            <article>
              <strong>Social login ready</strong>
              <span>Google and LinkedIn can prefill your identity and be linked for future login.</span>
            </article>
          </div>
        </aside>

        <section className="auth-panel auth-panel-wide">
          <div className="auth-panel-header">
            <p className="auth-panel-kicker">Registration</p>
            <h2>{step === 1 ? tenantDisplay.identityTitle : tenantDisplay.historyTitle}</h2>
            <p>
              {step === 1
                ? "Use a professional email identity and complete your basic details."
                : `Add the profile details your ${tenantDisplay.adminLabel.toLowerCase()} will use to approve your request.`}
            </p>
          </div>

          <div className="auth-social-grid auth-social-grid-tight">
            {providerOptions.map((provider) => (
              <button
                key={provider.id}
                className={`auth-provider auth-provider-${provider.tone} ${form.authProvider === provider.id ? "selected" : ""}`}
                onClick={() => updateProvider(provider.id)}
                type="button"
              >
                {provider.label}
              </button>
            ))}
          </div>

          {oauthError ? <p className="auth-alert auth-alert-danger">{oauthError}</p> : null}
          {oauthStatus === "connected" ? (
            <p className="auth-alert auth-alert-success">
              {oauthSource === "login"
                ? `Your ${form.authProvider} account is verified. Complete this form to request portal access.`
                : `Your ${form.authProvider} account is connected. Finish the form to submit your registration.`}
            </p>
          ) : null}
          {activeProviderIsConnectedSocial ? (
            <p className="auth-alert auth-alert-info">
              Your {form.authProvider} profile has been verified. Email and name are prefilled from the provider.
            </p>
          ) : form.authProvider !== "email" ? (
            <p className="auth-alert auth-alert-warning">
              Click the selected provider above to verify your identity before submitting the form.
            </p>
          ) : null}

          {step === 1 ? (
            <form className="auth-form-grid" onSubmit={goToStepTwo}>
              <label className="auth-field auth-field-full">
                <span>Email address</span>
                <input disabled={activeProviderIsConnectedSocial} name="email" onChange={handleChange} placeholder="name@university.edu" required type="email" value={form.email} />
                <small>This email becomes your login id after approval.</small>
              </label>

              <label className="auth-field">
                <span>First name</span>
                <input disabled={activeProviderIsConnectedSocial} name="firstName" onChange={handleChange} placeholder="First name" required value={form.firstName} />
              </label>

              <label className="auth-field">
                <span>Last name</span>
                <input disabled={activeProviderIsConnectedSocial} name="lastName" onChange={handleChange} placeholder="Last name" required value={form.lastName} />
              </label>

              <fieldset className="auth-choice-group auth-field-full">
                <legend>Gender</legend>
                <div>
                  {[
                    ["male", "Male"],
                    ["female", "Female"],
                    ["prefer_not_to_disclose", "Prefer not to disclose"]
                  ].map(([value, label]) => (
                    <label key={value}>
                      <input checked={form.gender === value} name="gender" onChange={handleChange} type="radio" value={value} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="auth-field">
                <span>Birth month</span>
                <select name="birthMonth" onChange={handleChange} required value={form.birthMonth}>
                  <option value="">Month</option>
                  {months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </label>

              <label className="auth-field">
                <span>Birth day</span>
                <input max="31" min="1" name="birthDay" onChange={handleChange} placeholder="DD" required type="number" value={form.birthDay} />
              </label>

              <label className="auth-field">
                <span>Birth year</span>
                <input max="2026" min="1940" name="birthYear" onChange={handleChange} placeholder="YYYY" required type="number" value={form.birthYear} />
              </label>

              <label className="auth-field">
                <span>Mobile number</span>
                <input name="mobileNumber" onChange={handleChange} placeholder="Enter mobile number" required value={form.mobileNumber} />
              </label>

              <label className="auth-field auth-field-span-2">
                <span>Current city</span>
                <input name="currentCity" onChange={handleChange} placeholder="Enter city" required value={form.currentCity} />
              </label>

              <div className="auth-action-row auth-field-full">
                <Link className="button secondary auth-submit" to="/login">Cancel</Link>
                <button className="button primary auth-submit" type="submit">Continue</button>
              </div>
            </form>
          ) : (
            <form className="auth-form-grid" onSubmit={handleSubmit}>
              <label className="auth-field auth-field-full">
                <span>Institute</span>
                {tenant.isTenant ? (
                  <input readOnly value={selectedInstitute?.name || "Institution portal"} />
                ) : (
                  <select name="instituteId" onChange={handleChange} required value={form.instituteId}>
                    <option value="">Select institute</option>
                    {(institutesQuery.data || []).map((institute) => (
                      <option key={institute._id} value={institute._id}>{institute.name}</option>
                    ))}
                  </select>
                )}
              </label>

              {!tenant.isTenant && selectedInstitute ? (
                <p className="auth-alert auth-alert-info auth-field-full">
                  Prefer the institution portal experience?{" "}
                  <button
                    className="auth-inline-button"
                    onClick={() =>
                      redirectToTenantPortal(
                        selectedInstitute,
                        `/register?provider=${encodeURIComponent(form.authProvider)}`,
                      )
                    }
                    type="button"
                  >
                    Continue on {selectedInstitute.name}
                  </button>
                </p>
              ) : null}

              <label className="auth-field">
                <span>{tenantDisplay.yearLabel}</span>
                <input max="2100" min="1900" name="batch" onChange={handleChange} placeholder={`Enter ${tenantDisplay.yearLabel.toLowerCase()}`} required type="number" value={form.batch} />
              </label>

              <label className="auth-field auth-field-span-2">
                <span>{tenantDisplay.educationLabel}</span>
                <input name="department" onChange={handleChange} placeholder={`Enter ${tenantDisplay.educationLabel.toLowerCase()}`} required value={form.department} />
              </label>

              {isSchool ? (
                <>
                  <label className="auth-field">
                    <span>Section</span>
                    <input name="section" onChange={handleChange} placeholder="Section / House" value={form.section} />
                  </label>
                  <label className="auth-field auth-field-span-2">
                    <span>Current education</span>
                    <input name="currentEducation" onChange={handleChange} placeholder="Current education" value={form.currentEducation} />
                  </label>
                  <label className="auth-field auth-field-span-2">
                    <span>Current institution</span>
                    <input name="currentInstitution" onChange={handleChange} placeholder="Current institution" value={form.currentInstitution} />
                  </label>
                  <label className="auth-field auth-field-span-2">
                    <span>Occupation</span>
                    <input name="occupation" onChange={handleChange} placeholder="Occupation" value={form.occupation} />
                  </label>
                </>
              ) : (
                <>
                  <label className="auth-field">
                    <span>Company</span>
                    <input name="company" onChange={handleChange} placeholder="Company" value={form.company} />
                  </label>
                  <label className="auth-field auth-field-span-2">
                    <span>Designation</span>
                    <input name="designation" onChange={handleChange} placeholder="Designation" value={form.designation} />
                  </label>
                </>
              )}

              <label className="auth-checkbox auth-checkbox-panel auth-field-full">
                <input checked={form.termsAccepted} name="termsAccepted" onChange={handleChange} type="checkbox" />
                <span>
                  I agree to the Terms of Use and understand that my account will only be activated after institute admin approval.
                </span>
              </label>

              {mutation.isError ? <p className="auth-alert auth-alert-danger auth-field-full">{mutation.error.message}</p> : null}
              {institutesQuery.isError ? <p className="auth-alert auth-alert-danger auth-field-full">{institutesQuery.error.message}</p> : null}
              {currentTenantQuery.isError ? <p className="auth-alert auth-alert-danger auth-field-full">{currentTenantQuery.error.message}</p> : null}
              {oauthSessionQuery.isError ? <p className="auth-alert auth-alert-danger auth-field-full">{oauthSessionQuery.error.message}</p> : null}

              <div className="auth-action-row auth-field-full">
                <button className="button secondary auth-submit" onClick={() => setStep(1)} type="button">Back</button>
                <button
                  className="button primary auth-submit"
                  disabled={
                    mutation.isPending ||
                    institutesQuery.isLoading ||
                    (tenant.isTenant && (currentTenantQuery.isLoading || !form.instituteId))
                  }
                  type="submit"
                >
                  {mutation.isPending ? "Submitting..." : "Create Account"}
                </button>
              </div>
            </form>
          )}
        </section>
      </section>
    </div>
  );
}

export default RegisterPage;
