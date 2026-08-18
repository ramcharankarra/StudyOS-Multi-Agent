import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict
import bcrypt
import httpx
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User
from app.models.token import RefreshToken
from app.repositories.user import UserRepository, RefreshTokenRepository
from app.schemas.user import UserCreate

logger = logging.getLogger("auth_service")

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False

    @classmethod
    def create_access_token(cls, user_id: uuid.UUID, role: str, email: Optional[str] = None) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode = {
            "sub": str(user_id),
            "email": email or "",
            "role": role,
            "exp": int(expire.timestamp()),
            "jti": str(uuid.uuid4())
        }
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    @classmethod
    def create_refresh_token(cls, user_id: uuid.UUID, role: str, db: Session, email: Optional[str] = None) -> str:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode = {
            "sub": str(user_id),
            "email": email or "",
            "role": role,
            "exp": int(expire.timestamp()),
            "type": "refresh",
            "jti": str(uuid.uuid4())
        }
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        # Save to database
        token_repo = RefreshTokenRepository(db)
        db_token = RefreshToken(
            user_id=user_id,
            token=encoded_jwt,
            expires_at=expire
        )
        token_repo.create(db_token)
        return encoded_jwt

    @classmethod
    def verify_token(cls, token: str, is_refresh: bool = False) -> Optional[Dict]:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            # Check expiration
            exp = payload.get("exp")
            if not exp or datetime.now(timezone.utc).timestamp() > exp:
                return None
            
            # Verify refresh token flag
            if is_refresh and payload.get("type") != "refresh":
                return None
            if not is_refresh and payload.get("type") == "refresh":
                return None
                
            return payload
        except JWTError:
            return None

    @classmethod
    def authenticate_user(cls, email: str, password: str, db: Session) -> Optional[User]:
        user_repo = UserRepository(db)
        user = user_repo.get_by_email(email)
        if not user or not user.password_hash:
            return None
        if not cls.verify_password(password, user.password_hash):
            return None
        return user

    @classmethod
    def register_user(cls, user_in: UserCreate, db: Session) -> User:
        user_repo = UserRepository(db)
        hashed_password = cls.hash_password(user_in.password)
        db_user = User(
            name=user_in.name,
            email=user_in.email,
            password_hash=hashed_password,
            role=user_in.role,
            profile_image=user_in.profile_image
        )
        return user_repo.create(db_user)

    @classmethod
    async def verify_google_token(cls, token: str) -> Optional[Dict]:
        """
        Verifies the Google ID token. Supports a Mock Google Login flow if
        the token starts with "mock_google_".
        """
        if token.startswith("mock_google|"):
            # Format: mock_google|{role}|{email}|{name}
            parts = token.split("|", 3)
            if len(parts) >= 4:
                role = parts[1]
                email = parts[2]
                name = parts[3]
                return {
                    "sub": f"mock_google_id_{email}",
                    "email": email,
                    "name": name,
                    "picture": f"https://api.dicebear.com/7.x/initials/svg?seed={name}",
                    "email_verified": True,
                    "mock_role": None if role == "none" else role
                }
            return None
        elif token.startswith("mock_google_") or token.startswith("mock_"):
            parts = token.split("_")
            role = "student"
            email = "googleuser@studyos.ai"
            name = "Google User"
            if len(parts) >= 4:
                role = parts[1]
                email = parts[2]
                name = parts[3].replace("+", " ")
            elif len(parts) == 3:
                email = parts[1]
                name = parts[2].replace("+", " ")
            elif len(parts) == 2 and "@" in parts[1]:
                email = parts[1]
                name = email.split("@")[0].capitalize()

            return {
                "sub": f"mock_google_id_{email}",
                "email": email,
                "name": name,
                "picture": f"https://api.dicebear.com/7.x/initials/svg?seed={name}",
                "email_verified": True,
                "mock_role": role
            }

        # Real Google API Token Verification (supports ID Token & Access Token)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 1. Try id_token tokeninfo verification
                res_id = await client.get(
                    "https://oauth2.googleapis.com/tokeninfo",
                    params={"id_token": token}
                )
                if res_id.status_code == 200:
                    data = res_id.json()
                    if "sub" in data and "email" in data:
                        return data

                # 2. Try access_token userinfo verification
                res_user = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if res_user.status_code == 200:
                    data = res_user.json()
                    if "sub" in data and "email" in data:
                        return data

                logger.error(f"Google token verification failed: {res_id.text} | {res_user.text}")
                return None
        except Exception as e:
            logger.error(f"Google token request failed: {str(e)}")
            return None

    @classmethod
    def generate_reset_token(cls, email: str) -> str:
        # A password reset token that expires in 1 hour
        expire = datetime.now(timezone.utc) + timedelta(hours=1)
        to_encode = {
            "sub": email,
            "exp": int(expire.timestamp()),
            "purpose": "password_reset"
        }
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @classmethod
    def verify_reset_token(cls, token: str) -> Optional[str]:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            if payload.get("purpose") != "password_reset":
                return None
            exp = payload.get("exp")
            if not exp or datetime.now(timezone.utc).timestamp() > exp:
                return None
            return payload.get("sub") # returns email
        except JWTError:
            return None
