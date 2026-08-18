from pydantic import BaseModel
from typing import Optional

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int # access token expiry in seconds
    role: str
    name: str

class TokenPayload(BaseModel):
    sub: str # user id
    role: str
    exp: int

class RefreshRequest(BaseModel):
    # If using HTTPOnly cookie, the refresh token will be in the cookie,
    # but we can also accept it in the body for flexibility.
    refresh_token: Optional[str] = None
