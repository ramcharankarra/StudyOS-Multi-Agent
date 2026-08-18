import os
import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("pdf_processing_service")


class PDFProcessingService:
    """
    Automated PDF & Document Processing Service for StudyOS.
    Responsibilities:
    - Text extraction from uploaded PDF, PPTX, DOCX, TXT streams.
    - Document Chunking & RAG Metadata Generation.
    - Subject Classification & Mismatch Validation for Course Uploads.
    """

    @classmethod
    def extract_text(cls, contents: bytes, filename: str) -> str:
        """
        Extracts plain text content from uploaded document bytes.
        Validates magic bytes (%PDF) before attempting PDF parsing.
        """
        if not contents:
            return ""

        # Validate magic bytes for PDF format (%PDF)
        is_real_pdf = contents.startswith(b"%PDF")
        
        # 1. Real PDF Text Extraction
        if is_real_pdf:
            try:
                import pypdf
                import io
                reader = pypdf.PdfReader(io.BytesIO(contents))
                text_pages = []
                for idx, page in enumerate(reader.pages, 1):
                    t = page.extract_text()
                    if t and t.strip():
                        text_pages.append(f"[Page {idx}]\n{t.strip()}")
                full_text = "\n\n".join(text_pages)
                if full_text.strip():
                    return full_text
            except Exception as e:
                logger.warning(f"pypdf extraction failed for '{filename}': {e}")

            # Fallback regex string extraction for PDF streams
            try:
                raw_str = contents.decode("latin-1", errors="ignore")
                extracted = re.findall(r'\(([^()]{3,})\)', raw_str)
                if extracted:
                    return " ".join(extracted[:1000])
            except Exception as e:
                logger.warning(f"PDF raw string extraction fallback failed: {e}")
        else:
            if filename.lower().endswith(".pdf") or "pdf" in filename.lower():
                logger.info(f"[PDFProcessingService] File '{filename}' does not start with '%PDF' magic header. Processing as plain text document.")

        # 2. Plain text / Markdown / JSON / CSV
        try:
            decoded = contents.decode("utf-8", errors="ignore")
            if decoded.strip():
                return decoded
        except Exception as e:
            logger.warning(f"Failed to decode text file: {e}")

        try:
            return contents.decode("latin-1", errors="ignore")
        except Exception:
            return ""

    @classmethod
    def extract_pages(cls, contents: bytes, filename: str) -> List[Dict[str, Any]]:
        """
        Extracts text page by page with explicit page number metadata.
        Returns: List[{"page": int, "text": str}]
        """
        if not contents:
            return []

        is_real_pdf = contents.startswith(b"%PDF")

        if is_real_pdf:
            try:
                import pypdf
                import io
                reader = pypdf.PdfReader(io.BytesIO(contents))
                pages = []
                for idx, page in enumerate(reader.pages, 1):
                    t = page.extract_text()
                    if t and t.strip():
                        pages.append({"page": idx, "text": t.strip()})
                if pages:
                    return pages
            except Exception as e:
                logger.warning(f"pypdf page extraction failed for '{filename}': {e}")

        # Non-PDF fallback: Treat as single or sectioned page
        full_text = cls.extract_text(contents, filename)
        if not full_text:
            return []
        
        # Split by double newlines or 1000 words per page equivalent
        paragraphs = [p.strip() for p in full_text.split("\n\n") if p.strip()]
        pages = []
        curr_page = []
        curr_len = 0
        p_num = 1
        for p in paragraphs:
            curr_page.append(p)
            curr_len += len(p)
            if curr_len > 1500:
                pages.append({"page": p_num, "text": "\n\n".join(curr_page)})
                curr_page = []
                curr_len = 0
                p_num += 1
        if curr_page:
            pages.append({"page": p_num, "text": "\n\n".join(curr_page)})

        return pages if pages else [{"page": 1, "text": full_text}]

    @classmethod
    def chunk_document(cls, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        Chunks text into overlapping segments for RAG Indexing.
        """
        words = text.split()
        if not words:
            return []

        chunks = []
        for i in range(0, len(words), max(1, chunk_size - overlap)):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)

        return chunks

    @classmethod
    def validate_subject_alignment(cls, text: str, course_title: str, filename: str) -> Dict[str, Any]:
        """
        Subject Validation:
        Classifies uploaded document text against course title.
        If document content is about a completely different subject (e.g. Operating Systems uploaded to NLP),
        returns a Subject Mismatch Warning to prompt the teacher for confirmation!
        """
        if not text or len(text.strip()) < 30:
            return {"is_mismatch": False, "detected_subject": course_title, "warning": None}

        # Subject keyword dictionary
        subjects = {
            "Operating Systems": ["kernel", "process management", "deadlock", "paging", "virtual memory", "semaphore", "scheduling", "os notes"],
            "Natural Language Processing": ["nlp", "tokenization", "attention mechanism", "transformer", "bert", "gpt", "word2vec", "linguistics"],
            "Deep Learning": ["neural network", "backpropagation", "cnn", "rnn", "gradient descent", "pytorch", "tensorflow", "loss function"],
            "Data Security": ["cryptography", "encryption", "rsa", "cybersecurity", "firewall", "vulnerability", "hash function"],
            "Computer Vision": ["image processing", "opencv", "convolution", "object detection", "segmentation", "pixels", "yolo"],
            "Database Systems": ["sql", "relational database", "normalization", "transactions", "acid", "er diagram", "postgres"]
        }

        text_lower = (filename + " " + text[:2000]).lower()
        course_title_lower = course_title.lower()

        # Find best matching subject in document content
        best_subject = None
        max_hits = 0

        for subj, keywords in subjects.items():
            hits = sum(1 for kw in keywords if kw in text_lower)
            if hits > max_hits:
                max_hits = hits
                best_subject = subj

        # Check if detected subject differs from course title
        if best_subject and max_hits >= 2:
            # If best_subject keywords do not match course_title
            course_matched = any(kw in course_title_lower for kw in subjects.get(best_subject, [])) or (best_subject.lower() in course_title_lower)
            
            if not course_matched and best_subject.lower() not in course_title_lower:
                warning_msg = f"This document appears to belong to {best_subject} instead of {course_title}. Do you still want to upload it?"
                logger.info(f"[SubjectValidation Warning]: {warning_msg}")
                return {
                    "is_mismatch": True,
                    "detected_subject": best_subject,
                    "warning": warning_msg
                }

        return {"is_mismatch": False, "detected_subject": course_title, "warning": None}
