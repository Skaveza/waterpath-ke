"""
Seed Script — Import Cleaned Borehole Data into Firestore
----------------------------------------------------------
Run once to populate your Firestore water_points collection
with the 60 cleaned records from the Rural Focus dataset.

Usage:
    cd backend
    python scripts/seed_firestore.py

Prerequisites:
    - Firebase service account JSON in backend/firebase-service-account.json
    - .env file configured
    - pip install -r requirements.txt
"""

import sys
import json
from pathlib import Path

# Allow imports from backend root
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import db
import uuid

DATA_PATH = Path(__file__).parent.parent.parent / "data" / "waterpath_boreholes.json"

# Map water quality to Firestore operation_status default
def infer_status(record: dict) -> str:
    raw = record.get("operation_status", "").lower()
    wq  = record.get("water_quality", "")

    if any(x in raw for x in ["dry", "abandon", "no water", "blocked", "salty"]):
        return "non_functional"
    if wq == "saline":
        return "non_functional"   # needs desalination — not usable as-is
    if any(x in raw for x in ["y", "pump", "hand"]):
        return "functional"
    return "unknown"


def seed():
    with open(DATA_PATH) as f:
        records = json.load(f)

    collection = db.collection("water_points")
    batch      = db.batch()
    count      = 0

    print(f"Seeding {len(records)} borehole records into Firestore...\n")

    for r in records:
        # Generate a clean document ID from name
        raw_id = r.get("id") or ""
        doc_id = raw_id if raw_id else f"wp-{uuid.uuid4().hex[:8]}"
        doc_id = doc_id.lower().replace(" ", "-").replace("/", "-")[:40]

        doc = {
            "id":                   doc_id,
            "name":                 r.get("name", "Unknown"),
            "locality":             r.get("locality", ""),
            "latitude":             float(r["latitude"]),
            "longitude":            float(r["longitude"]),
            "water_quality":        r.get("water_quality", "unknown"),
            "ec":                   r.get("ec"),
            "ph":                   r.get("ph"),
            "well_depth":           r.get("well_depth"),
            "yield_ls":             r.get("yield_ls"),
            "operation_status":     infer_status(r),
            "source":               r.get("source", "Rural Focus Ltd / WRA Kenya"),
            "drilling_date":        r.get("drilling_date", ""),
            "report_count":         0,
            "last_report_at":       "",
            "predicted_quality":    None,
            "prediction_confidence":None,
        }

        ref = collection.document(doc_id)
        batch.set(ref, doc)
        count += 1

        # Firestore batch limit is 500 — flush and start new batch
        if count % 400 == 0:
            batch.commit()
            batch = db.batch()
            print(f"  Committed {count} records...")

    batch.commit()
    print(f"\nDone. {count} water points seeded into Firestore.")
    print("Collection: water_points")
    print("\nNext step: run the ML trainer to generate quality predictions")
    print("  python -c \"from ml.quality_predictor import train_model; train_model()\"")


if __name__ == "__main__":
    seed()
