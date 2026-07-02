#!/usr/bin/env python3
"""
GrandStay HMS launcher.
Windows: double-click START.bat
Others:  python3 run.py
"""
import os
import sys
import subprocess
import webbrowser
import threading
import time


def setup_console():
    """Avoid Windows console encoding crashes."""
    if sys.platform == "win32":
        os.environ.setdefault("PYTHONIOENCODING", "utf-8")
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def project_dir():
    return os.path.dirname(os.path.abspath(__file__))


def install_deps():
    print("Installing dependencies...")
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
        cwd=project_dir(),
    )


def find_free_port(start=5000):
    import socket
    for port in range(start, start + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return start


def open_browser(port, delay=1.5):
    def _open():
        time.sleep(delay)
        webbrowser.open(f"http://127.0.0.1:{port}")
    threading.Thread(target=_open, daemon=True).start()


def main():
    setup_console()
    os.chdir(project_dir())
    os.makedirs(os.path.join(project_dir(), "instance"), exist_ok=True)

    try:
        import flask  # noqa: F401
    except ImportError:
        print("Flask not found. Installing requirements...")
        try:
            install_deps()
        except Exception as exc:
            print("\nERROR: Could not install dependencies.")
            print("Run manually:")
            print("  pip install -r requirements.txt")
            print(f"\nDetails: {exc}")
            input("\nPress Enter to exit...")
            sys.exit(1)

    try:
        from app import ensure_db, app
        ensure_db()
    except Exception as exc:
        print("\nERROR: Database setup failed.")
        print("Delete this file and try again:")
        print("  instance\\hotel_v2.db")
        print(f"\nDetails: {exc}")
        input("\nPress Enter to exit...")
        sys.exit(1)

    port = int(os.environ.get("PORT", 0)) or find_free_port(5000)
    # Windows: never use debug/reloader (causes SQLite lock + console errors)
    is_windows = sys.platform == "win32"
    debug = (not is_windows) and os.environ.get("FLASK_DEBUG", "0") == "1"
    use_reloader = False

    print("\n" + "=" * 52)
    print("  GrandStay HMS - Hotel Management System")
    print("=" * 52)
    print(f"  Open:  http://127.0.0.1:{port}")
    print("  Login: admin / admin123")
    print("  Press Ctrl+C to stop")
    print("=" * 52 + "\n")

    if is_windows:
        open_browser(port)

    try:
        app.run(
            host="127.0.0.1",
            port=port,
            debug=debug,
            use_reloader=use_reloader,
            threaded=True,
        )
    except OSError as exc:
        print(f"\nERROR: Could not start server on port {port}.")
        print(f"Details: {exc}")
        input("\nPress Enter to exit...")
        sys.exit(1)


if __name__ == "__main__":
    main()
