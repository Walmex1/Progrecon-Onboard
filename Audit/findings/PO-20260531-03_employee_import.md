## Finding ID: PO-20260531-010
Severity: High
Area: Employee import / duplicate existing rows
Affected files:
- `backend/app/services/employee_import.py`
- `backend/tests/test_employee_import.py`
Evidence:
- `backend/app/services/employee_import.py:145-147` - van `employee_cache`, `processed_tax_ids` es `newly_created_tax_ids` cache.
- `backend/app/services/employee_import.py:182-188` - letezo employee elso sora utan az employee cache-bol jon vissza ugyanarra a `tax_id`-re.
- `backend/app/services/employee_import.py:214-238` - minden letezo employee sor vegen `updated += 1` fut, ha a `tax_id` nincs a `newly_created_tax_ids` halmazban.
- `backend/app/services/employee_import.py:235-238` - a duplikalt ujonnan letrehozott employee sorait nem szamolja update-nek, de a mar import elott is letezo employee ismelt sorait igen.
- `backend/tests/test_employee_import.py:82-96` - van teszt az uj employee duplikalt soraira.
- `backend/tests/test_employee_import.py:99-110` - van teszt egyetlen letezo employee sor update szamlalasara, de nincs teszt letezo employee tobb soros importjara.
Risk:
Mintacsomag 2.0 importnal egy munkavallalohoz tobb sor is tartozhat. Ha a dolgozo mar letezett az adatbazisban, az import minden ismelt sort kulon `updated` rekordkent szamolhat, igy az import eredmeny statisztikaja felrevezeto lesz.
Recommended fix:
A `updated` szamlalast tax_id-nkent egyszer vegezd, hasonloan az ujonnan letrehozott rekordok vedelmehez. Peldaul vezess `updated_tax_ids` halmazt, es csak akkor novelj, ha a tax_id meg nem szerepel benne.
Verification step:
Adj tesztet olyan XLSX-re, amelyben egy mar letezo employee ugyanazzal a `tax_id`-vel tobb sorban szerepel. Elvart eredmeny: `created == 0`, `updated == 1`, `skipped == 0`.

## Finding ID: PO-20260531-011
Severity: High
Area: Employee import / transaction safety
Affected files:
- `backend/app/services/employee_import.py`
- `backend/app/models/employee.py`
Evidence:
- `backend/app/services/employee_import.py:259-261` - soron beluli kivetelnel a kod `errors.append(...)`, `skipped += 1`, majd folytatja a ciklust.
- `backend/app/services/employee_import.py:263-264` - a `db.commit()` a ciklus utan, try/except es rollback nelkul fut.
- `backend/app/models/employee.py:10-12` - az `employees.tax_id`, `last_name`, `first_name` mezok nem nullable mezok; `tax_id` unique is.
- `backend/app/services/employee_import.py:178-180` es `backend/app/services/employee_import.py:240-257` - a `tax_id` hossza/formaja nincs validalva az Employee letrehozasa elott.
Risk:
Ha a vegso commit kozben adatbazis hiba tortenik (peldaul Postgres alatt tul hosszu `tax_id`, constraint hiba vagy egyeb DB-level exception), az import nem `EmployeeImportResult` hibaval ter vissza, rollback sincs, es az egesz import endpoint 500-ra futhat. Ez a felhasznalonak import crash-kent jelenik meg, mikozben a soronkenti hibakezeles ezt nem fogja meg.
Recommended fix:
A vegso `db.commit()` legyen try/except blokkban, hiba eseten `db.rollback()` hivassal es ertheto import hibaval. Emellett validald a kritikus mezoket (`tax_id` 10 karakter, kotelezo nevek) meg DB commit elott.
Verification step:
Importalj olyan sort, ahol a `tax_id` ervenytelenul hosszu vagy DB constraintet sert. Elvart eredmeny: kontrollalt import eredmeny/hiba es tiszta rollback, nem nyers 500.

## Finding ID: PO-20260531-012
Severity: Medium
Area: Employee import / header mapping robustness
Affected files:
- `backend/app/services/employee_import.py`
Evidence:
- `backend/app/services/employee_import.py:21-59` - a `COLUMN_MAP` kezzel felsorolt fejlecvariansokat hasznal.
- `backend/app/services/employee_import.py:83-86` - a `_normalize()` csak trim, sortores csere es lowercase muveletet vegez; ekezeteket nem normalizal.
- `backend/app/services/employee_import.py:36-44` - a szuletesi datumhoz van ekezet nelkuli `szuletesi datum`, de a `születési hely` es `születési név` mezoknek nincs `szuletesi hely` / `szuletesi nev` variansa.
- `backend/app/services/employee_import.py:52-58` - a torzsszam mappingben szerepel `torzssam` es `törzsszam`, de nincs tiszta ekezet nelkuli `torzsszam`; a koltseghelynel van `koltseghelykod`, de nincs `koltseghely kod` szokozos varians.
Risk:
Ha a Mintacsomag vagy egy exportalt/importalt sablon ekezet nelkuli fejleceket hasznal, egyes mezok nem kerulnek felismeresre. Nem kotelezo mezoknel ez csendes adatveszteshez vezethet, mert a sor importalodik, de peldaul a szuletesi hely, szuletesi nev vagy torzsszam ures marad.
Recommended fix:
Bovitsd a `COLUMN_MAP`-et a hasznalt ekezet nelkuli variansokkal, vagy vezess be accent-folding normalizalast (`á` -> `a`, `ő` -> `o` stb.) ugy, hogy a jelenlegi fejlecek tovabbra is mukodjenek.
Verification step:
Importalj teszt XLSX-et `Szuletesi hely`, `Szuletesi nev`, `Torzsszam`, `Koltseghely kod` fejlecekkel. Elvart eredmeny: a megfelelo Employee mezok feltoltodnek.

## Finding ID: PO-20260531-013
Severity: Low
Area: Employee import API / file type handling
Affected files:
- `backend/app/routers/employees.py`
- `backend/app/services/employee_import.py`
Evidence:
- `backend/app/routers/employees.py:105-106` - az import endpoint `.xlsx` es `.xls` kiterjesztest is elfogad.
- `backend/app/services/employee_import.py:98-102` - a service `openpyxl.load_workbook(...)` hivast hasznal, amely az XLSX munkafuzet betoltesi utja.
- `backend/app/services/employee_import.py:101-102` - fajlmegnyitasi hiba eseten a service `EmployeeImportResult` objektummal ter vissza, nem HTTP hibakoddal.
Risk:
Legacy `.xls` fajlt a router atengedhet, mikozben a betoltes varhatoan fajlmegnyitasi hibara fut. Ez nem adatvesztes, de zavaros user experience: a feltoltes HTTP szinten sikeresnek tunhet, mikozben az import eredmeny csak belso errors listaban jelzi, hogy a fajl nem olvashato.
Recommended fix:
Ha csak Mintacsomag 2.0 `.xlsx` tamogatott, a router csak `.xlsx` kiterjesztest fogadjon el. Ha `.xls` is cel, akkor ahhoz kulon parser/konverzio kell, es a hibakod/hibaformatum legyen egyertelmu.
Verification step:
Tolts fel valodi `.xls` fajlt es ellenorizd az API valaszt. Elvart eredmeny: vagy korai 400-as hiba nem tamogatott formatumra, vagy sikeres import valodi `.xls` parserrel.
