import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { API_BASE_URL, saveAuth } from "../utils/auth";

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
            email: trimmedEmail,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to create your account. Please try again."
        );
      }

      // Signup returns a JWT, so the new user is logged in
      // immediately after creating the account.
      saveAuth(
        data.access_token,
        data.user,
        true
      );

      navigate("/dashboard", { replace: true });
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
        <section className="auth-card signup-card">
          <div className="auth-intro">
            <span className="auth-eyebrow">
              GET STARTED / 02
            </span>

            <h1>
              Create your
              <span> account.</span>
            </h1>

            <p>
              Start understanding your documents with
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
              <label htmlFor="signup-name">
                Full name
              </label>

              <input
                id="signup-name"
                type="text"
                placeholder="Your name"
                autoComplete="name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                disabled={loading}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="signup-email">
                Email
              </label>

              <input
                id="signup-email"
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
              <label htmlFor="signup-password">
                Password
              </label>

              <input
                id="signup-password"
                type="password"
                placeholder="Create a password"
                autoComplete="new-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                disabled={loading}
                required
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
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? "Creating account..."
                  : "Create account"}
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
