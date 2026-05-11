from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.entry_record import EntryRecordCreate, EntryRecordPatch, EntryRecordResponse
from app.services import entry_service

router = APIRouter(prefix="/entries", tags=["entries"])

@router.get("/", response_model=list[EntryRecordResponse])
def list_entries(
    status: str | None = Query(default=None),
    record_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return entry_service.get_entries(db, current_user, status=status, record_type=record_type)

@router.get("/{entry_id}", response_model=EntryRecordResponse)
def get_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return entry_service.get_entry(db, entry_id, current_user)

@router.post("/", response_model=EntryRecordResponse, status_code=201)
def create_entry(
    body: EntryRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return entry_service.create_entry(db, body.record_type, body.cost_center_id, current_user)

@router.patch("/{entry_id}", response_model=EntryRecordResponse)
def patch_entry(
    entry_id: int,
    body: EntryRecordPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return entry_service.patch_entry(db, entry_id, body.form_data, current_user)

@router.post("/{entry_id}/submit", response_model=EntryRecordResponse)
def submit_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return entry_service.submit_entry(db, entry_id, current_user)

@router.post("/{entry_id}/recall", response_model=EntryRecordResponse)
def recall_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return entry_service.recall_entry(db, entry_id, current_user)
