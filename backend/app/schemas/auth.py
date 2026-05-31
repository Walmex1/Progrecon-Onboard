from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    username: str


class PersonShort(BaseModel):
    last_name: str
    first_name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    region: Optional[str] = None
    person: Optional[PersonShort] = None
