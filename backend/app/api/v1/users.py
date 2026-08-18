from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserProfileUpdate
from app.repositories.user import UserRepository

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_user_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the authenticated user's profile details.
    """
    user_repo = UserRepository(db)
    
    if profile_in.email and profile_in.email != current_user.email:
        existing = user_repo.get_by_email(profile_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists."
            )
        current_user.email = profile_in.email

    if profile_in.name:
        current_user.name = profile_in.name

    if profile_in.profile_image is not None:
        current_user.profile_image = profile_in.profile_image

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
