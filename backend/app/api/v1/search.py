from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.course import Course, Enrollment
from app.models.material import Material
from app.models.assignment import Assignment
from app.models.quiz import Quiz
from app.models.notification import Announcement

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Global Search API across real database records:
    Courses, Materials, Assignments, Quizzes, and Announcements.
    """
    query_str = f"%{q}%"

    # Search Courses
    courses = db.query(Course).filter(
        Course.title.ilike(query_str) | Course.description.ilike(query_str)
    ).limit(10).all()

    # Search Materials
    materials = db.query(Material).filter(
        Material.title.ilike(query_str) | Material.description.ilike(query_str)
    ).limit(10).all()

    # Search Assignments
    assignments = db.query(Assignment).filter(
        Assignment.title.ilike(query_str) | Assignment.instructions.ilike(query_str)
    ).limit(10).all()

    # Search Quizzes
    quizzes = db.query(Quiz).filter(
        Quiz.title.ilike(query_str) | Quiz.description.ilike(query_str)
    ).limit(10).all()

    # Search Announcements
    announcements = db.query(Announcement).filter(
        Announcement.title.ilike(query_str) | Announcement.description.ilike(query_str)
    ).limit(10).all()

    return {
        "query": q,
        "results": {
            "courses": [
                {"id": str(c.id), "title": c.title, "description": c.description, "link": "/student/courses"}
                for c in courses
            ],
            "materials": [
                {"id": str(m.id), "title": m.title, "description": m.description, "file_type": m.file_type, "link": "/student/materials"}
                for m in materials
            ],
            "assignments": [
                {"id": str(a.id), "title": a.title, "instructions": a.instructions, "link": "/student/assignments"}
                for a in assignments
            ],
            "quizzes": [
                {"id": str(qz.id), "title": qz.title, "description": qz.description, "link": "/student/quizzes"}
                for qz in quizzes
            ],
            "announcements": [
                {"id": str(an.id), "title": an.title, "description": an.description, "link": "/student/notifications"}
                for an in announcements
            ]
        }
    }
