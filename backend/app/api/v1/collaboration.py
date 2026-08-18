import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.collaboration import Bookmark, Discussion, Comment, SharedArtifact
from app.services.discussion_intelligence_service import DiscussionIntelligenceService

router = APIRouter(prefix="", tags=["collaboration_and_bookmarks"])


class BookmarkCreateInput(BaseModel):
    target_type: str = Field(..., pattern="^(artifact|material|quiz|course)$")
    target_id: str
    title: str
    link_url: Optional[str] = None


class DiscussionCreateInput(BaseModel):
    course_id: Optional[str] = None
    title: str = Field(..., min_length=3)
    content: str = Field(..., min_length=5)
    is_pinned: Optional[bool] = False


class CommentCreateInput(BaseModel):
    content: str = Field(..., min_length=1)


class SharedArtifactCreateInput(BaseModel):
    artifact_id: str
    course_id: Optional[str] = None
    title: str
    link_url: Optional[str] = None


# ---------------------------------------------------------------
# Discussion Intelligence Endpoints (Phase 8)
# ---------------------------------------------------------------

@router.get("/discussions/intelligence")
async def get_discussion_intelligence(
    course_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GET /api/v1/discussions/intelligence
    Discussion Intelligence: Returns teacher summaries, classroom FAQs, merged duplicate topics,
    and highlights unanswered questions.
    """
    return await DiscussionIntelligenceService.analyze_course_discussions(db, course_id)


@router.post("/discussions/{discussion_id}/ai-explain")
async def generate_ai_explanation_for_discussion(
    discussion_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    POST /api/v1/discussions/{discussion_id}/ai-explain
    Generates a step-by-step grounded AI explanation for a complex student question.
    """
    res = await DiscussionIntelligenceService.generate_ai_explanation(db, discussion_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


# ---------------------------------------------------------------
# Bookmarks Endpoints
# ---------------------------------------------------------------

@router.post("/bookmarks", status_code=status.HTTP_201_CREATED)
def create_bookmark(
    payload: BookmarkCreateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.target_id == payload.target_id
    ).first()

    if existing:
        return {"status": "exists", "id": str(existing.id)}

    bm = Bookmark(
        user_id=current_user.id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        title=payload.title,
        link_url=payload.link_url
    )
    db.add(bm)
    db.commit()
    db.refresh(bm)

    return {"status": "created", "id": str(bm.id), "title": bm.title}


@router.get("/bookmarks")
def list_user_bookmarks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bms = db.query(Bookmark).filter(Bookmark.user_id == current_user.id).order_by(Bookmark.created_at.desc()).all()
    return [
        {
            "id": str(b.id),
            "target_type": b.target_type,
            "target_id": b.target_id,
            "title": b.title,
            "link_url": b.link_url,
            "created_at": b.created_at
        }
        for b in bms
    ]


@router.delete("/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(
    bookmark_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bm = db.query(Bookmark).filter(
        Bookmark.id == bookmark_id,
        Bookmark.user_id == current_user.id
    ).first()

    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    db.delete(bm)
    db.commit()
    return None


# ---------------------------------------------------------------
# Discussions & Q&A Endpoints
# ---------------------------------------------------------------

@router.get("/discussions")
def list_discussions(
    course_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Discussion)
    if course_id:
        query = query.filter(Discussion.course_id == course_id)

    discussions = query.order_by(Discussion.is_pinned.desc(), Discussion.created_at.desc()).all()
    return [
        {
            "id": str(d.id),
            "course_id": str(d.course_id) if d.course_id else None,
            "author_id": str(d.author_id),
            "author_name": d.author.name if d.author else "Student",
            "title": d.title,
            "content": d.content,
            "is_pinned": d.is_pinned,
            "comments_count": len(d.comments),
            "created_at": d.created_at
        }
        for d in discussions
    ]


@router.post("/discussions", status_code=status.HTTP_201_CREATED)
def create_discussion(
    payload: DiscussionCreateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    disc = Discussion(
        course_id=uuid.UUID(payload.course_id) if payload.course_id else None,
        author_id=current_user.id,
        title=payload.title,
        content=payload.content,
        is_pinned=payload.is_pinned or False
    )
    db.add(disc)
    db.commit()
    db.refresh(disc)

    return {
        "status": "created",
        "id": str(disc.id),
        "title": disc.title
    }


@router.get("/discussions/{discussion_id}")
def get_discussion_detail(
    discussion_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    disc = db.query(Discussion).filter(Discussion.id == discussion_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion thread not found")

    return {
        "id": str(disc.id),
        "title": disc.title,
        "content": disc.content,
        "author_name": disc.author.name if disc.author else "Student",
        "is_pinned": disc.is_pinned,
        "created_at": disc.created_at,
        "comments": [
            {
                "id": str(c.id),
                "author_name": c.author.name if c.author else "Student",
                "content": c.content,
                "created_at": c.created_at
            }
            for c in disc.comments
        ]
    }


@router.post("/discussions/{discussion_id}/comments", status_code=status.HTTP_201_CREATED)
def add_comment_to_discussion(
    discussion_id: str,
    payload: CommentCreateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    disc = db.query(Discussion).filter(Discussion.id == discussion_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion thread not found")

    comment = Comment(
        discussion_id=disc.id,
        author_id=current_user.id,
        content=payload.content
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "status": "created",
        "id": str(comment.id),
        "content": comment.content
    }


# ---------------------------------------------------------------
# Shared Artifacts Endpoints
# ---------------------------------------------------------------

@router.post("/shared-artifacts", status_code=status.HTTP_201_CREATED)
def share_artifact(
    payload: SharedArtifactCreateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sa = SharedArtifact(
        artifact_id=uuid.UUID(payload.artifact_id),
        shared_by_user_id=current_user.id,
        course_id=uuid.UUID(payload.course_id) if payload.course_id else None,
        title=payload.title,
        link_url=payload.link_url
    )
    db.add(sa)
    db.commit()
    db.refresh(sa)

    return {"status": "shared", "id": str(sa.id), "title": sa.title}


@router.get("/shared-artifacts")
def list_shared_artifacts(
    course_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SharedArtifact)
    if course_id:
        query = query.filter(SharedArtifact.course_id == course_id)

    sas = query.order_by(SharedArtifact.created_at.desc()).all()
    return [
        {
            "id": str(s.id),
            "artifact_id": str(s.artifact_id),
            "shared_by_name": s.shared_by.name if s.shared_by else "Teacher",
            "title": s.title,
            "link_url": s.link_url,
            "created_at": s.created_at
        }
        for s in sas
    ]
