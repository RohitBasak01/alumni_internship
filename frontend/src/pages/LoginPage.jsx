import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { login } from "../lib/api.js";

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
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const demoAccounts = getDemoAccounts();
  const redirectTo =
    location.state?.from?.pathname ||
    (auth.user?.role === "super_admin" ? "/super-admin" : "/portal");

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

  return (
    <div className="mx-auto flex w-full max-w-[580px] flex-col items-center px-4 py-10 md:py-14">
      <section className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-[#1152d4]/5">
        <div className="p-1">
          <div
            className="relative flex min-h-[220px] w-full flex-col justify-end overflow-hidden rounded-lg bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD3wuXrs7hUrjwbkJyYRrf3ikFlzJgMIj4L2JV6ACRTxD7CWkmocgyoJDGC1vjQ85rlHmkowalUh-M8qM-q-4DyU8PCSpbCPm7Sp18mYEpucqmGUKzPnVvfrpACn6-TNg52e4mZDav8boSBQXiVMWE_W54z6_BaMQ4q41fmxpNmPHxQr7w8oDL05W40_Vcu21d1uQ6olAk87dQPtVcg6y82KLi_gZul7whkHuQTgDWXQBLIIk3QcS2J3lnlXMuguSR22gKWyGt7zDX4")'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="relative p-8">
              <h1 className="text-5xl font-bold leading-tight text-white">Welcome Back</h1>
              <p className="mt-2 text-base text-white/85 sm:text-lg">Reconnect with your alma mater and fellow alumni</p>
            </div>
          </div>
        </div>

        <div className="px-10 pb-12 pt-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label className="block text-base font-semibold text-slate-700" htmlFor="login-email">
                Email Address
              </label>
              <div className="group relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[22px] text-slate-400 transition-colors group-focus-within:text-[#1152d4]">
                  mail
                </span>
                <input
                  className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 text-[1.1rem] text-slate-900 placeholder:text-slate-400 focus:border-[#1152d4] focus:ring-2 focus:ring-[#1152d4]/20"
                  id="login-email"
                  name="email"
                  onChange={handleChange}
                  placeholder="name@university.edu"
                  required
                  style={{ paddingLeft: "3.25rem" }}
                  type="email"
                  value={form.email}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-base font-semibold text-slate-700" htmlFor="login-password">
                  Password
                </label>
                <Link className="text-sm font-semibold text-[#1152d4] hover:underline" to="/forgot-password">
                  Forgot password?
                </Link>
              </div>
              <div className="group relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[22px] text-slate-400 transition-colors group-focus-within:text-[#1152d4]">
                  lock
                </span>
                <input
                  className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-[1.1rem] text-slate-900 placeholder:text-slate-400 focus:border-[#1152d4] focus:ring-2 focus:ring-[#1152d4]/20"
                  id="login-password"
                  name="password"
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  style={{ paddingLeft: "3.25rem", paddingRight: "3.25rem" }}
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <label className="flex w-full items-center justify-start gap-3 py-2">
              <input
                checked={form.remember}
                className="!m-0 !h-5 !w-5 shrink-0 rounded border-slate-300 bg-white p-0 text-[#1152d4] focus:ring-[#1152d4]"
                name="remember"
                onChange={handleChange}
                type="checkbox"
              />
              <span className="cursor-pointer text-[1.08rem] leading-tight text-slate-600">Remember this device</span>
            </label>

            <button
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1152d4] px-4 py-3 text-[1.15rem] font-bold text-white shadow-lg shadow-[#1152d4]/20 transition-all hover:bg-[#0f48ba] active:scale-[0.98]"
              disabled={mutation.isPending}
              type="submit"
            >
              <span>{mutation.isPending ? "Logging in..." : "Login to Portal"}</span>
              <span className="material-symbols-outlined text-[22px]">login</span>
            </button>
          </form>

          {mutation.isError ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {getErrorMessage(mutation.error)}
            </p>
          ) : null}

          <div className="mt-9 border-t border-slate-100 pt-7">
            <p className="text-center text-base text-slate-500">
              New institution?{" "}
              <Link className="font-bold text-[#1152d4] hover:underline" to="/request-portal">
                Register your school
              </Link>
            </p>
          </div>

          {demoAccounts.length ? (
            <div className="mt-7 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Seeded Demo Accounts</p>
              {demoAccounts.map((account) => (
                <button
                  key={`${account.label}-${account.email}`}
                  className="grid w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:bg-slate-100"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      email: account.email,
                      password: account.password
                    }))
                  }
                  type="button"
                >
                  <strong className="text-sm text-slate-800">{account.label}</strong>
                  <span className="text-xs text-slate-500">{account.email}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <footer className="mt-8 text-center text-xs text-slate-400">
        <p>© 2024 AlumNet Professional Network. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-4">
          <a className="transition-colors hover:text-[#1152d4]" href="/">
            Privacy Policy
          </a>
          <a className="transition-colors hover:text-[#1152d4]" href="/">
            Terms of Service
          </a>
          <a className="transition-colors hover:text-[#1152d4]" href="/">
            Support
          </a>
        </div>
      </footer>
    </div>
  );
}

export default LoginPage;
