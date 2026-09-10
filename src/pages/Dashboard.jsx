import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "../index.css";

const recentDocuments = [
  {
    name: "Research_Paper.pdf",
    type: "PDF",
    pages: 24,
    updated: "2 min ago",
  },
  {
    name: "Project_Report.docx",
    type: "DOCX",
    pages: 18,
    updated: "1 hour ago",
  },
  {
    name: "Machine_Learning_Notes.pdf",
    type: "PDF",
    pages: 42,
    updated: "Yesterday",
  },
];

function Dashboard() {
  return (
    <div className="dashboard-page">

      {/* ================= NAVBAR ================= */}

      <nav className="dashboard-nav">

        <Link to="/" className="dashboard-logo">
          <span className="logo-dot" />
          <span>DocuMind</span>
        </Link>

        <div className="dashboard-nav-right">

          <span className="dashboard-user">
            Welcome back
          </span>

          <Link
            to="/"
            className="dashboard-logout"
          >
            Log out
          </Link>

        </div>

      </nav>


      {/* ================= MAIN ================= */}

      <main className="dashboard-main">

        {/* ================= HEADER ================= */}

        <section className="dashboard-header">

          <div className="dashboard-header-content">

            <span className="section-tag">
              DOCUMENT INTELLIGENCE / 01
            </span>

            <h1>
              Your documents.
              <span> One intelligent space.</span>
            </h1>

            <p>
              Upload documents, explore their content, and ask
              questions using AI-powered retrieval.
            </p>

          </div>

          <motion.button
            className="dashboard-primary-button"
            whileHover={{
              y: -4,
              scale: 1.02,
            }}
            whileTap={{
              scale: 0.97,
            }}
          >
            <span>+ Upload document</span>
            <span>↗</span>
          </motion.button>

        </section>


        {/* ================= STATS ================= */}

        <section className="dashboard-stats">

          <motion.div
            className="dashboard-stat"
            whileHover={{
              y: -4,
              rotateX: 2,
              rotateY: -2,
            }}
          >
            <span>DOCUMENTS</span>

            <strong>03</strong>

            <small>
              Stored in your library
            </small>
          </motion.div>


          <motion.div
            className="dashboard-stat"
            whileHover={{
              y: -4,
              rotateX: 2,
              rotateY: -2,
            }}
          >
            <span>QUESTIONS</span>

            <strong>12</strong>

            <small>
              AI questions asked
            </small>
          </motion.div>


          <motion.div
            className="dashboard-stat"
            whileHover={{
              y: -4,
              rotateX: 2,
              rotateY: -2,
            }}
          >
            <span>AI STATUS</span>

            <strong className="status-active">
              ● READY
            </strong>

            <small>
              Knowledge space active
            </small>
          </motion.div>

        </section>


        {/* ================= ASK DOCUMIND ================= */}

        <motion.section
          className="ask-ai-card"
          whileHover={{
            y: -4,
          }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 18,
          }}
        >

          <div className="ask-ai-glow" />

          <motion.div
            className="ask-ai-icon"
            animate={{
              rotate: [0, 8, -8, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            ✦
          </motion.div>

          <div className="ask-ai-content">

            <span>
              ASK DOCUMIND
            </span>

            <h2>
              What would you like to know?
            </h2>

            <p>
              Ask questions about the information contained
              in your uploaded documents.
            </p>

          </div>

          <motion.button
            className="ask-ai-button"
            whileHover={{
              x: 4,
            }}
            whileTap={{
              scale: 0.97,
            }}
          >
            <span>Ask a question</span>
            <span>↗</span>
          </motion.button>

        </motion.section>


        {/* ================= DOCUMENT LIBRARY ================= */}

        <section className="documents-section">

          <div className="documents-heading">

            <div>

              <span className="section-tag">
                YOUR LIBRARY / 02
              </span>

              <h2>
                Recent documents
              </h2>

            </div>

            {/* VIEW ALL → DOCUMENT LIBRARY */}

            <motion.div
              whileHover={{
                x: 4,
              }}
            >
              <Link
                to="/documents"
                className="view-all-button"
              >
                View all ↗
              </Link>
            </motion.div>

          </div>


          <div className="documents-list">

            {recentDocuments.map((document, index) => (

              <motion.div
                key={document.name}
                className="document-row"

                initial={{
                  opacity: 0,
                  y: 20,
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                }}

                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                }}

                whileHover={{
                  y: -4,
                  scale: 1.005,
                }}
              >

                {/* Document icon */}

                <div className="document-icon">
                  ◇
                </div>


                {/* Document information */}

                <div className="document-info">

                  <strong>
                    {document.name}
                  </strong>

                  <span>
                    {document.type} · {document.pages} pages
                  </span>

                </div>


                {/* Last updated */}

                <div className="document-updated">
                  {document.updated}
                </div>


                {/* Arrow */}

                <motion.button
                  className="document-arrow"
                  whileHover={{
                    x: 4,
                    y: -4,
                  }}
                >
                  ↗
                </motion.button>

              </motion.div>

            ))}

          </div>

        </section>


        {/* ================= FUTURE AI AREA ================= */}

        <section className="dashboard-ai-preview">

          <div className="dashboard-ai-preview-content">

            <span className="section-tag">
              AI WORKSPACE / 03
            </span>

            <h2>
              Your knowledge,
              <span> ready to explore.</span>
            </h2>

            <p>
              Upload a document and start a conversation with
              its contents. DocuMind will retrieve relevant
              information and connect answers back to their sources.
            </p>

          </div>

          <div className="dashboard-ai-orb">

            <motion.div
              className="dashboard-orb-core"
              animate={{
                scale: [1, 1.12, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                scale: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                rotate: {
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear",
                },
              }}
            >
              ✦
            </motion.div>

            <div className="dashboard-orb-ring ring-one" />
            <div className="dashboard-orb-ring ring-two" />

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;