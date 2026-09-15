import json
import re
import threading
from pathlib import Path
import os
from datetime import datetime, timedelta, timezone

import faiss

from fastapi import FastAPI, File, HTTPException, UploadFile, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
import sqlite3
import bcrypt
import jwt

from pypdf import PdfReader
from docx import Document

from rag import (
    create_document_chunks,
    create_embeddings,
    create_faiss_index,
    retrieve_relevant_chunks,
)


# =========================================================
# ENVIRONMENT / GROQ CONFIGURATION
# =========================================================

ENV_PATH = Path(__file__).resolve().parent / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is not set in the .env file."
    )

groq_client = Groq(
    api_key=GROQ_API_KEY
)

GROQ_MODEL = "openai/gpt-oss-20b"

# =========================================================
# PATH CONFIGURATION & CONSTANTS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
RAG_INDEX_DIR = BASE_DIR / "rag_indexes"

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

RAG_INDEX_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB max


# =========================================================
# AUTHENTICATION CONFIGURATION
# =========================================================

AUTH_DB_PATH = BASE_DIR / "documind.db"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not set in the .env file."
    )

security = HTTPBearer(auto_error=False)


def get_db_connection():
    connection = sqlite3.connect(str(AUTH_DB_PATH), timeout=10.0)
    connection.execute("PRAGMA journal_mode=WAL;")
    connection.row_factory = sqlite3.Row
    return connection


def init_auth_database():
    connection = get_db_connection()
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        cursor = connection.execute("PRAGMA table_info(documents)")
        existing_cols = {row["name"]: row for row in cursor.fetchall()}

        if not existing_cols:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    filename TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    size INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    UNIQUE(user_id, filename)
                )
                """
            )
        else:
            if "user_id" not in existing_cols:
                connection.execute("ALTER TABLE documents ADD COLUMN user_id INTEGER DEFAULT 1 REFERENCES users(id)")
            if "size" not in existing_cols:
                connection.execute("ALTER TABLE documents ADD COLUMN size INTEGER DEFAULT 0")
                if "file_size" in existing_cols:
                    connection.execute("UPDATE documents SET size = file_size WHERE size = 0")
            if "created_at" not in existing_cols:
                connection.execute("ALTER TABLE documents ADD COLUMN created_at TEXT")
                if "uploaded_at" in existing_cols:
                    connection.execute("UPDATE documents SET created_at = uploaded_at WHERE created_at IS NULL")

        # Seed existing uploads into documents table for the first user if not already present
        first_user = connection.execute("SELECT id FROM users ORDER BY id ASC LIMIT 1").fetchone()
        if first_user and UPLOAD_DIR.exists():
            for file_path in UPLOAD_DIR.iterdir():
                if file_path.is_file() and file_path.suffix.lower() in ALLOWED_EXTENSIONS:
                    # Check if document already exists for first_user
                    exists = connection.execute(
                        "SELECT id FROM documents WHERE user_id = ? AND filename = ?",
                        (first_user["id"], file_path.name),
                    ).fetchone()
                    if not exists:
                        connection.execute(
                            """
                            INSERT INTO documents (user_id, filename, file_type, size, created_at)
                            VALUES (?, ?, ?, ?, ?)
                            """,
                            (
                                first_user["id"],
                                file_path.name,
                                file_path.suffix.replace(".", "").upper(),
                                file_path.stat().st_size,
                                datetime.now(timezone.utc).isoformat(),
                            ),
                        )

        connection.commit()
    finally:
        connection.close()


def create_access_token(user_id: int):
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        user_id = int(payload.get("sub"))
    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    connection = get_db_connection()
    try:
        user = connection.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    finally:
        connection.close()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return dict(user)


init_auth_database()



# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="DocuMind API",
    description=(
        "Backend API for the DocuMind AI document "
        "intelligence platform."
    ),
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




# =========================================================
# IN-MEMORY DOCUMENT REGISTRY
# =========================================================

# Format:
#
# document_indexes = {
#     "example.pdf": {
#         "filename": "example.pdf",
#         "file_type": "PDF",
#         "chunks": [...],
#         "index": faiss_index
#     }
# }

document_indexes = {}


# =========================================================
# FILENAME HELPERS
# =========================================================

def normalize_filename(filename: str) -> str:
    """
    Return only the actual filename and remove any
    accidental directory/path information.
    """

    if not filename:
        return ""

    return Path(str(filename)).name.strip()


def safe_index_name(filename: str) -> str:
    """
    Convert a document filename into a safe index filename.

    Example:

        Gcet mini project[1].docx

    becomes:

        Gcet mini project[1]
    """

    filename = normalize_filename(filename)

    name = Path(filename).stem

    name = re.sub(
        r'[<>:"/\\|?*]',
        "_",
        name,
    )

    name = name.strip()

    if not name:
        name = "document"

    return name


def get_index_paths(filename: str):
    """
    Return the FAISS and JSON paths belonging to a document.
    """

    base_name = safe_index_name(filename)

    faiss_path = (
        RAG_INDEX_DIR /
        f"{base_name}.faiss"
    )

    json_path = (
        RAG_INDEX_DIR /
        f"{base_name}.json"
    )

    return faiss_path, json_path


# =========================================================
# INDEX EXISTENCE CHECK
# =========================================================

def index_exists(filename: str) -> bool:
    """
    Check whether a valid persistent index pair exists.
    """

    faiss_path, json_path = get_index_paths(
        filename
    )

    return (
        faiss_path.exists()
        and json_path.exists()
    )


# =========================================================
# SAVE DOCUMENT INDEX
# =========================================================

def save_document_index(
    filename: str,
    chunks,
    index,
):
    """
    Persist a document's FAISS index and metadata.
    """

    faiss_path, json_path = get_index_paths(
        filename
    )

    # Save FAISS vector index
    faiss.write_index(
        index,
        str(faiss_path),
    )

    metadata = {
        "filename": filename,
        "file_type": (
            Path(filename)
            .suffix
            .replace(".", "")
            .upper()
        ),
        "chunks": chunks,
    }

    with open(
        json_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metadata,
            file,
            ensure_ascii=False,
            indent=2,
        )


# =========================================================
# REGISTER DOCUMENT IN MEMORY
# =========================================================

def register_document(
    filename: str,
    chunks,
    index,
):
    """
    Store a document's index in memory.
    """

    filename = normalize_filename(
        filename
    )

    document_indexes[filename] = {
        "filename": filename,
        "file_type": (
            Path(filename)
            .suffix
            .replace(".", "")
            .upper()
        ),
        "chunks": chunks,
        "index": index,
    }


# =========================================================
# LEGACY FILENAME RECOVERY
# =========================================================

def infer_legacy_filename(base_name: str):
    """
    Recover the original filename for older indexes whose
    JSON metadata may not contain a filename.
    """

    try:

        candidates = [
            path
            for path in UPLOAD_DIR.iterdir()
            if (
                path.is_file()
                and path.stem == base_name
                and path.suffix.lower()
                in ALLOWED_EXTENSIONS
            )
        ]

        if candidates:

            candidates.sort(
                key=lambda path: path.name.lower()
            )

            return candidates[0].name

    except Exception:
        pass

    return None


# =========================================================
# LOAD ONE SAVED INDEX
# =========================================================

def load_one_saved_index(
    faiss_path: Path,
):
    """
    Load one FAISS index + metadata JSON.
    """

    json_path = faiss_path.with_suffix(
        ".json"
    )

    if not json_path.exists():

        print(
            f"Skipping {faiss_path.name}: "
            "metadata JSON not found."
        )

        return False

    try:

        index = faiss.read_index(
            str(faiss_path)
        )

        with open(
            json_path,
            "r",
            encoding="utf-8",
        ) as file:

            metadata = json.load(file)

        # New format
        if isinstance(metadata, dict):

            filename = metadata.get(
                "filename"
            )

            chunks = metadata.get(
                "chunks",
                [],
            )

        # Legacy format
        else:

            filename = None
            chunks = metadata

        # Recover filename if needed
        if not filename:

            filename = infer_legacy_filename(
                faiss_path.stem
            )

        if not filename:

            print(
                f"Skipping {faiss_path.name}: "
                "original filename could not be determined."
            )

            return False

        filename = normalize_filename(
            filename
        )

        # Validate chunks
        if not isinstance(
            chunks,
            list,
        ):

            print(
                f"Skipping {faiss_path.name}: "
                "invalid chunk metadata."
            )

            return False

        # Validate FAISS/chunk alignment
        if index.ntotal != len(chunks):

            print(
                f"Skipping {faiss_path.name}: "
                f"FAISS vectors ({index.ntotal}) "
                f"do not match chunks ({len(chunks)})."
            )

            return False

        register_document(
            filename,
            chunks,
            index,
        )

        print(
            f"Loaded saved index: {filename}"
        )

        return True

    except Exception as error:

        print(
            f"Failed to load "
            f"{faiss_path.name}: "
            f"{str(error)}"
        )

        return False


# =========================================================
# LOAD ALL SAVED INDEXES
# =========================================================

def load_saved_indexes():
    """
    Load every persistent FAISS index on startup.
    """

    loaded_count = 0

    faiss_files = sorted(
        RAG_INDEX_DIR.glob("*.faiss"),
        key=lambda path: path.name.lower(),
    )

    if not faiss_files:

        print(
            "No saved document indexes found."
        )

        return

    for faiss_path in faiss_files:

        if load_one_saved_index(
            faiss_path
        ):
            loaded_count += 1

    print(
        f"Loaded {loaded_count} saved "
        f"document index(es)."
    )


# =========================================================
# PDF TEXT EXTRACTION
# =========================================================

def extract_pdf_pages(
    file_path: Path,
):
    """
    Extract text from PDF while preserving page numbers.
    """

    reader = PdfReader(
        str(file_path)
    )

    pages = []

    for page_number, page in enumerate(
        reader.pages,
        start=1,
    ):

        text = page.extract_text()

        if text and text.strip():

            pages.append(
                {
                    "page": page_number,
                    "text": text,
                }
            )

    return pages


# =========================================================
# DOCX TEXT EXTRACTION
# =========================================================

def extract_docx_text(
    file_path: Path,
):
    """
    Extract text from DOCX.

    python-docx does not reliably expose page numbers,
    so page is stored as None.
    """

    document = Document(
        str(file_path)
    )

    paragraphs = []

    for paragraph in document.paragraphs:

        text = paragraph.text.strip()

        if text:

            paragraphs.append(
                text
            )

    text = "\n\n".join(
        paragraphs
    )

    if not text.strip():

        return []

    return [
        {
            "page": None,
            "text": text,
        }
    ]


# =========================================================
# TXT TEXT EXTRACTION
# =========================================================

def extract_txt_text(
    file_path: Path,
):
    """
    Extract text from TXT.
    """

    text = file_path.read_text(
        encoding="utf-8",
        errors="ignore",
    )

    if not text.strip():

        return []

    return [
        {
            "page": None,
            "text": text,
        }
    ]


# =========================================================
# DOCUMENT EXTRACTION
# =========================================================

def extract_document_pages(
    file_path: Path,
):
    """
    Extract document content according to file type.
    """

    extension = (
        file_path
        .suffix
        .lower()
    )

    if extension == ".pdf":

        return extract_pdf_pages(
            file_path
        )

    if extension == ".docx":

        return extract_docx_text(
            file_path
        )

    if extension == ".txt":

        return extract_txt_text(
            file_path
        )

    raise ValueError(
        "Unsupported file type."
    )


# =========================================================
# BUILD DOCUMENT INDEX
# =========================================================

def build_document_index(
    filename: str,
    file_path: Path,
):
    """
    Extract, chunk, embed, and index a document.

    This function is used both for:
        - normal uploads
        - automatically indexing existing uploads
    """

    filename = normalize_filename(
        filename
    )

    # -----------------------------------------------------
    # Extract
    # -----------------------------------------------------

    pages = extract_document_pages(
        file_path
    )

    if not pages:

        raise ValueError(
            "No readable text was found "
            "in the document."
        )

    # -----------------------------------------------------
    # Create chunks
    # -----------------------------------------------------

    chunks = create_document_chunks(
        pages
    )

    if not chunks:

        raise ValueError(
            "Could not create document chunks."
        )

    # -----------------------------------------------------
    # Create embeddings
    # -----------------------------------------------------

    embeddings = create_embeddings(
        chunks
    )

    # -----------------------------------------------------
    # Create FAISS index
    # -----------------------------------------------------

    index = create_faiss_index(
        embeddings
    )

    if index is None:

        raise ValueError(
            "Could not create FAISS index."
        )

    # -----------------------------------------------------
    # Validate alignment
    # -----------------------------------------------------

    if index.ntotal != len(chunks):

        raise ValueError(
            "FAISS index size does not match "
            "the number of document chunks."
        )

    # -----------------------------------------------------
    # Save persistent index
    # -----------------------------------------------------

    save_document_index(
        filename,
        chunks,
        index,
    )

    # -----------------------------------------------------
    # Register in memory
    # -----------------------------------------------------

    register_document(
        filename,
        chunks,
        index,
    )

    return {
        "filename": filename,
        "chunks": chunks,
        "index": index,
        "pages": pages,
    }


# =========================================================
# AUTO-INDEX EXISTING UPLOADS
# =========================================================

def index_missing_uploaded_documents():
    """
    Find documents already present in uploads/ that do not
    have a persistent FAISS index.

    This solves the situation where a document appears in the
    Documents page but has never been indexed.

    Existing valid indexes are NOT rebuilt.
    """

    print(
        "Checking uploaded documents for missing indexes..."
    )

    files = sorted(
        [
            path
            for path in UPLOAD_DIR.iterdir()
            if (
                path.is_file()
                and path.suffix.lower()
                in ALLOWED_EXTENSIONS
            )
        ],
        key=lambda path: path.name.lower(),
    )

    if not files:

        print(
            "No uploaded documents found."
        )

        return

    created_count = 0
    already_indexed_count = 0
    failed_count = 0

    for file_path in files:

        filename = file_path.name

        # -------------------------------------------------
        # Already loaded in memory
        # -------------------------------------------------

        if filename in document_indexes:

            already_indexed_count += 1

            continue

        # -------------------------------------------------
        # Persistent index exists
        # -------------------------------------------------

        if index_exists(filename):

            # Try loading it immediately
            faiss_path, _ = get_index_paths(
                filename
            )

            if load_one_saved_index(
                faiss_path
            ):

                already_indexed_count += 1

                continue

        # -------------------------------------------------
        # Missing index -> build it
        # -------------------------------------------------

        print(
            f"Creating missing index: {filename}"
        )

        try:

            build_document_index(
                filename,
                file_path,
            )

            created_count += 1

            print(
                f"Indexed successfully: {filename}"
            )

        except Exception as error:

            failed_count += 1

            print(
                f"Failed to index "
                f"{filename}: {str(error)}"
            )

    print(
        "Document indexing check complete."
    )

    print(
        f"New indexes created: {created_count}"
    )

    print(
        f"Already indexed: {already_indexed_count}"
    )

    print(
        f"Failed: {failed_count}"
    )


# =========================================================
# STARTUP INITIALIZATION
# =========================================================

def initialize_rag_indexes():
    """Load the RAG catalog after the API is ready to serve requests."""
    load_saved_indexes()
    index_missing_uploaded_documents()


@app.on_event("startup")
def start_rag_initialization():
    threading.Thread(
        target=initialize_rag_indexes,
        name="rag-index-initializer",
        daemon=True,
    ).start()


# =========================================================
# REQUEST MODEL
# =========================================================

class AskRequest(BaseModel):
    filename: str
    question: str


# =========================================================
# AUTHENTICATION MODELS
# =========================================================

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# =========================================================
# AUTHENTICATION ENDPOINTS
# =========================================================

@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(request: SignupRequest):
    name = request.name.strip()
    email = request.email.strip().lower()
    password = request.password

    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must contain at least 2 characters.")

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must contain at least 8 characters.")

    connection = get_db_connection()
    try:
        existing = connection.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,),
        ).fetchone()

        if existing is not None:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        password_hash = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")

        cursor = connection.execute(
            """
            INSERT INTO users (name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (name, email, password_hash, datetime.now(timezone.utc).isoformat()),
        )
        connection.commit()
        user_id = cursor.lastrowid
    finally:
        connection.close()

    token = create_access_token(user_id)

    return {
        "message": "Account created successfully.",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
        },
    }


@app.post("/api/auth/login")
def login(request: LoginRequest):
    email = request.email.strip().lower()

    connection = get_db_connection()
    try:
        user = connection.execute(
            "SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    finally:
        connection.close()

    if user is None or not bcrypt.checkpw(
        request.password.encode("utf-8"),
        user["password_hash"].encode("utf-8"),
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(user["id"])

    return {
        "message": "Login successful.",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
        },
    }


@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


# =========================================================
# ROOT ENDPOINT
# =========================================================

@app.get("/")
def root():

    return {
        "message": "DocuMind API is running",
        "status": "success",
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/api/health")
def health_check():

    return {
        "status": "healthy",
        "service": "DocuMind API",
        "indexed_documents": len(
            document_indexes
        ),
    }


# =========================================================
# DOCUMENT LIST
# =========================================================

@app.get("/api/documents")
def list_documents(
    current_user: dict = Depends(get_current_user),
):
    """
    Return all uploaded documents belonging to the authenticated user.
    """
    connection = get_db_connection()
    try:
        rows = connection.execute(
            """
            SELECT filename, file_type, size, created_at
            FROM documents
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (current_user["id"],),
        ).fetchall()
    finally:
        connection.close()

    documents = []
    for row in rows:
        filename = row["filename"]
        file_path = UPLOAD_DIR / filename
        size = row["size"]
        if size == 0 and file_path.exists():
            try:
                size = file_path.stat().st_size
            except Exception:
                pass

        documents.append(
            {
                "filename": filename,
                "file_type": row["file_type"],
                "indexed": (
                    filename in document_indexes
                    or index_exists(filename)
                ),
                "size": size,
                "created_at": row["created_at"],
            }
        )

    return {
        "count": len(documents),
        "documents": documents,
    }


# =========================================================
# UPLOAD DOCUMENT
# =========================================================

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload and index a document for the authenticated user.
    """
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected.",
        )

    original_name = normalize_filename(file.filename)
    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only PDF, DOCX, and TXT files "
                "are supported."
            ),
        )

    file_path = UPLOAD_DIR / original_name

    try:
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds the maximum limit of 25MB.",
            )

        file_path.write_bytes(content)

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not save the uploaded file: {str(error)}",
        )

    try:
        result = build_document_index(
            original_name,
            file_path,
        )
    except Exception as error:
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail=(
                "Could not process and index "
                f"the document: {str(error)}"
            ),
        )

    connection = get_db_connection()
    try:
        connection.execute(
            """
            INSERT INTO documents (user_id, filename, file_type, size, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, filename) DO UPDATE SET
                file_type = excluded.file_type,
                size = excluded.size,
                created_at = excluded.created_at
            """,
            (
                current_user["id"],
                original_name,
                extension.replace(".", "").upper(),
                len(content),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        connection.commit()
    finally:
        connection.close()

    extracted_text = "\n\n".join(
        page["text"]
        for page in result["pages"]
    )

    return {
        "message": "Document uploaded and indexed successfully.",
        "filename": original_name,
        "file_type": extension.replace(".", "").upper(),
        "characters": len(extracted_text),
        "chunks": len(result["chunks"]),
        "indexed": True,
        "preview": extracted_text[:500],
    }


# =========================================================
# DELETE DOCUMENT
# =========================================================

@app.delete("/api/documents/{filename}")
def delete_document(
    filename: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a document for the authenticated user and remove index/file if unreferenced.
    """
    filename = normalize_filename(filename)
    if not filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required.",
        )

    connection = get_db_connection()
    try:
        user_doc = connection.execute(
            "SELECT id FROM documents WHERE user_id = ? AND filename = ?",
            (current_user["id"], filename),
        ).fetchone()

        file_path = UPLOAD_DIR / filename

        if not user_doc:
            if file_path.exists():
                file_path.unlink(missing_ok=True)
                faiss_path, json_path = get_index_paths(filename)
                faiss_path.unlink(missing_ok=True)
                json_path.unlink(missing_ok=True)
                if filename in document_indexes:
                    del document_indexes[filename]
                return {
                    "message": f"Document '{filename}' deleted successfully.",
                    "filename": filename,
                }
            raise HTTPException(
                status_code=404,
                detail=f"Document '{filename}' not found or access denied.",
            )

        connection.execute(
            "DELETE FROM documents WHERE user_id = ? AND filename = ?",
            (current_user["id"], filename),
        )
        connection.commit()

        other_user_doc = connection.execute(
            "SELECT id FROM documents WHERE filename = ?",
            (filename,),
        ).fetchone()
    finally:
        connection.close()

    if not other_user_doc:
        file_path.unlink(missing_ok=True)
        faiss_path, json_path = get_index_paths(filename)
        faiss_path.unlink(missing_ok=True)
        json_path.unlink(missing_ok=True)
        if filename in document_indexes:
            del document_indexes[filename]

    return {
        "message": f"Document '{filename}' deleted successfully.",
        "filename": filename,
    }


# =========================================================
# ASK QUESTION
# =========================================================

@app.post("/api/ask")
def ask_question(
    request: AskRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve information ONLY from the selected document
    and generate a grounded answer using Groq.
    """

    # -----------------------------------------------------
    # Normalize filename
    # -----------------------------------------------------

    filename = normalize_filename(
        request.filename
    )

    if not filename:

        raise HTTPException(
            status_code=400,
            detail="Filename is required.",
        )

    # -----------------------------------------------------
    # Validate extension
    # -----------------------------------------------------

    extension = (
        Path(filename)
        .suffix
        .lower()
    )

    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported document type."
            ),
        )

    # -----------------------------------------------------
    # Validate question
    # -----------------------------------------------------

    question = (
        request.question
        .strip()
    )

    if not question:

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    # -----------------------------------------------------
    # Check document ownership / availability
    # -----------------------------------------------------

    connection = get_db_connection()
    try:
        user_doc = connection.execute(
            "SELECT id FROM documents WHERE user_id = ? AND filename = ?",
            (current_user["id"], filename),
        ).fetchone()
    finally:
        connection.close()

    uploaded_file = UPLOAD_DIR / filename
    if not user_doc and not uploaded_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Document '{filename}' not found or access denied.",
        )

    # -----------------------------------------------------
    # IMPORTANT:
    # Retrieve ONLY the selected document
    # -----------------------------------------------------

    document_data = document_indexes.get(
        filename
    )

    # -----------------------------------------------------
    # If not currently loaded, try loading its saved index
    # -----------------------------------------------------

    if document_data is None:

        faiss_path, json_path = (
            get_index_paths(
                filename
            )
        )

        if (
            faiss_path.exists()
            and json_path.exists()
        ):

            load_one_saved_index(
                faiss_path
            )

            document_data = (
                document_indexes.get(
                    filename
                )
            )

    # -----------------------------------------------------
    # If still missing, try building from uploaded file
    # -----------------------------------------------------

    if document_data is None:

        if uploaded_file.exists():

            try:

                build_document_index(
                    filename,
                    uploaded_file,
                )

                document_data = (
                    document_indexes.get(
                        filename
                    )
                )

            except Exception as error:

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "The document exists but "
                        "could not be indexed: "
                        f"{str(error)}"
                    ),
                )

    # -----------------------------------------------------
    # Final safety check
    # -----------------------------------------------------

    if document_data is None:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Document '{filename}' is not "
                "available or indexed."
            ),
        )

    # =====================================================
    # RAG RETRIEVAL
    # =====================================================

    try:

        results = retrieve_relevant_chunks(
            question=question,
            chunks=document_data["chunks"],
            index=document_data["index"],
            top_k=4,
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not retrieve document "
                "information: "
                f"{str(error)}"
            ),
        )

    # -----------------------------------------------------
    # No relevant information
    # -----------------------------------------------------

    if not results:

        return {
            "filename": filename,
            "question": question,
            "answer": (
                "The answer is not available in "
                "the provided document."
            ),
            "sources": [],
        }

    # =====================================================
    # BUILD CONTEXT
    # =====================================================

    context_parts = []

    for i, result in enumerate(
        results,
        start=1,
    ):

        text = (
            result.get(
                "text",
                "",
            )
            .strip()
        )

        section = result.get(
            "section",
            "Document",
        )

        page = result.get(
            "page"
        )

        if not text:
            continue

        if page is not None:

            source_label = (
                f"[Source {i} | "
                f"Section: {section} | "
                f"Page: {page}]"
            )

        else:

            source_label = (
                f"[Source {i} | "
                f"Section: {section}]"
            )

        context_parts.append(
            f"{source_label}\n{text}"
        )

    context = "\n\n".join(
        context_parts
    )

    # =====================================================
    # GROUNDED SYSTEM PROMPT
    # =====================================================

    system_prompt = """
You are DocuMind, an AI assistant that answers questions
about uploaded documents.

Your job is to answer questions ONLY using the document
context provided by the application.

IMPORTANT RULES:

1. Use only information present in the provided context.

2. Do not use outside knowledge to fill missing information.

3. Do not invent facts, explanations, results, values,
   algorithms, or conclusions.

4. If the answer cannot be found in the provided context,
   clearly say:

   "The answer is not available in the provided document."

5. Give a concise but useful answer.

6. Preserve important technical terms, formulas,
   algorithms, and terminology from the document.

7. If the context contains multiple relevant sections,
   combine them when necessary.

8. Never use information from another document.

9. Never assume that information from a similarly named
   document belongs to the selected document.

10. Do not mention FAISS, embeddings, vector databases,
    retrieval systems, or internal implementation details.

11. Do not claim information is present if it is not
    supported by the provided context.

12. Answer directly instead of repeating the question.
"""

    # =====================================================
    # USER PROMPT
    # =====================================================

    user_prompt = f"""
Selected document:
{filename}

The following text was retrieved ONLY from the selected
document:

-------------------------
{context}
-------------------------

Question:
{question}

Answer the question using ONLY the retrieved context
from "{filename}".

If the answer is not supported by the context, say:

"The answer is not available in the provided document."
"""

    # =====================================================
    # CALL GROQ
    # =====================================================

    try:

        completion = (
            groq_client
            .chat
            .completions
            .create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                    },
                ],
                temperature=0.1,
                max_tokens=500,
            )
        )

        answer = (
            completion
            .choices[0]
            .message
            .content
            .strip()
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Groq API error: {str(error)}"
            ),
        )

    # =====================================================
    # PREPARE SOURCES
    # =====================================================

    sources = []

    seen_sources = set()

    for result in results:

        section = result.get(
            "section",
            "Document",
        )

        page = result.get(
            "page"
        )

        source_key = (
            str(section),
            str(page),
        )

        if source_key in seen_sources:
            continue

        seen_sources.add(
            source_key
        )

        sources.append(
            {
                "section": section,
                "page": page,
            }
        )

    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return {
        "filename": filename,
        "question": question,
        "answer": answer,
        "sources": sources,
    }