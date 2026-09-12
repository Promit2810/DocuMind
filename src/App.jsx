import "./index.css";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Chat from "./pages/Chat";

import DocumentScene from "./components/DocumentScene";
import FeatureCards from "./components/FeatureCards";
import RagPipeline from "./components/RagPipeline";

// =========================
// LANDING PAGE
// =========================

function Landing() {
  return (
    <div className="app">

      {/* ================= NAVBAR ================= */}

      <nav className="navbar">

        <Link to="/" className="logo">
          <span className="logo-dot"></span>
          <span>DocuMind</span>
        </Link>

        <div className="nav-links">

          <a href="#features">
            Features
          </a>

          <a href="#how-it-works">
            How It Works
          </a>

          <a href="#about">
            About
          </a>

        </div>

        <div className="nav-actions">

          {/* Dashboard */}

          <Link
            to="/dashboard"
            className="nav-dashboard"
          >
            Dashboard
          </Link>

          {/* Login */}

          <Link
            to="/login"
            className="nav-login"
          >
            Log in
          </Link>

          {/* Signup */}

          <Link
            to="/signup"
            className="nav-signup"
          >
            Get Started
          </Link>

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


            {/* HERO BUTTONS */}

            <div className="hero-actions">

              <Link
                to="/signup"
                className="primary-button"
              >
                <span>Try DocuMind</span>
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


            {/* HERO META */}

            <div className="hero-meta">

              <span>PDF SUPPORT</span>

              <span>AI-POWERED Q&amp;A</span>

              <span>SOURCE CITATIONS</span>

            </div>

          </div>


          {/* 3D DOCUMENT */}

          <div className="hero-preview">
            <DocumentScene />
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

          <FeatureCards />

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


          {/* SIMPLE STEPS */}

          <div className="steps">

            <div className="step">

              <span>01</span>

              <h3>
                Upload
              </h3>

              <p>
                Add your PDF, document, or text file.
              </p>

            </div>


            <div className="step">

              <span>02</span>

              <h3>
                Ask
              </h3>

              <p>
                Ask questions using natural language.
              </p>

            </div>


            <div className="step">

              <span>03</span>

              <h3>
                Retrieve
              </h3>

              <p>
                Relevant information is retrieved from
                your documents.
              </p>

            </div>


            <div className="step">

              <span>04</span>

              <h3>
                Understand
              </h3>

              <p>
                Receive a grounded answer with sources.
              </p>

            </div>

          </div>


          {/* RAG PIPELINE */}

          <RagPipeline />

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
              to="/signup"
              className="primary-button cta-button"
            >
              <span>Get Started</span>
              <span>↗</span>
            </Link>

          </div>

        </section>

      </main>


      {/* ================= FOOTER ================= */}

      <footer className="footer">

        <div className="footer-brand">

          <Link
            to="/"
            className="logo"
          >
            <span className="logo-dot"></span>
            <span>DocuMind</span>
          </Link>

          <p>
            AI-powered document intelligence.
          </p>

        </div>


        <div className="footer-links">

          <a href="#features">
            Features
          </a>

          <a href="#how-it-works">
            How It Works
          </a>

          <Link to="/dashboard">
            Dashboard
          </Link>

          <Link to="/login">
            Log in
          </Link>

          <Link to="/signup">
            Get Started
          </Link>

        </div>


        <div className="footer-bottom">

          <span>
            © 2026 DocuMind
          </span>

          <span>
            DOCUMENT INTELLIGENCE
          </span>

        </div>

      </footer>

    </div>
  );
}


// =========================
// APP ROUTES
// =========================

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Landing Page */}

        <Route
          path="/"
          element={<Landing />}
        />


        {/* Authentication */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />


        {/* Dashboard */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />


        {/* Document Library */}

        <Route
          path="/documents"
          element={<Documents />}
        />
        <Route path="/chat" element={<Chat />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;