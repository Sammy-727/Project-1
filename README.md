# GrandStay HMS — Hotel Management System

A full-featured Hotel Management System built with **Flask**, **Jinja2**, and **SQLite**.

---

## Quick Start (Recommended)

### Windows
1. Unzip the project folder
2. Double-click **`run_hms_v2.bat`**
3. Open **http://127.0.0.1:5000**
4. Login: `admin` / `admin123`

### Mac / Linux
```bash
cd GrandStay-HMS
python3 -m pip install -r requirements.txt
python3 run.py
```

Open: **http://127.0.0.1:5000**

---

## Login Accounts

| Username      | Password   | Role          |
|---------------|------------|---------------|
| superadmin    | admin123   | Super Admin   |
| admin         | admin123   | Admin         |
| manager       | manager123 | Manager       |
| reception     | rec123     | Receptionist  |
| housekeeping  | hk123      | Housekeeping  |
| staff         | staff123   | Staff         |

---

## Troubleshooting

### "python is not recognized" (Windows)
- Install Python from https://www.python.org/downloads/
- Check **"Add Python to PATH"** during install
- Or use: `py -3 run.py`

### "No module named flask"
```bash
pip install -r requirements.txt
```

### "Address already in use" / Port 5000 busy
```bash
# Windows
set PORT=5001 && python run.py

# Mac/Linux
PORT=5001 python3 run.py
```

### "database is locked" (Windows)
- Use `python run.py` instead of `python app.py`
- The app disables auto-reload on Windows to prevent this

### Blank page or 500 error
Delete the database and restart:
```bash
# Windows
del instance\hotel_v2.db
python run.py

# Mac/Linux
rm -f instance/hotel_v2.db
python3 run.py
```

### Templates not found
Make sure you extracted the **full zip** with these folders:
- `templates/`
- `static/`
- `app.py`
- `run.py`

---

## Database Reset

```bash
rm -f instance/hotel_v2.db   # Mac/Linux
del instance\hotel_v2.db     # Windows
python run.py
```

Demo data is auto-seeded: 37 rooms, 20 customers, 15 bookings, etc.

---

## Deploy

**Render / Gunicorn:**
```bash
pip install -r requirements.txt
gunicorn app:application --bind 0.0.0.0:$PORT
```

**Replit:** Use the included `.replit` file — click Run.

Set `SECRET_KEY` environment variable in production.

---

## Project Structure

```
app.py              # Main application
run.py              # Easy launcher (use this!)
run_hms_v2.bat      # Windows one-click start
requirements.txt    # Dependencies
templates/          # HTML pages
static/css/         # Styles
static/js/          # JavaScript
instance/           # SQLite DB (auto-created)
```
