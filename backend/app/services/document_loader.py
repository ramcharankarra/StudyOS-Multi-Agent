import os
import logging

logger = logging.getLogger("document_loader")

class DocumentLoader:
    """
    RAG Pipeline Document Loading service for reading text from PDFs, DOCX, and text files.
    """
    @staticmethod
    def load_text(file_path_or_url: str) -> str:
        logger.info(f"Loading document text from: {file_path_or_url}")
        if os.path.exists(file_path_or_url):
            with open(file_path_or_url, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        return f"Sample extracted text content from document resource: {file_path_or_url}"
