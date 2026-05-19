import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Auth.css";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="auth-shell">
      <section className="auth-grid auth-grid-compact">
        <aside className="auth-aside">
          <p className="auth-eyebrow">Recovery</p>
          <h1>Reset your portal password with confidence.</h1>
          <p className="auth-lead">
            Use your registered email address and we will prepare the next step for account recovery.
          </p>

          <div className="auth-highlight-list compact">
            <article>
              <strong>Secure process</strong>
              <span>Password activation and reset flows stay email-based for verified users only.</span>
            </article>
            <article>
              <strong>Institute safe</strong>
              <span>Only approved accounts can continue into the institute portal.</span>
            </article>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-header">
            <p className="auth-panel-kicker">Forgot password</p>
            <h2>{submitted ? "Check your inbox" : "Request a reset link"}</h2>
            <p>
              {submitted
                ? "If an account exists for that email, reset instructions have been prepared for you."
                : "No worries. Enter your email and we will prepare the recovery flow."}
            </p>
          </div>

          {!submitted ? (
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>Email address</span>
                <input
                  id="forgot-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your school email"
                  type="email"
                  value={email}
                />
              </label>
              <button className="button primary auth-submit" type="submit">
                Send Reset Link
              </button>
            </form>
          ) : (
            <div className="auth-alert auth-alert-success auth-alert-large">
              <strong>Reset link requested</strong>
              <span>{email || "Your email address"}</span>
            </div>
          )}

          <div className="auth-panel-footer auth-panel-footer-left">
            <Link className="auth-inline-link" to="/login">
              Back to Login
            </Link>
          </div>
        </section>
      </section>

      <footer className="auth-footer">
        <p>© 2026 AlumNet. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default ForgotPasswordPage;
