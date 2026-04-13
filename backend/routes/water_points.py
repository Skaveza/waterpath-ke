from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from config import db
from utils.geo import haversine_km
from ml.quality_predictor import predict_quality

water_points_bp = Blueprint("water_points", __name__)
COLLECTION = "water_points"


@water_points_bp.route("/", methods=["GET"])
def get_all():
    lat    = request.args.get("lat",    type=float)
    lon    = request.args.get("lon",    type=float)
    radius = request.args.get("radius", type=float, default=50.0)
    quality = request.args.get("quality")
    status  = request.args.get("status")

    try:
        docs   = db.collection(COLLECTION).stream()
        points = [{**doc.to_dict(), "id": doc.id} for doc in docs]
    except Exception as e:
        return jsonify({"error": f"Failed to fetch water points: {str(e)}"}), 500

    if lat is not None and lon is not None:
        try:
            enriched = []
            for p in points:
                if "latitude" in p and "longitude" in p:
                    d = haversine_km(lat, lon, p["latitude"], p["longitude"])
                    if d <= radius:
                        p["distance_km"]   = round(d, 2)
                        p["walk_minutes"]  = int(d / 0.083)
                        enriched.append(p)
            points = sorted(enriched, key=lambda x: x["distance_km"])
        except Exception as e:
            return jsonify({"error": f"Location filter failed: {str(e)}"}), 500

    if quality:
        points = [p for p in points if p.get("water_quality") == quality]
    if status:
        points = [p for p in points if p.get("operation_status") == status]

    return jsonify({"count": len(points), "water_points": points}), 200


@water_points_bp.route("/predict-quality", methods=["POST"])
def predict():
    body = request.get_json()
    if not body:
        return jsonify({"error": "Invalid JSON body"}), 400

    lat      = body.get("latitude")
    lon      = body.get("longitude")
    depth    = body.get("well_depth", 0)
    point_id = body.get("point_id")

    if lat is None or lon is None:
        return jsonify({"error": "latitude and longitude required"}), 400

    try:
        result = predict_quality(lat, lon, depth)
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

    # Write prediction back to Firestore so the app can read it directly
    if point_id:
        try:
            db.collection(COLLECTION).document(point_id).update({
                "predicted_quality":        result.get("predicted_quality"),
                "prediction_label":         result.get("label"),
                "prediction_confidence":    result.get("confidence"),
                "prediction_probabilities": result.get("probabilities", {}),
                "last_ml_update":           datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            # Return prediction result anyway — don't fail silently
            return jsonify({
                "warning": f"Prediction succeeded but Firestore update failed: {str(e)}",
                **result
            }), 207

    return jsonify(result), 200


@water_points_bp.route("/<point_id>", methods=["GET"])
def get_one(point_id):
    try:
        doc = db.collection(COLLECTION).document(point_id).get()
    except Exception as e:
        return jsonify({"error": f"Failed to fetch: {str(e)}"}), 500

    if not doc.exists:
        return jsonify({"error": "Water point not found"}), 404

    data = doc.to_dict()
    data["id"] = doc.id
    return jsonify(data), 200


@water_points_bp.route("/<point_id>/status", methods=["PATCH"])
def update_status(point_id):
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
    except Exception as e:
        return jsonify({"error": f"Update failed: {str(e)}"}), 500

    return jsonify({"updated": True, "operation_status": new_status}), 200