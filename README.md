# DocuMind 🧠📄

> **AI-Powered Document Intelligence & Retrieval-Augmented Generation (RAG) Platform**

DocuMind is a modern, full-stack AI document question-answering web application. It allows users to upload documents such as **PDF**, **DOCX**, and **TXT** files and chat with them using natural language. 

Powered by **FastAPI**, **Sentence Transformers**, **FAISS**, and **Groq Cloud LLMs**, DocuMind extracts text, creates dense vector embeddings, performs semantic and lexical hybrid retrieval, and generates accurate, grounded answers with citations.

---

## ✨ Features

- 📑 **Multi-Format Document Parsing**: Seamless extraction and preprocessing for `.pdf`, `.docx`, and `.txt` files.
- 🔍 **Hybrid RAG Retrieval Engine**: Combines normalized semantic vector search (via FAISS) with keyword matching and section heuristics for high-precision retrieval.
- ⚡ **Lightning-Fast LLM Inference**: Powered by the **Groq API** (`openai/gpt-oss-20b`) for near-instant responses.
- 🔐 **JWT Authentication & Multi-Tenancy**: Complete user signup and login system with bcrypt password hashing and user-scoped private document storage.
- 🗄️ **SQLite WAL Persistence**: Robust document tracking and metadata catalog with SQLite Write-Ahead Logging (WAL) and automatic migration.
- 🗑️ **Document Management**: Search, filter by document format, inspect chunks, and securely delete documents and vector indexes.
- 🎨 **Sleek Glassmorphic UI**: High-polish dark interface crafted with React, Vite, Three.js dynamic particle canvas, and Framer Motion.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Modern Glassmorphic CSS with CSS variables
- **Visuals & 3D**: Three.js particle canvas background
- **Icons & Motion**: Lucide React & Framer Motion
- **Linting & Code Quality**: ESLint 9 (0 errors)

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Vector Database**: FAISS (Facebook AI Similarity Search)
- **Embeddings**: SentenceTransformers (`all-MiniLM-L6-v2`)
- **LLM Provider**: Groq API
- **Authentication**: PyJWT + bcrypt
- **Database**: SQLite3 (WAL mode)
- **Document Parsers**: `pypdf`, `python-docx`

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (3.10 or higher)
- **Groq API Key** (Free tier available at [groq.com](https://groq.com))

---

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/DocuMind.git
cd DocuMind
```

---

### 2. Backend Setup

1. Navigate to the `backend` folder and create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   ```

2. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your API keys:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   JWT_SECRET_KEY=your_random_secret_key_here
   ```

5. Start the backend server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   API interactive documentation will be live at `http://127.0.0.1:8000/docs`.

---

### 3. Frontend Setup

1. Open a new terminal in the root project directory:
   ```bash
   cd ..
   ```

2. Install Node packages:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 📁 Project Structure

```
DocuMind/
├── backend/
│   ├── main.py              # FastAPI server, endpoints & auth handlers
│   ├── rag.py               # RAG pipeline, chunking, FAISS index & scoring
│   ├── requirements.txt     # Python backend dependencies
│   ├── .env.example         # Environment template
│   └── documind.db          # SQLite database (auto-created)
├── src/
│   ├── components/          # Reusable UI & Three.js Canvas components
│   ├── pages/               # Landing, Dashboard, Documents, Chat, Auth
│   ├── utils/               # Centralized auth & API config helpers
│   ├── App.jsx              # Main router & page transitions
│   └── index.css            # Complete design system styles
├── index.html
├── package.json
└── README.md
```

---

## 🛡️ License

This project is licensed under the MIT License.
