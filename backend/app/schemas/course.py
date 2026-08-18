import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class CourseBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    visibility: str = Field("public", pattern="^(public|private)$")
    status: str = Field("ACTIVE", pattern="^(ACTIVE|ARCHIVED)$")

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    visibility: Optional[str] = Field(None, pattern="^(public|private)$")
    status: Optional[str] = Field(None, pattern="^(ACTIVE|ARCHIVED)$")

class CourseResponse(CourseBase):
    id: uuid.UUID
    teacher_id: uuid.UUID
    join_code: Optional[str] = None
    is_join_enabled: bool = True
    status: str = "ACTIVE"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class JoinCourseInput(BaseModel):
    code: str = Field(..., min_length=1)

class EnrollmentCreate(BaseModel):
    course_id: uuid.UUID

class EnrollmentResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    course_id: uuid.UUID
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)
