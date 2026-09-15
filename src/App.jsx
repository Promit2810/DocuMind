import "./index.css";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";

import ThemeToggle from "./components/ThemeToggle";
import { initTheme } from "./utils/theme";

import {
  clearAuth,
  getCurrentUser,
  getStoredUser,
  getToken,
} from "./utils/auth";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Documents = lazy(() => import("./pages/Documents"));
const Chat = lazy(() => import("./pages/Chat"));
const DocumentScene = lazy(() => import("./components/DocumentScene"));
const FeatureCards = lazy(() => import("./components/FeatureCards"));
const RagPipeline = lazy(() => import("./components/RagPipeline"));

function LoadingFallback({ compact = false }) {
  return (
    <div className={compact ? "loading-fallback loading-fallback-compact" : "loading-fallback"}>
      <span>Loading DocuMind...</span>
    </div>
  );
}

// =========================
// AUTH GUARD
// =========================

function ProtectedRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    async function verifyAuthentication() {
      if (!getToken()) {
        if (active) setStatus("unauthenticated");
        return;
      }

      try {
        const user = await getCurrentUser();

        if (!active) return;

        setStatus(user ? "authenticated" : "unauthenticated");
      } catch {
        clearAuth();

        if (active) {
          setStatus("unauthenticated");
        }
      }
    }

    verifyAuthentication();

    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="auth-page">
        <main className="auth-container">
          <section className="auth-card">
            <div className="auth-intro">
              <span className="auth-eyebrow">DOCUMIND / AUTH</span>
              <h1>
                Checking your
                <span> session.</span>
              </h1>
              <p>Please wait while we verify your account.</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}

// =========================
// PUBLIC AUTH ROUTE
// =========================

function PublicAuthRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      if (!getToken()) {
        if (active) setStatus("guest");
        return;
      }

      try {
        const user = await getCurrentUser();

        if (!active) return;

        setStatus(user ? "authenticated" : "guest");
      } catch {
        clearAuth();

        if (active) {
          setStatus("guest");
        }
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="auth-page">
        <main className="auth-container">
          <section className="auth-card">
            <div className="auth-intro">
              <span className="auth-eyebrow">DOCUMIND / AUTH</span>
              <h1>
                Checking your
                <span> session.</span>
              </h1>
              <p>Please wait.</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// =========================
// LANDING PAGE
// =========================

function Landing() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    navigate("/");
  };

  return (
    <div className="app">
      {/* ================= NAVBAR ================= */}

      <nav className="navbar">
        <Link to="/" className="logo">
          <span className="logo-dot"></span>
          <span>DocuMind</span>
        </Link>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-actions">
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/dashboard" className="nav-dashboard">
                Dashboard
              </Link>

              <button
                type="button"
                className="nav-login"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-login">
                Log in
              </Link>

              <Link to="/signup" className="nav-signup">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ================= MAIN ================= */}

      <main>
        {/* ================= HERO ================= */}

        <section className="hero">
          <div className="hero-content">
            <div className="hero-kicker">
              DOCUMENT INTELLIGENCE / 01
            </div>

            <h1>
              Understand your
              <span> documents.</span>
            </h1>

            <p className="hero-description">
              Ask questions, discover insights, and get
              AI-powered answers grounded in your documents.
            </p>

            <div className="hero-actions">
              <Link
                to={user ? "/dashboard" : "/signup"}
                className="primary-button"
              >
                <span>{user ? "Open DocuMind" : "Try DocuMind"}</span>
                <span>↗</span>
              </Link>

              <a
                href="#how-it-works"
                className="secondary-button"
              >
                See how it works
                <span>↓</span>
              </a>
            </div>

            <div className="hero-meta">
              <span>PDF SUPPORT</span>
              <span>AI-POWERED Q&amp;A</span>
              <span>SOURCE CITATIONS</span>
            </div>
          </div>

          <div className="hero-preview">
            <Suspense fallback={<LoadingFallback compact />}>
              <DocumentScene />
            </Suspense>
          </div>
        </section>

        {/* ================= FEATURES ================= */}

        <section
          className="features-section"
          id="features"
        >
          <div className="section-heading">
            <span className="section-tag">
              CAPABILITIES / 02
            </span>

            <h2>
              Intelligence built
              <span> around your documents.</span>
            </h2>

            <p>
              DocuMind transforms static documents into an
              intelligent knowledge space.
            </p>
          </div>

          <Suspense fallback={<LoadingFallback />}>
            <FeatureCards />
          </Suspense>
        </section>

        {/* ================= HOW IT WORKS ================= */}

        <section
          className="how-section"
          id="how-it-works"
        >
          <div className="section-heading">
            <span className="section-tag">
              HOW IT WORKS / 03
            </span>

            <h2>
              From document to answer
              <span> in seconds.</span>
            </h2>

            <p>
              DocuMind uses retrieval-augmented generation
              to find relevant information before generating
              an answer.
            </p>
          </div>

          <div className="steps">
            <div className="step">
              <span>01</span>
              <h3>Upload</h3>
              <p>Add your PDF, document, or text file.</p>
            </div>

            <div className="step">
              <span>02</span>
              <h3>Ask</h3>
              <p>Ask questions using natural language.</p>
            </div>

            <div className="step">
              <span>03</span>
              <h3>Retrieve</h3>
              <p>
                Relevant information is retrieved from
                your documents.
              </p>
            </div>

            <div className="step">
              <span>04</span>
              <h3>Understand</h3>
              <p>
                Receive a grounded answer with sources.
              </p>
            </div>
          </div>

          <Suspense fallback={<LoadingFallback />}>
            <RagPipeline />
          </Suspense>
        </section>

        {/* ================= CTA ================= */}

        <section
          className="cta-section"
          id="about"
        >
          <div className="cta-content">
            <span className="section-tag">
              START EXPLORING / 04
            </span>

            <h2>
              Your documents.
              <span> Now intelligent.</span>
            </h2>

            <p>
              Upload your first document and start
              asking questions with DocuMind.
            </p>

            <Link
              to={user ? "/dashboard" : "/signup"}
              className="primary-button cta-button"
            >
              <span>{user ? "Open Dashboard" : "Get Started"}</span>
              <span>↗</span>
            </Link>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}

      <footer className="footer">
        <div className="footer-brand">
          <Link to="/" className="logo">
            <span className="logo-dot"></span>
            <span>DocuMind</span>
          </Link>

          <p>AI-powered document intelligence.</p>
        </div>

        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Get Started</Link>
        </div>

        <div className="footer-bottom">
          <span>© 2026 DocuMind</span>
          <span>DOCUMENT INTELLIGENCE</span>
        </div>
      </footer>
    </div>
  );
}

// =========================
// APP ROUTES
// =========================

function App() {
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route
            path="/login"
            element={
              <PublicAuthRoute>
                <Login />
              </PublicAuthRoute>
            }
          />

          <Route
            path="/signup"
            element={
              <PublicAuthRoute>
                <Signup />
              </PublicAuthRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
