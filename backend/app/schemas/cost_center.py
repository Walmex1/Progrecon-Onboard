from pydantic import BaseModel


class CostCenterCreate(BaseModel):
    code: str
    name: str


class CostCenterUpdate(BaseModel):
    name: str | None = None


class CostCenterResponse(BaseModel):
    id: int
    code: str
    name: str
    is_active: bool

    class Config:
        from_attributes = True
