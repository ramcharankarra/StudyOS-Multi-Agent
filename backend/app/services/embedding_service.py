import random
from typing import List

class EmbeddingService:
    """
    RAG Pipeline Embedding Service generating vector representations for document chunks.
    Prepared for pgvector / Gemini text embedding models.
    """
    @staticmethod
    def generate_embedding(text: str, dimension: int = 768) -> List[float]:
        # Deterministic pseudo-random float vector generation based on text hash
        seed = sum(ord(c) for c in text[:100]) if text else 42
        rng = random.Random(seed)
        return [round(rng.uniform(-1.0, 1.0), 4) for _ in range(dimension)]
