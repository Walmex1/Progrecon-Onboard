from pydantic import BaseModel


class CostCenterCreate(BaseModel):
    code: str
    name: str
    region: str | None = None


class CostCenterUpdate(BaseModel):
    name: str | None = None
    region: str | None = None


class CostCenterResponse(BaseModel):
    id: int
    code: str
    name: str
    region: str | None = None
    is_active: bool

    class Config:
        from_attributes = True
