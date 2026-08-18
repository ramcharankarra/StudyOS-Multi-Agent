from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.memory import ConversationMemory
from app.models.mission import Mission, MissionArtifact
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/memory", tags=["memory"])


class MemoryUpdateInput(BaseModel):
    weak_topics: Optional[List[str]] = None
    strong_topics: Optional[List[str]] = None
    learning_preferences: Optional[Dict[str, Any]] = None


@router.get("/me")
def get_user_memory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """GET /api/v1/memory/me: Retrieve user's long-term AI memory."""
    memory = MemoryService.get_or_create_user_memory(db, current_user.id)
    return {
        "id": str(memory.id),
        "user_id": str(memory.user_id),
        "weak_topics": memory.weak_topics or [],
        "strong_topics": memory.strong_topics or [],
        "learning_preferences": memory.learning_preferences or {},
        "conversation_data": memory.conversation_data or {}
    }


@router.post("/update")
def update_user_memory(
    payload: MemoryUpdateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """POST /api/v1/memory/update: Update weak topics, strong topics, or learning preferences."""
    memory = MemoryService.get_or_create_user_memory(db, current_user.id)
    
    if payload.weak_topics is not None:
        memory.weak_topics = payload.weak_topics
    if payload.strong_topics is not None:
        memory.strong_topics = payload.strong_topics
    if payload.learning_preferences is not None:
        memory.learning_preferences = payload.learning_preferences

    db.commit()
    db.refresh(memory)
    return {
        "status": "success",
        "weak_topics": memory.weak_topics,
        "strong_topics": memory.strong_topics,
        "learning_preferences": memory.learning_preferences
    }


@router.get("/continuation")
def resolve_continuation_prompt(
    prompt: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """GET /api/v1/memory/continuation: Resolves 'Continue' or 'Resume' user prompts into specific next steps based on memory."""
    return MemoryService.resolve_continuation(db, current_user.id, prompt)


@router.get("/history")
def get_memory_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """GET /api/v1/memory/history: Returns study history, completed missions, and generated artifacts timeline."""
    memory = MemoryService.get_or_create_user_memory(db, current_user.id)
    c_data = memory.conversation_data or {}
    
    completed_missions = db.query(Mission).filter(
        Mission.user_id == current_user.id,
        Mission.status == "completed"
    ).order_by(Mission.completed_at.desc()).limit(20).all()

    return {
        "user_id": str(current_user.id),
        "total_completed_missions": len(completed_missions),
        "weak_topics": memory.weak_topics or [],
        "strong_topics": memory.strong_topics or [],
        "recent_missions": [
            {
                "id": str(m.id),
                "goal": m.goal,
                "completed_at": m.completed_at.strftime("%Y-%m-%d %H:%M") if m.completed_at else "",
                "artifacts_count": len(m.artifacts)
            }
            for m in completed_missions
        ],
        "mission_history_log": c_data.get("mission_history", [])
    }
