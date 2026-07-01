#!/usr/bin/env python3
"""
GrandStay HMS — easy launcher.
Run:  python run.py
"""
import os
import sys
import subprocess


def find_python():
    return sys.executable


def install_deps():
    print("Installing dependencies...")
    subprocess.check_call([find_python(), "-m", "pip", "install", "-r", "requirements.txt"])


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    try:
        import flask  # noqa: F401
    except ImportError:
        print("Flask not found. Installing requirements...")
        try:
            install_deps()
        except Exception as exc:
            print("\nERROR: Could not install dependencies.")
            print("Run manually:  pip install -r requirements.txt")
            print(f"Details: {exc}")
            sys.exit(1)

    os.makedirs("instance", exist_ok=True)

    try:
        from app import ensure_db, app
        ensure_db()
    except Exception as exc:
        print("\nERROR: Database setup failed.")
        print("Try deleting the database and restart:")
        print("  Delete folder: instance/hotel_v2.db")
        print(f"\nDetails: {exc}")
        sys.exit(1)

    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    use_reloader = debug and sys.platform != "win32"

    print("\n" + "=" * 50)
    print("  GrandStay HMS — Hotel Management System")
    print("=" * 50)
    print(f"  Open in browser: http://127.0.0.1:{port}")
    print("  Login:  admin / admin123")
    print("  Press Ctrl+C to stop")
    print("=" * 50 + "\n")

    try:
        app.run(host="0.0.0.0", port=port, debug=debug, use_reloader=use_reloader)
    except OSError as exc:
        if "Address already in use" in str(exc) or "10048" in str(exc):
            print(f"\nERROR: Port {port} is already in use.")
            print(f"Try:  set PORT=5001 && python run.py")
        else:
            print(f"\nERROR: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
