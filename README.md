# GrandStay HMS — Hotel Management System

## WINDOWS — Follow These Steps

### Step 1: Install Python
1. Go to https://www.python.org/downloads/
2. Download **Python 3.10** or newer
3. Run installer → **CHECK** ✅ **"Add python.exe to PATH"**
4. Click **Install Now**
5. **Restart your computer**

### Step 2: Run the App
1. Unzip the project folder (e.g. `GrandStay-HMS`)
2. Double-click **`START.bat`**
3. Wait for "Installing dependencies..." (first time only, 1-2 min)
4. Browser opens automatically → **http://127.0.0.1:5000**
5. Login: **`admin`** / **`admin123`**

> ⚠️ **Keep the black command window open** while using the app. Closing it stops the server.

### Step 3: If Something Fails
1. Double-click **`TEST_SETUP.bat`** — shows what is broken
2. Double-click **`RESET_DATABASE.bat`** — fixes database errors
3. Double-click **`START.bat`** again

---

## Windows Files

| File | Purpose |
|------|---------|
| **START.bat** | ⭐ Main launcher — use this! |
| TEST_SETUP.bat | Check if Python/Flask/DB work |
| RESET_DATABASE.bat | Delete corrupt database |
| run_hms_v2.bat | Same as START.bat |

---

## Common Windows Errors

| Error | Fix |
|-------|-----|
| `python is not recognized` | Reinstall Python with "Add to PATH" checked, restart PC |
| `database is locked` | Run RESET_DATABASE.bat, then START.bat |
| Port 5000 busy | START.bat auto-finds free port |
| Window closes instantly | Use START.bat (not app.py) |
| Blank page | Wait 30 sec after first run, refresh browser |

---

## Mac / Linux

```bash
cd GrandStay-HMS
python3 -m pip install -r requirements.txt
python3 run.py
```

Open: http://127.0.0.1:5000

---

## Login Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| manager | manager123 | Manager |
| reception | rec123 | Receptionist |
| superadmin | admin123 | Super Admin |

---

## Deploy (Render)

```bash
pip install -r requirements.txt
gunicorn app:application --workers 1 --bind 0.0.0.0:$PORT
```
