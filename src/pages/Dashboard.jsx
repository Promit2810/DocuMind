import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ThemeToggle from "../components/ThemeToggle";
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
    event.target.value = "";
    if (!file) return;

    const allowedTypes = [".pdf", ".docx", ".txt"];
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedTypes.some((extension) => fileName.endsWith(extension));

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
      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || "Upload failed.");
      }

      setUploadMessage(`${file.name} uploaded and indexed successfully.`);
      await loadDocuments();

      setTimeout(() => {
        navigate("/documents");
      }, 900);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error.message || "Unable to upload document. Make sure backend is running."
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
          <Link to="/chat" className="dashboard-nav-link">
            Ask AI
          </Link>
        </div>

        <div className="dashboard-nav-right">
          <ThemeToggle />

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
            aria-label="Log out"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

      {/* ================= MAIN ================= */}
      <main className="dashboard-main">
        {/* ================= HEADER ================= */}
        <section className="dashboard-header">
          <div className="dashboard-header-content">
            <span className="section-tag">DOCUMENT INTELLIGENCE / 01</span>
            <h1>
              Your documents. <span>One intelligent space.</span>
            </h1>
            <p>
              Upload documents, explore their content, and ask questions using AI-powered retrieval.
            </p>
          </div>

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
              whileHover={!uploading ? { y: -2, scale: 1.02 } : {}}
              whileTap={!uploading ? { scale: 0.98 } : {}}
            >
              <span>{uploading ? "Uploading..." : "+ Upload document"}</span>
              <span>{uploading ? "..." : "↗"}</span>
            </motion.button>
          </div>
        </section>

        {/* ================= UPLOAD STATUS ================= */}
        {(uploadMessage || uploadError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              marginBottom: "24px",
              fontSize: "13.5px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: uploadError ? "var(--danger-subtle)" : "var(--success-subtle)",
              border: `1px solid ${uploadError ? "var(--danger)" : "var(--success)"}`,
              color: uploadError ? "var(--danger)" : "var(--success)",
            }}
          >
            <span>{uploadError ? "⚠" : "✓"}</span>
            <span>{uploadError || uploadMessage}</span>
          </motion.div>
        )}

        {/* ================= STATS ================= */}
        <section className="dashboard-stats">
          <motion.div
            className="stat-card"
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <div className="stat-top">
              <span>DOCUMENTS</span>
              <span className="stat-icon">◇</span>
            </div>
            <div className="stat-value">{documents.length}</div>
            <div className="stat-caption">Stored in your library</div>
          </motion.div>

          <motion.div
            className="stat-card"
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <div className="stat-top">
              <span>QUESTIONS</span>
              <span className="stat-icon">◈</span>
            </div>
            <div className="stat-value">{questionCount}</div>
            <div className="stat-caption">AI questions asked</div>
          </motion.div>

          <motion.div
            className="stat-card"
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <div className="stat-top">
              <span>AI STATUS</span>
              <span className="stat-icon" style={{ color: "var(--success)" }}>●</span>
            </div>
            <div className="stat-value" style={{ fontSize: "22px", color: "var(--success)", display: "flex", alignItems: "center", height: "48px" }}>
              READY
            </div>
            <div className="stat-caption">RAG engine connected</div>
          </motion.div>
        </section>

        {/* ================= ASK DOCUMIND ================= */}
        <motion.section
          className="ask-ai-card"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="ask-ai-left">
            <div className="ask-ai-icon">✦</div>
            <div className="ask-ai-text">
              <h3>Ask DocuMind</h3>
              <p>Ask questions in natural language and receive grounded citations from your documents.</p>
            </div>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/chat")}
          >
            <span>Ask a question</span>
            <span>↗</span>
          </button>
        </motion.section>

        {/* ================= DOCUMENT LIBRARY ================= */}
        <section className="documents-section">
          <div className="section-header-row">
            <h2>Recent documents</h2>
            <Link to="/documents" className="view-all-link">
              View all ↗
            </Link>
          </div>

          <div className="dashboard-docs-grid">
            {documentsLoading ? (
              <div className="empty-state-box" style={{ gridColumn: "1 / -1", padding: "32px", textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading documents...</p>
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
                    : document.indexed
                      ? "Indexed"
                      : "Processing";
                const updatedText = document.updated || "Just now";

                return (
                  <motion.div
                    key={documentName + index}
                    className="doc-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.08 }}
                    whileHover={{ y: -3 }}
                  >
                    <div className="doc-card-header">
                      <div className="doc-badge">{documentType.slice(0, 4)}</div>
                      <div className="doc-info">
                        <div className="doc-title" title={documentName}>{documentName}</div>
                        <div className="doc-meta">{documentType.toUpperCase()} · {pageText} · {updatedText}</div>
                      </div>
                    </div>

                    <div className="doc-card-actions">
                      <button
                        type="button"
                        className="doc-chat-btn"
                        onClick={() => {
                          localStorage.setItem("selectedDocument", JSON.stringify(document));
                          navigate("/chat");
                        }}
                      >
                        Ask AI ↗
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="empty-state-box" style={{ gridColumn: "1 / -1", padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", color: "var(--text-muted)", marginBottom: "8px" }}>⌕</div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>No documents yet</h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Upload a PDF, DOCX, or TXT file to start building your knowledge space.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
