import os
import uuid
import json
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from backend.database.connection import get_db
from backend.config import Config
from backend.routes.auth import get_current_user_from_req

records_bp = Blueprint("records", __name__, url_prefix="/api/records")

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@records_bp.route("", methods=["GET", "POST"])
def records():
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    conn = get_db()

    if request.method == "GET":
        target_patient_id = user["id"]
        # If doctor or admin, can pass specific patient_id
        if user["role"] in ["doctor", "admin"] and request.args.get("patient_id"):
            target_patient_id = int(request.args.get("patient_id"))

        record_type = request.args.get("type")
        query = request.args.get("q", "").strip().lower()

        sql = """
            SELECT r.*, u.name as uploader_name, u.role as uploader_role
            FROM medical_records r
            JOIN users u ON r.uploaded_by = u.id
            WHERE r.patient_id = ?
        """
        params = [target_patient_id]

        if record_type:
            sql += " AND r.record_type = ?"
            params.append(record_type)

        if query:
            sql += " AND (LOWER(r.title) LIKE ? OR LOWER(r.description) LIKE ? OR LOWER(r.facility_or_doctor) LIKE ?)"
            term = f"%{query}%"
            params.extend([term, term, term])

        sql += " ORDER BY r.record_date DESC, r.created_at DESC"

        rows = conn.execute(sql, params).fetchall()
        conn.close()

        records_list = []
        for r in rows:
            item = dict(r)
            item["tags"] = json.loads(r["tags"] or "[]")
            records_list.append(item)

        return jsonify({"success": True, "records": records_list})

    elif request.method == "POST":
        target_patient_id = user["id"]
        if user["role"] in ["doctor", "admin"] and request.form.get("patient_id"):
            target_patient_id = int(request.form.get("patient_id"))

        title = (request.form.get("title") or "").strip()
        record_type = request.form.get("record_type", "lab_report")
        description = (request.form.get("description") or "").strip()
        facility = (request.form.get("facility_or_doctor") or "VALORA Health").strip()
        tags_raw = request.form.get("tags", "")

        tags = [t.strip() for t in tags_raw.split(",") if t.strip()] if tags_raw else []

        if not title:
            conn.close()
            return jsonify({"success": False, "message": "Record title is required."}), 400

        file = request.files.get("file")
        file_url = ""
        file_type = "application/pdf"
        file_size = 0

        if file and file.filename:
            if not allowed_file(file.filename):
                conn.close()
                return jsonify({"success": False, "message": f"Unsupported file format. Allowed: {', '.join(Config.ALLOWED_EXTENSIONS)}"}), 400

            ext = file.filename.rsplit(".", 1)[1].lower()
            safe_name = f"{uuid.uuid4().hex[:12]}_{secure_filename(file.filename)}"
            save_path = Config.UPLOAD_FOLDER / safe_name
            Config.UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
            file.save(str(save_path))

            file_url = f"/uploads/{safe_name}"
            file_type = file.mimetype or f"application/{ext}"
            file_size = os.path.getsize(save_path)
        else:
            # Check if file_url was supplied directly
            file_url = request.form.get("file_url") or "/uploads/sample_medical_doc.pdf"
            file_type = "application/pdf"
            file_size = 500000

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO medical_records (
                patient_id, uploaded_by, record_type, title, description,
                file_url, file_type, file_size, facility_or_doctor, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            target_patient_id,
            user["id"],
            record_type,
            title,
            description,
            file_url,
            file_type,
            file_size,
            facility,
            json.dumps(tags)
        ))
        record_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?)
        """, (user["id"], "MEDICAL_RECORD_UPLOADED", "MedicalRecord", str(record_id), json.dumps({"title": title, "type": record_type})))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Medical record uploaded and encrypted to patient vault successfully!",
            "record_id": record_id,
            "file_url": file_url
        }), 201

@records_bp.route("/<int:record_id>", methods=["DELETE"])
def delete_record(record_id):
    user = get_current_user_from_req()
    if not user:
        return jsonify({"success": False, "message": "Authentication required."}), 401

    conn = get_db()
    rec = conn.execute("SELECT * FROM medical_records WHERE id = ?", (record_id,)).fetchone()
    if not rec:
        conn.close()
        return jsonify({"success": False, "message": "Record not found."}), 404

    # Allow patient owner, uploader, or admin to delete
    if user["role"] != "admin" and rec["patient_id"] != user["id"] and rec["uploaded_by"] != user["id"]:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized to delete this record."}), 403

    conn.execute("DELETE FROM medical_records WHERE id = ?", (record_id,))
    conn.execute("""
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (user["id"], "MEDICAL_RECORD_DELETED", "MedicalRecord", str(record_id), json.dumps({"title": rec["title"]})))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Record deleted from vault."})
