"""
Export Full Training Dataset
-----------------------------
Extracts all 442 records with EC measurements from the original
Rural Focus dataset for ML model training.

Run from backend/:
    python scripts/export_training_data.py
"""

import sys
import csv
import json
from pathlib import Path

# Path to the original uploaded CSV
ORIGINAL_CSV = Path(__file__).parent.parent.parent / "data" /"rural_focus_turkana.csv.xls"
OUTPUT_PATH  = Path(__file__).parent.parent.parent / "data" / "waterpath_training.json"


def classify_quality(ec: float) -> str:
    if ec <= 800:  return "excellent"
    if ec <= 1500: return "drinkable"
    if ec <= 3000: return "brackish"
    return "saline"


def clean_float(val):
    try:
        return float(str(val).strip())
    except:
        return None


def export():
    if not ORIGINAL_CSV.exists():
        print(f"ERROR: Cannot find original CSV at {ORIGINAL_CSV}")
        print("Update ORIGINAL_CSV path in this script to match your file location.")
        sys.exit(1)

    records = []

    with open(ORIGINAL_CSV, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lat   = clean_float(row.get("latitude"))
            lon   = clean_float(row.get("longitude"))
            ec    = clean_float(row.get("ec"))
            ph    = clean_float(row.get("ph"))
            depth = clean_float(row.get("well_depth"))
            name  = row.get("name", "").strip().replace("\r\n", " ").replace("\n", " ")

            # Must have GPS and EC to be useful for training
            if not lat or not lon or not ec or not name:
                continue

            records.append({
                "name":          name,
                "locality":      row.get("locality", "").strip(),
                "latitude":      lat,
                "longitude":     lon,
                "ec":            ec,
                "ph":            ph,
                "well_depth":    depth,
                "water_quality": classify_quality(ec),
            })

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(records, f, indent=2)

    # Print breakdown
    from collections import Counter
    counts = Counter(r["water_quality"] for r in records)
    print(f"\nExported {len(records)} records to {OUTPUT_PATH}")
    print(f"\nQuality breakdown:")
    for label, count in sorted(counts.items()):
        print(f"  {label:<12} {count} records")
    print(f"\nReady to train. Run:")
    print(f"  python -c \"from ml.quality_predictor import train_model; train_model()\"")


if __name__ == "__main__":
    export()
