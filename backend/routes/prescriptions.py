from flask import Blueprint, request, jsonify
from backend.database.connection import get_db
from backend.routes.auth import get_current_user_from_req
import json

prescriptions_bp = Blueprint("prescriptions", __name__, url_prefix="/api/prescriptions")

@prescriptions_bp.route("", methods=["GET", "POST"])
def prescriptions():
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    conn = get_db()

    if request.method == "GET":
        patient_id = request.args.get("patient_id")
        sql = """
            SELECT p.*,
                   pat.name as patient_name, pat.email as patient_email,
                   doc.name as doctor_name, doc.avatar as doctor_avatar, d.specialty as doctor_specialty, d.license_number, d.clinic_name
            FROM prescriptions p
            JOIN users pat ON p.patient_id = pat.id
            JOIN users doc ON p.doctor_id = doc.id
            LEFT JOIN doctors d ON doc.id = d.user_id
            WHERE 1=1
        """
        params = []

        if user["role"] == "patient":
            sql += " AND p.patient_id = ?"
            params.append(user["id"])
        elif user["role"] == "doctor":
            if patient_id:
                sql += " AND p.patient_id = ?"
                params.append(int(patient_id))
            else:
                sql += " AND p.doctor_id = ?"
                params.append(user["id"])
        elif patient_id:
            sql += " AND p.patient_id = ?"
            params.append(int(patient_id))

        sql += " ORDER BY p.prescribed_date DESC"
        rows = conn.execute(sql, params).fetchall()
        conn.close()

        result = []
        for r in rows:
            item = dict(r)
            item["medications"] = json.loads(r["medications"] or "[]")
            item["diagnostic_tests"] = json.loads(r["diagnostic_tests"] or "[]")
            result.append(item)

        return jsonify({"success": True, "prescriptions": result})

    elif request.method == "POST":
        if user["role"] not in ["doctor", "admin"]:
            conn.close()
            return jsonify({"success": False, "message": "Only medical practitioners can issue prescriptions."}), 403

        data = request.get_json() or {}
        patient_id = data.get("patient_id")
        consultation_id = data.get("consultation_id")
        appointment_id = data.get("appointment_id")
        medications = data.get("medications", [])
        diagnostic_tests = data.get("diagnostic_tests", [])
        general_advice = (data.get("general_advice") or "").strip()

        if not patient_id:
            conn.close()
            return jsonify({"success": False, "message": "Patient ID is mandatory."}), 400

        if not medications or len(medications) == 0:
            conn.close()
            return jsonify({"success": False, "message": "At least one medication is required."}), 400

        parsed_meds = []
        for m in medications:
            if isinstance(m, dict):
                m_name = (m.get("name") or m.get("medicineName") or m.get("drug_name") or "").strip()
                if m_name:
                    parsed_meds.append({
                        "name": m_name,
                        "medicineName": m_name,
                        "drug_name": m_name,
                        "dosage": (m.get("dosage") or "1 tablet").strip(),
                        "frequency": (m.get("frequency") or "Once daily").strip(),
                        "duration": (m.get("duration") or "5 days").strip(),
                        "instructions": (m.get("instructions") or "After meals").strip()
                    })

        if not parsed_meds:
            conn.close()
            return jsonify({"success": False, "message": "Valid medication name is required."}), 400

        diagnostic_tests = data.get("diagnostic_tests") or data.get("tests_recommended") or []
        general_advice = (data.get("general_advice") or data.get("general_instructions") or "").strip()

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO prescriptions (
                consultation_id, appointment_id, patient_id, doctor_id,
                medications, diagnostic_tests, general_advice
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            consultation_id,
            appointment_id,
            patient_id,
            user["id"],
            json.dumps(parsed_meds),
            json.dumps(diagnostic_tests),
            general_advice
        ))
        rx_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?)
        """, (user["id"], "PRESCRIPTION_ISSUED", "Prescription", str(rx_id), json.dumps({"patient_id": patient_id, "med_count": len(medications)})))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Electronic prescription issued successfully!",
            "prescription_id": rx_id
        }), 201

@prescriptions_bp.route("/<int:prescription_id>", methods=["GET"])
def get_prescription(prescription_id):
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    conn = get_db()
    row = conn.execute("""
        SELECT p.*,
               pat.name as patient_name, pat.email as patient_email, pat.phone as patient_phone,
               doc.name as doctor_name, d.specialty as doctor_specialty, d.license_number, d.clinic_name, d.clinic_city, d.clinic_street
        FROM prescriptions p
        JOIN users pat ON p.patient_id = pat.id
        JOIN users doc ON p.doctor_id = doc.id
        LEFT JOIN doctors d ON doc.id = d.user_id
        WHERE p.id = ?
    """, (prescription_id,)).fetchone()
    conn.close()

    if not row:
        return jsonify({"success": False, "message": "Prescription not found."}), 404

    item = dict(row)
    item["medications"] = json.loads(row["medications"] or "[]")
    item["diagnostic_tests"] = json.loads(row["diagnostic_tests"] or "[]")

    return jsonify({"success": True, "prescription": item})
