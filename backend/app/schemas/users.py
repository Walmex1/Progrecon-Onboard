from pydantic import BaseModel
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    password: str
    role: str  # pv, berszamfejto, admin
    cost_center_ids: list[int] = []


class UserUpdate(BaseModel):
    role: str
    cost_center_ids: list[int] = []


class CostCenterShort(BaseModel):
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    cost_centers: list[CostCenterShort] = []
    is_active: bool
    created_at: datetime
