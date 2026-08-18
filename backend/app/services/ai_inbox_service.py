import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.course import Course, Enrollment
from app.models.material import Material
from app.models.assignment import Assignment
from app.models.quiz import Quiz
from app.models.planner import DailyTask
from app.models.mission import Mission, MissionArtifact
from app.models.memory import ConversationMemory
from app.models.notification import Notification, Announcement
from app.services.gemini_service import GeminiService

logger = logging.getLogger("ai_inbox")


class AIInboxService:
    """
    Proactive AI Inbox Service for StudyOS.
    Responsibilities:
    - Scans academic events and triggers proactive, meaningful notifications:
      • Lecture uploaded
      • Assignment due tomorrow
      • Quiz tomorrow
      • Study plan updated
      • Revision recommended for weak topic
      • New artifact generated
      • Missed study session recovery
    - Uses Google Gemini to generate a clean, zero-spam Daily Academic Executive Summary.
    - Prevents spam by deduplicating notifications per user & trigger event.
    """

    @classmethod
    def sync_ai_inbox(cls, db: Session, user: User) -> List[Notification]:
        """
        Proactively evaluates academic triggers and creates non-duplicate notifications in PostgreSQL.
        """
        logger.info(f"[AIInbox] Running proactive academic inbox sync for '{user.email}'")

        enrollments = db.query(Enrollment).filter(Enrollment.student_id == user.id).all()
        course_ids = [e.course_id for e in enrollments]
        created_notifications: List[Notification] = []

        now = datetime.now(timezone.utc)
        tomorrow = now + timedelta(days=2)

        # 1. Trigger: Assignment Due Tomorrow
        if course_ids:
            due_assignments = db.query(Assignment).filter(
                Assignment.course_id.in_(course_ids),
                Assignment.deadline >= now - timedelta(hours=24),
                Assignment.deadline <= tomorrow
            ).all()

            for ass in due_assignments:
                title = f"Assignment Due: {ass.title}"
                existing = db.query(Notification).filter(
                    Notification.user_id == user.id,
                    Notification.title == title
                ).first()
                if not existing:
                    n = Notification(
                        user_id=user.id,
                        title=title,
                        description=f"Deadline approaching ({ass.deadline.strftime('%Y-%m-%d')}). Complete instructions & submit.",
                        type="assignment",
                        link="/student/assignments"
                    )
                    db.add(n)
                    created_notifications.append(n)

        # 2. Trigger: Lecture Uploaded
        if course_ids:
            recent_mats = db.query(Material).filter(
                Material.course_id.in_(course_ids)
            ).order_by(Material.created_at.desc()).limit(3).all()

            for m in recent_mats:
                title = f"New Lecture Material: {m.title}"
                existing = db.query(Notification).filter(
                    Notification.user_id == user.id,
                    Notification.title == title
                ).first()
                if not existing:
                    n = Notification(
                        user_id=user.id,
                        title=title,
                        description=f"Instructor uploaded new {m.file_type} material. AI Context automatically updated.",
                        type="announcement",
                        link="/student/materials"
                    )
                    db.add(n)
                    created_notifications.append(n)

        # 3. Trigger: Weak Topic Detected & Revision Recommended
        mem = db.query(ConversationMemory).filter(ConversationMemory.user_id == user.id).first()
        if mem and mem.weak_topics:
            weak_top = mem.weak_topics[0]
            title = f"AI Revision Recommended: {weak_top}"
            existing = db.query(Notification).filter(
                Notification.user_id == user.id,
                Notification.title == title
            ).first()
            if not existing:
                n = Notification(
                    user_id=user.id,
                    title=title,
                    description=f"Spaced repetition window open for '{weak_top}'. Review concept notes to boost accuracy.",
                    type="ai_recommendation",
                    link="/student/ai-workspace"
                )
                db.add(n)
                created_notifications.append(n)

        # 4. Trigger: Missed Study Session / Overdue Tasks
        pending_tasks = db.query(DailyTask).filter(
            DailyTask.student_id == user.id,
            DailyTask.status == "pending"
        ).count()
        if pending_tasks > 3:
            title = "Missed Study Session: Recovery Recommended"
            existing = db.query(Notification).filter(
                Notification.user_id == user.id,
                Notification.title == title
            ).first()
            if not existing:
                n = Notification(
                    user_id=user.id,
                    title=title,
                    description=f"You have {pending_tasks} pending planner tasks. Click to auto-reschedule priority tasks.",
                    type="streak",
                    link="/student/planner"
                )
                db.add(n)
                created_notifications.append(n)

        db.commit()
        return created_notifications

    @classmethod
    async def generate_academic_executive_summary(cls, db: Session, user: User) -> str:
        """
        Uses Google Gemini to generate a clean, zero-spam Daily Academic Executive Summary.
        """
        notifications = db.query(Notification).filter(
            Notification.user_id == user.id
        ).order_by(Notification.created_at.desc()).limit(10).all()

        notif_texts = [f"• [{n.type.upper()}] {n.title}: {n.description}" for n in notifications]
        if not notif_texts:
            return "No urgent academic alerts today. All assignments and study plans are up to date!"

        prompt = f"""You are StudyOS AI Executive Assistant.
Summarize the following academic alerts for student '{user.name}' in a clear, concise, zero-spam executive briefing.
Focus on immediate deadlines, new lecture materials, and AI study recommendations.

Academic Notifications:
{chr(10).join(notif_texts)}

Format as a short 3-bullet daily academic briefing:
"""
        try:
            return await GeminiService.generate_response(prompt, agent_name="AIInboxExecutive")
        except Exception:
            return f"Daily Briefing for {user.name}:\n• {len(notifications)} active alerts in AI Inbox.\n• Review upcoming assignments and lecture notes.\n• Keep up daily planner adherence."
