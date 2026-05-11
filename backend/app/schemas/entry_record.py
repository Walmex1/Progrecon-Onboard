from pydantic import BaseModel
from datetime import datetime
from typing import Any

class EntryRecordCreate(BaseModel):
    record_type: str = "belep"
    cost_center_id: int
    form_data: dict[str, Any] = {}

class EntryRecordPatch(BaseModel):
    form_data: dict[str, Any]

class EntryRecordResponse(BaseModel):
    id: int
    record_type: str
    status: str
    cost_center_id: int
    form_data: dict[str, Any]
    created_at: datetime
    submitted_at: datetime | None
    updated_at: datetime

    class Config:
        from_attributes = True
