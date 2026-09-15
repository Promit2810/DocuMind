import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "../components/ThemeToggle";
import { API_BASE_URL, clearAuth, getStoredUser, getToken } from "../utils/auth";
import "../index.css";

function Documents() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const loadDocuments = async () => {
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

      setDocuments(backendDocuments);
    } catch (error) {
      console.error("Document loading error:", error);
      setDocuments([]);
      setMessage("Could not load documents. Make sure backend is running.");
    }
  };

  useEffect(() => {
    let active = true;

    async function fetchDocuments() {
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
        console.error("Document loading error:", error);
        if (active) {
          setDocuments([]);
          setMessage("Could not load documents. Make sure backend is running.");
        }
      }
    }

    fetchDocuments();

    return () => {
      active = false;
    };
  }, []);

  const openFilePicker = () => {
    if (uploading) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = `.${file.name.split(".").pop().toLowerCase()}`;
    if (![".pdf", ".docx", ".txt"].includes(extension)) {
      setMessage("Only PDF, DOCX, and TXT files are supported.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      const uploadedDocument = {
        name: data.filename || file.name,
        filename: data.filename || file.name,
        type: data.file_type || extension.replace(".", "").toUpperCase(),
        pages: data.pages !== undefined ? data.pages : "—",
        updated: "Just now",
      };

      setDocuments((previousDocuments) => [
        uploadedDocument,
        ...previousDocuments.filter(
          (document) =>
            (document.filename || document.name) !== (uploadedDocument.filename || uploadedDocument.name)
        ),
      ]);

      localStorage.setItem("selectedDocument", JSON.stringify(uploadedDocument));
      setMessage(`✓ ${uploadedDocument.name} uploaded successfully.`);
      await loadDocuments();
    } catch (error) {
      console.error("Upload error:", error);
      setMessage(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDeleteDocument = async (filename, event) => {
    event.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/documents/${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to delete document.");
      }

      setMessage(`✓ "${filename}" deleted successfully.`);
      setDocuments((previous) =>
        previous.filter((doc) => (doc.filename || doc.name) !== filename)
      );

      const stored = localStorage.getItem("selectedDocument");
      if (stored && stored.includes(filename)) {
        localStorage.removeItem("selectedDocument");
      }
    } catch (error) {
      console.error("Delete error:", error);
      setMessage(`Delete failed: ${error.message}`);
    }
  };

  const openDocumentChat = (document) => {
    localStorage.setItem("selectedDocument", JSON.stringify(document));
    navigate("/chat");
  };

  const filteredDocuments = documents.filter((document) => {
    const documentName = document.name || document.filename || "";
    const documentType = document.type || document.file_type || "";
    const matchesSearch = documentName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "All" || documentType.toUpperCase() === filter.toUpperCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="documents-page">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* NAVBAR */}
      <nav className="dashboard-nav">
        <Link to="/dashboard" className="dashboard-logo">
          <span className="logo-dot" />
          <span>DocuMind</span>
        </Link>

        <div className="dashboard-nav-links">
          <Link to="/dashboard" className="dashboard-nav-link">
            Dashboard
          </Link>
          <Link to="/documents" className="dashboard-nav-link active">
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

      {/* MAIN CONTENT */}
      <main className="documents-main">
        {/* HEADER */}
        <section className="dashboard-header">
          <div className="dashboard-header-content">
            <span className="section-tag">DOCUMENT LIBRARY / 02</span>
            <h1>
              Your document <span>knowledge space.</span>
            </h1>
            <p>
              Manage, search, and converse with all indexed files in your private library.
            </p>
          </div>

          <motion.button
            type="button"
            className="dashboard-primary-button"
            onClick={openFilePicker}
            disabled={uploading}
            whileHover={!uploading ? { y: -2, scale: 1.02 } : {}}
            whileTap={!uploading ? { scale: 0.98 } : {}}
          >
            <span>{uploading ? "Uploading..." : "+ Upload document"}</span>
            <span>{uploading ? "..." : "↗"}</span>
          </motion.button>
        </section>

        {/* STATUS MESSAGE */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              marginBottom: "24px",
              fontSize: "13.5px",
              fontWeight: 500,
              background: message.startsWith("✓") ? "var(--success-subtle)" : "var(--danger-subtle)",
              border: `1px solid ${message.startsWith("✓") ? "var(--success)" : "var(--danger)"}`,
              color: message.startsWith("✓") ? "var(--success)" : "var(--danger)",
            }}
          >
            {message}
          </motion.div>
        )}

        {/* SEARCH & FILTER TOOLBAR */}
        <section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "28px",
            flexWrap: "wrap",
          }}
        >
          <div className="search-input-wrapper">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="Search documents by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            {["All", "PDF", "DOCX", "TXT"].map((type) => (
              <button
                key={type}
                type="button"
                className={`filter-pill ${filter === type ? "active" : ""}`}
                onClick={() => setFilter(type)}
              >
                {type === "All" ? "All Formats" : type}
              </button>
            ))}
          </div>
        </section>

        {/* DOCUMENTS GRID */}
        <div className="section-header-row">
          <h2>
            Indexed Documents
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text-muted)",
                marginLeft: "8px",
              }}
            >
              ({filteredDocuments.length})
            </span>
          </h2>
        </div>

        <section className="documents-grid">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((document, index) => {
              const documentName = document.name || document.filename || "Untitled document";
              const documentType = document.type || document.file_type || "FILE";
              const pageText =
                document.pages !== undefined && document.pages !== null
                  ? `${document.pages} pages`
                  : document.indexed
                    ? "Indexed"
                    : "Processing";
              const updatedText = document.updated || "Just now";

              return (
                <motion.article
                  key={`${documentName}-${index}`}
                  className="doc-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -3 }}
                >
                  <div className="doc-card-header">
                    <div className="doc-badge">{documentType.slice(0, 4)}</div>
                    <div className="doc-info">
                      <div className="doc-title" title={documentName}>
                        {documentName}
                      </div>
                      <div className="doc-meta">
                        {documentType.toUpperCase()} · {pageText} · {updatedText}
                      </div>
                    </div>
                  </div>

                  <div className="doc-card-actions">
                    <button
                      type="button"
                      className="doc-delete-btn"
                      onClick={(e) => handleDeleteDocument(documentName, e)}
                      title="Delete document"
                    >
                      Delete
                    </button>

                    <button
                      type="button"
                      className="doc-chat-btn"
                      onClick={() => openDocumentChat(document)}
                      title="Open in Chat"
                    >
                      <span>Ask AI</span>
                      <span>↗</span>
                    </button>
                  </div>
                </motion.article>
              );
            })
          ) : (
            <div className="empty-state-box" style={{ gridColumn: "1 / -1", padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", color: "var(--text-muted)", marginBottom: "12px" }}>⌕</div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
                No documents found
              </h3>
              <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                {search || filter !== "All"
                  ? "Try adjusting your search query or filter."
                  : "Upload your first file to start chatting with your knowledge base."}
              </p>
            </div>
          )}
        </section>

        {/* DROPZONE / QUICK UPLOAD CALLOUT */}
        <section
          className="upload-dropzone"
          style={{ marginTop: "48px" }}
          onClick={openFilePicker}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <h4>Drop more documents or click to upload</h4>
          <p>Supports PDF, DOCX, and TXT files with instant vector indexing</p>
        </section>
      </main>
    </div>
  );
}

export default Documents;
