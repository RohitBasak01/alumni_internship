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
  const emailDomain =
    String(form.email || "")
      .split("@")[1]
      ?.trim()
      .toLowerCase() || "";
  const suggestedInstitute = !tenant.isTenant
    ? (publicInstitutesQuery.data || []).find((item) => {
        const itemSubdomain = String(item?.subdomain || "")
          .trim()
          .toLowerCase();
        const itemDomain = String(item?.domain || "")
          .trim()
          .toLowerCase();
        if (!emailDomain) {
          return false;
        }
        if (itemSubdomain && emailDomain.includes(itemSubdomain)) {
          return true;
        }
        if (
          itemDomain &&
          (itemDomain.includes(emailDomain) ||
            emailDomain.includes(itemDomain.replace(/^alumni\./, "")))
        ) {
          return true;
        }
        return false;
      })
    : null;
  const allDemoAccounts = getDemoAccounts();
  const demoAccounts = tenant.isTenant
    ? allDemoAccounts.filter(
        (account) =>
          String(account.tenantSubdomain || "")
            .trim()
            .toLowerCase() ===
          String(tenantProfile?.subdomain || tenant.slug || "")
            .trim()
            .toLowerCase(),
      )
    : allDemoAccounts;
  const redirectTo =
    location.state?.from?.pathname ||
    (auth.user?.role === "super_admin" ? "/super-admin" : "/portal");
  const oauthError = searchParams.get("error");
  const tenantStatus =
    tenantProfileQuery.error?.data?.details?.portalStatus || null;
  const tenantName =
    tenantProfileQuery.error?.data?.details?.instituteName || "";

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs for depth */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-brand-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-[1.1fr_450px] gap-12 xl:gap-20 items-start relative z-10 pt-12 pb-20">
        {/* Left Side: Brand & Value Prop */}
        <div className="hidden lg:flex flex-col space-y-16 pr-12 border-r border-slate-200 mt-12">
          <div className="space-y-10">
            <Link to="/" className="inline-block space-y-8 group">
              <div className="h-24 w-24 rounded-[2.5rem] bg-brand-600 text-white grid place-items-center shadow-2xl shadow-brand-500/30 group-hover:rotate-6 transition-all duration-500">
                <span className="material-symbols-outlined text-5xl font-black">school</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">
                  {tenant.isTenant ? portalName : "AlumniConnect"}
                </h1>
                <div className="h-2 w-32 bg-brand-600 rounded-full shadow-sm"></div>
              </div>
            </Link>

            <p className="text-2xl text-slate-500 font-medium leading-relaxed max-w-lg">
              {tenant.isTenant 
                ? `The official gateway for ${portalName} members to reconnect, collaborate, and grow.`
                : "The enterprise-ready professional network for modern institution-wide alumni operations."}
            </p>
          </div>

          <div className="grid gap-10">
            {[
              { title: "Secure Access", desc: "Enterprise-grade security and SOC2-compliant data handling.", icon: "verified_user" },
              { title: "Global Network", desc: "Connect with alumni across 150+ countries and industries.", icon: "public" },
              { title: "Career Growth", desc: "Access exclusive mentorship and institutional job boards.", icon: "rocket_launch" }
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-center group">
                <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 grid place-items-center flex-shrink-0 text-brand-600 shadow-sm group-hover:shadow-md group-hover:border-brand-100 transition-all">
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-0.5">{item.title}</h4>
                  <p className="text-slate-500 font-medium leading-tight">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="glass-card p-8 lg:p-12 rounded-[2.5rem] shadow-2xl w-full">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-500 font-medium">Please enter your details to sign in.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">mail</span>
                <input
                  name="email"
                  onChange={handleChange}
                  placeholder="name@university.edu"
                  required
                  type="email"
                  value={form.email}
                  style={{ paddingLeft: '64px' }}
                  className="w-full pr-4 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">lock</span>
                <input
                  name="password"
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  style={{ paddingLeft: '64px' }}
                  className="w-full pr-12 py-4 bg-white/50 border border-slate-200 rounded-[1.25rem] focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  checked={form.remember}
                  name="remember"
                  onChange={handleChange}
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
              </label>
              <Link className="text-sm font-bold text-brand-600 hover:text-brand-700" to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            <button
              disabled={mutation.isPending}
              type="submit"
              className="btn-primary w-full py-4 text-base shadow-xl"
            >
              {mutation.isPending ? "Logging in..." : "Login to Portal"}
            </button>
          </form>

          {mutation.isError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600">
              <span className="material-symbols-outlined text-xl">error</span>
              <p className="text-sm font-semibold">{getErrorMessage(mutation.error)}</p>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-slate-100 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-100"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Social Sign-in</span>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Google
              </button>
              <button 
                onClick={() => handleSocialLogin('linkedin')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0077b5] text-white rounded-2xl font-bold hover:bg-[#006396] transition-colors"
              >
                <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" className="w-5 h-5 brightness-0 invert" alt="LinkedIn" />
                LinkedIn
              </button>
            </div>

            <p className="text-center text-sm font-semibold text-slate-500">
              Don't have an account?{" "}
              <Link to="/register" className="text-brand-600 hover:text-brand-700">Create account</Link>
            </p>
          </div>

          {demoAccounts.length > 0 && (
            <div className="mt-8 p-6 bg-brand-50 rounded-[2rem] border border-brand-100">
              <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">science</span>
                Demo Environments
              </p>
              <div className="grid gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    onClick={() => setForm({ ...form, email: account.email, password: account.password })}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-brand-100 hover:border-brand-300 hover:shadow-md transition-all text-left"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none mb-1">{account.label}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate w-40">{account.email}</p>
                    </div>
                    <span className="material-symbols-outlined text-brand-400">login</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default LoginPage;
