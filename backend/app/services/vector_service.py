import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.ai import DocumentChunk
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService

class VectorService:
    """
    RAG Pipeline Vector Service storing and searching document chunk embeddings in PostgreSQL.
    """
    @staticmethod
    def process_and_store_document(db: Session, material_id: str, document_text: str) -> List[DocumentChunk]:
        chunks = ChunkingService.chunk_text(document_text)
        created_records = []
        
        for chunk_text in chunks:
            embedding = EmbeddingService.generate_embedding(chunk_text)
            record = DocumentChunk(
                material_id=uuid.UUID(material_id),
                content=chunk_text,
                embedding=embedding
            )
            db.add(record)
            created_records.append(record)

        db.commit()
        return created_records

    @staticmethod
    def similarity_search(db: Session, material_id: str, query: str, top_k: int = 3) -> List[DocumentChunk]:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.material_id == material_id).limit(top_k).all()
        return chunks
