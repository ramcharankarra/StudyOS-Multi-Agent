from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_role
from app.models.user import User
from app.models.grade import Grade
from app.schemas.grade import GradeCreate, GradeResponse

router = APIRouter(prefix="/grades", tags=["grades"])

@router.get("/my-grades", response_model=List[GradeResponse])
def get_my_grades(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    grades = db.query(Grade).filter(Grade.student_id == current_user.id).all()
    return grades

@router.post("", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
def record_grade(
    grade_in: GradeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    grade = Grade(
        student_id=grade_in.student_id,
        course_id=grade_in.course_id,
        score=grade_in.score,
        feedback=grade_in.feedback
    )
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade
