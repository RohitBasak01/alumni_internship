import { Link } from "react-router-dom";

function getStatusCopy(status, instituteName) {
  if (status === "suspended") {
    return {
      title: "Institution portal is suspended",
      description: `${instituteName || "This institution"} portal is temporarily unavailable. Please contact the institution administrator.`
    };
  }

  if (status === "pending") {
    return {
      title: "Institution portal is pending activation",
      description: `${instituteName || "This institution"} portal is not active yet. Try again after activation.`
    };
  }

  return {
    title: "Institution portal not found",
    description: "We could not find an active institution portal for this address."
  };
}

function TenantPublicStatus({ status = "not-found", instituteName = "", showBackHome = true }) {
  const copy = getStatusCopy(status, instituteName);

  return (
    <div className="auth-shell">
      <section className="auth-grid auth-grid-compact">
        <aside className="auth-aside">
          <p className="auth-eyebrow">Portal status</p>
          <h1>{copy.title}</h1>
          <p className="auth-lead">{copy.description}</p>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-header">
            <p className="auth-panel-kicker">Need help?</p>
            <h2>What you can do next</h2>
            <p>Confirm the institution URL or contact your institution administrator.</p>
          </div>

          <div className="auth-highlight-list compact">
            <article>
              <strong>Check the address</strong>
              <span>Make sure your institution subdomain or custom domain is correct.</span>
            </article>
            <article>
              <strong>Contact your institution</strong>
              <span>Ask your institution admin to verify portal activation status.</span>
            </article>
            <article>
              <strong>Use platform onboarding</strong>
              <span>New institution? Create your institution portal from the platform site.</span>
            </article>
          </div>

          <div className="auth-action-row">
            {showBackHome ? (
              <Link className="button secondary auth-submit" to="/">
                Back to Home
              </Link>
            ) : null}
            <Link className="button primary auth-submit" to="/request-portal">
              Register Institution
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}

export default TenantPublicStatus;
