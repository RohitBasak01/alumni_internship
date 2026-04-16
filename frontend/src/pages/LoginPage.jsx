import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { getOAuthStartUrl, login } from "../lib/api.js";

const signupProviders = [
  { id: "google", label: "Continue with Google", tone: "light" },
  { id: "linkedin", label: "Continue with LinkedIn", tone: "brand" },
  { id: "email", label: "Continue with Email", tone: "neutral" }
];

function getDemoAccounts() {
  const rawValue = import.meta.env.VITE_DEMO_ACCOUNTS;

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (account) =>
        account &&
        typeof account.label === "string" &&
        typeof account.email === "string" &&
        typeof account.password === "string" &&
        !account.email.includes("@example.") &&
        account.password !== "YourPassword"
    );
  } catch {
    return [];
  }
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.details?.[0] ||
    error?.message ||
    "Login failed. Please check your credentials and try again."
  );
}

function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const demoAccounts = getDemoAccounts();
  const redirectTo =
    location.state?.from?.pathname ||
    (auth.user?.role === "super_admin" ? "/super-admin" : "/portal");
  const oauthError = searchParams.get("error");

  if (auth.isAuthenticated) {
    return <Navigate replace to={redirectTo} />;
  }

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      auth.login(data.user);
      navigate(
        location.state?.from?.pathname ||
          (data.user.role === "super_admin" ? "/super-admin" : "/portal")
      );
    }
  });

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    mutation.mutate({
      email: form.email,
      password: form.password
    });
  }

  function handleSocialLogin(provider) {
    window.location.assign(getOAuthStartUrl(provider, { mode: "login" }));
  }

  return (
    <div className="auth-shell">
      <section className="auth-grid auth-grid-compact">
        <aside className="auth-aside">
          <p className="auth-eyebrow">Professional alumni operations</p>
          <h1>Welcome back to your alumni network.</h1>
          <p className="auth-lead">
            Sign in with Google, LinkedIn, or your email credentials. Approved alumni are taken straight into the portal.
          </p>

          <div className="auth-highlight-list">
            <article>
              <strong>Unified access</strong>
              <span>Use the same onboarding path across alumni, institute admins, and platform staff.</span>
            </article>
            <article>
              <strong>Approval-aware</strong>
              <span>Pending alumni registrations stay in review until the institute admin verifies them.</span>
            </article>
            <article>
              <strong>Secure onboarding</strong>
              <span>Password setup still happens through the invite link after approval.</span>
            </article>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-header">
            <p className="auth-panel-kicker">Login</p>
            <h2>Access your portal</h2>
            <p>Choose your preferred sign-in method or use your existing email and password.</p>
          </div>

          <div className="auth-social-grid">
            {signupProviders.map((provider) =>
              provider.id === "email" ? (
                <Link
                  key={provider.id}
                  className={`auth-provider auth-provider-${provider.tone}`}
                  to="/register?provider=email"
                >
                  {provider.label}
                </Link>
              ) : (
                <button
                  key={provider.id}
                  className={`auth-provider auth-provider-${provider.tone}`}
                  onClick={() => handleSocialLogin(provider.id)}
                  type="button"
                >
                  {provider.label}
                </button>
              )
            )}
          </div>

          {oauthError ? <p className="auth-alert auth-alert-warning">{oauthError}</p> : null}

          <div className="auth-divider"><span>or continue with email</span></div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Email address</span>
              <input
                id="login-email"
                name="email"
                onChange={handleChange}
                placeholder="name@university.edu"
                required
                type="email"
                value={form.email}
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="auth-password-row">
                <input
                  id="login-password"
                  name="password"
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                />
                <button
                  className="auth-inline-button"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div className="auth-row auth-row-between">
              <label className="auth-checkbox">
                <input checked={form.remember} name="remember" onChange={handleChange} type="checkbox" />
                <span>Remember this device</span>
              </label>
              <Link className="auth-inline-link" to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            <button className="button primary auth-submit" disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Logging in..." : "Login to Portal"}
            </button>
          </form>

          {mutation.isError ? <p className="auth-alert auth-alert-danger">{getErrorMessage(mutation.error)}</p> : null}

          <div className="auth-panel-footer">
            <p>
              New alumni? <Link to="/register?provider=email">Create your account</Link>
            </p>
            <p>
              Managing an institute? <Link to="/request-portal">Register your school</Link>
            </p>
          </div>

          {demoAccounts.length ? (
            <div className="auth-demo-list">
              <p className="auth-demo-title">Demo accounts</p>
              {demoAccounts.map((account) => (
                <button
                  key={`${account.label}-${account.email}`}
                  className="auth-demo-item"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      email: account.email,
                      password: account.password
                    }))
                  }
                  type="button"
                >
                  <strong>{account.label}</strong>
                  <span>{account.email}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </section>

      <footer className="auth-footer">
        <p>© 2026 AlumNet Professional Network. All rights reserved.</p>
        <div>
          <a href="/">Privacy Policy</a>
          <a href="/">Terms of Service</a>
          <a href="/">Support</a>
        </div>
      </footer>
    </div>
  );
}

export default LoginPage;
