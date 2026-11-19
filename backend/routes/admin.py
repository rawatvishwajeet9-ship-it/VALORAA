from flask import Blueprint, request, jsonify
from backend.database.connection import get_db
from backend.routes.auth import get_current_user_from_req
import json

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

def require_admin():
    user = get_current_user_from_req()
    if not user or user["role"] != "admin":
        return None
    return user

@admin_bp.route("/stats", methods=["GET"])
def get_stats():
    admin = require_admin()
    if not admin:
        return jsonify({"success": False, "message": "Admin privileges required."}), 403

    conn = get_db()
    total_patients = conn.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
    total_doctors = conn.execute("SELECT COUNT(*) FROM doctors").fetchone()[0]
    verified_doctors = conn.execute("SELECT COUNT(*) FROM doctors WHERE is_verified = 1").fetchone()[0]
    pending_doctors = conn.execute("SELECT COUNT(*) FROM doctors WHERE is_verified = 0").fetchone()[0]
    total_appointments = conn.execute("SELECT COUNT(*) FROM appointments").fetchone()[0]
    total_records = conn.execute("SELECT COUNT(*) FROM medical_records").fetchone()[0]
    total_consultations = conn.execute("SELECT COUNT(*) FROM consultations").fetchone()[0]
    total_prescriptions = conn.execute("SELECT COUNT(*) FROM prescriptions").fetchone()[0]
    total_revenue = conn.execute("SELECT COALESCE(SUM(fee), 0) FROM appointments WHERE status IN ('confirmed', 'completed')").fetchone()[0]
    conn.close()

    return jsonify({
        "success": True,
        "stats": {
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "verified_doctors": verified_doctors,
            "pending_doctors": pending_doctors,
            "total_appointments": total_appointments,
            "total_records": total_records,
            "total_consultations": total_consultations,
            "total_prescriptions": total_prescriptions,
            "total_revenue": total_revenue
        }
    })

@admin_bp.route("/doctors", methods=["GET"])
def get_doctors():
    admin = require_admin()
    if not admin:
        return jsonify({"success": False, "message": "Admin privileges required."}), 403

    conn = get_db()
    rows = conn.execute("""
        SELECT d.*, u.name, u.email, u.phone, u.avatar, u.status as user_status, u.created_at as joined_date
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        ORDER BY d.is_verified ASC, u.created_at DESC
    """).fetchall()
    conn.close()

    doctors = []
    for r in rows:
        item = dict(r)
        item["qualifications"] = json.loads(r["qualifications"] or "[]")
        item["available_days"] = json.loads(r["available_days"] or "[]")
        doctors.append(item)

    return jsonify({"success": True, "doctors": doctors})

@admin_bp.route("/doctors/<int:doctor_id>/verify", methods=["POST", "PATCH"])
def verify_doctor(doctor_id):
    admin = require_admin()
    if not admin:
        return jsonify({"success": False, "message": "Admin privileges required."}), 403

    data = request.get_json() or {}
    action = data.get("action", "approve") # 'approve' or 'reject'
    notes = data.get("verification_notes", "")

    conn = get_db()
    doc = conn.execute("SELECT * FROM doctors WHERE id = ? OR user_id = ?", (doctor_id, doctor_id)).fetchone()
    if not doc:
        conn.close()
        return jsonify({"success": False, "message": "Doctor not found."}), 404

    target_user_id = doc["user_id"]

    if action == "approve":
        conn.execute("UPDATE doctors SET is_verified = 1, verification_notes = ? WHERE user_id = ?", (notes, target_user_id))
        conn.execute("UPDATE users SET status = 'active' WHERE id = ?", (target_user_id,))
        message = "Doctor medical license successfully verified and approved."
    else:
        conn.execute("UPDATE doctors SET is_verified = 0, verification_notes = ? WHERE user_id = ?", (notes, target_user_id))
        conn.execute("UPDATE users SET status = 'pending_verification' WHERE id = ?", (target_user_id,))
        message = "Doctor license marked as pending/rejected."

    conn.execute("""
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (admin["id"], "DOCTOR_VERIFICATION_UPDATED", "Doctor", str(doc["id"]), json.dumps({"action": action, "notes": notes})))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": message})

@admin_bp.route("/patients", methods=["GET"])
def get_patients():
    admin = require_admin()
    if not admin:
        return jsonify({"success": False, "message": "Admin privileges required."}), 403

    conn = get_db()
    rows = conn.execute("""
        SELECT p.*, u.name, u.email, u.phone, u.avatar, u.status as user_status, u.created_at as registered_date,
               (SELECT COUNT(*) FROM appointments WHERE patient_id = u.id) as total_appointments,
               (SELECT COUNT(*) FROM medical_records WHERE patient_id = u.id) as total_records
        FROM patients p
        JOIN users u ON p.user_id = u.id
        ORDER BY u.created_at DESC
    """).fetchall()
    conn.close()

    patients = []
    for r in rows:
        item = dict(r)
        item["allergies"] = json.loads(r["allergies"] or "[]")
        item["chronic_conditions"] = json.loads(r["chronic_conditions"] or "[]")
        patients.append(item)

    return jsonify({"success": True, "patients": patients})

@admin_bp.route("/users/<int:user_id>/status", methods=["PATCH"])
def toggle_user_status(user_id):
    admin = require_admin()
    if not admin:
        return jsonify({"success": False, "message": "Admin privileges required."}), 403

    data = request.get_json() or {}
    new_status = data.get("status")
    if new_status not in ["active", "suspended", "pending_verification"]:
        return jsonify({"success": False, "message": "Invalid status value."}), 400

    conn = get_db()
    conn.execute("UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_status, user_id))
    conn.execute("""
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (admin["id"], "USER_STATUS_TOGGLED", "User", str(user_id), json.dumps({"new_status": new_status})))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"User status updated to {new_status}."})

@admin_bp.route("/appointments", methods=["GET"])
def get_all_appointments():
    admin = require_admin()
    if not admin:
        return jsonify({"success": False, "message": "Admin privileges required."}), 403

    conn = get_db()
    rows = conn.execute("""
        SELECT a.*,
               pat.name as patient_name, pat.email as patient_email, pat.phone as patient_phone,
               doc.name as doctor_name, d.specialty as doctor_specialty, d.clinic_name, d.clinic_city
        FROM appointments a
        JOIN users pat ON a.patient_id = pat.id
        JOIN users doc ON a.doctor_id = doc.id
        LEFT JOIN doctors d ON doc.id = d.user_id
        ORDER BY a.appointment_date DESC, a.time_slot DESC
    """).fetchall()
    conn.close()

    return jsonify({"success": True, "appointments": [dict(r) for r in rows]})

@admin_bp.route("/analytics", methods=["GET"])
def get_analytics():
    admin = require_admin()
    if not admin:
        return jsonify({"success": False, "message": "Admin privileges required."}), 403

    conn = get_db()

    # Specialty distribution
    specialties = conn.execute("""
        SELECT specialty, COUNT(*) as count 
        FROM doctors 
        GROUP BY specialty
    """).fetchall()

    # Appointment status distribution
    statuses = conn.execute("""
        SELECT status, COUNT(*) as count 
        FROM appointments 
        GROUP BY status
    """).fetchall()

    # Records by type
    record_types = conn.execute("""
        SELECT record_type, COUNT(*) as count 
        FROM medical_records 
        GROUP BY record_type
    """).fetchall()

    # Monthly appointments simulation/data
    monthly = conn.execute("""
        SELECT strftime('%Y-%m', appointment_date) as month, COUNT(*) as count
        FROM appointments
        GROUP BY month
        ORDER BY month ASC
    """).fetchall()

    conn.close()

    return jsonify({
        "success": True,
        "specialties": [dict(s) for s in specialties],
        "appointment_statuses": [dict(s) for s in statuses],
        "record_types": [dict(r) for r in record_types],
        "monthly_appointments": [dict(m) for m in monthly]
    })

@admin_bp.route("/audit-logs", methods=["GET"])
def get_audit_logs():
    admin = require_admin()
    if not admin:
        return jsonify({"success": False, "message": "Admin privileges required."}), 403

    conn = get_db()
    rows = conn.execute("""
        SELECT l.*, u.name as user_name, u.role as user_role, u.email as user_email
        FROM audit_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
        LIMIT 50
    """).fetchall()
    conn.close()

    logs = []
    for r in rows:
        item = dict(r)
        item["details"] = json.loads(r["details"] or "{}")
        logs.append(item)

    return jsonify({"success": True, "logs": logs})
