import sys
import socket
import webbrowser
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import app

def is_port_in_use(port, host="127.0.0.1"):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def find_open_port(start_port=5000, max_port=5010):
    for p in range(start_port, max_port + 1):
        if not is_port_in_use(p):
            return p
    return start_port

if __name__ == "__main__":
    target_port = 5000

    # If port 5000 is already active, notify user and offer browser launch
    if is_port_in_use(target_port):
        print("\n" + "=" * 65)
        print(f"  VALORA Platform is ALREADY RUNNING on http://127.0.0.1:{target_port}!")
        print(f"  Access URL: http://127.0.0.1:{target_port}/login.html")
        print("=" * 65 + "\n")
        try:
            webbrowser.open(f"http://127.0.0.1:{target_port}/login.html")
        except Exception:
            pass
        sys.exit(0)

    url = f"http://127.0.0.1:{target_port}"
    print("\n" + "=" * 65)
    print(f"  VALORA Healthcare Platform is running (Offline Ready)")
    print(f"  Localhost URL:    {url}")
    print("  Available Portals:")
    print(f"  - Home:       {url}/")
    print(f"  - Login:      {url}/login.html")
    print(f"  - Patient:    {url}/patient/dashboard.html")
    print(f"  - Doctor:     {url}/doctor/dashboard.html")
    print(f"  - Admin:      {url}/admin/dashboard.html")
    print("=" * 65 + "\n")

    try:
        webbrowser.open(f"{url}/login.html")
    except Exception:
        pass

    # Bind to 127.0.0.1 for guaranteed 100% offline access without Wi-Fi
    try:
        app.run(
            host="127.0.0.1",
            port=target_port,
            debug=False,
            threaded=True,
            use_reloader=False
        )
    except OSError:
        # Fallback to alternate open port if conflict occurred
        alt_port = find_open_port(5001, 5015)
        print(f"\n[VALORA] Port {target_port} busy. Switching to http://127.0.0.1:{alt_port}")
        app.run(
            host="127.0.0.1",
            port=alt_port,
            debug=False,
            threaded=True,
            use_reloader=False
        )
