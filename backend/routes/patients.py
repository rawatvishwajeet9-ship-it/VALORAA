import os
import re
import json
from flask import Blueprint, request, jsonify
from backend.database.connection import get_db
from backend.routes.auth import get_current_user_from_req

patient_bp = Blueprint("patients", __name__, url_prefix="/api/patient")

@patient_bp.route("/profile", methods=["GET", "PUT"])
def profile():
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    patient_user_id = user["id"]
    conn = get_db()

    if request.method == "GET":
        target_id = request.args.get("patient_id")
        if target_id and user["role"] in ["doctor", "admin"]:
            patient_user_id = int(target_id)

        user_row = conn.execute("SELECT id, name, email, phone, avatar, status FROM users WHERE id = ?", (patient_user_id,)).fetchone()
        pat_row = conn.execute("SELECT * FROM patients WHERE user_id = ?", (patient_user_id,)).fetchone()

        if not user_row or not pat_row:
            conn.close()
            return jsonify({"success": False, "message": "Patient profile not found."}), 404

        data = dict(user_row)
        data.update(dict(pat_row))
        data["allergies"] = json.loads(pat_row["allergies"] or "[]")
        data["chronic_conditions"] = json.loads(pat_row["chronic_conditions"] or "[]")

        conn.close()
        return jsonify({"success": True, "profile": data})

    elif request.method == "PUT":
        data = request.get_json() or {}

        # Validate Phone
        phone = data.get("phone")
        if phone:
            if re.search(r'[a-zA-Z]', str(phone)):
                conn.close()
                return jsonify({"success": False, "message": "Phone number cannot contain letters. Numbers only."}), 400
            cleaned_phone = re.sub(r'[^0-9]', '', str(phone))
            if len(cleaned_phone) < 9 or len(cleaned_phone) > 11:
                conn.close()
                return jsonify({"success": False, "message": "Phone number must be between 9 and 11 digits."}), 400
            phone = cleaned_phone

        # Validate Emergency Contact Phone
        em_phone_raw = str(data.get("emergency_contact_phone") or "").strip()
        em_phone = None
        if em_phone_raw:
            if re.search(r'[a-zA-Z]', em_phone_raw):
                conn.close()
                return jsonify({"success": False, "message": "Emergency contact phone cannot contain letters."}), 400
            em_phone = re.sub(r'[^0-9]', '', em_phone_raw)
            if len(em_phone) < 9 or len(em_phone) > 11:
                conn.close()
                return jsonify({"success": False, "message": "Emergency phone must be between 9 and 11 digits."}), 400

        # Validate DOB: must be between 1900 and today's current date (newborns born today allowed)
        dob = data.get("date_of_birth")
        if dob:
            from datetime import date
            try:
                parts = str(dob).replace("/", "-").strip().split("-")
                if len(parts) == 3:
                    if len(parts[0]) == 4:
                        dob_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
                    else:
                        dob_date = date(int(parts[2]), int(parts[1]), int(parts[0]))
                    if dob_date > date.today():
                        conn.close()
                        return jsonify({"success": False, "message": "Date of birth cannot be in the future (today's date allowed for newborns)."}), 400
                    if dob_date.year < 1900:
                        conn.close()
                        return jsonify({"success": False, "message": "Year of birth must be 1900 or later."}), 400
            except (ValueError, IndexError):
                pass

        # Validate Height (30 to 250 cm)
        height = data.get("height_cm")
        if height not in [None, "", "null"]:
            try:
                h_val = float(height)
                if h_val < 30 or h_val > 250:
                    conn.close()
                    return jsonify({"success": False, "message": "Height must be between 30 cm and 250 cm."}), 400
                height = h_val
            except (ValueError, TypeError):
                conn.close()
                return jsonify({"success": False, "message": "Invalid height number."}), 400
        else:
            height = None

        # Validate Weight (2 to 300 kg)
        weight = data.get("weight_kg")
        if weight not in [None, "", "null"]:
            try:
                w_val = float(weight)
                if w_val < 2 or w_val > 300:
                    conn.close()
                    return jsonify({"success": False, "message": "Weight must be between 2 kg and 300 kg."}), 400
                weight = w_val
            except (ValueError, TypeError):
                conn.close()
                return jsonify({"success": False, "message": "Invalid weight number."}), 400
        else:
            weight = None

        # Update users table (name, phone, avatar)
        name = (data.get("name") or "").strip()
        avatar = data.get("avatar")
        if name or phone or avatar:
            conn.execute("""
                UPDATE users SET 
                    name = COALESCE(NULLIF(?, ''), name),
                    phone = COALESCE(?, phone),
                    avatar = COALESCE(?, avatar),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (name, phone, avatar, patient_user_id))

        # Update patients table
        allergies = json.dumps(data["allergies"]) if "allergies" in data else None
        chronic = json.dumps(data["chronic_conditions"]) if "chronic_conditions" in data else None
        em_phone = re.sub(r'[^0-9]', '', str(data.get("emergency_contact_phone") or ""))

        conn.execute("""
            UPDATE patients SET
                date_of_birth = COALESCE(?, date_of_birth),
                gender = COALESCE(?, gender),
                blood_group = COALESCE(?, blood_group),
                allergies = COALESCE(?, allergies),
                chronic_conditions = COALESCE(?, chronic_conditions),
                emergency_contact_name = COALESCE(?, emergency_contact_name),
                emergency_contact_relation = COALESCE(?, emergency_contact_relation),
                emergency_contact_phone = COALESCE(?, emergency_contact_phone),
                street = COALESCE(?, street),
                city = COALESCE(?, city),
                state = COALESCE(?, state),
                postal_code = COALESCE(?, postal_code),
                country = COALESCE(?, country),
                insurance_provider = COALESCE(?, insurance_provider),
                insurance_policy_number = COALESCE(?, insurance_policy_number),
                height_cm = ?,
                weight_kg = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (
            dob,
            data.get("gender"),
            data.get("blood_group"),
            allergies,
            chronic,
            data.get("emergency_contact_name"),
            data.get("emergency_contact_relation"),
            em_phone if em_phone else None,
            data.get("street"),
            data.get("city"),
            data.get("state"),
            data.get("postal_code"),
            data.get("country"),
            data.get("insurance_provider"),
            data.get("insurance_policy_number"),
            height,
            weight,
            patient_user_id
        ))

        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Medical profile updated successfully!"})

@patient_bp.route("/dashboard", methods=["GET"])
def dashboard():
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    if user["role"] in ["doctor", "admin"] and request.args.get("patient_id"):
        patient_id = int(request.args.get("patient_id"))
    else:
        patient_id = user["id"]
    conn = get_db()

    # Counts
    appt_count = conn.execute("SELECT COUNT(*) FROM appointments WHERE patient_id = ?", (patient_id,)).fetchone()[0]
    records_count = conn.execute("SELECT COUNT(*) FROM medical_records WHERE patient_id = ?", (patient_id,)).fetchone()[0]
    rx_count = conn.execute("SELECT COUNT(*) FROM prescriptions WHERE patient_id = ?", (patient_id,)).fetchone()[0]
    consult_count = conn.execute("SELECT COUNT(*) FROM consultations WHERE patient_id = ?", (patient_id,)).fetchone()[0]

    # Upcoming Appointments
    upcoming = conn.execute("""
        SELECT a.*, u.name as doctor_name, d.specialty, d.clinic_name, d.clinic_city
        FROM appointments a
        JOIN users u ON a.doctor_id = u.id
        LEFT JOIN doctors d ON u.id = d.user_id
        WHERE a.patient_id = ? AND a.status IN ('scheduled', 'confirmed')
        ORDER BY a.appointment_date ASC, a.time_slot ASC
        LIMIT 5
    """, (patient_id,)).fetchall()

    # Recent Medical Records
    records = conn.execute("""
        SELECT * FROM medical_records
        WHERE patient_id = ?
        ORDER BY created_at DESC
        LIMIT 4
    """, (patient_id,)).fetchall()

    # Recent Prescriptions
    prescriptions = conn.execute("""
        SELECT p.*, u.name as doctor_name, d.specialty
        FROM prescriptions p
        JOIN users u ON p.doctor_id = u.id
        LEFT JOIN doctors d ON u.id = d.user_id
        WHERE p.patient_id = ?
        ORDER BY p.prescribed_date DESC
        LIMIT 3
    """, (patient_id,)).fetchall()

    # Patient Vitals & Health Info
    patient_info = conn.execute("SELECT * FROM patients WHERE user_id = ?", (patient_id,)).fetchone()
    latest_consult = conn.execute("""
        SELECT c.*, u.name as doctor_name
        FROM consultations c
        JOIN users u ON c.doctor_id = u.id
        WHERE c.patient_id = ?
        ORDER BY c.consultation_date DESC, c.id DESC LIMIT 1
    """, (patient_id,)).fetchone()

    blood_pressure = latest_consult["blood_pressure"] if latest_consult and latest_consult["blood_pressure"] else "120/80"

    vitals = {}
    if patient_info:
        vitals = {
            "blood_group": patient_info["blood_group"],
            "blood_pressure": blood_pressure,
            "height_cm": patient_info["height_cm"],
            "weight_kg": patient_info["weight_kg"],
            "allergies": json.loads(patient_info["allergies"] or "[]"),
            "chronic_conditions": json.loads(patient_info["chronic_conditions"] or "[]")
        }

    conn.close()

    return jsonify({
        "success": True,
        "stats": {
            "appointments": appt_count,
            "medical_records": records_count,
            "prescriptions": rx_count,
            "consultations": consult_count
        },
        "vitals": vitals,
        "latest_consultation": dict(latest_consult) if latest_consult else None,
        "upcoming_appointments": [dict(row) for row in upcoming],
        "recent_records": [dict(row) for row in records],
        "recent_prescriptions": [
            {
                **dict(rx),
                "medications": json.loads(rx["medications"] or "[]"),
                "diagnostic_tests": json.loads(rx["diagnostic_tests"] or "[]")
            }
            for rx in prescriptions
        ]
    })

@patient_bp.route("/history", methods=["GET"])
def history():
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    if user["role"] in ["doctor", "admin"] and request.args.get("patient_id"):
        patient_id = int(request.args.get("patient_id"))
    else:
        patient_id = user["id"]
    conn = get_db()

    # Consultations with doctor info
    consultations = conn.execute("""
        SELECT c.*, u.name as doctor_name, d.specialty, d.clinic_name
        FROM consultations c
        JOIN users u ON c.doctor_id = u.id
        LEFT JOIN doctors d ON u.id = d.user_id
        WHERE c.patient_id = ?
        ORDER BY c.consultation_date DESC
    """, (patient_id,)).fetchall()

    parsed_consultations = []
    for c in consultations:
        item = dict(c)
        item["symptoms"] = json.loads(c["symptoms"] or "[]")
        rx = conn.execute("SELECT * FROM prescriptions WHERE consultation_id = ?", (c["id"],)).fetchone()
        if rx:
            rx_dict = dict(rx)
            rx_dict["medications"] = json.loads(rx["medications"] or "[]")
            rx_dict["diagnostic_tests"] = json.loads(rx["diagnostic_tests"] or "[]")
            item["prescription"] = rx_dict
        else:
            item["prescription"] = None
        parsed_consultations.append(item)

    # Diagnostic Reports & Medical Scans (Images, X-Rays, Lab Reports) for this patient
    records_rows = conn.execute("""
        SELECT r.*, u.name as uploader_name, u.role as uploader_role
        FROM medical_records r
        JOIN users u ON r.uploaded_by = u.id
        WHERE r.patient_id = ?
        ORDER BY r.record_date DESC, r.created_at DESC
    """, (patient_id,)).fetchall()

    parsed_records = []
    for r in records_rows:
        rec = dict(r)
        rec["tags"] = json.loads(r["tags"] or "[]")
        rec["facility_name"] = r["facility_or_doctor"] or "VALORA Health Diagnostics"
        file_url = r["file_url"] or ""
        rec["file_name"] = os.path.basename(file_url) if file_url else "report.pdf"
        file_ext = (file_url.rsplit(".", 1)[-1].lower() if "." in file_url else "")
        rec["is_image"] = file_ext in ["png", "jpg", "jpeg", "webp", "gif", "svg"]
        parsed_records.append(rec)

    conn.close()

    return jsonify({
        "success": True,
        "timeline": parsed_consultations,
        "reports": parsed_records
    })

@patient_bp.route("/<int:patient_id>/vitals", methods=["GET"])
@patient_bp.route("/vitals", methods=["GET"])
def get_patient_vitals(patient_id=None):
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    if not patient_id:
        target_id = request.args.get("patient_id")
        if target_id:
            try:
                patient_id = int(target_id)
            except (ValueError, TypeError):
                pass
        else:
            patient_id = user["id"]

    conn = get_db()
    # Check latest consultation for vitals
    latest_consult = conn.execute("""
        SELECT c.*, doc.name as doctor_name
        FROM consultations c
        JOIN users doc ON c.doctor_id = doc.id
        WHERE c.patient_id = ?
        ORDER BY c.consultation_date DESC, c.id DESC LIMIT 1
    """, (patient_id,)).fetchone()

    patient_row = conn.execute("SELECT * FROM patients WHERE user_id = ?", (patient_id,)).fetchone()
    conn.close()

    if latest_consult:
        vitals = {
            "blood_pressure": latest_consult["blood_pressure"] or "120/80 mmHg",
            "heart_rate": latest_consult["heart_rate"] if latest_consult["heart_rate"] else 72,
            "temperature": latest_consult["temperature"] if latest_consult["temperature"] else 98.6,
            "spo2": latest_consult["spo2"] if latest_consult["spo2"] else 99,
            "weight_kg": latest_consult["weight_kg"] if latest_consult["weight_kg"] else (patient_row["weight_kg"] if patient_row and patient_row["weight_kg"] else 70.0),
            "height_cm": latest_consult["height_cm"] if latest_consult["height_cm"] else (patient_row["height_cm"] if patient_row and patient_row["height_cm"] else 175.0),
            "last_updated_by": latest_consult["doctor_name"] or "Attending Physician",
            "last_updated_at": latest_consult["consultation_date"] or latest_consult["created_at"]
        }
    else:
        vitals = {
            "blood_pressure": "120/80 mmHg",
            "heart_rate": 72,
            "temperature": 98.6,
            "spo2": 99,
            "weight_kg": patient_row["weight_kg"] if patient_row and patient_row["weight_kg"] else 70.0,
            "height_cm": patient_row["height_cm"] if patient_row and patient_row["height_cm"] else 175.0,
            "last_updated_by": "System Baseline",
            "last_updated_at": None
        }

    return jsonify({"success": True, "vitals": vitals})
