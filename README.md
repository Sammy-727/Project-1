# GrandStay HMS — Hotel Management System

A full-featured Hotel Management System built with **Flask**, **Jinja2**, and **SQLite**. Includes a modern dashboard UI with role-based access, real database operations, and demo seed data.

## Features

- **Authentication** — Login/logout with roles: Super Admin, Admin, Manager, Receptionist, Housekeeping, Staff
- **Dashboard** — Live stats, revenue chart, recent bookings/payments, room status summary
- **Rooms** — Full CRUD, filters, search, amenities, floor, capacity
- **Customers** — Full CRUD with guest/family support
- **Bookings** — Create with double-booking prevention, auto total calculation
- **Check In/Out** — Arrivals, active stays, payment collection, bill generation
- **Payments** — Record payments, receipts, revenue tracking
- **Employees** — Staff management with departments
- **Housekeeping** — Task assignment, priority, room status sync
- **Room Service** — Service requests with billable charges
- **Inventory** — Stock management with low-stock alerts
- **Global Search** — Search rooms, customers, bookings, payments

## Run Locally

```bash
python -m pip install -r requirements.txt
python app.py
```

Open: **http://127.0.0.1:5000**

## Demo Login Accounts

| Username     | Password   | Role          |
|-------------|------------|---------------|
| superadmin  | admin123   | Super Admin   |
| admin       | admin123   | Admin         |
| manager     | manager123 | Manager       |
| reception   | rec123     | Receptionist  |
| housekeeping| hk123      | Housekeeping  |
| staff       | staff123   | Staff         |

## Database Reset

To start fresh with new demo data, delete the database file and restart:

```bash
rm -f instance/hotel_v2.db
python app.py
```

The app auto-creates tables, runs migrations, and seeds demo data on first launch.

## Deploy (Render / Gunicorn)

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
gunicorn app:app
```

Set environment variable `SECRET_KEY` for production.

## Project Structure

```
app.py                  # Main Flask application
instance/hotel_v2.db    # SQLite database (auto-created)
static/css/style.css    # Premium UI styles
static/js/app.js        # Sidebar, modals, confirmations
templates/              # Jinja2 templates per module
requirements.txt        # Python dependencies
```
