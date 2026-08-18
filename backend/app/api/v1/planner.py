import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_role
from app.models.user import User
from app.models.course import Course, Enrollment
from app.models.planner import StudyPlan, DailyTask, LearningGoal
from app.models.assignment import Assignment
from app.models.quiz import Quiz
from app.models.notification import Announcement
from app.models.mission import Mission, MissionArtifact
from app.models.memory import ConversationMemory
from app.agents.registry import AgentRegistry

router = APIRouter(prefix="/planner", tags=["planner"])


class TaskUpdateInput(BaseModel):
    status: Optional[str] = Field(None, pattern="^(pending|completed|rescheduled)$")
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None


class GeneratePlanInput(BaseModel):
    available_hours: Optional[int] = 3


@router.get("/calendar-sync")
def get_calendar_synchronized_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GET /api/v1/planner/calendar-sync
    Synchronizes calendar with Assignments, Quizzes, Announcements, Deadlines, and Artifacts.
    """
    # 1. Enrolled Courses
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
    course_ids = [e.course_id for e in enrollments]

    events: List[Dict[str, Any]] = []

    if course_ids:
        # Assignments
        assignments = db.query(Assignment).filter(Assignment.course_id.in_(course_ids)).all()
        for ass in assignments:
            events.append({
                "id": f"ass_{ass.id}",
                "type": "ASSIGNMENT",
                "title": f"Assignment Due: {ass.title}",
                "date": ass.deadline.strftime("%Y-%m-%d") if ass.deadline else "",
                "priority": "HIGH",
                "link": "/student/assignments"
            })

        # Announcements / Exam Notices
        announcements = db.query(Announcement).filter(Announcement.course_id.in_(course_ids)).all()
        for ann in announcements:
            events.append({
                "id": f"ann_{ann.id}",
                "type": "ANNOUNCEMENT",
                "title": f"Notice: {ann.title}",
                "date": ann.created_at.strftime("%Y-%m-%d") if ann.created_at else "",
                "priority": ann.priority,
                "link": "/student/courses"
            })

        # Quizzes
        quizzes = db.query(Quiz).filter(Quiz.course_id.in_(course_ids)).all()
        for q in quizzes:
            events.append({
                "id": f"quiz_{q.id}",
                "type": "QUIZ",
                "title": f"Quiz: {q.title}",
                "date": q.created_at.strftime("%Y-%m-%d") if q.created_at else "",
                "priority": "MEDIUM",
                "link": "/student/quizzes"
            })

    # Daily Study Tasks
    tasks = db.query(DailyTask).filter(DailyTask.student_id == current_user.id).all()
    for t in tasks:
        events.append({
            "id": f"task_{t.id}",
            "type": "STUDY_TASK",
            "title": t.title,
            "date": t.created_at.strftime("%Y-%m-%d") if t.created_at else "",
            "priority": t.priority,
            "status": t.status,
            "link": "/student/planner"
        })

    # Artifacts
    artifacts = db.query(MissionArtifact).join(Mission).filter(Mission.user_id == current_user.id).all()
    for art in artifacts:
        events.append({
            "id": f"art_{art.id}",
            "type": "ARTIFACT",
            "title": f"Artifact Generated: {art.title}",
            "date": art.created_at.strftime("%Y-%m-%d") if art.created_at else "",
            "priority": "MEDIUM",
            "link": art.link_url or "/student/artifacts"
        })

    return {
        "user_id": str(current_user.id),
        "total_events": len(events),
        "events": events
    }


@router.get("/exam-countdown")
def get_exam_countdown_and_recovery(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GET /api/v1/planner/exam-countdown
    Detects upcoming exams from announcements/assignments, calculates countdowns, and returns catch-up recovery schedule.
    """
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
    course_ids = [e.course_id for e in enrollments]

    exam_notices: List[Dict[str, Any]] = []

    if course_ids:
        anns = db.query(Announcement).filter(
            Announcement.course_id.in_(course_ids),
            Announcement.priority == "HIGH"
        ).all()

        for a in anns:
            if "exam" in a.title.lower() or "exam" in a.description.lower() or "midterm" in a.title.lower():
                # Default 7 days countdown if not specified
                exam_date = a.created_at + timedelta(days=7)
                days_left = max(1, (exam_date.date() - datetime.now(timezone.utc).date()).days)

                exam_notices.append({
                    "id": str(a.id),
                    "title": a.title,
                    "description": a.description,
                    "days_remaining": days_left,
                    "target_date": exam_date.strftime("%Y-%m-%d")
                })

    # Fallback exam countdown if none found
    if not exam_notices and course_ids:
        c_first = db.query(Course).filter(Course.id == course_ids[0]).first()
        c_name = c_first.title if c_first else "Course"
        exam_notices.append({
            "id": f"exam_{course_ids[0]}",
            "title": f"{c_name} Midterm Exam",
            "description": f"Comprehensive {c_name} Revision & Assessment",
            "days_remaining": 7,
            "target_date": (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
        })

    # Catch-Up Recovery Schedule based on Weak Topics
    mem = db.query(ConversationMemory).filter(ConversationMemory.user_id == current_user.id).first()
    weak_topics = mem.weak_topics if mem and mem.weak_topics else ["Core Fundamentals"]

    catchup_plan = [
        {"day": "Day 1", "topic": f"Catch-Up & Revision: {weak_topics[0]}", "duration": 45, "action": "Review Lecture Slides & Notes"},
        {"day": "Day 2", "topic": "Practice MCQs & Flashcards", "duration": 30, "action": "Complete Practice Quiz"},
        {"day": "Day 3", "topic": "Mock Assessment & Weakness Check", "duration": 60, "action": "Timed Mock Test"}
    ]

    return {
        "exam_countdowns": exam_notices,
        "catchup_recovery_plan": catchup_plan
    }


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_ai_study_plan(
    input_data: GeneratePlanInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    """
    AI Study Planner: Generates a personalized daily schedule using PlannerAgent.
    """
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
    course_ids = [e.course_id for e in enrollments]
    courses = db.query(Course).filter(Course.id.in_(course_ids)).all() if course_ids else []
    course_titles = [c.title for c in courses]

    mem = db.query(ConversationMemory).filter(ConversationMemory.user_id == current_user.id).first()
    weak_topics = mem.weak_topics if mem and mem.weak_topics else ["Core Course Fundamentals"]

    planner_agent = AgentRegistry.get("PlannerAgent")
    context = {
        "task_type": "generate_plan",
        "student_name": current_user.name,
        "courses": course_titles,
        "weak_topics": weak_topics,
        "available_hours": input_data.available_hours
    }

    if not planner_agent:
        raise HTTPException(status_code=500, detail="PlannerAgent not registered")

    result = await planner_agent.execute("Generate Plan", context)
    plan_output = result.get("data", {}).get("plan", {})

    study_plan = StudyPlan(
        student_id=current_user.id,
        title=plan_output.get("title", f"AI Study Plan for {current_user.name}"),
        description=plan_output.get("description", "Daily adaptive schedule")
    )
    db.add(study_plan)
    db.commit()
    db.refresh(study_plan)

    created_tasks = []
    for t in plan_output.get("daily_tasks", []):
        task_obj = DailyTask(
            plan_id=study_plan.id,
            student_id=current_user.id,
            title=t.get("title", "Study Task"),
            description=t.get("description", ""),
            priority=t.get("priority", "MEDIUM"),
            category=t.get("category", "REVISION"),
            estimated_time=t.get("estimated_time", 30),
            status="pending"
        )
        db.add(task_obj)
        created_tasks.append(task_obj)

    db.commit()

    return {
        "status": "success",
        "plan_id": str(study_plan.id),
        "title": study_plan.title,
        "suggestions": plan_output.get("suggestions", []),
        "tasks_count": len(created_tasks)
    }


@router.get("")
def get_student_study_plan(
    course_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    plan = db.query(StudyPlan).filter(StudyPlan.student_id == current_user.id).order_by(StudyPlan.created_at.desc()).first()
    
    tasks_query = db.query(DailyTask).filter(DailyTask.student_id == current_user.id)
    if course_id:
        try:
            c_uuid = uuid.UUID(course_id)
            tasks_query = tasks_query.filter(DailyTask.course_id == c_uuid)
        except Exception:
            pass

    tasks = tasks_query.order_by(DailyTask.deadline.asc().nulls_last(), DailyTask.created_at.asc()).all()
    
    plan_dict = None
    if plan:
        plan_dict = {
            "id": str(plan.id),
            "title": plan.title,
            "description": plan.description,
            "created_at": plan.created_at.isoformat() if plan.created_at else None
        }

    return {
        "plan": plan_dict,
        "tasks": [
            {
                "id": str(t.id),
                "title": t.title,
                "description": t.description,
                "priority": t.priority,
                "category": t.category,
                "status": t.status,
                "estimated_time": t.estimated_time,
                "deadline": t.deadline.isoformat() if t.deadline else (t.created_at.isoformat() if t.created_at else None),
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "artifact_id": str(t.artifact_id) if t.artifact_id else None,
                "mission_id": str(t.mission_id) if t.mission_id else None,
                "course_id": str(t.course_id) if t.course_id else None,
                "resource_type": t.resource_type or t.category,
                "resource_status": "generated" if t.artifact_id else ("generating" if t.mission_id else "unavailable"),
                "resource_url": t.artifact.link_url if t.artifact and t.artifact.link_url else ("/student/artifacts" if t.artifact_id else None)
            }
            for t in tasks
        ]
    }


@router.get("/today")
def get_today_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    tasks = db.query(DailyTask).filter(DailyTask.student_id == current_user.id).order_by(DailyTask.deadline.asc().nulls_last(), DailyTask.created_at.asc()).all()
    return [
        {
            "id": str(t.id),
            "title": t.title,
            "description": t.description,
            "priority": t.priority,
            "category": t.category,
            "status": t.status,
            "estimated_time": t.estimated_time,
            "deadline": t.deadline.isoformat() if t.deadline else (t.created_at.isoformat() if t.created_at else None),
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "artifact_id": str(t.artifact_id) if t.artifact_id else None,
            "mission_id": str(t.mission_id) if t.mission_id else None,
            "course_id": str(t.course_id) if t.course_id else None,
            "resource_type": t.resource_type or t.category,
            "resource_status": "generated" if t.artifact_id else ("generating" if t.mission_id else "unavailable"),
            "resource_url": t.artifact.link_url if t.artifact and t.artifact.link_url else ("/student/artifacts" if t.artifact_id else None)
        }
        for t in tasks
    ]


@router.put("/task/{task_id}")
def update_task_status(
    task_id: str,
    task_in: TaskUpdateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    task = db.query(DailyTask).filter(DailyTask.id == task_id, DailyTask.student_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_in.status:
        task.status = task_in.status
        if task_in.status == "completed":
            task.completed_at = datetime.now(timezone.utc)
        else:
            task.completed_at = None

    if task_in.title:
        task.title = task_in.title
    if task_in.description:
        task.description = task_in.description
    if task_in.priority:
        task.priority = task_in.priority

    db.add(task)
    db.commit()
    db.refresh(task)
    return {
        "id": str(task.id),
        "title": task.title,
        "status": task.status,
        "completed_at": task.completed_at
    }


@router.delete("/task/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    task = db.query(DailyTask).filter(DailyTask.id == task_id, DailyTask.student_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return None


@router.get("/summary")
def get_planner_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    """
    GET /api/v1/planner/summary
    Dynamically computes real planner metrics:
    - Today's Progress % (completed / total * 100)
    - Dynamic Estimated Study Time (sum of estimated_time in minutes)
    - Dynamic Study Streak (consecutive active days)
    - Empty State Detection (has_data flag)
    NO HARDCODED / PLACEHOLDER DATA.
    """
    tasks = db.query(DailyTask).filter(DailyTask.student_id == current_user.id).all()
    total_tasks = len(tasks)
    completed_tasks = [t for t in tasks if t.status == "completed"]
    completed_count = len(completed_tasks)

    # Dynamic Progress %
    progress_pct = round((completed_count / total_tasks) * 100, 1) if total_tasks > 0 else 0.0

    # Dynamic Estimated Study Time (Minutes)
    pending_tasks = [t for t in tasks if t.status == "pending"]
    today_estimated_minutes = sum(t.estimated_time for t in pending_tasks)
    weekly_estimated_minutes = sum(t.estimated_time for t in tasks)

    # Dynamic Study Streak Calculation
    completed_dates = set(
        t.completed_at.date() for t in completed_tasks if t.completed_at is not None
    )
    
    streak = 0
    today = datetime.now(timezone.utc).date()
    check_date = today

    # Count consecutive active days backwards from today or yesterday
    if check_date not in completed_dates:
        check_date = today - timedelta(days=1)

    while check_date in completed_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return {
        "user_id": str(current_user.id),
        "has_data": total_tasks > 0,
        "total_tasks": total_tasks,
        "completed_tasks": completed_count,
        "pending_tasks": len(pending_tasks),
        "progress_pct": progress_pct,
        "today_estimated_minutes": today_estimated_minutes,
        "weekly_estimated_minutes": weekly_estimated_minutes,
        "study_streak": streak
    }

