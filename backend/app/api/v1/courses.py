import uuid
import random
import string
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_role, require_permission
from app.models.user import User
from app.models.course import Course, Enrollment
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate, EnrollmentResponse, JoinCourseInput

router = APIRouter(prefix="/courses", tags=["courses"])


def generate_unique_join_code(db: Session, length: int = 7) -> str:
    """Generate a unique 6-8 uppercase alphanumeric join code (e.g. NLP7KQ8, DSA3X9M)."""
    chars = (string.ascii_uppercase + string.digits).replace("0", "").replace("O", "").replace("1", "").replace("I", "")
    for _ in range(100):
        code = "".join(random.choices(chars, k=length))
        existing = db.query(Course).filter(Course.join_code == code).first()
        if not existing:
            return code
    return uuid.uuid4().hex[:7].upper()


@router.get("", response_model=List[CourseResponse])
def list_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Role-Scoped Course Discovery:
    - Teacher: Returns ONLY courses created/owned by current_user.
    - Student: Returns ONLY courses explicitly joined by current_user (Enrollment record exists).
    """
    if current_user.role.lower() == "teacher":
        courses = db.query(Course).filter(Course.teacher_id == current_user.id).all()
    else:
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
        if not enrollments:
            return []
        course_ids = [e.course_id for e in enrollments]
        courses = db.query(Course).filter(Course.id.in_(course_ids)).all()

    # Backfill join codes if missing
    dirty = False
    for c in courses:
        if not c.join_code:
            c.join_code = generate_unique_join_code(db)
            db.add(c)
            dirty = True
    if dirty:
        db.commit()

    return courses


@router.get("/enrolled", response_model=List[CourseResponse])
def list_student_enrolled_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Explicit endpoint for Student Enrolled Courses.
    Queries ONLY Enrollment table where student_id == current_user.id.
    """
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
    if not enrollments:
        return []
    course_ids = [e.course_id for e in enrollments]
    courses = db.query(Course).filter(Course.id.in_(course_ids)).all()

    dirty = False
    for c in courses:
        if not c.join_code:
            c.join_code = generate_unique_join_code(db)
            db.add(c)
            dirty = True
    if dirty:
        db.commit()

    return courses


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_course(
    course_in: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    """
    Create a new course with a unique uppercase teacher join code.
    Creating a course NEVER automatically enrolls students.
    """
    join_code = generate_unique_join_code(db)
    course = Course(
        title=course_in.title,
        description=course_in.description,
        thumbnail_url=course_in.thumbnail_url,
        visibility=course_in.visibility,
        teacher_id=current_user.id,
        join_code=join_code,
        is_join_enabled=True
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.post("/join")
def join_course_by_code(
    payload: JoinCourseInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    """
    STRICT SECURE COURSE JOIN CODE VALIDATION.
    1. Trim whitespace & uppercase input.
    2. Search database for exact matching join code.
    3. Return 'Invalid course code' if no match.
    4. Return 'This course code is no longer valid' if disabled.
    5. Return 'You are already enrolled in this course.' if enrolled.
    6. Create PostgreSQL enrollment record atomically.
    """
    raw_code = payload.code.strip().upper()

    if not raw_code or len(raw_code) < 4:
        raise HTTPException(
            status_code=400,
            detail="Invalid course code format. Please check the code provided by your instructor."
        )

    # 1. Search database for exact matching join code
    course = db.query(Course).filter(Course.join_code == raw_code).first()
    if not course:
        raise HTTPException(
            status_code=404,
            detail="Invalid course code. Please check the code provided by your instructor."
        )

    # 2. Check if join code is disabled by instructor
    if not course.is_join_enabled:
        raise HTTPException(
            status_code=400,
            detail="This course code is no longer valid."
        )

    # 3. Check if student is already enrolled
    existing_enr = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == course.id
    ).first()

    if existing_enr:
        raise HTTPException(
            status_code=400,
            detail=f"You are already enrolled in this course."
        )

    # 4. Atomic PostgreSQL Enrollment Creation with duplicate constraint handling
    try:
        enr = Enrollment(student_id=current_user.id, course_id=course.id)
        db.add(enr)
        db.commit()
        db.refresh(enr)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"You are already enrolled in this course."
        )

    return {
        "status": "success",
        "message": f"Successfully joined {course.title}.",
        "course_id": str(course.id),
        "course_title": course.title
    }


@router.post("/{course_id}/regenerate-code")
def regenerate_course_join_code(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    """
    Regenerates a course join code. Old code immediately becomes invalid.
    """
    try:
        c_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course = db.query(Course).filter(Course.id == c_uuid, Course.teacher_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")

    new_code = generate_unique_join_code(db)
    course.join_code = new_code
    db.commit()

    return {
        "status": "success",
        "message": "Join code regenerated successfully.",
        "course_id": str(course.id),
        "join_code": course.join_code
    }


@router.post("/{course_id}/toggle-join")
def toggle_course_join_status(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    """
    Enables or disables course joining for a course.
    """
    try:
        c_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course = db.query(Course).filter(Course.id == c_uuid, Course.teacher_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")

    course.is_join_enabled = not course.is_join_enabled
    db.commit()

    return {
        "status": "success",
        "is_join_enabled": course.is_join_enabled,
        "message": "Join code enabled." if course.is_join_enabled else "Join code disabled."
    }


@router.get("/{course_id}", response_model=CourseResponse)
def get_course_detail(
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

    if not course.join_code:
        course.join_code = generate_unique_join_code(db)
        db.commit()

    return course


@router.put("/{course_id}", response_model=CourseResponse)
def edit_course(
    course_id: str,
    course_in: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    """
    Teacher updates course details (title, description, thumbnail_url, visibility, status).
    """
    try:
        c_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course = db.query(Course).filter(Course.id == c_uuid, Course.teacher_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")

    if course_in.title is not None:
        course.title = course_in.title
    if course_in.description is not None:
        course.description = course_in.description
    if course_in.thumbnail_url is not None:
        course.thumbnail_url = course_in.thumbnail_url
    if course_in.visibility is not None:
        course.visibility = course_in.visibility
    if course_in.status is not None:
        course.status = course_in.status

    db.commit()
    db.refresh(course)
    return course


@router.post("/{course_id}/archive")
def archive_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    """
    Toggles course archived status. Archived courses become read-only and disable new student join codes.
    """
    try:
        c_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course = db.query(Course).filter(Course.id == c_uuid, Course.teacher_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")

    if course.status == "ARCHIVED":
        course.status = "ACTIVE"
        course.is_join_enabled = True
        msg = f"Course '{course.title}' unarchived and activated."
    else:
        course.status = "ARCHIVED"
        course.is_join_enabled = False
        msg = f"Course '{course.title}' archived. Course is now read-only."

    db.commit()
    return {
        "status": "success",
        "course_status": course.status,
        "is_join_enabled": course.is_join_enabled,
        "message": msg
    }


@router.delete("/{course_id}")
def delete_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    """
    Permanently deletes course and cascade-deletes all associated materials,
    assignments, quizzes, announcements, enrollments, discussions, and AI context.
    """
    from app.models.material import Material
    from app.models.assignment import Assignment
    from app.models.quiz import Quiz
    from app.models.grade import Grade
    from app.models.notification import Announcement
    from app.models.collaboration import Discussion
    from app.models.mission import Mission
    from app.models.planner import DailyTask

    try:
        c_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course = db.query(Course).filter(Course.id == c_uuid, Course.teacher_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")

    title = course.title

    # Explicit cascade cleanup to prevent orphan records
    db.query(Enrollment).filter(Enrollment.course_id == c_uuid).delete(synchronize_session=False)
    db.query(Material).filter(Material.course_id == c_uuid).delete(synchronize_session=False)
    db.query(Assignment).filter(Assignment.course_id == c_uuid).delete(synchronize_session=False)
    db.query(Quiz).filter(Quiz.course_id == c_uuid).delete(synchronize_session=False)
    db.query(Grade).filter(Grade.course_id == c_uuid).delete(synchronize_session=False)
    db.query(Announcement).filter(Announcement.course_id == c_uuid).delete(synchronize_session=False)
    db.query(Discussion).filter(Discussion.course_id == c_uuid).delete(synchronize_session=False)
    db.query(DailyTask).filter(DailyTask.course_id == c_uuid).delete(synchronize_session=False)
    db.query(Course).filter(Course.id == c_uuid).delete(synchronize_session=False)

    db.commit()

    return {
        "status": "success",
        "message": f"Course '{title}' and all associated materials, assignments, and enrollment records have been permanently deleted."
    }


@router.delete("/{course_id}/leave")
def leave_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    """
    Student leaves course. Deletes ONLY the Enrollment record and course-specific planner tasks.
    Submissions and grades are retained for teacher records.
    """
    from app.models.planner import DailyTask

    try:
        c_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == c_uuid,
        Enrollment.student_id == current_user.id
    ).first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="You are not enrolled in this course.")

    course = db.query(Course).filter(Course.id == c_uuid).first()
    course_title = course.title if course else "the course"

    db.delete(enrollment)
    db.query(DailyTask).filter(DailyTask.course_id == c_uuid, DailyTask.student_id == current_user.id).delete(synchronize_session=False)
    db.commit()

    return {
        "status": "success",
        "message": f"You have left '{course_title}'. You will no longer see materials or AI workspace context for this course."
    }
