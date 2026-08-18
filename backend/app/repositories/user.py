from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.token import RefreshToken
from app.repositories.base import BaseRepository

class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_google_id(self, google_id: str) -> Optional[User]:
        return self.db.query(User).filter(User.google_id == google_id).first()


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    def __init__(self, db: Session):
        super().__init__(RefreshToken, db)

    def get_by_token(self, token: str) -> Optional[RefreshToken]:
        return self.db.query(RefreshToken).filter(RefreshToken.token == token).first()

    def revoke_token(self, token: str) -> bool:
        db_token = self.get_by_token(token)
        if db_token:
            db_token.is_revoked = True
            self.db.add(db_token)
            self.db.commit()
            return True
        return False

    def revoke_all_user_tokens(self, user_id: any) -> int:
        tokens = self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False
        ).all()
        for t in tokens:
            t.is_revoked = True
            self.db.add(t)
        self.db.commit()
        return len(tokens)
