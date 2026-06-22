# HMS

A clean, minimal, organized HMS web app.

## Pages

- Dashboard
- Manage: Rooms, Customers, Bookings, Inventory
- Operations: Room Service, Billing, Reports
- Admin: Employees, Users
- Invoice

## Run Locally

```bash
python -m pip install -r requirements.txt
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

## Login

```text
admin / admin123
manager / manager123
reception / rec123
```

## Render

Build Command:

```bash
pip install -r requirements.txt
```

Start Command:

```bash
gunicorn app:app
```
