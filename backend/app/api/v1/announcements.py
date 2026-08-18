import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_role
from app.models.user import User
from app.models.course import Course, Enrollment
from app.models.notification import Announcement, Notification
from app.models.collaboration import Comment

router = APIRouter(prefix="/announcements", tags=["announcements"])


class AnnouncementInput(BaseModel):
    course_id: str
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    priority: str = Field("normal", pattern="^(normal|important|urgent)$")


class CommentInput(BaseModel):
    content: str = Field(..., min_length=1)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: AnnouncementInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    course_uuid = uuid.UUID(payload.course_id)
    course = db.query(Course).filter(Course.id == course_uuid).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You can only create announcements for your own courses."
        )

    announcement = Announcement(
        teacher_id=current_user.id,
        course_id=course_uuid,
        title=payload.title,
        description=payload.description,
        priority=payload.priority
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    # Notify all enrolled students
    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course_uuid
    ).all()

    for enrollment in enrollments:
        notif = Notification(
            user_id=enrollment.student_id,
            title=f"Announcement: {payload.title}",
            description=payload.description,
            type="announcement",
            link="/student/notifications"
        )
        db.add(notif)

    db.commit()

    return {
        "id": str(announcement.id),
        "title": announcement.title,
        "description": announcement.description,
        "priority": announcement.priority,
        "course_id": str(announcement.course_id),
        "course_name": course.title,
        "created_at": announcement.created_at
    }


@router.get("")
def list_announcements(
    course_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() == "teacher":
        query = db.query(Announcement).filter(
            Announcement.teacher_id == current_user.id
        )
        if course_id:
            query = query.filter(Announcement.course_id == uuid.UUID(course_id))
        announcements = query.order_by(Announcement.created_at.desc()).all()
    else:
        # Students see announcements ONLY for their enrolled courses
        enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id
        ).all()
        enrolled_course_ids = [e.course_id for e in enrollments]

        if course_id:
            c_uuid = uuid.UUID(course_id)
            if c_uuid not in enrolled_course_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You are not enrolled in this course."
                )
            target_ids = [c_uuid]
        else:
            target_ids = enrolled_course_ids

        announcements = db.query(Announcement).filter(
            Announcement.course_id.in_(target_ids)
        ).order_by(Announcement.created_at.desc()).all() if target_ids else []

    res = []
    for a in announcements:
        course = db.query(Course).filter(Course.id == a.course_id).first()
        teacher = db.query(User).filter(User.id == a.teacher_id).first()
        comment_count = db.query(Comment).filter(Comment.announcement_id == a.id).count()
        res.append({
            "id": str(a.id),
            "title": a.title,
            "description": a.description,
            "priority": a.priority,
            "course_id": str(a.course_id),
            "course_name": course.title if course else "Course",
            "teacher_name": teacher.name if teacher else "Instructor",
            "teacher_id": str(a.teacher_id),
            "comment_count": comment_count,
            "created_at": a.created_at
        })
    return res


@router.put("/{announcement_id}")
def update_announcement(
    announcement_id: str,
    payload: AnnouncementInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    ann_uuid = uuid.UUID(announcement_id)
    announcement = db.query(Announcement).filter(Announcement.id == ann_uuid).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    if announcement.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You can only edit your own announcements."
        )

    announcement.title = payload.title
    announcement.description = payload.description
    announcement.priority = payload.priority
    db.commit()
    db.refresh(announcement)

    return {
        "id": str(announcement.id),
        "title": announcement.title,
        "description": announcement.description,
        "priority": announcement.priority,
        "created_at": announcement.created_at
    }


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    ann_uuid = uuid.UUID(announcement_id)
    announcement = db.query(Announcement).filter(Announcement.id == ann_uuid).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    if announcement.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You can only delete your own announcements."
        )

    db.delete(announcement)
    db.commit()
    return None


@router.get("/{announcement_id}/comments")
def list_announcement_comments(
    announcement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ann_uuid = uuid.UUID(announcement_id)
    announcement = db.query(Announcement).filter(Announcement.id == ann_uuid).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    # Enforce strict RBAC course enrollment check for students
    if current_user.role.lower() == "student":
        enrolled = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == announcement.course_id
        ).first()
        if not enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not enrolled in this course."
            )

    comments = db.query(Comment).filter(
        Comment.announcement_id == ann_uuid
    ).order_by(Comment.created_at.asc()).all()

    res = []
    for c in comments:
        author = db.query(User).filter(User.id == c.author_id).first()
        res.append({
            "id": str(c.id),
            "announcement_id": str(c.announcement_id),
            "author_id": str(c.author_id),
            "author_name": author.name if author else "User",
            "author_role": author.role if author else "student",
            "content": c.content,
            "created_at": c.created_at
        })
    return res


@router.post("/{announcement_id}/comments", status_code=status.HTTP_201_CREATED)
def add_announcement_comment(
    announcement_id: str,
    payload: CommentInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ann_uuid = uuid.UUID(announcement_id)
    announcement = db.query(Announcement).filter(Announcement.id == ann_uuid).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    # Enforce strict RBAC course enrollment check for students
    if current_user.role.lower() == "student":
        enrolled = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == announcement.course_id
        ).first()
        if not enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not enrolled in this course."
            )

    comment = Comment(
        announcement_id=ann_uuid,
        author_id=current_user.id,
        content=payload.content
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "id": str(comment.id),
        "announcement_id": str(comment.announcement_id),
        "author_id": str(comment.author_id),
        "author_name": current_user.name,
        "author_role": current_user.role,
        "content": comment.content,
        "created_at": comment.created_at
    }
