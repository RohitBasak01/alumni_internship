import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { requestPortal } from "../lib/api.js";

const initialState = {
  name: "",
  subdomain: "",
  domain: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: ""
};

function PortalRequestPage() {
  const [form, setForm] = useState(initialState);

  const mutation = useMutation({
    mutationFn: requestPortal
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await mutation.mutateAsync(form);
    setForm(initialState);
  }

  return (
    <div className="request-page">
      <section className="request-hero">
        <p className="request-eyebrow">Institution onboarding</p>
        <h1>Register Your Institution</h1>
        <p>
          Set up a dedicated networking portal for your alumni and students.
        </p>
      </section>

      <section className="request-shell">
        <form className="request-card" onSubmit={handleSubmit}>
          <div className="request-section">
            <div className="request-section-header">
              <span className="request-section-icon">ID</span>
              <h2>Institution Details</h2>
            </div>

            <div className="request-grid two-column">
              <label className="request-field">
                <span>Institution Name</span>
                <input
                  name="name"
                  onChange={handleChange}
                  placeholder="e.g. Stanford University"
                  value={form.name}
                />
              </label>

              <div className="request-field">
                <span>Institution Logo</span>
                <button className="request-upload" type="button">
                  Upload Logo
                </button>
              </div>

              <label className="request-field">
                <span>Official Email</span>
                <input
                  name="primaryContactEmail"
                  onChange={handleChange}
                  placeholder="admin@university.edu"
                  type="email"
                  value={form.primaryContactEmail}
                />
              </label>

              <label className="request-field">
                <span>Official Website / Custom Domain</span>
                <input
                  name="domain"
                  onChange={handleChange}
                  placeholder="https://university.edu"
                  value={form.domain}
                />
              </label>
            </div>

            <label className="request-field">
              <span>Institution Domain / Slug</span>
              <div className="request-slug-row">
                <input
                  name="subdomain"
                  onChange={handleChange}
                  placeholder="university-name"
                  value={form.subdomain}
                />
                <span className="request-slug-suffix">.alumnet.com</span>
              </div>
              <small>This will be your unique access URL.</small>
            </label>
          </div>

          <div className="request-section">
            <div className="request-section-header">
              <span className="request-section-icon">PA</span>
              <h2>Primary Administrator</h2>
            </div>

            <div className="request-grid two-column">
              <label className="request-field">
                <span>Admin Full Name</span>
                <input
                  name="primaryContactName"
                  onChange={handleChange}
                  placeholder="John Doe"
                  value={form.primaryContactName}
                />
              </label>

              <label className="request-field">
                <span>Admin Phone</span>
                <input
                  name="primaryContactPhone"
                  onChange={handleChange}
                  placeholder="+1 234 567 8901"
                  value={form.primaryContactPhone}
                />
              </label>
            </div>

            <p className="request-note">
              We will create the initial administrator account and send a secure setup
              link to the official email address after submission.
            </p>
          </div>

          <button className="button primary request-submit" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Creating Institution..." : "Create Institution Account"}
          </button>

          <p className="request-terms">
            By clicking Register, you agree to AlumNet&apos;s{" "}
            <Link to="/request-portal">Terms of Service</Link> and{" "}
            <Link to="/request-portal">Privacy Policy</Link>.
          </p>

          {mutation.isSuccess ? (
            <div className="success-panel request-success">
              <strong>Institution request submitted</strong>
              <p className="muted">{mutation.data.onboarding.message}</p>
              <p className="muted">
                Invite delivery: {mutation.data.emailDelivery.delivered ? "email sent" : "manual share"}
              </p>
              {mutation.data.emailDelivery.delivered ? null : (
                <div className="request-copy-row">
                  <input readOnly value={mutation.data.invite.inviteUrl} />
                  <button
                    className="button secondary compact"
                    onClick={() => navigator.clipboard.writeText(mutation.data.invite.inviteUrl)}
                    type="button"
                  >
                    Copy Setup Link
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {mutation.isError ? <p className="error-text">{mutation.error.message}</p> : null}
        </form>

        <div className="request-benefits">
          <article>
            <span className="request-benefit-icon">EA</span>
            <h3>Engage Alumni</h3>
            <p>Automated networking and mentoring programs.</p>
          </article>
          <article>
            <span className="request-benefit-icon">DD</span>
            <h3>Drive Donations</h3>
            <p>Integrated fundraising and donation management.</p>
          </article>
          <article>
            <span className="request-benefit-icon">DA</span>
            <h3>Deep Analytics</h3>
            <p>Track engagement metrics and career outcomes.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

export default PortalRequestPage;
