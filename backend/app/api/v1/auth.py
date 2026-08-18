import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.services.auth import AuthService
from app.repositories.user import UserRepository, RefreshTokenRepository
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, GoogleAuthRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
)
from app.schemas.token import TokenResponse, RefreshRequest
from app.dependencies.auth import get_current_user

logger = logging.getLogger("api_v1_auth")
router = APIRouter(prefix="/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, refresh_token: str):
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth"
    )


def _clear_refresh_cookie(response: Response):
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth"
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user (Student or Teacher).
    Role is strictly validated against database schema ('student' | 'teacher').
    """
    user_repo = UserRepository(db)
    existing_user = user_repo.get_by_email(user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    user = AuthService.register_user(user_in, db)
    logger.info(f"[AuthAPI] User registered successfully: '{user.email}' (Role: {user.role})")
    return user


@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, response: Response, db: Session = Depends(get_db)):
    """
    Authenticate user credentials and issue JWT Access Token + Refresh Token.
    JWT payload includes sub (user_id), email, and role claims.
    """
    user = AuthService.authenticate_user(login_in.email, login_in.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    access_token = AuthService.create_access_token(user.id, user.role, email=user.email)
    refresh_token = AuthService.create_refresh_token(user.id, user.role, db, email=user.email)

    _set_refresh_cookie(response, refresh_token)
    logger.info(f"[AuthAPI] Login successful for '{user.email}' (Role: {user.role})")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=user.role,
        name=user.name
    )


@router.post("/google")
async def google_auth(
    payload: GoogleAuthRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Google OAuth Authentication flow.
    """
    google_data = await AuthService.verify_google_token(payload.token)
    if not google_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google credentials."
        )

    google_id = google_data.get("sub")
    email = google_data.get("email")
    name = google_data.get("name") or (email.split("@")[0].capitalize() if email else "StudyOS User")
    picture = google_data.get("picture")

    user_repo = UserRepository(db)
    user = user_repo.get_by_google_id(google_id)

    if not user and email:
        user = user_repo.get_by_email(email)
        if user:
            user.google_id = google_id
            if picture and not user.profile_image:
                user.profile_image = picture
            if not user.name and name:
                user.name = name
            db.add(user)
            db.commit()
            db.refresh(user)

    if not user:
        role = payload.role or google_data.get("mock_role")
        if not role:
            return {
                "status": "needs_role",
                "email": email,
                "name": name,
                "google_id": google_id,
                "profile_image": picture
            }

        user = User(
            name=name,
            email=email,
            google_id=google_id,
            role=role,
            profile_image=picture
        )
        user_repo.create(user)

    access_token = AuthService.create_access_token(user.id, user.role, email=user.email)
    refresh_token = AuthService.create_refresh_token(user.id, user.role, db, email=user.email)

    _set_refresh_cookie(response, refresh_token)
    logger.info(f"[AuthAPI] Google OAuth login successful for '{user.email}' (Role: {user.role})")

    return {
        "status": "success",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "role": user.role,
        "name": user.name,
        "email": user.email
    }


@router.get("/google/callback")
@router.get("/google")
async def google_auth_callback(
    request: Request,
    response: Response,
    id_token: Optional[str] = Query(None),
    access_token: Optional[str] = Query(None),
    credential: Optional[str] = Query(None),
    code: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    GET /api/v1/auth/google/callback
    Handles GET browser redirects from Google OAuth gracefully.
    """
    token_val = id_token or access_token or credential or code or ""
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Authenticating with StudyOS...</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0b0f19; color: #f8fafc;">
    <div id="status-card" style="text-align: center; max-width: 400px; padding: 32px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
        <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid rgba(56, 189, 248, 0.2); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
        <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 8px 0;">Authenticating with StudyOS...</h2>
        <p id="status-text" style="color: #94a3b8; font-size: 13px; margin: 0;">Completing Google OAuth authentication...</p>
    </div>
    <style>
    <script>
        (async function() {{
            try {{
                const params = new URLSearchParams(window.location.search || window.location.hash.substring(1));
                const token = params.get('id_token') || params.get('access_token') || params.get('credential') || "{token_val}";
                const frontendUrl = "{frontend_url}";
                
                if (!token) {{
                    document.getElementById('status-card').innerHTML = '<h3 style="color: #ef4444; margin-top:0;">No OAuth token returned</h3><p style="color:#94a3b8; font-size:13px;">Google did not return an authentication token.</p><a href="' + frontendUrl + '/login" style="display:inline-block; margin-top:12px; padding:8px 16px; background:#38bdf8; color:#0f172a; text-decoration:none; font-weight:bold; border-radius:8px; font-size:13px;">Return to Login</a>';
                    return;
                }}
                
                if (window.opener && window.opener !== window) {{
                    try {{
                        window.opener.postMessage({{ type: "GOOGLE_OAUTH_SUCCESS", token: token }}, "*");
                        window.close();
                    }} catch (e) {{}}
                }}
                
                const res = await fetch('/api/v1/auth/google', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ token: token }})
                }});
                const data = await res.json();
                
                if (data.status === 'success' && data.access_token) {{
                    localStorage.setItem('access_token', data.access_token);
                    if (data.refresh_token) {{
                        localStorage.setItem('rt_fallback', data.refresh_token);
                    }}
                    const target = data.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
                    window.location.href = frontendUrl + target;
                }} else if (data.status === 'needs_role') {{
                    window.location.href = frontendUrl + '/signup';
                }} else {{
                    document.getElementById('status-card').innerHTML = '<h3 style="color: #ef4444; margin-top:0;">Authentication failed</h3><p style="color:#94a3b8; font-size:13px;">' + (data.detail || 'Failed to authenticate with Google.') + '</p><a href="' + frontendUrl + '/login" style="display:inline-block; margin-top:12px; padding:8px 16px; background:#38bdf8; color:#0f172a; text-decoration:none; font-weight:bold; border-radius:8px; font-size:13px;">Return to Login</a>';
                }}
            }} catch (e) {{
                console.error(e);
                window.location.href = "{frontend_url}/login";
            }}
        }})();
    </script>
</body>
</html>"""
    return HTMLResponse(content=html_content)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token_route(
    request: Request,
    response: Response,
    payload: Optional[RefreshRequest] = None,
    db: Session = Depends(get_db)
):
    token = (payload.refresh_token if payload else None) or request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token missing."
        )

    decoded = AuthService.verify_token(token, is_refresh=True)
    if not decoded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )

    token_repo = RefreshTokenRepository(db)
    db_token = token_repo.get_by_token(token)

    if not db_token or db_token.is_revoked or db_token.expires_at < datetime.now(timezone.utc):
        if db_token:
            token_repo.revoke_all_user_tokens(db_token.user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is revoked or invalid."
        )

    user_repo = UserRepository(db)
    user = user_repo.get(db_token.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )

    token_repo.revoke_token(token)

    new_access_token = AuthService.create_access_token(user.id, user.role, email=user.email)
    new_refresh_token = AuthService.create_refresh_token(user.id, user.role, db, email=user.email)

    _set_refresh_cookie(response, new_refresh_token)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=user.role,
        name=user.name
    )


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    payload: Optional[RefreshRequest] = None,
    db: Session = Depends(get_db)
):
    token = (payload.refresh_token if payload else None) or request.cookies.get("refresh_token")
    if token:
        token_repo = RefreshTokenRepository(db)
        token_repo.revoke_token(token)

    _clear_refresh_cookie(response)
    return {"detail": "Logged out successfully."}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    user = user_repo.get_by_email(payload.email)

    if not user or not user.password_hash:
        return {"detail": "If the email exists, a reset link has been logged."}

    reset_token = AuthService.generate_reset_token(user.email)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"
    logger.info(f"Password reset link generated for {user.email}: {reset_url}")

    return {
        "detail": "Password reset link has been generated.",
        "dev_reset_url": reset_url
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = AuthService.verify_reset_token(payload.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )

    user_repo = UserRepository(db)
    user = user_repo.get_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    user.password_hash = AuthService.hash_password(payload.new_password)
    token_repo = RefreshTokenRepository(db)
    token_repo.revoke_all_user_tokens(user.id)

    db.add(user)
    db.commit()

    return {"detail": "Password has been reset successfully."}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Single source of truth endpoint for current authenticated user details.
    Reads user context directly from database via verified JWT claims.
    """
    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Securely changes password for the authenticated user.
    Requires current password verification.
    Rejects request if user has no password (e.g. Google Auth only).
    """
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account was created via Google Sign-In and does not use a local password."
        )

    if not payload.current_password or not AuthService.verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password."
        )

    if not payload.new_password or len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation password do not match."
        )

    current_user.password_hash = AuthService.hash_password(payload.new_password)
    db.add(current_user)
    db.commit()

    logger.info(f"[AuthAPI] Password changed successfully for user '{current_user.email}'")
    return {"status": "success", "detail": "Password updated successfully."}
