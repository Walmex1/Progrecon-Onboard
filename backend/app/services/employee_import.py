"""
Munkavállalói adatbázis — XLSX import service

A Mintacsomag 2.0 xlsx dupla fejlécsort tartalmaz:
  - 1. sor: csoport nevei (pl. "Személy", "Jogviszony")
  - 2. sor: tényleges mezőnevek (pl. "Családi név", "Utónév")
Az adatsorok a 3. sortól (index 2) kezdődnek.

Kötelező oszlopok: Adóazonosító jel, Családi név, Utónév
"""

import openpyxl
from io import BytesIO
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.cost_center import CostCenter
from app.schemas.employee import EmployeeImportResult
from app.utils.date_utils import parse_date as _parse_date

# Fejléc → modelmező mapping (kisbetűs, strip, sortörés → szóköz)
COLUMN_MAP = {
    # adóazonosító
    "adóazonosító": "tax_id",
    "adoazonosito": "tax_id",
    "adóazonosító jel": "tax_id",
    # vezetéknév / családi név
    "vezetéknév": "last_name",
    "vezeteknev": "last_name",
    "családi név": "last_name",
    # keresztnév / utónév
    "keresztnév": "first_name",
    "keresztnev": "first_name",
    "utónév": "first_name",
    # születési dátum/idő
    "születési dátum": "birth_date",
    "szuletesi datum": "birth_date",
    "születési idő": "birth_date",
    # születési hely
    "születési hely": "birth_place",
    # anyja neve
    "anyja neve": "mothers_name",
    # születési név
    "születési név": "birth_name",
    # nem
    "neme": "gender",
    # taj
    "taj szám": "taj",
    "taj": "taj",
    "taj szam": "taj",
    # jogviszony kezdete
    "jogviszony kezdete": "entry_date",
    "jogviszony kezdet": "entry_date",
    "belépés dátuma": "entry_date",
    "belépés": "entry_date",
    # törzsszám
    "törzsszám": "trunk_number",
    "torzssam": "trunk_number",
    "törzsszam": "trunk_number",
    # költséghely
    "költséghely": "cost_center_code",
    "koltseghelykod": "cost_center_code",
    "költséghely kód": "cost_center_code",
}

GENDER_MAP = {
    "férfi": "1",
    "nő": "2",
    "no": "2",
}


def _normalize(cell) -> str:
    if cell is None:
        return ""
    return str(cell).strip().replace("\n", " ").strip().lower()


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
    if len(rows) < 2:
        return EmployeeImportResult(created=0, updated=0, skipped=0, errors=["Üres fájl vagy hiányzó dupla fejlécsor"])

    # Dupla fejléc kombinálása: ha sor2 nem üres → sor2, különben sor1
    row1, row2 = rows[0], rows[1]
    width = max(len(row1), len(row2))
    combined_header: list[str] = []
    for i in range(width):
        c1 = row1[i] if i < len(row1) else None
        c2 = row2[i] if i < len(row2) else None
        val2 = _normalize(c2)
        val1 = _normalize(c1)
        combined_header.append(val2 if val2 else val1)

    # Oszlopindex felépítése (első előfordulás nyeri)
    col_index: dict[str, int] = {}
    for i, key in enumerate(combined_header):
        if key in COLUMN_MAP:
            field = COLUMN_MAP[key]
            if field not in col_index:
                col_index[field] = i

    if "tax_id" not in col_index:
        return EmployeeImportResult(
            created=0, updated=0, skipped=0,
            errors=["Hiányzó kötelező oszlop: Adóazonosító jel"]
        )
    if "last_name" not in col_index:
        return EmployeeImportResult(
            created=0, updated=0, skipped=0,
            errors=["Hiányzó kötelező oszlop: Családi név / Vezetéknév"]
        )
    if "first_name" not in col_index:
        return EmployeeImportResult(
            created=0, updated=0, skipped=0,
            errors=["Hiányzó kötelező oszlop: Utónév / Keresztnév"]
        )

    # Kostséghely kód → id cache
    cc_cache: dict[str, int | None] = {}
    employee_cache: dict[str, Employee] = {}
    processed_tax_ids: set[str] = set()
    newly_created_tax_ids: set[str] = set()

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

    # Adatsorok a 3. sortól (index 2)
    for row_num, row in enumerate(rows[2:], start=3):
        try:
            tax_id = get_val(row, "tax_id")
            if not tax_id:
                skipped += 1
                continue

            tax_id = str(tax_id).strip()
            last_name = get_val(row, "last_name")
            first_name = get_val(row, "first_name")

            existing = employee_cache.get(tax_id)
            if existing is None and tax_id not in processed_tax_ids:
                existing = db.query(Employee).filter(Employee.tax_id == tax_id).first()
                processed_tax_ids.add(tax_id)
                if existing is not None:
                    employee_cache[tax_id] = existing

            if existing is None and (not last_name or not first_name):
                errors.append(f"Sor {row_num}: hiányzó név (adóazonosító: {tax_id}) — kihagyva")
                skipped += 1
                continue

            birth_date = _parse_date(get_val(row, "birth_date"))
            entry_date = _parse_date(get_val(row, "entry_date"))

            taj = get_val(row, "taj")
            if taj:
                taj = str(taj).replace("-", "").replace(" ", "").strip()

            trunk_number = get_val(row, "trunk_number")
            birth_place = get_val(row, "birth_place")
            mothers_name = get_val(row, "mothers_name")
            birth_name = get_val(row, "birth_name")

            gender_raw = get_val(row, "gender")
            gender: str | None = None
            if gender_raw:
                g = str(gender_raw).strip().lower()
                gender = GENDER_MAP.get(g, g if g in ("1", "2") else None)

            cc_code = get_val(row, "cost_center_code")
            cost_center_id = get_cc_id(cc_code) if cc_code else None

            if existing:
                if last_name:
                    existing.last_name = last_name
                if first_name:
                    existing.first_name = first_name
                if birth_date is not None:
                    existing.birth_date = birth_date
                if entry_date is not None:
                    existing.entry_date = entry_date
                if taj:
                    existing.taj = taj
                if trunk_number:
                    existing.trunk_number = trunk_number
                if birth_place:
                    existing.birth_place = birth_place
                if mothers_name:
                    existing.mothers_name = mothers_name
                if birth_name:
                    existing.birth_name = birth_name
                if gender:
                    existing.gender = gender
                if cost_center_id:
                    existing.cost_center_id = cost_center_id
                if tax_id in newly_created_tax_ids:
                    pass
                else:
                    updated += 1
            else:
                emp = Employee(
                    tax_id=tax_id,
                    last_name=last_name,
                    first_name=first_name,
                    birth_date=birth_date,
                    entry_date=entry_date,
                    taj=taj,
                    trunk_number=trunk_number,
                    birth_place=birth_place,
                    mothers_name=mothers_name,
                    birth_name=birth_name,
                    gender=gender,
                    cost_center_id=cost_center_id,
                )
                db.add(emp)
                employee_cache[tax_id] = emp
                processed_tax_ids.add(tax_id)
                newly_created_tax_ids.add(tax_id)
                created += 1

        except Exception as e:
            errors.append(f"Sor {row_num}: {e}")
            skipped += 1

    db.commit()
    return EmployeeImportResult(created=created, updated=updated, skipped=skipped, errors=errors)
