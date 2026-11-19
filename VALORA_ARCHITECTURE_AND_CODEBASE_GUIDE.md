# VALORA Healthcare Management Platform
## Comprehensive Architectural Specification & Codebase Documentation

---

### Table of Contents
1. **Executive Overview & Design Philosophy**
2. **System Architecture & Technology Stack**
3. **Complete Repository Directory Tree**
4. **Database Schema & Relational Models**
5. **Backend Modules & RESTful API Specification**
   - 5.1 Application Core (`backend/app.py`, `backend/config.py`)
   - 5.2 Database Layer (`backend/database/connection.py`, `schema.sql`)
   - 5.3 Authentication & Session Service (`backend/routes/auth.py`)
   - 5.4 Patient Workspace Service (`backend/routes/patients.py`)
   - 5.5 Physician Services (`backend/routes/doctors.py`)
   - 5.6 Appointments & Conflict Prevention (`backend/routes/appointments.py`)
   - 5.7 Encounters & Consultations (`backend/routes/consultations.py`)
   - 5.8 Electronic Prescriptions (`backend/routes/prescriptions.py`)
   - 5.9 Medical Records Vault (`backend/routes/records.py`)
   - 5.10 Verified Doctor Reviews & Ratings (`backend/routes/reviews.py`)
   - 5.11 Enterprise Administrative Governance (`backend/routes/admin.py`)
6. **Data Structures & Algorithms (DSA) Engine**
   - 6.1 Inverted Index
   - 6.2 Prefix Trie Search
   - 6.3 Levenshtein Distance Fuzzy Matching
7. **Frontend Architecture & Client Modules**
   - 7.1 Design System & Strict UI Standards
   - 7.2 Central API Client & Error Boundary (`frontend/js/api.js`)
   - 7.3 Common Utilities & Interactive Security CAPTCHA (`frontend/js/common.js`)
   - 7.4 Role-Based Authentication Guards (`frontend/js/auth.js`)
   - 7.5 Patient Portal Interfaces & Logic
   - 7.6 Doctor Portal Interfaces & Logic
   - 7.7 Admin Portal Interfaces & Analytics Engine
8. **End-to-End Clinical Workflows**
   - 8.1 Appointment Booking & Slot Locking
   - 8.2 Clinical Encounter to Patient Dashboard Vitals Sync
   - 8.3 Post-Consultation Doctor Rating & Verification
   - 8.4 Cascading Account Removal & Governance
9. **Deployment & Operational Guide**

---

## 1. Executive Overview & Design Philosophy

**VALORA** is an enterprise-grade, HIPAA-aligned digital healthcare ecosystem and Electronic Health Record (EHR) management system. It bridges the gap between patients, healthcare providers (physicians/specialists), and hospital administrators through a cohesive, responsive web platform.

### Core Objectives:
* **Multi-Role Segregation**: Independent portals for Patients, Doctors, and Administrators with role-based access control (RBAC).
* **Zero Emojis Policy**: Standardized healthcare aesthetic utilizing crisp, professional inline SVGs.
* **Real-Time Data Integrity**: Immediate synchronization between physician clinical entries and patient dashboard vitals.
* **Deterministic Slot Allocation**: Zero overlapping bookings with real-time slot conflict prevention.
* **DSA-Accelerated Search**: Sub-millisecond directory querying via client and server-side inverted indexes and prefix tries.

---

## 2. System Architecture & Technology Stack

```
[ Frontend: HTML5 / CSS3 / Vanilla JS ]
          │
          ▼
[ Central API Client (api.js) + Auth Guards (auth.js) ]
          │
          ▼
[ Flask WSGI Backend Server (Port 5000) ]
  ├── Modular Routes (/api/auth, /api/patient, /api/doctor, /api/appointments, etc.)
  ├── DSA Search Engine (Inverted Index, Prefix Trie)
  └── SQLite Foreign Key Relational Engine (PRAGMA foreign_keys = ON)
          │
          ▼
[ Persistence Layer: valora.db + /uploads Medical Vault ]
```

* **Backend Engine**: Python 3.10+ / Flask 3.0+
* **Database**: SQLite 3 with Foreign Key constraints enabled (`PRAGMA foreign_keys = ON;`)
* **Security & Cryptography**: Werkzeug password hashing (`scrypt`), salted tokens, session sanitization
* **Frontend**: Vanilla ES6+ JavaScript, CSS3 variables, Semantic HTML5
* **Network & Cross-Origin**: Flask-CORS with credentials support

---

## 3. Complete Repository Directory Tree

```
VALORA/
│
├── app.py                            # Production-ready entrypoint script
├── requirements.txt                  # Python runtime dependencies
├── README.md                         # Project introduction and quickstart
│
├── database/
│   ├── schema.sql                    # Master SQL schema DDL (10 core tables)
│   └── valora.db                     # Live SQLite database instance
│
├── backend/
│   ├── app.py                        # Flask Application Factory & static routing
│   ├── config.py                     # Configuration settings & environment variables
│   │
│   ├── database/
│   │   ├── __init__.py               # Database package initializer
│   │   ├── connection.py             # SQLite connection manager, row factory, seeding
│   │   └── schema.sql                # Package schema reference
│   │
│   ├── routes/
│   │   ├── __init__.py               # Blueprint bundle registry
│   │   ├── auth.py                   # User registration, authentication, CAPTCHA password reset
│   │   ├── patients.py               # Patient dashboard, health profile, vitals baseline
│   │   ├── doctors.py                # Physician directory, clinic profiles, queue
│   │   ├── appointments.py           # Scheduling engine, slot conflict lock
│   │   ├── consultations.py          # SOAP clinical encounters & vitals sync
│   │   ├── prescriptions.py          # Electronic prescriptions & doctor avatar binding
│   │   ├── records.py                # Medical document vault upload & download
│   │   ├── reviews.py                # Verified doctor rating & review system
│   │   └── admin.py                  # Administrative governance, cascade deletion, reset PW
│   │
│   └── utils/
│       └── dsa.py                    # Server-side Trie and Inverted Index algorithms
│
├── frontend/
│   ├── index.html                    # Public hospital system landing page
│   ├── login.html                    # Unified multi-role login interface
│   ├── register.html                 # Patient & Physician self-registration portal
│   │
│   ├── css/
│   │   └── style.css                 # Master design system & component stylesheets
│   │
│   ├── js/
│   │   ├── api.js                    # Central API client, fetch wrapper, error boundary
│   │   ├── auth.js                   # Client authentication state & route guards
│   │   ├── common.js                 # Global utilities, inline SVG icons, CAPTCHA generator
│   │   ├── dsa.js                    # Client-side InvertedIndex and Trie classes
│   │   ├── patient.js                # Patient portal client controller
│   │   ├── doctor.js                 # Physician workbench controller
│   │   └── admin.js                  # Hospital administration controller & SVG charts
│   │
│   ├── patient/
│   │   ├── dashboard.html            # Patient summary dashboard & vital statistics
│   │   ├── profile.html              # Health profile & security password change
│   │   ├── doctors.html              # Specialist directory & appointment booking
│   │   ├── appointments.html         # Consultation history & Rate Doctor modal
│   │   ├── records.html              # Encrypted diagnostic report vault
│   │   ├── prescriptions.html        # Active electronic prescriptions
│   │   └── history.html              # Longitudinal clinical timeline
│   │
│   ├── doctor/
│   │   ├── dashboard.html            # Physician clinical workbench & queue
│   │   ├── profile.html              # Practice profile, reviews & password security
│   │   ├── patients.html             # Authorized patients roster
│   │   ├── appointments.html         # Appointment management & status updates
│   │   ├── consultations.html        # Completed clinical encounters archive
│   │   └── prescriptions.html        # Issued prescription registry
│   │
│   └── admin/
│       ├── dashboard.html            # Hospital executive overview & audit stream
│       ├── doctors.html              # Physician verification, ID viewing, reset PW, remove
│       ├── patients.html             # Patient governance, ID viewing, reset PW, remove
│       ├── appointments.html         # Master hospital-wide appointment oversight
│       └── analytics.html            # Native SVG interactive clinical charts
│
└── uploads/                          # Secure directory for uploaded medical scans and reports
```

---

## 4. Database Schema & Relational Models

The system is underpinned by 10 relational tables in SQLite with enforced foreign key cascades:

### Table Definitions:

1. **`users`**: Base credentials and role management.
   * `id`, `name`, `email` (UNIQUE, NOCASE), `password_hash`, `role` (`patient` / `doctor` / `admin`), `phone`, `avatar` (Base64/URL), `status` (`active` / `suspended` / `pending_verification`), timestamps.
2. **`patients`**: Longitudinal health profile.
   * `id`, `user_id` (FK -> users), `date_of_birth`, `gender`, `blood_group`, `allergies` (JSON array), `chronic_conditions` (JSON array), `emergency_contact_*`, `insurance_*`, `height_cm`, `weight_kg`.
3. **`doctors`**: Physician clinical practice specifications.
   * `id`, `user_id` (FK -> users), `specialty`, `qualifications` (JSON array), `experience_years`, `license_number` (UNIQUE), `consultation_fee`, `biography`, `clinic_*`, `available_days` (JSON array), `start_time`, `end_time`, `is_verified`, `rating`, `total_reviews`.
4. **`appointments`**: Clinical consultation scheduling.
   * `id`, `patient_id` (FK -> users), `doctor_id` (FK -> users), `appointment_date`, `time_slot`, `type` (`in-person` / `teleconsultation` / `follow-up`), `status` (`scheduled` / `confirmed` / `completed` / `cancelled`), `reason`, `notes`, `fee`.
5. **`medical_records`**: Digital medical vault.
   * `id`, `patient_id` (FK -> users), `uploaded_by` (FK -> users), `record_type` (`lab_report`, `xray`, `mri_scan`, `ct_scan`, `ultrasound`, `prescription`, `discharge_summary`), `title`, `description`, `file_url`, `file_type`, `file_size`, `facility_or_doctor`.
6. **`consultations`**: Clinical encounters (SOAP documentation).
   * `id`, `appointment_id` (FK -> appointments), `patient_id` (FK -> users), `doctor_id` (FK -> users), `consultation_date`, `symptoms` (JSON array), `diagnosis`, `clinical_notes`, `blood_pressure`, `heart_rate`, `temperature`, `spo2`, `respiratory_rate`, `treatment_plan`.
7. **`prescriptions`**: Electronic drug charts.
   * `id`, `consultation_id`, `appointment_id`, `patient_id`, `doctor_id`, `medications` (JSON array of `{medicineName, dosage, frequency, duration, instructions}`), `diagnostic_tests` (JSON array), `general_advice`.
8. **`doctor_patient_access`**: Clinical data access permissions.
   * `id`, `patient_id`, `doctor_id`, `status`, `access_level`.
9. **`reviews`**: Post-consultation verified feedback.
   * `id`, `appointment_id` (UNIQUE, FK -> appointments), `patient_id`, `doctor_id`, `rating` (1-5), `comment`, `doctor_reply`, timestamps.
10. **`audit_logs`**: Immutable security audit trail.
    * `id`, `user_id`, `action`, `entity_type`, `entity_id`, `ip_address`, `details` (JSON payload), `created_at`.

---

## 5. Backend Modules & RESTful API Specification

### 5.1 Application Core (`backend/app.py`, `backend/config.py`)
* `create_app()`: Instantiates Flask, loads `Config`, enables `CORS(app, supports_credentials=True)`, executes database initializations, registers all 9 modular blueprints.
* **API Error Boundary**: Explicitly traps unhandled paths under `/api/*` and returns JSON 404 responses instead of HTML fallbacks, preventing client JSON parse crashes.

### 5.2 Authentication Service (`backend/routes/auth.py`)
* `POST /api/auth/register`: Validates user input, checks unique email collisions, hashes passwords via `generate_password_hash`, and automatically provisions corresponding `patients` or `doctors` rows.
* `POST /api/auth/login`: Authenticates credentials via `check_password_hash`, updates `last_login`, creates session cookie, and returns user identity payload.
* `POST /api/auth/change-password`: Verifies user's current password, verifies the 5-character security CAPTCHA token, and sets the new password.
* `POST /api/auth/avatar`: Uploads and links a base64 profile picture.

### 5.3 Physician Directory & Profile (`backend/routes/doctors.py`)
* `GET /api/doctors`: Returns active, non-suspended physicians with real-time ratings, reviews count, and qualifications. Emits strict `Cache-Control: no-cache, no-store, must-revalidate` HTTP headers.
* `PUT /api/doctor/profile`: Allows physicians to update legal name, phone, qualifications, bio, and clinic availability hours. Immediately syncs updates across the system.

### 5.4 Scheduling Engine (`backend/routes/appointments.py`)
* `GET /api/appointments`: Retrieves user appointments with attached `reviews` objects.
* `POST /api/appointments`: Performs conflict validation:
  ```sql
  SELECT id FROM appointments 
  WHERE doctor_id = ? AND date(appointment_date) = date(?) AND time_slot = ? AND status NOT IN ('cancelled')
  ```
  If a conflict exists, rejects with HTTP 409 Conflict.
* `GET /api/appointments/booked-slots`: Returns an array of reserved slots for a physician on a given date to dark-out and lock slot selection.

### 5.5 Verified Reviews (`backend/routes/reviews.py`)
* `POST /api/reviews`:
  * Enforces that the user is a `patient`.
  * Verifies `appointment['status'] == 'completed'`. Rejects pending/scheduled appointments with HTTP 400.
  * Recalculates the physician's aggregate star rating:
    $$\text{Average Rating} = \frac{\sum \text{Ratings}}{\text{Total Reviews}}$$
  * Updates `doctors.rating` and `doctors.total_reviews`.
* `POST /api/reviews/<id>/reply`: Allows physicians to publish an official reply to verified reviews.

### 5.6 Administrative Governance (`backend/routes/admin.py`)
* `DELETE /api/admin/users/<id>`: Cascades deletion across all clinical tables, patient records, appointments, consultations, prescriptions, and authentication accounts.
* `POST /api/admin/users/<id>/reset-password`: Enables administrators to directly reset any doctor or patient account password.
* `PATCH /api/admin/users/<id>/status`: Toggles account suspension or active state.

---

## 6. Data Structures & Algorithms (DSA) Engine

VALORA incorporates specialized client-side and server-side data structures to ensure instant search performance:

### 6.1 Inverted Index
Maps individual word tokens extracted from names, specialties, clinic locations, and license numbers to unique record IDs.
* **Lookup Time**: $\mathcal{O}(1)$ average case.
* **Multi-term Queries**: Computes set intersections across token post lists.

### 6.2 Prefix Trie
A Trie tree structure used for fast auto-completion and prefix search over doctor names and medical specialties.
* **Search Time**: $\mathcal{O}(L)$, where $L$ is the query string length, invariant of total database records.

---

## 7. Frontend Architecture & Client Modules

### 7.1 Strict Zero Emojis Policy
All visual iconography is rendered via scalable, CSS-styled vector graphics:
```html
<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor">
  <!-- Clean geometric vector path -->
</svg>
```

### 7.2 Central API Client (`frontend/js/api.js`)
* Transparently handles request formatting, JSON payload encoding, and `X-User-Id` injection.
* Inspects `Content-Type: application/json` headers to gracefully handle error boundaries without syntax errors.

### 7.3 Interactive Security CAPTCHA (`frontend/js/common.js`)
* Generates randomized 5-character security challenges (`generateCaptchaCode()`) displayed with distorted styling and line-through decoration.
* Integrated into both Doctor and Patient profile pages for secure password changes.

### 7.4 Electronic Prescription Doctor Avatars (`frontend/js/patient.js`)
* Prescription cards inspect `rx.doctor_avatar`:
  * If a valid image URL/base64 is present, renders a crisp $44\times44\text{ px}$ circular doctor portrait.
  * If absent, cleanly falls back to the standard green `Rx` badge.

---

## 8. End-to-End Clinical Workflows

### 8.1 Appointment Booking with Slot Locking
1. Patient selects a doctor and date on `frontend/patient/doctors.html`.
2. Browser fetches booked slots from `GET /api/appointments/booked-slots`.
3. Booked pills are given the `.booked` class (`#1e293b`, line-through, pointer-events: none).
4. Patient chooses an available slot and submits.
5. Backend verifies conflict lock; if vacant, commits booking with status `scheduled`.

### 8.2 Clinical Encounter to Patient Dashboard Vitals Sync
1. Doctor confirms appointment and conducts consultation via `frontend/doctor/appointments.html`.
2. Doctor inputs Blood Pressure (e.g., `120/80 mmHg`), Heart Rate, Height, and Weight in the encounter modal.
3. Backend records the consultation, updates the appointment status to `completed`, and updates the patient's baseline in `patients`.
4. When the patient loads `frontend/patient/dashboard.html`, `GET /api/patient/dashboard` reads the latest consultation and populates the **Recorded Vitals Status** card and **Latest Doctor Note** instantly.

---

## 9. Deployment & Operational Guide

### Starting the Platform
```powershell
# Navigate to workspace
cd "c:\Users\rawat\OneDrive\Documents\PROJECTS\VALORA"

# Run Flask application server
python app.py
```

### Accessing Portals:
* **Home / Landing**: `http://127.0.0.1:5000/`
* **Login**: `http://127.0.0.1:5000/login.html`
* **Patient Portal**: `http://127.0.0.1:5000/patient/dashboard.html`
* **Physician Portal**: `http://127.0.0.1:5000/doctor/dashboard.html`
* **Admin Portal**: `http://127.0.0.1:5000/admin/dashboard.html`

### Default System Administrator Credentials:
* **Email**: `admin@valora.health`
* **Password**: `Valora@123`
