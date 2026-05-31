import pandas as pd
import json

results = {}

# Read Mintacsomag 2.0
try:
    xl1 = pd.ExcelFile(r"C:\Progrecon-Onboard\MIntacsomag 2.0.xlsx")
    results["mintacsomag_sheets"] = xl1.sheet_names
    for sheet in xl1.sheet_names:
        df = pd.read_excel(xl1, sheet_name=sheet, nrows=200)
        results[f"mintacsomag_{sheet}"] = df.to_dict(orient="records")
except Exception as e:
    results["mintacsomag_error"] = str(e)

# Read fordito_szotar
try:
    xl2 = pd.ExcelFile(r"C:\Progrecon-Onboard\fordito_szotar.xlsx")
    results["szotar_sheets"] = xl2.sheet_names
    for sheet in xl2.sheet_names:
        df = pd.read_excel(xl2, sheet_name=sheet, nrows=500)
        results[f"szotar_{sheet}"] = df.to_dict(orient="records")
except Exception as e:
    results["szotar_error"] = str(e)

with open(r"C:\Progrecon-Onboard\xlsx_output.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2, default=str)

print("DONE")
