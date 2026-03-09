"""
USSD handler for Africa's Talking.

Menu flow:
──────────────────────────────────────────
  Welcome
  1. Find water near me
  2. Report a problem
  3. About WaterPath

  [1] Find water near me
      → asks for closest town
      → returns 3 nearest functional boreholes
         with name, distance, walk time

  [2] Report a problem
      → 1. Which borehole? (list top 5 by name)
      → 2. What is the problem? (list problem types)
      → 3. Confirm → saves report to Firestore
         returns report ID

──────────────────────────────────────────
USSD session text is accumulated — each reply
is the FULL chain separated by *.
e.g. after choosing "2" then "3":  "2*3"
──────────────────────────────────────────
"""

from flask import Blueprint, request
from config import db
from models.report import Report, PROBLEM_TYPES, SEVERITY_MAP
from utils.geo import haversine_km

ussd_bp = Blueprint("ussd", __name__)

# ── Known town coordinates for "find near me" ────────────────────────────
TOWNS = {
    "1": ("Lodwar",    3.1191,  35.5966),
    "2": ("Kakuma",    3.7183,  34.8778),
    "3": ("Lokichar",  2.3366,  35.6619),
    "4": ("Kalokol",   3.5116,  35.8408),
    "5": ("Lokori",    2.1667,  36.0500),
}


def _get_nearest(lat, lon, limit=3):
    """Return up to `limit` functional/issues boreholes nearest to lat/lon."""
    docs   = db.collection("water_points").stream()
    points = [d.to_dict() for d in docs]
    # Exclude non-functional
    points = [p for p in points if p.get("operation_status") != "non_functional"]
    for p in points:
        p["_dist"] = haversine_km(lat, lon, p["latitude"], p["longitude"])
        p["_walk"] = int(p["_dist"] / 0.083)  # minutes at 5 km/h
    points.sort(key=lambda x: x["_dist"])
    return points[:limit]


def _get_all_boreholes(limit=5):
    """Return first `limit` boreholes alphabetically for the report picker."""
    docs = db.collection("water_points").stream()
    pts  = sorted([d.to_dict() | {"_id": d.id} for d in docs], key=lambda x: x.get("name",""))
    return pts[:limit]


@ussd_bp.route("/ussd", methods=["POST"])
def ussd():
    session_id   = request.values.get("sessionId",   "")
    phone        = request.values.get("phoneNumber",  "")
    text         = request.values.get("text",         "").strip()
    service_code = request.values.get("serviceCode",  "")

    parts = [p for p in text.split("*")] if text else []
    depth = len(parts)  # how deep into the menu we are

    # ── ROOT MENU ─────────────────────────────────────────────────────────
    if text == "":
        return _con(
            "Welcome to WaterPath\n"
            "Safe water in Turkana County\n\n"
            "1. Find water near me\n"
            "2. Report a problem\n"
            "3. About WaterPath"
        )

    # ── ABOUT ─────────────────────────────────────────────────────────────
    if text == "3":
        return _end(
            "WaterPath monitors 60+ boreholes\n"
            "in Turkana County.\n"
            "Reports go directly to NGO teams.\n"
            "Free to use. Anonymous.\n"
            "waterpath.vercel.app"
        )

    # ══════════════════════════════════════════════════════════════════════
    # BRANCH 1 — FIND WATER
    # ══════════════════════════════════════════════════════════════════════
    if parts[0] == "1":

        # Step 1 — ask for town
        if depth == 1:
            menu = "Select your nearest town:\n"
            for k, (name, _, _) in TOWNS.items():
                menu += f"{k}. {name}\n"
            return _con(menu.strip())

        # Step 2 — show nearest boreholes
        if depth == 2:
            town_choice = parts[1]
            if town_choice not in TOWNS:
                return _end("Invalid choice. Please dial again.")

            name, lat, lon = TOWNS[town_choice]
            nearest = _get_nearest(lat, lon, limit=3)

            if not nearest:
                return _end("No boreholes found near you.\nTry again later.")

            msg = f"Nearest boreholes to {name}:\n\n"
            for i, p in enumerate(nearest, 1):
                status = "OK" if p.get("operation_status") == "functional" else "Issues"
                msg += (
                    f"{i}. {p['name']}\n"
                    f"   {p['_dist']:.1f}km · {p['_walk']}min walk · {status}\n\n"
                )
            msg += "Dial *384# to report a problem"
            return _end(msg.strip())

    # ══════════════════════════════════════════════════════════════════════
    # BRANCH 2 — REPORT A PROBLEM
    # ══════════════════════════════════════════════════════════════════════
    if parts[0] == "2":

        boreholes = _get_all_boreholes(limit=5)

        # Step 1 — pick borehole
        if depth == 1:
            menu = "Which borehole?\n"
            for i, p in enumerate(boreholes, 1):
                menu += f"{i}. {p['name']}\n"
            return _con(menu.strip())

        # Step 2 — pick problem type
        if depth == 2:
            bh_choice = parts[1]
            if not bh_choice.isdigit() or int(bh_choice) < 1 or int(bh_choice) > len(boreholes):
                return _end("Invalid choice. Please dial again.")

            menu = "What is the problem?\n"
            for i, pt in enumerate(PROBLEM_TYPES, 1):
                menu += f"{i}. {pt}\n"
            return _con(menu.strip())

        # Step 3 — confirm
        if depth == 3:
            bh_choice  = parts[1]
            prob_choice = parts[2]

            if (not bh_choice.isdigit()   or int(bh_choice)   < 1 or int(bh_choice)   > len(boreholes) or
                not prob_choice.isdigit() or int(prob_choice) < 1 or int(prob_choice) > len(PROBLEM_TYPES)):
                return _end("Invalid choice. Please dial again.")

            bh       = boreholes[int(bh_choice) - 1]
            problem  = PROBLEM_TYPES[int(prob_choice) - 1]

            return _con(
                f"Confirm report:\n"
                f"Borehole: {bh['name']}\n"
                f"Problem:  {problem}\n\n"
                f"1. Submit\n"
                f"2. Cancel"
            )

        # Step 4 — submit or cancel
        if depth == 4:
            confirm    = parts[3]
            bh_choice  = parts[1]
            prob_choice = parts[2]

            if confirm == "2":
                return _end("Report cancelled.")

            if confirm != "1":
                return _end("Invalid choice. Please dial again.")

            bh      = boreholes[int(bh_choice) - 1]
            problem = PROBLEM_TYPES[int(prob_choice) - 1]

            # Save to Firestore
            report = Report(
                water_point_id   = bh.get("_id", ""),
                water_point_name = bh["name"],
                problem_type     = problem,
                severity         = SEVERITY_MAP.get(problem, "medium"),
                channel          = "ussd",
            )
            try:
                db.collection("reports").document(report.id).set(report.to_dict())
                # Update borehole status
                if bh.get("_id"):
                    db.collection("water_points").document(bh["_id"]).update({
                        "operation_status": "issues",
                        "report_count": (bh.get("report_count", 0) + 1),
                    })
            except Exception as e:
                return _end(f"Error saving report.\nPlease try again.\n({str(e)[:40]})")

            return _end(
                f"Report submitted.\n"
                f"Report ID: {report.id}\n\n"
                f"Thank you. A repair team\n"
                f"will be notified.\n"
                f"WaterPath"
            )

    # ── FALLBACK ──────────────────────────────────────────────────────────
    return _end("Invalid input.\nDial *384# to start again.")


# ── Helpers ───────────────────────────────────────────────────────────────
def _con(text):
    """CON = continue session — shows menu and waits for input."""
    return f"CON {text}", 200, {"Content-Type": "text/plain"}

def _end(text):
    """END = close session — shows message and hangs up."""
    return f"END {text}", 200, {"Content-Type": "text/plain"}
