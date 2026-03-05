from flask import Blueprint, request, jsonify
from config import db
import firebase_admin.auth as firebase_auth

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/verify", methods=["POST"])
def verify_token():
    """
    Verify a Firebase ID token sent from the NGO dashboard frontend.
    Called on every protected dashboard request.
    Returns user info and their NGO role.
    """
    body  = request.get_json()
    token = body.get("id_token")

    if not token:
        return jsonify({"error": "id_token required"}), 400

    try:
        decoded = firebase_auth.verify_id_token(token)
        uid     = decoded["uid"]
        email   = decoded.get("email", "")

        # Look up user's role from Firestore
        user_doc = db.collection("ngo_users").document(uid).get()
        role     = "viewer"  # default
        org      = ""

        if user_doc.exists:
            user_data = user_doc.to_dict()
            role = user_data.get("role", "viewer")
            org  = user_data.get("organisation", "")

        return jsonify({
            "uid":          uid,
            "email":        email,
            "role":         role,
            "organisation": org,
            "verified":     True,
        }), 200

    except firebase_auth.InvalidIdTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500
