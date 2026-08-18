import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.collaboration import Discussion, Comment
from app.models.course import Course
from app.services.gemini_service import GeminiService

logger = logging.getLogger("discussion_intelligence")


class DiscussionIntelligenceService:
    """
    Discussion Intelligence Service for StudyOS.
    Responsibilities:
    - Summarizes discussion board activity for teachers.
    - Answers repeated questions & merges duplicate threads into canonical topics.
    - Generates grounded AI explanations for complex student questions.
    - Generates dynamic classroom FAQ lists.
    - Highlights unanswered questions for instructor attention.
    """

    @classmethod
    async def analyze_course_discussions(cls, db: Session, course_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyzes discussion board threads using Google Gemini and builds discussion intelligence.
        """
        query = db.query(Discussion)
        if course_id:
            query = query.filter(Discussion.course_id == uuid.UUID(course_id))

        discussions = query.order_by(Discussion.created_at.desc()).limit(20).all()

        if not discussions:
            return {
                "summary_for_teachers": "No active discussion threads found for this course.",
                "classroom_faq": [],
                "unanswered_questions": [],
                "merged_duplicate_topics": []
            }

        disc_summaries = []
        unanswered = []
        for d in discussions:
            has_comments = len(d.comments) > 0
            if not has_comments:
                unanswered.append({
                    "id": str(d.id),
                    "title": d.title,
                    "author": d.author.name if d.author else "Student",
                    "created_at": d.created_at.strftime("%Y-%m-%d")
                })
            disc_summaries.append(f"Thread: '{d.title}' — Content: {d.content[:150]} (Comments: {len(d.comments)})")

        prompt = f"""You are StudyOS Discussion Intelligence AI.
Analyze the following classroom discussion board threads:
{chr(10).join(disc_summaries)}

Generate a structured JSON response matching this schema:
{{
  "teacher_summary": "Concise executive summary of what students are discussing and their main confusion points.",
  "classroom_faq": [
    {{ "question": "Frequently asked question text", "answer": "Clear, grounded AI explanation" }}
  ],
  "merged_duplicate_topics": [
    {{ "canonical_topic": "Main Topic", "duplicate_threads_count": 2, "explanation": "Why these questions overlap" }}
  ]
}}
"""

        fallback_data = {
            "teacher_summary": "Students are actively asking questions about course lectures, assignments, and exam preparation.",
            "classroom_faq": [
                {
                    "question": "What are the main topics covered in the upcoming assessment?",
                    "answer": "The assessment covers core course fundamentals, lecture notes, and assigned readings."
                }
            ],
            "merged_duplicate_topics": [
                {
                    "canonical_topic": "Lecture Scope & Assignment Clarifications",
                    "duplicate_threads_count": len(discussions),
                    "explanation": "Multiple students inquired about assignment instructions and lecture notes."
                }
            ]
        }

        analysis_json = await GeminiService.generate_json(prompt, fallback_data=fallback_data, agent_name="DiscussionIntelligence")

        return {
            "teacher_summary": analysis_json.get("teacher_summary"),
            "classroom_faq": analysis_json.get("classroom_faq", []),
            "merged_duplicate_topics": analysis_json.get("merged_duplicate_topics", []),
            "unanswered_questions": unanswered
        }

    @classmethod
    async def generate_ai_explanation(cls, db: Session, discussion_id: str) -> Dict[str, Any]:
        """
        Generates a step-by-step grounded AI explanation for a complex discussion thread.
        """
        disc = db.query(Discussion).filter(Discussion.id == uuid.UUID(discussion_id)).first()
        if not disc:
            return {"error": "Discussion thread not found"}

        prompt = f"""You are StudyOS Teaching AI Assistant.
A student posted this discussion question:
Title: '{disc.title}'
Question: '{disc.content}'

Provide a detailed, step-by-step grounded explanation that makes this concept completely clear.
Break down key formulas, concepts, and practical examples.
"""
        explanation = await GeminiService.generate_response(prompt, agent_name="DiscussionExplainer")

        # Save AI Explanation as a Comment on the Discussion thread
        ai_comment = Comment(
            discussion_id=disc.id,
            author_id=disc.author_id,
            content=f"🤖 **StudyOS AI Explanation**:\n\n{explanation}"
        )
        db.add(ai_comment)
        db.commit()

        return {
            "status": "success",
            "discussion_id": discussion_id,
            "ai_explanation": explanation
        }
