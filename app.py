import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import app

if __name__ == "__main__":
    print("\n" + "=" * 65)
    print("  VALORA Healthcare Platform is running on http://127.0.0.1:5000")
    print("  Local Network:    http://0.0.0.0:5000")
    print("  Available Portals:")
    print("  - Home:       http://127.0.0.1:5000/")
    print("  - Login:      http://127.0.0.1:5000/login.html")
    print("  - Register:   http://127.0.0.1:5000/register.html")
    print("  - Patient:    http://127.0.0.1:5000/patient/dashboard.html")
    print("  - Doctor:     http://127.0.0.1:5000/doctor/dashboard.html")
    print("  - Admin:      http://127.0.0.1:5000/admin/dashboard.html")
    print("=" * 65 + "\n")
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
