import uuid
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Mission(Base):
    __tablename__ = "missions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    goal = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="running", nullable=False)  # draft, queued, planning, running, waiting, completed, failed, cancelled, archived
    priority = Column(String(20), default="normal", nullable=False)  # low, normal, high, urgent
    progress_pct = Column(Integer, default=0, nullable=False)
    estimated_time = Column(String(50), default="1 Minute 42 Seconds", nullable=False)
    target_role = Column(String(20), default="STUDENT", nullable=False)  # STUDENT, TEACHER
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User")
    tasks = relationship("MissionTask", back_populates="mission", cascade="all, delete-orphan")
    logs = relationship("MissionLog", back_populates="mission", cascade="all, delete-orphan")
    artifacts = relationship("MissionArtifact", back_populates="mission", cascade="all, delete-orphan")


class MissionTask(Base):
    __tablename__ = "mission_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id = Column(UUID(as_uuid=True), ForeignKey("missions.id", ondelete="CASCADE"), nullable=False)
    parent_task_id = Column(UUID(as_uuid=True), nullable=True)
    task_name = Column(String(255), nullable=False)
    task_type = Column(String(50), default="Custom", nullable=False)  # Planning, Research, Document Processing, RAG Retrieval, Generate Notes, Generate Flashcards, Generate Quiz, etc.
    agent_name = Column(String(100), nullable=False)
    status = Column(String(30), default="pending", nullable=False)  # pending, ready, queued, running, waiting, completed, failed, cancelled, skipped, retrying
    step_order = Column(Integer, default=1, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    estimated_duration = Column(Integer, default=15, nullable=False)  # in seconds
    output_summary = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    task_metadata = Column(JSONB, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    mission = relationship("Mission", back_populates="tasks")
    logs = relationship("TaskLog", back_populates="task", cascade="all, delete-orphan")


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("mission_tasks.id", ondelete="CASCADE"), nullable=False)
    depends_on_task_id = Column(UUID(as_uuid=True), ForeignKey("mission_tasks.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class TaskLog(Base):
    __tablename__ = "task_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("mission_tasks.id", ondelete="CASCADE"), nullable=False)
    message = Column(String(255), nullable=False)
    log_type = Column(String(30), default="info", nullable=False)  # info, success, warning, error
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    task = relationship("MissionTask", back_populates="logs")


class MissionLog(Base):
    __tablename__ = "mission_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id = Column(UUID(as_uuid=True), ForeignKey("missions.id", ondelete="CASCADE"), nullable=False)
    timestamp_str = Column(String(20), nullable=False)
    message = Column(String(255), nullable=False)
    log_type = Column(String(30), default="info", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    mission = relationship("Mission", back_populates="logs")


class MissionArtifact(Base):
    __tablename__ = "mission_artifacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    mission_id = Column(UUID(as_uuid=True), ForeignKey("missions.id", ondelete="CASCADE"), nullable=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    artifact_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    content_json = Column(JSONB, nullable=True)
    link_url = Column(String(500), nullable=True)
    is_favorite = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User")
    mission = relationship("Mission", back_populates="artifacts")
    course = relationship("Course")
