from .auth import auth_bp
from .patients import patient_bp
from .doctors import doctor_bp
from .appointments import appointments_bp
from .records import records_bp
from .consultations import consultations_bp
from .prescriptions import prescriptions_bp
from .admin import admin_bp

__all__ = [
    "auth_bp",
    "patient_bp",
    "doctor_bp",
    "appointments_bp",
    "records_bp",
    "consultations_bp",
    "prescriptions_bp",
    "admin_bp",
]
