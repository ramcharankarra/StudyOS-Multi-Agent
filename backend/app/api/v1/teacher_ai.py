import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user, get_current_active_teacher
from app.models.user import User
from app.models.course import Course
from app.models.material import Material
from app.models.assignment import Assignment
from app.models.quiz import Quiz
from app.models.notification import Announcement
from app.models.collaboration import Discussion
from app.agents.registry import AgentRegistry
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/teacher-ai", tags=["teacher_ai_tools"])
logger = logging.getLogger("teacher_ai")


class GenerateCourseInput(BaseModel):
    title: str = Field(..., min_length=3)
    target_audience: Optional[str] = "University Students"
    num_modules: Optional[int] = 4


class GenerateRubricInput(BaseModel):
    assignment_title: str = Field(..., min_length=3)
    criteria_count: Optional[int] = 3


class GenerateFeedbackInput(BaseModel):
    student_name: str
    quiz_score: float
    weak_topics: List[str]


class TeacherSuiteGoalInput(BaseModel):
    goal: str = Field(..., min_length=3)
    course_id: Optional[str] = None


class PublishTeacherSuiteInput(BaseModel):
    course_id: str
    suite_data: Dict[str, Any]


@router.post("/generate-suite", status_code=status.HTTP_200_OK)
async def generate_teacher_ai_suite(
    payload: TeacherSuiteGoalInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_teacher)
):
    """
    Teacher AI Suite Generator:
    Generates complete draft classroom assets using Google Gemini:
    - Lecture Notes
    - PPT Slide Outlines & Speaker Notes
    - Assignment & Grading Rubric
    - Quiz & Answer Key
    - Class Announcement
    - Discussion Board Questions
    - Weekly Lesson Plan
    Returns a reviewable draft for the teacher before publishing to PostgreSQL.
    """
    logger.info(f"[TeacherAI] Generating classroom suite for goal: '{payload.goal}'")

    prompt = f"""You are StudyOS Teacher AI Assistant.
The instructor gave the following educational objective:
'{payload.goal}'

Generate a complete, highly structured classroom lesson suite.
Respond ONLY with a JSON object matching this schema:
{{
  "suite_title": "Title of the lesson / package",
  "lecture_notes": "Comprehensive lecture notes text with clear headings, core formulas, and key concepts.",
  "ppt_outline": [
    {{ "slide_number": 1, "title": "Slide Title", "bullets": ["Point 1", "Point 2"], "speaker_notes": "Explanation" }}
  ],
  "assignment": {{
    "title": "Assignment Title",
    "description": "Clear step-by-step instructions for students",
    "points": 100
  }},
  "rubric": [
    {{ "criteria": "Technical Accuracy", "weight": "40%", "description": "Solves problems accurately" }},
    {{ "criteria": "Structure & Clarity", "weight": "30%", "description": "Well formatted" }},
    {{ "criteria": "Insight & Analysis", "weight": "30%", "description": "Demonstrates deep understanding" }}
  ],
  "quiz": {{
    "title": "Practice Quiz & Knowledge Check",
    "description": "5-question quiz to test student comprehension",
    "questions": [
      {{
        "question": "Sample Question Text",
        "options": ["A. Choice 1", "B. Choice 2", "C. Choice 3", "D. Choice 4"],
        "correct_answer": "A. Choice 1",
        "explanation": "Why this answer is correct"
      }}
    ]
  }},
  "announcement": {{
    "title": "Class Announcement Title",
    "description": "Clear notice text for enrolled students",
    "priority": "HIGH"
  }},
  "discussion_questions": [
    "Discussion Question 1 for online board",
    "Discussion Question 2 for critical thinking"
  ],
  "weekly_lesson_plan": [
    "Day 1: Introduction and Core Concepts",
    "Day 2: Mathematical Foundation",
    "Day 3: Practical Implementation",
    "Day 4: Case Studies",
    "Day 5: Review & Assessment"
  ]
}}
"""

    fallback_data = {
        "suite_title": f"Lesson Suite: {payload.goal}",
        "lecture_notes": f"Lecture Notes for {payload.goal}\n\n1. Introduction\n2. Key Concepts\n3. Practical Applications",
        "ppt_outline": [
          {"slide_number": 1, "title": f"Introduction to {payload.goal[:30]}", "bullets": ["Overview", "Learning Objectives"], "speaker_notes": "Welcome class"}
        ],
        "assignment": {
          "title": f"Assignment on {payload.goal[:30]}",
          "description": "Complete exercises and write up conclusions.",
          "points": 100
        },
        "rubric": [
          {"criteria": "Accuracy", "weight": "50%", "description": "Correct solutions"},
          {"criteria": "Clarity", "weight": "50%", "description": "Clear writing"}
        ],
        "quiz": {
          "title": f"Quiz: {payload.goal[:30]}",
          "description": "10-minute quiz",
          "questions": [
            {
              "question": "What is the primary objective of this lesson?",
              "options": ["A. Mastery of core concepts", "B. Memorization", "C. None", "D. All"],
              "correct_answer": "A. Mastery of core concepts",
              "explanation": "Focuses on deep conceptual understanding."
            }
          ]
        },
        "announcement": {
          "title": f"New Materials & Assignment Posted: {payload.goal[:30]}",
          "description": "Please review the new lecture notes and complete Assignment by next week.",
          "priority": "HIGH"
        },
        "discussion_questions": [
          f"How does {payload.goal[:30]} impact real-world AI applications?"
        ],
        "weekly_lesson_plan": [
          "Day 1: Overview", "Day 2: Deep Dive", "Day 3: Exercises", "Day 4: Case Studies", "Day 5: Assessment"
        ]
    }

    suite_data = await GeminiService.generate_json(prompt, fallback_data=fallback_data, agent_name="TeacherAISuite")
    return {
        "status": "success",
        "goal": payload.goal,
        "suite": suite_data
    }


@router.post("/publish-suite", status_code=status.HTTP_201_CREATED)
async def publish_teacher_ai_suite(
    payload: PublishTeacherSuiteInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_teacher)
):
    """
    Publish Teacher AI Suite:
    Saves approved lecture notes, assignments, quizzes, announcements, and discussions
    directly into PostgreSQL database tables for the selected course!
    """
    try:
        course_id = uuid.UUID(payload.course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course = db.query(Course).filter(Course.id == course_id, Course.teacher_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=403, detail="Course not found or teacher does not have access")

    s_data = payload.suite_data
    published_items = {}

    # 1. Publish Lecture Notes & Slides as Material
    if s_data.get("lecture_notes"):
        mat = Material(
            course_id=course.id,
            uploaded_by=current_user.id,
            title=f"Lecture Notes: {s_data.get('suite_title', 'AI Generated Lesson')}",
            file_url=f"data:text/markdown;base64,{s_data.get('lecture_notes')[:200]}",
            file_type="DOCUMENT"
        )
        db.add(mat)
        db.commit()
        db.refresh(mat)
        published_items["material_id"] = str(mat.id)

    # 2. Publish Assignment
    ass_info = s_data.get("assignment", {})
    if ass_info.get("title"):
        ass = Assignment(
            course_id=course.id,
            title=ass_info.get("title"),
            description=ass_info.get("description", "Complete assignment according to instructions."),
            deadline=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(ass)
        db.commit()
        db.refresh(ass)
        published_items["assignment_id"] = str(ass.id)

    # 3. Publish Quiz
    quiz_info = s_data.get("quiz", {})
    if quiz_info.get("title"):
        q_obj = Quiz(
            course_id=course.id,
            created_by=current_user.id,
            title=quiz_info.get("title"),
            description=quiz_info.get("description", "Course assessment quiz")
        )
        db.add(q_obj)
        db.commit()
        db.refresh(q_obj)

        for q_item in quiz_info.get("questions", []):
            if isinstance(q_item, dict) and (q_item.get("question") or q_item.get("question_text")):
                qq = QuizQuestion(
                    quiz_id=q_obj.id,
                    question_text=q_item.get("question") or q_item.get("question_text"),
                    question_type="MCQ",
                    options=q_item.get("options") or [],
                    correct_answer=q_item.get("correct_answer") or q_item.get("answer") or "",
                    explanation=q_item.get("explanation"),
                    points=q_item.get("points", 10)
                )
                db.add(qq)
        db.commit()
        published_items["quiz_id"] = str(q_obj.id)

    # 4. Publish Announcement
    ann_info = s_data.get("announcement", {})
    if ann_info.get("title"):
        ann = Announcement(
            course_id=course.id,
            teacher_id=current_user.id,
            title=ann_info.get("title"),
            description=ann_info.get("description", "New course materials published."),
            priority=ann_info.get("priority", "HIGH")
        )
        db.add(ann)
        db.commit()
        db.refresh(ann)
        published_items["announcement_id"] = str(ann.id)

    # 5. Publish Discussion Questions
    disc_questions = s_data.get("discussion_questions", [])
    if disc_questions:
        disc = Discussion(
            course_id=course.id,
            author_id=current_user.id,
            title=f"Discussion: {s_data.get('suite_title', 'Lesson Q&A')}",
            content="\n".join([f"• {q}" for q in disc_questions])
        )
        db.add(disc)
        db.commit()
        db.refresh(disc)
        published_items["discussion_id"] = str(disc.id)

    return {
        "status": "success",
        "message": f"Classroom suite successfully published to PostgreSQL course '{course.title}'",
        "published_items": published_items
    }


@router.post("/generate-course", status_code=status.HTTP_201_CREATED)
async def teacher_generate_course(
    payload: GenerateCourseInput,
    current_user: User = Depends(get_current_active_teacher)
):
    """Teacher AI Tool: Generate complete course structure with modules & lessons using Gemini."""
    agent = AgentRegistry.get("CourseManagementAgent")
    res = await agent.execute(payload.title, {"num_modules": payload.num_modules})
    return {
        "status": "success",
        "course_structure": res.get("data", {})
    }


@router.post("/generate-rubric")
async def teacher_generate_rubric(
    payload: GenerateRubricInput,
    current_user: User = Depends(get_current_active_teacher)
):
    """Teacher AI Tool: Generate assignment rubric."""
    prompt = (
        f"Generate a clear, detailed grading rubric for assignment '{payload.assignment_title}'.\n"
        "Return JSON with criteria, weight percentage, and performance level descriptions."
    )
    rubric_json = await GeminiService.generate_json(prompt, fallback_data={
        "assignment": payload.assignment_title,
        "criteria": [
            {"name": "Technical Accuracy", "weight": "50%", "description": "Solves problem correctly with logic"},
            {"name": "Structure & Clarity", "weight": "30%", "description": "Well formatted and clear explanations"},
            {"name": "Originality & Insight", "weight": "20%", "description": "Demonstrates thorough understanding"}
        ]
    })

    return {"status": "success", "rubric": rubric_json}


@router.post("/generate-feedback")
async def teacher_generate_feedback(
    payload: GenerateFeedbackInput,
    current_user: User = Depends(get_current_active_teacher)
):
    """Teacher AI Tool: Generate personalized feedback for student."""
    prompt = (
        f"Write supportive, constructive teacher feedback for student '{payload.student_name}'.\n"
        f"Quiz Score: {payload.quiz_score}%, Weak Topics: {', '.join(payload.weak_topics)}.\n"
        "Keep it encouraging, specific, and actionable."
    )
    feedback_text = await GeminiService.generate_response(prompt)
    return {"status": "success", "student_name": payload.student_name, "feedback": feedback_text}
