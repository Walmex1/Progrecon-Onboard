# Progrecon Onboard — Technikai referencia

> Olvasd be ha: kódot írunk, struktúrát módosítunk, API-t bővítünk.  
> Verzió: 2.3 | 2026

---

## Portok

| Szolgáltatás | Port |
|---|---|
| Backend (FastAPI) | **8744** |
| Frontend (Vite/React) | **5174** |
| Progrecon Analyzer (másik projekt) | 8743 |

---

## Mappastruktúra

```
C:\Progrecon-Onboard\
├── context_workflow.md              ← Mindig beolvasandó
├── fields_context.md                ← Mezők, szabályok, validáció
├── technical_context.md             ← Ez a fájl
├── fordito_szotar_v2.xlsx           ← Nexon Mintacsomag 2.0 → szoftver mező mapping (dokumentáció)
├── iranyitoszam.xlsx                ← Forrásadat az irányítószám szótárhoz
│
├── scripts\
│   └── build_iranyitoszam.py        ← xlsx → iranyitoszamok.json generáló
│
├── backend\
│   ├── app\
│   │   ├── main.py                  ← FastAPI belépési pont
│   │   ├── database.py              ← SQLAlchemy engine + session + Base
│   │   ├── dependencies.py          ← get_current_user, require_role()
│   │   ├── core\
│   │   │   ├── config.py            ← Settings (DATABASE_URL, SECRET_KEY, port)
│   │   │   └── security.py          ← JWT, bcrypt
│   │   ├── models\
│   │   │   ├── person.py            ← Person (last_name, first_name, email, is_active)
│   │   │   ├── user.py              ← person_id FK → persons.id (nullable), region (PV jogosultság)
│   │   │   ├── cost_center.py       ← code, name, region (nullable), is_active
│   │   │   ├── employee.py          ← bővített: birth_place, mothers_name, birth_name, gender
│   │   │   ├── entry_record.py
│   │   │   ├── csv_export.py
│   │   │   ├── nav_upload.py
│   │   │   └── audit_log.py
│   │   ├── schemas\
│   │   │   ├── auth.py
│   │   │   ├── cost_center.py       ← NINCS hardcode régió lista — region mező szabadon szöveges (Create/Update/Response)
│   │   │   ├── users.py             ← PersonCreate, PersonResponse, UserCreate.person (opcionális)
│   │   │   ├── employee.py          ← bővített: birth_place, mothers_name, birth_name, gender
│   │   │   └── entry_record.py
│   │   ├── routers\
│   │   │   ├── auth.py
│   │   │   ├── entry.py
│   │   │   ├── export.py
│   │   │   ├── cost_centers.py      ← GET /regions: DB-ből DISTINCT region — nem hardcode; POST/PATCH region mentés + szerkesztés
│   │   │   ├── users.py             ← create_user: Person létrehozás ha body.person megadva
│   │   │   ├── employees.py         ← GET/POST/PATCH/DELETE + POST /import (Mintacsomag 2.0)
│   │   │   ├── pv_stats.py          ← total: employees táblából, delta: entry_records-ból
│   │   │   └── nav.py               ← ⬜ még nem kész
│   │   └── services\
│   │       ├── entry_service.py     ← lezárva trigger: employees tábla auto-frissítés
│   │       ├── employee_import.py   ← Mintacsomag 2.0 dupla fejléc + tax_id cache kezelés
│   │       ├── csv_generator.py
│   │       └── validator.py
│   ├── seed.py                      ← Persons + Userek (get_or_create logika, újrafuttatható, auto-migration)
│   ├── migrate_region.py
│   ├── migrate_cost_centers.py      ← obsolete no-op, régi költséghely-migráció
│   ├── requirements.txt
│   └── progrecon.db                 ← SQLite — NE töröld, perzisztens adat
│
└── frontend\
    ├── src\
    │   ├── main.jsx
    │   ├── App.jsx                  ← ToastContainer globálisan itt van
    │   ├── api\
    │   │   └── client.js            ← axios + interceptor (401 redirect, 403/404/422/500/NET toast)
    │   ├── store\
    │   │   └── auth.jsx             ← region + person: {last_name, first_name} | null
    │   ├── constants\
    │   │   └── options.js           ← lenyíló listák — NINCS REGIO_OPTIONS / EGYSEG_OPTIONS / KOLTSEGHELYAZ_OPTIONS, ezek dinamikusak
    │   ├── data\
    │   │   └── iranyitoszamok.json
    │   ├── hooks\
    │   │   ├── useEntryForm.js      ← belépő form state + logika; importálja useEntryValidation-t
    │   │   └── useEntryValidation.js ← validateField — tisztán JS, nincs React függőség
    │   ├── components\
    │   │   ├── Sidebar.jsx          ← footer: person neve ha van, egyébként roleLabel; Régió link az admin menüben
    │   │   └── Layout.jsx
    │   └── pages\
    │       ├── Login.jsx            ← saját hibadoboz, NEM toast
    │       ├── Home.jsx
    │       ├── NewEntry.jsx         ← csak render: F/S komponensek, stepper JSX, styles; logika a hookban; régió/egység/ktghely opciók API-ból
    │       ├── EntryList.jsx
    │       ├── Payroll.jsx
    │       ├── AdminCostCenters.jsx ← táblában Régió oszlop; "Régió szerkesztése" gomb; régió modal — meglévő régiók DB-ből + szabad szöveges bevitel
    │       ├── AdminUsers.jsx       ← táblában: Vezetéknév + Keresztnév oszlop; formban: név+email opcionális
    │       ├── AdminEmployees.jsx   ← import XLSX gomb + lista + szerkesztés
    │       └── AdminRegions.jsx     ← Régió áttekintő — régiók DB-ből számítva (activeCc egyedi régiói), nem hardcode
    ├── vite.config.js
    └── package.json
```

---

## Régiók kezelése — fontos elvek

**Nincs hardcode régió lista a kódban.** A régiók kizárólag az adatbázisból jönnek.

| Ahol korábban hardcode volt | Jelenlegi megoldás |
|---|---|
| `schemas/cost_center.py` — `COST_CENTER_REGIONS` lista | Törölve |
| `routers/cost_centers.py` — `/regions` endpoint fix lista | `SELECT DISTINCT region FROM cost_centers WHERE region IS NOT NULL` |
| `constants/options.js` — `REGIO_OPTIONS` | Törölve |
| `constants/options.js` — `EGYSEG_OPTIONS` | Törölve |
| `constants/options.js` — `KOLTSEGHELYAZ_OPTIONS` | Törölve |
| `AdminRegions.jsx` — `const REGIONS = [...]` | Törölve — `activeCc` egyedi régióiból számítva |
| `AdminCostCenters.jsx` — régió dropdown `REGIO_OPTIONS` | Meglévő régiók DB-ből + szabad szöveges bevitel |
| `NewEntry.jsx` — régió/egység/ktghely fix opciók | `/admin/cost-centers/` API-ból dinamikusan |

**Régió szabad szöveges mező** — bármilyen értéket felvehet, nincs előre meghatározott készlet. Az első cost centerek feltöltésekor az admin adja meg a régiókat.

---

## Person / User szétválasztás

A `persons` tábla a **valódi személyt** tárolja (név, email), a `users` tábla a **belépési fiókot** (username, role). Kapcsolat: `users.person_id → persons.id` (nullable).

- Új user létrehozásakor az admin opcionálisan megadhat nevet + emailt → `Person` rekord jön létre és hozzárendelődik
- Ha kilép valaki és új ember veszi át: a régi `user` deaktiválódik, új `user` jön létre új `Person`-nal — a régi `Person` megmarad
- `Sidebar.jsx` a `user.person` alapján mutat nevet, ha nincs person: `roleLabel` jelenik meg

### Jelenlegi dev seed személyek
| Username | Vezetéknév | Keresztnév | Email |
|---|---|---|---|
| pv1 | Projektvezető | Egy | pv1@progrecon.hu |
| ber1 | Bérszámfejtő | Egy | ber1@progrecon.hu |
| ber2 | Bérszámfejtő | Kettő | ber2@progrecon.hu |
| admin | Adminisztrátor | Egy | admin@progrecon.hu |

---

## useEntryForm hook (`hooks/useEntryForm.js`)

A belépő form teljes state-kezelése és logikája ide van kiemelve a `NewEntry.jsx`-ből.

**Tartalom:**
- State: `entryId`, `form`, `errors`, `touched`, `saving`, `saveError`, `submitDone`, `currentStep`
- Refs: `autoSaveTimer`, `creatingEntryRef`
- useEffect-ek: role-check redirect, rekord betöltés, autosave timer, irányítószám→település auto-fill (lakcím + tartózkodási hely), kedvezményezett auto-fill
- Függvények: `autoSave`, `ensureEntry`, `set`, `onBlur`, `foglalkozasiOptions`, `handleSubmit`
- Számított értékek: `szepAnyFilled`, `isFormComplete`, `isFieldFilled`, `isStepComplete`
- Validáció: `validateField` importálva `useEntryValidation.js`-ből

**A `NewEntry.jsx`-ben marad:**
- `STEPS` konstans (stepper render)
- `iranyitoszamOptions`, `feorOptions` (select opciók buildelése)
- `costCenters` state + useEffect (`/admin/cost-centers/` API hívás) → `regioOptions`, `egysegOptions`, `koltseghelyOptions` dinamikus számítása
- `filterName`, `filterPhone`, `filterNonNegativeNumber`, `handleDateInput`, `handleAccountInput` (F komponens használja)
- `F` és `S` belső komponensek
- Teljes JSX + `styles` objektum

**Paraméter:** `{ id }` — a `useParams()`-ból jön, a `NewEntry.jsx` adja át.

---

## useEntryValidation (`hooks/useEntryValidation.js`)

Tisztán JS, React-függőség nélkül — önállóan tesztelhető.

**Exportál:** `validateField(field, value, currentForm)`

**Validált mezők:**
- `adoazonosito` — 10 számjegy, 8-cal kezdődik, checksum mod 11, keresztvalidáció születési dátummal
- `szuletesi_datum` — ÉÉÉÉ-HH-NN formátum, keresztvalidáció adóazonosítóval
- `taj` — 9 számjegy, checksum mod 10 (súlyok: 3,7,3,7,3,7,3,7)
- `bankszamlaszam` — 16 vagy 24 számjegy (kötőjelek nélkül)
- `jogviszony_kezdete`, `jogviszony_vege` — ÉÉÉÉ-HH-NN formátum
- `email` — `@` és domain kötelező

**Fontos:** `currentForm` mindig explicit átadandó — nincs fallback closure. A hívó (`useEntryForm`) minden esetben átadja a teljes form state-et.

---

## Indítás

### Backend
```
cd C:\Progrecon-Onboard\backend
py -m pip install -r requirements.txt
py seed.py                           ← get_or_create logika, újrafuttatható, auto-migration
uvicorn app.main:app --reload --port 8744
```
> Python 3.13, parancs: `py`. Ha bcrypt hiba: `py -m pip install bcrypt==4.0.1`

### Frontend
```
cd C:\Progrecon-Onboard\frontend
npm install
npm run dev -- --port 5174
```

### Új ügyfél induló feltöltési sorrendje
1. Admin → Kostséghelyek: cost centerek felvitele UI-on (kód, név, régió) — **seed.py-ban nincs hardcode cost center, az admin tölti fel**
2. Admin → Munkavállalók → Import XLSX → Mintacsomag 2.0 feltöltése
3. Ellenőrzés: created/updated/skipped számok + errors lista

> **Fontos:** a cost centereknek már bent kell lenniük mielőtt a munkavállalói importot futtatják, különben a `cost_center_id` NULL marad.

### Felhasználók (seed után)
| Felhasználónév | Jelszó | Szerepkör | Régió |
|---|---|---|---|
| pv1 | demo1234 | Projektvezető | Észak |
| ber1 | demo1234 | Bérszámfejtő | — |
| ber2 | demo1234 | Bérszámfejtő | — |
| admin | admin1234 | Admin | — |

> **Megjegyzés:** a seed.py-ban lévő `pv1` régió értéke (`Észak`) és a hardcode cost centerek (`KLBNAG` stb.) fejlesztési placeholder-ek — éles ügyfélnél a seed-et meg kell tisztítani vagy az admin UI-on kell felülírni.

---

## Adatbázis

### Táblák
| Tábla | Leírás |
|---|---|
| `persons` | Valódi személyek — név, email (user fióktól független) |
| `users` | Bejelentkezés, szerepkör, person_id FK, region (PV jogosultság) |
| `cost_centers` | Ügyfelek / telephelyek — code, name, region (nullable), is_active |
| `employees` | Aktuális létszám — az egyetlen igaz forrás |
| `entry_records` | Folyamatban lévő ügyek (form_data JSON) |
| `csv_exports` | CSV letöltések naplója |
| `nav_uploads` | NAV XML visszatöltések |
| `audit_log` | Minden művelet old/new data JSON-nal |

### cost_centers tábla mezői
| Mező | Típus | Kötelező |
|---|---|---|
| id | Integer, PK | Igen |
| code | String, unique | Igen |
| name | String | Igen |
| region | String, nullable | Nem — szabad szöveges, nincs fix készlet |
| is_active | Boolean, default True | Igen |

> **Régió szerepe:** kizárólag a PV-k költséghely-hozzáférését szabályozza. A PV `users.region` értéke alapján látja az azonos `cost_centers.region` alá tartozó költséghelyeket. Nem jelenik meg az `employees` táblában, a Nexon importban, vagy a CSV kimenetben.

### form_data JSON
Csak PV által kitöltött mezők. Auto mezők NEM kerülnek bele — `csv_generator.py` számolja generáláskor.

### SQLite → PostgreSQL
Csak `config.py`-ban: `DATABASE_URL = "postgresql://user:password@localhost/progrecon"`

---

## API végpontok

```
POST   /auth/login

GET    /entries/
POST   /entries/
GET    /entries/{id}
PATCH  /entries/{id}
POST   /entries/{id}/submit
POST   /entries/{id}/recall

POST   /exports/{entry_id}
GET    /exports/history/{entry_id}

GET    /pv/stats/

GET    /admin/cost-centers/
POST   /admin/cost-centers/
GET    /admin/cost-centers/regions   ← DB-ből DISTINCT region értékek (nem hardcode lista)
PATCH  /admin/cost-centers/{id}      ← név és/vagy régió szerkesztése (régió: null = törlés)
POST   /admin/cost-centers/{id}/deactivate
POST   /admin/cost-centers/{id}/activate
DELETE /admin/cost-centers/{id}

GET    /admin/users
POST   /admin/users
PATCH  /admin/users/{id}             ← body: { role, region } — mindkét mező kötelező
POST   /admin/users/{id}/deactivate
POST   /admin/users/{id}/activate
DELETE /admin/users/{id}

GET    /admin/employees/
GET    /admin/employees/count
POST   /admin/employees/
PATCH  /admin/employees/{id}
DELETE /admin/employees/{id}
POST   /admin/employees/import      ← Mintacsomag 2.0 xlsx feltöltés

POST   /nav/{entry_id}              ← ⬜ még nem kész
GET    /admin/log                   ← ⬜ még nem kész
```

---

## Toast / értesítési rendszer

**Library:** `react-toastify`

**Globális beállítás:** `App.jsx` — `<ToastContainer>` az `<AuthProvider>` belsejébe, `<BrowserRouter>` elé helyezve.

```jsx
<ToastContainer
  position="top-right"
  autoClose={4000}
  hideProgressBar={false}
  newestOnTop
  closeOnClick
  pauseOnFocusLoss
  pauseOnHover
/>
```

**Általános HTTP hibák — `api/client.js` interceptor:**

| HTTP kód | Toast típus | Kód | Megjegyzés |
|---|---|---|---|
| 401 | — | — | localStorage clear + redirect /login, nem toast |
| 403 | error | PO-ERR-403 | Mindig |
| 404 | error | PO-ERR-404 | Mindig |
| 422 | warning | PO-ERR-422 | Kivétel: `/entries/` POST submit — azt useEntryForm.js kezeli |
| 500 | error | PO-ERR-500 | Mindig |
| hálózati hiba | error | PO-ERR-NET | Ha nincs `err.response` |

**Komponens-szintű toast hibakódok:**

| Kód | Hol | Leírás |
|---|---|---|
| PO-WARN-VAL | useEntryForm.js handleSubmit | Validációs hiba submit-nál — mezőszintű jelzések mellé |

**Szabályok új toastok hozzáadásához:**
- Egyedi üzenetek (pl. duplikált adóazonosító figyelmeztetés) mindig a komponensből/hookból hívódnak, nem az interceptorból
- Az interceptor csak általános HTTP hibákat kezel
- `Login.jsx` **nem** használ toastot — ott saját hibadoboz marad
- Betöltési hibák (`useEffect` adatlekérés) `setError()` state-ben maradnak, piros dobozban jelennek meg — ezek persistent hibák
- Akciók hibái (mentés, törlés, deaktiválás) az interceptoron keresztül toastként jelennek meg
- Modális form hibák (`setFormError`) inline maradnak a modalban

---

## Kódolási konvenciók

### Backend
- `snake_case` függvények, `PascalCase` osztályok
- Type hints minden router és service függvényen
- Üzleti logika MINDIG service-ben, soha nem routerben

### Frontend
- Funkcionális komponensek, hookok
- API hívás CSAK `api/client.js`-en keresztül
- Statikus lenyíló listák forrása: `constants/options.js` — soha nem inline JSX-ben
- **Dinamikus listák (régió, egység, költséghely) forrása: API** — soha nem `options.js`-ben
- **NewEntry.jsx csak rendert tartalmaz** — state és logika a `useEntryForm` hookban van
- Validációs logika: `useEntryValidation.js` — React-független, tesztelhető
- Irányítószám szótár: `data/iranyitoszamok.json` (import, nem API)
- Toast: `import { toast } from "react-toastify"` — hookból/komponensből hívva egyedi esetekre

### CSV
- Kódolás: **cp1250** (tisztázandó!)
- Elválasztó: **pontosvessző** (tisztázandó!)
- Fejléc: oszlopszámok (1, 2, 3...)
- Letöltés: ZIP, `belep_{id}_{dátum}.zip`

---

## Fejlesztési állapot

| # | Feladat | Státusz |
|---|---|---|
| 1–9 | Backend + frontend alap (auth, belépő CRUD, CSV, bérszámfejtő nézet) | ✅ Kész |
| 10 | Lenyíló mezők kiszervezése (options.js + iranyitoszamok.json) | ✅ Kész |
| 11 | NAV XML visszatöltés | ⬜ Következő |
| 12 | Admin — Kostséghelyek almenü | ✅ Kész |
| 12b | Admin — Felhasználók almenü | ✅ Kész |
| 13 | PV költséghely-hozzáférés régió alapján | ✅ Kész |
| 14 | PV nyitóképernyő: létszám + delta kártyák | ✅ Kész |
| 15 | Admin nyitóképernyő: stat kártyák + gyorslinkek | ✅ Kész |
| 16 | Munkavállalói adatbázis — import (Mintacsomag 2.0) + lezárva trigger | ✅ Kész |
| 17 | Toast / értesítési keretrendszer (react-toastify) | ✅ Kész |
| 18 | NewEntry.jsx refaktor — useEntryForm + useEntryValidation kiemelés | ✅ Kész |
| 21 | Person tábla + User szétválasztás (név, email, Sidebar név) | ✅ Kész |
| 22 | Kostséghely régió mező + PATCH endpoint + UI szerkesztés | ✅ Kész |
| 23 | Admin — Régiók almenü (áttekintő + ktghely/PV hozzárendelés) + régiókészlet egységesítés | ✅ Kész |
| 24 | Hardcode régiók + cost center kódok eltávolítása — dinamikus API-alapú megoldás | ✅ Kész |
| 19 | Kilépő modul | ⬜ Következő |
| 20 | Módosítási modul | ⬜ Következő |
