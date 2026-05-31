---
purpose: Progrecon Onboard – végrehajtható audit procedure
output_language: hu
mode: audit_only_first
rule: Először csak hibákat listázz, kódot ne módosíts, amíg külön nem kérem.
---

# 01 — Backend API és jogosultság audit

## Cél
A FastAPI endpointok hibakezelésének, a jogosultság-ellenőrzésnek, az authentikációnak
és a státuszgép helyességének ellenőrzése.

## Olvasandó fájlok
- `backend/app/main.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/entry.py`
- `backend/app/routers/export.py`
- `backend/app/routers/employees.py`
- `backend/app/routers/cost_centers.py`
- `backend/app/routers/users.py`
- `backend/app/routers/pv_stats.py`
- `backend/app/services/entry_service.py`
- `backend/app/dependencies.py`
- `backend/app/schemas/auth.py`

## Architektúrális tények (lásd AGENTS.md)
- PV jogosultság: `users.region` == `cost_centers.region` alapján (nem costCenterIds tömb)
- NAV modul nem létezik — `nav.py` nincs a main.py-ban
- `lezarva` státusz: `/entries/{id}/close` endpoint (berszamfejto / admin)
- `mark_csv_downloaded`: export.py hívja belső függvényként CSV generálás után
- BELÉPŐ duplikált tax_id lezárásnál: 409 Conflict (nem silent)
- Employee PATCH/DELETE: 405 Method Not Allowed (szándékosan tiltott)

## Keresendő kritikus minták

### KRITIKUS: Jelszó ellenőrzés
- `schemas/auth.py` `LoginRequest`: tartalmaz-e `password: str` mezőt?
- `routers/auth.py` `login()`: meghívja-e a `verify_password(body.password, user.password_hash)` függvényt?
- Ha a `LoginRequest`-ben nincs password mező VAGY `verify_password` nem hívódik meg:
  **bárki be tud lépni bármilyen felhasználónévvel** — ez Critical biztonsági finding

### KRITIKUS: Jogosultság bypass
- PV más régiójának rekordjai elérhetők-e a `get_entry()`, `patch_entry()`, `submit_entry()`, `recall_entry()` endpointokon?
- A `create_entry()` megakadályozza-e, hogy PV idegen régió cost centerére hozzon létre rekordot?

## Audit lépések

### 1. API hibakezelés teljessége
Minden endpointnál ellenőrizd:
- Van-e `try/except` ahol szükséges?
- A kivétel `HTTPException`-né alakul-e (nem raw 500)?
- A `detail` mező nem tartalmaz stacktrace-t vagy belső patht?
- Az `export.py`-ban a `generate_csvs_for_entry` kivételét elkapja-e és 500-ra alakítja-e?

### 2. Jogosultság-ellenőrzés részletes
- `get_entries()`: PV esetén `CostCenter.region == user.region` JOIN szűrés megvan-e?
- `get_entry()`: PV más régió rekordját elérheti-e? (cc.region != user.region → 403)
- `patch_entry()`: PV csak saját rekordját módosíthatja-e (`created_by == user.id` ellenőrzés)?
- `patch_entry()`: csak `folyamatban` státuszú rekord módosítható-e?
- `create_entry()`: PV csak saját régiójának cost centerére hozhat-e létre rekordot?
- `submit_entry()`: PV csak saját rekordját küldheti-e be?
- `recall_entry()`: csak PV, és csak saját rekordját vonhatja vissza?
- `close_entry()`: `require_role("berszamfejto", "admin")` van-e rajta az entry.py routerben?
- `berszamfejto`: nem látja-e a `folyamatban` státuszú rekordokat?
- Admin endpointok (`/admin/*`): `require_role("admin")` minden routeron megvan-e?
- `/admin/cost-centers/` GET: admin-only, de a `NewEntry.jsx` is hívja (PV számára) — ez ellentmondás?

### 3. Auth — jelszó ellenőrzés (részletes)
- `schemas/auth.py` `LoginRequest` sémát olvasd el
- `routers/auth.py` `login()` függvényt olvasd el
- Van-e `verify_password` hívás? Ha nincs, ez a rendszer legnagyobb biztonsági hibája

### 4. Státuszgép helyessége (entry_service.py)
- `VALID_TRANSITIONS` dict: `{"folyamatban": ["elküldve"], "elküldve": ["folyamatban", "csv_letöltve"], "csv_letöltve": ["lezarva"], "lezarva": []}` — ez szerepel-e?
- `_transition()`: ha az átmenet nem engedélyezett, 400-as HTTPException-t dob-e?
- `recall`: csak `elküldve` → `folyamatban` irányt enged-e, és csak a rekord létrehozójának?
- `mark_csv_downloaded`: `_transition(entry, "csv_letöltve")` hívja-e?
- `close_entry`: `_transition(entry, "lezarva")` hívja-e?
- `berszamfejto` nem hívhatja-e a `patch_entry`-t vagy `submit_entry`-t?

### 5. Lezárás trigger (close_entry)
- BELÉPŐ + létező tax_id: `HTTPException(409)` dob-e? (nem silent overwrite)
- BELÉPŐ + új tax_id: `db.add(Employee(...))` megvan-e?
- `_log` hívás megvan-e lezáráskor?
- `db.commit()` a végén egyszer hívódik-e?

### 6. Employee import (employees.py router)
- `POST /admin/employees/import`: admin role ellenőrzés megvan-e?
- `PATCH/{employee_id}` és `DELETE/{employee_id}`: 405-öt adnak-e vissza?

### 7. Audit log lefedettség (entry_service.py)
- `_log()` meghívva: `create`, `update`, `submit`, `recall`, `csv_letoltve`, `close`, `delete` akcióknál?

## Codex prompt
```
Read AGENTS.md and Audit/01_backend_api_audit.md.
Audit only:
  backend/app/main.py
  backend/app/routers/auth.py
  backend/app/routers/entry.py
  backend/app/routers/export.py
  backend/app/routers/employees.py
  backend/app/routers/cost_centers.py
  backend/app/routers/users.py
  backend/app/routers/pv_stats.py
  backend/app/services/entry_service.py
  backend/app/dependencies.py
  backend/app/schemas/auth.py
Do not modify code.
Find:
1. CRITICAL CHECK: Does schemas/auth.py LoginRequest contain a 'password' field?
   Does routers/auth.py login() call verify_password(body.password, user.password_hash)?
   If either is missing, flag as Critical: "Authentication bypass — any password accepted"
2. PV authorization: CostCenter.region == user.region check on get_entries, get_entry, patch_entry, create_entry, submit_entry, recall_entry
3. close endpoint: require_role("berszamfejto", "admin") present in entry.py router?
4. status machine: VALID_TRANSITIONS dict correct? _transition raises 400 on invalid?
5. recall: only by record creator (created_by == user.id)?
6. mark_csv_downloaded: calls _transition("csv_letöltve")?
7. close_entry belep + existing tax_id: raises 409 Conflict?
8. audit _log called for: create, update, submit, recall, csv_letoltve, close, delete?
9. /admin/cost-centers/ GET: admin-only role check — how does NewEntry.jsx call it as PV?
10. export.py: bare except catches generate_csvs_for_entry exception and returns 500?
Return findings with file + line number evidence.
Write all findings to: C:\Progrecon-Onboard\Audit\findings\PO-{YYYYMMDD}-01_backend_api.md
Use the finding format from AGENTS.md. If no findings, write a single Info entry.
```

## Severity útmutató
- **Critical:** jelszó ellenőrzés hiánya, jogosultság bypass, státuszgép megkerülhető, server crash
- **High:** lezárva trigger nem fut, silent failure, audit log hiánya fontos akcióknál
- **Medium:** admin-only endpoint PV által is elérhető (pl. cost-centers GET), edge-case
- **Low:** log minőség, kisebb hiányosság
