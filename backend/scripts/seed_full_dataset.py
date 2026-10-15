"""
Seed the full Rural Focus Turkana dataset into Firestore (non-destructive).
Documents that already exist are left untouched, including report counts.
Run from backend/:
    python scripts/seed_full_dataset.py --dry-run
    python scripts/seed_full_dataset.py
"""
import argparse
import csv
import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import db

CSV_PATH = Path(__file__).resolve().parents[2] / "data" / "rural_focus_turkana.csv"


def to_float(v):
    try:
        return float(str(v).strip())
    except (TypeError, ValueError):
        return None


def classify_quality(ec):
    if ec is None:
        return "unknown"
    if ec <= 800:
        return "excellent"
    if ec <= 1500:
        return "drinkable"
    if ec <= 3000:
        return "brackish"
    return "saline"


def infer_status(raw, quality):
    raw = (raw or "").lower()
    if any(x in raw for x in ["dry", "abandon", "no water", "blocked", "salty"]):
        return "non_functional"
    if quality == "saline":
        return "non_functional"
    if any(x in raw for x in ["y", "pump", "hand"]):
        return "functional"
    return "unknown"


def make_id(row, seen):
    raw = (row.get("original_id") or "").strip()
    if not raw:
        key = f"{row.get('name', '')}|{row.get('latitude', '')}|{row.get('longitude', '')}"
        raw = "wp-" + hashlib.sha1(key.encode()).hexdigest()[:8]
    doc_id = raw.lower().replace(" ", "-").replace("/", "-")[:40]
    base, n = doc_id, 2
    while doc_id in seen:
        doc_id = f"{base}-{n}"
        n += 1
    seen.add(doc_id)
    return doc_id


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with open(CSV_PATH, encoding="utf-8", errors="replace", newline="") as f:
        rows = list(csv.DictReader(f))

    collection = db.collection("water_points")
    existing_docs = list(collection.stream())
    existing = {d.id for d in existing_docs}
    existing_keys = set()
    for d in existing_docs:
        x = d.to_dict()
        if x.get("latitude") is not None and x.get("longitude") is not None:
            existing_keys.add((round(float(x["latitude"]), 4), round(float(x["longitude"]), 4)))

    seen, new_docs = set(), []
    already, bad = 0, 0
    for row in rows:
        lat, lon = to_float(row.get("latitude")), to_float(row.get("longitude"))
        if not lat or not lon:
            bad += 1
            continue
        key = (round(lat, 4), round(lon, 4))
        doc_id = make_id(row, seen)
        if doc_id in existing or key in existing_keys:
            already += 1
            continue
        ec = to_float(row.get("ec"))
        quality = classify_quality(ec)
        name = " ".join((row.get("name") or "").split()) or "Unnamed borehole"
        new_docs.append((doc_id, {
            "id": doc_id,
            "name": name,
            "locality": (row.get("locality") or "").strip(),
            "latitude": lat,
            "longitude": lon,
            "water_quality": quality,
            "has_measurement": ec is not None,
            "ec": ec,
            "ph": to_float(row.get("ph")),
            "well_depth": to_float(row.get("well_depth")),
            "yield_ls": to_float(row.get("yield")),
            "operation_status": infer_status(row.get("operation_status"), quality),
            "source": "Rural Focus Ltd / WRA Kenya",
            "drilling_date": (row.get("drilling_end_date") or "").strip(),
            "report_count": 0,
            "last_report_at": "",
        }))

    untested = sum(1 for _, d in new_docs if not d["has_measurement"])
    print(f"CSV rows: {len(rows)} | skipped (no GPS): {bad}")
    print(f"Documents already in Firestore: {len(existing)} | CSV rows matching them: {already}")
    print(f"New documents to add: {len(new_docs)} ({untested} with no EC measurement)")

    if args.dry_run:
        print("Dry run: nothing written.")
        return

    batch, n = db.batch(), 0
    for doc_id, doc in new_docs:
        batch.set(collection.document(doc_id), doc)
        n += 1
        if n % 400 == 0:
            batch.commit()
            batch = db.batch()
    if n % 400:
        batch.commit()
    print(f"Done. {n} water points added.")


if __name__ == "__main__":
    main()