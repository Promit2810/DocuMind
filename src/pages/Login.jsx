import { Link } from "react-router-dom";

export default function Login() {
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
        <section className="auth-card">
          <div className="auth-intro">
            <span className="auth-eyebrow">WELCOME BACK / 01</span>

            <h1>
              Sign in to your
              <span> documents.</span>
            </h1>

            <p>
              Continue exploring your documents with AI-powered intelligence.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="form-field">
              <div className="form-label-row">
                <label htmlFor="login-password">Password</label>

                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => {}}
                >
                  Forgot password?
                </button>
              </div>

              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <label className="remember-row">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>

            <button type="submit" className="auth-submit">
              <span>Sign in</span>
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
            Don't have an account?
            <Link to="/signup">Create account</Link>
          </p>
        </section>

        <Link to="/" className="back-home">
          ← Back to home
        </Link>
      </main>
    </div>
  );
}