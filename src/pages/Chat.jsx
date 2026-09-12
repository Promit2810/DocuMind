import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { API_BASE_URL, clearAuth, getStoredUser, getToken } from "../utils/auth";
import "../index.css";

function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  // ============================================================
  // GET SELECTED DOCUMENT
  // ============================================================

  const getStoredDocument = () => {
    const stored = localStorage.getItem("selectedDocument");

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored);
    } catch {
      return stored;
    }
  };

  const [selectedDocument, setSelectedDocument] = useState(() => {
    return location.state?.document || getStoredDocument();
  });

  // ============================================================
  // KEEP DOCUMENT IN SYNC WITH ROUTER STATE
  // ============================================================

  useEffect(() => {
    if (location.state?.document) {
      setSelectedDocument(location.state.document);
    }
  }, [location.state?.document]);

  // ============================================================
  // EXTRACT DOCUMENT NAME SAFELY
  // ============================================================

  const getDocumentName = (document) => {
    if (!document) {
      return "";
    }

    // ----------------------------------------------------------
    // Document is already a string
    // ----------------------------------------------------------

    if (typeof document === "string") {
      const value = document.trim();

      if (!value) {
        return "";
      }

      // Sometimes localStorage contains a JSON object
      // serialized as a string.
      if (
        (value.startsWith("{") && value.endsWith("}")) ||
        (value.startsWith("[") && value.endsWith("]"))
      ) {
        try {
          const parsed = JSON.parse(value);
          return getDocumentName(parsed);
        } catch {
          return value;
        }
      }

      return value;
    }

    // ----------------------------------------------------------
    // Document is an object
    // ----------------------------------------------------------

    if (typeof document === "object") {
      const possibleName =
        document.name ||
        document.filename ||
        document.file_name ||
        document.original_name;

      if (
        typeof possibleName === "string" &&
        possibleName.trim()
      ) {
        const value = possibleName.trim();

        // Handle accidentally nested JSON strings.
        if (
          (value.startsWith("{") && value.endsWith("}")) ||
          (value.startsWith("[") && value.endsWith("]"))
        ) {
          try {
            return getDocumentName(JSON.parse(value));
          } catch {
            return "";
          }
        }

        return value;
      }
    }

    return "";
  };

  const documentName = getDocumentName(selectedDocument);

  // ============================================================
  // CHAT HISTORY PERSISTENCE
  // ============================================================

  const CHAT_HISTORY_KEY = "documind_chat_history";

  const getChatHistory = (filename) => {
    if (!filename) {
      return [];
    }

    const key = `${currentUser?.id || "guest"}_${filename}`;

    try {
      const stored = localStorage.getItem(CHAT_HISTORY_KEY);

      if (!stored) {
        return [];
      }

      const history = JSON.parse(stored);

      if (
        !history ||
        typeof history !== "object" ||
        Array.isArray(history)
      ) {
        return [];
      }

      return Array.isArray(history[key])
        ? history[key]
        : [];
    } catch (error) {
      console.error("Failed to load chat history:", error);
      return [];
    }
  };

  const saveChatHistory = (filename, chatMessages) => {
    if (!filename) {
      return;
    }

    const key = `${currentUser?.id || "guest"}_${filename}`;

    try {
      const stored = localStorage.getItem(CHAT_HISTORY_KEY);

      let history = {};

      if (stored) {
        const parsed = JSON.parse(stored);

        if (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          history = parsed;
        }
      }

      history[key] = chatMessages;

      localStorage.setItem(
        CHAT_HISTORY_KEY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  };

  // ============================================================
  // STATE
  // ============================================================

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const previousDocumentRef = useRef(null);

  // ============================================================
  // LOAD CHAT HISTORY WHEN DOCUMENT CHANGES
  // ============================================================

  useEffect(() => {
    if (!documentName) {
      setMessages([]);
      setQuestion("");
      previousDocumentRef.current = null;
      return;
    }

    const history = getChatHistory(documentName);

    setMessages(history);
    setQuestion("");

    previousDocumentRef.current = documentName;
  }, [documentName]);

  // ============================================================
  // SAVE CHAT HISTORY WHEN MESSAGES CHANGE
  // ============================================================

  useEffect(() => {
    if (!documentName) {
      return;
    }

    saveChatHistory(documentName, messages);
  }, [messages, documentName]);

  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  // ============================================================
  // CLEAN AI RESPONSE
  // ============================================================

  const cleanAIResponse = (text) => {
    if (!text) {
      return "";
    }

    let cleaned = String(text);

    // ----------------------------------------------------------
    // Convert escaped newlines/tabs
    // ----------------------------------------------------------

    cleaned = cleaned.replace(/\\r\\n/g, "\n");
    cleaned = cleaned.replace(/\\n/g, "\n");
    cleaned = cleaned.replace(/\\r/g, "\n");
    cleaned = cleaned.replace(/\\t/g, "    ");

    // ----------------------------------------------------------
    // Remove escaped quotes
    // ----------------------------------------------------------

    cleaned = cleaned.replace(/\\"/g, '"');

    // ----------------------------------------------------------
    // Fix common UTF-8 encoding artifacts
    // ----------------------------------------------------------

    cleaned = cleaned.replace(/â€“/g, "–");
    cleaned = cleaned.replace(/â€”/g, "—");
    cleaned = cleaned.replace(/â€™/g, "’");
    cleaned = cleaned.replace(/â€˜/g, "‘");
    cleaned = cleaned.replace(/â€œ/g, "“");
    cleaned = cleaned.replace(/â€ /g, "”");
    cleaned = cleaned.replace(/â€¦/g, "…");

    // PDF extraction artifacts
    cleaned = cleaned.replace(/[\ufffd\uFFFD]/g, "");
    cleaned = cleaned.replace(/\?_([–—-])\?_/g, " $1 ");
    cleaned = cleaned.replace(/\?_\?\?_/g, "–");
    cleaned = cleaned.replace(/\?_/g, " ");
    cleaned = cleaned.replace(/[\u2022\u25E6]/g, "•");

    // ----------------------------------------------------------
    // Remove LaTeX inline delimiters
    // ----------------------------------------------------------

    cleaned = cleaned.replace(
      /\\\(([\s\S]*?)\\\)/g,
      "$1"
    );

    // ----------------------------------------------------------
    // Remove LaTeX display delimiters
    // ----------------------------------------------------------

    cleaned = cleaned.replace(
      /\\\[([\s\S]*?)\\\]/g,
      "$1"
    );

    // ----------------------------------------------------------
    // Convert common LaTeX commands
    // ----------------------------------------------------------

    cleaned = cleaned.replace(
      /\\textbf\{([^}]*)\}/g,
      "**$1**"
    );

    cleaned = cleaned.replace(
      /\\textit\{([^}]*)\}/g,
      "*$1*"
    );

    cleaned = cleaned.replace(
      /\\mathrm\{([^}]*)\}/g,
      "$1"
    );

    // ----------------------------------------------------------
    // Clean excessive blank lines
    // ----------------------------------------------------------

    cleaned = cleaned.replace(/\n{4,}/g, "\n\n");

    return cleaned.trim();
  };

  // ============================================================
  // CLEAN SOURCE LIST
  // ============================================================

  const cleanSources = (sources) => {
    if (!Array.isArray(sources)) {
      return [];
    }

    const unique = [];
    const seen = new Set();

    sources.forEach((source) => {
      if (!source || typeof source !== "object") {
        return;
      }

      const section = String(
        source.section || "GENERAL"
      )
        .trim()
        .toUpperCase();

      const page =
        source.page !== null &&
        source.page !== undefined &&
        String(source.page).trim()
          ? String(source.page).trim()
          : "";

      const key = `${section}-${page}`;

      if (!seen.has(key)) {
        seen.add(key);

        unique.push({
          section,
          page,
        });
      }
    });

    return unique.slice(0, 3);
  };

  // ============================================================
  // ASK QUESTION
  // ============================================================

  const askQuestion = async (questionText = question) => {
    const trimmedQuestion = String(questionText).trim();

    // ----------------------------------------------------------
    // Validation
    // ----------------------------------------------------------

    if (!trimmedQuestion || loading) {
      return;
    }

    if (!documentName) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          type: "error",
          text: "Please select a document before asking a question.",
        },
      ]);

      return;
    }

    // ----------------------------------------------------------
    // USER MESSAGE
    // ----------------------------------------------------------

    const userMessage = {
      id: `${Date.now()}-user`,
      type: "user",
      text: trimmedQuestion,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setQuestion("");
    setLoading(true);

    try {
      // --------------------------------------------------------
      // BACKEND REQUEST
      // --------------------------------------------------------

      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/ask`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },

          body: JSON.stringify({
            filename: documentName,
            question: trimmedQuestion,
          }),
        }
      );

      // --------------------------------------------------------
      // HANDLE RESPONSE
      // --------------------------------------------------------

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      // --------------------------------------------------------
      // HANDLE BACKEND ERROR
      // --------------------------------------------------------

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Failed to get an answer from DocuMind."
        );
      }

      // --------------------------------------------------------
      // AI ANSWER
      // --------------------------------------------------------

      const answer =
        cleanAIResponse(data?.answer) ||
        "No answer was returned for this question.";

      // Increment question count for dashboard
      try {
        const count = Number(
          localStorage.getItem("documind_question_count") || "0"
        );
        localStorage.setItem(
          "documind_question_count",
          String(count + 1)
        );
      } catch {
        // ignore storage errors
      }

      // --------------------------------------------------------
      // AI MESSAGE
      // --------------------------------------------------------

      const aiMessage = {
        id: `${Date.now()}-ai`,
        type: "ai",
        text: answer,
        sources: cleanSources(data?.sources || []),
      };

      setMessages((prev) => [
        ...prev,
        aiMessage,
      ]);
    } catch (error) {
      console.error(
        "DocuMind chat error:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          type: "error",
          text:
            error?.message ||
            "Something went wrong while connecting to DocuMind.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ENTER KEY
  // ============================================================

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (
        !loading &&
        question.trim() &&
        documentName
      ) {
        askQuestion();
      }
    }
  };

  // ============================================================
  // GENERIC EXAMPLE QUESTIONS
  // ============================================================

  const exampleQuestions = [
    "What is this document about?",
    "Summarize the main points.",
    "What are the key concepts discussed?",
  ];

  // ============================================================
  // USE EXAMPLE QUESTION
  // ============================================================

  const handleExampleQuestionClick = (text) => {
    if (loading) {
      return;
    }

    setQuestion(text);
  };

  // ============================================================
  // MARKDOWN COMPONENTS
  // ============================================================

  const markdownComponents = {
    p: ({ children }) => (
      <p
        style={{
          margin: "0 0 12px",
          lineHeight: "1.75",
        }}
      >
        {children}
      </p>
    ),

    strong: ({ children }) => (
      <strong>{children}</strong>
    ),

    em: ({ children }) => (
      <em>{children}</em>
    ),

    ul: ({ children }) => (
      <ul
        style={{
          margin: "8px 0 14px 20px",
          paddingLeft: "18px",
        }}
      >
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol
        style={{
          margin: "8px 0 14px 20px",
          paddingLeft: "18px",
        }}
      >
        {children}
      </ol>
    ),

    li: ({ children }) => (
      <li
        style={{
          marginBottom: "7px",
          paddingLeft: "3px",
          lineHeight: "1.65",
        }}
      >
        {children}
      </li>
    ),

    h1: ({ children }) => (
      <h3
        style={{
          margin: "4px 0 12px",
        }}
      >
        {children}
      </h3>
    ),

    h2: ({ children }) => (
      <h3
        style={{
          margin: "4px 0 12px",
        }}
      >
        {children}
      </h3>
    ),

    h3: ({ children }) => (
      <h4
        style={{
          margin: "4px 0 10px",
        }}
      >
        {children}
      </h4>
    ),

    blockquote: ({ children }) => (
      <blockquote
        style={{
          margin: "12px 0",
          paddingLeft: "14px",
          borderLeft:
            "2px solid rgba(139, 92, 246, 0.6)",
          opacity: 0.9,
        }}
      >
        {children}
      </blockquote>
    ),

    code: ({ children, className }) => {
      const isBlock =
        className?.includes("language-");

      if (isBlock) {
        return (
          <pre
            style={{
              overflowX: "auto",
              padding: "14px 16px",
              margin: "12px 0",
              borderRadius: "10px",
              background:
                "rgba(255,255,255,0.04)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            <code
              style={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: "0.9em",
              }}
            >
              {children}
            </code>
          </pre>
        );
      }

      return (
        <code
          style={{
            padding: "2px 6px",
            borderRadius: "5px",
            background:
              "rgba(139, 92, 246, 0.12)",
            border:
              "1px solid rgba(139, 92, 246, 0.22)",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "0.9em",
          }}
        >
          {children}
        </code>
      );
    },

    pre: ({ children }) => (
      <div
        style={{
          margin: "10px 0",
          overflowX: "auto",
        }}
      >
        {children}
      </div>
    ),

    hr: () => (
      <hr
        style={{
          border: 0,
          borderTop:
            "1px solid rgba(255,255,255,0.08)",
          margin: "16px 0",
        }}
      />
    ),
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="chat-page">

      {/* ======================================================
          NAVBAR
      ====================================================== */}

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

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="chat-main">

        {/* ====================================================
            HEADER
        ==================================================== */}

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
              Ask questions in natural language and get
              answers grounded in your uploaded documents.
            </p>

          </div>

          <div className="chat-status">

            <span className="status-dot"></span>

            AI READY

          </div>

        </section>

        {/* ====================================================
            CHAT CONTAINER
        ==================================================== */}

        <section className="chat-container">

          {/* ==================================================
              SELECTED DOCUMENT
          ================================================== */}

          <div className="chat-document-bar">

            <div className="chat-document-icon">
              ◇
            </div>

            <div
              style={{
                minWidth: 0,
                flex: 1,
              }}
            >

              <strong
                style={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={
                  documentName ||
                  "No document selected"
                }
              >
                {documentName ||
                  "No document selected"}
              </strong>

              <span>
                {documentName
                  ? "Document selected"
                  : "Select a document to begin"}
              </span>

            </div>

            <Link
              to="/documents"
              className="change-document"
            >
              Change
            </Link>

          </div>

          {/* ==================================================
              MESSAGES
          ================================================== */}

          <div className="chat-messages">

            {/* =================================================
                WELCOME
            ================================================= */}

            {messages.length === 0 && (

              <>

                <motion.div
                  className="chat-welcome"
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                >

                  <div className="chat-orb">
                    ✦
                  </div>

                  <h2>
                    {documentName
                      ? "What would you like to know?"
                      : "Select a document to begin"}
                  </h2>

                  <p>
                    {documentName
                      ? "Ask anything about your document and DocuMind will find the relevant information for you."
                      : "Choose a document from your Documents page, then ask questions about its contents."}
                  </p>

                </motion.div>

                {/* =============================================
                    EXAMPLE QUESTIONS
                ============================================= */}

                {documentName && (
                  <div className="example-questions">

                    {exampleQuestions.map(
                      (example, index) => (

                        <button
                          key={index}
                          type="button"
                          onClick={() =>
                            handleExampleQuestionClick(
                              example
                            )
                          }
                          disabled={loading}
                        >
                          {example}
                        </button>

                      )
                    )}

                  </div>
                )}

              </>
            )}

            {/* =================================================
                MESSAGE LIST
            ================================================= */}

            {messages.map(
              (message, index) => (

                <motion.div
                  key={
                    message.id || index
                  }

                  className={`chat-message ${
                    message.type === "user"
                      ? "chat-message-user"
                      : "chat-message-ai"
                  } ${
                    message.type === "error"
                      ? "chat-message-error"
                      : ""
                  }`}

                  initial={{
                    opacity: 0,
                    y: 10,
                  }}

                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                >

                  {/* =========================================
                      MESSAGE LABEL
                  ========================================= */}

                  <div className="chat-message-label">

                    {message.type === "user"
                      ? "YOU"
                      : message.type === "error"
                      ? "ERROR"
                      : "DOCUMIND"}

                  </div>

                  {/* =========================================
                      MESSAGE TEXT
                  ========================================= */}

                  <div
                    className="chat-message-text"
                    style={{
                      maxWidth:
                        message.type === "ai"
                          ? "min(100%, 900px)"
                          : undefined,

                      overflowWrap:
                        "anywhere",
                    }}
                  >

                    {message.type === "ai" ? (

                      <div
                        className="chat-markdown"
                        style={{
                          width: "100%",
                          fontSize: "0.98rem",
                        }}
                      >

                        <ReactMarkdown
                          components={
                            markdownComponents
                          }
                        >
                          {message.text}
                        </ReactMarkdown>

                      </div>

                    ) : (

                      <span>
                        {message.text}
                      </span>

                    )}

                  </div>

                  {/* =========================================
                      SOURCES
                  ========================================= */}

                  {message.type === "ai" &&
                    Array.isArray(
                      message.sources
                    ) &&
                    message.sources.length > 0 && (

                      <div className="chat-sources">

                        <span className="chat-sources-title">
                          SOURCES
                        </span>

                        {message.sources.map(
                          (
                            source,
                            sourceIndex
                          ) => (

                            <span
                              className="chat-source"
                              key={`${source.section}-${source.page}-${sourceIndex}`}
                            >

                              {source.section ||
                                "GENERAL"}

                              {source.page
                                ? ` · Page ${source.page}`
                                : ""}

                            </span>

                          )
                        )}

                      </div>

                    )}

                </motion.div>

              )
            )}

            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (

              <motion.div
                className="chat-message chat-message-ai"

                initial={{
                  opacity: 0,
                }}

                animate={{
                  opacity: 1,
                }}
              >

                <div className="chat-message-label">
                  DOCUMIND
                </div>

                <div className="chat-loading">

                  <span></span>
                  <span></span>
                  <span></span>

                  Thinking...

                </div>

              </motion.div>

            )}

            {/* Invisible element used for auto-scroll */}
            <div ref={messagesEndRef} />

          </div>

          {/* ==================================================
              INPUT
          ================================================== */}

          <div className="chat-input-area">

            <div className="chat-input-wrapper">

              <input
                type="text"

                value={question}

                onChange={(event) =>
                  setQuestion(
                    event.target.value
                  )
                }

                onKeyDown={
                  handleKeyDown
                }

                placeholder={
                  documentName
                    ? "Ask a question about your document..."
                    : "Select a document first..."
                }

                disabled={
                  loading || !documentName
                }

                autoComplete="off"
              />

              <motion.button
                type="button"

                className="chat-send-button"

                onClick={() =>
                  askQuestion()
                }

                disabled={
                  loading ||
                  !question.trim() ||
                  !documentName
                }

                whileHover={{
                  scale: 1.05,
                  y: -2,
                }}

                whileTap={{
                  scale: 0.95,
                }}
              >

                {loading
                  ? "..."
                  : "↗"}

              </motion.button>

            </div>

            <span className="chat-input-hint">
              DocuMind answers using information
              retrieved from your documents.
            </span>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Chat;