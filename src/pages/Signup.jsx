import { Link } from "react-router-dom";

export default function Signup() {
  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <div className="auth-page">
      <Link to="/" className="auth-brand">
        <span className="auth-brand-dot"></span>
        <span>DocuMind</span>
      </Link>

      <main className="auth-container">
        <section className="auth-card signup-card">
          <div className="auth-intro">
            <span className="auth-eyebrow">GET STARTED / 02</span>

            <h1>
              Create your
              <span> account.</span>
            </h1>

            <p>
              Start understanding your documents with AI-powered intelligence.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                type="text"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

            <div className="form-field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="form-field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                placeholder="Create a password"
                autoComplete="new-password"
              />
            </div>

            <div className="form-field">
              <label htmlFor="signup-confirm-password">
                Confirm password
              </label>

              <input
                id="signup-confirm-password"
                type="password"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="auth-submit">
              <span>Create account</span>
              <span className="submit-arrow">↗</span>
            </button>
          </form>

          <div className="auth-divider">
            <span></span>
            <small>OR</small>
            <span></span>
          </div>

          <button type="button" className="google-button">
            <span className="google-icon">G</span>
            <span>Continue with Google</span>
          </button>

          <p className="auth-switch">
            Already have an account?
            <Link to="/login">Sign in</Link>
          </p>
        </section>

        <Link to="/" className="back-home">
          ← Back to home
        </Link>
      </main>
    </div>
  );
}