import { useState } from "react";
import { Link } from "react-router-dom";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="forgot-page">
      <section className="forgot-card">
        <div className="forgot-icon-wrap">
          <div className="forgot-icon">FP</div>
        </div>
        <h1>{submitted ? "Check your inbox" : "Forgot password?"}</h1>
        <p>
          {submitted
            ? "If an account exists for that email, reset instructions have been prepared for you."
            : "No worries, we'll send you reset instructions to your inbox."}
        </p>

        {!submitted ? (
          <form className="forgot-form" onSubmit={handleSubmit}>
            <label className="forgot-label" htmlFor="forgot-email">
              Email Address
            </label>
            <div className="forgot-input-wrap">
              <span className="forgot-input-icon">EM</span>
              <input
                id="forgot-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your school email"
                type="email"
                value={email}
              />
            </div>
            <button className="button primary forgot-submit" type="submit">
              Send Reset Link
            </button>
          </form>
        ) : (
          <div className="success-panel">
            <strong>Reset link requested</strong>
            <p className="muted">{email || "Your email address"}</p>
          </div>
        )}

        <Link className="forgot-back" to="/login">
          {"<- Back to Login"}
        </Link>
      </section>

      <p className="forgot-footer">© 2024 AlumNet. All rights reserved.</p>
    </div>
  );
}

export default ForgotPasswordPage;
