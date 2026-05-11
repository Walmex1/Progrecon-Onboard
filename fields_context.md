# Progrecon Onboard — Mezők és szabályok

> Olvasd be ha: űrlapon, validáción, CSV generáláson dolgozunk.  
> Verzió: 1.0 | 2025

---

## Belépő űrlap — mezők

### 1. Személyes adatok → NBTorzs.csv

| Mező | Típus | Kötelező | CSV oszlop |
|---|---|---|---|
| Előnév | Szabad | Nem | 1 |
| Vezetéknév | Szabad | Igen | 2 |
| Keresztnév | Szabad | Igen | 3 |
| Születési név | Szabad | Igen | 11 |
| Anyja neve | Szabad | Igen | 10 |
| Születési hely | Szabad | Igen | 12 |
| Születési idő | Dátum ÉÉÉÉ-HH-NN | Igen | 13 |
| Neme | Lenyíló | Igen | 14 |
| Állampolgárság | Lenyíló (Nexon) | Igen | 17 |
| Adóazonosító jel | 10 számjegy, validált | Igen | 6 |
| TAJ szám | 9 számjegy, validált | Igen | 8 |
| Törzsszám | Szabad | Nem | 9 |
| E-mail | Szabad | Nem | 57 |
| Telefonszám | Szabad | Nem | 55 |

### 2. Állandó lakcím → NBTorzs.csv

| Mező | Típus | Kötelező | CSV oszlop |
|---|---|---|---|
| Ország | Lenyíló (Nexon) | Igen | 28 |
| Irányítószám | Szabad → település auto | Igen | 29 |
| Település | Auto / szabad (módosítható) | Igen | 30 |
| Közterület neve | Szabad | Igen | 21 |
| Közterület jellege | Lenyíló (15 elem) | Igen | 33 |
| Házszám | Szabad | Igen | 34 |
| Épület | Szabad | Nem | 35 |
| Lépcsőház | Szabad | Nem | 36 |
| Emelet | Szabad | Nem | 37 |
| Ajtó | Szabad | Nem | 38 |

### 3. Tartózkodási hely → NBTorzs.csv (összecsukható, minden mező opcionális)

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
| Jogviszony kezdete | Dátum | Igen | 60 | PV |
| Jogviszony vége | Dátum | Nem | 61 | PV |
| Foglalkozási viszony | Lenyíló (6 opció) | Igen | 88 | PV |
| Munkaidő (napi óra) | Lenyíló (1–8) | Igen | — | PV |
| Bérezés módja | Lenyíló (4 opció) | Igen | 74 | PV |
| Besorolási bér | Szám | Igen | NBJuttat/4 | PV |
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
| Régió | Lenyíló (Nexon) | Igen | 100 | PV |
| Egység | Lenyíló (Nexon) | Igen | 84 | PV |
| Munkakör | Lenyíló (Nexon) | Igen | 96 | PV |
| FEOR szám | Lenyíló (Nexon) | Igen | 86 | PV |
| Költséghely | Lenyíló (Nexon) | Igen | 92 | PV |
| Régió kezdete | = Jogviszony kezdete | Auto | 101 | — |
| Egység kezdete | = Jogviszony kezdete | Auto | 85 | — |
| Munkakör kezdete | = Jogviszony kezdete | Auto | 97 | — |
| FEOR kezdete | = Jogviszony kezdete | Auto | 87 | — |
| Költséghely kezdete | = Jogviszony kezdete | Auto | 93 | — |

### 6. Bankszámla → NBLevon.csv

| Mező | Típus | Kitöltő |
|---|---|---|
| Bankszámlaszám | 2×8 vagy 3×8 számjegy | PV |
| Kedvezményezett neve | = Vez. + Ker. (módosítható) | PV |
| Közlemény | = Vez. + Ker. + "Munkabér" | Auto |
| Utalás típusa | Állandó: 2 | Auto |
| Levonás kód | Állandó: 91 | Auto |
| Százalék | Állandó: 100 | Auto |
| Hóközi | Állandó: I | Auto |
| Érv.tól | = Jogviszony kezdete | Auto |

### 7. SZÉP-kártya → NBSZEPKAdat.csv (összecsukható)

> Ha bármelyik mező ki van töltve, mind kötelező.

| Mező | Típus | Kitöltő |
|---|---|---|
| SZÉP-kártya szám | 3×8 számjegy | PV |
| Kibocsátó | Lenyíló (K&H=1, MKB=2, OTP=3) | PV |
| Kedvezményezett neve | = Vez. + Ker. (módosítható) | PV |
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

### Kész — `constants/options.js`

| Mező | Elemek |
|---|---|
| Neme | Férfi=1, Nő=2 |
| Foglalkozási viszony | TM=01, RM=02, RM ny.=04, TM ny.=05, TM GYED=41, RM GYED=42 |
| Bérezés módja | Havi=1, Óra=4, Telj.havi=5, Telj.óra=6 |
| SZÉP kibocsátó | OTP=3, MKB=2, K&H=1 |
| Munkaidő | 1–8 óra |
| Közterület jellege | 15 elem (utca, körút, lépcső, lakótelep, park, part, kertalja, körtér, köz, út, útja, telep, telek, udvar, sugárút) |

### Kész — `data/iranyitoszamok.json`
3038 irányítószám → `{ telepules, megye }`. Forrás: `iranyitoszam.xlsx`, generáló: `scripts/build_iranyitoszam.py`.

### Hiányzó — Nexon szótár (be kell szerezni)

| Mező | Megjegyzés |
|---|---|
| Állampolgárság | ~75 elem, kódok hiányoznak |
| Ország | ~14 elem, kódok hiányoznak |
| Költséghely | 6 kód megvan (KLBLENU, KLBLENV, KLBLUM, KLBGIANT, KLBKONT, KLGBDO) |
| Egység | Részben kész (Lenovo, Giant + placeholder-ek) |
| Munkakör | 6 kész (Bérszámfejtő, Komissiózó, Rakodómunkás, Telephelyvezető, Operátor, Quality inspector) |
| Régió | 9 kész (Nyíregyháza, Debrecen, Szeged, Budapest, Békéscsaba, Pécs, Zalaegerszeg, Kecskemét, Miskolc) |
| FEOR | 11 szám kész, súgó (leírás) hiányzik |

---

## Validációs szabályok

### Adóazonosító (10 számjegy)
- 2–6. számjegy = 1867.01.01 óta eltelt napok → visszafejthető születési dátum
- 10. számjegy = ellenőrző szám
- Keresztvalidáció: adóazonosítóból visszafejtett dátum = megadott születési dátum

### TAJ szám (9 számjegy)
- 9. számjegy = ellenőrző szám (súlyozott összeg mod 10)

### Bankszámlaszám
- `xxxxxxxx-xxxxxxxx` vagy `xxxxxxxx-xxxxxxxx-xxxxxxxx` (kötőjellel vagy anélkül)

### Általános
- Kötelező mező hiánya → hibaüzenet: *"XY mező kötelező, ha nem tudod kitölteni keresd a bérszámfejtőt."*
- Ismétlődő adóazonosító → felajánlja: módosítás VAGY új jogviszony
- SZÉP-kártya: ha egy mező ki van töltve, mind kötelező
- Teljes munkaidős foglalkozási viszony csak 8 óránál
- Validáció: mezőnként kilépéskor (nem csak elküldéskor)
- Keresztvalidáció: csak ha mindkét mező ki van töltve
