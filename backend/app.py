from flask import Flask
from flask_cors import CORS
from config import Config
from routes.water_points import water_points_bp
from routes.reports import reports_bp
from routes.auth import auth_bp
from routes.ussd import ussd_bp
from routes.desalination import desalination_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=Config.ALLOWED_ORIGINS)

    app.register_blueprint(water_points_bp,  url_prefix="/api/water-points")
    app.register_blueprint(reports_bp,       url_prefix="/api/reports")
    app.register_blueprint(auth_bp,          url_prefix="/api/auth")
    app.register_blueprint(ussd_bp,          url_prefix="/api")
    app.register_blueprint(desalination_bp,  url_prefix="/api/desalination")

    @app.route("/api/health")
    def health():
        return {"status": "ok", "project": "waterpath-ke"}, 200

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(
        host="0.0.0.0",
        port=int(Config.PORT),
        debug=Config.FLASK_ENV == "development"
    )