import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import "../index.css";

const documents = [
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

function Documents() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filteredDocuments = documents.filter((document) => {
    const matchesSearch = document.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" || document.type === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="documents-page">

      {/* ================= NAVBAR ================= */}

      <nav className="dashboard-nav">

        <Link
          to="/dashboard"
          className="dashboard-logo"
        >
          <span className="logo-dot" />
          DocuMind
        </Link>

        <div className="dashboard-nav-right">

          <Link
            to="/dashboard"
            className="documents-back"
          >
            ← Dashboard
          </Link>

          <Link
            to="/"
            className="dashboard-logout"
          >
            Log out
          </Link>

        </div>

      </nav>


      {/* ================= MAIN ================= */}

      <main className="documents-main">

        {/* ================= HEADER ================= */}

        <section className="documents-page-header">

          <div>

            <span className="section-tag">
              DOCUMENT LIBRARY / 02
            </span>

            <h1>
              Your document
              <span> knowledge space.</span>
            </h1>

            <p>
              Explore your uploaded documents and access
              the information you need.
            </p>

          </div>

          <motion.button
            className="dashboard-primary-button"
            whileHover={{
              y: -4,
              scale: 1.03,
            }}
            whileTap={{
              scale: 0.97,
            }}
          >
            + Upload document
          </motion.button>

        </section>


        {/* ================= SEARCH + FILTER ================= */}

        <section className="documents-toolbar">

          <div className="document-search">

            <span>⌕</span>

            <input
              type="text"
              placeholder="Search your documents..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

          </div>

          <select
            className="document-filter"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value)
            }
          >
            <option value="All">
              All documents
            </option>

            <option value="PDF">
              PDF
            </option>

            <option value="DOCX">
              DOCX
            </option>
          </select>

        </section>


        {/* ================= DOCUMENT COUNT ================= */}

        <div className="documents-library-heading">

          <div>

            <span className="section-tag">
              LIBRARY
            </span>

            <h2>
              All documents
            </h2>

          </div>

          <span className="document-count">
            {filteredDocuments.length}{" "}
            {filteredDocuments.length === 1
              ? "document"
              : "documents"}
          </span>

        </div>


        {/* ================= DOCUMENT LIST ================= */}

        <section className="documents-library-list">

          {filteredDocuments.length > 0 ? (

            filteredDocuments.map((document, index) => (

              <motion.article
                key={document.name}
                className="library-document-card"

                initial={{
                  opacity: 0,
                  y: 30,
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
                  y: -5,
                  scale: 1.01,
                }}
              >

                {/* DOCUMENT ICON */}

                <div className="library-document-icon">
                  <span>◇</span>
                </div>


                {/* DOCUMENT INFORMATION */}

                <div className="library-document-info">

                  <strong>
                    {document.name}
                  </strong>

                  <span>
                    {document.type} · {document.pages} pages
                  </span>

                </div>


                {/* UPDATED TIME */}

                <div className="library-document-date">
                  {document.updated}
                </div>


                {/* OPEN DOCUMENT */}

                <motion.button
                  className="library-document-action"

                  whileHover={{
                    rotate: 8,
                    scale: 1.1,
                  }}

                  whileTap={{
                    scale: 0.9,
                  }}
                >
                  ↗
                </motion.button>

              </motion.article>

            ))

          ) : (

            <motion.div
              className="documents-empty-state"
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
            >
              <div className="empty-icon">
                ⌕
              </div>

              <h3>
                No documents found
              </h3>

              <p>
                Try a different search term or filter.
              </p>
            </motion.div>

          )}

        </section>


        {/* ================= UPLOAD AREA ================= */}

        <section className="document-upload-area">

          <div className="upload-orb">

            <motion.span
              animate={{
                rotate: 360,
                scale: [1, 1.08, 1],
              }}

              transition={{
                rotate: {
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                },

                scale: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            >
              +
            </motion.span>

          </div>


          <div>

            <span className="section-tag">
              EXPAND YOUR KNOWLEDGE
            </span>

            <h2>
              Add another document.
            </h2>

            <p>
              Upload a PDF, DOCX, or text file to expand
              your DocuMind knowledge space.
            </p>

          </div>


          <motion.button
            className="upload-secondary-button"

            whileHover={{
              y: -3,
              scale: 1.02,
            }}

            whileTap={{
              scale: 0.97,
            }}
          >
            Upload document ↗
          </motion.button>

        </section>

      </main>

    </div>
  );
}

export default Documents;