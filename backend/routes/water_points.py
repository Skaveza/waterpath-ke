from flask import Blueprint, request, jsonify
from config import db
from models.water_point import WaterPoint
from utils.geo import haversine_km
from ml.quality_predictor import predict_quality

water_points_bp = Blueprint("water_points", __name__)

COLLECTION = "water_points"


@water_points_bp.route("/", methods=["GET"])
def get_all():
    """
    Return all water points.
    Optional query params:
      ?lat=3.1&lon=35.6&radius=20   — filter within radius (km)
      ?quality=drinkable             — filter by water quality
      ?status=functional             — filter by operation status
    """
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    radius = request.args.get("radius", type=float, default=50.0)
    quality = request.args.get("quality")
    status = request.args.get("status")

    try:
        docs = db.collection(COLLECTION).stream()
        points = [doc.to_dict() for doc in docs]
    except Exception:
        return jsonify({"error": "Failed to fetch water points"}), 500

    # Filter by radius if coordinates provided
    if lat is not None and lon is not None:
        try:
            points = [
                p for p in points
                if haversine_km(lat, lon, p["latitude"], p["longitude"]) <= radius
            ]

            for p in points:
                distance = haversine_km(lat, lon, p["latitude"], p["longitude"])
                p["distance_km"] = round(distance, 2)
                p["walk_minutes"] = int(distance / 0.083)  # ~5 km/h

            points.sort(key=lambda x: x["distance_km"])
        except Exception:
            return jsonify({"error": "Error processing location filtering"}), 500

    if quality:
        points = [p for p in points if p.get("water_quality") == quality]

    if status:
        points = [p for p in points if p.get("operation_status") == status]

    return jsonify({"count": len(points), "water_points": points}), 200


@water_points_bp.route("/<point_id>", methods=["GET"])
def get_one(point_id):
    try:
        doc = db.collection(COLLECTION).document(point_id).get()
    except Exception:
        return jsonify({"error": "Failed to fetch water point"}), 500

    if not doc.exists:
        return jsonify({"error": "Water point not found"}), 404

    return jsonify(doc.to_dict()), 200


@water_points_bp.route("/<point_id>/status", methods=["PATCH"])
def update_status(point_id):
    """
    NGO dashboard calls this when marking a point functional/non-functional.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    new_status = data.get("operation_status")

    valid = {"functional", "issues", "non_functional", "unknown"}
    if new_status not in valid:
        return jsonify({"error": f"status must be one of {valid}"}), 400

    try:
        db.collection(COLLECTION).document(point_id).update({
            "operation_status": new_status
        })
    except Exception:
        return jsonify({"error": "Failed to update status"}), 500

    return jsonify({"updated": True, "operation_status": new_status}), 200


@water_points_bp.route("/predict-quality", methods=["POST"])
def predict():
    """
    ML endpoint — predict water quality for coordinates with no EC measurement.
    Body: { "latitude": 3.5, "longitude": 35.8, "well_depth": 40 }
    """
    body = request.get_json()
    if not body:
        return jsonify({"error": "Invalid JSON body"}), 400

    lat = body.get("latitude")
    lon = body.get("longitude")
    depth = body.get("well_depth", 0)

    if lat is None or lon is None:
        return jsonify({"error": "latitude and longitude required"}), 400

    try:
        result = predict_quality(lat, lon, depth)
        return jsonify(result), 200
    except Exception:
        return jsonify({"error": "Failed to predict water quality"}), 500