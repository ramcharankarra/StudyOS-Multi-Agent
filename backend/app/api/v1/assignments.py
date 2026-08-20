import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_role
from app.models.user import User
from app.models.course import Course, Enrollment
from app.models.assignment import Assignment, Submission

router = APIRouter(prefix="/assignments", tags=["assignments"])

class AssignmentCreateInput(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None

class SubmissionInput(BaseModel):
    file_url: Optional[str] = None
    submission_text: Optional[str] = None
    text_response: Optional[str] = None

@router.get("/course/{course_id}")
def list_course_assignments(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        c_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course = db.query(Course).filter(Course.id == c_uuid).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Enforce access permissions
    if current_user.role.lower() == "teacher":
        if course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized for this course")
    else:
        enr = db.query(Enrollment).filter(Enrollment.course_id == c_uuid, Enrollment.student_id == current_user.id).first()
        if not enr:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")

    assignments = db.query(Assignment).filter(Assignment.course_id == c_uuid).order_by(Assignment.created_at.desc()).all()
    
    # Enrich response for students with submission status and overdue state
    now = datetime.now(timezone.utc)
    result = []
    for a in assignments:
        a_dict = {
            "id": str(a.id),
            "course_id": str(a.course_id),
            "title": a.title,
            "description": a.description,
            "deadline": a.deadline.isoformat() if a.deadline else None,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }

        if current_user.role.lower() == "student":
            sub = db.query(Submission).filter(Submission.assignment_id == a.id, Submission.student_id == current_user.id).first()
            if sub:
                a_dict["status"] = sub.status.upper() # SUBMITTED, GRADED
                a_dict["submitted"] = True
                a_dict["submitted_at"] = sub.submitted_at.isoformat() if sub.submitted_at else None
                a_dict["file_url"] = sub.file_url
            else:
                a_dict["submitted"] = False
                if a.deadline and a.deadline.tzinfo is None:
                    deadline_utc = a.deadline.replace(tzinfo=timezone.utc)
                else:
                    deadline_utc = a.deadline

                if deadline_utc and now > deadline_utc:
                    a_dict["status"] = "OVERDUE"
                else:
                    a_dict["status"] = "PENDING"
        else:
            # For teacher: include submission counts
            subs_count = db.query(Submission).filter(Submission.assignment_id == a.id).count()
            a_dict["submission_count"] = subs_count

        result.append(a_dict)

    return result

@router.post("", status_code=status.HTTP_201_CREATED)
def create_assignment(
    assignment_in: AssignmentCreateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    try:
        c_uuid = uuid.UUID(assignment_in.course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course = db.query(Course).filter(Course.id == c_uuid).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the instructor for this course")

    parsed_deadline = None
    if assignment_in.deadline:
        try:
            parsed_deadline = datetime.fromisoformat(assignment_in.deadline.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid deadline ISO datetime format")

    assignment = Assignment(
        course_id=c_uuid,
        title=assignment_in.title,
        description=assignment_in.description,
        deadline=parsed_deadline
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return {
        "id": str(assignment.id),
        "course_id": str(assignment.course_id),
        "title": assignment.title,
        "description": assignment.description,
        "deadline": assignment.deadline.isoformat() if assignment.deadline else None,
        "created_at": assignment.created_at.isoformat() if assignment.created_at else None
    }

@router.get("/{assignment_id}")
def get_assignment_details(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        a_uuid = uuid.UUID(assignment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid assignment ID format")

    assignment = db.query(Assignment).filter(Assignment.id == a_uuid).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    course = db.query(Course).filter(Course.id == assignment.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Associated course not found")

    if current_user.role.lower() == "teacher":
        if course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this assignment")
    else:
        enr = db.query(Enrollment).filter(Enrollment.course_id == assignment.course_id, Enrollment.student_id == current_user.id).first()
        if not enr:
            raise HTTPException(status_code=403, detail="Not enrolled in the course for this assignment")

    subs_count = db.query(Submission).filter(Submission.assignment_id == a_uuid).count()

    res = {
        "id": str(assignment.id),
        "course_id": str(assignment.course_id),
        "course_title": course.title,
        "title": assignment.title,
        "description": assignment.description,
        "deadline": assignment.deadline.isoformat() if assignment.deadline else None,
        "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
        "submission_count": subs_count,
        "status": "published"
    }

    if current_user.role.lower() == "student":
        sub = db.query(Submission).filter(Submission.assignment_id == a_uuid, Submission.student_id == current_user.id).first()
        if sub:
            res["submitted"] = True
            res["user_status"] = sub.status.upper()
            res["submitted_at"] = sub.submitted_at.isoformat() if sub.submitted_at else None
            res["file_url"] = sub.file_url
        else:
            res["submitted"] = False
            now = datetime.now(timezone.utc)
            deadline_utc = assignment.deadline
            if deadline_utc and deadline_utc.tzinfo is None:
                deadline_utc = deadline_utc.replace(tzinfo=timezone.utc)
            if deadline_utc and now > deadline_utc:
                res["user_status"] = "OVERDUE"
            else:
                res["user_status"] = "PENDING"

    return res

@router.post("/{assignment_id}/submit", status_code=status.HTTP_201_CREATED)
def submit_assignment(
    assignment_id: str,
    submission_in: SubmissionInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    try:
        a_uuid = uuid.UUID(assignment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid assignment ID format")

    assignment = db.query(Assignment).filter(Assignment.id == a_uuid).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Verify student is enrolled in course
    enr = db.query(Enrollment).filter(Enrollment.course_id == assignment.course_id, Enrollment.student_id == current_user.id).first()
    if not enr:
        raise HTTPException(status_code=403, detail="You are not enrolled in this course")

    submission_content = submission_in.file_url or submission_in.submission_text or submission_in.text_response or "Submitted Work"

    # Update existing submission or create new record
    existing_sub = db.query(Submission).filter(Submission.assignment_id == a_uuid, Submission.student_id == current_user.id).first()
    if existing_sub:
        existing_sub.file_url = submission_content
        existing_sub.submitted_at = datetime.now(timezone.utc)
        existing_sub.status = "submitted"
        db.commit()
        db.refresh(existing_sub)
        sub_record = existing_sub
    else:
        sub_record = Submission(
            assignment_id=a_uuid,
            student_id=current_user.id,
            file_url=submission_content,
            status="submitted"
        )
        db.add(sub_record)
        db.commit()
        db.refresh(sub_record)

    return {
        "status": "success",
        "message": "Assignment submitted successfully",
        "submission_id": str(sub_record.id),
        "assignment_id": str(sub_record.assignment_id),
        "submitted_at": sub_record.submitted_at.isoformat() if sub_record.submitted_at else None
    }

@router.get("/{assignment_id}/submissions")
def get_assignment_submissions(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    try:
        a_uuid = uuid.UUID(assignment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid assignment ID format")

    assignment = db.query(Assignment).filter(Assignment.id == a_uuid).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    course = db.query(Course).filter(Course.id == assignment.course_id).first()
    if not course or course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view submissions for this course")

    # Get all enrolled students for the course
    enrollments = db.query(Enrollment).filter(Enrollment.course_id == assignment.course_id).all()
    student_ids = [e.student_id for e in enrollments]
    enrolled_students = db.query(User).filter(User.id.in_(student_ids)).all() if student_ids else []

    submissions_map = {
        s.student_id: s for s in db.query(Submission).filter(Submission.assignment_id == a_uuid).all()
    }
    
    result = []
    for student in enrolled_students:
        s = submissions_map.get(student.id)
        if s:
            is_graded = s.score is not None
            sub_status = "GRADED" if is_graded else (s.status or "SUBMITTED").upper()
            result.append({
                "id": str(s.id),
                "assignment_id": str(s.assignment_id),
                "student_id": str(student.id),
                "student_name": student.full_name or student.name or "Student",
                "student_email": student.email,
                "file_url": s.file_url,
                "status": sub_status,
                "submitted": True,
                "score": s.score if is_graded else None,
                "total_points": 100.0,
                "percentage": s.score if is_graded else None,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None
            })
        else:
            result.append({
                "id": None,
                "assignment_id": str(assignment.id),
                "student_id": str(student.id),
                "student_name": student.full_name or student.name or "Student",
                "student_email": student.email,
                "file_url": None,
                "status": "NOT_SUBMITTED",
                "submitted": False,
                "score": None,
                "total_points": 100.0,
                "percentage": None,
                "submitted_at": None
            })

    return result

@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    try:
        a_uuid = uuid.UUID(assignment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid assignment ID format")

    assignment = db.query(Assignment).filter(Assignment.id == a_uuid).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    course = db.query(Course).filter(Course.id == assignment.course_id).first()
    if not course or course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized to delete assignments for this course")

    db.delete(assignment)
    db.commit()

    return {
        "status": "success",
        "message": "Assignment deleted successfully",
        "assignment_id": assignment_id
    }
