import csv
import io
from datetime import date

# CSV kódolás és elválasztó — tisztázandó a megrendelővel!
# Jelenlegi feltételezés: Windows-1250, pontosvessző
CSV_ENCODING = "cp1250"
CSV_DELIMITER = ";"

MUNKAIDО_SZABALY = {
    "2": {"col_168": "2",   "col_108": "43.5"},
    "4": {"col_168": "4",   "col_108": "87"},
    "6": {"col_168": "6",   "col_108": "130.5"},
    "8": {"col_168": "",    "col_108": ""},
}

def _val(form: dict, key: str, default: str = "") -> str:
    return str(form.get(key, default) or default)

def _jogviszony_kezdete(form: dict) -> str:
    return _val(form, "jogviszony_kezdete")

def _nev(form: dict) -> str:
    return f"{_val(form, 'vezeteknev')} {_val(form, 'keresztnev')}".strip()


# --- NBTorzs.csv (52 oszlop) ---

def generate_nb_torzs(form: dict) -> list[str]:
    jk = _jogviszony_kezdete(form)
    munkaidо = _val(form, "munkaidо_napi_ora", "8")
    ora_szabaly = MUNKAIDО_SZABALY.get(munkaidо, MUNKAIDО_SZABALY["8"])

    row = [""] * 53  # 1-alapú indexelés, 0. hely üres

    row[1]   = _val(form, "elonev")
    row[2]   = _val(form, "vezeteknev")
    row[3]   = _val(form, "keresztnev")
    row[6]   = _val(form, "adoazonosito")
    row[8]   = _val(form, "taj")
    row[9]   = _val(form, "torzsszam")
    row[10]  = _val(form, "anyja_neve")
    row[11]  = _val(form, "szuletesi_nev")
    row[12]  = _val(form, "szuletesi_hely")
    row[13]  = _val(form, "szuletesi_datum")
    row[14]  = _val(form, "neme")
    row[17]  = _val(form, "allampolgarsag")
    row[21]  = _val(form, "kozterulet")
    row[28]  = _val(form, "lakcim_orszag")
    row[29]  = _val(form, "lakcim_iranyitoszam")
    row[30]  = _val(form, "lakcim_telepules")
    row[33]  = _val(form, "lakcim_kozterulet_jellege")
    row[34]  = _val(form, "lakcim_hazszam")
    row[35]  = _val(form, "lakcim_epulet")
    row[36]  = _val(form, "lakcim_lepcsoehaz")
    row[37]  = _val(form, "lakcim_emelet")
    row[38]  = _val(form, "lakcim_ajto")

    # Tartózkodási hely (opcionális)
    row[41]  = _val(form, "tart_iranyitoszam")
    row[42]  = _val(form, "tart_telepules")
    row[44]  = _val(form, "tart_kozterulet")
    row[45]  = _val(form, "tart_kozterulet_jellege")
    row[46]  = _val(form, "tart_hazszam")
    row[47]  = _val(form, "tart_epulet")
    row[48]  = _val(form, "tart_lepcsoehaz")
    row[49]  = _val(form, "tart_emelet")
    row[50]  = _val(form, "tart_ajto")

    row[55]  = _val(form, "telefonszam")
    row[57]  = _val(form, "email")

    # Jogviszony
    row[59]  = "20"   # Jogviszony jellege — állandó
    row[60]  = jk
    row[61]  = _val(form, "jogviszony_vege")

    # Foglalkozási viszony
    row[74]  = _val(form, "berezesi_mod")
    row[75]  = jk
    row[84]  = _val(form, "egyseg")
    row[85]  = jk
    row[86]  = _val(form, "feor")
    row[87]  = jk
    row[88]  = _val(form, "foglalkozasi_viszony")
    row[89]  = jk
    row[92]  = _val(form, "koltseghelyKod")
    row[93]  = jk
    row[96]  = _val(form, "munkakor")
    row[97]  = jk
    row[100] = _val(form, "regio")
    row[101] = jk
    row[102] = "9999"  # Divízió — állandó
    # row[103] = divízió kezdete — szabály tisztázandó

    # Munkaidő szabály
    row[108] = ora_szabaly["col_108"]
    row[168] = ora_szabaly["col_168"]

    return row[1:]  # 1-től 52-ig


# --- NBJuttat.csv (5 oszlop) ---

def generate_nb_juttat(form: dict) -> list[str]:
    jk = _jogviszony_kezdete(form)
    return [
        _val(form, "adoazonosito"),   # 1 - azonosító
        "",                            # 2
        "BB",                          # 3 - besorolási bér kódja — állandó
        _val(form, "besorolasi_ber"), # 4 - összeg
        "",                            # 5
        jk,                            # 6 - kezdete
        "",                            # 7
        jk,                            # 8 - hatályba lépés
    ]


# --- NBLevon.csv (9 oszlop) ---

def generate_nb_levon(form: dict) -> list[str]:
    jk = _jogviszony_kezdete(form)
    nev = _val(form, "kedvezmenyezett_neve") or _nev(form)
    kozlemeny = f"{_nev(form)} Munkabér"
    return [
        _val(form, "adoazonosito"),   # 1
        "91",                          # 2 - levonás kód — állandó
        _val(form, "bankszamlaszam"), # 3
        nev,                           # 4 - kedvezményezett
        kozlemeny,                     # 5 - közlemény
        "2",                           # 6 - utalás típusa — állandó
        "100",                         # 7 - százalék — állandó
        "I",                           # 8 - hóközi — állandó
        jk,                            # 9 - érv.tól
    ]


# --- NBSZEPKAdat.csv (7 oszlop) — csak ha van SZÉP-kártya adat ---

def generate_nb_szep(form: dict) -> list[str] | None:
    szep_szam = _val(form, "szep_kartya_szam")
    if not szep_szam:
        return None
    jk = _jogviszony_kezdete(form)
    nev = _val(form, "szep_kedvezmenyezett") or _nev(form)
    kozlemeny = f"{_nev(form)} Munkabér"
    return [
        _val(form, "adoazonosito"),        # 1
        szep_szam,                          # 2
        _val(form, "szep_kartya_kibocsato"), # 3 - K&H=1, MKB=2, OTP=3
        nev,                                # 4
        kozlemeny,                          # 5
        "2",                                # 6 - zseb — állandó
        jk,                                 # 7
    ]


# --- CSV fájl összerakása (több munkavállalóhoz) ---

def build_csv(header_cols: list[str], rows: list[list[str]]) -> bytes:
    output = io.StringIO()
    writer = csv.writer(output, delimiter=CSV_DELIMITER, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(header_cols)
    writer.writerows(rows)
    return output.getvalue().encode(CSV_ENCODING, errors="replace")


# --- Fő generáló függvény: egy belépőhöz visszaadja az összes CSV-t ---

def generate_csvs_for_entry(form_data: dict) -> dict[str, bytes]:
    result = {}

    torzs_header = [str(i) for i in range(1, 53)]
    result["NBTorzs.csv"] = build_csv(torzs_header, [generate_nb_torzs(form_data)])

    juttat_header = [str(i) for i in range(1, 9)]
    result["NBJuttat.csv"] = build_csv(juttat_header, [generate_nb_juttat(form_data)])

    levon_header = [str(i) for i in range(1, 10)]
    result["NBLevon.csv"] = build_csv(levon_header, [generate_nb_levon(form_data)])

    szep = generate_nb_szep(form_data)
    if szep:
        szep_header = [str(i) for i in range(1, 8)]
        result["NBSZEPKAdat.csv"] = build_csv(szep_header, [szep])

    return result
