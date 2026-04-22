import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import DevTenantSwitcher from "../components/DevTenantSwitcher.jsx";
import TenantPublicStatus from "../components/TenantPublicStatus.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCurrentTenantPublicProfile } from "../hooks/useCurrentTenantPublicProfile.js";
import { useTenantBranding } from "../hooks/useTenantBranding.js";
import { useTenantContext } from "../hooks/useTenantContext.js";
import {
  fetchPublicInstitutes,
  getOAuthStartUrl,
  login,
  redirectToTenantPortal,
} from "../lib/api.js";

const signupProviders = [
  { id: "google", label: "Continue with Google", tone: "light" },
  { id: "linkedin", label: "Continue with LinkedIn", tone: "brand" },
  { id: "email", label: "Continue with Email", tone: "neutral" },
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
        account.password !== "YourPassword",
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
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const tenant = useTenantContext();
  const tenantProfileQuery = useCurrentTenantPublicProfile();
  const tenantProfile = tenantProfileQuery.data || null;
  const portalName = tenantProfile?.name || tenant.displayName;
  useTenantBranding(tenantProfile?.branding, tenant.isTenant);
  const publicInstitutesQuery = useQuery({
    queryKey: ["public-institutes", "login-redirect"],
    queryFn: fetchPublicInstitutes,
    enabled: true,
  });
  const emailDomain = String(form.email || "").split("@")[1]?.trim().toLowerCase() || "";
  const suggestedInstitute = !tenant.isTenant
    ? (publicInstitutesQuery.data || []).find((item) => {
        const itemSubdomain = String(item?.subdomain || "").trim().toLowerCase();
        const itemDomain = String(item?.domain || "").trim().toLowerCase();
        if (!emailDomain) {
          return false;
        }
        if (itemSubdomain && emailDomain.includes(itemSubdomain)) {
          return true;
        }
        if (itemDomain && (itemDomain.includes(emailDomain) || emailDomain.includes(itemDomain.replace(/^alumni\./, "")))) {
          return true;
        }
        return false;
      })
    : null;
  const allDemoAccounts = getDemoAccounts();
  const demoAccounts = tenant.isTenant
    ? allDemoAccounts.filter(
        (account) =>
          String(account.tenantSubdomain || "").trim().toLowerCase() ===
          String(tenantProfile?.subdomain || tenant.slug || "").trim().toLowerCase(),
      )
    : allDemoAccounts;
  const redirectTo =
    location.state?.from?.pathname ||
    (auth.user?.role === "super_admin" ? "/super-admin" : "/portal");
  const oauthError = searchParams.get("error");
  const tenantStatus = tenantProfileQuery.error?.data?.details?.portalStatus || null;
  const tenantName = tenantProfileQuery.error?.data?.details?.instituteName || "";

  if (auth.isAuthenticated) {
    return <Navigate replace to={redirectTo} />;
  }

  if (tenant.isTenant && tenantProfileQuery.isError) {
    return (
      <TenantPublicStatus
        status={tenantStatus || "not-found"}
        instituteName={tenantName}
        showBackHome={false}
      />
    );
  }

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      auth.login(data.user);
      navigate(
        location.state?.from?.pathname ||
          (data.user.role === "super_admin" ? "/super-admin" : "/portal"),
      );
    },
  });

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (typeof window !== "undefined") {
      const matchedDemoAccount = demoAccounts.find(
        (account) =>
          String(account.email || "")
            .trim()
            .toLowerCase() === form.email.trim().toLowerCase(),
      );

      if (matchedDemoAccount) {
        const tenantSubdomain = String(matchedDemoAccount.tenantSubdomain || "")
          .trim()
          .toLowerCase();
        const tenantDomain = String(matchedDemoAccount.tenantDomain || "")
          .trim()
          .toLowerCase();

        if (tenantSubdomain) {
          window.localStorage.setItem("tenantSubdomain", tenantSubdomain);
        } else {
          window.localStorage.removeItem("tenantSubdomain");
        }

        if (tenantDomain) {
          window.localStorage.setItem("tenantDomain", tenantDomain);
        } else {
          window.localStorage.removeItem("tenantDomain");
        }
      }
    }

    mutation.mutate({
      email: form.email,
      password: form.password,
    });
  }

  function handleSocialLogin(provider) {
    window.location.assign(getOAuthStartUrl(provider, { mode: "login" }));
  }

  return (
    <div className="auth-shell">
      <section className="auth-grid auth-grid-compact">
        <aside className="auth-aside">
          <p className="auth-eyebrow">
            {tenant.isTenant
              ? `${portalName} community portal`
              : "Professional alumni operations"}
          </p>
          <h1>
            {tenant.isTenant
              ? `Welcome back to ${portalName}.`
              : "Welcome back to your alumni network."}
          </h1>
          <p className="auth-lead">
            {tenant.isTenant
              ? "Sign in with your approved credentials to access institution-specific announcements, events, and networking."
              : "Sign in with Google, LinkedIn, or your email credentials. Approved alumni are taken straight into the portal."}
          </p>

          <div className="auth-highlight-list">
            <article>
              <strong>Unified access</strong>
              <span>
                Use the same onboarding path across alumni, institute admins,
                and platform staff.
              </span>
            </article>
            <article>
              <strong>Approval-aware</strong>
              <span>
                Pending alumni registrations stay in review until the institute
                admin verifies them.
              </span>
            </article>
            <article>
              <strong>Secure onboarding</strong>
              <span>
                Password setup still happens through the invite link after
                approval.
              </span>
            </article>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-header">
            <p className="auth-panel-kicker">Login</p>
            <h2>Access your portal</h2>
            <p>
              Choose your preferred sign-in method or use your existing email
              and password.
            </p>
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
              ),
            )}
          </div>

          {oauthError ? (
            <p className="auth-alert auth-alert-warning">{oauthError}</p>
          ) : null}

          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

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
                <input
                  checked={form.remember}
                  name="remember"
                  onChange={handleChange}
                  type="checkbox"
                />
                <span>Remember this device</span>
              </label>
              <Link className="auth-inline-link" to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            <button
              className="button primary auth-submit"
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? "Logging in..." : "Login to Portal"}
            </button>
          </form>

          {mutation.isError ? (
            <p className="auth-alert auth-alert-danger">
              {getErrorMessage(mutation.error)}
            </p>
          ) : null}

          <div className="auth-panel-footer">
            {publicInstitutesQuery.data?.length ? (
              <DevTenantSwitcher
                currentTenantSlug={tenantProfile?.subdomain || tenant.slug}
                institutes={publicInstitutesQuery.data}
              />
            ) : null}
            {!tenant.isTenant && suggestedInstitute ? (
              <p>
                Looks like you belong to {suggestedInstitute.name}.{" "}
                <button
                  className="auth-inline-button"
                  onClick={() => redirectToTenantPortal(suggestedInstitute, "/login")}
                  type="button"
                >
                  Open institution portal
                </button>
              </p>
            ) : null}
            <p>
              New alumni?{" "}
              <Link to="/register?provider=email">Create your account</Link>
            </p>
            {!tenant.isTenant ? (
              <p>
                Managing an institute?{" "}
                <Link to="/request-portal">Register your school</Link>
              </p>
            ) : (
              <p>
                Not your institution?{" "}
                <button
                  className="auth-inline-button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.localStorage.removeItem("tenantSubdomain");
                      window.localStorage.removeItem("tenantDomain");
                      window.location.assign("/login");
                    }
                  }}
                  type="button"
                >
                  Switch institution
                </button>
              </p>
            )}
          </div>

          {demoAccounts.length ? (
            <div className="auth-demo-list">
              <p className="auth-demo-title">Demo accounts</p>
              {demoAccounts.map((account) => (
                <button
                  key={`${account.label}-${account.email}`}
                  className="auth-demo-item"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      const tenantSubdomain = String(
                        account.tenantSubdomain || "",
                      )
                        .trim()
                        .toLowerCase();
                      const tenantDomain = String(account.tenantDomain || "")
                        .trim()
                        .toLowerCase();

                      if (tenantSubdomain) {
                        window.localStorage.setItem(
                          "tenantSubdomain",
                          tenantSubdomain,
                        );
                      } else {
                        window.localStorage.removeItem("tenantSubdomain");
                      }

                      if (tenantDomain) {
                        window.localStorage.setItem(
                          "tenantDomain",
                          tenantDomain,
                        );
                      } else {
                        window.localStorage.removeItem("tenantDomain");
                      }
                    }

                    setForm((current) => ({
                      ...current,
                      email: account.email,
                      password: account.password,
                    }));
                  }}
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
        <p>� 2026 AlumNet Professional Network. All rights reserved.</p>
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
