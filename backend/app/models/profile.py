import uuid
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class LearningProfile(Base):
    __tablename__ = "learning_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    learning_style = Column(String(50), default="interactive", nullable=False)
    study_duration_mins = Column(Integer, default=45, nullable=False)
    daily_study_hours = Column(Integer, default=3, nullable=False)
    learning_speed = Column(String(20), default="normal", nullable=False)
    completion_rate = Column(Float, default=0.0, nullable=False)
    preferred_revision_interval_days = Column(Integer, default=2, nullable=False)
    weak_topics = Column(JSONB, default=list, nullable=False)
    strong_topics = Column(JSONB, default=list, nullable=False)
    favorite_artifact_types = Column(JSONB, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    recommendation_type = Column(String(50), default="revision", nullable=False)
    target_link = Column(String(500), nullable=True)
    priority = Column(String(20), default="MEDIUM", nullable=False)
    is_dismissed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")
