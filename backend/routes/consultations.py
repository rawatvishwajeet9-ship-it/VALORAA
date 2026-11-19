import json
import re
from flask import Blueprint, request, jsonify
from backend.database.connection import get_db
from backend.routes.auth import get_current_user_from_req

consultations_bp = Blueprint("consultations", __name__, url_prefix="/api/consultations")

@consultations_bp.route("", methods=["GET", "POST"])
def consultations():
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    conn = get_db()

    if request.method == "GET":
        patient_id = request.args.get("patient_id")
        sql = """
            SELECT c.*, 
                   pat.name as patient_name, pat.email as patient_email,
                   doc.name as doctor_name, d.specialty as doctor_specialty, d.clinic_name
            FROM consultations c
            JOIN users pat ON c.patient_id = pat.id
            JOIN users doc ON c.doctor_id = doc.id
            LEFT JOIN doctors d ON doc.id = d.user_id
            WHERE 1=1
        """
        params = []

        if user["role"] == "patient":
            sql += " AND c.patient_id = ?"
            params.append(user["id"])
        elif user["role"] == "doctor":
            if patient_id:
                sql += " AND c.patient_id = ?"
                params.append(int(patient_id))
            else:
                sql += " AND c.doctor_id = ?"
                params.append(user["id"])
        elif patient_id:
            sql += " AND c.patient_id = ?"
            params.append(int(patient_id))

        sql += " ORDER BY c.consultation_date DESC"
        rows = conn.execute(sql, params).fetchall()
        conn.close()

        result = []
        for r in rows:
            item = dict(r)
            item["symptoms"] = json.loads(r["symptoms"] or "[]")
            result.append(item)

        return jsonify({"success": True, "consultations": result})

    elif request.method == "POST":
        if user["role"] not in ["doctor", "admin"]:
            conn.close()
            return jsonify({"success": False, "message": "Only doctors can author consultation clinical notes."}), 403

        data = request.get_json() or {}
        patient_id = data.get("patient_id")
        appointment_id = data.get("appointment_id")
        diagnosis = (data.get("diagnosis") or "").strip()

        if not patient_id or not diagnosis or len(diagnosis) < 2:
            conn.close()
            return jsonify({"success": False, "message": "Valid Clinical Diagnosis is mandatory (min. 2 characters)."}), 400

        # Validate Blood Pressure strictly
        bp_raw = str(data.get("blood_pressure") or "").strip()
        bp_match = re.match(r"^(\d{2,3})\s*/\s*(\d{2,3})(?:\s*mmHg)?$", bp_raw, re.IGNORECASE)
        if not bp_match:
            conn.close()
            return jsonify({
                "success": False, 
                "message": "Invalid Blood Pressure format. Must be in systolic/diastolic format (e.g. 120/80 mmHg)."
            }), 400

        systolic = int(bp_match.group(1))
        diastolic = int(bp_match.group(2))

        if systolic < 50 or systolic > 260:
            conn.close()
            return jsonify({"success": False, "message": "Systolic blood pressure must be between 50 and 260 mmHg."}), 400

        if diastolic < 30 or diastolic > 180:
            conn.close()
            return jsonify({"success": False, "message": "Diastolic blood pressure must be between 30 and 180 mmHg."}), 400

        if systolic <= diastolic:
            conn.close()
            return jsonify({"success": False, "message": "Systolic pressure must be strictly greater than diastolic pressure."}), 400

        bp = f"{systolic}/{diastolic} mmHg"
        
        # Pulse / Heart rate: 35 to 220 bpm
        hr_val = data.get("heart_rate")
        if hr_val not in [None, ""]:
            try:
                hr = int(hr_val)
                if hr < 35 or hr > 220:
                    conn.close()
                    return jsonify({"success": False, "message": "Heart rate / pulse must be between 35 and 220 bpm."}), 400
            except (ValueError, TypeError):
                conn.close()
                return jsonify({"success": False, "message": "Invalid heart rate value. Must be a whole number."}), 400
        else:
            hr = 72

        # Temperature: 90.0 to 108.0 °F
        temp_val = data.get("temperature")
        if temp_val not in [None, ""]:
            try:
                temp = float(temp_val)
                if temp < 90.0 or temp > 108.0:
                    conn.close()
                    return jsonify({"success": False, "message": "Body temperature must be between 90.0°F and 108.0°F."}), 400
            except (ValueError, TypeError):
                conn.close()
                return jsonify({"success": False, "message": "Invalid temperature value."}), 400
        else:
            temp = 98.6

        # SpO2: 60 to 100 %
        spo2_val = data.get("spo2")
        if spo2_val not in [None, ""]:
            try:
                spo2 = int(spo2_val)
                if spo2 < 60 or spo2 > 100:
                    conn.close()
                    return jsonify({"success": False, "message": "SpO2 oxygen saturation must be between 60% and 100%."}), 400
            except (ValueError, TypeError):
                conn.close()
                return jsonify({"success": False, "message": "Invalid SpO2 value. Must be between 60 and 100."}), 400
        else:
            spo2 = 99

        # Weight: 1 to 400 kg
        weight_val = data.get("weight_kg")
        if weight_val not in [None, "", "null"]:
            try:
                weight = float(weight_val)
                if weight < 1.0 or weight > 400.0:
                    conn.close()
                    return jsonify({"success": False, "message": "Patient weight must be between 1 kg and 400 kg."}), 400
            except (ValueError, TypeError):
                conn.close()
                return jsonify({"success": False, "message": "Invalid weight value."}), 400
        else:
            weight = None

        # Height: 30 to 280 cm
        height_val = data.get("height_cm")
        if height_val not in [None, "", "null"]:
            try:
                height = float(height_val)
                if height < 30.0 or height > 280.0:
                    conn.close()
                    return jsonify({"success": False, "message": "Patient height must be between 30 cm and 280 cm."}), 400
            except (ValueError, TypeError):
                conn.close()
                return jsonify({"success": False, "message": "Invalid height value."}), 400
        else:
            height = None

        symptoms = data.get("symptoms", [])
        if isinstance(symptoms, str):
            symptoms = [s.strip() for s in symptoms.split(",") if s.strip()]

        follow_up_date = (data.get("follow_up_date") or "").strip()
        if follow_up_date:
            from datetime import date
            try:
                f_date = date.fromisoformat(follow_up_date[:10])
                if f_date < date.today():
                    conn.close()
                    return jsonify({"success": False, "message": "Follow-up review date cannot be in the past."}), 400
            except (ValueError, TypeError):
                pass

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO consultations (
                appointment_id, patient_id, doctor_id, symptoms, diagnosis,
                clinical_notes, blood_pressure, heart_rate, temperature,
                spo2, respiratory_rate, weight_kg, height_cm, treatment_plan, follow_up_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            appointment_id,
            patient_id,
            user["id"],
            json.dumps(symptoms),
            diagnosis,
            data.get("clinical_notes", ""),
            bp,
            hr,
            temp,
            spo2,
            data.get("respiratory_rate", 16),
            weight,
            height,
            data.get("treatment_plan", ""),
            data.get("follow_up_date", "")
        ))
        consult_id = cursor.lastrowid

        # Update appointment status if linked
        if appointment_id:
            cursor.execute("""
                UPDATE appointments SET status = 'completed', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (appointment_id,))

        # Update patient vitals in patients profile table if provided
        if weight or height:
            cursor.execute("""
                UPDATE patients SET 
                    weight_kg = COALESCE(?, weight_kg),
                    height_cm = COALESCE(?, height_cm),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            """, (weight, height, patient_id))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Clinical consultation successfully recorded and verified.",
            "consultation_id": consult_id,
            "consultation": {
                "id": consult_id,
                "patient_id": patient_id,
                "appointment_id": appointment_id,
                "diagnosis": diagnosis
            }
        }), 201

@consultations_bp.route("/<int:consult_id>", methods=["GET"])
def get_consultation(consult_id):
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    conn = get_db()
    row = conn.execute("""
        SELECT c.*, 
               pat.name as patient_name, pat.email as patient_email,
               doc.name as doctor_name, d.specialty as doctor_specialty, d.license_number, d.clinic_name
        FROM consultations c
        JOIN users pat ON c.patient_id = pat.id
        JOIN users doc ON c.doctor_id = doc.id
        LEFT JOIN doctors d ON doc.id = d.user_id
        WHERE c.id = ?
    """, (consult_id,)).fetchone()
    conn.close()

    if not row:
        return jsonify({"success": False, "message": "Consultation record not found."}), 404

    item = dict(row)
    item["symptoms"] = json.loads(row["symptoms"] or "[]")
    return jsonify({"success": True, "consultation": item})
