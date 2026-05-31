---
purpose: Progrecon Onboard – végrehajtható audit procedure
output_language: hu
mode: audit_only_first
rule: Először csak hibákat listázz, kódot ne módosíts, amíg külön nem kérem.
---

# 04 — Frontend state és validáció audit

## Cél
A React form state kezelésének, az auto-mentés logikájának, a jogosultság-vezérlésnek,
a validációnak, a toast rendszernek és az options konzisztenciájának ellenőrzése.

## Olvasandó fájlok
- `frontend/src/hooks/useEntryForm.js`
- `frontend/src/hooks/useEntryValidation.js`
- `frontend/src/pages/NewEntry.jsx`
- `frontend/src/pages/EntryList.jsx`
- `frontend/src/pages/Home.jsx`
- `frontend/src/pages/Payroll.jsx`
- `frontend/src/store/auth.jsx`
- `frontend/src/api/client.js`
- `frontend/src/constants/options.js`

## Architektúrális tények (lásd AGENTS.md)
- Form state és logika: `useEntryForm.js` — NewEntry.jsx csak rendert tartalmaz
- Validáció: `useEntryValidation.js` — React-független `validateField(field, value, currentForm)`
- Auth store: token, role, region, person tárolva localStorage-ban — **NEM costCenterIds tömb**
- Autosave: 1500ms debounce + cleanup + `submitDone` guard
- 401: `localStorage.clear()` + redirect /login (client.js interceptor)
- options.js: REGIO_OPTIONS, EGYSEG_OPTIONS, KOLTSEGHELYAZ_OPTIONS **NEM** szerepelnek
- TELJES_MUNKAIDOS = ["01", "05", "41"] — string tömb (nem opciók objektum!)

## Audit lépések

### 1. Auto-mentés logika (useEntryForm.js)
- Debounce: `setTimeout(1500ms)` + `clearTimeout` a useEffect-ben?
- Cleanup: `return () => clearTimeout(autoSaveTimer.current)` megvan-e?
- `submitDone` guard: ha `submitDone == true`, az autosave useEffect nem fut-e?
- `entryId` guard: ha nincs `entryId`, `autoSave` nem fut-e?
- `autoSave` hiba: `setSaveError(true)` megvan-e? A user valahogy értesül-e? (saveError state → piros ikon stb.)
- `autoSave` hiba NEM okoz toast-ot — ez szándékos design, nem hiba

### 2. ensureEntry logika
- `creatingEntryRef.current`: Promise tároló, megakadályozza-e a párhuzamos rekord létrehozást?
- `cost_center_id: null` küldés a `POST /entries/`-nek: a backend `EntryRecordCreate` sémában `cost_center_id: int` (nem Optional) — ez **422-t okoz**!
  - Ez potenciálisan High severity finding
- `navigate(`/belepok/${res.data.id}`, { replace: true })`: helyes navigáció?

### 3. Form validáció — "reward early, punish late" logika
- `set(field, value)`: ha mező `touched`, validáció fut onChange-re?
- `set(field, value)`: ha mező **nem** touched, a hiba csak törlődik (nem validál)?
- `onBlur(field)`: `touched[field] = true` + `validateField` fut?
- `validateField` lefedi-e az összes kritikus mezőt?

### 4. useEntryValidation.js — validált mezők
Ellenőrizd, hogy az alábbiak mindegyike implementálva van-e:
- `adoazonosito`: 10 számjegy, `v[0] === "8"`, checksum (súlyok [1..9], mod 11), cross-validáció `szuletesi_datum`-mal
- `szuletesi_datum`: ÉÉÉÉ-HH-NN formátum regex, cross-validáció `adoazonosito`-val
- `taj`: 9 számjegy (csak digitek után `\D` strip), checksum (súlyok [3,7,3,7,3,7,3,7], mod 10)
- `bankszamlaszam`: kötőjelek eltávolítása után 16 vagy 24 számjegy (`/^\d{16}$|^\d{24}$/`)
- `jogviszony_kezdete`, `jogviszony_vege`: ÉÉÉÉ-HH-NN formátum regex
- `email`: `@domain.tld` formátum

### 5. SZÉP-kártya logika (useEntryForm.js)
- `szepAnyFilled`: `!!(form.szep_kartya_szam || form.szep_kartya_kibocsato || form.szep_kedvezmenyezett)`?
- `STEP_REQUIRED_FIELDS[5]`: tartalmazza-e a 3 SZÉP mezőt?
- `isStepComplete(5)`: ha `!szepAnyFilled` → `false` (stepper jelzi hogy a lépés nem szükséges)?
- Backend `validate_entry_form`: SZÉP mezők keresztvalidációja is fut CSV generáláskor

### 6. Jogosultság-vezérlés frontenden
- `submitDone`: ha `true`, a form mezői nem szerkeszthetők-e? (`submitDone` passzolva az F komponensnek?)
- `submitDone`: az autosave useEffect ne fusson ha `submitDone == true`?
- useEffect (role-check): ha user nem pv/admin → `navigate("/", { replace: true })`?
- `EntryList.jsx`: a bérszámfejtő nem látja-e a `folyamatban` státuszú rekordokat?
  (Backenden szűrt, de frontenden is van-e kiegészítő szűrés?)

### 7. Auth store (auth.jsx)
- `localStorage`: token, role, region, person mezők tárolva?
- `costCenterIds` **NEM** szerepel-e? (régi architektúra)
- `person`: `JSON.parse(localStorage.getItem("person") || "null")` — helyes?
- `login()`: region hiánya esetén `localStorage.removeItem("region")` megvan-e?
- `logout()`: `localStorage.clear()` megvan-e?

### 8. client.js interceptor — 422 kizárás logikája (kritikus)
A jelenlegi kód:
```js
if (!(url.includes("/entries/") && method === "post")) {
  toast.warning("Hiányos vagy hibás adatok. [PO-ERR-422]");
}
```
- Ez kizárja az összes POST hívást amelynek URL-jében szerepel "/entries/"
- Ez kizárja: `POST /entries/` (rekord létrehozás) ÉS `POST /entries/{id}/submit` ÉS `POST /entries/{id}/recall` ÉS `POST /entries/{id}/close`
- **Szándékos-e?** A submit 422 hibáját a `useEntryForm.js` kezeli — de a create 422 hibája is elnyelődik?
- Ez potenciálisan **High** severity: ha a rekord létrehozás 422-vel hibázik, a user nem értesül

### 9. options.js konzisztencia
- REGIO_OPTIONS, EGYSEG_OPTIONS, KOLTSEGHELYAZ_OPTIONS: valóban **NEM** szerepelnek-e?
- TELJES_MUNKAIDOS: `["01", "05", "41"]` tömb (nem opciók objektum) — a `foglalkozasiOptions()` ezt helyesen használja-e?
- MUNKAKOR_OPTIONS: csak `{ value: "OPERATOR", label: "Operátor" }` placeholder?
- ALLAMPOLGARSAG_OPTIONS: "OTHER" értékkel placeholder kódok (HU, SK, RO... nem Nexon kódok)?
- ORSZAG_OPTIONS: szintén placeholder kódok?
- NEME_OPTIONS: `{ value: "1", ... }, { value: "2", ... }` — egyezik-e a CSV-be kerülő értékekkel?

### 10. Home.jsx — stat kártyák
- `PvHome`: `/pv/stats/` hívás → `total_all` employees táblából, cc-nkénti bontás?
- `PvHome`: draftCount (`folyamatban`), sentCount (`elküldve`) külön API hívásból?
- `AdminHome`: `/pv/stats/` admin is hívhatja (a backend megengedi)?
- Hibakezelés: `setError` state, piros doboz megjelenik-e?
- `active` flag: cleanup `return () => { active = false; }` megakadályozza-e a memória szivárgást?

## Codex prompt
```
Read AGENTS.md and Audit/04_frontend_state_audit.md.
Audit only:
  frontend/src/hooks/useEntryForm.js
  frontend/src/hooks/useEntryValidation.js
  frontend/src/pages/NewEntry.jsx
  frontend/src/pages/EntryList.jsx
  frontend/src/pages/Home.jsx
  frontend/src/pages/Payroll.jsx
  frontend/src/store/auth.jsx
  frontend/src/api/client.js
  frontend/src/constants/options.js
Do not modify code.
Find:
- autosave: 1500ms setTimeout + clearTimeout cleanup + submitDone && entryId guards?
- ensureEntry: cost_center_id: null sent to POST /entries/ — backend schema requires int, causes 422?
- 422 interceptor: url.includes("/entries/") && method === "post" — does this accidentally suppress
  422 errors from POST /entries/ (create) and POST /entries/{id}/recall and /close too?
- validateField: all listed validations present? (adoazonosito checksum, taj checksum,
  bankszamla 16|24, date regex, cross-validation for adoazonosito↔szuletesi_datum)?
- auth.jsx: no costCenterIds stored? logout calls localStorage.clear()?
- options.js: no REGIO/EGYSEG/KOLTSEGHELYAZ? TELJES_MUNKAIDOS is array not options?
- MUNKAKOR_OPTIONS: only OPERATOR placeholder?
- ALLAMPOLGARSAG and ORSZAG: placeholder ISO codes (not Nexon codes)?
- submitDone: prevents autosave and form editing?
- Home.jsx: active flag cleanup present in both PvHome and AdminHome useEffect?
Return findings with file + line number evidence.
Write all findings to: C:\Progrecon-Onboard\Audit\findings\PO-{YYYYMMDD}-04_frontend_state.md
Use the finding format from AGENTS.md. If no findings, write a single Info entry.
```

## Severity útmutató
- **Critical:** form state elvész navigáció/refresh-kor, jogosultság bypass
- **High:** ensureEntry null cost_center_id → 422 silent failure, 422 interceptor túl tág kizárása, validáció hiánya kötelező mezőnél
- **Medium:** SZÉP feltétel nem érvényesül, placeholder Nexon kódok (nem működő CSV), submitDone nem véd
- **Low:** UX hiányosságok, kód minőség
