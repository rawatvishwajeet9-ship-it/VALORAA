import re
import json
from flask import Blueprint, request, jsonify
from backend.database.connection import get_db
from backend.routes.auth import get_current_user_from_req

doctor_bp = Blueprint("doctors", __name__, url_prefix="/api")

@doctor_bp.route("/doctors", methods=["GET"])
def list_doctors():
    specialty = request.args.get("specialty", "").strip()
    query = request.args.get("q", "").strip().lower()
    city = request.args.get("city", "").strip().lower()
    max_fee = request.args.get("max_fee", type=float)

    sql = """
        SELECT d.*, u.name, u.email, u.phone, u.avatar, u.status as user_status
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE d.is_verified = 1 AND u.status = 'active'
    """
    params = []

    if specialty:
        sql += " AND LOWER(d.specialty) = LOWER(?)"
        params.append(specialty)
    if query:
        sql += " AND (LOWER(u.name) LIKE ? OR LOWER(d.specialty) LIKE ? OR LOWER(d.biography) LIKE ?)"
        term = f"%{query}%"
        params.extend([term, term, term])
    if city:
        sql += " AND LOWER(d.clinic_city) LIKE ?"
        params.append(f"%{city}%")
    if max_fee:
        sql += " AND d.consultation_fee <= ?"
        params.append(max_fee)

    sql += " ORDER BY d.rating DESC, d.experience_years DESC"

    conn = get_db()
    rows = conn.execute(sql, params).fetchall()
    conn.close()

    result = []
    for row in rows:
        item = dict(row)
        item["qualifications"] = json.loads(row["qualifications"] or "[]")
        item["available_days"] = json.loads(row["available_days"] or "[]")
        result.append(item)

    return jsonify({"success": True, "doctors": result})

@doctor_bp.route("/doctors/<int:doctor_id>", methods=["GET"])
def get_doctor_details(doctor_id):
    conn = get_db()
    row = conn.execute("""
        SELECT d.*, u.name, u.email, u.phone, u.avatar, u.status as user_status
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = ? OR d.user_id = ?
    """, (doctor_id, doctor_id)).fetchone()
    conn.close()

    if not row:
        return jsonify({"success": False, "message": "Doctor not found."}), 404

    item = dict(row)
    item["qualifications"] = json.loads(row["qualifications"] or "[]")
    item["available_days"] = json.loads(row["available_days"] or "[]")

    return jsonify({"success": True, "doctor": item})

@doctor_bp.route("/doctor/dashboard", methods=["GET"])
def doctor_dashboard():
    user = get_current_user_from_req()
    if not user or user["role"] != "doctor":
        return jsonify({"success": False, "message": "Doctor authentication required."}), 401

    doc_id = user["id"]
    conn = get_db()

    total_patients = conn.execute("""
        SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE doctor_id = ?
    """, (doc_id,)).fetchone()[0]

    today_count = conn.execute("""
        SELECT COUNT(*) FROM appointments 
        WHERE doctor_id = ? AND date(appointment_date) = date('now')
    """, (doc_id,)).fetchone()[0]

    consult_count = conn.execute("""
        SELECT COUNT(*) FROM consultations WHERE doctor_id = ?
    """, (doc_id,)).fetchone()[0]

    rx_count = conn.execute("""
        SELECT COUNT(*) FROM prescriptions WHERE doctor_id = ?
    """, (doc_id,)).fetchone()[0]

    appointments = conn.execute("""
        SELECT a.*, u.name as patient_name, u.email as patient_email, u.phone as patient_phone,
               p.blood_group, p.date_of_birth, p.gender, p.allergies
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        LEFT JOIN patients p ON u.id = p.user_id
        WHERE a.doctor_id = ?
        ORDER BY 
            CASE a.status 
                WHEN 'confirmed' THEN 1 
                WHEN 'scheduled' THEN 2 
                WHEN 'completed' THEN 3 
                ELSE 4 
            END,
            a.appointment_date ASC, a.time_slot ASC
        LIMIT 10
    """, (doc_id,)).fetchall()

    doc_info = conn.execute("SELECT * FROM doctors WHERE user_id = ?", (doc_id,)).fetchone()
    
    # Recent consultations
    recent_consults = conn.execute("""
        SELECT c.*, u.name as patient_name, u.email as patient_email
        FROM consultations c
        JOIN users u ON c.patient_id = u.id
        WHERE c.doctor_id = ?
        ORDER BY c.consultation_date DESC
        LIMIT 5
    """, (doc_id,)).fetchall()
    
    conn.close()

    parsed_queue = []
    for a in appointments:
        item = dict(a)
        item["allergies"] = json.loads(a["allergies"] or "[]") if a["allergies"] else []
        parsed_queue.append(item)

    parsed_consults = []
    for c in recent_consults:
        c_item = dict(c)
        c_item["symptoms"] = json.loads(c["symptoms"] or "[]")
        parsed_consults.append(c_item)

    return jsonify({
        "success": True,
        "doctor": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "avatar": user["avatar"] or ""
        },
        "stats": {
            "name": user["name"],
            "email": user["email"],
            "total_patients": total_patients,
            "today_appointments": today_count,
            "total_consultations": consult_count,
            "prescriptions_issued": rx_count,
            "is_verified": bool(doc_info["is_verified"]) if doc_info else False,
            "rating": doc_info["rating"] if doc_info else 4.8,
            "consultation_fee": doc_info["consultation_fee"] if doc_info else 500,
            "specialty": doc_info["specialty"] if doc_info else "General Medicine",
            "license_number": doc_info["license_number"] if doc_info else ""
        },
        "appointment_queue": parsed_queue,
        "recent_consultations": parsed_consults
    })

@doctor_bp.route("/doctor/profile", methods=["GET", "PUT"])
def doctor_profile():
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    doc_user_id = user["id"]
    if user["role"] == "admin" and request.args.get("doctor_id"):
        doc_user_id = int(request.args.get("doctor_id"))

    conn = get_db()
    if request.method == "GET":
        row = conn.execute("""
            SELECT d.*, u.name, u.email, u.phone, u.avatar, u.status as user_status
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ?
        """, (doc_user_id,)).fetchone()
        conn.close()

        if not row:
            return jsonify({"success": False, "message": "Doctor profile not found."}), 404

        item = dict(row)
        item["qualifications"] = json.loads(row["qualifications"] or "[]")
        item["available_days"] = json.loads(row["available_days"] or "[]")
        return jsonify({"success": True, "profile": item})

    elif request.method == "PUT":
        data = request.get_json() or {}

        # Validate Phone
        phone = data.get("phone")
        if phone:
            cleaned_phone = re.sub(r'[^0-9]', '', str(phone))
            if len(cleaned_phone) < 9 or len(cleaned_phone) > 11:
                conn.close()
                return jsonify({"success": False, "message": "Clinic phone number must contain 9 to 11 digits."}), 400
            phone = cleaned_phone

        # Validate Fee: 50 to 50000
        fee = data.get("consultation_fee")
        if fee is not None:
            try:
                fee_val = float(fee)
                if fee_val < 50 or fee_val > 50000:
                    conn.close()
                    return jsonify({"success": False, "message": "Consultation fee must be between ₹50 and ₹50,000."}), 400
                fee = fee_val
            except (ValueError, TypeError):
                conn.close()
                return jsonify({"success": False, "message": "Invalid consultation fee."}), 400

        # Validate Experience: 1 to 60
        exp = data.get("experience_years")
        if exp is not None:
            try:
                exp_val = int(exp)
                if exp_val < 1 or exp_val > 60:
                    conn.close()
                    return jsonify({"success": False, "message": "Years of experience must be between 1 and 60."}), 400
                exp = exp_val
            except (ValueError, TypeError):
                conn.close()
                return jsonify({"success": False, "message": "Invalid experience years."}), 400

        name = data.get("name")
        avatar = data.get("avatar")
        if name or phone or avatar:
            conn.execute("""
                UPDATE users SET 
                    name = COALESCE(?, name),
                    phone = COALESCE(?, phone),
                    avatar = COALESCE(?, avatar),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (name, phone, avatar, doc_user_id))

        quals = json.dumps(data["qualifications"]) if "qualifications" in data else None
        days = json.dumps(data["available_days"]) if "available_days" in data else None

        conn.execute("""
            UPDATE doctors SET
                specialty = COALESCE(?, specialty),
                qualifications = COALESCE(?, qualifications),
                experience_years = COALESCE(?, experience_years),
                consultation_fee = COALESCE(?, consultation_fee),
                biography = COALESCE(?, biography),
                clinic_name = COALESCE(?, clinic_name),
                clinic_street = COALESCE(?, clinic_street),
                clinic_city = COALESCE(?, clinic_city),
                clinic_state = COALESCE(?, clinic_state),
                clinic_postal_code = COALESCE(?, clinic_postal_code),
                available_days = COALESCE(?, available_days),
                start_time = COALESCE(?, start_time),
                end_time = COALESCE(?, end_time),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (
            data.get("specialty"),
            quals,
            exp,
            fee,
            data.get("biography"),
            data.get("clinic_name"),
            data.get("clinic_street"),
            data.get("clinic_city"),
            data.get("clinic_state"),
            data.get("clinic_postal_code"),
            days,
            data.get("start_time"),
            data.get("end_time"),
            doc_user_id
        ))

        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Physician clinical profile updated successfully!"})

@doctor_bp.route("/doctor/patients", methods=["GET"])
def doctor_patients():
    user = get_current_user_from_req()
    if not user or user["role"] not in ["doctor", "admin"]:
        return jsonify({"success": False, "message": "Doctor or Admin authentication required."}), 401

    doc_id = user["id"]
    conn = get_db()

    patients = conn.execute("""
        SELECT DISTINCT u.id, u.name, u.email, u.phone,
               p.gender, p.blood_group, p.date_of_birth, p.allergies, p.chronic_conditions,
               p.emergency_contact_name, p.emergency_contact_phone, p.insurance_provider,
               (SELECT COUNT(*) FROM appointments WHERE patient_id = u.id AND doctor_id = ?) as total_visits,
               (SELECT MAX(appointment_date) FROM appointments WHERE patient_id = u.id AND doctor_id = ?) as last_visit
        FROM users u
        JOIN patients p ON u.id = p.user_id
        WHERE u.id IN (
            SELECT patient_id FROM appointments WHERE doctor_id = ?
            UNION
            SELECT patient_id FROM doctor_patient_access WHERE doctor_id = ?
        )
        ORDER BY last_visit DESC
    """, (doc_id, doc_id, doc_id, doc_id)).fetchall()

    res = []
    for p in patients:
        item = dict(p)
        item["allergies"] = json.loads(p["allergies"] or "[]")
        item["chronic_conditions"] = json.loads(p["chronic_conditions"] or "[]")
        res.append(item)

    conn.close()
    return jsonify({"success": True, "patients": res})
