from datetime import date, timedelta

# --- Adóazonosító jel (10 számjegy) ---

def validate_tax_id(tax_id: str) -> tuple[bool, str]:
    if not tax_id.isdigit() or len(tax_id) != 10:
        return False, "Az adóazonosító jel 10 számjegyből áll"

    if tax_id[0] != "8":
        return False, "Az adóazonosító jel 8-cal kezdődik"

    # 2-6. számjegy = 1867.01.01 óta eltelt napok száma
    days_since = int(tax_id[1:6])
    base = date(1867, 1, 1)
    try:
        birth_from_tax = base + timedelta(days=days_since)
    except OverflowError:
        return False, "Az adóazonosítóból nem fejthető vissza érvényes születési dátum"

    # Ellenőrző szám (10. számjegy)
    weights = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    total = sum(int(tax_id[i]) * weights[i] for i in range(9))
    check = total % 11
    if check != int(tax_id[9]):
        return False, "Az adóazonosító jel ellenőrző száma hibás"

    return True, ""

def get_birthdate_from_tax_id(tax_id: str) -> date | None:
    try:
        days_since = int(tax_id[1:6])
        return date(1867, 1, 1) + timedelta(days=days_since)
    except Exception:
        return None

def cross_validate_tax_and_birthdate(tax_id: str, birth_date: date) -> tuple[bool, str]:
    derived = get_birthdate_from_tax_id(tax_id)
    if derived is None:
        return False, "Az adóazonosítóból nem fejthető vissza születési dátum"
    if derived != birth_date:
        return False, f"Az adóazonosítóból {derived} születési dátum következik, de {birth_date} lett megadva"
    return True, ""


# --- TAJ szám (9 számjegy) ---

def validate_taj(taj: str) -> tuple[bool, str]:
    taj = taj.replace("-", "").replace(" ", "")
    if not taj.isdigit() or len(taj) != 9:
        return False, "A TAJ szám 9 számjegyből áll"

    weights = [3, 7, 3, 7, 3, 7, 3, 7]
    total = sum(int(taj[i]) * weights[i] for i in range(8))
    check = total % 10
    if check != int(taj[8]):
        return False, "A TAJ szám ellenőrző száma hibás"

    return True, ""


# --- Bankszámlaszám ---

def validate_bank_account(account: str) -> tuple[bool, str]:
    cleaned = account.replace("-", "").replace(" ", "")
    if not cleaned.isdigit():
        return False, "A bankszámlaszám csak számokat és kötőjeleket tartalmazhat"
    if len(cleaned) not in (16, 24):
        return False, "A bankszámlaszám 2×8 vagy 3×8 számjegyből áll (kötőjellel vagy anélkül)"
    return True, ""


# --- Összesített validáció egy belépő form_data-ra ---

def validate_entry_form(form_data: dict) -> list[dict]:
    errors = []

    def check(field: str, validator_result: tuple[bool, str]):
        ok, msg = validator_result
        if not ok:
            errors.append({"field": field, "message": msg})

    tax_id = form_data.get("adoazonosito", "")
    taj = form_data.get("taj", "")
    bank = form_data.get("bankszamlaszam", "")
    birth_str = form_data.get("szuletesi_datum", "")

    if tax_id:
        check("adoazonosito", validate_tax_id(tax_id))

    if taj:
        check("taj", validate_taj(taj))

    if bank:
        check("bankszamlaszam", validate_bank_account(bank))

    # Keresztvalidáció: adóazonosító ↔ születési dátum
    if tax_id and birth_str:
        try:
            birth_date = date.fromisoformat(birth_str)
            check("adoazonosito", cross_validate_tax_and_birthdate(tax_id, birth_date))
        except ValueError:
            errors.append({"field": "szuletesi_datum", "message": "Érvénytelen dátum formátum (ÉÉÉÉ-HH-NN)"})

    # SZÉP-kártya: ha bármelyik mező meg van adva, mind kötelező
    szep_fields = ["szep_kartya_szam", "szep_kartya_kibocsato", "szep_kedvezmenyezett"]
    szep_filled = [f for f in szep_fields if form_data.get(f)]
    if szep_filled and len(szep_filled) != len(szep_fields):
        missing = [f for f in szep_fields if not form_data.get(f)]
        for f in missing:
            errors.append({"field": f, "message": "Ha SZÉP-kártya adatot adsz meg, minden SZÉP-kártya mező kötelező"})

    # Munkaidő ↔ foglalkozási viszony keresztvalidáció
    munkaidо = form_data.get("munkaidо_napi_ora")
    fogl_viszony = form_data.get("foglalkozasi_viszony")
    teljes_munkaidos = {"01", "05", "41"}  # Teljes munkaidős, TM nyugdíjas, TM GYED
    if munkaidо and fogl_viszony:
        if str(munkaidо) != "8" and fogl_viszony in teljes_munkaidos:
            errors.append({
                "field": "foglalkozasi_viszony",
                "message": "Teljes munkaidős foglalkozási viszony csak 8 órás munkaidőnél választható",
            })
        if str(munkaidо) == "8" and fogl_viszony not in teljes_munkaidos:
            errors.append({
                "field": "foglalkozasi_viszony",
                "message": "8 órás munkaidőnél csak teljes munkaidős foglalkozási viszony választható",
            })

    return errors
