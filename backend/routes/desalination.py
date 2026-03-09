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
                    "name":      r.get("name", "").strip(),
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
    for (clat, clon), boreholes in clusters.items():
        if len(boreholes) < 3:
            continue

        lat = sum(b["latitude"]  for b in boreholes) / len(boreholes)
        lon = sum(b["longitude"] for b in boreholes) / len(boreholes)

        area_km2       = math.pi * RADIUS_KM ** 2
        pop_served     = int(area_km2 * PEOPLE_PER_KM2)
        daily_m3       = round((pop_served * DAILY_LITRES) / 1000, 1)
        annual_revenue = daily_m3 * 365 * COST_PER_M3
        breakeven_yrs  = round(UNIT_COST_USD / annual_revenue, 1) if annual_revenue > 0 else 99
        avg_ec         = round(sum(b["ec"] for b in boreholes) / len(boreholes), 0)
        score          = len(boreholes) * 10 + (1 / breakeven_yrs) * 50 + (avg_ec / 1000)

        results.append({
            "latitude":       round(lat, 4),
            "longitude":      round(lon, 4),
            "borehole_count": len(boreholes),
            "avg_ec":         avg_ec,
            "pop_served":     pop_served,
            "daily_m3":       daily_m3,
            "cost_per_m3":    COST_PER_M3,
            "unit_cost_usd":  UNIT_COST_USD,
            "breakeven_yrs":  breakeven_yrs,
            "score":          round(score, 1),
            "boreholes":      [b["name"] for b in boreholes[:6]],
            "highest_ec":     sorted(boreholes, key=lambda x: -x["ec"])[:2],
        })

    results.sort(key=lambda x: -x["score"])
    top = results[:8]

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
                "cluster_radius": f"{GRID}° grid (~44km)",
                "service_radius": f"{RADIUS_KM}km per unit",
                "cost_basis":     "Small-scale solar desalination, $85,000 capex",
                "cost_per_m3":    f"${COST_PER_M3}/m³",
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
