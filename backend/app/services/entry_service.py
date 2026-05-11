from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.entry_record import EntryRecord
from app.models.user import User

VALID_TRANSITIONS = {
    "folyamatban": ["elk\u00fcldve"],
    "elk\u00fcldve": ["folyamatban", "csv_let\u00f6ltve"],
    "csv_let\u00f6ltve": ["lezarva"],
    "lezarva": [],
}


def _pv_cost_center_ids(user: User) -> list[int]:
    return [cc.id for cc in user.cost_centers]


def get_entries(db: Session, user: User, status: str | None = None, record_type: str | None = None) -> list[EntryRecord]:
    q = db.query(EntryRecord)
    if user.role == "pv":
        q = q.filter(EntryRecord.cost_center_id.in_(_pv_cost_center_ids(user)))
    if status is not None:
        q = q.filter(EntryRecord.status == status)
    if record_type is not None:
        q = q.filter(EntryRecord.record_type == record_type)
    return q.order_by(EntryRecord.updated_at.desc()).all()


def get_entry(db: Session, entry_id: int, user: User) -> EntryRecord:
    entry = db.get(EntryRecord, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rekord nem tal\u00e1lhat\u00f3")
    if user.role == "pv":
        pv_cc_ids = _pv_cost_center_ids(user)
        if entry.cost_center_id not in pv_cc_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nincs jogosults\u00e1god")
    if user.role == "pv" and entry.status != "folyamatban" and entry.created_by != user.id:
        pass
    return entry


def create_entry(db: Session, record_type: str, cost_center_id: int, user: User) -> EntryRecord:
    if user.role == "pv":
        pv_cc_ids = _pv_cost_center_ids(user)
        if cost_center_id not in pv_cc_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ez a k\u00f6lts\u00e9ghely nem tartozik hozz\u00e1d")

    entry = EntryRecord(
        record_type=record_type,
        status="folyamatban",
        cost_center_id=cost_center_id,
        created_by=user.id,
        form_data={},
    )
    db.add(entry)
    db.flush()
    _log(db, user.id, entry.id, "entry_record", "create", None, {})
    db.commit()
    db.refresh(entry)
    return entry


def patch_entry(db: Session, entry_id: int, form_data: dict, user: User) -> EntryRecord:
    entry = get_entry(db, entry_id, user)
    if entry.status not in ("folyamatban", "elk\u00fcldve"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lez\u00e1rt rekord nem m\u00f3dos\u00edthat\u00f3")
    if user.role == "pv" and entry.created_by != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Csak a saj\u00e1t rekordjaidat m\u00f3dos\u00edthatod")
    old = dict(entry.form_data)
    entry.form_data = form_data
    _log(db, user.id, entry.id, "entry_record", "update", old, form_data)
    db.commit()
    db.refresh(entry)
    return entry


def submit_entry(db: Session, entry_id: int, user: User) -> EntryRecord:
    entry = get_entry(db, entry_id, user)
    _transition(entry, "elk\u00fcldve")
    entry.submitted_at = datetime.now(timezone.utc)
    _log(db, user.id, entry.id, "entry_record", "submit", None, None)
    db.commit()
    db.refresh(entry)
    return entry


def recall_entry(db: Session, entry_id: int, user: User) -> EntryRecord:
    entry = get_entry(db, entry_id, user)
    if user.role != "pv" or entry.created_by != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Csak a saj\u00e1t rekordjaidat veheted vissza")
    _transition(entry, "folyamatban")
    entry.submitted_at = None
    _log(db, user.id, entry.id, "entry_record", "recall", None, None)
    db.commit()
    db.refresh(entry)
    return entry


def _transition(entry: EntryRecord, new_status: str):
    allowed = VALID_TRANSITIONS.get(entry.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{entry.status}' st\u00e1tuszb\u00f3l nem lehet '{new_status}'-ra v\u00e1ltani",
        )
    entry.status = new_status


def _log(db: Session, user_id: int, record_id: int, record_type: str, action: str, old: dict | None, new: dict | None):
    db.add(
        AuditLog(
            user_id=user_id,
            record_id=record_id,
            record_type=record_type,
            action=action,
            old_data=old,
            new_data=new,
        )
    )
