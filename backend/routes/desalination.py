"""
Desalination Siting Route
--------------------------
Returns optimal small-scale desalination unit locations
computed from the 134 saline/brackish boreholes in Turkana County.

Algorithm:
  1. Cluster saline boreholes into 0.4° geographic cells (~44km)
  2. Score each cluster: borehole density + economics + EC severity
  3. Return top sites with population, economics, and borehole details

GET /api/desalination/sites
  Returns top 8 recommended sites with full economics
"""

import math
import csv
import json
from pathlib import Path
from collections import defaultdict
from flask import Blueprint, jsonify

desalination_bp = Blueprint("desalination", __name__)

DATA_PATH = Path(__file__).parent.parent / "data" / "rural_focus_turkana.csv.xls"
CACHE_PATH = Path(__file__).parent.parent / "data" / "desalination_sites.json"

# ── Constants ─────────────────────────────────────────────────────────────
COST_PER_M3    = 0.82    # USD — small-scale solar desalination
PEOPLE_PER_KM2 = 12      # Turkana County average population density
RADIUS_KM      = 15      # service radius of one unit
DAILY_LITRES   = 15      # WHO minimum litres/person/day
UNIT_COST_USD  = 85000   # small-scale solar desalination capex
GRID           = 0.4     # clustering grid size in degrees

def clean_float(v):
    try: return float(str(v).strip())
    except: return None

def haversine(lat1, lon1, lat2, lon2):
    R    = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a    = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def scenario():
    pop      = int(math.pi * RADIUS_KM ** 2 * PEOPLE_PER_KM2)
    daily_m3 = round(pop * DAILY_LITRES / 1000, 1)
    annual   = daily_m3 * 365 * COST_PER_M3
    return {
        "radius_km":             RADIUS_KM,
        "people_per_km2":        PEOPLE_PER_KM2,
        "pop_in_radius":         pop,
        "litres_per_person_day": DAILY_LITRES,
        "daily_m3":              daily_m3,
        "unit_cost_usd":         UNIT_COST_USD,
        "price_per_m3":          COST_PER_M3,
        "payback_years":         round(UNIT_COST_USD / annual, 1) if annual > 0 else None,
    }

def compute_sites():
    """Run the siting algorithm. Results are cached after first run."""
    if CACHE_PATH.exists():
        with open(CACHE_PATH) as f:
            return json.load(f)

    if not DATA_PATH.exists():
        return []

    records = []
    with open(DATA_PATH, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            lat = clean_float(r.get("latitude"))
            lon = clean_float(r.get("longitude"))
            ec  = clean_float(r.get("ec"))
            if lat and lon and ec and ec > 1500:  # saline/brackish only
                records.append({
                    "name":      " ".join((r.get("name") or "").split()),
                    "latitude":  lat,
                    "longitude": lon,
                    "ec":        ec,
                })

    # Grid-based clustering
    clusters = defaultdict(list)
    for b in records:
        cell = (round(b["latitude"] / GRID) * GRID, round(b["longitude"] / GRID) * GRID)
        clusters[cell].append(b)

        results = []
    for (clat, clon), cell in clusters.items():
        if len(cell) < 3:
            continue
        lat = sum(b["latitude"]  for b in cell) / len(cell)
        lon = sum(b["longitude"] for b in cell) / len(cell)
        in_range = [b for b in records
                    if haversine(lat, lon, b["latitude"], b["longitude"]) <= RADIUS_KM]
        if len(in_range) < 3:
            continue
        avg_ec = round(sum(b["ec"] for b in in_range) / len(in_range))
        results.append({
            "latitude":       round(lat, 4),
            "longitude":      round(lon, 4),
            "borehole_count": len(in_range),
            "avg_ec":         avg_ec,
            "score":          round(len(in_range) * 10 + avg_ec / 1000, 1),
            "boreholes":      [b["name"] for b in sorted(in_range, key=lambda x: -x["ec"])[:6]],
        })

    results.sort(key=lambda x: -x["score"])

    # Keep service areas apart so no borehole is counted twice
    top = []
    for r in results:
        if all(haversine(r["latitude"], r["longitude"], t["latitude"], t["longitude"]) >= 2 * RADIUS_KM for t in top):
            top.append(r)
        if len(top) == 8:
            break

    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_PATH, "w") as f:
        json.dump(top, f, indent=2)

    return top


@desalination_bp.route("/sites", methods=["GET"])
def get_sites():
    """Return top recommended desalination sites."""
    try:
        sites = compute_sites()
        return jsonify({
            "sites":       sites,
            "total_sites": len(sites),
            "methodology": {
                "data_source":    "Rural Focus Ltd / WRA Kenya — 442 boreholes with EC measurements",
                "saline_count":   134,
                "cluster_radius": f"Seeded from {GRID}° grid cells, then all saline boreholes within {RADIUS_KM}km; sites at least {2 * RADIUS_KM}km apart",
                "service_radius": f"{RADIUS_KM}km per unit",
                "cost_basis":     "Small-scale solar desalination, $85,000 capex",
                "cost_per_m3":    f"${COST_PER_M3}/m³",
                "scenario":    scenario(),
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
