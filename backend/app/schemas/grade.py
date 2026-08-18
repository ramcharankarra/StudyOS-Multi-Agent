import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class GradeBase(BaseModel):
    student_id: uuid.UUID
    course_id: uuid.UUID
    score: float = Field(..., ge=0, le=100)
    feedback: Optional[str] = None

class GradeCreate(GradeBase):
    pass

class GradeResponse(GradeBase):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
