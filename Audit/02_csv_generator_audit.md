---
purpose: Progrecon Onboard – végrehajtható audit procedure
output_language: hu
mode: audit_only_first
rule: Először csak hibákat listázz, kódot ne módosíts, amíg külön nem kérem.
---

# 02 — CSV generálás audit

## Cél
A négy output CSV fájl (NBTorzs, NBJuttat, NBLevon, NBSZEPKAdat) helyes
tartalmának, oszlopsorrendjének és formátumának ellenőrzése.

## Olvasandó fájlok
- `backend/app/services/csv_generator.py`
- `backend/app/routers/export.py`
- `backend/app/services/validator.py`

## Architektúrális tények (lásd AGENTS.md)
- NBTorzs: `row = [""] * 169` (1-alapú indexelés, 0. hely üres)
  - Visszaadott sor: `row[1:]` = **168 elem**
  - Fejléc: `[str(i) for i in range(1, 169)]` = **168 fejlécoszlop**
  - **FIGYELEM:** a `fields_context.md` "52 oszlop"-ot ír, de a kód 168 elemű tömböt generál — ez tisztázandó!
- NBJuttat: 8 oszlop
- NBLevon: 9 oszlop
- NBSZEPKAdat: 7 oszlop, csak ha `szep_kartya_szam` ki van töltve
- Kódolás: `cp1250`, elválasztó: `;` — még pontosítandó a megrendelővel
- ZIP neve: `belep_{id}_{timestamp}.zip`
- Egyetlen CSV esetén: sima CSV visszaadás, nem ZIP

## Elvárt CSV tartalom

### NBTorzs kritikus pozíciók (1-alapú, 168 elemű sor)
| Pos | Mező | Forrás / Állandó |
|-----|------|-----------------|
| 1 | Előnév | elonev |
| 2 | Vezetéknév | vezeteknev |
| 3 | Keresztnév | keresztnev |
| 6 | Adóazonosító | adoazonosito |
| 8 | TAJ | taj |
| 9 | Törzsszám | torzsszam |
| 10 | Anyja neve | anyja_neve |
| 11 | Születési név | szuletesi_nev |
| 12 | Születési hely | szuletesi_hely |
| 13 | Születési idő | szuletesi_datum |
| 14 | Neme | neme |
| 17 | Állampolgárság | allampolgarsag |
| 21 | Közterület neve | kozterulet |
| 28 | Ország | lakcim_orszag |
| 29 | Irányítószám | lakcim_iranyitoszam |
| 30 | Település | lakcim_telepules |
| 33 | Közterület jellege | lakcim_kozterulet_jellege |
| 34 | Házszám | lakcim_hazszam |
| 35 | Épület | lakcim_epulet |
| 36 | Lépcsőház | lakcim_lepcsoehaz |
| 37 | Emelet | lakcim_emelet |
| 38 | Ajtó | lakcim_ajto |
| 41 | Tart. irányítószám | tart_iranyitoszam |
| 42 | Tart. település | tart_telepules |
| 44 | Tart. közterület | tart_kozterulet |
| 45 | Tart. ktjellege | tart_kozterulet_jellege |
| 46 | Tart. házszám | tart_hazszam |
| 47 | Tart. épület | tart_epulet |
| 48 | Tart. lépcsőház | tart_lepcsoehaz |
| 49 | Tart. emelet | tart_emelet |
| 50 | Tart. ajtó | tart_ajto |
| 55 | Telefonszám | telefonszam |
| 57 | Email | email |
| 59 | Jogviszony jellege | **"20"** (állandó) |
| 60 | Jogviszony kezdete | jogviszony_kezdete |
| 61 | Jogviszony vége | jogviszony_vege |
| 74 | Bérezés módja | berezesi_mod |
| 75 | Bérezés kezdete | = jogviszony_kezdete |
| 84 | Egység | egyseg |
| 85 | Egység kezdete | = jogviszony_kezdete |
| 86 | FEOR | feor |
| 87 | FEOR kezdete | = jogviszony_kezdete |
| 88 | Foglalkozási viszony | foglalkozasi_viszony |
| 89 | Fogl. viszony kezdete | = jogviszony_kezdete |
| 92 | Költséghely | koltseghelyKod |
| 93 | Ktghely kezdete | = jogviszony_kezdete |
| 96 | Munkakör | munkakor |
| 97 | Munkakör kezdete | = jogviszony_kezdete |
| 100 | Régió | regio |
| 101 | Régió kezdete | = jogviszony_kezdete |
| 102 | Divízió | **"9999"** (állandó) |
| 103 | Divízió kezdete | (szabály tisztázandó — jelenleg üres) |
| 108 | Napi munkaidő (ha ≠8) | MUNKAIDO_SZABALY[ora]["col_108"] |
| 168 | Munkaidő kód (ha ≠8) | MUNKAIDO_SZABALY[ora]["col_168"] |

### NBJuttat (8 oszlop)
| Pos | Érték |
|-----|-------|
| 1 | adóazonosító |
| 2 | üres |
| 3 | **"BB"** (állandó) |
| 4 | besorolasi_ber |
| 5 | üres |
| 6 | jogviszony_kezdete |
| 7 | üres |
| 8 | jogviszony_kezdete (hatályba lépés) |

### NBLevon (9 oszlop)
| Pos | Érték |
|-----|-------|
| 1 | adóazonosító |
| 2 | **"91"** (levonás kód, állandó) |
| 3 | bankszamlaszam |
| 4 | kedvezmenyezett_neve |
| 5 | "{vez} {ker} Munkabér" |
| 6 | **"2"** (utalás típusa, állandó) |
| 7 | **"100"** (százalék, állandó) |
| 8 | **"I"** (hóközi, állandó) |
| 9 | jogviszony_kezdete |

### NBSZEPKAdat (7 oszlop)
| Pos | Érték |
|-----|-------|
| 1 | adóazonosító |
| 2 | szep_kartya_szam |
| 3 | szep_kartya_kibocsato |
| 4 | szep_kedvezmenyezett |
| 5 | "{vez} {ker} Munkabér" |
| 6 | **"2"** (zseb, állandó) |
| 7 | jogviszony_kezdete |

## Audit lépések

### 1. NBTorzs oszlopszám — kritikus kérdés
- A kód 168 elemű tömböt épít és 168 fejlécoszloppal exportál
- A `fields_context.md` 52 oszlopot ír
- Ez finding (legalább Medium), mert tisztázandó a Nexon elvárás
- Ellenőrizd: `generate_nb_torzs` visszatérési értéke `row[1:]` — hány elem ez valójában?

### 2. Állandó értékek megléte
- `row[59] = "20"` megvan-e?
- `row[102] = "9999"` megvan-e?
- `row[103]` ki van-e töltve? (ha üres, ez dokumentált nyitott kérdés)
- NBJuttat `[2] = "BB"` megvan-e?
- NBLevon `[1] = "91"`, `[5] = "2"`, `[6] = "100"`, `[7] = "I"` mind megvan-e?
- NBSZEPKAdat `[5] = "2"` (zseb) megvan-e?

### 3. Auto-mezők ("= jogviszony_kezdete")
- `jk = _jogviszony_kezdete(form)` definiálva van-e?
- `row[75], row[85], row[87], row[89], row[93], row[97], row[101]` mind `jk`-t kapnak-e?
- NBJuttat `[5]` és `[7]`: mindkettő `jk`?
- NBLevon `[8]`: `jk`?
- NBSZEPKAdat `[6]`: `jk`?
- Mi történik ha `jogviszony_kezdete` hiányzik a form_data-ból? (üres string — nem crash)

### 4. Munkaidő szabály (MUNKAIDO_SZABALY)
- A dict kulcsai: "2", "4", "6", "8" — de a MUNKAIDO_OPTIONS 1–8-ig tartalmaz értékeket
- Hiányzó kulcsok: "1", "3", "5", "7" — ezekre `MUNKAIDO_SZABALY.get(munkaido, MUNKAIDO_SZABALY["8"])` fut
  - Ez helyes-e? (fallback = 8 óra = üres mezők)
- 8 óránál `row[108]` és `row[168]` üresen marad-e?
- Részmunkaidőnél mindkét mező ki van-e töltve?

### 5. Kódolás és formátum
- `CSV_ENCODING = "cp1250"` a fájl elején?
- `CSV_DELIMITER = ";"` a fájl elején?
- `build_csv()`: ezeket használja-e?
- ZIP fájlnév formátuma: `belep_{id}_{timestamp}.zip`?
- Egyetlen CSV esetén (csak NBTorzs, pl. ha nincs bankszámla): sima CSV visszaadás?

### 6. SZÉP-kártya feltétel
- `generate_nb_szep()`: ha `szep_kartya_szam` üres, `None`-t ad vissza?
- `generate_csvs_for_entry()`: `if szep:` feltétel megvan-e?

### 7. Hibakezelés és validáció
- `export.py`: `validate_entry_form(entry.form_data)` fut-e CSV generálás előtt?
- Ha hibát talál: 400-as HTTPException, nem generálódik CSV?
- `generate_csvs_for_entry` kivétel: `except Exception` elkapja-e és 500-ra konvertálja-e?
- Hiányzó kötelező mező a form_data-ban: üres stringgel folytatódik (nem crash)?

## Codex prompt
```
Read AGENTS.md and Audit/02_csv_generator_audit.md.
Audit only:
  backend/app/services/csv_generator.py
  backend/app/routers/export.py
  backend/app/services/validator.py
Do not modify code.
Find:
- NBTorzs: row = [""] * 169, returns row[1:] = 168 elements, header = range(1,169) = 168 cols.
  Flag as finding: fields_context.md says 52 cols but code generates 168. Severity Medium/High.
- MUNKAIDO_SZABALY keys: only "2","4","6","8" or also "1","3","5","7"?
  If missing, what is the fallback behavior for e.g. munkaido="3"?
- row[103] (divízió kezdete): filled or empty string?
- All auto-fields (row[75,85,87,89,93,97,101]) set to jk (jogviszony_kezdete)?
- NBJuttat: 8 columns, index 2 = "BB", index 3 = besorolasi_ber, index 5 and 7 = jk?
- NBLevon: 9 columns, constants "91" at [1], "2" at [5], "100" at [6], "I" at [7]?
- NBSZEPKAdat: 7 columns, constant "2" at [5] (zseb)?
- generate_nb_szep: returns None if szep_kartya_szam is empty?
- export.py: validate_entry_form called before generate_csvs_for_entry?
- export.py: exception from generate_csvs_for_entry caught and returned as 500?
- CSV_ENCODING = "cp1250" and CSV_DELIMITER = ";" confirmed?
- Single CSV case: raw CSV returned (not ZIP)?
Return findings with file + line number evidence.
Write all findings to: C:\Progrecon-Onboard\Audit\findings\PO-{YYYYMMDD}-02_csv_generator.md
Use the finding format from AGENTS.md. If no findings, write a single Info entry.
```

## Severity útmutató
- **Critical:** rossz oszlopba kerül adat, Nexon importja sikertelen
- **High:** állandó érték hiányzik, auto-mező rossz értéket kap, munkaidő fallback helytelen
- **Medium:** oszlopszám eltérés (52 vs 168 — tisztázandó), divízió kezdete üres, kódolás/elválasztó kérdéses
- **Low:** ZIP névformátum eltérés, edge-case
