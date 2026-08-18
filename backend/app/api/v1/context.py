import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.context_service import ContextService

router = APIRouter(prefix="/context", tags=["context"])
logger = logging.getLogger("context_api")

@router.get("/inspector")
def get_context_inspector(
    course_id: Optional[str] = Query(None),
    goal: Optional[str] = Query(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GET /api/v1/context/inspector
    Returns permission-checked AI Classroom Brain Context Inspection.
    Shows the user exactly which courses, materials, announcements, assignments, quizzes,
    planner events, and learning profile topics are currently indexed and used by the AI Brain.
    """
    context = ContextService.build_user_context(
        db=db,
        user=current_user,
        goal_prompt=goal or "General Educational Workspace",
        explicit_course_id=course_id
    )

    return {
        "user": context["user"],
        "target_course": context["target_course"],
        "enrolled_courses": context["enrolled_courses"],
        "materials_count": len(context["materials"]),
        "announcements_count": len(context["announcements"]),
        "assignments_count": len(context["assignments"]),
        "quizzes_count": len(context["quizzes"]),
        "discussions_count": len(context["discussions"]),
        "planner_events_count": len(context["planner_deadlines"]),
        "weak_topics": context["weak_topics"],
        "strong_topics": context["strong_topics"],
        "rag_chunks_indexed": len(context["rag_document_chunks"]),
        "materials": context["materials"][:5],
        "announcements": context["announcements"][:5],
        "assignments": context["assignments"][:5],
        "planner_deadlines": context["planner_deadlines"][:5],
        "recent_artifacts": context["artifact_summaries"][:5]
    }
