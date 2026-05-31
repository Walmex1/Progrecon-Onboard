## Finding ID: PO-20260531-005
Severity: Medium
Area: CSV generator / NBTorzs oszlopszam
Affected files:
- `backend/app/services/csv_generator.py`
- `context_workflow.md`
Evidence:
- `backend/app/services/csv_generator.py:27` - a komment szerint `NBTorzs.csv (52 oszlop)`.
- `backend/app/services/csv_generator.py:34` - a kod `row = [""] * 169` tombot hoz letre 1-alapu indexeleshez.
- `backend/app/services/csv_generator.py:100` - a komment szerint `return row[1:]  # 1-tol 52-ig`, de a `row[1:]` valojaban 168 elemet ad vissza.
- `backend/app/services/csv_generator.py:173-174` - a header `[str(i) for i in range(1, 169)]`, tehat 168 fejlec oszlop.
- `context_workflow.md:120-122` - a dokumentacio tablazata az `NBTorzs.csv` oszlopszamat 52-kent jeloli.
Risk:
A kod 168 oszlopos NBTorzs fajlt general, mikozben a kommentek/dokumentacio 52 oszlopot is emlitenek. Ha a Nexon import valojaban 52 oszlopot var, az import hibas lehet; ha 168-at var, a dokumentacio felrevezeto es hibas javitasokhoz vezethet.
Recommended fix:
Tisztazni kell a megrendeloi/Nexon specifikaciot. A kodkommenteket es dokumentaciot egyertelmuen igazitsd a vegleges oszlopszamhoz, es adj tesztet az NBTorzs header es adat sor pontos elemszamara.
Verification step:
Futtass CSV generator unit tesztet, amely ellenorzi: `len(header) == len(row) == vegleges_elvart_oszlopszam`, es a dokumentacio ugyanazt az oszlopszamot tartalmazza.

## Finding ID: PO-20260531-006
Severity: High
Area: CSV generator / munkaido szabaly
Affected files:
- `backend/app/services/csv_generator.py`
- `frontend/src/constants/options.js`
- `fields_context.md`
Evidence:
- `frontend/src/constants/options.js:30-38` - a frontend `MUNKAIDO_OPTIONS` 1-8 ora kozt minden erteket enged.
- `backend/app/services/csv_generator.py:10-15` - a `MUNKAIDO_SZABALY` csak `"2"`, `"4"`, `"6"`, `"8"` kulcsokat tartalmaz.
- `backend/app/services/csv_generator.py:31-32` - ismeretlen munkaido esetén a kod `MUNKAIDO_SZABALY["8"]` fallbacket hasznal.
- `backend/app/services/csv_generator.py:96-98` - a fallback eredmenye kerul az NBTorzs 108. es 168. oszlopaba.
- `fields_context.md:122-129` - dokumentalt CSV munkaido szabaly csak 2/4/6/8 orara ad NBTorzs/168 es NBTorzs/108 ertekeket.
Risk:
Ha PV 1, 3, 5 vagy 7 oras munkaidot valaszt, a CSV generator 8 oras fallbacket hasznal, vagyis a 108. es 168. oszlop ures marad. Ez reszmunkaidos dolgozonal hibas NBTorzs adatot es Nexon import/beradminisztracios hibat okozhat.
Recommended fix:
Vagy tiltsd a frontendben/validacioban az 1/3/5/7 oras opciokat, vagy bovitsd a `MUNKAIDO_SZABALY` mappinget minden engedelyezett orara. Ismeretlen munkaido ne essen csendben 8 oras fallbackre, hanem adjon validacios hibat export elott.
Verification step:
Export elott probalj `munkaido_napi_ora = "3"` adattal validalni/generalni. Elvart eredmeny: vagy egyertelmu validacios hiba, vagy a 108. es 168. oszlop a jovahagyott 3 oras szabaly szerint toltodik.

Status: FIXED
Fixed in: frontend/src/constants/options.js (MUNKAIDO_OPTIONS szukitve 2/4/6/8-ra)
Fix date: 2026-05-31

## Finding ID: PO-20260531-007
Severity: Medium
Area: CSV generator / NBTorzs divizio kezdete
Affected files:
- `backend/app/services/csv_generator.py`
- `fields_context.md`
Evidence:
- `fields_context.md:74-75` - a Divizio allando `9999`, a Divizio kezdete pedig auto mezokent `NBTorzs/103`, de tisztazando szaballyal szerepel.
- `backend/app/services/csv_generator.py:91-94` - a generator kitolti `row[102] = "9999"`, de a `row[103]` nincs kitoltve, csak komment jelzi, hogy a szabaly tisztazando.
- `backend/app/services/csv_generator.py:100` - a kitoltetlen `row[103]` az exportalt sor resze marad.
Risk:
Az NBTorzs 103. oszlopa uresen kerul exportba. Ha a Nexon a Divizio kezdete mezot keri, az import elutasitast vagy hibas torzsadatot okozhat.
Recommended fix:
Tisztazni kell a 103. oszlop szabalyat. Ha a tobbi kezdodatumhoz hasonloan a jogviszony kezdete az elvart ertek, akkor allitsd `row[103] = jk`; ha valoban uresen kell maradnia, ezt dokumentald explicit modon es teszteld.
Verification step:
Generalj NBTorzs sort teljes belepo adattal, es ellenorizd a 103. oszlopot a vegleges specifikacio szerint: vagy `jogviszony_kezdete`, vagy dokumentaltan ures.

## Finding ID: PO-20260531-008
Severity: High
Area: Export validation / kotelezo CSV mezok
Affected files:
- `backend/app/services/validator.py`
- `backend/app/services/csv_generator.py`
- `fields_context.md`
- `backend/app/routers/export.py`
Evidence:
- `backend/app/routers/export.py:34-39` - export elott lefut a `validate_entry_form(entry.form_data)`, majd csak hiba nelkul indul a CSV generalas.
- `backend/app/services/validator.py:77-90` - a kotelezo mezok listaja csak nehany mezot tartalmaz, peldaul nincs benne `szuletesi_nev`, `anyja_neve`, `szuletesi_hely`, `neme`, `allampolgarsag`, `lakcim_orszag`, `lakcim_kozterulet_jellege`, `foglalkozasi_viszony`, `berezesi_mod`, `feor`, `munkakor`.
- `fields_context.md:17-24` - tobb szemelyes adat mezot kotelezokent jelol, amelyek NBTorzs oszlopokba kerulnek.
- `fields_context.md:33-37` es `fields_context.md:64-66` - lakcim, foglalkozasi viszony, munkaido es berezesi mod mezok is kotelezokent szerepelnek.
- `backend/app/services/csv_generator.py:17-18` - hianyzo mezonel `_val()` ures stringet ad.
- `backend/app/services/csv_generator.py:42-47`, `backend/app/services/csv_generator.py:49-52`, `backend/app/services/csv_generator.py:79-90` - ezek a mezok kozvetlenul NBTorzs oszlopokba irodnak, validacios kotelezettseg nelkul.
Risk:
Export sikeresen lefuthat ugy, hogy tobb specifikacio szerint kotelezo NBTorzs mezo ures stringkent kerul a CSV-be. Ez hibas torzsadatot vagy Nexon import hibat okozhat, mikozben a user nem kap korai, mezoszintu hibajelzest.
Recommended fix:
Igazitsd a backend `REQUIRED_FIELDS` listat a `fields_context.md` kotelezo mezoihez es a CSV generator altal hasznalt kritikus oszlopokhoz. A kotelezo mezok hianyat export elott 400-as validacios hibaval kell megallitani.
Verification step:
Kuldj exportot olyan `form_data`-val, amelybol peldaul `anyja_neve`, `neme` vagy `foglalkozasi_viszony` hianyzik. Elvart eredmeny: `400` validacios hiba, CSV generalas nelkul.

Status: FIXED
Fixed in: backend/app/services/validator.py (REQUIRED_FIELDS kibovitve)
Fix date: 2026-05-31

## Finding ID: PO-20260531-009
Severity: Low
Area: Export API / single CSV branch
Affected files:
- `backend/app/services/csv_generator.py`
- `backend/app/routers/export.py`
- `backend/app/services/validator.py`
Evidence:
- `backend/app/services/csv_generator.py:173-180` - a `generate_csvs_for_entry()` mindig letrehozza az `NBTorzs.csv`, `NBJuttat.csv` es `NBLevon.csv` fajlokat.
- `backend/app/services/csv_generator.py:182-185` - csak a `NBSZEPKAdat.csv` felteteles, a masik harom nem.
- `backend/app/routers/export.py:67-74` - az export router tartalmaz `len(csvs) == 1` agat, amely sima CSV-t adna vissza ZIP helyett.
- `backend/app/services/validator.py:84-85` - a `besorolasi_ber` es `bankszamlaszam` kotelezo, tehat az export validacio sem tamogatja a csak NBTorzs jellegu esetet.
Risk:
A dokumentalt "egyetlen CSV eseten sima CSV" viselkedes a jelenlegi generator mellett gyakorlatilag nem erheto el, mert legalabb harom CSV mindig keszul. Ez nem kozvetlen adatvesztes, de felrevezeto API-viselkedeshez es hibas tesztelvarasokhoz vezethet.
Recommended fix:
Ha a belépő exportnak mindig ZIP-et kell adnia, tavolitsd vagy dokumentald dead branchkent az egy CSV agat. Ha bizonyos rekordtipusoknal tenyleg csak NBTorzs kell, akkor a generator kapjon rekordtipus/feltetel alapu logikat, es a validacio is igazodjon ehhez.
Verification step:
Futtass exportot minimalis, valid belepo adattal. Elvart eredmeny a jelenlegi kod szerint: ZIP legalabb `NBTorzs.csv`, `NBJuttat.csv`, `NBLevon.csv` fajlokkal; sima CSV csak akkor, ha a generator valoban egy fajlt ad vissza.
