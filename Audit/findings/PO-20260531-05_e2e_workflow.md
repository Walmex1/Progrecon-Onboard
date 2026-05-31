## Finding ID: PO-20260531-019
Severity: High
Area: E2E workflow / close_entry employee trigger
Affected files:
- `backend/app/services/entry_service.py`
- `backend/tests/test_submit_auth.py`
- `backend/app/services/validator.py`
Evidence:
- `backend/app/services/entry_service.py:137-144` - a `close_entry()` eloszor `lezarva` statuszra valt, majd `tax_id = form_data.get("adoazonosito")`; ha nincs `tax_id`, az employee trigger blokk nem fut.
- `backend/app/services/entry_service.py:181-183` - a kod ezutan megis audit logot ir, commitol es visszaadja a lezart rekordot.
- `backend/tests/test_submit_auth.py:168-187` - a `test_berszamfejto_can_close_entry` `form_data={}` mellett is 200-at es `lezarva` statuszt var.
- `backend/app/services/validator.py:77-83` - export validacio szerint az `adoazonosito` kotelezo mezo, de a close endpoint nem futtat validaciot.
Risk:
Egy rekord lezart allapotba kerulhet ugy, hogy BELÉPŐ eseten nem jon letre Employee rekord, KILÉPŐ/MÓDOSÍTÁS eseten pedig nem tortenik torzsvaltozas. Ez E2E workflow szinten azt jelenti, hogy a statusz vegallapotba jut, de az employees tabla nem tukrozi a lezart folyamatot.
Recommended fix:
Close elott ellenorizni kell a lezáráshoz szukseges minimum adatokat, kulonosen az `adoazonosito` mezot. Ha hianyzik, a close adjon 400-as hibat, es ne valtsa `lezarva` statuszra a rekordot. Erdemes a close elott ugyanazt vagy egy celzott subset validaciot futtatni, mint export elott.
Verification step:
Hozz letre `csv_letoltve` statuszu BELÉPŐ rekordot ures vagy `adoazonosito` nelkuli `form_data`-val, majd hivd `POST /entries/{id}/close`. Elvart eredmeny: 400 hiba, statusz nem `lezarva`, Employee rekord nem marad el csendben.

Status: FIXED
Fixed in: backend/app/services/entry_service.py (adoazonosito ellenorzes close elott)
Fix date: 2026-05-31

## Finding ID: PO-20260531-020
Severity: Medium
Area: E2E workflow / Employee törzsadat lezáráskor
Affected files:
- `backend/app/services/entry_service.py`
- `backend/app/models/employee.py`
- `backend/app/services/employee_import.py`
Evidence:
- `backend/app/models/employee.py:13-20` - az Employee modell tartalmazza a `birth_date`, `taj`, `trunk_number`, `birth_place`, `mothers_name`, `birth_name`, `gender`, `cost_center_id` mezoket.
- `backend/app/services/entry_service.py:147-157` - BELÉPŐ + uj `tax_id` eseten az Employee letrehozasa csak `tax_id`, `last_name`, `first_name`, `birth_date`, `taj`, `trunk_number`, `cost_center_id` mezoket tolti.
- `backend/app/services/employee_import.py:247-250` - az import szolgaltatas ugyanennek az Employee torzsnek be tudja tolteni a `birth_place`, `mothers_name`, `birth_name`, `gender` mezoket.
Risk:
Ha a munkavallalo torzs a lezart belépő folyamatbol jon letre, a szuletesi hely, anyja neve, szuletesi nev es nem mezok uresen maradnak, mikozben az import utvonal ezeket kezeli. A letszamstatisztika helyes lehet, de a munkavallaloi torzsadat hianyos lesz.
Recommended fix:
A `close_entry()` BELÉPŐ agaban az Employee letrehozasakor toltsd a `birth_place`, `mothers_name`, `birth_name`, `gender` mezoket is a `form_data` megfelelo kulcsaibol.
Verification step:
Zarj le egy teljes form_data-val rendelkezo BELÉPŐ rekordot, majd olvasd vissza az Employee rekordot. Elvart eredmeny: `birth_place`, `mothers_name`, `birth_name`, `gender` is ki van toltve.

Status: FIXED
Fixed in: backend/app/services/entry_service.py (birth_place, mothers_name, birth_name, gender hozzaadva)
Fix date: 2026-05-31

## Finding ID: PO-20260531-021
Severity: Medium
Area: E2E workflow / record creation contract
Affected files:
- `backend/app/schemas/entry_record.py`
- `backend/app/routers/entry.py`
- `frontend/src/hooks/useEntryForm.js`
Evidence:
- `backend/app/schemas/entry_record.py:5-8` - az `EntryRecordCreate.cost_center_id` kotelezo `int`.
- `backend/app/routers/entry.py:29-35` - a create endpoint ezt a semat hasznalja, es `body.cost_center_id` erteket adja tovabb a service-nek.
- `frontend/src/hooks/useEntryForm.js:132-135` - a frontend draft-letrehozas `cost_center_id: null` erteket kuld.
Risk:
A referencia E2E folyamat elso lepesen elhasalhat: a PV adatbevitelhez szukseges draft rekord nem jon letre, mert a backend 422-t ad a `null` cost centerre. Ez megakaszthatja az autosave-alapu adatbeviteli workflow-t.
Recommended fix:
Hangold ossze a szerzodest. Ha draft rekord cost center nelkul is letrejohet, legyen `cost_center_id: int | None` a schema/modell megfelelo kezelessel. Ha nem johet letre, a frontend csak valasztott cost center utan hivja a create endpointot.
Verification step:
PV-kent indits uj belépő rogzitest es figyeld a `POST /entries/` valaszt. Elvart eredmeny: sikeres 201 draft letrehozas vagy lathato validacios hiba, de nem csendes 422.

## Finding ID: PO-20260531-022
Severity: Low
Area: E2E workflow / KILÉPŐ és MÓDOSÍTÁS lezárás
Affected files:
- `backend/app/services/entry_service.py`
Evidence:
- `backend/app/services/entry_service.py:164-166` - KILÉPŐ rekordnal csak akkor tortenik `db.delete(existing)`, ha van letezo Employee; ha nincs, nincs hiba vagy figyelmeztetes.
- `backend/app/services/entry_service.py:168-179` - MÓDOSÍTÁS rekordnal csak akkor frissul Employee, ha van letezo Employee; ha nincs, nincs hiba vagy figyelmeztetes.
- `backend/app/services/entry_service.py:181-183` - mindket eset utan a rekord lezart statuszra commitolhato.
Risk:
Nem letezo torzsrekordra inditott KILÉPŐ vagy MÓDOSÍTÁS lezart allapotba kerulhet anelkul, hogy barmilyen employee tabla valtozas tortenne. Ez lehet szandekos uzleti szabaly, de E2E szempontbol nehezen eszreveheto "nincs hatas" lezárást eredmenyez.
Recommended fix:
Ha ez szandekos, dokumentald es jelenits meg audit/response szintu figyelmeztetest. Ha nem szandekos, close-kor adj 404/409 hibat, amikor KILÉPŐ vagy MÓDOSÍTÁS nem talal letezo Employee rekordot.
Verification step:
Zarj le `kilep` vagy `modositas` rekordot nem letezo `adoazonosito` ertekkel. Elvart eredmeny: vagy dokumentalt figyelmeztetes, vagy explicit hiba; ne legyen csendes, hatas nelkuli lezárás.

## Finding ID: PO-20260531-023
Severity: Low
Area: E2E API schema / EntryRecordResponse
Affected files:
- `backend/app/models/entry_record.py`
- `backend/app/schemas/entry_record.py`
Evidence:
- `backend/app/models/entry_record.py:12-14` - az EntryRecord modell tartalmaz `employee_id`, `created_by`, `cost_center_id` mezoket.
- `backend/app/schemas/entry_record.py:13-21` - az `EntryRecordResponse` tartalmazza a `cost_center_id` mezot, de nem tartalmazza az `employee_id` es `created_by` mezoket.
Risk:
Az API valaszbol a kliens nem tudja kozvetlenul megallapitani, hogy egy entry melyik Employee rekordhoz kapcsolodik, vagy ki hozta letre. Ez nem blokkolja a jelenlegi workflow-t, de neheziti az E2E nyomkovetest, audit UI-t es hibakeresest.
Recommended fix:
Ha kliens vagy audit UI oldalon szukseges, add hozza az `employee_id` es/vagy `created_by` mezoket az `EntryRecordResponse` semahoz. Ha szandekosan rejtett mezok, dokumentald az API szerzodest.
Verification step:
Hivd meg `GET /entries/{id}` endpointot. Elvart eredmeny a jovahagyott API szerzodes szerint: vagy tartalmazza a kapcsolati mezoket, vagy dokumentaltan nem.

## Finding ID: PO-20260531-024
Severity: Low
Area: PV stats / day boundary
Affected files:
- `backend/app/routers/pv_stats.py`
Evidence:
- `backend/app/routers/pv_stats.py:49-51` - a napi/heti/havi kezdopont `date.today()` alapjan keszul, majd `.replace(tzinfo=timezone.utc)` allitja UTC-re.
- `backend/app/routers/pv_stats.py:37-38` - a delta statisztika az `EntryRecord.updated_at >= start` feltetellel szamol.
Risk:
Ha az alkalmazas helyi idozonaban fut, a `date.today()` helyi datumot ad, majd a kod ezt UTC idopontkent cimkezi fel. Budapest idozonaban ez a "mai nap" hatarat 1-2 oraval eltolhatja, igy a `delta_today` statisztika napvaltaskor pontatlan lehet.
Recommended fix:
Dontsd el, hogy a statisztika uzleti napja helyi ido vagy UTC. Helyi nap eseten timezone-aware lokalizalt kezdopontot konvertalj UTC-re; UTC nap eseten `datetime.now(timezone.utc).date()`-bol szamolj.
Verification step:
Teszteld a `delta_today` erteket Europe/Budapest idozonaban ejfel koruli rekordokkal. Elvart eredmeny: a rekordok az uzletileg elvart naphoz tartoznak.
