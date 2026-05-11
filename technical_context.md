# Progrecon Onboard — Technikai referencia

> Olvasd be ha: kódot írunk, struktúrát módosítunk, API-t bővítünk.  
> Verzió: 1.3 | 2025

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
├── fields.md                        ← Mezők, szabályok, validáció
├── technical.md                     ← Ez a fájl
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
│   │   ├── models\                  ← ORM modellek
│   │   │   ├── user.py              ← User (cost_center_id NÉLKÜL, relationship via user_cost_centers)
│   │   │   ├── user_cost_center.py  ← UserCostCenter kapcsolótábla (many-to-many)
│   │   │   ├── cost_center.py
│   │   │   ├── employee.py          ← cost_center_id mezővel bővítve
│   │   │   ├── entry_record.py
│   │   │   ├── csv_export.py
│   │   │   ├── nav_upload.py
│   │   │   └── audit_log.py
│   │   ├── schemas\
│   │   │   ├── auth.py              ← TokenResponse: cost_center_ids: list[int]
│   │   │   ├── cost_center.py
│   │   │   ├── users.py             ← UserCreate/Update: cost_center_ids: list[int], UserResponse: cost_centers: list[CostCenterShort]
│   │   │   └── entry_record.py
│   │   ├── routers\
│   │   │   ├── auth.py              ← POST /auth/login → cost_center_ids lista
│   │   │   ├── entry.py             ← /entries/ CRUD + submit + recall
│   │   │   ├── export.py            ← /exports/
│   │   │   ├── cost_centers.py      ← /admin/cost-centers CRUD
│   │   │   ├── users.py             ← /admin/users CRUD (multi ktghely)
│   │   │   ├── pv_stats.py          ← GET /pv/stats/ (csak pv szerepkör)
│   │   │   └── nav.py               ← ⬜ még nem kész
│   │   └── services\
│   │       ├── entry_service.py     ← CRUD, státuszgép, jogosultság (IN lista ktghelyekre)
│   │       ├── csv_generator.py     ← NBTorzs/NBJuttat/NBLevon/NBSZEPKAdat
│   │       └── validator.py         ← Adóazonosító, TAJ, bankszámla
│   ├── seed.py                      ← Demo adatok (user_cost_centers kapcsolótáblával)
│   ├── migrate_cost_centers.py      ← Egyszeri migráció: régi cost_center_id → user_cost_centers
│   ├── requirements.txt
│   └── progrecon.db                 ← SQLite (demo)
│
└── frontend\
    ├── src\
    │   ├── main.jsx
    │   ├── App.jsx                  ← Routing
    │   ├── api\
    │   │   └── client.js            ← Axios, Bearer token, 401 redirect
    │   ├── store\
    │   │   └── auth.jsx             ← AuthContext: costCenterIds: [] (tömb, JSON localStorage)
    │   ├── constants\
    │   │   └── options.js           ← Fix lenyíló listák
    │   ├── data\
    │   │   └── iranyitoszamok.json  ← 3038 irányítószám (generált)
    │   ├── components\
    │   │   ├── Sidebar.jsx
    │   │   └── Layout.jsx
    │   └── pages\
    │       ├── Login.jsx            ← cost_center_ids lista kezelés
    │       ├── Home.jsx             ← PV: ktghely kártyák + delta | Admin: stat kártyák + gyorslinkek
    │       ├── NewEntry.jsx
    │       ├── EntryList.jsx
    │       ├── Payroll.jsx
    │       ├── AdminCostCenters.jsx
    │       └── AdminUsers.jsx       ← multi-select checkbox ktghely lista
    ├── vite.config.js               ← port: 5174
    └── package.json
```

---

## Indítás

### Backend
```
cd C:\Progrecon-Onboard\backend
py -m pip install -r requirements.txt
py migrate_cost_centers.py           ← csak egyszer, meglévő DB migrációhoz
py seed.py                           ← csak egyszer, fresh DB-hez
uvicorn app.main:app --reload --port 8744
```
> Python 3.13, parancs: `py`. Ha bcrypt hiba: `py -m pip install bcrypt==4.0.1`

### Frontend
```
cd C:\Progrecon-Onboard\frontend
npm install                          ← csak egyszer
npm run dev -- --port 5174
```

### Irányítószám JSON újragenerálása
```
cd C:\Progrecon-Onboard
py scripts/build_iranyitoszam.py
```

### Demo felhasználók
| Felhasználónév | Jelszó | Szerepkör | Költséghelyek |
|---|---|---|---|
| pv1 | demo1234 | Projektvezető | KH001 |
| pv2 | demo1234 | Projektvezető | KH002 |
| ber1 | demo1234 | Bérszámfejtő | — |
| ber2 | demo1234 | Bérszámfejtő | — |
| admin | admin1234 | Admin | — |

---

## Adatbázis

### Táblák
| Tábla | Leírás |
|---|---|
| `users` | Bejelentkezés, szerepkör (`is_active` flag — `cost_center_id` oszlop NINCS, relationship van) |
| `user_cost_centers` | PV ↔ CostCenter many-to-many kapcsolótábla (`user_id`, `cost_center_id`) |
| `cost_centers` | Ügyfelek / telephelyek (`is_active` flag, deaktiválható + törölhető) |
| `employees` | Munkavállalók, `cost_center_id` mezővel, adóazonosító az egyedi kulcs |
| `entry_records` | Rekordok, form_data JSON |
| `csv_exports` | Letöltések naplója |
| `nav_uploads` | NAV XML visszatöltések |
| `audit_log` | Minden művelet old/new data JSON-nal |

### form_data JSON
Csak PV által kitöltött mezők. Automatikus mezők NEM kerülnek bele — a `csv_generator.py` számolja ki generáláskor.

### SQLite → PostgreSQL
Csak `config.py`-ban: `DATABASE_URL = "postgresql://user:password@localhost/progrecon"`

---

## API végpontok

```
POST   /auth/login                   ← response: access_token, role, cost_center_ids: []

GET    /entries/                     ← PV: csak saját ktghelyek (IN lista)
POST   /entries/
GET    /entries/{id}
PATCH  /entries/{id}                 ← auto-mentés
POST   /entries/{id}/submit
POST   /entries/{id}/recall          ← visszavétel elküldve → folyamatban

POST   /exports/{entry_id}           ← CSV generálás + ZIP
GET    /exports/history/{entry_id}

GET    /pv/stats/                    ← csak pv szerepkör: ktghelyenkénti létszám + delta

GET    /admin/cost-centers           ← ?active_only=true szűrővel
POST   /admin/cost-centers
POST   /admin/cost-centers/{id}/deactivate
POST   /admin/cost-centers/{id}/activate
DELETE /admin/cost-centers/{id}      ← csak ha inaktív

GET    /admin/users                  ← cost_centers: [{id, code, name}] lista
POST   /admin/users                  ← cost_center_ids: [1, 2, ...] lista
PATCH  /admin/users/{id}             ← role + cost_center_ids lista
POST   /admin/users/{id}/deactivate
POST   /admin/users/{id}/activate
DELETE /admin/users/{id}             ← csak ha inaktív

POST   /nav/{entry_id}               ← ⬜ még nem kész
GET    /admin/log                    ← ⬜ még nem kész
```

**Auth:** JWT Bearer. Payload: `user_id`, `role` (cost_center_id NEM kerül a tokenbe). 401 → auto redirect login.  
**PV jogosultság:** `entry_records` szűrése `cost_center_id IN (user ktghely lista)` alapján.

---

## Auth store (frontend)

`src/store/auth.jsx` — a `user` objektum:
```js
{
  token: "...",
  role: "pv",
  costCenterIds: [1, 2]   // tömb, JSON.stringify-val localStorage-ban
}
```
`localStorage` kulcsok: `token`, `role`, `cost_center_ids` (JSON string).

---

## /pv/stats/ response struktúra

```json
{
  "cost_centers": [
    {
      "cost_center_id": 1,
      "code": "KLBLENU",
      "name": "LENOVO Manufacturing Hungary Kft.",
      "total": 187,
      "delta_today": 2,
      "delta_week": 8,
      "delta_month": 23
    }
  ],
  "total_all": 284
}
```

Delta számítás alapja: `entry_records` ahol `status IN ('csv_letöltve', 'lezarva')` és `updated_at` az adott időablakban.

---

## Kódolási konvenciók

### Backend
- `snake_case` függvények, `PascalCase` osztályok
- Type hints minden router és service függvényen
- Üzleti logika MINDIG service-ben, soha nem routerben

### Frontend
- Funkcionális komponensek, hookok
- API hívás CSAK `api/client.js`-en keresztül
- Lenyíló listák forrása: `constants/options.js` (soha nem inline JSX-ben)
- Irányítószám szótár: `data/iranyitoszamok.json` (import, nem API)

### CSV
- Kódolás: **cp1250** (tisztázandó!)
- Elválasztó: **pontosvessző** (tisztázandó!)
- Fejléc: oszlopszámok (1, 2, 3...)
- Letöltés: ZIP, `belep_{id}_{dátum}.zip`

---

## Implementált frontend szabályok

| Szabály | Hol van |
|---|---|
| Irányítószám → település auto kitöltés (lakcím + tartózkodási hely) | NewEntry.jsx useEffect |
| Végtelen ciklus védelem: csak ha az érték tényleg változott | NewEntry.jsx useEffect feltétel |
| Munkaidő → foglalkozási viszony szűrés (teljes vs. részmunkaidős) | NewEntry.jsx `foglalkozasiOptions()` |
| Auto-mentés 1500ms debounce-szal | NewEntry.jsx useEffect + useRef |
| SZÉP-kártya szekció összecsukható | NewEntry.jsx `szepOpen` state |
| Tartózkodási hely szekció összecsukható | NewEntry.jsx `tartOpen` state |
| PV Home: ktghely kártyák + delta (napi/heti/havi) | Home.jsx |
| Admin Home: stat kártyák + gyorslinkek | Home.jsx |
| AdminUsers: multi-select checkbox ktghely lista | AdminUsers.jsx |

---

## Fejlesztési állapot

| # | Feladat | Státusz |
|---|---|---|
| 1–9 | Backend + frontend alap (auth, belépő CRUD, CSV, bérszámfejtő nézet) | ✅ Kész |
| 10 | Lenyíló mezők kiszervezése (options.js + iranyitoszamok.json) | ✅ Kész |
| 11 | NAV XML visszatöltés | ⬜ Következő |
| 12 | Admin — Költséghelyek almenü | ✅ Kész |
| 12b | Admin — Felhasználók almenü | ✅ Kész |
| 13 | PV ↔ many-to-many ktghely refactor | ✅ Kész |
| 14 | PV nyitóképernyő: létszám + delta kártyák | ✅ Kész |
| 15 | Admin nyitóképernyő: stat kártyák + gyorslinkek | ✅ Kész |
| 16 | Munkavállalói adatbázis (admin) — import + lista | ⬜ Következő |
| 17 | Kilépő modul | ⬜ Következő |
| 18 | Módosítási modul | ⬜ Következő |
