import csv
from pathlib import Path

CSV = Path(__file__).resolve().parents[2] / "data" / "rural_focus_turkana.csv"

def to_float(v):
    try:
        return float(str(v).strip())
    except (TypeError, ValueError):
        return None

with open(CSV, encoding="utf-8", errors="replace", newline="") as f:
    reader = csv.DictReader(f)
    print("Columns:", reader.fieldnames)
    rows = list(reader)

has_ec = [r for r in rows if to_float(r.get("ec"))]
has_gps = [r for r in rows if to_float(r.get("latitude")) and to_float(r.get("longitude"))]
usable = [r for r in has_ec if to_float(r.get("latitude")) and to_float(r.get("longitude")) and (r.get("name") or "").strip()]

print("Total rows:", len(rows))
print("With GPS coordinates:", len(has_gps))
print("With EC measurement:", len(has_ec))
print("Without EC measurement:", len(rows) - len(has_ec))
print("Same filter as your training export:", len(usable))

ec_vals = [to_float(r["ec"]) for r in has_ec]
print("EC > 1500 (brackish or saline):", sum(1 for v in ec_vals if v > 1500))
print("EC > 3000 (saline):", sum(1 for v in ec_vals if v > 3000))