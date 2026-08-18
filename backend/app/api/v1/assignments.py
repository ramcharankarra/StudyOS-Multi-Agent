import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_role
from app.models.user import User
from app.models.assignment import Assignment, Submission

router = APIRouter(prefix="/assignments", tags=["assignments"])

class AssignmentCreateInput(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None

class SubmissionInput(BaseModel):
    file_url: Optional[str] = None
    text_response: Optional[str] = None

@router.get("/course/{course_id}")
def list_course_assignments(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignments = db.query(Assignment).filter(Assignment.course_id == course_id).order_by(Assignment.created_at.desc()).all()
    return assignments

@router.post("", status_code=status.HTTP_201_CREATED)
def create_assignment(
    assignment_in: AssignmentCreateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    assignment = Assignment(
        course_id=uuid.UUID(assignment_in.course_id),
        title=assignment_in.title,
        description=assignment_in.description
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment

@router.post("/{assignment_id}/submit", status_code=status.HTTP_201_CREATED)
def submit_assignment(
    assignment_id: str,
    submission_in: SubmissionInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    submission = Submission(
        assignment_id=uuid.UUID(assignment_id),
        student_id=current_user.id,
        file_url=submission_in.file_url or "",
        status="submitted"
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission

@router.get("/{assignment_id}/submissions")
def get_assignment_submissions(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    submissions = db.query(Submission).filter(Submission.assignment_id == assignment_id).all()
    return submissions
