-- VALORA Healthcare Management & Digital Medical Records Platform
-- SQLite Database Schema

PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'admin')),
    phone TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'pending_verification')),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patients Profile Table
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth TEXT DEFAULT '',
    gender TEXT DEFAULT 'prefer_not_to_say' CHECK(gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    blood_group TEXT DEFAULT 'Unknown',
    allergies TEXT DEFAULT '[]', -- JSON array of strings
    chronic_conditions TEXT DEFAULT '[]', -- JSON array of strings
    emergency_contact_name TEXT DEFAULT '',
    emergency_contact_relation TEXT DEFAULT '',
    emergency_contact_phone TEXT DEFAULT '',
    street TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    postal_code TEXT DEFAULT '',
    country TEXT DEFAULT 'India',
    insurance_provider TEXT DEFAULT '',
    insurance_policy_number TEXT DEFAULT '',
    height_cm REAL DEFAULT NULL,
    weight_kg REAL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Doctors Profile Table
CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialty TEXT NOT NULL,
    qualifications TEXT DEFAULT '["MBBS"]', -- JSON array of strings
    experience_years INTEGER DEFAULT 1,
    license_number TEXT NOT NULL UNIQUE,
    consultation_fee REAL DEFAULT 500,
    biography TEXT DEFAULT '',
    clinic_name TEXT DEFAULT 'VALORA Care Center',
    clinic_street TEXT DEFAULT '',
    clinic_city TEXT DEFAULT '',
    clinic_state TEXT DEFAULT '',
    clinic_postal_code TEXT DEFAULT '',
    available_days TEXT DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]', -- JSON array
    start_time TEXT DEFAULT '09:00',
    end_time TEXT DEFAULT '17:00',
    is_verified INTEGER DEFAULT 0, -- 1 = verified, 0 = pending
    verification_notes TEXT DEFAULT '',
    rating REAL DEFAULT 4.8,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_date TEXT NOT NULL, -- YYYY-MM-DD
    time_slot TEXT NOT NULL,
    type TEXT DEFAULT 'in-person' CHECK(type IN ('in-person', 'teleconsultation', 'follow-up')),
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
    reason TEXT NOT NULL,
    notes TEXT DEFAULT '',
    cancellation_reason TEXT DEFAULT '',
    fee REAL DEFAULT 500,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Medical Records Vault
CREATE TABLE IF NOT EXISTS medical_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    record_type TEXT NOT NULL CHECK(record_type IN ('lab_report', 'xray', 'mri_scan', 'ct_scan', 'ultrasound', 'prescription', 'discharge_summary', 'other')),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    file_url TEXT NOT NULL,
    file_type TEXT DEFAULT 'application/pdf',
    file_size INTEGER DEFAULT 0,
    record_date TEXT DEFAULT CURRENT_TIMESTAMP,
    facility_or_doctor TEXT DEFAULT 'VALORA Health',
    tags TEXT DEFAULT '[]', -- JSON array of strings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Consultations Table
CREATE TABLE IF NOT EXISTS consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consultation_date TEXT DEFAULT CURRENT_TIMESTAMP,
    symptoms TEXT DEFAULT '[]', -- JSON array of strings
    diagnosis TEXT NOT NULL,
    clinical_notes TEXT DEFAULT '',
    blood_pressure TEXT DEFAULT '120/80 mmHg',
    heart_rate INTEGER DEFAULT 72,
    temperature REAL DEFAULT 98.6,
    spo2 INTEGER DEFAULT 99,
    respiratory_rate INTEGER DEFAULT 16,
    weight_kg REAL DEFAULT NULL,
    height_cm REAL DEFAULT NULL,
    treatment_plan TEXT DEFAULT '',
    follow_up_date TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Electronic Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consultation_id INTEGER REFERENCES consultations(id) ON DELETE SET NULL,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prescribed_date TEXT DEFAULT CURRENT_TIMESTAMP,
    medications TEXT DEFAULT '[]', -- JSON array of {medicineName, dosage, frequency, duration, instructions}
    diagnostic_tests TEXT DEFAULT '[]', -- JSON array of strings
    general_advice TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Doctor-Patient Access Grants
CREATE TABLE IF NOT EXISTS doctor_patient_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'granted',
    access_level TEXT DEFAULT 'full',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(patient_id, doctor_id)
);

-- 9. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT DEFAULT '',
    ip_address TEXT DEFAULT '127.0.0.1',
    details TEXT DEFAULT '{}', -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
