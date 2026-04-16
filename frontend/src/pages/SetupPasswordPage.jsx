import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { fetchInviteDetails, setupPassword } from "../lib/api.js";

function SetupPasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { token } = useParams();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });

  const inviteQuery = useQuery({
    queryKey: ["invite-details", token],
    queryFn: () => fetchInviteDetails(token),
    retry: false
  });

  const setupMutation = useMutation({
    mutationFn: setupPassword,
    onSuccess: (data) => {
      if (!data.canLogin) {
        return;
      }

      auth.login(data.user);
      navigate(data.user.role === "super_admin" ? "/super-admin" : "/portal");
    }
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setupMutation.reset();
      return;
    }

    setupMutation.mutate({ token, password: form.password });
  }

  return (
    <div className="auth-shell">
      <section className="auth-grid auth-grid-compact">
        <aside className="auth-aside">
          <p className="auth-eyebrow">Invite onboarding</p>
          <h1>Finish your account setup securely.</h1>
          <p className="auth-lead">
            Create your password once and use it alongside your approved social sign-in method for future access.
          </p>

          {inviteQuery.data ? (
            <div className="auth-highlight-list compact">
              <article>
                <strong>{inviteQuery.data.name}</strong>
                <span>{inviteQuery.data.email}</span>
              </article>
              <article>
                <strong>{inviteQuery.data.institute?.name || "Institute portal"}</strong>
                <span>{inviteQuery.data.role.replace("_", " ")} onboarding</span>
              </article>
            </div>
          ) : null}
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-header">
            <p className="auth-panel-kicker">Set password</p>
            <h2>Activate your account</h2>
            <p>Create a strong password to complete onboarding.</p>
          </div>

          {inviteQuery.isLoading ? <p className="auth-alert auth-alert-info">Checking invite...</p> : null}
          {inviteQuery.isError ? <p className="auth-alert auth-alert-danger">{inviteQuery.error.message}</p> : null}

          {inviteQuery.data ? (
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>Create password</span>
                <input
                  name="password"
                  onChange={handleChange}
                  placeholder="Create password"
                  type="password"
                  value={form.password}
                />
              </label>

              <label className="auth-field">
                <span>Confirm password</span>
                <input
                  name="confirmPassword"
                  onChange={handleChange}
                  placeholder="Confirm password"
                  type="password"
                  value={form.confirmPassword}
                />
              </label>

              {form.confirmPassword && form.password !== form.confirmPassword ? (
                <p className="auth-alert auth-alert-danger">Passwords do not match.</p>
              ) : null}

              <button className="button primary auth-submit" disabled={setupMutation.isPending} type="submit">
                {setupMutation.isPending ? "Saving..." : "Activate Account"}
              </button>
            </form>
          ) : null}

          {setupMutation.isError ? <p className="auth-alert auth-alert-danger">{setupMutation.error.message}</p> : null}
          {setupMutation.isSuccess && !setupMutation.data.canLogin ? (
            <div className="auth-alert auth-alert-success auth-alert-large">
              <strong>Password saved</strong>
              <span>{setupMutation.data.message}</span>
            </div>
          ) : null}

          <div className="auth-panel-footer auth-panel-footer-left">
            <Link className="auth-inline-link" to="/login">
              Back to Login
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}

export default SetupPasswordPage;
