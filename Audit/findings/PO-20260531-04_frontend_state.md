## Finding ID: PO-20260531-014
Severity: High
Area: Frontend state / ensureEntry autosave
Affected files:
- `frontend/src/hooks/useEntryForm.js`
- `frontend/src/api/client.js`
- `backend/app/schemas/entry_record.py`
Evidence:
- `frontend/src/hooks/useEntryForm.js:128-145` - az `ensureEntry()` uj rekordot hoz letre `POST /entries/` hivassal.
- `frontend/src/hooks/useEntryForm.js:132-135` - a payload `cost_center_id: null` erteket kuld.
- `backend/app/schemas/entry_record.py:5-8` - az `EntryRecordCreate.cost_center_id` tipusa `int`, nem optional.
- `frontend/src/hooks/useEntryForm.js:159-160` - az `onBlur()` meghivja az `ensureEntry()` fuggvenyt, de nem awaiteli es nem kezeli a hibat.
- `frontend/src/api/client.js:26-31` - 422 eseten a toast elnyelodik, ha az URL tartalmazza az `/entries/` reszt es a method `post`.
Risk:
Az elso mezobol valo kilepeskor a draft rekord letrehozasa 422-re futhat a `null` cost center miatt. Mivel az `onBlur()` nem kezeli a Promise hibajat es az interceptor is elnyeli az `/entries/` POST 422 toastot, a user csendben nem kap rekordot, az autosave nem indul el, es az adatvesztes kockazata magas.
Recommended fix:
Ne kuldj `cost_center_id: null` erteket olyan backend semahoz, amely `int`-et var. Vagy tedd a backend semat nullable-va a draft-letrehozasi workflowhoz, vagy halaszd a rekordletrehozast addig, amig van valid cost center. Az `ensureEntry()` hibajat az `onBlur()` es a submit flow is kezelje lathato hibauzenettel.
Verification step:
PV-kent nyisd meg az uj belepo oldalt, tolts ki egy mezot, majd blur. Elvart eredmeny: vagy sikeres draft letrehozas es URL `/belepok/{id}`, vagy lathato hibauzenet; nem lehet csendes 422.

## Finding ID: PO-20260531-015
Severity: High
Area: Toast interceptor / 422 handling
Affected files:
- `frontend/src/api/client.js`
- `frontend/src/hooks/useEntryForm.js`
Evidence:
- `frontend/src/api/client.js:26-31` - a 422 toast feltetele `if (!(url.includes("/entries/") && method === "post"))`, vagyis minden `/entries/` URL-t tartalmazo POST 422-t kizart.
- `frontend/src/hooks/useEntryForm.js:132-135` - a `POST /entries/` create hivas is ebbe a kizart korbe esik.
- `frontend/src/hooks/useEntryForm.js:198-207` - a submit validacios hibak kulon kezelve vannak, de ez a specialis kezeles csak a `handleSubmit()` catch agakban fut.
Risk:
Az interceptor nem csak a submit validacios 422-t nem toastolja, hanem a draft create es barmely jovobeli `/entries/{id}/...` POST 422 hibajat is. Ha ezeknek nincs sajat catch aga, a user nem kap ertheto visszajelzest.
Recommended fix:
Szukkitsd a kivetelt a tenylegesen sajat kezelesu endpointokra, peldaul csak `POST /entries/{id}/submit` validacios hibajara, vagy jelolj meg konfiguracios flaggel olyan requesteket, amelyeknel az interceptor ne toastoljon. A `POST /entries/` create 422-re legyen lathato hiba.
Verification step:
Mockolj vagy idezz elo 422 valaszt `POST /entries/` hivasra. Elvart eredmeny: lathato toast vagy mezoszintu hiba, nem csendes Promise rejection.

## Finding ID: PO-20260531-016
Severity: Medium
Area: Frontend validation / SZEP-kartya optional step
Affected files:
- `frontend/src/hooks/useEntryForm.js`
- `frontend/src/pages/NewEntry.jsx`
- `backend/app/services/entry_service.py`
Evidence:
- `frontend/src/hooks/useEntryForm.js:168-172` - a `szepAnyFilled` igaz, ha barmelyik SZEP mezoben van ertek.
- `frontend/src/hooks/useEntryForm.js:23-39` - a `STEP_REQUIRED_FIELDS[5]` tartalmazza a harom SZEP mezot.
- `frontend/src/hooks/useEntryForm.js:182-184` - az `isStepComplete(5)` csak a stepper allapotat szamolja, nem a submit engedelyezeset.
- `frontend/src/hooks/useEntryForm.js:174-176` - az `isFormComplete` csak a `REQUIRED_TEXT_FIELDS` es `REQUIRED_SELECT_FIELDS` listakat nezi, ezekben nincs SZEP mezo.
- `frontend/src/pages/NewEntry.jsx:511-514` - az elkuldes gomb csak `!isFormComplete` alapjan tiltott.
- `backend/app/services/entry_service.py:98-108` - a submit backend oldalon statustranziciot vegez, de nem futtat SZEP keresztvalidaciot.
Risk:
Ha a user kitolt egy SZEP mezot, de a masik ketto ures marad, a stepper jelezhet hianyossagot, de a submit gomb tovabbra is engedelyezett lehet. A rekord bekuldheto, es a hiba csak kesobb, CSV exportnal derul ki, ami frontend-backend allapoteltetest es berszamfejtesi workflow fennakadast okozhat.
Recommended fix:
Ha `szepAnyFilled` igaz, akkor a harom SZEP mezot vond be az `isFormComplete` ellenorzesbe is, vagy submit elott futtass explicit teljes form validaciot. A backend submit endpointon is erdemes ugyanazt a keresztvalidaciot futtatni, mint export elott.
Verification step:
Tolts ki csak `szep_kartya_szam` mezot, a kibocsatot es kedvezmenyezettet hagyd uresen. Elvart eredmeny: az elkuldes gomb tiltott, vagy submitkor mezoszintu hiba jelenik meg.

Status: FIXED
Fixed in: frontend/src/hooks/useEntryForm.js (szepValid feltetel az isFormComplete-ben)
Fix date: 2026-05-31

## Finding ID: PO-20260531-017
Severity: Medium
Area: Options / Nexon dictionary placeholders
Affected files:
- `frontend/src/constants/options.js`
- `frontend/src/pages/NewEntry.jsx`
- `backend/app/services/csv_generator.py`
Evidence:
- `frontend/src/constants/options.js:59-60` - a komment szerint a Nexon szotarak placeholder ertekek, vegleges kodok hianyoznak.
- `frontend/src/constants/options.js:61-72` - az `ALLAMPOLGARSAG_OPTIONS` ISO-szeru kodokat hasznal (`HU`, `SK`, `RO`, `OTHER`).
- `frontend/src/constants/options.js:74-89` - az `ORSZAG_OPTIONS` szinten ISO-szeru/placeholder kodokat hasznal.
- `frontend/src/constants/options.js:91-93` - a `MUNKAKOR_OPTIONS` csak egy `OPERATOR` placeholder opciot tartalmaz.
- `frontend/src/pages/NewEntry.jsx:270`, `frontend/src/pages/NewEntry.jsx:285` es `frontend/src/pages/NewEntry.jsx:407` - ezek az opciok kerulnek a formba.
- `backend/app/services/csv_generator.py:47`, `backend/app/services/csv_generator.py:49` es `backend/app/services/csv_generator.py:89` - a form ertekek kozvetlenul NBTorzs oszlopokba irodnak.
Risk:
A user olyan placeholder kodokat valaszthat, amelyek kozvetlenul bekerulnek az export CSV-be. Ha ezek nem Nexon kodok, a CSV import hibas vagy elutasitott lehet.
Recommended fix:
Csereld a placeholder listakat vegleges Nexon kodokra, vagy tiltsd az eles CSV exportot addig, amig ezek nincsenek jovahagyva. Adj tesztet arra, hogy a kivalaszthato value-k megfelelnek a Nexon szotaroknak.
Verification step:
Generalj NBTorzs CSV-t magyar allampolgarsaggal, magyar lakcim orszaggal es munkakorrel. Elvart eredmeny: az oszlopokban vegleges Nexon kodok vannak, nem placeholder `HU` / `OPERATOR` ertekek.

## Finding ID: PO-20260531-018
Severity: Medium
Area: Payroll frontend state / admin status filtering
Affected files:
- `frontend/src/pages/Payroll.jsx`
- `frontend/src/components/Sidebar.jsx`
- `backend/app/services/entry_service.py`
- `backend/app/routers/export.py`
Evidence:
- `frontend/src/components/Sidebar.jsx:50-53` - admin szerepkor eseten a menu tartalmazza a berszamfejtesi menut is.
- `frontend/src/pages/Payroll.jsx:36-39` - a Payroll oldal minden belepo rekordot leker `GET /entries/` hivasbol, status filter nelkul.
- `frontend/src/pages/Payroll.jsx:101-102` - `waiting` csak `elkuldve`, a `done` pedig minden nem `elkuldve` statuszu rekord, igy adminnal `folyamatban` rekord is a letoltesi elozmenyek koze kerulhet.
- `backend/app/services/entry_service.py:28-29` - backend csak `berszamfejto` usernel szuri ki a `folyamatban` rekordokat; adminnal nem.
- `backend/app/routers/export.py:31-32` - CSV csak `elkuldve` vagy `csv_letoltve` statuszu rekordhoz generalhato.
Risk:
Admin nezetben a Payroll oldal a `folyamatban` rekordokat is letoltesi elozmenykent jelenitheti meg, es ezeknel ujra letoltes gomb jelenik meg. A kattintas backend 400 hibara fut, ami zavaro es frontend-backend allapoteltetest okoz.
Recommended fix:
A Payroll oldalon kliens oldalon is csak `elkuldve`, `csv_letoltve`, `lezarva` statuszokat jelenits meg, vagy a backend listahivashoz hasznalj megfelelo status filtert. A `done` lista ne tartalmazzon `folyamatban` rekordot.
Verification step:
Adminnal nyisd meg a Payroll oldalt ugy, hogy van `folyamatban` belepo rekord. Elvart eredmeny: a folyamatban rekord nem jelenik meg letoltesi elozmenykent es nincs rajta CSV letoltes gomb.
Status: FIXED
Fixed in: frontend/src/pages/Payroll.jsx (done lista szukitve csv_letoltve es lezarva statuszokra)
Fix date: 2026-05-31
