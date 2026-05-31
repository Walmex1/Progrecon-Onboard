from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.cost_center import CostCenter
from app.models.employee import Employee
from app.models.entry_record import EntryRecord
from app.models.user import User
from app.utils.date_utils import parse_date as _parse_date

VALID_TRANSITIONS = {
    "folyamatban": ["elk\u00fcldve"],
    "elk\u00fcldve": ["folyamatban", "csv_let\u00f6ltve"],
    "csv_let\u00f6ltve": ["lezarva"],
    "lezarva": [],
}


def get_entries(db: Session, user: User, status: str | None = None, record_type: str | None = None) -> list[EntryRecord]:
    q = db.query(EntryRecord)
    if user.role == "pv":
        q = q.join(CostCenter).filter(CostCenter.region == user.region)
    if status is not None:
        q = q.filter(EntryRecord.status == status)
    if record_type is not None:
        q = q.filter(EntryRecord.record_type == record_type)
    if user.role == "berszamfejto":
        q = q.filter(EntryRecord.status != "folyamatban")
    return q.order_by(EntryRecord.updated_at.desc()).all()


def get_entry(db: Session, entry_id: int, user: User) -> EntryRecord:
    entry = db.get(EntryRecord, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rekord nem tal\u00e1lhat\u00f3")
    if user.role == "pv":
        if entry.cost_center_id is None:
            if entry.created_by != user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nincs jogosults\u00e1god")
        else:
            cc = db.get(CostCenter, entry.cost_center_id)
            if not cc or cc.region != user.region:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nincs jogosults\u00e1god")
    if user.role == "berszamfejto" and entry.status == "folyamatban":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Folyamatban lévő rekord nem elérhető")
    return entry


def create_entry(db: Session, record_type: str, cost_center_id: int | None, user: User) -> EntryRecord:
    if cost_center_id is not None and user.role == "pv":
        cc = db.get(CostCenter, cost_center_id)
        if not cc or cc.region != user.region:
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
    if entry.status != "folyamatban":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Csak folyamatban l\u00e9v\u0151 rekord m\u00f3dos\u00edthat\u00f3. Elk\u00fcld\u00f6tt rekordhoz el\u0151bb visszavon\u00e1s sz\u00fcks\u00e9ges.")
    if user.role == "pv" and entry.created_by != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Csak a saj\u00e1t rekordjaidat m\u00f3dos\u00edthatod")
    old = dict(entry.form_data)
    entry.form_data = form_data
    _log(db, user.id, entry.id, "entry_record", "update", old, form_data)
    db.commit()
    db.refresh(entry)
    return entry


def delete_entry(db: Session, entry_id: int, user: User) -> None:
    entry = get_entry(db, entry_id, user)
    if entry.status != "folyamatban":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Csak folyamatban lévő rekord törölhető")
    if user.role == "pv" and entry.created_by != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Csak a saját rekordjaidat törölheted")
    old = {
        "record_type": entry.record_type,
        "status": entry.status,
        "cost_center_id": entry.cost_center_id,
        "form_data": entry.form_data,
    }
    _log(db, user.id, entry.id, "entry_record", "delete", old, None)
    db.delete(entry)
    db.commit()


def submit_entry(db: Session, entry_id: int, user: User) -> EntryRecord:
    entry = get_entry(db, entry_id, user)
    if user.role == "pv" and entry.created_by != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Csak a saját rekordjaidat küldheted be"
        )
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


def close_entry(db: Session, entry_id: int, user: User) -> EntryRecord:
    entry = get_entry(db, entry_id, user)

    form_data = entry.form_data or {}
    tax_id = form_data.get("adoazonosito")

    if not tax_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Az adóazonosító jel hiányzik. Lezárás csak teljes adatlappal lehetséges.",
        )

    _transition(entry, "lezarva")

    existing = db.query(Employee).filter(Employee.tax_id == tax_id).first()

    if entry.record_type == "belep":
        if not existing:
            entry_date = _parse_date(form_data.get("jogviszony_kezdete"))
            db.add(Employee(
                tax_id=tax_id,
                last_name=form_data.get("vezeteknev") or "",
                first_name=form_data.get("keresztnev") or "",
                birth_date=_parse_date(form_data.get("szuletesi_datum")),
                entry_date=entry_date,
                taj=form_data.get("taj"),
                trunk_number=form_data.get("torzsszam"),
                birth_place=form_data.get("szuletesi_hely"),
                mothers_name=form_data.get("anyja_neve"),
                birth_name=form_data.get("szuletesi_nev"),
                gender=form_data.get("neme"),
                cost_center_id=entry.cost_center_id,
            ))
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ez az adóazonosító ({tax_id}) már szerepel a munkavállalók között. Lezárás megszakítva."
            )

    elif entry.record_type == "kilep":
        if existing:
            db.delete(existing)

    elif entry.record_type == "modositas":
        if existing:
            if form_data.get("vezeteknev"):
                existing.last_name = form_data.get("vezeteknev")
            if form_data.get("keresztnev"):
                existing.first_name = form_data.get("keresztnev")
            if form_data.get("szuletesi_datum"):
                existing.birth_date = _parse_date(form_data.get("szuletesi_datum"))
            if form_data.get("taj"):
                existing.taj = form_data.get("taj")
            if form_data.get("torzsszam"):
                existing.trunk_number = form_data.get("torzsszam")

    _log(db, user.id, entry.id, "entry_record", "close", None, None)
    db.commit()
    db.refresh(entry)
    return entry


def mark_csv_downloaded(db: Session, entry: EntryRecord, user_id: int) -> None:
    if entry.status == "elküldve":
        _transition(entry, "csv_letöltve")
    _log(db, user_id, entry.id, "entry_record", "csv_letoltve", None, None)


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
