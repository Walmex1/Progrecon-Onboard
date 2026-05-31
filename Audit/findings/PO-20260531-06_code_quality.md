## Finding ID: PO-20260531-025
Severity: Critical
Area: Security / authentication
Affected files:
- `backend/app/schemas/auth.py`
- `backend/app/routers/auth.py`
- `backend/app/core/security.py`
Evidence:
- `backend/app/schemas/auth.py:5-7` - `LoginRequest` csak `username: str` mezot tartalmaz, `password` mezot nem.
- `backend/app/routers/auth.py:13-21` - a `login()` csak username alapjan betolti a usert, majd tokent general.
- `backend/app/core/security.py:11-12` - a `verify_password()` letezik, de `backend/app/routers/auth.py` nem importalja es nem hivja.
Risk:
Barki be tud jelentkezni barmely letezo felhasznalonevvel, mert a backend nem ker es nem ellenoriz jelszot. Ez teljes authentikacio bypass.
Recommended fix:
Add hozza a `password: str` mezot a `LoginRequest` semahoz, es a login folyamatban hivd meg a `verify_password(body.password, user.password_hash)` ellenorzest. Hibara token nelkuli `401 Unauthorized` valaszt adj.
Verification step:
Letezo userrel, hibas jelszoval hivd a `POST /auth/login` endpointot. Elvart eredmeny: `401`, token nelkul.

## Finding ID: PO-20260531-026
Severity: High
Area: Security / JWT configuration
Affected files:
- `backend/app/core/config.py`
- `backend/app/core/security.py`
Evidence:
- `backend/app/core/config.py:6` - a `SECRET_KEY` default erteke `"change-this-in-production"`.
- `backend/app/core/config.py:8` - `ACCESS_TOKEN_EXPIRE_HOURS: int = 175200`, ami 20 ev.
- `backend/app/core/security.py:14-21` - a JWT lejarta es alairasa ezekbol a beallitasokbol keszul.
Risk:
Ha eles kornyezetben a default secret marad, JWT tokenek hamisithatok. A 20 eves token elettartam miatt egy kiszivargott token gyakorlatilag visszavonas nelkul hosszu ideig ervenyes marad.
Recommended fix:
Eles inditaskor legyen kotelezo nem-default `SECRET_KEY`; default fejlesztoi ertek mellett az app inkabb fail-fast modon induljon el production konfiguracioban. Csokkentsd a token elettartamot uzletileg indokolhato idore, es dokumentald a refresh/login strategiat.
Verification step:
Inditsd az appot `.env` nelkuli production konfiguracioval. Elvart eredmeny: hiba a default secret miatt. Ellenorizd, hogy az uj token `exp` erteke nem evekben merheto.

## Finding ID: PO-20260531-027
Severity: Medium
Area: Database configuration / PostgreSQL migration readiness
Affected files:
- `backend/app/database.py`
- `backend/app/core/config.py`
Evidence:
- `backend/app/core/config.py:5` - a default `DATABASE_URL` SQLite URL.
- `backend/app/database.py:6-9` - a `create_engine()` mindig `connect_args={"check_same_thread": False}` parametert kap.
Risk:
A `check_same_thread` SQLite-specifikus opcio. PostgreSQL migracional ez a hardcode beallitas hibas engine inicializaciot vagy konfiguracios zavart okozhat.
Recommended fix:
Csak SQLite URL eseten add at a `check_same_thread` connect_argot. PostgreSQL eseten kulon engine opciokat hasznalj.
Verification step:
Allits be PostgreSQL `DATABASE_URL`-t es inditsd az appot. Elvart eredmeny: engine letrejon SQLite-specifikus connect_arg nelkul.

## Finding ID: PO-20260531-028
Severity: Medium
Area: Code duplication / date parsing
Affected files:
- `backend/app/services/entry_service.py`
- `backend/app/services/employee_import.py`
Evidence:
- `backend/app/services/entry_service.py:125-134` - sajat `_parse_date()` implementacio van a lezaro triggerhez.
- `backend/app/services/employee_import.py:68-80` - kulon `_parse_date()` implementacio van az employee importhoz.
Risk:
Ket kulon datumatalkito logika elterhet egymastol, es egy jovobeli javitas csak az egyik helyre kerulhet be. Ez adatkonverzios edge-case-eknel nehezen kovetheto hibakat okozhat.
Recommended fix:
Emeld ki kozos utility modulba a datumparse logikat, es mindket service ugyanazt hasznalja. Tegyel ra celzott unit teszteket `date`, ISO string, pontozott datum es hibas datum inputokra.
Verification step:
Futtass kozos parse_date teszteket mindket jelenlegi hasznalati esetre. Elvart eredmeny: azonos parse eredmeny importban es close triggerben.

Status: FIXED
Fixed in: backend/app/utils/date_utils.py (uj kozos modul), backend/app/services/entry_service.py, backend/app/services/employee_import.py
Fix date: 2026-05-31

## Finding ID: PO-20260531-029
Severity: Medium
Area: Validation / munkaido mapping
Affected files:
- `backend/app/services/csv_generator.py`
- `frontend/src/constants/options.js`
Evidence:
- `backend/app/services/csv_generator.py:10-15` - a `MUNKAIDO_SZABALY` csak `"2"`, `"4"`, `"6"`, `"8"` kulcsokat tartalmaz.
- `backend/app/services/csv_generator.py:31-32` - nem ismert munkaido eseten a generator `MUNKAIDO_SZABALY["8"]` fallbacket hasznal.
- `frontend/src/constants/options.js:30-38` - a frontend 1-8 ora kozott minden opciot enged.
Risk:
1, 3, 5 vagy 7 oras munkaido eseten a CSV generator 8 oras szabalyra esik vissza, es uresen hagyhat reszmunkaidos NBTorzs mezoket.
Recommended fix:
Vagy szukitsd a frontend opciokat 2/4/6/8-ra, vagy bovitsd a backend mappinget minden engedelyezett orara. Ismeretlen munkaido ne essen csendben 8 oras fallbackre, hanem validacios hibat adjon.
Verification step:
Generalj CSV-t `munkaido_napi_ora = "3"` adattal. Elvart eredmeny: explicit validacios hiba vagy jovahagyott 3 oras NBTorzs/108 es NBTorzs/168 ertek.

Status: FIXED
Fixed in: frontend/src/constants/options.js (MUNKAIDO_OPTIONS szukitve 2/4/6/8-ra)
Fix date: 2026-05-31

## Finding ID: PO-20260531-030
Severity: Medium
Area: Validation parity / backend vs frontend
Affected files:
- `backend/app/services/validator.py`
- `frontend/src/hooks/useEntryValidation.js`
- `frontend/src/hooks/useEntryForm.js`
Evidence:
- `backend/app/services/validator.py:116-121` - backend csak `szuletesi_datum` esetben parse-ol datumot, es hibas formatumra ott ad hibat.
- `backend/app/services/validator.py:77-90` - `jogviszony_kezdete` kotelezo, de formatumellenorzes nincs ra.
- `frontend/src/hooks/useEntryValidation.js:46-48` - frontend `jogviszony_kezdete` es `jogviszony_vege` mezokre regex formatumellenorzest vegez.
- `backend/app/services/validator.py:131-145` - backend munkaido/foglalkozasi viszony keresztvalidaciot vegez.
- `frontend/src/hooks/useEntryValidation.js:1-55` - frontend field validatorban nincs munkaido/foglalkozasi viszony keresztvalidacio; ezt csak opcioszures segiti a `useEntryForm.js:187-191` reszen.
Risk:
A frontend es backend validacios szerzodes nem teljesen azonos. API-n vagy autosave-en keresztul hibas `jogviszony_kezdete` formatum bekerulhet, illetve frontend allapotvaltozasnal nem ugyanaz a mezoszintu hiba jelenik meg, mint backend exportnal.
Recommended fix:
Backend oldalon ellenorizd a `jogviszony_kezdete` es `jogviszony_vege` ISO formatumat. Frontenden legyen explicit munkaido/foglalkozasi viszony validacio is, nem csak opcioszures.
Verification step:
Kuldj exportot `jogviszony_kezdete = "2026/06/01"` adattal. Elvart eredmeny: backend `400` validacios hiba. Frontenden valassz/allitgass munkaido es foglalkozasi viszony parost, es elvart mezoszintu hibaval jelezzen.

Status: FIXED
Fixed in: frontend/src/hooks/useEntryValidation.js (munkaido/foglalkozasi viszony keresztvalidacio hozzaadva)
Fix date: 2026-05-31

## Finding ID: PO-20260531-031
Severity: Medium
Area: Schema contract / EntryRecord
Affected files:
- `backend/app/schemas/entry_record.py`
- `backend/app/models/entry_record.py`
- `frontend/src/hooks/useEntryForm.js`
Evidence:
- `backend/app/schemas/entry_record.py:5-8` - `EntryRecordCreate.cost_center_id` kotelezo `int`.
- `frontend/src/hooks/useEntryForm.js:132-135` - frontend draft create `cost_center_id: null` payloadot kuld.
- `backend/app/models/entry_record.py:12-14` - modellben van `employee_id`, `created_by`, `cost_center_id`.
- `backend/app/schemas/entry_record.py:13-21` - `EntryRecordResponse` csak `cost_center_id`-t ad vissza, `employee_id` es `created_by` nincs benne.
Risk:
A draft create szerzodes frontend/backend kozott 422-t okozhat. A response sema kevesebb kapcsolatmezot ad vissza, mint amit a modell tartalmaz, ami kesobbi audit UI vagy debug workflow eseteben neheziti a nyomkovetest.
Recommended fix:
Dontsd el a draft letrehozas szerzodeset: nullable cost center vagy frontend oldali kesleltetett create. Az `employee_id`/`created_by` mezoket vagy add vissza a response-ban, vagy dokumentald, hogy szandekosan rejtettek.
Verification step:
Hivd meg `POST /entries/` endpointot `cost_center_id: null` payload-dal. Elvart eredmeny a vegleges szerzodes szerint: vagy 201 draft, vagy frontend altal kezelt/lathato validacios hiba.

## Finding ID: PO-20260531-032
Severity: Low
Area: Test maintenance / stale E2E architecture
Affected files:
- `frontend/e2e/belep_workflow.spec.js`
- `backend/app/schemas/users.py`
- `backend/app/routers/users.py`
Evidence:
- `frontend/e2e/belep_workflow.spec.js:41-69` - az E2E `ensureUser()` `cost_center_ids` tombot kuld create/update payloadban.
- `frontend/e2e/belep_workflow.spec.js:49-55` - letezo usernel `existing.cost_centers` mezot var.
- `backend/app/schemas/users.py:23-28` - `UserCreate` csak `username`, `password`, `role`, `region`, `person` mezoket definial; `cost_center_ids` nincs.
- `backend/app/routers/users.py:52-53` es `backend/app/routers/users.py:90-91` - PV role-hoz `region` kotelezo.
Risk:
Az E2E teszt a regi costCenterIds architekturara epul, ezert a mai backend szerzodessel varhatoan elhasal vagy hamis jelzest ad. Ez csokkenti a release elotti workflow tesztek megbizhatosagat.
Recommended fix:
Frissitsd az E2E tesztet region-alapu PV jogosultsagra: `region` mezot kuldjon, `cost_centers`/`cost_center_ids` varakozasokat tavolitsa el.
Verification step:
Futtasd `npm run test:e2e` a frontend mappabol. Elvart eredmeny: a user setup a jelenlegi `/admin/users/` API szerzodessel megy at.

## Finding ID: PO-20260531-033
Severity: Low
Area: Test dependencies / backend pytest
Affected files:
- `backend/requirements.txt`
- `backend/tests/test_submit_auth.py`
- `backend/tests/test_employee_import.py`
- `backend/tests/test_csv_export.py`
Evidence:
- `backend/tests/test_submit_auth.py:10`, `backend/tests/test_employee_import.py:13`, `backend/tests/test_csv_export.py:12` - a backend tesztek `pytest`-et importalnak.
- `backend/requirements.txt:1-10` - a backend dependency lista nem tartalmaz `pytest` csomagot.
Risk:
Friss backend kornyezetben a tesztek nem futtathatok a megadott requirements alapjan, ami csokkenti az audit/release reprodukalhatosagat.
Recommended fix:
Adj kulon dev/test requirements fajlt vagy vedd fel a pytestet a fejlesztoi dependency listaba. Dokumentald a backend tesztfuttatas parancsat.
Verification step:
Tiszta virtualenvben telepitsd a `backend/requirements.txt`-t, majd futtasd a backend pytesteket. Elvart eredmeny: nincs `ModuleNotFoundError: pytest`.

Status: FIXED
Fixed in: backend/requirements.txt (pytest>=8.0.0, httpx>=0.27.0 hozzaadva)
Fix date: 2026-05-31

## Finding ID: PO-20260531-034
Severity: Low
Area: Migration scripts / obsolete and destructive utility
Affected files:
- `backend/migrate_cost_centers.py`
- `backend/migrate_region.py`
- `backend/seed.py`
Evidence:
- `backend/migrate_cost_centers.py:1-4` - a fajl explicit obsolete no-opkent jeloli magat.
- `backend/migrate_region.py:29-34` - a script kozvetlenul `ALTER TABLE users ADD COLUMN region VARCHAR` muveletet vegez.
- `backend/migrate_region.py:38-43` - ha letezik, `DROP TABLE user_cost_centers` muveletet futtat.
- `AGENTS.md` szerint a `seed.py` mar kezeli a `person_id` es `region` auto-migrationt.
Risk:
Obsolete vagy reszben kivaltott migracios scriptek a repoban maradva veletlen futtatasnal destruktiv adatbazis-muveletet okozhatnak, kulonosen a `DROP TABLE user_cost_centers` miatt.
Recommended fix:
Archivalt/migracios dokumentacioba tedd at vagy egyertelmuen zard le ezeket a scripteket. Destruktiv muvelet csak explicit megerositessel vagy migracios toolon keresztul fusson.
Verification step:
Ellenorizd, hogy az eles/fejlesztoi runbook nem hivatkozik a regi migracios scriptekre, es a region/person migrationt egyetlen karbantartott folyamat kezeli.
Status: FIXED
Fixed in: backend/migrate_cost_centers.py (torolve), backend/migrate_region.py (archivalt, DROP TABLE eltavolitva)
Fix date: 2026-05-31
