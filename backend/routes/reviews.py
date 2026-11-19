import json
from flask import Blueprint, request, jsonify
from backend.database.connection import get_db
from backend.routes.auth import get_current_user_from_req

reviews_bp = Blueprint("reviews", __name__, url_prefix="/api")

@reviews_bp.route("/reviews", methods=["POST"])
def submit_review():
    """
    Submit or update a rating & review for an appointment.
    STRICT RULE: Only patients can review, and ONLY after the appointment status is 'completed'.
    """
    user = get_current_user_from_req()
    if not user or user["role"] != "patient":
        return jsonify({"success": False, "message": "Only registered patients can submit physician reviews."}), 403

    data = request.get_json() or {}
    appointment_id = data.get("appointment_id")
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip()

    if not appointment_id:
        return jsonify({"success": False, "message": "Appointment ID is required."}), 400

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Rating must be a whole number between 1 and 5 stars."}), 400

    conn = get_db()
    appt = conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone()
    if not appt:
        conn.close()
        return jsonify({"success": False, "message": "Appointment record not found."}), 404

    # Verification: must belong to the patient
    if appt["patient_id"] != user["id"]:
        conn.close()
        return jsonify({"success": False, "message": "You can only review consultations for your own appointments."}), 403

    # Verification: must be completed
    if appt["status"] != "completed":
        conn.close()
        return jsonify({
            "success": False, 
            "message": "Reviews can only be submitted after your consultation has been marked as completed by your doctor."
        }), 400

    # Check for existing review on this appointment
    existing = conn.execute("SELECT id FROM reviews WHERE appointment_id = ?", (appointment_id,)).fetchone()
    if existing:
        conn.execute("""
            UPDATE reviews 
            SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP
            WHERE appointment_id = ?
        """, (rating, comment, appointment_id))
        review_id = existing["id"]
        action = "DOCTOR_REVIEW_UPDATED"
    else:
        conn.execute("""
            INSERT INTO reviews (appointment_id, patient_id, doctor_id, rating, comment)
            VALUES (?, ?, ?, ?, ?)
        """, (appointment_id, user["id"], appt["doctor_id"], rating, comment))
        review_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        action = "DOCTOR_REVIEW_SUBMITTED"

    # Recalculate doctor rating and total reviews
    stat = conn.execute("""
        SELECT COUNT(*) as total, AVG(rating) as avg_rating
        FROM reviews
        WHERE doctor_id = ?
    """, (appt["doctor_id"],)).fetchone()

    total_reviews = stat["total"] if stat else 0
    avg_rating = round(stat["avg_rating"], 1) if (stat and stat["avg_rating"]) else 5.0

    conn.execute("""
        UPDATE doctors
        SET rating = ?, total_reviews = ?
        WHERE user_id = ?
    """, (avg_rating, total_reviews, appt["doctor_id"]))

    # Audit log
    conn.execute("""
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (user["id"], action, "Review", str(review_id), json.dumps({
        "doctor_id": appt["doctor_id"],
        "appointment_id": appointment_id,
        "rating": rating
    })))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Review submitted successfully! Thank you for rating your consultation.",
        "review": {
            "id": review_id,
            "appointment_id": appointment_id,
            "rating": rating,
            "comment": comment
        },
        "doctor_rating": avg_rating,
        "doctor_total_reviews": total_reviews
    })

@reviews_bp.route("/doctors/<int:doctor_id>/reviews", methods=["GET"])
def get_doctor_reviews(doctor_id):
    """Fetch all verified patient reviews for a physician."""
    conn = get_db()
    rows = conn.execute("""
        SELECT r.*, u.name as patient_name, u.avatar as patient_avatar,
               a.appointment_date, a.type as appointment_type
        FROM reviews r
        JOIN users u ON r.patient_id = u.id
        JOIN appointments a ON r.appointment_id = a.id
        WHERE r.doctor_id = ?
        ORDER BY r.created_at DESC
    """, (doctor_id,)).fetchall()

    stat = conn.execute("""
        SELECT COUNT(*) as total, AVG(rating) as avg_rating
        FROM reviews
        WHERE doctor_id = ?
    """, (doctor_id,)).fetchone()
    conn.close()

    return jsonify({
        "success": True,
        "reviews": [dict(r) for r in rows],
        "average_rating": round(stat["avg_rating"], 1) if (stat and stat["avg_rating"]) else 5.0,
        "total_reviews": stat["total"] if stat else 0
    })

@reviews_bp.route("/reviews/<int:review_id>/reply", methods=["POST"])
def reply_to_review(review_id):
    """Physician official response to a verified patient review."""
    user = get_current_user_from_req()
    if not user or user["role"] != "doctor":
        return jsonify({"success": False, "message": "Physician authentication required."}), 403

    data = request.get_json() or {}
    reply = (data.get("reply") or "").strip()
    if not reply:
        return jsonify({"success": False, "message": "Reply content cannot be empty."}), 400

    conn = get_db()
    rev = conn.execute("SELECT * FROM reviews WHERE id = ?", (review_id,)).fetchone()
    if not rev:
        conn.close()
        return jsonify({"success": False, "message": "Review not found."}), 404

    if rev["doctor_id"] != user["id"]:
        conn.close()
        return jsonify({"success": False, "message": "You can only reply to reviews for your own consultations."}), 403

    conn.execute("""
        UPDATE reviews 
        SET doctor_reply = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    """, (reply, review_id))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Official reply posted successfully."})
