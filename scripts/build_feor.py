import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "feor08_kodok.md"
TARGET = ROOT / "frontend" / "src" / "data" / "feor08.json"
PATTERN = re.compile(r"^\s*-\s+\*\*(\d{4})\*\*\s+(.+)$")


def main():
    feor_codes = {}
    for line in SOURCE.read_text(encoding="utf-8").splitlines():
        match = PATTERN.match(line)
        if match:
            code, name = match.groups()
            feor_codes[code] = name.strip()

    if not feor_codes:
        raise RuntimeError(f"No FEOR codes found in {SOURCE}")

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(
        json.dumps(feor_codes, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(feor_codes)} FEOR codes to {TARGET}")


if __name__ == "__main__":
    main()
