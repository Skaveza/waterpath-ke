import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

class Config:
    FLASK_ENV               = os.getenv("FLASK_ENV", "development")
    PORT                    = os.getenv("PORT", 5000)
    FIREBASE_CREDENTIALS    = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-service-account.json")
    AFRICASTALKING_API_KEY  = os.getenv("AFRICASTALKING_API_KEY", "")
    AFRICASTALKING_USERNAME = os.getenv("AFRICASTALKING_USERNAME", "sandbox")
    ALLOWED_ORIGINS         = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")


def init_firebase():
    """Initialise Firebase Admin SDK — called once at startup."""
    if not firebase_admin._apps:
        cred = credentials.Certificate(Config.FIREBASE_CREDENTIALS)
        firebase_admin.initialize_app(cred)
    return firestore.client()


# Shared Firestore client — import this wherever you need DB access
db = init_firebase()
