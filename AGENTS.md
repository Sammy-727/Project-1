# HMS

A single-file Flask Hotel Management System backed by SQLite. See `README.md` for the feature list, default login accounts, and the standard run commands.

## Cursor Cloud specific instructions

### Overview
- The whole app is `app.py` (routes + DB schema/seed). Templates are in `templates/`, styles in `static/css/`. There are no automated tests, lint config, or build step.
- Data lives in a SQLite file at `instance/hotel_v2.db`. It is created and seeded automatically on first run by `init_db()`; delete the file to reset to seed data. The file is tracked in git, so avoid committing local data changes made while testing (`git checkout -- instance/hotel_v2.db`).

### Running (dev)
- Run the dev server with `python3 app.py` (uses `python3`; there is no `python` alias on this VM). It serves on `0.0.0.0:5000` with Flask debug + autoreload on, so code edits to `app.py`/templates hot-reload automatically.
- Override the port with the `PORT` env var if needed.
- `gunicorn app:app` (per `Procfile`) is the production entrypoint, not for dev.

### Notes
- `runtime.txt` pins Python 3.11.9 for Render, but the app runs fine on the VM's Python 3.12.
- Default login: `admin` / `admin123` (see `README.md` for all accounts).
