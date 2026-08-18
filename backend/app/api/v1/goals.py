import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.planner import LearningGoal
from app.models.notification import Notification, Achievement
from app.models.memory import ConversationMemory

router = APIRouter(prefix="", tags=["goals_and_inbox"])


class CreateGoalInput(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    target_score: Optional[int] = 90
    priority: Optional[str] = "normal"
    deadline_days: Optional[int] = 10


# ---------------------------------------------------------------
# Goals REST API
# ---------------------------------------------------------------

@router.get("/goals")
def list_user_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goals = db.query(LearningGoal).filter(
        LearningGoal.user_id == current_user.id
    ).order_by(LearningGoal.created_at.desc()).all()

    return [
        {
            "id": str(g.id),
            "title": g.title,
            "description": g.description,
            "status": g.status,
            "progress_pct": g.progress_pct,
            "target_score": 90,
            "target_date": g.target_date,
            "created_at": g.created_at
        }
        for g in goals
    ]


@router.post("/goals", status_code=status.HTTP_201_CREATED)
def create_user_goal(
    payload: CreateGoalInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = LearningGoal(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        status="On Track",
        progress_pct=25
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return {
        "status": "success",
        "goal_id": str(goal.id),
        "title": goal.title,
        "progress_pct": goal.progress_pct
    }


@router.get("/goals/{id}")
def get_goal_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = db.query(LearningGoal).filter(
        LearningGoal.id == id,
        LearningGoal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return {
        "id": str(goal.id),
        "title": goal.title,
        "description": goal.description,
        "status": goal.status,
        "progress_pct": goal.progress_pct,
        "target_score": 90,
        "target_date": goal.target_date,
        "created_at": goal.created_at
    }


# ---------------------------------------------------------------
# AI Inbox REST API
# ---------------------------------------------------------------

@router.get("/inbox")
def get_ai_inbox_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Proactive AI Inbox updates for the student."""
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()

    return [
        {
            "id": str(n.id),
            "title": n.title,
            "description": n.description,
            "type": n.type,
            "is_read": n.is_read,
            "link": n.link,
            "created_at": n.created_at
        }
        for n in notifs
    ]


# ---------------------------------------------------------------
# Smart Recommendations REST API
# ---------------------------------------------------------------

@router.get("/recommendations")
def get_smart_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mem = db.query(ConversationMemory).filter(ConversationMemory.user_id == current_user.id).first()
    weak_topics = mem.weak_topics if mem and mem.weak_topics else ["Core Subject Topics", "Foundational Modules"]

    return {
        "recommendations": [
            {
                "id": "rec_1",
                "title": f"Revise Weak Topic: {weak_topics[0] if weak_topics else 'Neural Networks'}",
                "description": "Your quiz score indicates room for improvement in loss function optimization.",
                "action_type": "LAUNCH_MISSION",
                "priority": "HIGH"
            },
            {
                "id": "rec_2",
                "title": "Practice 25 Self-Testing Flashcards",
                "description": "Flashcard practice boosts long-term retention before exam day.",
                "action_type": "OPEN_ARTIFACT",
                "priority": "MEDIUM"
            }
        ]
    }


# ---------------------------------------------------------------
# AI Insights REST API
# ---------------------------------------------------------------

@router.get("/insights")
def get_learning_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return {
        "insights": [
            {
                "metric": "Quiz Accuracy",
                "value": "88%",
                "trend": "+12% this week",
                "status": "improving"
            },
            {
                "metric": "Study Streak",
                "value": "7 Days",
                "trend": "Personal Best!",
                "status": "streak"
            },
            {
                "metric": "Missions Completed",
                "value": "12 Missions",
                "trend": "48 artifacts generated",
                "status": "active"
            }
        ]
    }


# ---------------------------------------------------------------
# Achievements REST API
# ---------------------------------------------------------------

@router.get("/achievements")
def get_user_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    achievements = db.query(Achievement).filter(
        Achievement.user_id == current_user.id
    ).order_by(Achievement.unlocked_at.desc()).all()

    return [
        {
            "id": str(a.id),
            "title": a.title,
            "description": a.description,
            "icon": a.icon,
            "badge_color": a.badge_color,
            "unlocked_at": a.unlocked_at
        }
        for a in achievements
    ]
