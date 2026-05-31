# Progrecon Onboard — Kontextus

> Verzió: 1.6 | 2026  

> Ha mezőkön / űrlapon dolgozunk: `fields_context.md`  
> Ha kódot írunk: `technical_context.md`

NE IRJ PROMPTOT CSAK HA MONDOM, Te csak promptot írsz, a vs code ba integrált claude vagy a codex irja a kódokat. Csak akkor irhatsz promptot ha 95% biztos vagy benne.

Olvasd be MCP filesystem szerveren keresztül a C:\Progrecon-Onboard\ mappát, most ezzel dolgozunk

---

## Munkamód

- A **claude.ai (ez)** tervez, elemez, megírja a promptot ide a chatbe
- A **VS Code Claude Code / Codex** hajtja végre a kódírást és a teszteket
- Csak akkor írj promptot, ha a felhasználó engedélyezi
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
| Projektvezető (PV) | Adatlap kitöltése, elküldés | Saját régiójához tartozó költséghelyek (több is lehet) |
| Bérszámfejtő | CSV generálás, Nexon import, NAV XML visszatöltés | Összes rekord |
| Admin | Felhasználókezelés, napló | Teljes rendszer |

> **Fontos:** Egy PV-hez továbbra is több költséghely tartozhat. A hozzárendelés régió alapján történik: a PV `users.region` értéke határozza meg, mely `cost_centers.region` alá tartozó költséghelyeket látja.

> **Person / User szétválasztás:** A `persons` tábla a valódi személyt tárolja (név, email), a `users` tábla a belépési fiókot. Kapcsolat: `users.person_id → persons.id` (nullable). Lásd részletek: `technical_context.md`.

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

## Munkavállalói törzsadat (`employees` tábla) — létszámnyilvántartás

Az `employees` tábla tartalmazza a cég **aktuális, aktív létszámát**. Ez a szoftver egyetlen igaz forrása a létszámadatoknak — nem a Nexon, nem egy xlsx.

### Egyszeri induló feltöltés
- Az admin egyszer feltölti a Nexonból exportált **Mintacsomag 2.0** xlsx-t az Admin → Munkavállalók oldalon
- A Mintacsomag 2.0 **dupla fejlécsora** van: 1. sor = csoport, 2. sor = tényleges mezőnév — az import ezt kezeli
- Ez tölti fel az `employees` táblát a teljes meglévő létszámmal
- Szerencsés esetben ez csak egyszer történik meg — utána a szoftver tartja karban a létszámot
- **Fontos:** a kostséghelyeknek (`cost_centers` tábla) már bent kell lenniük mielőtt az importot futtatják, különben a `cost_center_id` NULL marad és a létszámok nem jelennek meg

### Automatikus karbantartás a folyamat végén
A rekord `lezarva` státuszba kerülésekor (NAV XML visszatöltés után) a rendszer **automatikusan** frissíti az `employees` táblát (`entry_service.py` trigger):

| Modul | Hatás az `employees` táblára |
|---|---|
| BELÉPŐ — rekord lezárva | Új munkavállaló **bekerül** az `employees` táblába |
| KILÉPŐ — rekord lezárva | Munkavállaló **kikerül** az `employees` táblából |
| MÓDOSÍTÁS — rekord lezárva | Munkavállaló adatai **frissülnek** az `employees` táblában |

### Létszámadatok megjelenítése
- A PV és Admin nyitóképernyőjén a `total` az `employees` táblából jön (`pv_stats.py`)
- A `delta` (ma/7 nap/30 nap) az `entry_records`-ból számolja a `csv_letöltve` és `lezarva` státuszú rekordokat

### Employee modell mezői (`models/employee.py` + `schemas/employee.py`)
| Mező | Típus | Kötelező |
|---|---|---|
| tax_id | String(10), unique | Igen |
| last_name | String | Igen |
| first_name | String | Igen |
| birth_date | Date | Nem |
| birth_place | String | Nem |
| mothers_name | String | Nem |
| birth_name | String | Nem |
| gender | String(1) — "1"=Férfi, "2"=Nő | Nem |
| taj | String(9) | Nem |
| trunk_number | String | Nem |
| cost_center_id | FK → cost_centers | Nem |

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
| Nexon szótárak (Állampolgárság, Ország, FEOR leírások) — végleges kódok | options.js |
| Kilépő + Módosítás modul mező- és CSV specifikáció | következő fázis |
| NAV bejelentés utáni módosítás folyamata | következő fázis |
| PostgreSQL migráció időzítése | config.py |
