import sqlite3
import json
import os
from pathlib import Path
from werkzeug.security import generate_password_hash
from backend.config import Config

def get_db():
    """Get a database connection with dict-like row access."""
    db_path = Config.DATABASE_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_database(app=None):
    """Initialize SQLite database tables and ensure master administrator exists."""
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    if not schema_path.exists():
        schema_path = Config.BASE_DIR / "database" / "schema.sql"

    conn = get_db()
    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()
    finally:
        conn.close()

    ensure_admin_user()
    ensure_demo_accounts()

def ensure_demo_accounts():
    """Ensure verified demo accounts for Patient, Doctor, and Admin exist with realistic clinical data."""
    conn = get_db()
    cursor = conn.cursor()

    # 1. Demo Doctor: dr harry
    cursor.execute("SELECT id FROM users WHERE email = 'doctor@valora.health'")
    doc_user = cursor.fetchone()
    if not doc_user:
        doc_pw = generate_password_hash("Doctor@123")
        cursor.execute("""
            INSERT INTO users (name, email, password_hash, role, phone, status)
            VALUES (?, ?, ?, 'doctor', ?, 'active')
        """, ("Dr. Harry Patel", "doctor@valora.health", doc_pw, "9876543211"))
        doc_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO doctors (
                user_id, license_number, specialty, qualifications, experience_years,
                consultation_fee, clinic_name, clinic_street, clinic_city, clinic_state, clinic_postal_code,
                available_days, start_time, end_time, is_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            doc_id, "NMC-CARD-44910", "Cardiology", json.dumps(["MBBS", "MD - Cardiology", "FACC"]),
            14, 600, "VALORA Heart & Diagnostic Center", "102 Health Avenue", "Mumbai",
            "Maharashtra", "400001", json.dumps(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
            "09:00", "17:00"
        ))
    else:
        doc_id = doc_user["id"]

    # 2. Demo Patient: Aarav Sharma
    cursor.execute("SELECT id FROM users WHERE email = 'patient@valora.health'")
    pat_user = cursor.fetchone()
    if not pat_user:
        pat_pw = generate_password_hash("Patient@123")
        cursor.execute("""
            INSERT INTO users (name, email, password_hash, role, phone, status)
            VALUES (?, ?, ?, 'patient', ?, 'active')
        """, ("Aarav Sharma", "patient@valora.health", pat_pw, "9876543210"))
        pat_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO patients (
                user_id, date_of_birth, gender, blood_group, height_cm, weight_kg,
                allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone,
                insurance_provider, insurance_policy_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            pat_id, "1992-05-18", "male", "B+", 176.0, 72.5,
            json.dumps(["Penicillin", "Sulfa"]), json.dumps(["Hypertension"]),
            "Pooja Sharma", "9876543210", "Star Health & Allied Insurance", "SH-VAL-882319"
        ))

        # Doctor-Patient access link
        cursor.execute("""
            INSERT OR IGNORE INTO doctor_patient_access (patient_id, doctor_id, status, access_level)
            VALUES (?, ?, 'granted', 'full')
        """, (pat_id, doc_id))

        # Seed completed past appointment
        cursor.execute("""
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, time_slot, type, status, reason, fee)
            VALUES (?, ?, '2026-11-15', '10:30 AM', 'in-person', 'completed', 'Routine cardiovascular health screening and blood pressure evaluation', 600)
        """, (pat_id, doc_id))
        past_appt_id = cursor.lastrowid

        # Seed clinical consultation record
        cursor.execute("""
            INSERT INTO consultations (
                appointment_id, patient_id, doctor_id, consultation_date,
                diagnosis, symptoms, blood_pressure, heart_rate, temperature, spo2,
                weight_kg, height_cm, clinical_notes, follow_up_date
            ) VALUES (?, ?, ?, '2026-11-15 10:45:00', ?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-11-28')
        """, (
            past_appt_id, pat_id, doc_id,
            "Stage 1 Essential Hypertension",
            json.dumps(["Mild morning headache", "Occasional fatigue"]),
            "130/85 mmHg", 74, 98.4, 99, 72.5, 176.0,
            "Patient is responding well to dietary sodium moderation. Advised 30-minute daily aerobic walking and digital Rx maintenance therapy."
        ))
        consult_id = cursor.lastrowid

        # Seed digital prescription
        cursor.execute("""
            INSERT INTO prescriptions (
                consultation_id, appointment_id, patient_id, doctor_id,
                medications, diagnostic_tests, general_advice
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            consult_id, past_appt_id, pat_id, doc_id,
            json.dumps([
                {"name": "Telmisartan", "dosage": "40mg", "frequency": "Once Daily (Morning)", "duration": "30 days", "instructions": "Take after breakfast"},
                {"name": "Amlodipine", "dosage": "5mg", "frequency": "Once Daily (Night)", "duration": "30 days", "instructions": "Take before bedtime"}
            ]),
            json.dumps(["Lipid Profile Panel", "Serum Creatinine", "12-Lead Resting ECG"]),
            "Check and log blood pressure every week in the VALORA portal. Reduce salt and processed foods."
        ))

        # Seed upcoming confirmed appointment
        cursor.execute("""
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, time_slot, type, status, reason, fee)
            VALUES (?, ?, '2026-11-28', '11:15 AM', 'in-person', 'confirmed', 'Follow-up consultation for blood pressure and lipid panel review', 600)
        """, (pat_id, doc_id))

        # Seed diagnostic records in vault
        cursor.execute("""
            INSERT INTO medical_records (
                patient_id, uploaded_by, record_type, title, file_url, file_size, file_type,
                facility_or_doctor, description, tags
            ) VALUES (?, ?, 'lab_report', 'Fasting Comprehensive Lipid & Glucose Panel', '/uploads/sample_lab_report.pdf', 644, 'application/pdf', 'VALORA Clinical Laboratory', 'Total Cholesterol 192 mg/dL, HDL 54 mg/dL, LDL 112 mg/dL. Normal ranges.', ?)
        """, (pat_id, pat_id, json.dumps(["Cardiology", "Lipid", "Fasting"])))

        cursor.execute("""
            INSERT INTO medical_records (
                patient_id, uploaded_by, record_type, title, file_url, file_size, file_type,
                facility_or_doctor, description, tags
            ) VALUES (?, ?, 'xray', 'Chest X-Ray Digital PA View', '/uploads/sample_chest_xray.png', 280, 'image/png', 'VALORA Advanced Diagnostics', 'Bilateral lung fields clear. Cardiac contour within normal morphological limits.', ?)
        """, (pat_id, pat_id, json.dumps(["Radiology", "X-Ray", "Chest"])))

        # Update doctor rating
        cursor.execute("""
            UPDATE doctors SET rating = 4.9, total_reviews = 1 WHERE user_id = ?
        """, (doc_id,))

    conn.commit()
    conn.close()

def ensure_admin_user():
    """Ensure the master hospital system administrator exists."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
    admin = cursor.fetchone()
    if admin:
        conn.close()
        return

    print("[VALORA] Initializing primary system administrator account...")
    admin_pw_hash = generate_password_hash("Valora@123")

    cursor.execute("""
        INSERT INTO users (name, email, password_hash, role, phone, status)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        "Hospital System Administrator",
        "admin@valora.health",
        admin_pw_hash,
        "admin",
        "+91 98765 00001",
        "active"
    ))
    admin_id = cursor.lastrowid

    cursor.execute("""
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (
        admin_id,
        "SYSTEM_INITIALIZED",
        "System",
        "VALORA_CORE",
        json.dumps({"message": "Platform initialized with administrative governance."})
    ))

    conn.commit()
    conn.close()
    print("[VALORA] Master administrator initialized successfully.")
