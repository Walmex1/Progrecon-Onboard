## Finding ID: PO-20260531-001
Severity: Critical
Area: Auth / login
Affected files:
- `backend/app/schemas/auth.py`
- `backend/app/routers/auth.py`
- `backend/app/core/security.py`
Evidence:
- `backend/app/schemas/auth.py:5-7` - `LoginRequest` csak `username: str` mezot tartalmaz, `password` mezot nem.
- `backend/app/routers/auth.py:13-21` - a `login()` csak felhasznalonev alapjan betolti a usert, majd tokent general; nincs jelszoellenorzes.
- `backend/app/core/security.py:11-12` - a `verify_password()` letezik, de `backend/app/routers/auth.py` nem importalja es nem hivja.
Risk:
Barki be tud jelentkezni barmely letezo felhasznalonevvel, mert a backend nem ker es nem ellenoriz jelszot. Ez teljes authentikacio bypass.
Recommended fix:
Add hozza a `password: str` mezot a `LoginRequest` semahoz, importald a `verify_password` fuggvenyt az auth routerben, es sikertelen ellenorzesnel adj `401 Unauthorized` valaszt altalanos hibauzenettel.
Verification step:
Kuldj `POST /auth/login` kerest letezo `username` es hibas `password` mezovel. Elvart eredmeny: `401 Unauthorized`, token nelkul. Helyes jelszoval elvart eredmeny: bearer token.

## Finding ID: PO-20260531-002
Severity: High
Area: Auth / inactive users
Affected files:
- `backend/app/routers/auth.py`
- `backend/app/routers/users.py`
- `backend/app/models/user.py`
Evidence:
- `backend/app/models/user.py:18` - a `User` modellben van `is_active` flag.
- `backend/app/routers/users.py:100-110` - az admin endpoint deaktivalt allapotba tudja tenni a felhasznalot (`user.is_active = False`).
- `backend/app/routers/auth.py:13-21` - a `login()` nem ellenorzi, hogy `user.is_active` igaz-e, hanem aktiv es inaktiv userre is tokent general.
Risk:
Deaktivalt felhasznalo tovabbra is be tud jelentkezni es ervenyes JWT tokent kap. Ez jogosultsag-visszavonasi hiba, kulonosen tavozott vagy letiltott felhasznaloknal.
Recommended fix:
A login folyamatban a user betoltese utan ellenorizni kell az `is_active` mezot, es inaktiv user eseten `401 Unauthorized` vagy `403 Forbidden` valaszt kell adni token generalas nelkul.
Verification step:
Adminnal deaktivalt userrel probalj `POST /auth/login` kerest. Elvart eredmeny: token nem jon letre, a valasz hibakod.

## Finding ID: PO-20260531-003
Severity: Medium
Area: Cost center API / PV workflow
Affected files:
- `backend/app/routers/cost_centers.py`
- `frontend/src/pages/NewEntry.jsx`
Evidence:
- `backend/app/routers/cost_centers.py:13-18` - a `GET /admin/cost-centers/` endpoint `require_role("admin")` vedelmet hasznal.
- `frontend/src/pages/NewEntry.jsx:172-181` - a NewEntry oldal betolteskor `client.get("/admin/cost-centers/")` hivast vegez, es ebbol szamolja a regio/egyseg/koltseghely opciokat.
Risk:
PV felhasznalo a NewEntry oldalon nem tudja betolteni a dinamikus koltseghely opciokat, mert a backend admin-only endpointot hasznal. Ez frontend-backend szerzodesi hiba, ami megakaszthatja a PV rekordletrehozasi workflow-t.
Recommended fix:
Hozz letre kulon PV-kompatibilis cost center listazo endpointot, amely PV eseten `CostCenter.region == current_user.region` es aktiv cost centerek alapjan szur, admin eseten pedig tovabbra is admin listat adhat. A NewEntry ezt az endpointot hivja.
Verification step:
PV tokennel nyisd meg a NewEntry oldalt vagy hivd meg a hasznalt cost center endpointot. Elvart eredmeny: csak a PV sajat regiojahoz tartozo aktiv koltseghelyek jonnek vissza, 403 nelkul.

Status: FIXED
Fixed in: backend/app/routers/cost_centers.py (pv_router hozzaadva), backend/app/main.py, frontend/src/pages/NewEntry.jsx (/cost-centers/ endpoint)
Fix date: 2026-05-31
Note: Az 1. korben javitva, findings bejegyzes most potolva.

## Finding ID: PO-20260531-004
Severity: Medium
Area: Export API / status machine
Affected files:
- `backend/app/routers/export.py`
- `backend/app/services/entry_service.py`
Evidence:
- `backend/app/routers/export.py:31-32` - az export endpoint engedi az `elkuldve` es a `csv_letoltve` statuszu rekordokat.
- `backend/app/routers/export.py:63-64` - az endpoint minden sikeres CSV generalas utan meghivja a `mark_csv_downloaded()` fuggvenyt, majd commitol.
- `backend/app/services/entry_service.py:187-189` - a `mark_csv_downloaded()` mindig `_transition(entry, "csv_letoltve")` hivast vegez.
- `backend/app/services/entry_service.py:12-17` es `backend/app/services/entry_service.py:192-198` - a `csv_letoltve` statuszbol csak `lezarva` engedelyezett, ugyanabba a `csv_letoltve` statuszba valtani 400-as hibat dob.
Risk:
Az export endpoint latszolag tamogatja a mar `csv_letoltve` rekord ujraexportalasat, de a statuszgep ezt a masodik exportnal 400-as hibaval megallitja. Ez user oldalon inkonzisztens export viselkedest okoz, es a berszamfejtoi workflow-ban ujrageneralasi hibat eredmenyezhet.
Recommended fix:
Dontsd el az elvart mukodest: ha ujraexportalas engedelyezett, akkor `csv_letoltve` statusznal ne hivjon uj statusztranziciot, csak audit/export history rekord keszuljon. Ha nem engedelyezett, az endpoint mar a bemeneti ellenorzesnel tiltsa a `csv_letoltve` statuszt egyertelmu hibauzenettel.
Verification step:
Exportalj egyszer egy `elkuldve` rekordot, majd ugyanazt a rekordot probald ujra exportalni `csv_letoltve` statuszban. Elvart eredmeny a javitott dontes szerint: vagy sikeres ujraexport, vagy kovetkezetes, korai validacios hiba.
Status: FIXED
Fixed in: backend/app/services/entry_service.py (mark_csv_downloaded csak elkuldve statusznal valt)
Fix date: 2026-05-31
