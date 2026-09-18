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

const designDirections = [
  {
    number: "01",
    name: "The Research Desk",
    className: "preview-research",
    eyebrow: "FIELD NOTES / DOCUMENT INTELLIGENCE",
    title: "Find the sentence that matters.",
    detail: "A warm, tactile workspace for serious reading and research.",
    action: "Open the desk",
  },
  {
    number: "02",
    name: "The Quiet Utility",
    className: "preview-utility",
    eyebrow: "DOCUMIND / SEARCH",
    title: "Ask your documents directly.",
    detail: "A clear product-first interface that gets out of the way.",
    action: "Try the search",
  },
  {
    number: "03",
    name: "The Case File",
    className: "preview-casefile",
    eyebrow: "CASE 014 / SOURCE REVIEW",
    title: "Every answer leaves a trail.",
    detail: "A grounded investigation aesthetic built around evidence and citations.",
    action: "Review the finding",
  },
  {
    number: "04",
    name: "The Editorial Magazine",
    className: "preview-editorial",
    eyebrow: "THE DOCUMENT ISSUE / 2026",
    title: "The long read, made searchable.",
    detail: "A confident editorial layout with rhythm, scale, and generous whitespace.",
    action: "Read the issue",
  },
  {
    number: "05",
    name: "The Library Catalogue",
    className: "preview-library",
    eyebrow: "ARCHIVE / 2,408 SOURCES",
    title: "A better way into your own library.",
    detail: "A trustworthy archive system where metadata and provenance lead.",
    action: "Browse the archive",
  },
  {
    number: "06",
    name: "The Annotated Manuscript",
    className: "preview-manuscript",
    eyebrow: "ANNOTATION / LIVE SOURCE MAP",
    title: "Read less. Understand more.",
    detail: "A distinctive manuscript view where answers connect back to the page.",
    action: "Trace an answer",
  },
];

function DesignPreviews() {
  return (
    <div className="design-previews-page">
      <header className="design-previews-header">
        <Link to="/" className="logo">
          <span className="logo-dot"></span>
          <span>DocuMind</span>
        </Link>
        <Link to="/" className="preview-back">Back to landing page</Link>
      </header>

      <main className="design-previews-main">
        <div className="design-previews-intro">
          <span className="section-tag">DIRECTION STUDY / 06</span>
          <h1>Six ways to make<br /><em>documents feel human.</em></h1>
          <p>These are visual directions, not templates. Each one gives DocuMind a different character while keeping the product clear.</p>
        </div>

        <div className="design-preview-grid">
          {designDirections.map((direction) => (
            <article className={`design-preview-card ${direction.className}`} key={direction.number}>
              <div className="design-preview-label">
                <span>{direction.number}</span>
                <strong>{direction.name}</strong>
              </div>
              <div className="design-preview-window">
                <div className="preview-window-nav">
                  <span className="preview-window-mark">●</span>
                  <span>{direction.eyebrow}</span>
                  <span className="preview-window-menu">•••</span>
                </div>
                <div className="preview-window-content">
                  <span className="preview-window-kicker">{direction.eyebrow}</span>
                  <h2>{direction.title}</h2>
                  <p>{direction.detail}</p>
                  <button type="button">{direction.action} <span>↗</span></button>
                </div>
                <div className="preview-document-sheet">
                  <span className="preview-sheet-title">Q4 research notes</span>
                  <span className="preview-sheet-line"></span>
                  <span className="preview-sheet-line short"></span>
                  <span className="preview-sheet-highlight"></span>
                  <span className="preview-sheet-line"></span>
                  <span className="preview-sheet-line medium"></span>
                  <span className="preview-sheet-citation">SOURCE / 04</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
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
              CASE 014 / SOURCE REVIEW
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
              EVIDENCE / 02
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
              METHOD / 03
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
              OPEN CASE / 04
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
          <Route path="/design-previews" element={<DesignPreviews />} />

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
