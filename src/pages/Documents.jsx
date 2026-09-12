import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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

  // Load documents from backend
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
      setMessage("Could not load documents. Make sure the backend is running.");
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
          setMessage("Could not load documents. Make sure the backend is running.");
        }
      }
    }

    fetchDocuments();

    return () => {
      active = false;
    };
  }, []);

  // Open Windows file picker
  const openFilePicker = () => {
    if (uploading) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Handle selected file
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const extension = `.${file.name
      .split(".")
      .pop()
      .toLowerCase()}`;

    // Validate file type
    if (![".pdf", ".docx", ".txt"].includes(extension)) {
      setMessage(
        "Only PDF, DOCX, and TXT files are supported."
      );

      event.target.value = "";
      return;
    }

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
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
          data.detail || "Upload failed."
        );
      }

      // Create document entry
      const uploadedDocument = {
        name: data.filename || file.name,
        filename: data.filename || file.name,

        type:
          data.file_type ||
          extension.replace(".", "").toUpperCase(),

        pages:
          data.pages !== undefined
            ? data.pages
            : "—",

        updated: "Just now",
      };

      // Add uploaded document to the top
      setDocuments((previousDocuments) => [
        uploadedDocument,
        ...previousDocuments.filter(
          (document) =>
            (document.filename || document.name) !== (uploadedDocument.filename || uploadedDocument.name)
        ),
      ]);

      // Save selected document for Chat page
      localStorage.setItem(
        "selectedDocument",
        JSON.stringify(uploadedDocument)
      );

      setMessage(
        `✓ ${uploadedDocument.name} uploaded successfully.`
      );

      await loadDocuments();
    } catch (error) {
      console.error("Upload error:", error);

      setMessage(
        `Upload failed: ${error.message}`
      );
    } finally {
      setUploading(false);

      // Allow selecting the same file again
      event.target.value = "";
    }
  };

  // Delete document
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
        previous.filter(
          (doc) => (doc.filename || doc.name) !== filename
        )
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

  // Open selected document in Chat
  const openDocumentChat = (document) => {
    localStorage.setItem(
      "selectedDocument",
      JSON.stringify(document)
    );

    navigate("/chat");
  };

  // Search + filter
  const filteredDocuments = documents.filter(
    (document) => {
      const documentName =
        document.name ||
        document.filename ||
        "";

      const documentType =
        document.type ||
        document.file_type ||
        "";

      const matchesSearch = documentName
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" ||
        documentType.toUpperCase() ===
          filter.toUpperCase();

      return matchesSearch && matchesFilter;
    }
  );

  return (
    <div className="documents-page">

      {/* HIDDEN FILE INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={handleFileChange}
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* NAVBAR */}
      <nav className="dashboard-nav">

        <Link
          to="/dashboard"
          className="dashboard-logo"
        >
          <span className="logo-dot"></span>
          DocuMind
        </Link>

        <div className="dashboard-nav-links">
          <Link to="/dashboard" className="dashboard-nav-link">
            Dashboard
          </Link>
          <Link to="/documents" className="dashboard-nav-link active">
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

      {/* MAIN */}
      <main className="documents-main">

        {/* HEADER */}
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
            type="button"
            className="dashboard-primary-button"
            onClick={openFilePicker}
            disabled={uploading}
            whileHover={
              uploading
                ? {}
                : {
                    y: -4,
                    scale: 1.03,
                  }
            }
            whileTap={
              uploading
                ? {}
                : {
                    scale: 0.97,
                  }
            }
          >
            {uploading
              ? "Uploading..."
              : "+ Upload document"}
          </motion.button>

        </section>

        {/* UPLOAD MESSAGE */}
        {message && (
          <motion.div
            className="document-upload-message"
            initial={{
              opacity: 0,
              y: -10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >
            {message}
          </motion.div>
        )}

        {/* SEARCH + FILTER */}
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

            <option value="TXT">
              TXT
            </option>
          </select>

        </section>

        {/* LIBRARY HEADING */}
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

        {/* DOCUMENT LIST */}
        <section className="documents-library-list">

          {filteredDocuments.length > 0 ? (

            filteredDocuments.map(
              (document, index) => {

                const documentName =
                  document.name ||
                  document.filename ||
                  "Untitled document";

                const documentType =
                  document.type ||
                  document.file_type ||
                  "FILE";

                const pageText =
                  document.pages !== undefined
                    ? `${document.pages} pages`
                    : "Processing";

                const updatedText =
                  document.updated ||
                  "Just now";

                return (
                  <motion.article
                    key={`${documentName}-${index}`}
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

                    {/* Document icon */}
                    <div className="library-document-icon">
                      <span>◇</span>
                    </div>

                    {/* Document information */}
                    <div className="library-document-info">

                      <strong>
                        {documentName}
                      </strong>

                      <span>
                        {documentType.toUpperCase()}
                        {" · "}
                        {pageText}
                      </span>

                    </div>

                    {/* Last updated */}
                    <div className="library-document-date">
                      {updatedText}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {/* Delete Document */}
                      <motion.button
                        type="button"
                        className="library-document-action"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(event) =>
                          handleDeleteDocument(documentName, event)
                        }
                        title="Delete this document"
                        style={{
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          color: "#f87171",
                        }}
                      >
                        ✕
                      </motion.button>

                      {/* Open Chat */}
                      <motion.button
                        type="button"
                        className="library-document-action"

                        whileHover={{
                          rotate: 8,
                          scale: 1.1,
                        }}

                        whileTap={{
                          scale: 0.9,
                        }}

                        onClick={() =>
                          openDocumentChat(document)
                        }

                        title="Chat with this document"
                      >
                        ↗
                      </motion.button>
                    </div>

                  </motion.article>
                );
              }
            )

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

        {/* UPLOAD AREA */}
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
            type="button"
            className="upload-secondary-button"
            onClick={openFilePicker}
            disabled={uploading}

            whileHover={
              uploading
                ? {}
                : {
                    y: -3,
                    scale: 1.02,
                  }
            }

            whileTap={
              uploading
                ? {}
                : {
                    scale: 0.97,
                  }
            }
          >
            {uploading
              ? "Uploading..."
              : "Upload document ↗"}
          </motion.button>

        </section>

      </main>

    </div>
  );
}

export default Documents;