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
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_database(app=None):
    """Initialize SQLite database tables and ensure master administrator exists."""
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    if not schema_path.exists():
        schema_path = Config.BASE_DIR / "database" / "schema.sql"

    with get_db() as conn:
        with open(schema_path, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()

    ensure_admin_user()

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
