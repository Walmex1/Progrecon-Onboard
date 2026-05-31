# AGENTS.md — Progrecon Onboard audit szabályok

## Rendszer összefoglaló
- **Stack:** React + Vite (frontend, port 5174) | Python + FastAPI (backend, port 8744)
- **Adattárolás:** SQLite (`backend/progrecon.db`) → PostgreSQL migráció tervezett
- **Auth:** JWT Bearer token, szerepkörök: pv, berszamfejto, admin
- **Indítás:** `uvicorn app.main:app --reload --port 8744` + `cd frontend && npm run dev -- --port 5174`

## Munkamód
- A **claude.ai (ez)** tervez, elemez, megírja a promptot
- A **VS Code Claude Code / Codex** hajtja végre a kódírást és a teszteket
- Csak akkor írj promptot, ha a felhasználó engedélyezi

## Alapszabály
Audit módban dolgozz. Ne módosíts kódot automatikusan. Először findings riportot készíts.

## Kötelező output formátum minden auditnál

```md
## Finding ID: PO-YYYYMMDD-001
Severity: Critical / High / Medium / Low / Info
Area:
Affected files:
Evidence: (pontos fájl + sorszám vagy kódrészlet)
Risk:
Recommended fix:
Verification step:
```

## Severity szabályok

**Critical:**
- adatvesztés (entry_record, employee, csv_export elvész)
- production crash (nem kezelt kivétel ami leállítja a FastAPI-t)
- teljes workflow megtörése (PV nem tud elküldeni, bérszámfejtő nem tud CSV-t generálni)
- jogosultság bypass (PV más régió adatát látja/módosítja)
- authentikáció bypass (jelszó ellenőrzés hiánya)

**High:**
- silent failure (hiba történik, user nem értesül)
- státuszgép megkerülése (pl. folyamatban-ból egyből lezarva)
- CSV generálás hibás adatot ír (rossz oszlop, hiányzó mező)
- employee tábla nem frissül lezáráskor

**Medium:**
- edge-case kezeletlen (pl. üres form_data, hiányzó opcionális mező)
- validáció hiánya (adóazonosító, TAJ, bankszámla)
- frontend state és backend state eltérhet

**Low / Info:**
- code smell, dokumentáció hiány, kisebb refactor javaslat

## Fontos működési szabályok
1. Ne találj ki nem létező fájlokat – csak olvasott kódra alapozz.
2. Ha nincs elég info, írd le melyik fájl hiányzik.
3. Ne refaktorálj, amíg nem kérik.
4. Minden állításhoz adj fájl + sorszám bizonyítékot.
5. A `backend/progrecon.db` tartalmát ne olvasd be – éles adat.

## Findings dokumentálása
Minden talált hibát külön fájlba írj:
- Mappa: `C:\Progrecon-Onboard\Audit\findings\`
- Fájlnév: `PO-YYYYMMDD-{audit_szám}_{terület}.md` (pl. `PO-20260531-01_backend_api.md`)
- Finding ID formátuma: `PO-YYYYMMDD-001`
- Minden audit futtatása után a findings fájl automatikusan létrejön ebbe a mappába.

---

## Ismert architektúrális tények (ne kérdőjelezd meg ezeket)

### Person / User szétválasztás
- `persons` tábla: valódi személyek (last_name, first_name, email, is_active)
- `users` tábla: bejelentkezési fiókok (username, password_hash, role, region, person_id FK nullable)
- PV jogosultság: `users.region` == `cost_centers.region` alapján látja a költséghelyeket
- **Nincs** costCenterIds tömb az auth store-ban — régi architektúra, eltávolítva

### Régiók — nincs hardcode
- Régiók kizárólag az adatbázisból jönnek (`cost_centers.region` DISTINCT értékei)
- `REGIO_OPTIONS`, `EGYSEG_OPTIONS`, `KOLTSEGHELYAZ_OPTIONS` **NEM** szerepelnek az options.js-ben
- A NewEntry.jsx a `/admin/cost-centers/` API-ból számítja ezeket dinamikusan

### NAV modul
- `nav.py` router **nem létezik** — nincs bekötve a main.py-ba
- A `lezarva` státuszba a `/entries/{id}/close` endpoint vezet (berszamfejto / admin)
- NAV XML visszatöltés manuális folyamat, a szoftver még nem támogatja

### Státuszgép (VALID_TRANSITIONS — entry_service.py)
- `folyamatban` → `elküldve` (submit)
- `elküldve` → `folyamatban` (recall) VAGY `csv_letöltve` (mark_csv_downloaded)
- `csv_letöltve` → `lezarva` (close_entry)
- `lezarva` → [] (végállapot)
- `close` endpoint: `/entries/{id}/close`, berszamfejto/admin csak
- `mark_csv_downloaded`: belső függvény, az export.py hívja CSV generálás után

### employees tábla — close_entry trigger (entry_service.py)
- BELÉPŐ + **új** tax_id → `db.add(Employee(...))` — belép a törzsbe
- BELÉPŐ + **létező** tax_id → `HTTPException(409 Conflict)` — lezárás megszakad
- KILÉPŐ + létező employee → `db.delete(existing)` — törli a törzsből
- KILÉPŐ + nem létező employee → silent (nincs hiba)
- MÓDOSÍTÁS + létező employee → mezők frissülnek
- MÓDOSÍTÁS + nem létező employee → silent
- A trigger az `entry_service.py` `close_entry()` függvényében van, nem külön service-ben

### Employee tábla mezői (models/employee.py)
- tax_id (unique, index), last_name, first_name, birth_date, taj, trunk_number,
  birth_place, mothers_name, birth_name, gender, cost_center_id (FK nullable)
- PATCH és DELETE endpointok **tiltottak** (405 Method Not Allowed)
- Import: Mintacsomag 2.0 xlsx, dupla fejlécsor (2. sor az irányadó, 3. sortól adatok)

### CSV generálás (csv_generator.py)
- NBTorzs: `row = [""] * 169` (1-alapú, 0. hely üres), visszaadott sor: `row[1:]` = 168 elem
  - Fejléc: `[str(i) for i in range(1, 169)]` → 168 fejlécoszlop
  - **Megjegyzés:** a fields_context.md "52 oszlop"-ot ír, de a kód 168-at generál — tisztázandó!
- NBJuttat: 8 oszlop
- NBLevon: 9 oszlop
- NBSZEPKAdat: 7 oszlop, csak ha `szep_kartya_szam` ki van töltve
- Kódolás: `cp1250`, elválasztó: `;` (pontosvessző) — még pontosítandó a megrendelővel!
- ZIP neve: `belep_{id}_{timestamp}.zip` (timestamp = YYYYMMDD_HHMMSS)
- Ha csak 1 CSV generálódik: sima CSV visszaadás, nem ZIP

### Toast / értesítési rendszer
- Library: react-toastify, globális `<ToastContainer>` az `App.jsx`-ben
- Interceptor hibakódok: PO-ERR-403, PO-ERR-404, PO-ERR-422, PO-ERR-500, PO-ERR-NET
- 401: `localStorage.clear()` + `window.location.href = "/login"` (nem toast)
- Login.jsx: saját hibadoboz, nem toast
- Submit 422 hiba: az interceptor kizárja `/entries/` POST esetén, `useEntryForm.js` kezeli

### options.js (constants/options.js)
- **Tartalmaz:** NEME_OPTIONS, FOGLALKOZASI_VISZONY, TELJES_MUNKAIDOS (string tömb, nem opciók!),
  BEREZESI_MOD, SZEP_KIBOCSATO, MUNKAIDO_OPTIONS, KOZTERULET_JELLEGE_OPTIONS,
  ALLAMPOLGARSAG_OPTIONS, ORSZAG_OPTIONS, MUNKAKOR_OPTIONS
- **NEM tartalmaz:** REGIO_OPTIONS, EGYSEG_OPTIONS, KOLTSEGHELYAZ_OPTIONS (dinamikusak)
- Nexon szótárak (ALLAMPOLGARSAG, ORSZAG, MUNKAKOR): **placeholder** értékek — végleges Nexon kódok hiányoznak
- TELJES_MUNKAIDOS = ["01", "05", "41"] — tömb, nem opciók objektum

### Hooks architektúra
- `useEntryForm.js`: teljes form state + logika
  - autosave: 1500ms debounce, cleanup, submitDone guard
  - ensureEntry: race condition guard (creatingEntryRef)
  - set/onBlur: "reward early, punish late" validációs logika
  - handleSubmit: autoSave + submit + navigálás + hibakezelés
- `useEntryValidation.js`: tisztán JS, React-független, `validateField(field, value, currentForm)`
- `NewEntry.jsx`: csak render — F/S komponensek, stepper JSX, styles, dinamikus opciók

### Auth store (store/auth.jsx)
- localStorage: token, role, region, person (JSON.stringify-val)
- `logout()`: `localStorage.clear()`
- `401` kezelés: `client.js` interceptorban, `localStorage.clear()` + redirect

### seed.py
- Újrafuttatható (get_or_create logika)
- Auto-migration: person_id és region oszlopok hozzáadása ha hiányoznak
- Hardcode cost center kódok **nincsenek** a seedben (az admin tölti fel UI-on)
- pv1 régiója: "Észak" (development placeholder, éles ügyfélnél felül kell írni)
