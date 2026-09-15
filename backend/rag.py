# ============================================================
# DocuMind - Final RAG Retrieval Pipeline
# ============================================================
#
# Pipeline:
#
# Document
#    ↓
# Text extraction
#    ↓
# Section detection
#    ↓
# Intelligent chunking
#    ↓
# Sentence Transformer embeddings
#    ↓
# FAISS vector search
#    ↓
# Semantic + Keyword + Section-aware reranking
#    ↓
# Relevant chunks
#
# Compatible with main.py:
#
# create_document_chunks(pages)
# create_embeddings(chunks)
# create_faiss_index(embeddings)
# retrieve_relevant_chunks(question, chunks, index)
#
# ============================================================

import re
from typing import List

import numpy as np
import faiss


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_NAME = "all-MiniLM-L6-v2"

_model = None


def get_embedding_model():
    from sentence_transformers import SentenceTransformer

    global _model

    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)

    return _model


# ============================================================
# DOCUMENT SECTIONS
# ============================================================

SECTION_NAMES = [
    "TITLE PAGE",
    "CERTIFICATE",
    "ACKNOWLEDGEMENT",
    "ABSTRACT",
    "INTRODUCTION",
    "LITERATURE SURVEY",
    "PROBLEM FORMULATION",
    "AIM",
    "OBJECTIVE",
    "OBJECTIVES",
    "PURPOSE",
    "THEORY",
    "METHODOLOGY",
    "ALGORITHM",
    "PROCEDURE",
    "IMPLEMENTATION",
    "EXPERIMENT",
    "RESULT",
    "RESULTS",
    "OUTPUT",
    "DISCUSSION",
    "CONCLUSION",
    "FUTURE SCOPE",
    "REFERENCES",
]


# ============================================================
# QUESTION TYPES
# ============================================================

QUESTION_TYPES = {
    "aim": [
        "aim",
        "purpose",
        "objective",
        "goal",
    ],

    "theory": [
        "theory",
        "concept",
        "principle",
        "working",
        "how does",
        "how it works",
        "explain the working",
    ],

    "algorithm": [
        "algorithm",
        "steps",
        "procedure",
        "process",
    ],

    "methodology": [
        "methodology",
        "method",
        "approach",
        "technique",
        "implementation",
    ],

    "result": [
        "result",
        "results",
        "output",
        "observation",
        "outcome",
        "findings",
    ],

    "conclusion": [
        "conclusion",
        "conclude",
        "summary",
        "final result",
    ],

    "complexity": [
        "complexity",
        "time complexity",
        "space complexity",
        "big o",
    ],

    "definition": [
        "what is",
        "what are",
        "define",
        "definition",
        "meaning",
        "describe",
    ],
}


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text: str) -> str:

    if not text:
        return ""

    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")
    text = text.replace("\t", " ")
    text = text.replace("\xa0", " ")
    text = text.replace("\ufffd", "")

    # PDF font extraction artifacts
    text = re.sub(r"\?_([–—-])\?_", r" \1 ", text)
    text = text.replace("?_??_", "–")
    text = text.replace("?_", " ")
    text = text.replace(" ?? ", " – ")
    text = text.replace("?", "–")
    text = text.replace("?", '"')
    text = text.replace("?", '"')
    text = text.replace("?", "'")
    text = text.replace("?", "'")
    text = text.replace("-", "• ")
    text = text.replace("", "")

    # Normalize spaces without destroying new lines
    text = re.sub(r"[ ]{2,}", " ", text)

    # Remove excessive blank lines
    text = re.sub(r"\n[ ]*\n[ ]*\n+", "\n\n", text)

    return text.strip()


# ============================================================
# HEADING NORMALIZATION
# ============================================================

def normalize_heading(text: str) -> str:

    if not text:
        return ""

    text = text.strip().upper()

    # Remove numbering such as:
    # 1. AIM
    # 1.1 THEORY
    # I. INTRODUCTION
    # IV. CONCLUSION
    text = re.sub(
        r"^(?:\d+(?:\.\d+)*|[IVXLCDM]+)[\.\-:\s]+",
        "",
        text,
    )

    text = text.strip(" .:-_")

    return text


# ============================================================
# HEADING DETECTION
# ============================================================

def get_heading_name(text: str):

    if not text:
        return None

    normalized = normalize_heading(text)

    # Direct section match
    for section in SECTION_NAMES:

        if normalized == section:
            return section

    # Common AIM variations
    aim_patterns = [
        r"^AIM$",
        r"^AIM OF THE EXPERIMENT$",
        r"^MAIN AIM$",
        r"^OBJECTIVE$",
        r"^OBJECTIVES$",
        r"^PURPOSE$",
        r"^PURPOSE OF THE EXPERIMENT$",
        r"^MAIN OBJECTIVE$",
    ]

    for pattern in aim_patterns:

        if re.fullmatch(pattern, normalized):
            return "AIM"

    return None


# ============================================================
# SECTION DETECTION
# ============================================================

def detect_section(
    paragraph: str,
    current_section: str,
) -> str:

    if not paragraph:
        return current_section

    text = paragraph.strip()

    # Normal heading
    heading = get_heading_name(text)

    if heading:
        return heading

    # Inline AIM / OBJECTIVE / PURPOSE
    if re.match(
        r"^(?:AIM|OBJECTIVE|OBJECTIVES|PURPOSE)"
        r"\s*[:\-]",
        text,
        re.IGNORECASE,
    ):
        return "AIM"

    return current_section


# ============================================================
# CHECK WHETHER A LINE IS A HEADING
# ============================================================

def is_heading(text: str) -> bool:

    if not text:
        return False

    stripped = text.strip()

    # Known section
    if get_heading_name(stripped):
        return True

    # Numbered heading
    if re.match(
        r"^\d+(?:\.\d+)*[\.\-:\s]+[A-Za-z]",
        stripped,
    ):
        return True

    # Roman numeral heading
    if re.match(
        r"^[IVXLCDM]+[\.\-:\s]+[A-Za-z]",
        stripped,
    ):
        return True

    return False


# ============================================================
# TOKENIZATION
# ============================================================

def tokenize(text: str) -> List[str]:

    if not text:
        return []

    text = text.lower()

    tokens = re.findall(
        r"[a-zA-Z0-9]+(?:[-'][a-zA-Z0-9]+)*",
        text,
    )

    stop_words = {
        "the",
        "a",
        "an",
        "is",
        "are",
        "was",
        "were",
        "what",
        "this",
        "that",
        "of",
        "to",
        "in",
        "on",
        "for",
        "and",
        "or",
        "with",
        "by",
        "from",
        "it",
        "its",
        "be",
        "as",
        "using",
        "used",
        "does",
        "do",
        "how",
        "can",
    }

    return [
        token
        for token in tokens
        if token not in stop_words
    ]


# ============================================================
# KEYWORD SCORE
# ============================================================

def keyword_score(
    question: str,
    text: str,
) -> float:

    question_tokens = tokenize(question)
    text_tokens = tokenize(text)

    if not question_tokens or not text_tokens:
        return 0.0

    question_set = set(question_tokens)
    text_set = set(text_tokens)

    overlap = question_set.intersection(
        text_set
    )

    if not overlap:
        return 0.0

    return min(
        len(overlap) / len(question_set),
        1.0,
    )


# ============================================================
# QUESTION TYPE
# ============================================================

def question_type(question: str) -> str:

    q = question.lower().strip()

    # --------------------------------------------------------
    # AIM QUESTIONS - checked FIRST
    # --------------------------------------------------------

    aim_patterns = [
        "main aim",
        "main purpose",
        "main objective",
        "primary aim",
        "primary objective",
        "purpose of this experiment",
        "purpose of the experiment",
        "aim of this experiment",
        "aim of the experiment",
        "objective of this experiment",
        "objective of the experiment",
        "what is the aim",
        "what is the purpose",
        "what is the objective",
        "what is the main aim",
        "what is the main purpose",
        "what is the main objective",
        "what is the primary aim",
        "what is the primary objective",
    ]

    for pattern in aim_patterns:

        if pattern in q:
            return "aim"

    if q in {
        "aim",
        "objective",
        "objectives",
        "purpose",
        "goal",
    }:
        return "aim"

    # --------------------------------------------------------
    # THEORY QUESTIONS
    # --------------------------------------------------------

    theory_patterns = [
        "theory behind",
        "theory of",
        "theory used",
        "theoretical",
        "concept behind",
        "concept of",
        "principle behind",
        "working of",
        "how does",
        "how it works",
    ]

    for pattern in theory_patterns:

        if pattern in q:
            return "theory"

    # --------------------------------------------------------
    # ALGORITHM QUESTIONS
    # --------------------------------------------------------

    algorithm_patterns = [
        "which algorithm",
        "what algorithm",
        "algorithm used",
        "steps of",
        "steps involved",
        "procedure for",
    ]

    for pattern in algorithm_patterns:

        if pattern in q:
            return "algorithm"

    # --------------------------------------------------------
    # RESULT QUESTIONS
    # --------------------------------------------------------

    result_patterns = [
        "what is the result",
        "what are the results",
        "what is the output",
        "what are the outputs",
        "expected output",
        "result obtained",
        "observation",
        "findings",
    ]

    for pattern in result_patterns:

        if pattern in q:
            return "result"

    # --------------------------------------------------------
    # CONCLUSION QUESTIONS
    # --------------------------------------------------------

    conclusion_patterns = [
        "what is the conclusion",
        "conclusion of",
        "conclude the experiment",
        "summary of",
    ]

    for pattern in conclusion_patterns:

        if pattern in q:
            return "conclusion"

    # --------------------------------------------------------
    # COMPLEXITY QUESTIONS
    # --------------------------------------------------------

    complexity_patterns = [
        "time complexity",
        "space complexity",
        "computational complexity",
        "big o",
        "complexity of",
    ]

    for pattern in complexity_patterns:

        if pattern in q:
            return "complexity"

    # --------------------------------------------------------
    # METHODOLOGY
    # --------------------------------------------------------

    methodology_patterns = [
        "methodology",
        "method used",
        "approach used",
        "technique used",
        "implementation",
    ]

    for pattern in methodology_patterns:

        if pattern in q:
            return "methodology"

    # --------------------------------------------------------
    # GENERIC DEFINITION
    # --------------------------------------------------------

    definition_patterns = [
        "what is",
        "what are",
        "define",
        "definition",
        "meaning",
        "describe",
    ]

    for pattern in definition_patterns:

        if pattern in q:
            return "definition"

    return "general"


# ============================================================
# SECTION-AWARE SCORING
# ============================================================

def section_score(
    question: str,
    section: str,
    text: str = "",
) -> float:

    if not section:
        section = "GENERAL"

    section = section.upper()

    q_type = question_type(question)

    score = 0.0

    # ========================================================
    # AIM
    # ========================================================

    if q_type == "aim":

        if section == "AIM":
            score += 4.00

        elif section in {
            "OBJECTIVE",
            "OBJECTIVES",
            "PURPOSE",
        }:
            score += 3.50

        elif section == "ABSTRACT":
            score += 0.30

        elif section == "INTRODUCTION":
            score += 0.15

        elif section in {
            "THEORY",
            "ALGORITHM",
            "METHODOLOGY",
            "PROCEDURE",
            "RESULT",
            "RESULTS",
            "OUTPUT",
            "CONCLUSION",
        }:
            score -= 1.50

    # ========================================================
    # THEORY
    # ========================================================

    elif q_type == "theory":

        if section == "THEORY":
            score += 4.00

        elif section == "INTRODUCTION":
            score += 0.80

        elif section == "ABSTRACT":
            score += 0.40

        elif section == "METHODOLOGY":
            score += 0.30

        elif section == "AIM":
            score -= 1.50

        elif section in {
            "TITLE PAGE",
            "CERTIFICATE",
            "ACKNOWLEDGEMENT",
            "REFERENCES",
        }:
            score -= 2.00

    # ========================================================
    # ALGORITHM
    # ========================================================

    elif q_type == "algorithm":

        if section == "ALGORITHM":
            score += 4.00

        elif section == "PROCEDURE":
            score += 3.00

        elif section == "METHODOLOGY":
            score += 1.50

        elif section == "IMPLEMENTATION":
            score += 1.20

        elif section == "THEORY":
            score += 0.50

        elif section == "AIM":
            score -= 1.50

    # ========================================================
    # METHODOLOGY
    # ========================================================

    elif q_type == "methodology":

        if section == "METHODOLOGY":
            score += 4.00

        elif section == "IMPLEMENTATION":
            score += 3.00

        elif section == "PROCEDURE":
            score += 2.50

        elif section == "ALGORITHM":
            score += 1.20

        elif section == "THEORY":
            score += 0.50

    # ========================================================
    # RESULT
    # ========================================================

    elif q_type == "result":

        if section in {
            "RESULT",
            "RESULTS",
        }:
            score += 4.00

        elif section == "OUTPUT":
            score += 3.50

        elif section == "CONCLUSION":
            score += 1.20

        elif section == "THEORY":
            score -= 1.00

        elif section == "AIM":
            score -= 1.50

    # ========================================================
    # CONCLUSION
    # ========================================================

    elif q_type == "conclusion":

        if section == "CONCLUSION":
            score += 4.00

        elif section in {
            "RESULT",
            "RESULTS",
        }:
            score += 1.50

        elif section == "DISCUSSION":
            score += 1.00

        elif section == "AIM":
            score -= 1.50

    # ========================================================
    # COMPLEXITY
    # ========================================================

    elif q_type == "complexity":

        if section == "THEORY":
            score += 2.50

        elif section == "ALGORITHM":
            score += 2.50

        elif section == "METHODOLOGY":
            score += 1.00

        elif section == "AIM":
            score -= 1.00

    # ========================================================
    # DEFINITION
    # ========================================================

    elif q_type == "definition":

        if section == "THEORY":
            score += 2.00

        elif section == "INTRODUCTION":
            score += 1.00

        elif section == "ABSTRACT":
            score += 0.50

    # ========================================================
    # GENERAL
    # ========================================================

    else:

        if section == "THEORY":
            score += 0.50

        elif section == "INTRODUCTION":
            score += 0.40

        elif section == "ABSTRACT":
            score += 0.30

    return score


# ============================================================
# CONTENT-SPECIFIC BOOSTS
# ============================================================

def content_boost(
    question: str,
    text: str,
    section: str,
) -> float:

    q_type = question_type(question)

    text_lower = text.lower()

    boost = 0.0

    # ========================================================
    # AIM
    # ========================================================

    if q_type == "aim":

        if section.upper() == "AIM":
            boost += 2.00

        aim_patterns = [
            "aim:",
            "aim -",
            "aim is",
            "the aim",
            "main aim",
            "objective:",
            "objective is",
            "the objective",
            "purpose:",
            "purpose is",
            "the purpose",
        ]

        if any(
            pattern in text_lower
            for pattern in aim_patterns
        ):
            boost += 2.50

    # ========================================================
    # THEORY
    # ========================================================

    elif q_type == "theory":

        if section.upper() == "THEORY":
            boost += 1.50

        theory_patterns = [
            "theory",
            "divide-and-conquer",
            "algorithm works",
            "it works by",
            "because",
            "principle",
            "concept",
        ]

        matches = sum(
            1
            for pattern in theory_patterns
            if pattern in text_lower
        )

        boost += min(
            matches * 0.30,
            1.20,
        )

    # ========================================================
    # ALGORITHM
    # ========================================================

    elif q_type == "algorithm":

        if section.upper() == "ALGORITHM":
            boost += 1.50

        if any(
            word in text_lower
            for word in [
                "step 1",
                "step 2",
                "steps",
                "algorithm",
                "procedure",
            ]
        ):
            boost += 0.80

    # ========================================================
    # RESULT
    # ========================================================

    elif q_type == "result":

        if section.upper() in {
            "RESULT",
            "RESULTS",
            "OUTPUT",
        }:
            boost += 1.50

    # ========================================================
    # CONCLUSION
    # ========================================================

    elif q_type == "conclusion":

        if section.upper() == "CONCLUSION":
            boost += 1.50

    # ========================================================
    # IDENTITY / CONTACT / RESUME INFO
    # ========================================================

    contact_keywords = [
        "who is", "who wrote", "candidate", "author", "whose", "name",
        "contact", "email", "phone", "linkedin", "github", "address"
    ]
    q_lower = question.lower()
    if any(k in q_lower for k in contact_keywords):
        contact_markers = [
            "@", "linkedin", "github", "+91", "phone", "email",
            "curriculum vitae", "resume", "portfolio"
        ]
        if any(marker in text_lower for marker in contact_markers):
            boost += 1.50

    return boost


# ============================================================
# FRONT MATTER PENALTIES
# ============================================================

def front_matter_penalty(
    section: str,
) -> float:

    if not section:
        return 0.0

    penalties = {

        "TITLE PAGE": -3.00,

        "CERTIFICATE": -3.00,

        "ACKNOWLEDGEMENT": -3.00,

        "REFERENCES": -2.00,
    }

    return penalties.get(
        section.upper(),
        0.0,
    )


# ============================================================
# GENERIC/TITLE CHUNK PENALTY
# ============================================================

def generic_chunk_penalty(
    question: str,
    text: str,
    section: str,
) -> float:

    q_type = question_type(question)

    text_lower = text.lower()

    penalty = 0.0

    # Very short generic chunks should not outrank
    # actual section content for specific questions.

    if len(text.strip()) < 60:
        penalty -= 0.50

    # Title-like content
    if (
        section.upper() == "GENERAL"
        and len(text.strip()) < 100
    ):
        penalty -= 0.80

    # Experiment title should not beat actual content
    if (
        q_type in {
            "aim",
            "theory",
            "algorithm",
            "methodology",
            "result",
            "conclusion",
            "complexity",
        }
        and section.upper() == "GENERAL"
    ):

        if (
            "experiment" in text_lower
            or "program for" in text_lower
            or "experiment" in text_lower
        ):
            penalty -= 1.50

    return penalty


# ============================================================
# INTELLIGENT CHUNK SPLITTING
# ============================================================

def split_into_chunks(
    text: str,
    chunk_size: int = 600,
    overlap: int = 100,
) -> List[str]:

    text = clean_text(text)

    if not text:
        return []

    if len(text) <= chunk_size:
        return [text]

    chunks = []

    start = 0

    text_length = len(text)

    while start < text_length:

        end = min(
            start + chunk_size,
            text_length,
        )

        if end < text_length:

            search_start = max(
                start,
                end - 150,
            )

            candidate = text[
                search_start:end
            ]

            break_positions = [
                candidate.rfind(". "),
                candidate.rfind("\n"),
                candidate.rfind("? "),
                candidate.rfind("! "),
            ]

            best_break = max(
                break_positions
            )

            if best_break > 40:

                end = (
                    search_start
                    + best_break
                    + 1
                )

        chunk = text[
            start:end
        ].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        next_start = end - overlap

        if next_start <= start:
            next_start = end

        start = next_start

    return chunks


# ============================================================
# CREATE DOCUMENT CHUNKS
# ============================================================

def create_document_chunks(
    pages,
    chunk_size: int = 600,
    overlap: int = 100,
):

    chunks = []

    current_section = "GENERAL"

    for page_data in pages:

        page_number = page_data.get(
            "page",
            None,
        )

        page_text = page_data.get(
            "text",
            "",
        )

        if not page_text:
            continue

        page_text = clean_text(
            page_text
        )

        lines = [
            line.strip()
            for line in page_text.split("\n")
            if line.strip()
        ]

        section_buffer = []

        section_name = current_section

        # ----------------------------------------------------
        # Flush current section
        # ----------------------------------------------------

        def flush_section():

            nonlocal section_buffer

            if not section_buffer:
                return

            combined_text = "\n".join(
                section_buffer
            ).strip()

            if not combined_text:
                section_buffer = []
                return

            pieces = split_into_chunks(
                combined_text,
                chunk_size,
                overlap,
            )

            for piece in pieces:

                chunks.append({
                    "text": piece,
                    "page": page_number,
                    "section": section_name,
                })

            section_buffer = []

        # ----------------------------------------------------
        # Process lines
        # ----------------------------------------------------

        for line in lines:

            # -----------------------------------------------
            # Inline AIM / OBJECTIVE / PURPOSE
            # -----------------------------------------------

            aim_match = re.match(
                r"^(AIM|OBJECTIVE|OBJECTIVES|PURPOSE)"
                r"\s*[:\-]\s*(.+)$",
                line,
                re.IGNORECASE,
            )

            if aim_match:

                flush_section()

                current_section = "AIM"
                section_name = "AIM"

                content = (
                    aim_match
                    .group(2)
                    .strip()
                )

                # Keep explicit AIM label
                section_buffer.append(
                    f"AIM: {content}"
                )

                continue

            # -----------------------------------------------
            # Detect headings
            # -----------------------------------------------

            detected = detect_section(
                line,
                current_section,
            )

            if (
                detected != current_section
                and is_heading(line)
            ):

                flush_section()

                current_section = detected
                section_name = detected

                # Do not unnecessarily put
                # the heading alone into content.
                continue

            # -----------------------------------------------
            # Normal content
            # -----------------------------------------------

            section_buffer.append(line)

        # ----------------------------------------------------
        # Flush page section
        # ----------------------------------------------------

        flush_section()

    # ========================================================
    # FALLBACK
    # ========================================================

    if not chunks:

        full_text = "\n".join(
            page.get(
                "text",
                "",
            )
            for page in pages
        )

        full_text = clean_text(
            full_text
        )

        for piece in split_into_chunks(
            full_text,
            chunk_size,
            overlap,
        ):

            chunks.append({
                "text": piece,
                "page": None,
                "section": "GENERAL",
            })

    return chunks


# ============================================================
# CREATE EMBEDDINGS
# ============================================================

def create_embeddings(chunks):

    if not chunks:

        return np.empty(
            (0, 384),
            dtype=np.float32,
        )

    texts = [
        chunk["text"]
        for chunk in chunks
    ]

    embeddings = get_embedding_model().encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    return embeddings.astype(
        np.float32
    )


# ============================================================
# CREATE FAISS INDEX
# ============================================================

def create_faiss_index(
    embeddings,
):

    if embeddings is None:

        raise ValueError(
            "Embeddings cannot be None."
        )

    if len(embeddings) == 0:

        raise ValueError(
            "Cannot create FAISS index "
            "from empty embeddings."
        )

    dimension = embeddings.shape[1]

    # Inner Product + normalized vectors
    # = cosine similarity
    index = faiss.IndexFlatIP(
        dimension
    )

    index.add(
        embeddings.astype(
            np.float32
        )
    )

    return index


# ============================================================
# NORMALIZE SEMANTIC SCORE
# ============================================================

def normalize_semantic_score(
    score: float,
) -> float:

    score = float(score)

    normalized = (
        score + 1.0
    ) / 2.0

    return max(
        0.0,
        min(
            1.0,
            normalized,
        ),
    )


# ============================================================
# RETRIEVE RELEVANT CHUNKS
# ============================================================

def retrieve_relevant_chunks(
    question: str,
    chunks,
    index,
    top_k: int = 3,
):

    if not question:
        return []

    if not chunks:
        return []

    if index is None:
        return []

    # ========================================================
    # QUESTION EMBEDDING
    # ========================================================

    question_embedding = get_embedding_model().encode(
        [question],
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    ).astype(
        np.float32
    )

    # ========================================================
    # LARGE CANDIDATE POOL
    # ========================================================

    candidate_count = min(
        len(chunks),
        max(
            top_k * 8,
            15,
        ),
    )

    distances, indices = index.search(
        question_embedding,
        candidate_count,
    )

    candidates = []

    q_type = question_type(
        question
    )

    lab_sections = {
        "AIM", "OBJECTIVE", "OBJECTIVES", "PURPOSE", "THEORY",
        "ALGORITHM", "PROCEDURE", "METHODOLOGY", "IMPLEMENTATION",
        "EXPERIMENT", "RESULT", "RESULTS", "OUTPUT", "CONCLUSION",
    }

    distinct_lab_sections = {
        chunk.get("section", "GENERAL").upper()
        for chunk in chunks
        if chunk.get("section", "GENERAL").upper() in lab_sections
    }

    is_lab_document = len(distinct_lab_sections) >= 2

    # ========================================================
    # SCORE EACH CANDIDATE
    # ========================================================

    for semantic_raw, idx in zip(
        distances[0],
        indices[0],
    ):

        if idx < 0 or idx >= len(chunks):
            continue

        chunk = chunks[idx]

        text = chunk.get(
            "text",
            "",
        )

        if not text:
            continue

        section = chunk.get(
            "section",
            "GENERAL",
        )

        # ----------------------------------------------------
        # Semantic similarity
        # ----------------------------------------------------

        semantic = normalize_semantic_score(
            semantic_raw
        )

        # ----------------------------------------------------
        # Keyword similarity
        # ----------------------------------------------------

        lexical = keyword_score(
            question,
            text,
        )

        # ----------------------------------------------------
        # Section relevance
        # ----------------------------------------------------

        sec_score = section_score(
            question,
            section,
            text,
        )

        # ----------------------------------------------------
        # Content relevance
        # ----------------------------------------------------

        boost = content_boost(
            question,
            text,
            section,
        )

        # ----------------------------------------------------
        # Front matter penalty
        # ----------------------------------------------------

        front_penalty = front_matter_penalty(
            section
        )

        # ----------------------------------------------------
        # Generic/title penalty
        # ----------------------------------------------------

        generic_penalty = generic_chunk_penalty(
            question,
            text,
            section,
        )

        # ====================================================
        # SCORING
        # ====================================================

        if not is_lab_document:
            # For general documents (resumes, contracts, manuals, reports),
            # do not penalize GENERAL sections or apply lab experiment heuristics.
            final_score = (semantic * 0.70) + (lexical * 0.80) + (boost * 0.50)
        else:
            final_score = 0.0

            # Semantic relevance
            final_score += (
                semantic * 0.45
            )

            # Keyword relevance
            final_score += (
                lexical * 1.00
            )

            # Section relevance
            final_score += sec_score

            # Content-specific boost
            final_score += boost

            # Penalties
            final_score += front_penalty
            final_score += generic_penalty

            # ====================================================
            # EXTRA QUESTION-TYPE SAFETY (Lab documents only)
            # ====================================================

            # ----------------------------------------------------
            # AIM
            # ----------------------------------------------------

            if q_type == "aim":

                if section.upper() == "AIM":
                    final_score += 1.50

                elif section.upper() in {
                    "OBJECTIVE",
                    "OBJECTIVES",
                    "PURPOSE",
                }:
                    final_score += 1.20

                elif section.upper() in {
                    "THEORY",
                    "ALGORITHM",
                    "PROCEDURE",
                    "METHODOLOGY",
                    "RESULT",
                    "RESULTS",
                    "OUTPUT",
                    "CONCLUSION",
                }:
                    final_score -= 1.00

            # ----------------------------------------------------
            # THEORY
            # ----------------------------------------------------

            elif q_type == "theory":

                if section.upper() == "THEORY":
                    final_score += 2.00

                elif section.upper() == "GENERAL":
                    final_score -= 1.50

                elif section.upper() == "AIM":
                    final_score -= 1.00

            # ----------------------------------------------------
            # ALGORITHM
            # ----------------------------------------------------

            elif q_type == "algorithm":

                if section.upper() == "ALGORITHM":
                    final_score += 2.00

                elif section.upper() == "PROCEDURE":
                    final_score += 1.50

                elif section.upper() == "GENERAL":
                    final_score -= 1.20

            # ----------------------------------------------------
            # METHODOLOGY
            # ----------------------------------------------------

            elif q_type == "methodology":

                if section.upper() == "METHODOLOGY":
                    final_score += 2.00

                elif section.upper() == "IMPLEMENTATION":
                    final_score += 1.50

                elif section.upper() == "PROCEDURE":
                    final_score += 1.20

                elif section.upper() == "GENERAL":
                    final_score -= 1.20

            # ----------------------------------------------------
            # RESULT
            # ----------------------------------------------------

            elif q_type == "result":

                if section.upper() in {
                    "RESULT",
                    "RESULTS",
                    "OUTPUT",
                }:
                    final_score += 2.00

                elif section.upper() == "GENERAL":
                    final_score -= 1.20

                elif section.upper() == "THEORY":
                    final_score -= 0.80

            # ----------------------------------------------------
            # CONCLUSION
            # ----------------------------------------------------

            elif q_type == "conclusion":

                if section.upper() == "CONCLUSION":
                    final_score += 2.00

                elif section.upper() in {
                    "RESULT",
                    "RESULTS",
                }:
                    final_score += 0.80

                elif section.upper() == "GENERAL":
                    final_score -= 1.20

            # ----------------------------------------------------
            # COMPLEXITY
            # ----------------------------------------------------

            elif q_type == "complexity":

                if section.upper() in {
                    "THEORY",
                    "ALGORITHM",
                }:
                    final_score += 1.20

                elif section.upper() == "GENERAL":
                    final_score -= 0.80

        # ====================================================
        # SAVE RESULT
        # ====================================================

        candidates.append({

            "text": text,

            "score": float(
                final_score
            ),

            "semantic_score": float(
                semantic_raw
            ),

            "keyword_score": float(
                lexical
            ),

            "page": chunk.get(
                "page",
                None,
            ),

            "section": section,
        })

    # ========================================================
    # SORT BY FINAL SCORE
    # ========================================================

    candidates.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    # ========================================================
    # REMOVE DUPLICATE / NEAR-DUPLICATE RESULTS
    # ========================================================

    final_results = []

    seen_texts = []

    for candidate in candidates:

        normalized = re.sub(
            r"\s+",
            " ",
            candidate["text"].lower(),
        ).strip()

        # Exact duplicate
        if normalized in seen_texts:
            continue

        # Simple near-duplicate protection
        is_duplicate = False

        for existing in seen_texts:

            if (
                normalized in existing
                or existing in normalized
            ):
                is_duplicate = True
                break

        if is_duplicate:
            continue

        seen_texts.append(
            normalized
        )

        final_results.append(
            candidate
        )

        if len(final_results) >= top_k:
            break

    return final_results