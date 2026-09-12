import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "../index.css";

const defaultDocuments = [
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
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState(() => {
    const savedDocuments = localStorage.getItem("documind_documents");

    if (savedDocuments) {
      try {
        return JSON.parse(savedDocuments);
      } catch {
        return defaultDocuments;
      }
    }

    return defaultDocuments;
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "documind_documents",
      JSON.stringify(documents)
    );
  }, [documents]);

  const openFilePicker = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

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
      const response = await fetch(
        "http://127.0.0.1:8000/api/documents/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Upload failed."
        );
      }

      const uploadedDocument = {
        name: data.filename || file.name,
        type:
          data.file_type ||
          extension.replace(".", "").toUpperCase(),
        pages: data.pages || "—",
        updated: "Just now",
      };

      setDocuments((previousDocuments) => [
        uploadedDocument,
        ...previousDocuments.filter(
          (document) =>
            document.name !== uploadedDocument.name
        ),
      ]);

      setMessage(
        `✓ ${uploadedDocument.name} uploaded successfully.`
      );
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

  const filteredDocuments = documents.filter((document) => {
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
  });

  return (
    <div className="documents-page">

      {/* HIDDEN FILE INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFileChange}
        style={{ display: "none" }}
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

        {/* MESSAGE */}
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

                    <div className="library-document-icon">
                      <span>◇</span>
                    </div>

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

                    <div className="library-document-date">
                      {updatedText}
                    </div>

                    <motion.button
                      className="library-document-action"
                      whileHover={{
                        rotate: 8,
                        scale: 1.1,
                      }}
                      whileTap={{
                        scale: 0.9,
                      }}
                      onClick={openFilePicker}
                    >
                      ↗
                    </motion.button>

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