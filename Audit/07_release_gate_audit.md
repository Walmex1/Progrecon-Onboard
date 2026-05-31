---
purpose: Progrecon Onboard – végrehajtható audit procedure
output_language: hu
mode: audit_only_first
rule: Először csak hibákat listázz, kódot ne módosíts, amíg külön nem kérem.
---

# 07 — Release gate audit (Go / No-Go)

## Cél
Az 01–06 audit findings alapján döntés: éles használatra kész-e a szoftver.

## Előfeltétel
Az 01–06 audit fájlok findings-ei dokumentálva vannak a `C:\Progrecon-Onboard\Audit\findings\` mappában.

---

## Ismert, elfogadható hiányosságok (nem blokkolják a release-t)
Ezek szándékosan nyitottak, közmegegyezéssel elfogadva az aktuális fázisban:

| Hiányosság | Érintett terület |
|---|---|
| NAV XML visszatöltés (`nav.py`) nem implementált | nav.py |
| Kilépő modul — specifikáció hiányos | következő fázis |
| Módosítás modul — specifikáció hiányos | következő fázis |
| PostgreSQL migráció időzítése nyitott | config.py |
| Nexon szótárak (Állampolgárság, Ország, Munkakör) — végleges kódok hiányoznak | options.js |
| CSV kódolás és elválasztó — cp1250/pontosvessző pontosítandó a megrendelővel | csv_generator.py |
| NBTorzs oszlopszám (52 vs 168) — Nexon elvárás tisztázandó | csv_generator.py |
| seed.py "Észak" régió placeholder | seed.py |
| ACCESS_TOKEN_EXPIRE_HOURS = 20 év — fejlesztési beállítás | config.py |
| _parse_date() duplikáció | entry_service.py / employee_import.py |
| Employee törzsadatok hiányosak lezárásnál (birth_place stb.) | entry_service.py |
| MUNKAIDO_SZABALY hiányos kulcsok (1,3,5,7) | csv_generator.py |
| migrate_cost_centers.py és migrate_region.py obsolete fájlok | backend/ |

---

## Go kritériumok (mind teljesítendő éles előtt)

### Biztonsági minimum — BLOKKOLÓ
- [ ] `LoginRequest` séma tartalmaz `password: str` mezőt
- [ ] `auth/login` meghívja `verify_password(body.password, user.password_hash)`
- [ ] `SECRET_KEY` nem az alapértelmezett érték éles deployban
- [ ] PV jogosultság bypass nincs (más régió rekordjai nem elérhetők)

### Workflow minimum
- [ ] 0 db nyitott Critical finding
- [ ] 0 db nyitott High finding ami a belépő workflow-t érinti
- [ ] CSV generálás: helyes állandó értékek (20, 9999, BB, 91, 2, 100, I)
- [ ] Employee import: duplikált tax_id nem okoz IntegrityError crasht
- [ ] Lezárva trigger: employees tábla frissül BELÉPŐ lezárásakor
- [ ] Státuszgép: csak érvényes átmenetek lehetségesek

---

## No-Go kritériumok (bármelyik automatikusan blokkolja a release-t)

- **Jelszó ellenőrzés hiánya** — bárki beléphet bármilyen jelszóval
- Bármely Critical finding nyitott
- PV más régió adatát láthatja/módosíthatja
- CSV helytelen oszlopba ír adatot
- Employee import UNIQUE constraint crasht okoz
- Státuszgép megkerülhető

---

## Codex prompt
```
Read AGENTS.md and Audit/07_release_gate_audit.md.
Read all finding files in C:\Progrecon-Onboard\Audit\findings\
(look for files matching PO-*-01_*.md through PO-*-06_*.md)

Evaluate:
1. Count all findings by severity: Critical, High, Medium, Low
2. MANDATORY CHECK: Is there a Critical finding about auth/login password verification?
   If yes → automatic NO-GO regardless of other findings.
3. Check if any open Critical or High finding blocks:
   - PV form submission (POST /entries/, PATCH /entries/{id}, POST /entries/{id}/submit)
   - CSV generation (POST /exports/{entry_id})
   - Entry closure (POST /entries/{id}/close)
   - Employee table update on closure
4. List all open Critical and High findings with their IDs
5. Confirm which known acceptable gaps are present (from the list in audit file)
6. Give Go / No-Go recommendation with justification

Write the Go/No-Go report to:
  C:\Progrecon-Onboard\Audit\findings\PO-{YYYYMMDD}-07_release_gate.md

Use the output format below.
```

---

## Output formátum
```md
# Release Gate — Progrecon Onboard

**Dátum:** YYYY-MM-DD
**Audit alapja:** 01–06 audit findings

## Összefoglaló
- Critical findings: X db (Y nyitott)
- High findings: X db (Y nyitott)
- Medium findings: X db
- Low findings: X db
- **Döntés: GO ✅ / NO-GO ❌**

## Blokkoló findings (No-Go okok)
| Finding ID | Severity | Leírás |
|---|---|---|
| PO-YYYYMMDD-001 | Critical | ... |

## Elfogadott hiányosságok (nem blokkolók)
- NAV XML visszatöltés
- Nexon szótár kódok
- ... stb.

## Következő kötelező lépések (sorrendben)
1. ...
2. ...

## Következő ajánlott lépések (release utánra)
1. ...
```

---

## Severity útmutató
- A 07-es audit **nem talál új hibákat** — csak összesíti az 01–06 eredményeit
- A biztonsági minimum (jelszó ellenőrzés) automatikus NO-GO ha hiányzik
- Go/No-Go a fenti kritériumrendszer alapján döntendő
