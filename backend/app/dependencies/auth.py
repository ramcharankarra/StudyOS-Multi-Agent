import uuid
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth import AuthService
from app.repositories.user import UserRepository
from app.models.user import User

logger = logging.getLogger("auth_dependencies")

# Use OAuth2PasswordBearer, pointing to unified /api/v1/auth/login route
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    if not token or token == "null" or token == "undefined":
        logger.warning("[AuthDependency] Missing or null Bearer token in request header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = AuthService.verify_token(token, is_refresh=False)
    if payload is None:
        logger.warning(f"[AuthDependency] JWT Token Verification Failed for token snippet '{token[:15]}...'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: Token is invalid or expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id_str: str = payload.get("sub")
    if not user_id_str:
        logger.warning("[AuthDependency] JWT payload missing 'sub' user_id claim.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: Subject claim missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        logger.warning(f"[AuthDependency] Invalid UUID format in 'sub': '{user_id_str}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: User ID invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_repo = UserRepository(db)
    user = user_repo.get(user_id)
    if user is None:
        logger.warning(f"[AuthDependency] User ID '{user_id}' not found in database.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: User account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return user

def get_current_active_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher privileges required"
        )
    return current_user

def get_current_active_student(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student privileges required"
        )
    return current_user
