from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from docx import Document


# =========================================================
# APP
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
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# UPLOAD DIRECTORY
# =========================================================

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# =========================================================
# ALLOWED FILE TYPES
# =========================================================

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
}


# =========================================================
# ROOT
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
# TEXT EXTRACTION
# =========================================================

def extract_pdf_text(file_path: Path) -> str:
    reader = PdfReader(str(file_path))

    pages = []

    for page in reader.pages:
        text = page.extract_text()

        if text:
            pages.append(text)

    return "\n\n".join(pages)


def extract_docx_text(file_path: Path) -> str:
    document = Document(str(file_path))

    paragraphs = []

    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            paragraphs.append(paragraph.text)

    return "\n\n".join(paragraphs)


def extract_txt_text(file_path: Path) -> str:
    return file_path.read_text(
        encoding="utf-8",
        errors="ignore",
    )


def extract_text(file_path: Path) -> str:
    extension = file_path.suffix.lower()

    if extension == ".pdf":
        return extract_pdf_text(file_path)

    if extension == ".docx":
        return extract_docx_text(file_path)

    if extension == ".txt":
        return extract_txt_text(file_path)

    raise ValueError("Unsupported file type.")


# =========================================================
# DOCUMENT UPLOAD
# =========================================================

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected.",
        )

    original_name = Path(file.filename).name
    extension = Path(original_name).suffix.lower()

    # Validate extension
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX, and TXT files are supported.",
        )

    # Save file
    file_path = UPLOAD_DIR / original_name

    content = await file.read()

    file_path.write_bytes(content)

    # Extract text
    try:
        extracted_text = extract_text(file_path)

    except Exception as error:
        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail=f"Could not read the document: {str(error)}",
        )

    if not extracted_text.strip():
        file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail="No readable text was found in the document.",
        )

    return {
        "message": "Document uploaded successfully.",
        "filename": original_name,
        "file_type": extension.replace(".", "").upper(),
        "characters": len(extracted_text),
        "preview": extracted_text[:500],
    }