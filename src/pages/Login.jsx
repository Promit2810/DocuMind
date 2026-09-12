import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { API_BASE_URL, saveAuth } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to sign in. Please try again."
        );
      }

      saveAuth(
        data.access_token,
        data.user,
        remember
      );

      const destination =
        location.state?.from || "/dashboard";

      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
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
            <span className="auth-eyebrow">
              WELCOME BACK / 01
            </span>

            <h1>
              Sign in to your
              <span> documents.</span>
            </h1>

            <p>
              Continue exploring your documents with
              AI-powered intelligence.
            </p>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >
            <div className="form-field">
              <label htmlFor="login-email">
                Email
              </label>

              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                disabled={loading}
                required
              />
            </div>

            <div className="form-field">
              <div className="form-label-row">
                <label htmlFor="login-password">
                  Password
                </label>

                <button
                  type="button"
                  className="forgot-link"
                  onClick={() =>
                    setError(
                      "Password reset is not available yet."
                    )
                  }
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                disabled={loading}
                required
              />
            </div>

            <label className="remember-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) =>
                  setRemember(event.target.checked)
                }
                disabled={loading}
              />

              <span>Remember me</span>
            </label>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              <span>
                {loading ? "Signing in..." : "Sign in"}
              </span>

              <span className="submit-arrow">
                {loading ? "…" : "↗"}
              </span>
            </button>
          </form>

          <div className="auth-divider">
            <span></span>
            <small>OR</small>
            <span></span>
          </div>

          <button
            type="button"
            className="google-button"
            onClick={() =>
              setError(
                "Google authentication is not connected yet."
              )
            }
            disabled={loading}
          >
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
