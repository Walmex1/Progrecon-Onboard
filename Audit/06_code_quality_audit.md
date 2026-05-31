---
purpose: Progrecon Onboard – végrehajtható audit procedure
output_language: hu
mode: audit_only_first
rule: Először csak hibákat listázz, kódot ne módosíts, amíg külön nem kérem.
---

# 06 — Kód minőség audit

## Cél
Duplikált kód, dead code, hardcode értékek, biztonsági kockázatok,
hiányzó validátorok és tesztek azonosítása.

## Olvasandó fájlok
- `backend/app/services/csv_generator.py`
- `backend/app/services/entry_service.py`
- `backend/app/services/employee_import.py`
- `backend/app/services/validator.py`
- `backend/app/routers/` (összes fájl)
- `backend/app/core/config.py`
- `backend/app/core/security.py`
- `backend/app/schemas/auth.py`
- `backend/app/schemas/entry_record.py`
- `frontend/src/constants/options.js`
- `frontend/src/hooks/useEntryValidation.js`

## Audit lépések

### 1. Biztonsági kockázatok (kritikus priority)

#### 1a. Jelszó ellenőrzés hiánya
- `schemas/auth.py` `LoginRequest`: tartalmaz-e `password: str` mezőt?
- `routers/auth.py` `login()`: meghívja-e `verify_password(body.password, user.password_hash)`?
- Ha a séma nem tartalmaz password mezőt: bárki bármilyen jelszóval beléphet
- Ez a rendszer legkritikusabb biztonsági hibája

#### 1b. Konfiguráció biztonsága
- `config.py` `SECRET_KEY`: `"change-this-in-production"` az alapértelmezett érték?
  - Éles deployban ez kötelező csere, különben a JWT tokenek hamisíthatók
- `config.py` `ACCESS_TOKEN_EXPIRE_HOURS = 175200` = 20 év? Ez szándékos fejlesztési beállítás?
- `database.py` `connect_args={"check_same_thread": False}`: SQLite-hoz szükséges, de PostgreSQL migrációnál eltávolítandó

### 2. Duplikált kód

#### 2a. _parse_date() duplikáció
- `entry_service.py`: `_parse_date()` függvény definiálva van
- `employee_import.py`: `_parse_date()` függvény szintén definiálva van
- Ez duplikált logika — közös utils modulba kellene

#### 2b. _enrich() inline dict az employees.py-ban
- `_enrich()` kézzel épít response dict-et
- `EmployeeResponse` séma `from_attributes = True`-val ezt helyettesíthetné
- Ez Low/Medium: jelenlegi implementáció működik, de karbantartási terhe van

### 3. Dead code
- `backend/migrate_cost_centers.py`: context szerint "obsolete no-op" — valóban az-e?
- `backend/migrate_region.py`: a `seed.py` már kezeli az auto-migrationt — ez is obsolete?
- Nem használt importok a routerekben?

### 4. Hardcode értékek
- `csv_generator.py` tetején: `CSV_ENCODING = "cp1250"` és `CSV_DELIMITER = ";"` konstansok megvannak-e?
- CSV állandó értékek ("20", "9999", "BB", "91", "2", "100", "I", "2"): elnevezett konstansként szerepelnek-e a kódban, vagy inline magic string-ek?
- `MUNKAIDO_SZABALY` dict: tartalmaz-e kulcsokat a teljes 1–8 tartományra?
  - Jelenlegi kulcsok: "2", "4", "6", "8" — hiányoznak: "1", "3", "5", "7"
  - A `MUNKAIDO_OPTIONS` 1-8-ig tartalmaz értékeket, de a MUNKAIDO_SZABALY nem fedi le mind

### 5. Validator lefedettség (validator.py)

#### Implementált validátorok
- `validate_tax_id()`: 10 számjegy, 8-cal kezdődik, checksum mod 11 (súlyok [1..9]) ✓
- `get_birthdate_from_tax_id()` ✓
- `cross_validate_tax_and_birthdate()` ✓
- `validate_taj()`: 9 számjegy, checksum mod 10 (súlyok [3,7,3,7,3,7,3,7]) ✓
- `validate_bank_account()`: 16 vagy 24 számjegy ✓
- `validate_entry_form()`: összesített validáció ✓

#### Hiányzó vagy kérdéses validátorok
- `validate_entry_form()`: tartalmaz-e dátum formátum ellenőrzést `szuletesi_datum`-ra és `jogviszony_kezdete`-re?
  (ISO formátum: ÉÉÉÉ-HH-NN)
- `validate_entry_form()`: munkaidő ↔ foglalkozási viszony keresztvalidáció megvan-e?
  (8 óra csak teljes munkaidős, nem 8 óra csak részmunkaidős)
- Szabad szöveges mezők (vezeteknev, keresztnev, szuletesi_hely stb.): backend karakter validáció van-e?
  (A frontend `filterName`-t alkalmaz, de a backend elfogad bármit?)

### 6. Frontend / backend validáció konzisztencia

A két helyen implementált logika egyezik-e?

| Validáció | `validator.py` | `useEntryValidation.js` | Egyezik? |
|-----------|---------------|------------------------|----------|
| adóazonosító: 10 számjegy, 8-cal kezdődik | ✓ | ✓ | Ellenőrizendő |
| adóazonosító: checksum mod 11, súlyok [1..9] | ✓ | ✓ | Ellenőrizendő |
| adóazonosító ↔ születési dátum: base date 1867.01.01 | ✓ | ✓ | Ellenőrizendő |
| TAJ: 9 számjegy, mod 10, súlyok [3,7,3,7,3,7,3,7] | ✓ | ✓ | Ellenőrizendő |
| Bankszámla: 16 vagy 24 számjegy | ✓ | ✓ | Ellenőrizendő |
| Dátum formátum: ÉÉÉÉ-HH-NN | ? | ✓ | Ellenőrizendő |
| Munkaidő ↔ fogl. viszony keresztvalidáció | ✓ (backend) | ? (frontend) | Ellenőrizendő |

### 7. Séma kérdések
- `LoginRequest`: nincs `password` mező → ez nem csak kód minőség, hanem Critical security
- `EntryRecordCreate.cost_center_id`: `int` (nem Optional) — frontend `null`-t küld → 422
- `EntryRecordResponse`: hiányzik-e `employee_id` (az EntryRecord modell tartalmazza, de a schema?)
- `EntryRecordResponse`: `created_by` nincs benne — szándékos?
- `UserUpdate`: csak `role` és `region` módosítható — jelszó és username nem? (szándékos limitáció?)

### 8. Tesztek
- `test_employee_import.py` megvan-e a projekt gyökerében?
- Vannak-e más `test_*.py` fájlok (pl. `tests/` mappában)?
- Mi van tesztelve? (import? validáció? CSV generálás? API endpointok?)
- A `pytest` be van-e kötve a `requirements.txt`-be?

## Codex prompt
```
Read AGENTS.md and Audit/06_code_quality_audit.md.
Audit only:
  backend/app/services/csv_generator.py
  backend/app/services/entry_service.py
  backend/app/services/employee_import.py
  backend/app/services/validator.py
  backend/app/routers/auth.py
  backend/app/core/config.py
  backend/app/core/security.py
  backend/app/schemas/auth.py
  backend/app/schemas/entry_record.py
  frontend/src/constants/options.js
  frontend/src/hooks/useEntryValidation.js
Do not modify code.
Find:
- CRITICAL: LoginRequest in schemas/auth.py — does it have a 'password' field?
  Does auth.py login() call verify_password?
- config.py SECRET_KEY default value risk
- ACCESS_TOKEN_EXPIRE_HOURS = 175200 (20 years) — intentional?
- _parse_date() defined in both entry_service.py and employee_import.py (duplication)
- MUNKAIDO_SZABALY keys: only "2","4","6","8"? Gaps for 1,3,5,7?
- validate_entry_form: date format check for szuletesi_datum and jogviszony_kezdete?
- validate_entry_form: munkaidő ↔ foglalkozási viszony cross-validation present?
- backend vs frontend validation parity:
  - adoazonosito: same base date (1867.01.01), same weights [1..9], same mod 11?
  - taj: same weights [3,7,3,7,3,7,3,7], same mod 10?
  - bankszamla: both check 16|24 digits after removing dashes?
- EntryRecordCreate.cost_center_id: int not Optional?
- EntryRecordResponse: missing employee_id field?
- test files: list all test_*.py files found, what do they cover?
- migrate_cost_centers.py and migrate_region.py: are they still needed or obsolete?
Return findings with file + line number evidence.
Write all findings to: C:\Progrecon-Onboard\Audit\findings\PO-{YYYYMMDD}-06_code_quality.md
Use the finding format from AGENTS.md. If no findings, write a single Info entry.
```

## Severity útmutató
- **Critical:** LoginRequest password mező hiánya + verify_password nem hívódik → authentikáció bypass
- **High:** SECRET_KEY alapértelmezett értéke éles deployban, ACCESS_TOKEN_EXPIRE_HOURS = 20 év, _parse_date duplikáció
- **Medium:** MUNKAIDO_SZABALY hiányos kulcsok, validátor lefedettség hiányos, frontend/backend parity eltérés, séma mezők hiánya
- **Low:** dead code (migrate fájlok), hiányzó tesztek, _enrich() refactor lehetőség
