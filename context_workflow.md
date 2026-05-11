# Progrecon Onboard — Kontextus

> Verzió: 1.3 | 2025  

> Ha mezőkön / űrlapon dolgozunk: `fields.md`  
> Ha kódot írunk: `technical.md`

NE IRJ PROMPTOT CSAK HA MONDOM

Olvasd be MCP filesystem szerveren keresztül a C:\progrecon-Onboard\ mappát, most ezzel dolgozunk

---

## Munkamód

- A **claude.ai (ez)** tervez, elemez, megírja a promptot VS Code-ba
- A **VS Code Claude Code** hajtja végre a kódírást és a teszteket
- Csak akkor promptolj, ha a felhasználó engedélyezi
- Ha a chat tele van és szimulálni kezdesz, szólj!

---

## A szoftver célja

Munkaerőkölcsönző cég belső HR adminisztrációja. Projektvezetők webes űrlapon rögzítik az új belépők adatait → szoftver validál → CSV-t generál → bérszámfejtők betöltik Nexonba.

**Stack:** FastAPI (8744) + React/Vite (5174) + SQLite → PostgreSQL  
**Projekt helye:** `C:\Progrecon-Onboard\`

---

## Szereplők

| Szerepkör | Feladat | Hozzáférés |
|---|---|---|
| Projektvezető (PV) | Adatlap kitöltése, elküldés | Saját költséghelyek (több is lehet) |
| Bérszámfejtő | CSV generálás, Nexon import, NAV XML visszatöltés | Összes rekord |
| Admin | Felhasználókezelés, napló | Teljes rendszer |

> **Fontos:** Egy PV-hez több költséghely is tartozhat (many-to-many). A `user_cost_centers` kapcsolótábla kezeli ezt.

---

## 3 modul

| Modul | Státusz |
|---|---|
| BELÉPŐ — új munkavállaló felvitele | ✅ Backend + frontend kész |
| KILÉPŐ — jogviszony megszüntetése | ⬜ Specifikáció hiányos |
| MÓDOSÍTÁS — adatmódosítás | ⬜ Specifikáció hiányos |

---

## Státuszok

| Státusz | Leírás |
|---|---|
| `folyamatban` | PV szerkeszti, bérszámfejtő nem látja |
| `elküldve` | PV véglegesítette, bérszámfejtő látja |
| `csv_letöltve` | CSV letöltve, Nexonba töltve |
| `lezarva` | NAV XML visszatöltve, lezárva |

---

## Folyamat (minden modulra)

1. PV kitölti az űrlapot (auto-mentés) → elküldi
2. Bérszámfejtő CSV-t generál → Nexonba tölti → NAV bejelentés
3. Bérszámfejtő visszatölti a NAV XML-t → rekord lezárul

**Módosítás:** csak PV végezheti. CSV előtt szabadon, CSV után új CSV generálandó, NAV után külön folyamat (még nem specifikált).

---

## Output CSV fájlok

| Fájl | Tartalom | Oszlopok |
|---|---|---|
| `NBTorzs.csv` | Törzsadat (személyes, lakcím, jogviszony) | 52 |
| `NBJuttat.csv` | Besorolási bér | 8 |
| `NBLevon.csv` | Bankszámla / levonás | 9 |
| `NBSZEPKAdat.csv` | SZÉP-kártya (csak ha van adat) | 7 |

---

## Nyitott kérdések

| Téma | Hatás |
|---|---|
| CSV kódolás: Windows-1250 vagy UTF-8? | csv_generator.py |
| CSV elválasztó: pontosvessző vagy vessző? | csv_generator.py |
| Divízió kezdete (NBTorzs/103) szabálya | csv_generator.py |
| Tartózkodási hely: mikor kötelező? | validator.py |
| NAV XML visszatöltés: manuális vagy automatikus? | nav.py |
| Nexon napi import formátuma | employee_import.py |
| Nexon szótárak (Állampolgárság, Ország, FEOR leírások) | options.js |
| Kilépő + Módosítás modul mező- és CSV specifikáció | következő fázis |
| NAV bejelentés utáni módosítás folyamata | következő fázis |
| Munkavállalói adatbázis xlsx import logika | admin/employees + import endpoint |
| PostgreSQL migráció időzítése | config.py |
