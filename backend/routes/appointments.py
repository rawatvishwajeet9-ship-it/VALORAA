from flask import Blueprint, request, jsonify
from backend.database.connection import get_db
from backend.routes.auth import get_current_user_from_req
import json

appointments_bp = Blueprint("appointments", __name__, url_prefix="/api/appointments")

@appointments_bp.route("", methods=["GET", "POST"])
def appointments():
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    conn = get_db()

    if request.method == "GET":
        status_filter = request.args.get("status")
        role = user["role"]
        user_id = user["id"]

        sql = """
            SELECT a.*, 
                   pat.name as patient_name, pat.email as patient_email, pat.phone as patient_phone,
                   doc.name as doctor_name, doc.email as doctor_email,
                   d.specialty as doctor_specialty, d.clinic_name, d.clinic_city, d.clinic_street,
                   rev.id as review_id, rev.rating as review_rating, rev.comment as review_comment,
                   rev.doctor_reply as review_doctor_reply, rev.created_at as review_created_at
            FROM appointments a
            JOIN users pat ON a.patient_id = pat.id
            JOIN users doc ON a.doctor_id = doc.id
            LEFT JOIN doctors d ON doc.id = d.user_id
            LEFT JOIN reviews rev ON a.id = rev.appointment_id
            WHERE 1=1
        """
        params = []

        if role == "patient":
            sql += " AND a.patient_id = ?"
            params.append(user_id)
        elif role == "doctor":
            sql += " AND a.doctor_id = ?"
            params.append(user_id)
        # admin sees all

        if status_filter:
            sql += " AND a.status = ?"
            params.append(status_filter)

        sql += " ORDER BY a.appointment_date DESC, a.time_slot DESC"

        rows = conn.execute(sql, params).fetchall()
        conn.close()

        appts = []
        for r in rows:
            item = dict(r)
            if item.get("review_id"):
                item["review"] = {
                    "id": item["review_id"],
                    "rating": item["review_rating"],
                    "comment": item["review_comment"],
                    "doctor_reply": item["review_doctor_reply"],
                    "created_at": item["review_created_at"]
                }
            else:
                item["review"] = None
            appts.append(item)

        return jsonify({
            "success": True,
            "appointments": appts
        })

    elif request.method == "POST":
        data = request.get_json() or {}
        patient_id = user["id"] if user["role"] == "patient" else (data.get("patient_id") or user["id"])
        doctor_id = data.get("doctor_id")
        appointment_date = data.get("appointment_date") # YYYY-MM-DD
        time_slot = data.get("time_slot")
        appt_type = data.get("type") or data.get("appointment_type") or "in-person"
        reason = (data.get("reason") or data.get("reason_for_visit") or "").strip()
        fee = data.get("fee")

        if not patient_id:
            conn.close()
            return jsonify({"success": False, "message": "Patient ID is required."}), 400

        if not doctor_id or not appointment_date or not time_slot or not reason:
            conn.close()
            return jsonify({"success": False, "message": "Doctor, appointment date, time slot, and reason are required."}), 400

        # Verify doctor exists and get fee if not provided
        doc = conn.execute("SELECT d.*, u.name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.user_id = ?", (doctor_id,)).fetchone()
        if not doc:
            conn.close()
            return jsonify({"success": False, "message": "Selected doctor was not found."}), 404

        if fee is None:
            fee = doc["consultation_fee"]

        # Check for slot conflicts
        existing = conn.execute("""
            SELECT id FROM appointments 
            WHERE doctor_id = ? AND date(appointment_date) = date(?) AND time_slot = ? AND status NOT IN ('cancelled')
        """, (doctor_id, appointment_date, time_slot)).fetchone()

        if existing:
            conn.close()
            return jsonify({"success": False, "message": f"This time slot ({time_slot}) with {doc['name']} is already booked. Please choose another slot."}), 409

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO appointments (
                patient_id, doctor_id, appointment_date, time_slot, type, status, reason, fee
            ) VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)
        """, (patient_id, doctor_id, appointment_date, time_slot, appt_type, reason, fee))
        appt_id = cursor.lastrowid

        # Grant doctor access to patient records automatically upon booking
        cursor.execute("""
            INSERT OR IGNORE INTO doctor_patient_access (patient_id, doctor_id, status, access_level)
            VALUES (?, ?, 'granted', 'full')
        """, (patient_id, doctor_id))

        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?)
        """, (user["id"], "APPOINTMENT_BOOKED", "Appointment", str(appt_id), json.dumps({"doctor": doc["name"], "date": appointment_date, "slot": time_slot})))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Appointment booked successfully!",
            "appointment_id": appt_id,
            "appointment": {
                "id": appt_id,
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "appointment_date": appointment_date,
                "time_slot": time_slot,
                "status": "scheduled"
            }
        }), 201

@appointments_bp.route("/<int:appointment_id>/status", methods=["PATCH", "PUT"])
def update_status(appointment_id):
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    data = request.get_json() or {}
    new_status = data.get("status")
    cancellation_reason = data.get("cancellation_reason", "")
    notes = data.get("notes", "")

    if new_status not in ["scheduled", "confirmed", "completed", "cancelled", "rescheduled"]:
        return jsonify({"success": False, "message": "Invalid appointment status."}), 400

    conn = get_db()
    appt = conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    if not appt:
        conn.close()
        return jsonify({"success": False, "message": "Appointment not found."}), 404

    # Authorization: Patient can only cancel their own; Doctor can update their own; Admin can update any
    if user["role"] == "patient" and appt["patient_id"] != user["id"]:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized."}), 403
    if user["role"] == "doctor" and appt["doctor_id"] != user["id"]:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized."}), 403

    conn.execute("""
        UPDATE appointments SET
            status = ?,
            cancellation_reason = CASE WHEN ? != '' THEN ? ELSE cancellation_reason END,
            notes = CASE WHEN ? != '' THEN ? ELSE notes END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (new_status, cancellation_reason, cancellation_reason, notes, notes, appointment_id))

    conn.execute("""
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (user["id"], "APPOINTMENT_STATUS_UPDATED", "Appointment", str(appointment_id), json.dumps({"new_status": new_status})))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"Appointment status updated to '{new_status}'."})

@appointments_bp.route("/booked-slots", methods=["GET"])
def get_booked_slots():
    doctor_id = request.args.get("doctor_id")
    date_val = request.args.get("date")
    if not doctor_id or not date_val:
        return jsonify({"success": True, "booked_slots": []})
    
    conn = get_db()
    rows = conn.execute("""
        SELECT time_slot FROM appointments
        WHERE doctor_id = ? AND date(appointment_date) = date(?) AND status NOT IN ('cancelled')
    """, (doctor_id, date_val)).fetchall()
    conn.close()
    
    slots = [r["time_slot"] for r in rows]
    return jsonify({"success": True, "booked_slots": slots})
