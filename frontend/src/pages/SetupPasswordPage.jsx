import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import SectionCard from "../components/SectionCard.jsx";
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
    <div className="page-narrow">
      <SectionCard title="Set Your Password" subtitle="Invite Onboarding">
        {inviteQuery.isLoading ? <p>Checking invite...</p> : null}
        {inviteQuery.isError ? <p className="error-text">{inviteQuery.error.message}</p> : null}

        {inviteQuery.data ? (
          <>
            <p className="muted">
              {inviteQuery.data.name} ({inviteQuery.data.email})
            </p>
            <p className="muted">
              {inviteQuery.data.institute?.name || "Institute portal"} {inviteQuery.data.role.replace("_", " ")} onboarding
            </p>

            <form className="form-grid" onSubmit={handleSubmit}>
              <input
                name="password"
                onChange={handleChange}
                placeholder="Create password"
                type="password"
                value={form.password}
              />
              <input
                name="confirmPassword"
                onChange={handleChange}
                placeholder="Confirm password"
                type="password"
                value={form.confirmPassword}
              />
              {form.confirmPassword && form.password !== form.confirmPassword ? (
                <p className="error-text">Passwords do not match.</p>
              ) : null}
              <button className="button primary" disabled={setupMutation.isPending} type="submit">
                {setupMutation.isPending ? "Saving..." : "Activate Account"}
              </button>
            </form>
          </>
        ) : null}

        {setupMutation.isError ? <p className="error-text">{setupMutation.error.message}</p> : null}
        {setupMutation.isSuccess && !setupMutation.data.canLogin ? (
          <div className="success-panel">
            <strong>Password saved</strong>
            <p className="muted">{setupMutation.data.message}</p>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

export default SetupPasswordPage;
