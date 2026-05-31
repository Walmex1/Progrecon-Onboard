# Progrecon Onboard — Mezők és szabályok

> Olvasd be ha: űrlapon, validáción, CSV generáláson dolgozunk.  
> Verzió: 1.4 | 2026

---

## Belépő űrlap — mezők

### 1. Személyes adatok → NBTorzs.csv

| Mező | Típus | Kötelező | CSV oszlop |
|---|---|---|---|
| Előnév | Csak betű, kötőjel, szóköz, pont (filterName) | Nem | 1 |
| Vezetéknév | Csak betű, kötőjel, szóköz, pont (filterName) | Igen | 2 |
| Keresztnév | Csak betű, kötőjel, szóköz, pont (filterName) | Igen | 3 |
| Születési név | Csak betű, kötőjel, szóköz, pont (filterName) | Igen | 11 |
| Anyja neve | Csak betű, kötőjel, szóköz, pont (filterName) | Igen | 10 |
| Születési hely | Csak betű, kötőjel, szóköz, pont (filterName) | Igen | 12 |
| Születési idő | Dátummaszk ÉÉÉÉ-HH-NN (csak szám, kötőjel auto) | Igen | 13 |
| Neme | Lenyíló | Igen | 14 |
| Állampolgárság | Lenyíló (Nexon) | Igen | 17 |
| Adóazonosító jel | Szabad (max 10 karakter), validált onBlur — **nincs filterDigits** | Igen | 6 |
| TAJ szám | Szabad (max 9 karakter), validált onBlur — **nincs filterDigits** | Igen | 8 |
| Törzsszám | Szabad | Nem | 9 |
| E-mail | Szabad, formátum validált onBlur (@, domain) | Nem | 57 |
| Telefonszám | Csak szám, +, -, (, ), szóköz (filterPhone) | Nem | 55 |

### 2. Állandó lakcím → NBTorzs.csv

| Mező | Típus | Kötelező | CSV oszlop |
|---|---|---|---|
| Ország | Lenyíló (Nexon) | Igen | 28 |
| Irányítószám | Kereshető lenyíló → település auto | Igen | 29 |
| Település | Auto / szabad (módosítható), nincs filter | Igen | 30 |
| Közterület neve | Szabad | Igen | 21 |
| Közterület jellege | Lenyíló (15 elem) | Igen | 33 |
| Házszám | Szabad | Igen | 34 |
| Épület | Szabad | Nem | 35 |
| Lépcsőház | Szabad | Nem | 36 |
| Emelet | Szabad | Nem | 37 |
| Ajtó | Szabad | Nem | 38 |

### 3. Tartózkodási hely → NBTorzs.csv (minden mező opcionális)

| Mező | CSV oszlop |
|---|---|
| Irányítószám | 41 |
| Település | 42 |
| Közterület neve | 44 |
| Közterület jellege | 45 |
| Házszám | 46 |
| Épület | 47 |
| Lépcsőház | 48 |
| Emelet | 49 |
| Ajtó | 50 |

### 4. Jogviszony → NBTorzs.csv + NBJuttat.csv

| Mező | Típus | Kötelező | CSV | Kitöltő |
|---|---|---|---|---|
| Jogviszony kezdete | Dátummaszk ÉÉÉÉ-HH-NN (csak szám, kötőjel auto) | Igen | 60 | PV |
| Jogviszony vége | Dátummaszk ÉÉÉÉ-HH-NN (csak szám, kötőjel auto) | Nem | 61 | PV |
| Foglalkozási viszony | Lenyíló (6 opció) | Igen | 88 | PV |
| Munkaidő (napi óra) | Lenyíló (1–8) | Igen | — | PV |
| Bérezés módja | Lenyíló (4 opció) | Igen | 74 | PV |
| Besorolási bér | Egész szám, min 0, type="text" + filterNonNegativeNumber | Igen | NBJuttat/4 | PV |
| Jogviszony jellege | Állandó: 20 | Auto | 59 | — |
| Fogl. viszony kezdete | = Jogviszony kezdete | Auto | 89 | — |
| Bérezés kezdete | = Jogviszony kezdete | Auto | 75 | — |
| Bér kódja | Állandó: BB | Auto | NBJuttat/3 | — |
| Bér kezdete | = Jogviszony kezdete | Auto | NBJuttat/6 | — |
| Bér hatályba lépés | = Jogviszony kezdete | Auto | NBJuttat/8 | — |
| Divízió | Állandó: 9999 | Auto | 102 | — |
| Divízió kezdete | Tisztázandó | Auto | 103 | — |

### 5. Munkakör és besorolás → NBTorzs.csv

| Mező | Típus | Kötelező | CSV | Kitöltő |
|---|---|---|---|---|
| Régió | Lenyíló — **dinamikus, API-ból** (`/admin/cost-centers/`) | Igen | 100 | PV |
| Egység | Lenyíló — **dinamikus, API-ból** (`/admin/cost-centers/`) | Igen | 84 | PV |
| Munkakör | Lenyíló (Nexon) | Igen | 96 | PV |
| FEOR szám | Kereshető lenyíló (`data/feor08.json`) | Igen | 86 | PV |
| Költséghely | Lenyíló — **dinamikus, API-ból** (`/admin/cost-centers/`) | Igen | 92 | PV |
| Régió kezdete | = Jogviszony kezdete | Auto | 101 | — |
| Egység kezdete | = Jogviszony kezdete | Auto | 85 | — |
| Munkakör kezdete | = Jogviszony kezdete | Auto | 97 | — |
| FEOR kezdete | = Jogviszony kezdete | Auto | 87 | — |
| Költséghely kezdete | = Jogviszony kezdete | Auto | 93 | — |

### 6. Bankszámla → NBLevon.csv

| Mező | Típus | Kitöltő |
|---|---|---|
| Bankszámlaszám | Automaszk XXXXXXXX-XXXXXXXX(-XXXXXXXX), csak szám+kötőjel | PV |
| Kedvezményezett neve | Auto-kitöltés: vezeteknev + keresztnev (módosítható), filterName | PV |
| Közlemény | = Vez. + Ker. + "Munkabér" | Auto |
| Utalás típusa | Állandó: 2 | Auto |
| Levonás kód | Állandó: 91 | Auto |
| Százalék | Állandó: 100 | Auto |
| Hóközi | Állandó: I | Auto |
| Érv.tól | = Jogviszony kezdete | Auto |

### 7. SZÉP-kártya → NBSZEPKAdat.csv (opcionális)

> Ha bármelyik mező ki van töltve, mind kötelező.

| Mező | Típus | Kitöltő |
|---|---|---|
| SZÉP-kártya szám | Automaszk XXXXXXXX-XXXXXXXX-XXXXXXXX, csak szám+kötőjel | PV |
| Kibocsátó | Lenyíló (K&H=1, MKB=2, OTP=3) | PV |
| Kedvezményezett neve | Auto-kitöltés: vezeteknev + keresztnev (módosítható), filterName | PV |
| Zseb | Állandó: 2 | Auto |
| Közlemény | = Vez. + Ker. + "Munkabér" | Auto |
| Érv.tól | = Jogviszony kezdete | Auto |

---

## Munkaidő szabályok

| Napi óra | Engedélyezett foglalkozási viszony | NBTorzs/168 | NBTorzs/108 |
|---|---|---|---|
| 8 | Teljes munkaidős, TM nyugdíjas, TM GYED | — | — |
| 6 | Részmunkaidős, RM nyugdíjas, RM GYED | 6 | 130.5 |
| 4 | Részmunkaidős, RM nyugdíjas, RM GYED | 4 | 87 |
| 2 | Részmunkaidős, RM nyugdíjas, RM GYED | 2 | 43.5 |

> 168/108 oszlopok kezdete = Jogviszony kezdete. 8 óránál nem töltődnek ki.

---

## Lenyíló mezők

### Statikus — `constants/options.js`

| Mező | Elemek |
|---|---|
| Neme | Férfi=1, Nő=2 |
| Foglalkozási viszony | TM=01, RM=02, RM ny.=04, TM ny.=05, TM GYED=41, RM GYED=42 |
| Bérezés módja | Havi=1, Óra=4, Telj.havi=5, Telj.óra=6 |
| SZÉP kibocsátó | OTP=3, MKB=2, K&H=1 |
| Munkaidő | 1–8 óra |
| Közterület jellege | 15 elem (utca, körút, lépcső, lakótelep, park, part, kertalja, körtér, köz, út, útja, telep, telek, udvar, sugárút) |

> **Fontos:** `REGIO_OPTIONS`, `EGYSEG_OPTIONS`, `KOLTSEGHELYAZ_OPTIONS` **NEM szerepelnek** az `options.js`-ben. Ezek dinamikusak — az adatbázisból jönnek.

### Dinamikus — API-ból (`/admin/cost-centers/`)

| Mező | Forrás | Számítás |
|---|---|---|
| Régió | `cost_centers.region` egyedi értékei | `[...new Set(costCenters.map(cc => cc.region).filter(Boolean))].sort()` |
| Egység | `cost_centers.name` egyedi értékei | `[...new Map(costCenters.map(cc => [cc.name, {value: cc.code, label: cc.name}])).values()]` |
| Költséghely | minden aktív cost center | `costCenters.map(cc => ({ value: cc.code, label: \`${cc.code} — ${cc.name}\` }))` |

> A `NewEntry.jsx` betöltéskor lekéri a `/admin/cost-centers/` endpointot és ebből számítja a három dropdown opcióit. Ha az adatbázis üres, a dropdownok üresek lesznek.

### Kész — `data/iranyitoszamok.json`
3038 irányítószám → `{ telepules, megye }`. Forrás: `iranyitoszam.xlsx`, generáló: `scripts/build_iranyitoszam.py`.

### Kész — `data/feor08.json`
700+ FEOR kód, KSH FEOR–08 teljes lista → `{ "1110": "Törvényhozó, miniszter, államtitkár", ... }`. Forrás: `feor08_kodok.md`, generáló: `scripts/build_feor.py`.

### Hiányzó — Nexon szótár (be kell szerezni)

| Mező | Megjegyzés |
|---|---|
| Állampolgárság | ~75 elem, kódok hiányoznak |
| Ország | ~14 elem, kódok hiányoznak |
| Munkakör | placeholder értékek vannak, végleges Nexon kódok hiányoznak |

---

## Validációs szabályok

### Adóazonosító (10 számjegy)
- Nincs karakterszűrés gépelés közben — blurkor validál
- 1. számjegy = 8
- 2–6. számjegy = 1867.01.01 óta eltelt napok → visszafejthető születési dátum
- 10. számjegy = ellenőrző szám (súlyozott összeg mod 11, súlyok: 1–9)
- Keresztvalidáció születési dátummal: mindkét mező kitöltése után fut, mindkét irányból (adóazonosító blur és születési dátum blur)
- Zöld pipa jelenik meg ha valid (frontend: `showSuccess=true`)

### TAJ szám (9 számjegy)
- Nincs karakterszűrés gépelés közben — blurkor validál
- 9. számjegy = ellenőrző szám (súlyozott összeg mod 10, súlyok: 3,7,3,7,3,7,3,7)
- Zöld pipa jelenik meg ha valid (frontend: `showSuccess=true`)

### Bankszámlaszám
- `xxxxxxxx-xxxxxxxx` vagy `xxxxxxxx-xxxxxxxx-xxxxxxxx` (automaszk, kötőjel auto)
- Zöld pipa jelenik meg ha valid (frontend: `showSuccess=true`)

### SZÉP-kártya szám
- `xxxxxxxx-xxxxxxxx-xxxxxxxx` (automaszk, kötőjel auto)
- Zöld pipa jelenik meg ha valid (frontend: `showSuccess=true`)

### E-mail
- Formátum: `valami@domain.tld` — `@` és domain kötelező, onBlur validáció

### Validáció általános logika (frontend)
- **touched state**: minden mező külön nyilvántartja hogy érintette-e már a user
- **onBlur**: mező touched lesz, validáció lefut, hiba megjelenik ha van
- **onChange (touched mező esetén)**: validáció azonnal lefut, hiba eltűnik amint helyes — "reward early, punish late"
- **onChange (nem touched mező)**: hiba törlődik, de nem fut validáció
- Kötelező mező üres → backend validáció elküldéskor jelzi
- SZÉP-kártya: ha egy mező ki van töltve, mind kötelező
- Teljes munkaidős foglalkozási viszony csak 8 óránál (és fordítva)
- Keresztvalidáció: csak ha mindkét mező ki van töltve

### Auto-kitöltések
- Irányítószám → Település (lakcím és tartózkodási hely egyaránt)
- `kedvezmenyezett_neve` (bankszámla) → `vezeteknev + " " + keresztnev`, felülírható
- `szep_kedvezmenyezett` → `vezeteknev + " " + keresztnev`, felülírható
- Auto-kitöltés csak akkor fut, ha a mező üres vagy az előző auto-értékkel egyezik
