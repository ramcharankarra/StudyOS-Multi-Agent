import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.mission import MissionArtifact, Mission
from app.models.planner import DailyTask

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


class CreateArtifactInput(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    artifact_type: str = "NOTES"
    mission_id: Optional[str] = None
    course_id: Optional[str] = None
    content_json: Optional[Dict[str, Any]] = None
    link_url: Optional[str] = None
    tags: Optional[List[str]] = None


class UpdateArtifactInput(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content_json: Optional[Dict[str, Any]] = None
    is_favorite: Optional[bool] = None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_artifact(
    payload: CreateArtifactInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new reusable Knowledge Artifact in PostgreSQL."""
    artifact = MissionArtifact(
        user_id=current_user.id,
        mission_id=uuid.UUID(payload.mission_id) if payload.mission_id else None,
        course_id=uuid.UUID(payload.course_id) if payload.course_id else None,
        artifact_type=payload.artifact_type.upper(),
        title=payload.title,
        description=payload.description,
        content_json=payload.content_json,
        link_url=payload.link_url,
        is_favorite=False
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)

    return {
        "status": "success",
        "artifact_id": str(artifact.id),
        "title": artifact.title,
        "artifact_type": artifact.artifact_type
    }


@router.get("")
def list_user_artifacts(
    artifact_type: Optional[str] = None,
    course_id: Optional[str] = None,
    mission_id: Optional[str] = None,
    favorite_only: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all artifacts created for user missions or courses.
    Permanently stored in PostgreSQL database.
    """
    query = db.query(MissionArtifact).outerjoin(Mission, MissionArtifact.mission_id == Mission.id).filter(
        (MissionArtifact.user_id == current_user.id) | (Mission.user_id == current_user.id)
    )

    if favorite_only:
        query = query.filter(MissionArtifact.is_favorite == True)

    if artifact_type:
        query = query.filter(MissionArtifact.artifact_type == artifact_type.upper())

    if course_id:
        try:
            query = query.filter(MissionArtifact.course_id == uuid.UUID(course_id))
        except ValueError:
            pass

    if mission_id:
        try:
            query = query.filter(MissionArtifact.mission_id == uuid.UUID(mission_id))
        except ValueError:
            pass

    artifacts = query.order_by(MissionArtifact.created_at.desc()).all()

    return [
        {
            "id": str(a.id),
            "user_id": str(a.user_id) if a.user_id else str(current_user.id),
            "mission_id": str(a.mission_id) if a.mission_id else None,
            "course_id": str(a.course_id) if a.course_id else None,
            "artifact_type": a.artifact_type,
            "title": a.title,
            "description": a.description,
            "content_json": a.content_json,
            "link_url": a.link_url,
            "is_favorite": a.is_favorite,
            "created_at": a.created_at,
            "updated_at": a.updated_at if hasattr(a, "updated_at") and a.updated_at else a.created_at
        }
        for a in artifacts
    ]


@router.get("/search")
def search_artifacts(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search artifacts by title, description, or artifact type."""
    query_str = f"%{q}%"
    artifacts = db.query(MissionArtifact).outerjoin(Mission, MissionArtifact.mission_id == Mission.id).filter(
        ((MissionArtifact.user_id == current_user.id) | (Mission.user_id == current_user.id)),
        (
            MissionArtifact.title.ilike(query_str) |
            MissionArtifact.description.ilike(query_str) |
            MissionArtifact.artifact_type.ilike(query_str)
        )
    ).order_by(MissionArtifact.created_at.desc()).limit(20).all()

    return [
        {
            "id": str(a.id),
            "user_id": str(a.user_id) if a.user_id else str(current_user.id),
            "mission_id": str(a.mission_id) if a.mission_id else None,
            "course_id": str(a.course_id) if a.course_id else None,
            "artifact_type": a.artifact_type,
            "title": a.title,
            "description": a.description,
            "link_url": a.link_url,
            "is_favorite": a.is_favorite,
            "created_at": a.created_at
        }
        for a in artifacts
    ]


@router.get("/{id}")
def get_artifact_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        art_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid artifact ID format")

    artifact = db.query(MissionArtifact).filter(MissionArtifact.id == art_uuid).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    return {
        "id": str(artifact.id),
        "user_id": str(artifact.user_id) if artifact.user_id else str(current_user.id),
        "mission_id": str(artifact.mission_id) if artifact.mission_id else None,
        "course_id": str(artifact.course_id) if artifact.course_id else None,
        "artifact_type": artifact.artifact_type,
        "title": artifact.title,
        "description": artifact.description,
        "content_json": artifact.content_json,
        "link_url": artifact.link_url,
        "is_favorite": artifact.is_favorite,
        "created_at": artifact.created_at,
        "updated_at": artifact.updated_at if hasattr(artifact, "updated_at") and artifact.updated_at else artifact.created_at
    }


@router.put("/{id}")
def update_artifact(
    id: str,
    payload: UpdateArtifactInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        art_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid artifact ID format")

    artifact = db.query(MissionArtifact).filter(MissionArtifact.id == art_uuid).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    if payload.title is not None:
        artifact.title = payload.title
    if payload.description is not None:
        artifact.description = payload.description
    if payload.content_json is not None:
        artifact.content_json = payload.content_json
    if payload.is_favorite is not None:
        artifact.is_favorite = payload.is_favorite

    db.add(artifact)
    db.commit()
    db.refresh(artifact)

    return {
        "status": "success",
        "artifact_id": str(artifact.id),
        "title": artifact.title,
        "is_favorite": artifact.is_favorite
    }


@router.post("/{id}/favorite")
def toggle_favorite_artifact(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        art_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid artifact ID format")

    artifact = db.query(MissionArtifact).filter(MissionArtifact.id == art_uuid).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    artifact.is_favorite = not artifact.is_favorite
    db.commit()

    return {
        "status": "success",
        "artifact_id": str(artifact.id),
        "is_favorite": artifact.is_favorite
    }


@router.post("/{id}/duplicate")
def duplicate_artifact(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        art_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid artifact ID format")

    artifact = db.query(MissionArtifact).filter(MissionArtifact.id == art_uuid).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    dup = MissionArtifact(
        user_id=current_user.id,
        mission_id=artifact.mission_id,
        course_id=artifact.course_id,
        artifact_type=artifact.artifact_type,
        title=f"{artifact.title} (Copy)",
        description=artifact.description,
        content_json=artifact.content_json,
        link_url=artifact.link_url,
        is_favorite=False
    )
    db.add(dup)
    db.commit()
    db.refresh(dup)

    return {
        "status": "success",
        "artifact_id": str(dup.id),
        "title": dup.title
    }


@router.delete("/clear-all", status_code=status.HTTP_200_OK)
def clear_all_generated_user_artifacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permanently deletes all AI-generated study resources, notes, quizzes, flashcards, mind maps,
    and study plans for the current user.
    SAFETY GUARANTEE: Does NOT delete teacher uploaded PDFs, courses, assignments, quizzes, announcements, or enrollments!
    """
    user_artifacts = db.query(MissionArtifact).outerjoin(Mission, MissionArtifact.mission_id == Mission.id).filter(
        (MissionArtifact.user_id == current_user.id) | (Mission.user_id == current_user.id)
    ).all()

    artifact_ids = [a.id for a in user_artifacts]

    if artifact_ids:
        db.query(DailyTask).filter(
            (DailyTask.student_id == current_user.id) & (DailyTask.artifact_id.in_(artifact_ids))
        ).delete(synchronize_session=False)

    db.query(DailyTask).filter(DailyTask.student_id == current_user.id).delete(synchronize_session=False)

    deleted_count = len(user_artifacts)
    for a in user_artifacts:
        db.delete(a)

    db.query(Mission).filter(Mission.user_id == current_user.id).delete(synchronize_session=False)
    db.commit()

    return {
        "status": "success",
        "message": "All generated resources have been cleared.",
        "deleted_artifacts_count": deleted_count
    }


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_artifact(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        art_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid artifact ID format")

    artifact = db.query(MissionArtifact).filter(MissionArtifact.id == art_uuid).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    # Clean up linked Planner DailyTask
    db.query(DailyTask).filter(DailyTask.artifact_id == art_uuid).delete(synchronize_session=False)

    db.delete(artifact)
    db.commit()
    return None
