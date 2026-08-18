import logging
from typing import List
from fastapi import Depends, HTTPException, status
from app.dependencies.auth import get_current_user
from app.models.user import User

logger = logging.getLogger("rbac_dependency")

ROLE_PERMISSIONS = {
    "student": [
        "view_courses",
        "join_courses",
        "view_materials",
        "submit_assignments",
        "attempt_quizzes"
    ],
    "teacher": [
        "create_courses",
        "upload_materials",
        "create_assignments",
        "create_quizzes",
        "view_progress",
        "view_courses",
        "view_materials"
    ]
}

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "").strip().lower()
        allowed_normalized = [r.strip().lower() for r in allowed_roles]
        
        if user_role not in allowed_normalized:
            logger.warning(
                f"[RBAC] Permission denied for user '{current_user.email}' (ID: {current_user.id}). "
                f"Role in DB is '{current_user.role}', required: {allowed_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{current_user.role}' cannot perform this action. Required role: {allowed_roles}"
            )
        return current_user
    return role_checker

def require_permission(required_permission: str):
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "").strip().lower()
        user_permissions = ROLE_PERMISSIONS.get(user_role, [])
        
        if required_permission not in user_permissions:
            logger.warning(
                f"[RBAC] Permission denied for user '{current_user.email}' (ID: {current_user.id}). "
                f"Role '{current_user.role}' lacks permission '{required_permission}'"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{current_user.role}' lacks permission '{required_permission}'"
            )
        return current_user
    return permission_checker
