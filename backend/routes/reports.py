from flask import Blueprint, request, jsonify
from config import db
from models.report import Report, SEVERITY_MAP
from utils.sms import send_dispatch_sms
from datetime import datetime, timezone

reports_bp = Blueprint("reports", __name__)

COLLECTION        = "reports"
WP_COLLECTION     = "water_points"


@reports_bp.route("/", methods=["POST"])
def submit_report():
    """
    Community submits an anonymous report.
    Writes to Firestore — NGO dashboard receives via real-time listener.
    """
    body = request.get_json()

    required = ["water_point_id", "water_point_name", "problem_type"]
    for field in required:
        if not body.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    problem_type = body["problem_type"]
    report = Report(
        water_point_id   = body["water_point_id"],
        water_point_name = body["water_point_name"],
        problem_type     = problem_type,
        severity         = SEVERITY_MAP.get(problem_type, "medium"),
        notes            = body.get("notes", ""),
        urgency          = body.get("urgency", "normal"),
        channel          = body.get("channel", "web"),
    )

    # Write report to Firestore
    db.collection(COLLECTION).document(report.id).set(report.to_dict())

    # Increment report count on the water point
    wp_ref = db.collection(WP_COLLECTION).document(report.water_point_id)
    wp_doc = wp_ref.get()
    if wp_doc.exists:
        current = wp_doc.to_dict().get("report_count", 0)
        wp_ref.update({
            "report_count":  current + 1,
            "last_report_at": datetime.now(timezone.utc).isoformat(),
        })

    return jsonify({
        "report_id": report.id,
        "severity":  report.severity,
        "message":   "Report received. Sent to county officials and local NGOs."
    }), 201


@reports_bp.route("/", methods=["GET"])
def get_reports():
    """
    NGO dashboard — fetch reports with optional filters.
    ?status=open | resolved | in_progress
    ?severity=high | medium | low
    ?water_point_id=<id>
    """
    status      = request.args.get("status")
    severity    = request.args.get("severity")
    point_id    = request.args.get("water_point_id")

    query = db.collection(COLLECTION)

    if status:
        query = query.where("status", "==", status)
    if severity:
        query = query.where("severity", "==", severity)
    if point_id:
        query = query.where("water_point_id", "==", point_id)

    docs    = query.stream()
    reports = [doc.to_dict() for doc in docs]

    # Sort newest first
    reports.sort(key=lambda r: r.get("submitted_at", ""), reverse=True)

    return jsonify({"count": len(reports), "reports": reports}), 200


@reports_bp.route("/<report_id>/resolve", methods=["PATCH"])
def resolve_report(report_id):
    """
    NGO marks a report as resolved.
    Also updates the water point's operation_status.
    """
    body        = request.get_json()
    resolved_by = body.get("resolved_by", "NGO Staff")
    notes       = body.get("internal_notes", "")

    ref = db.collection(COLLECTION).document(report_id)
    doc = ref.get()

    if not doc.exists:
        return jsonify({"error": "Report not found"}), 404

    ref.update({
        "status":         "resolved",
        "resolved_at":    datetime.now(timezone.utc).isoformat(),
        "resolved_by":    resolved_by,
        "internal_notes": notes,
    })

    # Update the water point's operation status to functional
    report_data = doc.to_dict()
    wp_id = report_data.get("water_point_id")
    if wp_id:
        db.collection("water_points").document(wp_id).update({
            "operation_status": "functional"
        })

    return jsonify({"resolved": True, "report_id": report_id}), 200


@reports_bp.route("/<report_id>/dispatch", methods=["POST"])
def dispatch_team(report_id):
    """
    Assign a repair technician to a report.
    Sends SMS to technician via Africa's Talking.
    """
    body       = request.get_json()
    tech_name  = body.get("technician_name", "")
    tech_phone = body.get("technician_phone", "")

    if not tech_phone:
        return jsonify({"error": "technician_phone is required"}), 400

    ref = db.collection(COLLECTION).document(report_id)
    doc = ref.get()
    if not doc.exists:
        return jsonify({"error": "Report not found"}), 404

    report_data = doc.to_dict()

    # Update report with assignment
    ref.update({
        "status":      "in_progress",
        "assigned_to": tech_name,
    })

    # Send SMS to technician
    sms_body = (
        f"WaterPath Dispatch\n"
        f"Location: {report_data['water_point_name']}\n"
        f"Problem: {report_data['problem_type']}\n"
        f"Priority: {report_data['severity'].upper()}\n"
        f"Report ID: {report_id}\n"
        f"Coords: see WaterPath dashboard"
    )
    sms_result = send_dispatch_sms(tech_phone, sms_body)

    return jsonify({
        "dispatched":  True,
        "assigned_to": tech_name,
        "sms_sent":    sms_result.get("success", False),
    }), 200
