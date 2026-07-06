# Hyrlo — Hyperlocal Hiring Platform

This repository contains **Hyrlo**, a mobile-first hyperlocal hiring platform, in the `hyrlo-app/` directory.

## Run Hyrlo

```bash
cd hyrlo-app
npm install
npm run dev
```

Open **http://localhost:5173** (best in mobile view).

### Demo Login

| Role | Phone |
|------|-------|
| Worker (Electrician) | `9876543210` |
| Worker (Cook) | `9876543214` |
| Employer (Medical Store) | `9988776655` |
| Employer (Cafe) | `9988776657` |

Or register via **Find Work** / **Hire Workers** on the landing page.

See [hyrlo-app/README.md](hyrlo-app/README.md) for full documentation.

---

## Legacy: Safe Stays (Hotel PMS)

The root-level Flask app (`app.py`) is the original Safe Stays hotel management system.

```bash
pip install -r requirements.txt
python3 run.py
```
