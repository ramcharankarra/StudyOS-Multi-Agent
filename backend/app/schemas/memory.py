import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict

class ConversationMemoryBase(BaseModel):
    conversation_data: Optional[Dict[str, Any]] = None
    learning_preferences: Optional[Dict[str, Any]] = None
    weak_topics: Optional[List[str]] = None
    strong_topics: Optional[List[str]] = None

class ConversationMemoryUpdate(ConversationMemoryBase):
    pass

class ConversationMemoryResponse(ConversationMemoryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
