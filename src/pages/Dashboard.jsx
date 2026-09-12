import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { API_BASE_URL, clearAuth, getStoredUser, getToken } from "../utils/auth";
import "../index.css";

function Dashboard() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [questionCount, setQuestionCount] = useState(() => {
    const saved = Number(localStorage.getItem("documind_question_count") || "0");
    return Number.isFinite(saved) && saved >= 0 ? saved : 0;
  });

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const loadDocuments = async (showLoading = false) => {
    try {
      if (showLoading) {
        setDocumentsLoading(true);
      }
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/documents`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not load documents.");
      }

      const backendDocuments = Array.isArray(data)
        ? data
        : Array.isArray(data.documents)
          ? data.documents
          : [];

      setDocuments(backendDocuments);
    } catch (error) {
      console.error("Dashboard document loading error:", error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function fetchInitialDocuments() {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/documents`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not load documents.");
        }

        const backendDocuments = Array.isArray(data)
          ? data
          : Array.isArray(data.documents)
            ? data.documents
            : [];

        if (active) {
          setDocuments(backendDocuments);
        }
      } catch (error) {
        console.error("Dashboard document loading error:", error);
        if (active) {
          setDocuments([]);
        }
      } finally {
        if (active) {
          setDocumentsLoading(false);
        }
      }
    }

    fetchInitialDocuments();

    const refreshCount = () => {
      const saved = Number(localStorage.getItem("documind_question_count") || "0");
      setQuestionCount(Number.isFinite(saved) && saved >= 0 ? saved : 0);
    };

    window.addEventListener("focus", refreshCount);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshCount);
    };
  }, []);

  // ================= UPLOAD DOCUMENT =================

  const handleUploadClick = () => {
    if (uploading) return;

    setUploadMessage("");
    setUploadError("");

    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    // Reset input so the same file can be selected again later
    event.target.value = "";

    if (!file) return;

    // Supported file types
    const allowedTypes = [".pdf", ".docx", ".txt"];

    const fileName = file.name.toLowerCase();

    const isAllowed = allowedTypes.some((extension) =>
      fileName.endsWith(extension)
    );

    if (!isAllowed) {
      setUploadError("Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    setUploading(true);
    setUploadMessage("");
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/documents/upload`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Upload failed."
        );
      }

      setUploadMessage(
        `${file.name} uploaded and indexed successfully.`
      );

      // Refresh from the backend so the dashboard only shows real documents.
      await loadDocuments();

      // Give the success message a moment to appear,
      // then open the document library.
      setTimeout(() => {
        navigate("/documents");
      }, 900);
    } catch (error) {
      console.error("Upload error:", error);

      setUploadError(
        error.message ||
          "Unable to upload the document. Make sure the backend is running."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="dashboard-page">

      {/* ================= NAVBAR ================= */}

      <nav className="dashboard-nav">

        <Link to="/dashboard" className="dashboard-logo">
          <span className="logo-dot" />
          <span>DocuMind</span>
        </Link>

        <div className="dashboard-nav-links">
          <Link to="/dashboard" className="dashboard-nav-link active">
            Dashboard
          </Link>
          <Link to="/documents" className="dashboard-nav-link">
            Documents
          </Link>
        </div>

        <div className="dashboard-nav-right">

          <div className="dashboard-user-chip" title={currentUser?.email || currentUser?.name || "User"}>
            <span className="dashboard-user-avatar">
              {currentUser?.name ? currentUser.name.trim().charAt(0).toUpperCase() : "U"}
            </span>
            <span className="dashboard-user-name">
              {currentUser?.name || "User"}
            </span>
          </div>

          <button
            type="button"
            className="dashboard-logout-btn"
            onClick={handleLogout}
            title="Log out"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Log out</span>
          </button>

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


          {/* ================= UPLOAD BUTTON ================= */}

          <div className="dashboard-upload-wrapper">

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <motion.button
              type="button"
              className="dashboard-primary-button"
              onClick={handleUploadClick}
              disabled={uploading}
              whileHover={
                !uploading
                  ? {
                      y: -4,
                      scale: 1.02,
                    }
                  : {}
              }
              whileTap={
                !uploading
                  ? {
                      scale: 0.97,
                    }
                  : {}
              }
            >
              <span>
                {uploading
                  ? "Uploading..."
                  : "+ Upload document"}
              </span>

              <span>
                {uploading ? "..." : "↗"}
              </span>
            </motion.button>

          </div>

        </section>


        {/* ================= UPLOAD STATUS ================= */}

        {(uploadMessage || uploadError) && (
          <motion.div
            initial={{
              opacity: 0,
              y: -10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className={
              uploadError
                ? "dashboard-upload-message error"
                : "dashboard-upload-message success"
            }
          >
            {uploadError || uploadMessage}
          </motion.div>
        )}


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

            <strong>{documents.length}</strong>

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

            <strong>{questionCount}</strong>

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
            type="button"
            className="ask-ai-button"
            onClick={() => navigate("/chat")}
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
            {documentsLoading ? (
              <div className="documents-empty-state">
                <h3>Loading documents...</h3>
              </div>
            ) : documents.length > 0 ? (
              documents.slice(0, 3).map((document, index) => {
                const documentName =
                  document.name || document.filename || "Untitled document";
                const documentType =
                  document.type || document.file_type || "FILE";
                const pageText =
                  document.pages !== undefined && document.pages !== null
                    ? `${document.pages} pages`
                    : "Processing";
                const updatedText = document.updated || "Just now";

                return (
                  <motion.div
                    key={documentName}
                    className="document-row"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -4, scale: 1.005 }}
                  >
                    <div className="document-icon">◇</div>

                    <div className="document-info">
                      <strong>{documentName}</strong>
                      <span>
                        {documentType.toUpperCase()} · {pageText}
                      </span>
                    </div>

                    <div className="document-updated">{updatedText}</div>

                    <motion.button
                      type="button"
                      className="document-arrow"
                      onClick={() => navigate("/documents")}
                      whileHover={{ x: 4, y: -4 }}
                    >
                      ↗
                    </motion.button>
                  </motion.div>
                );
              })
            ) : (
              <div className="documents-empty-state">
                <div className="empty-icon">⌕</div>
                <h3>No documents yet</h3>
                <p>
                  Upload a PDF, DOCX, or TXT file to start building your
                  knowledge space.
                </p>
              </div>
            )}
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