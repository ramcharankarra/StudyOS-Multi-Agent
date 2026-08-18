import uuid
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    # Relationships
    student = relationship("User")
    tasks = relationship("DailyTask", back_populates="plan", cascade="all, delete-orphan")


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("study_plans.id", ondelete="CASCADE"), nullable=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(20), default="MEDIUM", nullable=False) # HIGH, MEDIUM, LOW
    category = Column(String(50), default="REVISION", nullable=False) # REVISION, ASSIGNMENT, QUIZ, GOAL
    deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="pending", nullable=False) # pending, completed, rescheduled
    estimated_time = Column(Integer, default=30, nullable=False) # in minutes
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Artifact & Mission Linking
    artifact_id = Column(UUID(as_uuid=True), ForeignKey("mission_artifacts.id", ondelete="SET NULL"), nullable=True)
    mission_id = Column(UUID(as_uuid=True), ForeignKey("missions.id", ondelete="SET NULL"), nullable=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    resource_type = Column(String(50), nullable=True)

    # Relationships
    plan = relationship("StudyPlan", back_populates="tasks")
    student = relationship("User")
    artifact = relationship("MissionArtifact")
    mission = relationship("Mission")
    course = relationship("Course")


class LearningGoal(Base):
    __tablename__ = "learning_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    goal_text = Column(String(255), nullable=False)
    target_date = Column(DateTime(timezone=True), nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    student = relationship("User")
