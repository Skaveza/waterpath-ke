import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

class Config:
    FLASK_ENV               = os.getenv("FLASK_ENV", "production")
    PORT                    = int(os.getenv("PORT", 5000))
    AFRICASTALKING_API_KEY  = os.getenv("AFRICASTALKING_API_KEY", "")
    AFRICASTALKING_USERNAME = os.getenv("AFRICASTALKING_USERNAME", "sandbox")
    ALLOWED_ORIGINS         = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")


def init_firebase():
    """
    Initialise Firebase Admin SDK.
    On Railway: reads FIREBASE_CREDENTIALS_JSON env var (full JSON string).
    Locally:    reads firebase-service-account.json file.
    """
    if firebase_admin._apps:
        return firestore.client()

    creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if creds_json:
        cred = credentials.Certificate(json.loads(creds_json))
    else:
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-service-account.json")
        cred = credentials.Certificate(cred_path)

    firebase_admin.initialize_app(cred)
    return firestore.client()


# Shared Firestore client
db = init_firebase()
