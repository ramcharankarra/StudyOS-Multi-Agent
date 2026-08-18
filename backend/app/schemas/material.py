import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class MaterialBase(BaseModel):
    course_id: uuid.UUID
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    file_url: str
    file_type: str = Field("PDF", pattern="^(PDF|PPT|DOCX|TXT|IMAGE|VIDEO|AUDIO|OTHER)$")
    file_size: int = Field(0, ge=0)

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None

class MaterialResponse(MaterialBase):
    id: uuid.UUID
    uploaded_by: uuid.UUID
    processing_status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
