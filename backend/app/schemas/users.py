from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PersonCreate(BaseModel):
    last_name: str
    first_name: str
    email: str


class PersonUpdate(BaseModel):
    last_name: str
    first_name: str
    email: str


class PersonResponse(BaseModel):
    id: int
    last_name: str
    first_name: str
    email: str
    is_active: bool

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    password: Optional[str] = None
    role: str  # pv, berszamfejto, admin
    region: Optional[str] = None
    person: Optional[PersonCreate] = None


class UserUpdate(BaseModel):
    username: str
    role: str
    region: Optional[str] = None
    password: Optional[str] = None
    person: Optional[PersonUpdate] = None


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    region: Optional[str] = None
    person: Optional[PersonResponse] = None
    is_active: bool
    created_at: datetime
