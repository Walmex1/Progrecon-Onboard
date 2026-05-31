import io
import zipfile
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.audit_log import AuditLog
from app.models.csv_export import CsvExport
from app.models.entry_record import EntryRecord
from app.models.user import User
from app.services.csv_generator import generate_csvs_for_entry
from app.services.entry_service import mark_csv_downloaded
from app.services.validator import validate_entry_form

router = APIRouter(prefix="/exports", tags=["exports"])


@router.post("/{entry_id}")
def export_csvs(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("berszamfejto", "admin")),
):
    entry = db.get(EntryRecord, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rekord nem található")
    if entry.status not in ("elküldve", "csv_letöltve"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Csak elküldött rekordhoz generálható CSV")

    errors = validate_entry_form(entry.form_data)
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"validation_errors": errors})

    try:
        csvs = generate_csvs_for_entry(entry.form_data)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CSV generálás sikertelen. Ellenőrizd az adatlap tartalmát.",
        )

    now = datetime.now(timezone.utc)
    for filename in csvs:
        db.add(CsvExport(
            entry_record_id=entry.id,
            exported_by=current_user.id,
            csv_type=filename.replace(".csv", ""),
            file_path=filename,
            exported_at=now,
        ))
    db.add(AuditLog(
        user_id=current_user.id,
        record_id=entry.id,
        record_type="entry_record",
        action="csv_export",
        old_data=None,
        new_data={"files": list(csvs.keys())},
    ))
    mark_csv_downloaded(db, entry, current_user.id)
    db.commit()

    timestamp = now.strftime("%Y%m%d_%H%M%S")
    if len(csvs) == 1:
        csv_buffer = io.BytesIO(next(iter(csvs.values())))
        filename_csv = f"NBTorzs_belep_{entry_id}_{timestamp}.csv"
        return StreamingResponse(
            csv_buffer,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename_csv}"},
        )

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, content in csvs.items():
            zf.writestr(filename, content)
    zip_buffer.seek(0)

    filename_zip = f"belep_{entry_id}_{timestamp}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename_zip}"},
    )


@router.get("/history/{entry_id}")
def export_history(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("berszamfejto", "admin")),
):
    exports = (
        db.query(CsvExport)
        .filter(CsvExport.entry_record_id == entry_id)
        .order_by(CsvExport.exported_at.desc())
        .all()
    )
    return [
        {
            "id": e.id,
            "csv_type": e.csv_type,
            "exported_at": e.exported_at,
            "exported_by": e.exported_by,
        }
        for e in exports
    ]
