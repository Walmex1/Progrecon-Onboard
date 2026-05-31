---
purpose: Progrecon Onboard – végrehajtható audit procedure
output_language: hu
mode: audit_only_first
rule: Először csak hibákat listázz, kódot ne módosíts, amíg külön nem kérem.
---

# 03 — Employee import audit

## Cél
A Mintacsomag 2.0 xlsx import helyességének és robusztusságának ellenőrzése.

## Olvasandó fájlok
- `backend/app/services/employee_import.py`
- `backend/app/models/employee.py`
- `backend/app/schemas/employee.py`
- `backend/app/routers/employees.py`

## Architektúrális tények (lásd AGENTS.md)
- Dupla fejlécsor: 1. sor = csoportnév, 2. sor = tényleges mezőnév
- 3. sortól (index 2) kezdődnek az adatsorok
- Egyedi kulcs: `tax_id` — duplikált: update (nem crash)
- Ismeretlen cost_center_code: sor NEM ugrik át, csak `cost_center_id = None`
- Employee mezők: tax_id, last_name, first_name, birth_date, taj, trunk_number,
  birth_place, mothers_name, birth_name, gender, cost_center_id

## Mintacsomag 2.0 sajátosságai
- Dupla fejlécsor: 1. sor = csoport neve (pl. "Személy", "Jogviszony"), 2. sor = tényleges mezőnév
- Egy munkavállalóhoz **több sor is tartozhat** (bankszámla, egyéb ismétlődő adatok)
- Egyedi kulcs: `tax_id` — a cache logika kezeli a duplikátumokat
- COLUMN_MAP: normalizált (kisbetűs, stripped, `\n` → szóköz) fejléc → modelmező mapping

## Audit lépések

### 1. Fejléc felismerés (dupla fejlécsor)
- A kombináló logika: ha `row2[i]` nem üres → `row2[i]`, különben `row1[i]`
- `_normalize()` függvény: `.strip().replace("\n", " ").strip().lower()` megvan-e?
- Első előfordulás nyeri-e a col_index-ben?

### 2. COLUMN_MAP teljessége
Ellenőrizd, hogy az alábbi kulcsok mindegyike szerepel-e:
- Adóazonosító variánsok: "adóazonosító", "adóazonosító jel", "adoazonosito"
- Vezetéknév variánsok: "családi név", "vezetéknév", "vezeteknev"
- Keresztnév variánsok: "utónév", "keresztnév", "keresztnev"
- Születési dátum variánsok: "születési dátum", "születési idő", "szuletesi datum"
- TAJ variánsok: "taj szám", "taj", "taj szam"
- Törzsszám variánsok: "törzsszám", "torzssam", "törzsszam"
- Költséghely variánsok: "költséghely", "költséghely kód", "koltseghelykod"
- Egyéb: "születési hely", "anyja neve", "születési név", "neme"

### 3. Kötelező oszlopok hiánya
- Ha "tax_id" nem szerepel a `col_index`-ben: korai return `EmployeeImportResult(errors=[...])`?
- Ha "last_name" hiányzik: korai return?
- Ha "first_name" hiányzik: korai return?

### 4. Duplikált sorok kezelése (multi-row per employee)
- `processed_tax_ids: set` megakadályozza-e az ismételt DB lekérdezést ugyanarra a tax_id-re?
- `employee_cache: dict` tárolja-e a már betöltött / újonnan létrehozott Employee objektumokat?
- `newly_created_tax_ids: set`: az újonnan létrehozott rekord ismételt sorát nem számolja-e `updated`-ként?
- `created`/`updated`/`skipped` számlálók helyesen tükrözik-e a valóságot?

### 5. Kostséghely mapping
- Ismeretlen `cost_center_code`: a sor **NEM ugrik át** — csak `cost_center_id = None` marad
- A figyelmeztetés belekerül-e az `errors` listába?
- `cc_cache: dict` megakadályozza-e az ismételt DB lekérdezéseket?

### 6. Adatkonverzió
- Születési dátum: `_parse_date()` kezeli-e a `datetime` objektumot és a szöveges dátumot is?
- Gender: `GENDER_MAP` = `{"férfi": "1", "nő": "2", "no": "2"}` megvan-e?
- Már "1"/"2" érték is elfogadott-e (`g if g in ("1", "2") else None`)?
- TAJ: kötőjelek és szóközök eltávolítva (`replace("-","").replace(" ","")`)?
- `None` értékkel nem frissít-e meglévő adatot? (`if taj:` guard stb.)

### 7. Tranzakció-biztonság
- `db.commit()` csak egyszer, a ciklus végén hívódik-e?
- Ha egy sor kivételt dob (`except Exception as e`): `errors.append(...)`, `skipped += 1`, folytatódik-e a feldolgozás?
- `db.rollback()` nincs — ha `db.commit()` sikertelen, mi történik?

### 8. Router szintű ellenőrzések (employees.py)
- `POST /admin/employees/import`: `require_role("admin")` megvan-e?
- Fájlkiterjesztés ellenőrzés `.xlsx` / `.xls`: megvan-e?
- `UploadFile` → `await file.read()` → `bytes`: helyes aszinkron beolvasás?
- `GET /admin/employees/`: `q` paraméter szabad szöveges keresés (last_name, first_name, tax_id, taj, trunk_number)?
- `POST /admin/employees/`: duplikált tax_id esetén 409 Conflict?

## Codex prompt
```
Read AGENTS.md and Audit/03_employee_import_audit.md.
Audit only:
  backend/app/services/employee_import.py
  backend/app/models/employee.py
  backend/app/schemas/employee.py
  backend/app/routers/employees.py
Do not modify code.
Find:
- double header: _normalize applied to row2, combined_header built correctly?
- COLUMN_MAP: all required variants present?
  Check: "adóazonosító jel", "családi név", "utónév", "születési idő", "taj szám",
  "törzsszám", "születési hely", "anyja neve", "születési név", "neme",
  "költséghely", "költséghely kód"
- mandatory column missing: early return EmployeeImportResult with error?
- duplicate tax_id across rows: handled via processed_tax_ids + employee_cache?
- newly_created_tax_ids: prevents counting duplicate new row as 'updated'?
- unknown cost_center_code: row continues with cost_center_id=None, error appended?
- GENDER_MAP: férfi→"1", nő→"2", and raw "1"/"2" accepted?
- TAJ: dashes and spaces stripped?
- None-guard on field updates (if taj: existing.taj = taj)?
- db.commit() called once after loop?
- exception per row: caught, skipped++, errors.append, loop continues?
Return findings with file + line number evidence.
Write all findings to: C:\Progrecon-Onboard\Audit\findings\PO-{YYYYMMDD}-03_employee_import.md
Use the finding format from AGENTS.md. If no findings, write a single Info entry.
```

## Severity útmutató
- **Critical:** import crash (UNIQUE constraint IntegrityError), összes sor elvész
- **High:** created/updated/skipped számok helytelenek, gender konverzió hiánya, kötelező oszlop hiánya nem kezel
- **Medium:** ismeretlen kostséghely átugrik sort (nem csak None), cache hiánya (teljesítmény + helyesség)
- **Low:** log minőség, apróbb edge-case
