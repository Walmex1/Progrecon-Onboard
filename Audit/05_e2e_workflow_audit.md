---
purpose: Progrecon Onboard – végrehajtható audit procedure
output_language: hu
mode: audit_only_first
rule: Először csak hibákat listázz, kódot ne módosíts, amíg külön nem kérem.
---

# 05 — E2E workflow audit

## Cél
A teljes felhasználói folyamat ellenőrzése: PV adatbevitel → bérszámfejtő CSV →
lezárás → employees tábla frissítés → létszámstatisztikák.

## Olvasandó fájlok
- `backend/app/services/entry_service.py`
- `backend/app/services/csv_generator.py`
- `backend/app/routers/export.py`
- `backend/app/routers/entry.py`
- `backend/app/routers/pv_stats.py`
- `backend/app/main.py`
- `backend/app/schemas/entry_record.py`

## Architektúrális tények (lásd AGENTS.md)
- NAV modul nem létezik — `nav.py` nincs, nem lesz bekötve addig
- `lezarva` állapot: `/entries/{id}/close` endpoint (berszamfejto / admin)
- `mark_csv_downloaded`: belső függvény az entry_service.py-ban, az export.py hívja
- BELÉPŐ + létező tax_id lezáráskor: 409 Conflict
- Státuszgép: folyamatban → elküldve → csv_letöltve → lezarva

## Folyamat lépései (referencia)

```
PV: Új belépő rögzítése
  → form_data auto-mentés (PATCH /entries/{id}) — 1500ms debounce
  → POST /entries/ cost_center_id-vel (de frontend null-t küld — lásd 04-es audit)
  → Elküldés: POST /entries/{id}/submit
  → státusz: folyamatban → elküldve
  → submitted_at beállítódik

Bérszámfejtő: CSV generálás
  → POST /exports/{entry_id}
  → validate_entry_form() fut
  → generate_csvs_for_entry() fut
  → CsvExport rekordok létrejönnek
  → mark_csv_downloaded() → státusz: elküldve → csv_letöltve
  → ZIP / CSV letöltés
  → Nexonba töltés (manuális)

Bérszámfejtő: Lezárás
  → POST /entries/{entry_id}/close
  → close_entry() → státusz: csv_letöltve → lezarva
  → employees tábla frissül (BELÉPŐ: add, KILÉPŐ: delete, MÓDOSÍTÁS: update)
  → AuditLog rekord létrejön
  [NAV XML: nem implementált]
```

## Audit lépések

### 1. Státuszátmenetek és audit log
- `create_entry`: `_log(... "create" ...)` megvan-e?
- `patch_entry`: `_log(... "update" ..., old, form_data)` megvan-e? (old adat mentve?)
- `submit_entry`: `_log(... "submit" ...)` + `entry.submitted_at = datetime.now()` megvan-e?
- `recall_entry`: `_log(... "recall" ...)` + `entry.submitted_at = None` megvan-e?
- `mark_csv_downloaded`: `_log(... "csv_letoltve" ...)` megvan-e?
- `close_entry`: `_log(... "close" ...)` megvan-e?
- `delete_entry`: `_log(... "delete" ..., old_data)` megvan-e?

### 2. CSV export és státuszváltás atomicitása
- `export.py`: `validate_entry_form` meghívódik CSV generálás **előtt**?
- Ha validáció hibát talál: 400-as hiba, `mark_csv_downloaded` NEM hívódik meg?
- Ha `generate_csvs_for_entry` kivételt dob: 500-as hiba, státusz NEM változik?
- `mark_csv_downloaded` hívása: `db.add(CsvExport)` után, de `db.commit()` **előtt** történik?
- `db.commit()` egyszer, a legvégén?
- Ha `db.commit()` sikertelen: státusz és CsvExport rekord is visszagördul?

### 3. NAV modul állapota
- `nav.py` fájl létezik-e? (nem, nincs bekötve a main.py-ban)
- A `lezarva` státusz jelenleg elérhető NAV nélkül: ez szándékos, elfogadott hiányosság

### 4. Employees tábla frissítés — close_entry() részletes
- `tax_id = form_data.get("adoazonosito")`: mi történik ha `None`? (a trigger nem fut)
- BELÉPŐ + új tax_id: `db.add(Employee(...))` — tartalmazza-e a mezőket?
  - last_name, first_name, birth_date, taj, trunk_number, cost_center_id: OK?
  - birth_place, mothers_name, birth_name, gender: **HIÁNYOZNAK** a belépő triggerből!
  - Ez finding (Medium): az employee törzsadat hiányos lesz import nélkül
- BELÉPŐ + létező tax_id: `HTTPException(409)` dob-e? (nem silent overwrite)
- KILÉPŐ + létező: `db.delete(existing)` OK?
- KILÉPŐ + nem létező: silent (nincs hiba) — ez szándékos?
- MÓDOSÍTÁS + létező: `if form_data.get("vezeteknev"): existing.last_name = ...` stílusú guard?
- MÓDOSÍTÁS + nem létező: silent — ez szándékos?
- `_parse_date()` mindkét ágban (belep + modositas) elérhető-e?

### 5. Létszámstatisztikák helyessége (pv_stats.py)
- `total`: `db.query(Employee).filter(Employee.cost_center_id == cc.id).count()` — employees táblából?
- `_delta_count`: `EntryRecord.status.in_(("csv_letöltve", "lezarva"))` — a unicode karakterek helyesek-e?
  - Ellenőrizd: a kódban `"csv_let\u00f6ltve"` szerepel-e, ami "csv_letöltve"-t jelent?
- PV: `cost_centers = db.query(CostCenter).filter(CostCenter.region == current_user.region, ...)` — csak saját régiója?
- Admin: összes aktív cost centert lát?
- `today_start` számítás: `datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)` — helyes UTC?

### 6. EntryRecord séma konzisztencia
- `EntryRecordCreate.cost_center_id`: `int` (nem Optional) — de a frontend `null`-t küld!
  - Ez **422-t okoz** a POST /entries/-nél — szándékos-e?
- `EntryRecordCreate.record_type`: default "belep" — ha nem adjuk meg, belépő lesz?
- `EntryRecordResponse`: tartalmazza-e az `employee_id` mezőt? (az entry_record modellben van `employee_id` FK)
- `EntryRecordResponse`: `created_by` mező nincs benne — ez szándékos?

### 7. Entry törlés
- `delete_entry`: csak `folyamatban` státuszban törölhető?
- PV csak saját rekordját törölheti (`created_by == user.id`)?
- Admin bármit törölhet?
- A törölt rekord AuditLog bejegyzést kap (`_log(..., "delete", ...)`)?

## Codex prompt
```
Read AGENTS.md and Audit/05_e2e_workflow_audit.md.
Audit only:
  backend/app/services/entry_service.py
  backend/app/services/csv_generator.py
  backend/app/routers/export.py
  backend/app/routers/entry.py
  backend/app/routers/pv_stats.py
  backend/app/main.py
  backend/app/schemas/entry_record.py
Do not modify code.
Find:
- _log called for all actions: create, update (with old/new data), submit, recall, mark_csv_downloaded, close, delete?
- submitted_at: set on submit, cleared (None) on recall?
- export.py: validate_entry_form called BEFORE generate_csvs_for_entry?
- mark_csv_downloaded called AFTER db.add(CsvExport) but BEFORE db.commit()?
- close_entry belep: missing fields in Employee creation?
  (birth_place, mothers_name, birth_name, gender NOT included)
- close_entry: tax_id missing from form_data → trigger silently skipped?
- close_entry kilep + not found: silent (no error)?
- close_entry modositas + not found: silent (no error)?
- _delta_count: unicode in status string "csv_letöltve" correct?
- EntryRecordCreate.cost_center_id: non-optional int — frontend sends null → 422?
- EntryRecordResponse: missing employee_id field?
- nav.py: confirmed absent from main.py imports?
Return findings with file + line number evidence.
Write all findings to: C:\Progrecon-Onboard\Audit\findings\PO-{YYYYMMDD}-05_e2e_workflow.md
Use the finding format from AGENTS.md. If no findings, write a single Info entry.
```

## Severity útmutató
- **Critical:** close_entry trigger nem fut (employees nem frissül), státusz corrupt
- **High:** validate_entry_form nem fut CSV előtt, audit log hiánya fontos akcióknál, submitted_at nem törlődik
- **Medium:** employee törzsadat hiányos lezárásnál (birth_place stb.), EntryRecordCreate séma mismatch, delta unicode kérdéses
- **Low:** silent skip kilépő/módosítás nem-létező employee-nál, edge-case
