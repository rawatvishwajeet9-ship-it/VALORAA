# VALORA – Healthcare Management & Digital Medical Records Platform

VALORA is a full-featured, responsive healthcare management and digital medical records platform connecting patients, licensed medical practitioners, and hospital administrators.

This project is built using a clean, accessible, and robust architecture:
- **Frontend:** Vanilla HTML5, CSS3 (Modern Glassmorphic Healthcare Design System), JavaScript (ES6 Modules & Fetch API)
- **Backend:** Python (Flask Modular Architecture with Blueprints)
- **Database:** SQLite3 (`valora.db`) with relational integrity, foreign keys, and indexes
- **Document Vault:** Local encrypted file storage supporting diagnostic PDFs, X-rays, and MRI scans

---

## 1. Project Structure

Organized into dedicated directories for backend modules, SQLite database, uploads, and individual role-based HTML pages:

```
VALORA/
│
├── app.py                         # Root entry point to launch platform (python app.py)
├── requirements.txt               # Python package dependencies (Flask, flask-cors, werkzeug)
├── README.md                      # Platform documentation and architecture guide
├── .gitignore
│
├── backend/
│   ├── app.py                     # Flask application factory, route handlers & static server
│   ├── config.py                  # Database paths, secret keys, upload configurations
│   ├── requirements.txt           # Backend package specifications
│   │
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py          # SQLite connection manager & master admin setup
│   │   └── schema.sql             # Relational DDL schema
│   │
│   └── routes/
│       ├── __init__.py
│       ├── auth.py                # Login, Register, Session check, Logout
│       ├── patients.py            # Patient profile, dashboard, timeline history
│       ├── doctors.py             # Specialist directory search, doctor queue & chart review
│       ├── appointments.py        # Booking visits, slot checking, status updates
│       ├── records.py             # Medical vault upload, retrieval, and deletion
│       ├── consultations.py       # Vitals logger, clinical diagnosis, treatment plans
│       ├── prescriptions.py       # Multi-drug digital Rx generator
│       └── admin.py               # Doctor license verification, patient governance & analytics
│
├── database/
│   ├── schema.sql                 # SQL table definitions, constraints & indexes
│   └── valora.db                  # Live SQLite database
│
├── frontend/
│   ├── index.html                 # Public landing page with clinical portal cards
│   ├── login.html                 # Sign-in portal with email and password
│   ├── register.html              # Unified patient & doctor registration with role-specific tabs
│   │
│   ├── css/
│   │   └── style.css              # Master healthcare CSS design system
│   │
│   ├── js/
│   │   ├── api.js                 # Central fetch API client & toast notifications
│   │   ├── auth.js                # Auth state, route guard & user session management
│   │   ├── common.js              # Navbar/sidebar active highlights, modal helpers & formatters
│   │   ├── patient.js             # Patient portal state & appointment/vault interactions
│   │   ├── doctor.js              # Physician workbench, OPD queue, vitals & Rx generator
│   │   └── admin.js               # License verification, user governance & analytics
│   │
│   ├── patient/
│   │   ├── dashboard.html         # Overview stats, vitals baseline & upcoming schedule
│   │   ├── profile.html           # Full medical profile (blood group, allergies, emergency contacts)
│   │   ├── doctors.html           # Find & filter specialists by specialty, city, fee & book visits
│   │   ├── appointments.html      # Schedule list with status filters & cancellation
│   │   ├── records.html           # Encrypted diagnostic vault (X-rays, MRI, CT scans, Lab reports)
│   │   ├── prescriptions.html     # Active drug orders with dosage frequencies & print view
│   │   └── history.html           # Longitudinal medical timeline of consultations & vitals
│   │
│   ├── doctor/
│   │   ├── dashboard.html         # Live OPD queue, patient metrics, launch consultation modal
│   │   ├── appointments.html      # Master appointment schedule with confirm/consult actions
│   │   ├── consultations.html     # Clinical examination history with vitals and diagnosis
│   │   ├── prescriptions.html     # Issued digital Rx ledger with print preview
│   │   ├── patients.html          # Authorized patient roster with vault document inspection
│   │   └── profile.html           # Clinical credentials, OPD hours, and consultation fee settings
│   │
│   ├── admin/
│   │   ├── dashboard.html         # Hospital KPI cards & live audit activity stream
│   │   ├── doctors.html           # Medical license verification center (Approve/Revoke/Suspend)
│   │   ├── patients.html          # Patient governance & account state toggling
│   │   ├── appointments.html      # Hospital-wide appointment oversight & fees ledger
│   │   └── analytics.html         # Visual specialty distributions & status breakdowns
│   │
│   └── logo/
│       └── logo.svg               # VALORA brand logo
│
└── uploads/                       # Encrypted medical vault document storage
```

---

## 2. Authentication & User Flow

VALORA supports registration and authentication for both **Patients** and **Physicians**:

1. **Patient Registration:**
   - Go to [Register Page](http://127.0.0.1:5000/register.html) & select **"Patient Registration"**.
   - Fill in your name, email, password, phone, date of birth, blood group, allergies, and emergency contact.
   - Upon registration, log in at [Sign In](http://127.0.0.1:5000/login.html) to access your patient dashboard.

2. **Doctor Registration & Verification:**
   - Go to [Register Page](http://127.0.0.1:5000/register.html) & select **"Doctor / Physician"**.
   - Fill in your medical license number (MCI/NMC), specialty, qualifications, experience, clinic details, and consultation fee.
   - For safety and regulation, new doctors are initialized under `pending_verification`.
   - The hospital administrator verifies and approves doctors in the **Doctor Verification Center** before they are listed in patient directories.

3. **Master Hospital Administrator:**
   - Initialized during database creation for institutional governance.
   - **Email:** `admin@valora.health`
   - **Password:** `Valora@123`

---

## 3. How to Run the Platform

### Prerequisites
- Python 3.8+ (Tested on Python 3.13)
- Pip

### Steps
1. Navigate to the project root directory:
   ```bash
   cd c:\Users\rawat\OneDrive\Documents\PROJECTS\VALORA
   ```

2. (Optional) Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Launch the platform:
   ```bash
   python app.py
   ```

4. Access the web portals in your browser:
   - **Homepage:** [http://127.0.0.1:5000/](http://127.0.0.1:5000/)
   - **Sign In:** [http://127.0.0.1:5000/login.html](http://127.0.0.1:5000/login.html)
   - **Register:** [http://127.0.0.1:5000/register.html](http://127.0.0.1:5000/register.html)
   - **Patient Dashboard:** [http://127.0.0.1:5000/patient/dashboard.html](http://127.0.0.1:5000/patient/dashboard.html)
   - **Doctor Workbench:** [http://127.0.0.1:5000/doctor/dashboard.html](http://127.0.0.1:5000/doctor/dashboard.html)
   - **Admin Governance:** [http://127.0.0.1:5000/admin/dashboard.html](http://127.0.0.1:5000/admin/dashboard.html)
