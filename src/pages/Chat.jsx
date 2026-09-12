import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "../index.css";

function Chat() {
  return (
    <div className="chat-page">

      {/* NAVBAR */}
      <nav className="dashboard-nav">
        <Link to="/dashboard" className="dashboard-logo">
          <span className="logo-dot"></span>
          DocuMind
        </Link>

        <div className="dashboard-nav-right">
          <Link to="/documents" className="documents-back">
            Documents
          </Link>

          <Link to="/dashboard" className="documents-back">
            ← Dashboard
          </Link>

          <Link to="/" className="dashboard-logout">
            Log out
          </Link>
        </div>
      </nav>

      {/* MAIN */}
      <main className="chat-main">

        {/* HEADER */}
        <section className="chat-header">
          <div>
            <span className="section-tag">
              AI DOCUMENT Q&amp;A / 03
            </span>

            <h1>
              Ask your
              <span> documents.</span>
            </h1>

            <p>
              Ask questions in natural language and get answers
              grounded in your uploaded documents.
            </p>
          </div>

          <div className="chat-status">
            <span className="status-dot"></span>
            AI READY
          </div>
        </section>

        {/* CHAT AREA */}
        <section className="chat-container">

          {/* SELECTED DOCUMENT */}
          <div className="chat-document-bar">
            <div className="chat-document-icon">
              ◇
            </div>

            <div>
              <strong>Research_Paper.pdf</strong>
              <span>PDF · 24 pages</span>
            </div>

            <button className="change-document">
              Change
            </button>
          </div>

          {/* MESSAGES */}
          <div className="chat-messages">

            <motion.div
              className="chat-welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="chat-orb">
                ✦
              </div>

              <h2>
                What would you like to know?
              </h2>

              <p>
                Ask anything about your document and DocuMind
                will find the relevant information for you.
              </p>
            </motion.div>

            {/* EXAMPLE QUESTIONS */}
            <div className="example-questions">

              <button>
                What is the main objective of this research?
              </button>

              <button>
                Summarize the key findings.
              </button>

              <button>
                What methodology was used?
              </button>

            </div>

          </div>

          {/* INPUT */}
          <div className="chat-input-area">

            <div className="chat-input-wrapper">

              <input
                type="text"
                placeholder="Ask a question about your document..."
              />

              <motion.button
                className="chat-send-button"
                whileHover={{
                  scale: 1.05,
                  y: -2,
                }}
                whileTap={{
                  scale: 0.95,
                }}
              >
                ↗
              </motion.button>

            </div>

            <span className="chat-input-hint">
              DocuMind answers using information retrieved from your documents.
            </span>

          </div>

        </section>

      </main>
    </div>
  );
}

export default Chat;