import uuid
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.memory import ConversationMemory
from app.models.mission import Mission, MissionArtifact

logger = logging.getLogger("memory_service")


class MemoryService:
    """
    AI Memory Service — Persistent Long-Term Memory for StudyOS.
    Responsibilities:
    - Stores and retrieves completed missions, generated artifacts, weak topics, strong topics,
      learning preferences, and study history per user.
    - Context-Aware Continuation: Resolves prompts like "Continue", "Resume" into specific next steps based on memory.
    - Seamless integration with ContextService & Mission Engine.
    """

    @classmethod
    def get_or_create_user_memory(cls, db: Session, user_id: uuid.UUID) -> ConversationMemory:
        memory = db.query(ConversationMemory).filter(ConversationMemory.user_id == user_id).first()
        if not memory:
            memory = ConversationMemory(
                user_id=user_id,
                conversation_data={
                    "mission_history": [],
                    "revision_history": []
                },
                learning_preferences={
                    "preferred_study_hours": 3,
                    "preferred_style": "visual_and_structured"
                },
                weak_topics=[],
                strong_topics=[]
            )
            db.add(memory)
            db.commit()
            db.refresh(memory)
        return memory

    @classmethod
    def record_mission_completion(
        cls,
        db: Session,
        user_id: uuid.UUID,
        mission_id: uuid.UUID,
        goal: str,
        artifacts: List[MissionArtifact]
    ) -> None:
        """
        Appends completed mission and artifacts to user's long-term memory in PostgreSQL.
        """
        memory = cls.get_or_create_user_memory(db, user_id)
        c_data = memory.conversation_data or {}
        m_history = c_data.get("mission_history", [])

        artifact_titles = [a.title for a in artifacts]
        m_history.append({
            "mission_id": str(mission_id),
            "goal": goal,
            "artifacts_count": len(artifacts),
            "artifact_titles": artifact_titles,
            "timestamp": memory.updated_at.strftime("%Y-%m-%d %H:%M") if memory.updated_at else ""
        })

        # Keep last 50 missions in memory
        c_data["mission_history"] = m_history[-50:]
        c_data["last_completed_goal"] = goal
        c_data["last_completed_artifacts"] = artifact_titles

        memory.conversation_data = c_data
        
        # Auto-update weak / strong topics based on goal keywords
        goal_lower = goal.lower()
        if "exam" in goal_lower or "revision" in goal_lower:
            topic = goal.replace("Prepare me for", "").replace("exam", "").replace("in 10 days", "").strip()
            if topic and topic not in (memory.weak_topics or []):
                w_topics = memory.weak_topics or []
                w_topics.append(topic)
                memory.weak_topics = w_topics

        db.commit()
        logger.info(f"[MemoryService] Recorded mission completion for user '{user_id}': '{goal}' ({len(artifacts)} artifacts)")

    @classmethod
    def resolve_continuation(cls, db: Session, user_id: uuid.UUID, user_prompt: str) -> Dict[str, Any]:
        """
        Detects if user prompt is a continuation request ("Continue", "Resume", "Next step").
        If so, retrieves the last completed mission and artifacts from AI Memory and builds next phase goal!
        """
        prompt_clean = user_prompt.strip().lower()
        continuation_keywords = ["continue", "resume", "keep going", "next step", "continue previous", "what's next"]

        is_continuation = any(kw == prompt_clean or kw in prompt_clean for kw in continuation_keywords)

        if not is_continuation:
            return {
                "is_continuation": False,
                "resolved_goal": user_prompt,
                "previous_context": None
            }

        # Retrieve last completed mission
        last_mission = db.query(Mission).filter(
            Mission.user_id == user_id,
            Mission.status == "completed"
        ).order_by(Mission.completed_at.desc()).first()

        if not last_mission:
            return {
                "is_continuation": True,
                "resolved_goal": "Resume Study Plan: Review foundational concepts and prepare next study session.",
                "previous_context": "No previous completed missions found."
            }

        last_artifacts = db.query(MissionArtifact).filter(MissionArtifact.mission_id == last_mission.id).all()
        art_titles = [a.title for a in last_artifacts]

        resolved_goal = (
            f"Continue Mission Phase 2: Follow up on previous goal '{last_mission.goal}' "
            f"using generated artifacts ({', '.join(art_titles[:3])}). Generate mock test and practice exercises."
        )

        logger.info(f"[MemoryService] Resolved Continuation Request for user '{user_id}': '{resolved_goal}'")

        return {
            "is_continuation": True,
            "last_mission_id": str(last_mission.id),
            "last_goal": last_mission.goal,
            "resolved_goal": resolved_goal,
            "previous_artifacts": art_titles
        }
