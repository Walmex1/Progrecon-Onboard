"""
Munkavállalói adatbázis — XLSX import service

Elvárt oszlopok (sorrendtől független, fejléc alapján):
  - Adóazonosító (kötelező, egyedi kulcs)
  - Vezetéknév (kötelező)
  - Keresztnév (kötelező)
  - Születési dátum (opcionális, ÉÉÉÉ-HH-NN vagy ÉÉÉÉ.HH.NN)
  - TAJ szám (opcionális)
  - Törzsszám (opcionális)
  - Költséghely kód (opcionális)
"""

import openpyxl
from io import BytesIO
from datetime import date
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.cost_center import CostCenter
from app.schemas.employee import EmployeeImportResult

# Fejléc → modelmező mapping (kisbetűs, strip)
COLUMN_MAP = {
    "adóazonosító": "tax_id",
    "adoazonosito": "tax_id",
    "adóazonosító jel": "tax_id",
    "vezetéknév": "last_name",
    "vezeteknev": "last_name",
    "keresztnév": "first_name",
    "keresztnev": "first_name",
    "születési dátum": "birth_date",
    "szuletesi datum": "birth_date",
    "születési idő": "birth_date",
    "taj szám": "taj",
    "taj": "taj",
    "taj szam": "taj",
    "törzsszám": "trunk_number",
    "torzssam": "trunk_number",
    "törzsszam": "trunk_number",
    "költséghely": "cost_center_code",
    "koltseghelykod": "cost_center_code",
    "költséghely kód": "cost_center_code",
}


def _parse_date(value) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    s = str(value).strip().replace(".", "-")
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S"):
        try:
            from datetime import datetime
            return datetime.strptime(s[:10], "%Y-%m-%d").date()
        except ValueError:
            continue
    return None


def import_employees_from_xlsx(
    file_bytes: bytes,
    db: Session,
) -> EmployeeImportResult:
    created = 0
    updated = 0
    skipped = 0
    errors: list[str] = []

    try:
        wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True, data_only=True)
        ws = wb.active
    except Exception as e:
        return EmployeeImportResult(created=0, updated=0, skipped=0, errors=[f"Fájl megnyitási hiba: {e}"])

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return EmployeeImportResult(created=0, updated=0, skipped=0, errors=["Üres fájl"])

    # Fejléc feldolgozása
    header_row = rows[0]
    col_index: dict[str, int] = {}
    for i, cell in enumerate(header_row):
        if cell is None:
            continue
        key = str(cell).strip().lower()
        if key in COLUMN_MAP:
            field = COLUMN_MAP[key]
            if field not in col_index:
                col_index[field] = i

    if "tax_id" not in col_index:
        return EmployeeImportResult(
            created=0, updated=0, skipped=0,
            errors=["Hiányzó kötelező oszlop: Adóazonosító"]
        )
    if "last_name" not in col_index:
        return EmployeeImportResult(
            created=0, updated=0, skipped=0,
            errors=["Hiányzó kötelező oszlop: Vezetéknév"]
        )
    if "first_name" not in col_index:
        return EmployeeImportResult(
            created=0, updated=0, skipped=0,
            errors=["Hiányzó kötelező oszlop: Keresztnév"]
        )

    # Kostséghely kód → id cache
    cc_cache: dict[str, int | None] = {}

    def get_cc_id(code: str | None) -> int | None:
        if not code:
            return None
        code = str(code).strip()
        if code in cc_cache:
            return cc_cache[code]
        cc = db.query(CostCenter).filter(CostCenter.code == code).first()
        cc_cache[code] = cc.id if cc else None
        if cc is None:
            errors.append(f"Ismeretlen költséghely kód: '{code}' — mező üresen marad")
        return cc_cache[code]

    def get_val(row, field: str):
        idx = col_index.get(field)
        if idx is None:
            return None
        val = row[idx] if idx < len(row) else None
        if isinstance(val, str):
            val = val.strip() or None
        return val

    for row_num, row in enumerate(rows[1:], start=2):
        try:
            tax_id = get_val(row, "tax_id")
            if not tax_id:
                skipped += 1
                continue

            tax_id = str(tax_id).strip()
            last_name = get_val(row, "last_name")
            first_name = get_val(row, "first_name")

            if not last_name or not first_name:
                errors.append(f"Sor {row_num}: hiányzó név (adóazonosító: {tax_id}) — kihagyva")
                skipped += 1
                continue

            birth_date = _parse_date(get_val(row, "birth_date"))
            taj = get_val(row, "taj")
            if taj:
                taj = str(taj).replace("-", "").replace(" ", "").strip()
            trunk_number = get_val(row, "trunk_number")
            cc_code = get_val(row, "cost_center_code")
            cost_center_id = get_cc_id(cc_code) if cc_code else None

            existing = db.query(Employee).filter(Employee.tax_id == tax_id).first()
            if existing:
                existing.last_name = last_name
                existing.first_name = first_name
                existing.birth_date = birth_date
                if taj:
                    existing.taj = taj
                if trunk_number:
                    existing.trunk_number = trunk_number
                if cost_center_id:
                    existing.cost_center_id = cost_center_id
                updated += 1
            else:
                emp = Employee(
                    tax_id=tax_id,
                    last_name=last_name,
                    first_name=first_name,
                    birth_date=birth_date,
                    taj=taj,
                    trunk_number=trunk_number,
                    cost_center_id=cost_center_id,
                )
                db.add(emp)
                created += 1

        except Exception as e:
            errors.append(f"Sor {row_num}: {e}")
            skipped += 1

    db.commit()
    return EmployeeImportResult(created=created, updated=updated, skipped=skipped, errors=errors)
