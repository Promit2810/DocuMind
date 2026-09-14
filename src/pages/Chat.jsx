import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import ThemeToggle from "../components/ThemeToggle";
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

  const getStoredDocument = () => {
    const stored = localStorage.getItem("selectedDocument");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return stored;
    }
  };

  const [selectedDocument, setSelectedDocument] = useState(() => {
    return location.state?.document || getStoredDocument();
  });

  useEffect(() => {
    if (location.state?.document) {
      setSelectedDocument(location.state.document);
    }
  }, [location.state?.document]);

  const getDocumentName = (document) => {
    if (!document) return "";
    if (typeof document === "string") {
      const value = document.trim();
      if (!value) return "";
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

    if (typeof document === "object") {
      const possibleName =
        document.name ||
        document.filename ||
        document.file_name ||
        document.original_name;

      if (typeof possibleName === "string" && possibleName.trim()) {
        const value = possibleName.trim();
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

  // ================= CHAT HISTORY =================
  const CHAT_HISTORY_KEY = "documind_chat_history";

  const getChatHistory = (filename) => {
    if (!filename) return [];
    const key = `${currentUser?.id || "guest"}_${filename}`;
    try {
      const stored = localStorage.getItem(CHAT_HISTORY_KEY);
      if (!stored) return [];
      const history = JSON.parse(stored);
      if (!history || typeof history !== "object" || Array.isArray(history)) {
        return [];
      }
      return Array.isArray(history[key]) ? history[key] : [];
    } catch (error) {
      console.error("Failed to load chat history:", error);
      return [];
    }
  };

  const saveChatHistory = (filename, chatMessages) => {
    if (!filename) return;
    const key = `${currentUser?.id || "guest"}_${filename}`;
    try {
      const stored = localStorage.getItem(CHAT_HISTORY_KEY);
      let history = {};
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          history = parsed;
        }
      }
      history[key] = chatMessages;
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  };

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!documentName) {
      setMessages([]);
      setQuestion("");
      return;
    }
    const history = getChatHistory(documentName);
    setMessages(history);
    setQuestion("");
  }, [documentName]);

  useEffect(() => {
    if (!documentName) return;
    saveChatHistory(documentName, messages);
  }, [messages, documentName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  const cleanAIResponse = (text) => {
    if (!text) return "";
    let cleaned = String(text);
    cleaned = cleaned.replace(/\r\n/g, "\n");
    cleaned = cleaned.replace(/\n/g, "\n");
    cleaned = cleaned.replace(/\r/g, "\n");
    cleaned = cleaned.replace(/\t/g, "    ");
    cleaned = cleaned.replace(/\"/g, '"');
    cleaned = cleaned.replace(/â€“/g, "–");
    cleaned = cleaned.replace(/â€”/g, "—");
    cleaned = cleaned.replace(/â€™/g, "’");
    cleaned = cleaned.replace(/â€˜/g, "‘");
    cleaned = cleaned.replace(/â€œ/g, "“");
    cleaned = cleaned.replace(/â€ /g, "”");
    cleaned = cleaned.replace(/â€¦/g, "…");
    cleaned = cleaned.replace(/[\ufffd\uFFFD]/g, "");
    cleaned = cleaned.replace(/\?_([–—-])\?_/g, " $1 ");
    cleaned = cleaned.replace(/\?_\?\?_/g, "–");
    cleaned = cleaned.replace(/\?_/g, " ");
    cleaned = cleaned.replace(/[\u2022\u25E6]/g, "•");
    cleaned = cleaned.replace(/\\\(([\s\S]*?)\\\)/g, "$1");
    cleaned = cleaned.replace(/\\\[([\s\S]*?)\\\]/g, "$1");
    cleaned = cleaned.replace(/\\textbf\{([^}]*)\}/g, "**$1**");
    cleaned = cleaned.replace(/\\textit\{([^}]*)\}/g, "*$1*");
    cleaned = cleaned.replace(/\\mathrm\{([^}]*)\}/g, "$1");
    cleaned = cleaned.replace(/\n{4,}/g, "\n\n");
    return cleaned.trim();
  };

  const cleanSources = (sources) => {
    if (!Array.isArray(sources)) return [];
    const unique = [];
    const seen = new Set();
    sources.forEach((source) => {
      if (!source || typeof source !== "object") return;
      const section = String(source.section || "GENERAL").trim().toUpperCase();
      const page =
        source.page !== null && source.page !== undefined && String(source.page).trim()
          ? String(source.page).trim()
          : "";
      const key = `${section}-${page}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({ section, page });
      }
    });
    return unique.slice(0, 3);
  };

  const askQuestion = async (questionText = question) => {
    const trimmedQuestion = String(questionText).trim();
    if (!trimmedQuestion || loading) return;

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

    const userMessage = {
      id: `${Date.now()}-user`,
      type: "user",
      text: trimmedQuestion,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          filename: documentName,
          question: trimmedQuestion,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("The server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(data?.detail || data?.message || "Failed to get an answer.");
      }

      const answer =
        cleanAIResponse(data?.answer) ||
        "No answer was returned for this question.";

      try {
        const count = Number(localStorage.getItem("documind_question_count") || "0");
        localStorage.setItem("documind_question_count", String(count + 1));
      } catch {
        // ignore
      }

      const aiMessage = {
        id: `${Date.now()}-ai`,
        type: "ai",
        text: answer,
        sources: cleanSources(data?.sources || []),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("DocuMind chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          type: "error",
          text: error?.message || "Something went wrong while connecting to DocuMind.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!loading && question.trim() && documentName) {
        askQuestion();
      }
    }
  };

  const exampleQuestions = [
    "What is the main topic of this document?",
    "Summarize the key takeaways.",
    "What are the most important conclusions?",
  ];

  return (
    <div className="chat-page">
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
          <Link to="/documents" className="dashboard-nav-link">
            Documents
          </Link>
          <Link to="/chat" className="dashboard-nav-link active">
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

      {/* CHAT SUBHEADER / ACTIVE DOCUMENT */}
      <div className="chat-header">
        <div className="chat-doc-banner">
          <span className="chat-doc-tag">RAG ACTIVE</span>
          <span
            style={{
              maxWidth: "380px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={documentName || "No document selected"}
          >
            {documentName ? `Document: ${documentName}` : "No document selected"}
          </span>
        </div>

        <Link
          to="/documents"
          style={{
            fontSize: "12.5px",
            fontWeight: 600,
            color: "var(--accent-primary)",
            padding: "5px 12px",
            borderRadius: "6px",
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent-border)",
            transition: "all 0.2s ease",
          }}
        >
          {documentName ? "Switch Document" : "Select Document"}
        </Link>
      </div>

      {/* CHAT BODY */}
      <main className="chat-body">
        <div className="chat-messages">
          {/* WELCOME / EMPTY STATE */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                margin: "auto",
                textAlign: "center",
                maxWidth: "500px",
                padding: "32px 16px",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "16px",
                  background: "var(--accent-subtle)",
                  border: "1px solid var(--accent-border)",
                  color: "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  margin: "0 auto 16px",
                }}
              >
                ✦
              </div>

              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                {documentName ? "What would you like to know?" : "Select a document to begin"}
              </h2>

              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                  marginBottom: "24px",
                }}
              >
                {documentName
                  ? `DocuMind is ready to answer questions grounded in "${documentName}".`
                  : "Choose a file from your Documents library to start asking questions."}
              </p>

              {documentName && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {exampleQuestions.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuestion(prompt)}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "10px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                        fontSize: "13px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-strong)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-subtle)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }}
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* MESSAGE LIST */}
          {messages.map((message, index) => (
            <motion.div
              key={message.id || index}
              className={message.type === "user" ? "chat-message-user" : "chat-message-ai"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {message.type !== "user" && (
                <div className="ai-avatar">✦</div>
              )}

              <div className="chat-bubble">
                {message.type === "ai" ? (
                  <div className="chat-markdown">
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                  </div>
                ) : (
                  <span>{message.text}</span>
                )}

                {/* CITATIONS */}
                {message.type === "ai" &&
                  Array.isArray(message.sources) &&
                  message.sources.length > 0 && (
                    <div className="chat-sources">
                      <span className="chat-sources-title">Sources:</span>
                      {message.sources.map((source, sIdx) => (
                        <span className="chat-source" key={sIdx}>
                          ◈ {source.section || "GENERAL"}
                          {source.page ? ` · p. ${source.page}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            </motion.div>
          ))}

          {/* LOADING INDICATOR */}
          {loading && (
            <motion.div
              className="chat-message-ai"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="ai-avatar">✦</div>
              <div className="chat-loading">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* FLOATING INPUT BAR */}
        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                documentName
                  ? "Ask anything about this document..."
                  : "Select a document first..."
              }
              disabled={loading || !documentName}
              autoComplete="off"
            />

            <button
              type="button"
              className="chat-send-btn"
              onClick={() => askQuestion()}
              disabled={loading || !question.trim() || !documentName}
              aria-label="Send message"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          <div className="chat-hint">
            Answers are synthesized and cited from your indexed documents using RAG.
          </div>
        </div>
      </main>
    </div>
  );
}

export default Chat;
