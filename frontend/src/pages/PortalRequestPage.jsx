import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { fetchPortalOnboardingDraft, savePortalOnboardingDraft, submitPortalOnboarding } from "../lib/api.js";

const initialState = {
  name: "",
  institutionType: "college",
  educationLevel: "higher_ed",
  subdomain: "",
  domain: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  website: "",
  bio: "",
  branding: {
    logoUrl: "",
    primaryColor: "#2554d8",
    secondaryColor: "#163795",
    accentColor: "#eef3ff",
    tagline: ""
  }
};

const LAST_DRAFT_KEY = "portalOnboardingDraftId";
const TOTAL_STEPS = 4;
const STEP_LABELS = ["Institution", "Branding", "Admin", "Review"];

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isValidSubdomain(value) {
  return /^[a-z0-9-]{3,40}$/.test(String(value || "").trim());
}

function isValidHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || "").trim());
}

function PortalRequestPage() {
  const [form, setForm] = useState(initialState);
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [stepErrors, setStepErrors] = useState({});
  const [completedSteps, setCompletedSteps] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const latestFormRef = useRef(form);
  const latestStepRef = useRef(step);

  const submitMutation = useMutation({
    mutationFn: submitPortalOnboarding
  });
  const saveDraftMutation = useMutation({
    mutationFn: savePortalOnboardingDraft,
    onSuccess: (data) => {
      const nextDraftId = String(data?.draftId || "").trim();
      if (nextDraftId) {
        setDraftId(nextDraftId);
        window.localStorage.setItem(LAST_DRAFT_KEY, nextDraftId);
      }
      setDraftStatus("Draft saved");
    }
  });

  const isSchool = form.institutionType === "school";
  const stepTitle = useMemo(() => {
    if (step === 1) return "Institution Details";
    if (step === 2) return "Portal Branding";
    if (step === 3) return "Primary Administrator";
    return "Review & Submit";
  }, [step]);
  const reviewPortalUrl = form.subdomain ? `${form.subdomain}.alumnet.com` : "-";

  useEffect(() => {
    latestFormRef.current = form;
  }, [form]);

  useEffect(() => {
    latestStepRef.current = step;
  }, [step]);

  useEffect(() => {
    async function loadExistingDraft() {
      try {
        const lastDraftId = String(window.localStorage.getItem(LAST_DRAFT_KEY) || "").trim();
        if (!lastDraftId) return;
        const draft = await fetchPortalOnboardingDraft(lastDraftId);
        if (!draft?.data) return;
        setForm((current) => ({
          ...current,
          ...draft.data,
          branding: {
            ...current.branding,
            ...(draft.data.branding || {})
          }
        }));
        setDraftId(lastDraftId);
        setStep(Number(draft.currentStep || 1));
        setDraftStatus("Restored previous draft");
        setHasUnsavedChanges(false);
      } catch {
        window.localStorage.removeItem(LAST_DRAFT_KEY);
      } finally {
        setIsLoadingDraft(false);
      }
    }
    loadExistingDraft();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setStepErrors((current) => ({ ...current, [name]: "" }));
    setHasUnsavedChanges(true);
  }

  function handleBrandingChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      branding: {
        ...current.branding,
        [name]: value
      }
    }));
    setStepErrors((current) => ({ ...current, [`branding.${name}`]: "" }));
    setHasUnsavedChanges(true);
  }

  function getFieldError(field) {
    return stepErrors[field] || "";
  }

  function validateStep(stepToValidate) {
    const nextErrors = {};

    if (stepToValidate === 1) {
      if (!form.name.trim()) nextErrors.name = "Institution name is required.";
      if (!form.subdomain.trim()) nextErrors.subdomain = "Subdomain is required.";
      if (form.subdomain.trim() && !isValidSubdomain(form.subdomain)) {
        nextErrors.subdomain = "Use 3-40 lowercase letters, numbers, or hyphens.";
      }
      if (!form.primaryContactEmail.trim()) nextErrors.primaryContactEmail = "Official email is required.";
      if (form.primaryContactEmail.trim() && !isValidEmail(form.primaryContactEmail)) {
        nextErrors.primaryContactEmail = "Enter a valid email address.";
      }
    }

    if (stepToValidate === 2) {
      if (form.branding.primaryColor && !isValidHexColor(form.branding.primaryColor)) {
        nextErrors["branding.primaryColor"] = "Choose a valid color.";
      }
      if (form.branding.secondaryColor && !isValidHexColor(form.branding.secondaryColor)) {
        nextErrors["branding.secondaryColor"] = "Choose a valid color.";
      }
      if (form.branding.accentColor && !isValidHexColor(form.branding.accentColor)) {
        nextErrors["branding.accentColor"] = "Choose a valid color.";
      }
    }

    if (stepToValidate === 3) {
      if (!form.primaryContactName.trim()) nextErrors.primaryContactName = "Admin full name is required.";
    }

    setStepErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNextStep() {
    if (!validateStep(step)) return;
    setCompletedSteps((current) => [...new Set([...current, step])]);
    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  }

  function canAccessStep(targetStep) {
    if (targetStep <= step) {
      return true;
    }
    return completedSteps.includes(targetStep - 1);
  }

  function handleStepSelect(targetStep) {
    if (!canAccessStep(targetStep)) {
      return;
    }
    setStep(targetStep);
  }

  async function handleSaveDraft(currentStep = step) {
    setDraftStatus("");
    await saveDraftMutation.mutateAsync({
      draftId: draftId || undefined,
      currentStep,
      ...form
    });
    setHasUnsavedChanges(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }
    await submitMutation.mutateAsync({
      draftId: draftId || undefined,
      ...form
    });
    window.localStorage.removeItem(LAST_DRAFT_KEY);
    setDraftId("");
    setForm(initialState);
    setStep(1);
    setDraftStatus("");
    setCompletedSteps([]);
    setHasUnsavedChanges(false);
  }

  useEffect(() => {
    if (isLoadingDraft) return undefined;
    if (!hasUnsavedChanges) return undefined;
    if (saveDraftMutation.isPending || submitMutation.isPending) return undefined;

    const timer = window.setInterval(() => {
      if (saveDraftMutation.isPending || submitMutation.isPending) {
        return;
      }

      saveDraftMutation.mutate(
        {
          draftId: draftId || undefined,
          currentStep: latestStepRef.current,
          ...latestFormRef.current
        },
        {
          onSuccess: (data) => {
            const nextDraftId = String(data?.draftId || "").trim();
            if (nextDraftId) {
              setDraftId(nextDraftId);
              window.localStorage.setItem(LAST_DRAFT_KEY, nextDraftId);
            }
            setDraftStatus("Autosaved");
            setHasUnsavedChanges(false);
          }
        }
      );
    }, 12000);

    return () => window.clearInterval(timer);
  }, [draftId, hasUnsavedChanges, isLoadingDraft, saveDraftMutation, submitMutation]);

  if (isLoadingDraft) {
    return <div className="request-page">Loading onboarding wizard...</div>;
  }

  return (
    <div className="request-page">
      <section className="request-hero">
        <p className="request-eyebrow">Institution onboarding</p>
        <h1>Register Your Institution</h1>
        <p>Set up a dedicated community portal for your {isSchool ? "former students, families, and staff" : "alumni and students"}.</p>
      </section>

      <section className="request-shell">
        <form className="request-card" onSubmit={handleSubmit}>
          <div className="request-stepper" role="list">
            {STEP_LABELS.map((label, index) => {
              const currentStepNumber = index + 1;
              const state =
                currentStepNumber < step ? "done" : currentStepNumber === step ? "active" : "upcoming";
              const isLocked = !canAccessStep(currentStepNumber);
              return (
                <button
                  className={`request-step request-step-${state} ${isLocked ? "request-step-locked" : ""}`}
                  disabled={isLocked}
                  key={label}
                  onClick={() => handleStepSelect(currentStepNumber)}
                  role="listitem"
                  type="button"
                >
                  <span>{currentStepNumber}</span>
                  <small>{label}</small>
                </button>
              );
            })}
          </div>

          <div className="request-section">
            <div className="request-section-header">
              <span className="request-section-icon">WZ</span>
              <h2>
                Step {step} of {TOTAL_STEPS}: {stepTitle}
              </h2>
            </div>
          </div>

          {step === 1 ? (
            <div className="request-section">
              <div className="request-grid two-column">
                <label className="request-field">
                  <span>Institution Name</span>
                  <input name="name" onChange={handleChange} placeholder={isSchool ? "e.g. Greenwood High School" : "e.g. Stanford University"} value={form.name} />
                  {getFieldError("name") ? <small className="request-field-error">{getFieldError("name")}</small> : null}
                </label>
                <label className="request-field">
                  <span>Official Email</span>
                  <input name="primaryContactEmail" onChange={handleChange} placeholder={isSchool ? "admin@school.edu" : "admin@university.edu"} type="email" value={form.primaryContactEmail} />
                  {getFieldError("primaryContactEmail") ? <small className="request-field-error">{getFieldError("primaryContactEmail")}</small> : null}
                </label>
                <label className="request-field">
                  <span>Institution Type</span>
                  <select name="institutionType" onChange={handleChange} value={form.institutionType}>
                    <option value="college">College / University</option>
                    <option value="school">School</option>
                  </select>
                </label>
                <label className="request-field">
                  <span>Education Level</span>
                  <select name="educationLevel" onChange={handleChange} value={form.educationLevel}>
                    <option value="higher_ed">Higher Education</option>
                    <option value="k12">School (K-12)</option>
                    <option value="k10">School (Till Class 10)</option>
                  </select>
                </label>
                <label className="request-field">
                  <span>Custom Domain</span>
                  <input name="domain" onChange={handleChange} placeholder="alumni.university.edu" value={form.domain} />
                </label>
                <label className="request-field">
                  <span>Official Website</span>
                  <input name="website" onChange={handleChange} placeholder="https://yourinstitution.edu" value={form.website} />
                </label>
              </div>
              <label className="request-field">
                <span>Institution Subdomain</span>
                <div className="request-slug-row">
                  <input name="subdomain" onChange={handleChange} placeholder={isSchool ? "greenwood-school" : "university-name"} value={form.subdomain} />
                  <span className="request-slug-suffix">.alumnet.com</span>
                </div>
                {getFieldError("subdomain") ? <small className="request-field-error">{getFieldError("subdomain")}</small> : null}
              </label>
              <label className="request-field">
                <span>Institution Bio</span>
                <textarea name="bio" onChange={handleChange} placeholder="Write a short description of your institution." value={form.bio} />
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="request-section">
              <div className="request-grid two-column">
                <label className="request-field">
                  <span>Logo URL</span>
                  <input name="logoUrl" onChange={handleBrandingChange} placeholder="https://cdn.example.edu/logo.png" value={form.branding.logoUrl} />
                </label>
                <label className="request-field">
                  <span>Tagline</span>
                  <input name="tagline" onChange={handleBrandingChange} placeholder="Build lifelong alumni relationships." value={form.branding.tagline} />
                </label>
                <label className="request-field">
                  <span>Primary Color</span>
                  <input name="primaryColor" onChange={handleBrandingChange} type="color" value={form.branding.primaryColor} />
                  {getFieldError("branding.primaryColor") ? <small className="request-field-error">{getFieldError("branding.primaryColor")}</small> : null}
                </label>
                <label className="request-field">
                  <span>Secondary Color</span>
                  <input name="secondaryColor" onChange={handleBrandingChange} type="color" value={form.branding.secondaryColor} />
                  {getFieldError("branding.secondaryColor") ? <small className="request-field-error">{getFieldError("branding.secondaryColor")}</small> : null}
                </label>
                <label className="request-field">
                  <span>Accent Color</span>
                  <input name="accentColor" onChange={handleBrandingChange} type="color" value={form.branding.accentColor} />
                  {getFieldError("branding.accentColor") ? <small className="request-field-error">{getFieldError("branding.accentColor")}</small> : null}
                </label>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="request-section">
              <div className="request-grid two-column">
                <label className="request-field">
                  <span>Admin Full Name</span>
                  <input name="primaryContactName" onChange={handleChange} placeholder="John Doe" value={form.primaryContactName} />
                  {getFieldError("primaryContactName") ? <small className="request-field-error">{getFieldError("primaryContactName")}</small> : null}
                </label>
                <label className="request-field">
                  <span>Admin Phone</span>
                  <input name="primaryContactPhone" onChange={handleChange} placeholder="+1 234 567 8901" value={form.primaryContactPhone} />
                </label>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="request-section">
              <div className="request-review-grid">
                <article>
                  <h3>Institution</h3>
                  <p><strong>Name:</strong> {form.name || "-"}</p>
                  <p><strong>Type:</strong> {form.institutionType}</p>
                  <p><strong>Level:</strong> {form.educationLevel}</p>
                  <p><strong>Website:</strong> {form.website || "-"}</p>
                </article>
                <article>
                  <h3>Portal</h3>
                  <p><strong>Subdomain:</strong> {reviewPortalUrl}</p>
                  <p><strong>Custom domain:</strong> {form.domain || "-"}</p>
                  <p><strong>Bio:</strong> {form.bio || "-"}</p>
                </article>
                <article>
                  <h3>Administrator</h3>
                  <p><strong>Name:</strong> {form.primaryContactName || "-"}</p>
                  <p><strong>Email:</strong> {form.primaryContactEmail || "-"}</p>
                  <p><strong>Phone:</strong> {form.primaryContactPhone || "-"}</p>
                </article>
                <article>
                  <h3>Branding</h3>
                  <p><strong>Tagline:</strong> {form.branding.tagline || "-"}</p>
                  <div className="request-color-row">
                    <span title={form.branding.primaryColor} style={{ backgroundColor: form.branding.primaryColor }} />
                    <span title={form.branding.secondaryColor} style={{ backgroundColor: form.branding.secondaryColor }} />
                    <span title={form.branding.accentColor} style={{ backgroundColor: form.branding.accentColor }} />
                  </div>
                </article>
              </div>
            </div>
          ) : null}

          <div className="auth-row auth-row-between">
            <button className="button secondary" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))} type="button">
              Previous
            </button>
            <button className="button secondary" disabled={saveDraftMutation.isPending} onClick={() => handleSaveDraft(step)} type="button">
              {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
            </button>
            {step < TOTAL_STEPS ? (
              <button className="button primary" onClick={handleNextStep} type="button">
                Next
              </button>
            ) : null}
          </div>

          {step === TOTAL_STEPS ? (
            <button className="button primary request-submit" disabled={submitMutation.isPending} type="submit">
              {submitMutation.isPending ? "Submitting..." : "Submit Portal Request"}
            </button>
          ) : null}

          <p className="request-terms">
            By clicking Register, you agree to AlumNet&apos;s <Link to="/request-portal">Terms of Service</Link> and <Link to="/request-portal">Privacy Policy</Link>.
          </p>

          {submitMutation.isSuccess ? (
            <div className="success-panel request-success">
              <strong>Institution request submitted</strong>
              <p className="muted">{submitMutation.data.onboarding.message}</p>
            </div>
          ) : null}
          {submitMutation.isError ? <p className="error-text">{submitMutation.error.message}</p> : null}
          {Array.isArray(submitMutation.error?.data?.details) ? (
            <ul className="request-server-errors">
              {submitMutation.error.data.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
          {draftStatus ? <p className="muted">{draftStatus}</p> : null}
          {hasUnsavedChanges ? <p className="muted">Unsaved changes pending...</p> : null}
        </form>
      </section>
    </div>
  );
}

export default PortalRequestPage;
