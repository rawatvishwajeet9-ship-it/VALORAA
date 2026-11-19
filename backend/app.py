import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from backend.config import Config
from backend.database.connection import init_database

from backend.routes.auth import auth_bp
from backend.routes.patients import patient_bp
from backend.routes.doctors import doctor_bp
from backend.routes.appointments import appointments_bp
from backend.routes.records import records_bp
from backend.routes.consultations import consultations_bp
from backend.routes.prescriptions import prescriptions_bp
from backend.routes.admin import admin_bp
from backend.routes.reviews import reviews_bp

def create_app():
    frontend_dir = PROJECT_ROOT / "frontend"
    uploads_dir = PROJECT_ROOT / "uploads"

    app = Flask(
        __name__,
        static_folder=str(frontend_dir),
        static_url_path=""
    )
    app.config.from_object(Config)

    # Enable CORS
    CORS(app, supports_credentials=True)

    # Initialize SQLite database and seed initial data
    init_database(app)

    # Register API Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(patient_bp)
    app.register_blueprint(doctor_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(records_bp)
    app.register_blueprint(consultations_bp)
    app.register_blueprint(prescriptions_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(reviews_bp)

    # Serve uploaded medical files
    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(str(uploads_dir), filename)

    # Page route helpers for clean and .html navigation
    @app.route("/")
    def index():
        return send_from_directory(str(frontend_dir), "index.html")

    @app.route("/login")
    @app.route("/login.html")
    def login_page():
        return send_from_directory(str(frontend_dir), "login.html")

    @app.route("/register")
    @app.route("/register.html")
    def register_page():
        return send_from_directory(str(frontend_dir), "register.html")

    @app.route("/patient/<path:filename>")
    def patient_pages(filename):
        if not filename.endswith(".html"):
            filename = f"{filename}.html"
        return send_from_directory(str(frontend_dir / "patient"), filename)

    @app.route("/doctor/<path:filename>")
    def doctor_pages(filename):
        if not filename.endswith(".html"):
            filename = f"{filename}.html"
        return send_from_directory(str(frontend_dir / "doctor"), filename)

    @app.route("/admin/<path:filename>")
    def admin_pages(filename):
        if not filename.endswith(".html"):
            filename = f"{filename}.html"
        return send_from_directory(str(frontend_dir / "admin"), filename)

    # Generic static file handler
    @app.route("/<path:path>")
    def static_files(path):
        target = frontend_dir / path
        if target.is_file():
            return send_from_directory(str(frontend_dir), path)
        if (frontend_dir / f"{path}.html").is_file():
            return send_from_directory(str(frontend_dir), f"{path}.html")
        return send_from_directory(str(frontend_dir), "index.html")

    return app

app = create_app()

if __name__ == "__main__":
    print("\n" + "=" * 65)
    print("  VALORA Healthcare Web Platform running on http://127.0.0.1:5000")
    print("  Available Portals:")
    print("  - Home:       http://127.0.0.1:5000/")
    print("  - Login:      http://127.0.0.1:5000/login.html")
    print("  - Patient:    http://127.0.0.1:5000/patient/dashboard.html")
    print("  - Doctor:     http://127.0.0.1:5000/doctor/dashboard.html")
    print("  - Admin:      http://127.0.0.1:5000/admin/dashboard.html")
    print("=" * 65 + "\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
