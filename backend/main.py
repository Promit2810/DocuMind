from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pypdf import PdfReader
from docx import Document

from rag import (
    create_document_chunks,
    create_embeddings,
    create_faiss_index,
    retrieve_relevant_chunks,
)


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="DocuMind API",
    description="Backend API for the DocuMind AI document intelligence platform.",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# CONFIGURATION
# =========================================================

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
}


# =========================================================
# TEMPORARY RAG STORAGE
# =========================================================
#
# For now, documents and FAISS indexes are stored in memory.
#
# Later we will make this persistent using a database /
# persistent vector store.
#
# Structure:
#
# document_indexes = {
#     "filename.pdf": {
#         "filename": "...",
#         "file_type": "...",
#         "chunks": [...],
#         "index": FAISS index
#     }
# }
#
# =========================================================

document_indexes = {}


# =========================================================
# REQUEST MODEL FOR /api/ask
# =========================================================

class AskRequest(BaseModel):
    filename: str
    question: str


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
    }


# =========================================================
# PDF TEXT EXTRACTION
# =========================================================

def extract_pdf_pages(file_path: Path):
    """
    Extract text from a PDF while preserving page numbers.
    """

    reader = PdfReader(str(file_path))

    pages = []

    for page_number, page in enumerate(reader.pages, start=1):

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

def extract_docx_text(file_path: Path):
    """
    Extract text from a DOCX file.

    DOCX files do not reliably expose page numbers through
    python-docx, so page is stored as None.
    """

    document = Document(str(file_path))

    paragraphs = []

    for paragraph in document.paragraphs:

        text = paragraph.text.strip()

        if text:
            paragraphs.append(text)

    text = "\n\n".join(paragraphs)

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

def extract_txt_text(file_path: Path):
    """
    Extract text from a TXT file.
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

def extract_document_pages(file_path: Path):
    """
    Extract document content according to file type.
    """

    extension = file_path.suffix.lower()

    if extension == ".pdf":
        return extract_pdf_pages(file_path)

    if extension == ".docx":
        return extract_docx_text(file_path)

    if extension == ".txt":
        return extract_txt_text(file_path)

    raise ValueError("Unsupported file type.")


# =========================================================
# UPLOAD DOCUMENT
# =========================================================

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...)
):
    """
    Upload a document, extract its text, create chunks,
    generate embeddings, and create a FAISS index.
    """

    # -----------------------------------------------------
    # Validate filename
    # -----------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file selected.",
        )

    # Remove any path information from filename
    original_name = Path(file.filename).name

    extension = Path(original_name).suffix.lower()

    # -----------------------------------------------------
    # Validate file type
    # -----------------------------------------------------

    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Only PDF, DOCX, and TXT files are supported."
            ),
        )

    # -----------------------------------------------------
    # Save uploaded file
    # -----------------------------------------------------

    file_path = UPLOAD_DIR / original_name

    try:

        content = await file.read()

        file_path.write_bytes(content)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Could not save the uploaded file: {str(error)}",
        )

    # -----------------------------------------------------
    # Extract document text
    # -----------------------------------------------------

    try:

        pages = extract_document_pages(file_path)

    except Exception as error:

        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail=f"Could not read the document: {str(error)}",
        )

    # -----------------------------------------------------
    # Validate extracted content
    # -----------------------------------------------------

    if not pages:

        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail="No readable text was found in the document.",
        )

    # =====================================================
    # RAG INGESTION
    # =====================================================

    # -----------------------------------------------------
    # 1. Create meaningful document chunks
    # -----------------------------------------------------

    chunks = create_document_chunks(pages)

    if not chunks:

        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail="Could not create document chunks.",
        )

    # -----------------------------------------------------
    # 2. Generate embeddings
    # -----------------------------------------------------

    try:

        embeddings = create_embeddings(chunks)

    except Exception as error:

        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=500,
            detail=f"Could not generate document embeddings: {str(error)}",
        )

    # -----------------------------------------------------
    # 3. Create FAISS index
    # -----------------------------------------------------

    try:

        index = create_faiss_index(embeddings)

    except Exception as error:

        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=500,
            detail=f"Could not create FAISS index: {str(error)}",
        )

    if index is None:

        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail="Could not create FAISS index.",
        )

    # =====================================================
    # STORE DOCUMENT INDEX
    # =====================================================

    document_indexes[original_name] = {
        "filename": original_name,
        "file_type": extension.replace(".", "").upper(),
        "chunks": chunks,
        "index": index,
    }

    # -----------------------------------------------------
    # Combine extracted text for preview
    # -----------------------------------------------------

    extracted_text = "\n\n".join(
        page["text"]
        for page in pages
    )

    # =====================================================
    # RESPONSE
    # =====================================================

    return {
        "message": "Document uploaded and indexed successfully.",
        "filename": original_name,
        "file_type": extension.replace(".", "").upper(),
        "characters": len(extracted_text),
        "chunks": len(chunks),
        "preview": extracted_text[:500],
    }


# =========================================================
# ASK QUESTION
# =========================================================

@app.post("/api/ask")
def ask_question(request: AskRequest):
    """
    Search the selected document using semantic retrieval.

    The current version returns the most relevant chunks.
    The LLM will be connected in the next stage.
    """

    # -----------------------------------------------------
    # Validate filename
    # -----------------------------------------------------

    filename = Path(request.filename).name

    if not filename:

        raise HTTPException(
            status_code=400,
            detail="Filename is required.",
        )

    # -----------------------------------------------------
    # Validate question
    # -----------------------------------------------------

    question = request.question.strip()

    if not question:

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    # -----------------------------------------------------
    # Check if document is indexed
    # -----------------------------------------------------

    document_data = document_indexes.get(filename)

    if document_data is None:

        raise HTTPException(
            status_code=404,
            detail=(
                "Document is not currently indexed. "
                "Please upload it again."
            ),
        )

    # -----------------------------------------------------
    # Retrieve relevant chunks
    # -----------------------------------------------------

    try:

        results = retrieve_relevant_chunks(
            question=question,
            chunks=document_data["chunks"],
            index=document_data["index"],
            top_k=3,
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve document information: {str(error)}",
        )

    # -----------------------------------------------------
    # Return retrieval results
    # -----------------------------------------------------

    return {
        "filename": filename,
        "question": question,
        "results": results,
    }