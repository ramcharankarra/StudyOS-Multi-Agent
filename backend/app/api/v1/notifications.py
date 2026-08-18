import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.notification import Notification

from app.services.ai_inbox_service import AIInboxService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/ai-inbox")
async def get_proactive_ai_inbox(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GET /api/v1/notifications/ai-inbox
    Proactive AI Inbox: Syncs triggers, fetches zero-spam notifications, and generates Gemini Executive Summary.
    """
    AIInboxService.sync_ai_inbox(db, current_user)
    summary = await AIInboxService.generate_academic_executive_summary(db, current_user)

    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(30).all()

    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()

    return {
        "user_id": str(current_user.id),
        "unread_count": unread_count,
        "executive_summary": summary,
        "notifications": [
            {
                "id": str(n.id),
                "title": n.title,
                "description": n.description,
                "type": n.type,
                "is_read": n.is_read,
                "link": n.link,
                "created_at": n.created_at
            }
            for n in notifications
        ]
    }


@router.post("/ai-inbox/sync")
def sync_ai_inbox_manually(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """POST /api/v1/notifications/ai-inbox/sync: Force syncs academic triggers."""
    created = AIInboxService.sync_ai_inbox(db, current_user)
    return {"status": "success", "new_notifications": len(created)}


@router.get("")
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()

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
        for n in notifications
    ]


@router.put("/read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"status": "read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(n)
    db.commit()
    return None
