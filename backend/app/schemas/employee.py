from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional


class EmployeeBase(BaseModel):
    tax_id: str
    last_name: str
    first_name: str
    birth_date: Optional[date] = None
    taj: Optional[str] = None
    trunk_number: Optional[str] = None
    cost_center_id: Optional[int] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    last_name: Optional[str] = None
    first_name: Optional[str] = None
    birth_date: Optional[date] = None
    taj: Optional[str] = None
    trunk_number: Optional[str] = None
    cost_center_id: Optional[int] = None


class EmployeeResponse(EmployeeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    cost_center_code: Optional[str] = None
    cost_center_name: Optional[str] = None

    model_config = {"from_attributes": True}


class EmployeeImportResult(BaseModel):
    created: int
    updated: int
    skipped: int
    errors: list[str]
