import re
import json
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from backend.database.connection import get_db

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

def get_current_user_from_req():
    """Extract authenticated user either from X-User-Id header, session, or query param."""
    user_id = request.headers.get("X-User-Id") or session.get("user_id") or request.args.get("user_id")
    if not user_id:
        return None
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return None

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return user

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required."}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not user:
        conn.close()
        return jsonify({"success": False, "message": "Invalid email or password."}), 401

    if user["status"] == "suspended":
        conn.close()
        return jsonify({"success": False, "message": "This account has been suspended. Please contact hospital administration."}), 403

    if not check_password_hash(user["password_hash"], password):
        conn.close()
        return jsonify({"success": False, "message": "Invalid email or password."}), 401

    # Update last login
    conn.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (user["id"],))
    conn.execute(
        "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
        (user["id"], "USER_LOGIN", "User", str(user["id"]), json.dumps({"email": email, "role": user["role"]}))
    )
    conn.commit()

    # Get specific profile info
    profile = {}
    if user["role"] == "patient":
        pat = conn.execute("SELECT * FROM patients WHERE user_id = ?", (user["id"],)).fetchone()
        if pat:
            profile = dict(pat)
            profile["allergies"] = json.loads(pat["allergies"] or "[]")
            profile["chronic_conditions"] = json.loads(pat["chronic_conditions"] or "[]")
    elif user["role"] == "doctor":
        doc = conn.execute("SELECT * FROM doctors WHERE user_id = ?", (user["id"],)).fetchone()
        if doc:
            profile = dict(doc)
            profile["qualifications"] = json.loads(doc["qualifications"] or "[]")
            profile["available_days"] = json.loads(doc["available_days"] or "[]")

    conn.close()

    session["user_id"] = user["id"]
    session["role"] = user["role"]
    session["name"] = user["name"]

    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "phone": user["phone"],
        "avatar": user["avatar"],
        "status": user["status"],
        "profile": profile
    }

    return jsonify({
        "success": True,
        "message": f"Welcome back, {user['name']}!",
        "user": user_data
    })

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role", "patient").strip().lower()
    raw_phone = (data.get("phone") or "").strip()

    if not name or not email or not password:
        return jsonify({"success": False, "message": "Name, email, and password are required."}), 400

    if role not in ["patient", "doctor"]:
        return jsonify({"success": False, "message": "Role must be patient or doctor."}), 400

    # Phone validation: strictly digits, 9 to 11 digits, absolutely no text/letters allowed
    if not raw_phone:
        return jsonify({"success": False, "message": "Phone number is required (9 to 11 digits, numbers only)."}), 400

    if re.search(r'[a-zA-Z]', raw_phone):
        return jsonify({"success": False, "message": "Phone number cannot contain letters or text. Enter digits only."}), 400

    phone = re.sub(r'[^0-9]', '', raw_phone)
    if len(phone) < 9 or len(phone) > 11:
        return jsonify({"success": False, "message": "Phone number must contain between 9 and 11 digits."}), 400

    # DOB validation: year <= 2022 and >= 1900
    dob = (data.get("date_of_birth") or "").strip()
    if dob:
        try:
            yr = int(dob.split("-")[0])
            if yr > 2022 or yr < 1900:
                return jsonify({"success": False, "message": "Date of birth year must be 2022 or earlier."}), 400
        except (ValueError, IndexError):
            return jsonify({"success": False, "message": "Invalid date of birth format."}), 400

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"success": False, "message": "An account with this email already exists."}), 409

    password_hash = generate_password_hash(password)
    initial_status = "pending_verification" if role == "doctor" else "active"

    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (name, email, password_hash, role, phone, status)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (name, email, password_hash, role, phone, initial_status))
    user_id = cursor.lastrowid

    if role == "patient":
        em_phone = re.sub(r'[^0-9]', '', data.get("emergency_contact_phone") or "")
        cursor.execute("""
            INSERT INTO patients (
                user_id, date_of_birth, gender, blood_group, allergies, chronic_conditions,
                emergency_contact_name, emergency_contact_phone, street, city, state, postal_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            dob,
            data.get("gender", "prefer_not_to_say"),
            data.get("blood_group", "Unknown"),
            json.dumps(data.get("allergies", [])),
            json.dumps(data.get("chronic_conditions", [])),
            data.get("emergency_contact_name", ""),
            em_phone,
            data.get("street", ""),
            data.get("city", ""),
            data.get("state", ""),
            data.get("postal_code", "")
        ))
    elif role == "doctor":
        license_num = data.get("license_number") or f"LIC-{user_id}-VALORA"
        cursor.execute("""
            INSERT INTO doctors (
                user_id, specialty, qualifications, experience_years, license_number,
                consultation_fee, biography, clinic_name, clinic_city, clinic_state,
                available_days, start_time, end_time, is_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            data.get("specialty", "General Medicine"),
            json.dumps(data.get("qualifications", ["MBBS"])),
            int(data.get("experience_years", 1)),
            license_num,
            float(data.get("consultation_fee", 500)),
            data.get("biography", ""),
            data.get("clinic_name", "VALORA Care Clinic"),
            data.get("city", "Mumbai"),
            data.get("state", "Maharashtra"),
            json.dumps(data.get("available_days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])),
            data.get("start_time", "09:00"),
            data.get("end_time", "17:00"),
            0 # unverified by default
        ))

    conn.execute(
        "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
        (user_id, "USER_REGISTER", "User", str(user_id), json.dumps({"email": email, "role": role}))
    )
    conn.commit()
    conn.close()

    session["user_id"] = user_id
    session["role"] = role
    session["name"] = name

    return jsonify({
        "success": True,
        "message": "Account created successfully!" + (" Doctor accounts require administrator license verification before accepting appointments." if role == "doctor" else ""),
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "role": role,
            "phone": phone,
            "status": initial_status
        }
    }), 201

@auth_bp.route("/me", methods=["GET"])
def me():
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Not authenticated."}), 401

    conn = get_db()
    profile = {}
    if user["role"] == "patient":
        pat = conn.execute("SELECT * FROM patients WHERE user_id = ?", (user["id"],)).fetchone()
        if pat:
            profile = dict(pat)
            profile["allergies"] = json.loads(pat["allergies"] or "[]")
            profile["chronic_conditions"] = json.loads(pat["chronic_conditions"] or "[]")
    elif user["role"] == "doctor":
        doc = conn.execute("SELECT * FROM doctors WHERE user_id = ?", (user["id"],)).fetchone()
        if doc:
            profile = dict(doc)
            profile["qualifications"] = json.loads(doc["qualifications"] or "[]")
            profile["available_days"] = json.loads(doc["available_days"] or "[]")

    conn.close()

    return jsonify({
        "success": True,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "phone": user["phone"],
            "avatar": user["avatar"],
            "status": user["status"],
            "profile": profile
        }
    })

@auth_bp.route("/avatar", methods=["POST"])
def update_avatar():
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    data = request.get_json() or {}
    avatar = data.get("avatar") or ""
    if not avatar:
        return jsonify({"success": False, "message": "No image data provided."}), 400

    # Limit base64 data to ~7MB
    if len(avatar) > 7 * 1024 * 1024:
        return jsonify({"success": False, "message": "Image size exceeds maximum limit of 4MB."}), 400

    conn = get_db()
    conn.execute("UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (avatar, user["id"]))
    conn.execute(
        "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
        (user["id"], "UPDATE_AVATAR", "User", str(user["id"]), json.dumps({"role": user["role"]}))
    )
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "avatar": avatar,
        "message": "Profile picture updated successfully."
    })

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully."})
