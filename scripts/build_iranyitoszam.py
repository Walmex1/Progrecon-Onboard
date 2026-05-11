import openpyxl, json

wb = openpyxl.load_workbook(r"C:\Progrecon-Onboard\iranyitoszam.xlsx", read_only=True)
ws = wb.active

result = {}
first_row = True
for row in ws.iter_rows(values_only=True):
    if first_row:
        first_row = False
        continue  # fejléc kihagyása
    irszam, telepules, megye = row[0], row[1], row[2]
    if irszam is None or telepules is None:
        continue
    key = str(int(irszam))
    if key not in result:  # csak az első előfordulást vesszük fel
        result[key] = {
            "telepules": telepules,
            "megye": megye if megye else None
        }

with open(
    r"C:\Progrecon-Onboard\frontend\src\data\iranyitoszamok.json",
    "w", encoding="utf-8"
) as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Kész. {len(result)} irányítószám írva.")
