"""
USSD Handler — WaterPath Kenya
--------------------------------
Handles USSD sessions via Africa's Talking.
Works on any phone in Kenya — no smartphone or internet required.

Session flow:
  Dial *384*1#
  → Main menu
    1. Find nearest water
    2. Report a problem
    3. About WaterPath

Find nearest water:
  → Lists 3 nearest functional/unknown boreholes by locality
  → Shows water quality and status

Report a problem:
  → Select problem type (6 options)
  → Enter borehole number (from nearest list)
  → Confirm → writes to Firestore reports collection

Test via Africa's Talking simulator:
  https://simulator.africastalking.com
"""

import os
from flask import Blueprint, request, Response
from firebase_admin import firestore

ussd_bp = Blueprint("ussd", __name__)

# ── Firestore client ──────────────────────────────────────────────────────
def get_db():
    return firestore.client()

# ── Haversine distance ────────────────────────────────────────────────────
import math

def haversine(lat1, lon1, lat2, lon2):
    R    = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a    = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

# ── Default location clusters by Turkana sub-county ──────────────────────
# Used when caller's GPS is unavailable — maps phone area codes to regions
AREA_DEFAULTS = {
    "default": (3.1191, 35.5966),   # Lodwar
    "054":     (3.1191, 35.5966),   # Lodwar
    "055":     (4.2200, 34.3500),   # Lokichoggio
    "056":     (2.3800, 35.6500),   # Lokichar
}

def get_location_for_phone(phone):
    """Approximate location from phone prefix — fallback to Lodwar."""
    if phone:
        for prefix, coords in AREA_DEFAULTS.items():
            if phone.startswith(f"+254{prefix}") or phone.startswith(f"0{prefix}"):
                return coords
    return AREA_DEFAULTS["default"]

# ── Load nearest boreholes ────────────────────────────────────────────────
def get_nearest_boreholes(lat, lon, limit=5):
    db     = get_db()
    docs   = db.collection("water_points").stream()
    points = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        if d.get("latitude") and d.get("longitude"):
            d["distance_km"] = round(haversine(lat, lon, d["latitude"], d["longitude"]), 1)
            points.append(d)
    points.sort(key=lambda x: x["distance_km"])
    # Filter out saline boreholes first
    safe   = [p for p in points if p.get("water_quality") not in ("saline",)]
    others = [p for p in points if p.get("water_quality") == "saline"]
    return (safe + others)[:limit]

# ── Problem types ─────────────────────────────────────────────────────────
PROBLEM_TYPES = {
    "1": "Borehole is Dry",
    "2": "Pump Not Working",
    "3": "Pipe Broken or Blocked",
    "4": "Water is Contaminated",
    "5": "Unsafe Route",
    "6": "Water Stolen or Diverted",
}

# ── Submit report to Firestore ────────────────────────────────────────────
def submit_report(phone, problem_type, borehole):
    import time
    db        = get_db()
    report_id = f"WP-{int(time.time() * 1000):x}".upper()

    high_severity = ["Borehole is Dry", "Water is Contaminated",
                     "Unsafe Route", "Water Stolen or Diverted"]

    report = {
        "id":               report_id,
        "water_point_id":   borehole.get("id"),
        "water_point_name": borehole.get("name"),
        "problem_type":     problem_type,
        "severity":         "high" if problem_type in high_severity else "medium",
        "status":           "open",
        "submitted_at":     firestore.SERVER_TIMESTAMP,
        "channel":          "ussd",
        "phone_hash":       str(hash(phone))[-6:] if phone else "anon",
    }

    db.collection("reports").add(report)

    # Update borehole status
    if borehole.get("id"):
        status = "non_functional" if problem_type == "Borehole is Dry" else "issues"
        db.collection("water_points").document(borehole["id"]).update({
            "operation_status": status,
            "report_count":     firestore.Increment(1),
            "last_report_at":   firestore.SERVER_TIMESTAMP,
        })

    return report_id

# ── USSD session state (in-memory for sandbox, use Redis in production) ───
sessions = {}

# ── Main USSD handler ─────────────────────────────────────────────────────
@ussd_bp.route("/ussd", methods=["POST"])
def ussd_handler():
    session_id   = request.form.get("sessionId", "")
    phone        = request.form.get("phoneNumber", "")
    text         = request.form.get("text", "")
    service_code = request.form.get("serviceCode", "")

    # Parse input steps — text is cumulative e.g. "1*2*3"
    steps = [s.strip() for s in text.split("*")] if text else []

    # ── STEP 0 — Main menu ────────────────────────────────────────────────
    if text == "":
        response = (
            "CON WaterPath Kenya\n"
            "Maji kwa Wote — Water for All\n\n"
            "1. Find nearest water\n"
            "2. Report a problem\n"
            "3. About WaterPath"
        )

    # ── STEP 1 — Branch on main menu choice ──────────────────────────────
    elif text == "1":
        # Find nearest water — load boreholes
        lat, lon = get_location_for_phone(phone)
        boreholes = get_nearest_boreholes(lat, lon, limit=3)
        sessions[session_id] = {"boreholes": boreholes}

        lines = ["CON Nearest water points:\n"]
        for i, b in enumerate(boreholes, 1):
            quality = b.get("water_quality", "unknown").capitalize()
            dist    = b.get("distance_km", "?")
            name    = b.get("name", "Unknown")[:20]  # truncate for USSD
            lines.append(f"{i}. {name}\n   {quality} · {dist}km")

        lines.append("\nSelect for details or 0 to go back")
        response = "\n".join(lines)

    elif text == "2":
        # Report a problem — show problem types
        response = (
            "CON Select problem type:\n\n"
            "1. Borehole is Dry\n"
            "2. Pump Not Working\n"
            "3. Pipe Broken\n"
            "4. Water Contaminated\n"
            "5. Unsafe Route\n"
            "6. Water Diverted\n\n"
            "0. Back"
        )

    elif text == "3":
        # About
        response = (
            "END WaterPath Kenya\n\n"
            "Real-time water access platform\n"
            "for North Eastern Kenya.\n\n"
            "Reports go directly to Turkana\n"
            "County Water Office and NGOs.\n\n"
            "All reports are anonymous."
        )

    # ── STEP 2 — Find water: borehole detail ──────────────────────────────
    elif len(steps) == 2 and steps[0] == "1":
        choice    = steps[1]
        session   = sessions.get(session_id, {})
        boreholes = session.get("boreholes", [])

        if choice == "0":
            response = (
                "CON WaterPath Kenya\n\n"
                "1. Find nearest water\n"
                "2. Report a problem\n"
                "3. About WaterPath"
            )
        elif choice.isdigit() and 1 <= int(choice) <= len(boreholes):
            b       = boreholes[int(choice) - 1]
            quality = b.get("water_quality", "unknown").capitalize()
            status  = b.get("operation_status", "unknown").replace("_", " ").capitalize()
            ec      = b.get("ec")
            depth   = b.get("well_depth")
            reports = b.get("report_count", 0)
            lat     = b.get("latitude", "")
            lon     = b.get("longitude", "")

            lines = [f"END {b.get('name', 'Borehole')}\n"]
            lines.append(f"Quality: {quality}")
            lines.append(f"Status: {status}")
            if ec:
                lines.append(f"EC: {ec} uS/cm")
            if depth:
                lines.append(f"Depth: {depth}m")
            if reports > 0:
                lines.append(f"Reports: {reports}")
            lines.append(f"\nGPS: {lat}, {lon}")
            lines.append("Navigate: maps.google.com")
            response = "\n".join(lines)
        else:
            response = "END Invalid selection. Please try again."

    # ── STEP 2 — Report: select borehole ──────────────────────────────────
    elif len(steps) == 2 and steps[0] == "2":
        problem_num = steps[1]
        if problem_num == "0":
            response = (
                "CON WaterPath Kenya\n\n"
                "1. Find nearest water\n"
                "2. Report a problem\n"
                "3. About WaterPath"
            )
        elif problem_num in PROBLEM_TYPES:
            # Load nearest boreholes for selection
            lat, lon  = get_location_for_phone(phone)
            boreholes = get_nearest_boreholes(lat, lon, limit=4)
            sessions[session_id] = {
                "boreholes":    boreholes,
                "problem_type": PROBLEM_TYPES[problem_num],
            }

            lines = [f"CON {PROBLEM_TYPES[problem_num]}\n\nSelect location:\n"]
            for i, b in enumerate(boreholes, 1):
                name = b.get("name", "Unknown")[:22]
                lines.append(f"{i}. {name}")
            lines.append("\n0. Back")
            response = "\n".join(lines)
        else:
            response = "END Invalid selection. Please try again."

    # ── STEP 3 — Report: confirm ──────────────────────────────────────────
    elif len(steps) == 3 and steps[0] == "2":
        borehole_num = steps[2]
        session      = sessions.get(session_id, {})
        boreholes    = session.get("boreholes", [])
        problem_type = session.get("problem_type", "Unknown problem")

        if borehole_num == "0":
            response = (
                "CON Select problem type:\n\n"
                "1. Borehole is Dry\n"
                "2. Pump Not Working\n"
                "3. Pipe Broken\n"
                "4. Water Contaminated\n"
                "5. Unsafe Route\n"
                "6. Water Diverted\n\n"
                "0. Back"
            )
        elif borehole_num.isdigit() and 1 <= int(borehole_num) <= len(boreholes):
            borehole = boreholes[int(borehole_num) - 1]
            sessions[session_id]["selected_borehole"] = borehole
            name = borehole.get("name", "Unknown")[:20]
            response = (
                f"CON Confirm report:\n\n"
                f"Problem: {problem_type}\n"
                f"Location: {name}\n\n"
                f"This report is anonymous.\n\n"
                f"1. Confirm\n"
                f"2. Cancel"
            )
        else:
            response = "END Invalid selection. Please try again."

    # ── STEP 4 — Report: submit ───────────────────────────────────────────
    elif len(steps) == 4 and steps[0] == "2":
        confirm  = steps[3]
        session  = sessions.get(session_id, {})
        borehole = session.get("selected_borehole", {})
        problem  = session.get("problem_type", "Unknown")

        if confirm == "1":
            try:
                report_id = submit_report(phone, problem, borehole)
                response  = (
                    f"END Report submitted.\n\n"
                    f"ID: {report_id}\n\n"
                    f"Sent to Turkana County\n"
                    f"Water Office and NGOs.\n"
                    f"Response within 4-8hrs.\n\n"
                    f"Asante. Thank you."
                )
            except Exception as e:
                response = "END Sorry, report failed.\nPlease try again later."
        else:
            response = "END Report cancelled."

        # Clean up session
        sessions.pop(session_id, None)

    else:
        response = (
            "CON WaterPath Kenya\n\n"
            "1. Find nearest water\n"
            "2. Report a problem\n"
            "3. About WaterPath"
        )

    return Response(response, content_type="text/plain")