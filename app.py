from flask import Flask, render_template, request, redirect, url_for, session, flash, send_file, jsonify
import sqlite3
import os
import sys
import csv
from io import StringIO, BytesIO
from datetime import datetime, date, timedelta
from functools import wraps
from werkzeug.middleware.proxy_fix import ProxyFix

from list_filters import (
    bookings_query, customers_query, rooms_query, employees_query,
    inventory_query, payments_query, invoices_query, housekeeping_query,
    room_service_query, paginate_rows,
)
from chart_data import (
    get_revenue_trend,
    get_occupancy_status,
    get_booking_trend,
    with_fallback,
    DEMO_REVENUE_TREND,
    DEMO_OCCUPANCY_STATUS,
    DEMO_BOOKING_TREND,
)
from seed_data import seed_multi_hotel_demo, seed_hotel_demo_notifications
from tenant import (
    ROLES,
    ROLE_LABELS,
    SUBSCRIPTION_PLANS,
    SUBSCRIPTION_STATUSES,
    DEFAULT_HOTEL_ID,
    HOTEL_SCOPED_TABLES,
    normalize_role,
    role_label,
    is_super_admin_role,
    is_hotel_read_only,
    can_write_hotel_ops,
    admin_roles,
    hotel_admin_roles,
    role_required,
    platform_admin_required,
    hotel_to_dict,
    get_hotel_stats,
    get_hotel_overview_stats,
    get_platform_overview,
    audit_log,
    enforce_permissions,
    is_hotel_write_request,
)

app = Flask(__name__)
application = app  # WSGI entry for gunicorn / Replit / Render
app.secret_key = os.environ.get("SECRET_KEY", "hms-v2-secret-key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("FORCE_HTTPS", "0") == "1"
APP_NAME = "Safe Stays"
APP_SHORT_NAME = "SafeStays"
APP_TAGLINE = "Secure. Smart. Seamless Hospitality."
PLATFORM_NAME = "Safe Stays Platform"
BROWSER_TITLE = "Safe Stays | Hotel Management Platform"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "instance", "hotel_v2.db")
_db_ready = False

ROLES = ROLES  # from tenant
EMPLOYEE_STATUSES = ["Active", "Inactive", "On Leave", "Suspended", "Resigned", "Terminated", "Archived"]
USER_STATUSES = EMPLOYEE_STATUSES
LOGIN_ALLOWED_STATUSES = {"Active"}
ACTIVE_EMPLOYEE_STATUSES = ("Active",)
ROOM_STATUSES = ["Available", "Occupied", "Maintenance", "Cleaning", "Reserved"]
BOOKING_STATUSES = ["Reserved", "Checked-in", "Checked-out", "Cancelled"]
PAYMENT_STATUSES = ["Pending", "Partial", "Paid"]
PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer"]
DEPARTMENTS = ["Front Desk", "Housekeeping", "Management", "Kitchen", "Maintenance"]
HK_STATUSES = ["Pending", "In Progress", "Completed"]
HK_PRIORITIES = ["Low", "Medium", "High"]
RS_TYPES = ["Food", "Laundry", "Cleaning", "Maintenance", "Other"]
RS_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"]
ID_PROOF_TYPES = ["Aadhar", "Passport", "Driving License", "Voter ID", "PAN Card", "Other"]
BOOKING_SOURCES = ["Walk-in", "Phone", "Website", "OTA", "Corporate", "Travel Agent", "Other"]
UNAVAILABLE_ROOM_STATUSES = {"Maintenance", "Cleaning"}
NOTIFICATION_TYPES = ("RED", "YELLOW", "GREEN", "BLUE")
NOTIFICATION_CATEGORIES = (
    "PENDING_PAYMENTS",
    "LOW_INVENTORY",
    "UPCOMING_CHECKINS",
    "UPCOMING_CHECKOUTS",
    "MAINTENANCE",
    "HOUSEKEEPING",
)
DEFAULT_HOTEL_ID = DEFAULT_HOTEL_ID


def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def query(sql, params=(), one=False, commit=False):
    conn = get_db()
    cur = conn.execute(sql, params)
    if commit:
        conn.commit()
        last_id = cur.lastrowid
        conn.close()
        return last_id
    rows = cur.fetchall()
    conn.close()
    return (rows[0] if rows else None) if one else rows


def table_columns(table):
    rows = query(f"PRAGMA table_info({table})")
    return {r["name"] for r in rows}


def add_column_if_missing(table, column, col_type):
    try:
        if column not in table_columns(table):
            query(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}", commit=True)
    except Exception:
        pass


def nights_between(checkin, checkout):
    d1 = datetime.strptime(checkin, "%Y-%m-%d").date()
    d2 = datetime.strptime(checkout, "%Y-%m-%d").date()
    return max((d2 - d1).days, 1)


def calc_room_charges(price, checkin, checkout):
    return nights_between(checkin, checkout) * float(price)


def receipt_number():
    count = query("SELECT COUNT(*) c FROM payments", one=True)["c"]
    return f"RCP-{datetime.now().strftime('%Y%m%d')}-{count + 1:04d}"


def room_has_overlap(room_id, checkin, checkout, exclude_booking_id=None):
    sql = """
        SELECT COUNT(*) c FROM bookings
        WHERE room_id=? AND status IN ('Reserved','Checked-in')
        AND checkin < ? AND checkout > ?
    """
    params = [room_id, checkout, checkin]
    if exclude_booking_id:
        sql += " AND id != ?"
        params.append(exclude_booking_id)
    return query(sql, params, one=True)["c"] > 0


def booking_service_charges(booking_id):
    inv = query(
        "SELECT COALESCE(SUM(amount),0) s FROM service_usage WHERE booking_id=?",
        (booking_id,), one=True
    )["s"]
    rs = query(
        "SELECT COALESCE(SUM(charges),0) s FROM room_service_requests WHERE booking_id=? AND status != 'Cancelled'",
        (booking_id,), one=True
    )["s"]
    return float(inv) + float(rs)


def booking_room_charges(booking):
    return calc_room_charges(booking["price"], booking["checkin"], booking["checkout"])


def booking_total_amount(booking):
    return booking_room_charges(booking) + booking_service_charges(booking["id"])


def booking_paid_amount(booking_id):
    return float(query(
        "SELECT COALESCE(SUM(amount),0) s FROM payments WHERE booking_id=?",
        (booking_id,), one=True
    )["s"])


def update_booking_payment_status(booking_id):
    booking = query("""
        SELECT b.*, r.price FROM bookings b JOIN rooms r ON b.room_id=r.id WHERE b.id=?
    """, (booking_id,), one=True)
    if not booking:
        return
    total = booking_total_amount(booking)
    paid = booking_paid_amount(booking_id)
    if paid <= 0:
        status = "Pending"
    elif paid >= total:
        status = "Paid"
    else:
        status = "Partial"
    query("UPDATE bookings SET total_amount=?, payment_status=? WHERE id=?",
          (total, status, booking_id), commit=True)


def customer_to_dict(row):
    if not row:
        return None
    d = dict(row)
    return {
        "id": d["id"],
        "name": d["name"],
        "phone": d["phone"],
        "email": d["email"],
        "address": d["address"],
        "gender": d["gender"],
        "age": d["age"],
        "id_proof_type": d["id_proof_type"],
        "id_proof_number": d["id_proof_number"],
        "emergency_contact": d.get("emergency_contact"),
    }


def room_to_dict(row):
    return {
        "id": row["id"],
        "room_no": row["room_no"],
        "room_type": row["room_type"],
        "category": row["category"],
        "floor": row["floor"],
        "price": float(row["price"]),
        "capacity": row["capacity"],
        "status": row["status"],
        "amenities": row["amenities"],
    }


def booking_row_to_dict(row):
    return {
        "id": row["id"],
        "customer_name": row["customer_name"],
        "phone": row["phone"],
        "room_no": row["room_no"],
        "room_type": row["room_type"],
        "checkin": row["checkin"],
        "checkout": row["checkout"],
        "num_guests": row["num_guests"] or 1,
        "total_amount": float(row["total_amount"] or 0),
        "status": row["status"],
        "payment_status": row["payment_status"],
    }


def get_available_rooms(checkin, checkout, num_guests=1):
    rooms = query("SELECT * FROM rooms ORDER BY CAST(room_no AS INTEGER), room_no")
    available = []
    for room in rooms:
        if room["status"] in UNAVAILABLE_ROOM_STATUSES:
            continue
        if room_has_overlap(room["id"], checkin, checkout):
            continue
        if num_guests and room["capacity"] < num_guests:
            continue
        available.append(room_to_dict(room))
    return available


def api_error(message, status=400):
    return jsonify({"ok": False, "error": message}), status


def api_ok(**payload):
    return jsonify({"ok": True, **payload})


def get_current_hotel_id():
    role = normalize_role(session.get("role"))
    if role == "SUPER_ADMIN":
        return int(session.get("hotel_id") or DEFAULT_HOTEL_ID)
    user_hotel = session.get("user_hotel_id")
    if user_hotel:
        return int(user_hotel)
    return int(session.get("hotel_id") or DEFAULT_HOTEL_ID)


def get_current_hotel():
    hid = get_current_hotel_id()
    return query("SELECT * FROM hotels WHERE id=?", (hid,), one=True)


def set_session_hotel(hotel_id):
    session["hotel_id"] = int(hotel_id)


def ensure_entity_hotel(row, hotel_id=None):
    """Verify a record belongs to the current hotel."""
    hid = hotel_id or get_current_hotel_id()
    if not row:
        return False
    if "hotel_id" in row.keys() and row["hotel_id"] is not None:
        return int(row["hotel_id"]) == int(hid)
    return True


def log_audit(action, entity_type=None, entity_id=None, details=None, hotel_id=None):
    audit_log(
        query,
        action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        hotel_id=hotel_id or get_current_hotel_id(),
        user_id=session.get("user_id"),
    )


def notification_to_dict(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "hotelId": row["hotel_id"],
        "title": row["title"],
        "message": row["message"],
        "type": row["type"],
        "category": row["category"],
        "isRead": bool(row["is_read"]),
        "createdAt": row["created_at"],
        "actionUrl": row["action_url"] or "",
    }


def upsert_notification(hotel_id, title, message, ntype, category, action_url, source_key, is_demo=0):
    existing = query(
        "SELECT id FROM notifications WHERE hotel_id=? AND source_key=?",
        (hotel_id, source_key),
        one=True,
    )
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if existing:
        query(
            """UPDATE notifications SET title=?, message=?, type=?, category=?, action_url=?, created_at=?
               WHERE id=? AND hotel_id=?""",
            (title, message, ntype, category, action_url, now, existing["id"], hotel_id),
            commit=True,
        )
        return existing["id"]
    return query(
        """INSERT INTO notifications(hotel_id,title,message,type,category,is_read,created_at,action_url,source_key,is_demo)
           VALUES(?,?,?,?,?,0,?,?,?,?)""",
        (hotel_id, title, message, ntype, category, now, action_url, source_key, is_demo),
        commit=True,
    )


def has_demo_notification(hotel_id, source_key):
    return bool(
        query(
            "SELECT id FROM notifications WHERE hotel_id=? AND source_key=? AND is_demo=1",
            (hotel_id, source_key),
            one=True,
        )
    )


def resolve_demo_conflicts(hotel_id):
    if has_demo_notification(hotel_id, "demo_pay_15"):
        query(
            "DELETE FROM notifications WHERE hotel_id=? AND source_key=? AND is_demo=0",
            (hotel_id, "pay_15"),
            commit=True,
        )
    if has_demo_notification(hotel_id, "demo_checkin_ishita"):
        ishita_bookings = query(
            """
            SELECT b.id FROM bookings b
            JOIN customers c ON b.customer_id=c.id
            WHERE c.name='Ishita Arora'
            """
        )
        for row in ishita_bookings:
            query(
                "DELETE FROM notifications WHERE hotel_id=? AND source_key=? AND is_demo=0",
                (hotel_id, f"checkin_{row['id']}"),
                commit=True,
            )


def sync_notifications_from_data(hotel_id=None):
    hotel_id = hotel_id or DEFAULT_HOTEL_ID
    today = date.today()
    horizon = today + timedelta(days=7)
    active_keys = set()

    low_items = query(
        "SELECT id, item_name, quantity, reorder_level FROM inventory WHERE hotel_id=? AND quantity <= reorder_level",
        (hotel_id,),
    )
    for item in low_items:
        key = f"low_inv_{item['id']}"
        active_keys.add(key)
        name = item["item_name"]
        upsert_notification(
            hotel_id,
            "Low Inventory",
            f"{name} stock is below minimum level ({item['quantity']} / {item['reorder_level']}).",
            "RED",
            "LOW_INVENTORY",
            f"/inventory?q={name}",
            key,
        )

    pending_bookings = query("""
        SELECT b.id, c.name, b.total_amount, b.payment_status
        FROM bookings b JOIN customers c ON b.customer_id=c.id
        WHERE b.hotel_id=? AND b.payment_status IN ('Pending','Partial')
          AND b.status IN ('Reserved','Checked-in')
    """, (hotel_id,))
    for b in pending_bookings:
        paid = booking_paid_amount(b["id"])
        balance = max(float(b["total_amount"] or 0) - paid, 0)
        if balance <= 0:
            continue
        if b["id"] == 15 and has_demo_notification(hotel_id, "demo_pay_15"):
            continue
        key = f"pay_{b['id']}"
        active_keys.add(key)
        upsert_notification(
            hotel_id,
            "Payment Pending",
            f"Booking #{b['id']} has ₹{balance:,.0f} pending.",
            "RED",
            "PENDING_PAYMENTS",
            f"/payments?booking_id={b['id']}",
            key,
        )

    checkins = query("""
        SELECT b.id, c.name, r.room_no, b.checkin
        FROM bookings b
        JOIN customers c ON b.customer_id=c.id
        JOIN rooms r ON b.room_id=r.id
        WHERE b.hotel_id=? AND b.status IN ('Reserved','Checked-in')
          AND date(b.checkin) BETWEEN date(?) AND date(?)
    """, (hotel_id, str(today), str(horizon)))
    for b in checkins:
        if has_demo_notification(hotel_id, "demo_checkin_ishita") and b["name"] == "Ishita Arora":
            continue
        key = f"checkin_{b['id']}"
        active_keys.add(key)
        ci = datetime.strptime(b["checkin"], "%Y-%m-%d").date()
        when = "today" if ci == today else f"on {b['checkin']}"
        upsert_notification(
            hotel_id,
            "Upcoming Check-in",
            f"{b['name']} arriving {when} for Room {b['room_no']}.",
            "YELLOW" if ci > today else "YELLOW",
            "UPCOMING_CHECKINS",
            f"/bookings?q={b['id']}",
            key,
        )

    checkouts = query("""
        SELECT b.id, c.name, r.room_no, b.checkout
        FROM bookings b
        JOIN customers c ON b.customer_id=c.id
        JOIN rooms r ON b.room_id=r.id
        WHERE b.hotel_id=? AND b.status='Checked-in'
          AND date(b.checkout) BETWEEN date(?) AND date(?)
    """, (hotel_id, str(today), str(horizon)))
    for b in checkouts:
        key = f"checkout_{b['id']}"
        active_keys.add(key)
        co = datetime.strptime(b["checkout"], "%Y-%m-%d").date()
        when = "today" if co == today else f"on {b['checkout']}"
        upsert_notification(
            hotel_id,
            "Upcoming Check-out",
            f"{b['name']} checking out {when} from Room {b['room_no']}.",
            "YELLOW",
            "UPCOMING_CHECKOUTS",
            f"/invoice/{b['id']}",
            key,
        )

    hk_tasks = query("""
        SELECT h.id, r.room_no, h.priority
        FROM housekeeping_tasks h
        JOIN rooms r ON h.room_id=r.id
        WHERE h.hotel_id=? AND h.status IN ('Pending','In Progress')
    """, (hotel_id,))
    for t in hk_tasks:
        key = f"hk_{t['id']}"
        active_keys.add(key)
        upsert_notification(
            hotel_id,
            "Housekeeping Task",
            f"Room {t['room_no']} — {t['priority']} priority cleaning pending.",
            "BLUE",
            "HOUSEKEEPING",
            "/housekeeping",
            key,
        )

    maint_rooms = query("SELECT id, room_no FROM rooms WHERE hotel_id=? AND status='Maintenance'", (hotel_id,))
    for r in maint_rooms:
        key = f"maint_{r['id']}"
        active_keys.add(key)
        upsert_notification(
            hotel_id,
            "Maintenance Required",
            f"Room {r['room_no']} is under maintenance.",
            "RED",
            "MAINTENANCE",
            "/rooms?q=" + r["room_no"],
            key,
        )

    auto_rows = query(
        "SELECT id, source_key FROM notifications WHERE hotel_id=? AND is_demo=0 AND source_key IS NOT NULL",
        (hotel_id,),
    )
    for row in auto_rows:
        if row["source_key"] not in active_keys:
            query("DELETE FROM notifications WHERE id=?", (row["id"],), commit=True)


def seed_demo_notifications(hotel_id=DEFAULT_HOTEL_ID):
    hotel = query("SELECT hotel_name, city FROM hotels WHERE id=?", (hotel_id,), one=True)
    if not hotel:
        return
    seed_hotel_demo_notifications(query, hotel_id, hotel["hotel_name"], hotel["city"])


def sync_room_status_from_bookings(room_id):
    active = query(
        "SELECT status FROM bookings WHERE room_id=? AND status IN ('Reserved','Checked-in') ORDER BY id DESC LIMIT 1",
        (room_id,), one=True
    )
    maint = query("SELECT status FROM rooms WHERE id=?", (room_id,), one=True)
    if maint and maint["status"] == "Maintenance":
        return
    hk = query(
        "SELECT status FROM housekeeping_tasks WHERE room_id=? AND status != 'Completed' ORDER BY id DESC LIMIT 1",
        (room_id,), one=True
    )
    if hk:
        query("UPDATE rooms SET status='Cleaning' WHERE id=?", (room_id,), commit=True)
        return
    if active:
        if active["status"] == "Checked-in":
            query("UPDATE rooms SET status='Occupied' WHERE id=?", (room_id,), commit=True)
        else:
            query("UPDATE rooms SET status='Reserved' WHERE id=?", (room_id,), commit=True)
    else:
        query("UPDATE rooms SET status='Available' WHERE id=? AND status NOT IN ('Maintenance')",
              (room_id,), commit=True)


def init_db():
    global _db_ready
    if _db_ready:
        return
    os.makedirs(os.path.join(BASE_DIR, "instance"), exist_ok=True)
    conn = get_db()
    c = conn.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        full_name TEXT,
        role TEXT,
        status TEXT DEFAULT 'Active'
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS rooms(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_no TEXT UNIQUE,
        room_type TEXT,
        category TEXT,
        floor INTEGER DEFAULT 1,
        price REAL,
        capacity INTEGER DEFAULT 2,
        status TEXT DEFAULT 'Available',
        amenities TEXT,
        image_url TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS customers(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        id_proof_type TEXT,
        id_proof_number TEXT,
        id_proof TEXT,
        gender TEXT,
        age INTEGER
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS guests(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        booking_id INTEGER,
        name TEXT,
        age INTEGER,
        gender TEXT,
        id_proof_type TEXT,
        id_proof_number TEXT,
        FOREIGN KEY(customer_id) REFERENCES customers(id),
        FOREIGN KEY(booking_id) REFERENCES bookings(id)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS bookings(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        room_id INTEGER,
        checkin TEXT,
        checkout TEXT,
        num_guests INTEGER DEFAULT 1,
        total_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'Reserved',
        payment_status TEXT DEFAULT 'Pending',
        notes TEXT,
        FOREIGN KEY(customer_id) REFERENCES customers(id),
        FOREIGN KEY(room_id) REFERENCES rooms(id)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS payments(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER,
        amount REAL,
        payment_mode TEXT,
        receipt_number TEXT,
        payment_date TEXT,
        notes TEXT,
        FOREIGN KEY(booking_id) REFERENCES bookings(id)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS inventory(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT UNIQUE,
        category TEXT,
        quantity INTEGER,
        unit TEXT,
        price REAL,
        reorder_level INTEGER,
        supplier_name TEXT,
        last_updated TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS service_usage(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER,
        item_id INTEGER,
        quantity INTEGER,
        amount REAL,
        usage_date TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS employees(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        email TEXT,
        role TEXT,
        designation TEXT,
        department TEXT,
        salary REAL,
        shift TEXT,
        joining_date TEXT,
        status TEXT DEFAULT 'Active'
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS housekeeping_tasks(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER,
        assigned_to INTEGER,
        status TEXT DEFAULT 'Pending',
        priority TEXT DEFAULT 'Medium',
        notes TEXT,
        created_at TEXT,
        completed_at TEXT,
        FOREIGN KEY(room_id) REFERENCES rooms(id),
        FOREIGN KEY(assigned_to) REFERENCES employees(id)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS room_service_requests(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER,
        room_id INTEGER,
        request_type TEXT,
        description TEXT,
        status TEXT DEFAULT 'Pending',
        charges REAL DEFAULT 0,
        add_to_bill INTEGER DEFAULT 0,
        created_at TEXT,
        FOREIGN KEY(booking_id) REFERENCES bookings(id),
        FOREIGN KEY(room_id) REFERENCES rooms(id)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS bills(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER UNIQUE,
        room_charges REAL,
        service_charges REAL,
        tax REAL,
        discount REAL,
        total REAL,
        payment_status TEXT,
        bill_date TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS notifications(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER NOT NULL DEFAULT 1,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        action_url TEXT,
        source_key TEXT,
        is_demo INTEGER DEFAULT 0,
        UNIQUE(hotel_id, source_key)
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS hotels(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_name TEXT NOT NULL,
        hotel_code TEXT UNIQUE,
        logo TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT DEFAULT 'India',
        phone TEXT,
        email TEXT,
        gst_number TEXT,
        owner_name TEXT,
        owner_email TEXT,
        subscription_plan TEXT DEFAULT 'Professional',
        subscription_status TEXT DEFAULT 'Active',
        created_at TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS audit_logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hotel_id INTEGER,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        details TEXT,
        created_at TEXT NOT NULL
    )""")

    conn.commit()
    conn.close()
    migrate_db()
    seed_db()
    _db_ready = True


def ensure_db():
    """Initialize database once — safe to call from any entry point."""
    try:
        init_db()
    except Exception as exc:
        print(f"[HMS ERROR] Database setup failed: {exc}", file=sys.stderr)
        raise


def migrate_db():
    add_column_if_missing("users", "full_name", "TEXT")
    add_column_if_missing("rooms", "room_type", "TEXT")
    add_column_if_missing("rooms", "floor", "INTEGER DEFAULT 1")
    add_column_if_missing("rooms", "capacity", "INTEGER DEFAULT 2")
    add_column_if_missing("rooms", "amenities", "TEXT")
    add_column_if_missing("rooms", "image_url", "TEXT")
    add_column_if_missing("customers", "id_proof_type", "TEXT")
    add_column_if_missing("customers", "id_proof_number", "TEXT")
    add_column_if_missing("customers", "gender", "TEXT")
    add_column_if_missing("customers", "age", "INTEGER")
    add_column_if_missing("bookings", "num_guests", "INTEGER DEFAULT 1")
    add_column_if_missing("bookings", "total_amount", "REAL DEFAULT 0")
    add_column_if_missing("bookings", "payment_status", "TEXT DEFAULT 'Pending'")
    add_column_if_missing("bookings", "notes", "TEXT")
    add_column_if_missing("inventory", "supplier_name", "TEXT")
    add_column_if_missing("inventory", "last_updated", "TEXT")
    add_column_if_missing("employees", "role", "TEXT")
    add_column_if_missing("employees", "department", "TEXT")
    add_column_if_missing("employees", "joining_date", "TEXT")
    add_column_if_missing("employees", "last_login", "TEXT")
    add_column_if_missing("employees", "user_id", "INTEGER")
    add_column_if_missing("employees", "archived_at", "TEXT")
    add_column_if_missing("users", "last_login", "TEXT")
    add_column_if_missing("users", "archived_at", "TEXT")
    add_column_if_missing("customers", "emergency_contact", "TEXT")
    add_column_if_missing("bookings", "adults", "INTEGER")
    add_column_if_missing("bookings", "children", "INTEGER")
    add_column_if_missing("bookings", "booking_source", "TEXT")
    add_column_if_missing("bookings", "special_request", "TEXT")

    for table in HOTEL_SCOPED_TABLES:
        add_column_if_missing(table, "hotel_id", "INTEGER")

    query("UPDATE users SET hotel_id=NULL WHERE role IN ('Super Admin','SUPER_ADMIN')", commit=True)
    query(
        "UPDATE users SET hotel_id=? WHERE hotel_id IS NULL AND role NOT IN ('Super Admin','SUPER_ADMIN')",
        (DEFAULT_HOTEL_ID,),
        commit=True,
    )
    for table in HOTEL_SCOPED_TABLES:
        if table != "users":
            query(f"UPDATE {table} SET hotel_id=? WHERE hotel_id IS NULL", (DEFAULT_HOTEL_ID,), commit=True)

    query("UPDATE users SET role='SUPER_ADMIN' WHERE role='Super Admin'", commit=True)
    query("UPDATE users SET role='HOTEL_ADMIN' WHERE role='Admin'", commit=True)
    query("UPDATE users SET role='RECEPTIONIST' WHERE role='Receptionist'", commit=True)
    query("UPDATE users SET role='HOUSEKEEPING' WHERE role='Housekeeping'", commit=True)
    query("UPDATE users SET role='MANAGER' WHERE role='Manager'", commit=True)
    query("UPDATE users SET role='RECEPTIONIST' WHERE role='Staff'", commit=True)

    # Normalize legacy booking statuses
    query("UPDATE bookings SET status='Reserved' WHERE status='Active'", commit=True)
    query("UPDATE bookings SET status='Checked-out' WHERE status='Checked Out'", commit=True)

    # Sync room_type from category
    query("UPDATE rooms SET room_type=category WHERE room_type IS NULL OR room_type=''", commit=True)


def seed_db():
    """Seed multi-hotel demo data idempotently; always ensure super admin exists."""
    seed_multi_hotel_demo(
        query,
        calc_room_charges,
        receipt_number,
        sync_notifications_from_data,
    )


def is_logged_in():
    return "user_id" in session


def is_super_admin():
    return is_super_admin_role()


def can_login(status):
    return status in LOGIN_ALLOWED_STATUSES


def employee_has_dependencies(emp_id):
    hk = query("SELECT COUNT(*) c FROM housekeeping_tasks WHERE assigned_to=?", (emp_id,), one=True)["c"]
    return hk > 0


def sync_employee_user_status(emp_id, status):
    emp = query("SELECT user_id FROM employees WHERE id=?", (emp_id,), one=True)
    if emp and emp["user_id"]:
        user_status = "Active" if status == "Active" else status
        query("UPDATE users SET status=? WHERE id=?", (user_status, emp["user_id"]), commit=True)


def user_has_dependencies(user_id):
    emp = query("SELECT COUNT(*) c FROM employees WHERE user_id=?", (user_id,), one=True)["c"]
    return emp > 0


@app.template_filter("css_class")
def css_class_filter(value):
    return (str(value or "")).replace(" ", "-")


@app.errorhandler(500)
def server_error(e):
    return render_template("error.html", error=str(e)), 500


@app.context_processor
def inject_globals():
    hotel = get_current_hotel()
    hotels = []
    if is_super_admin_role():
        hotels = query("SELECT id, hotel_name, hotel_code, subscription_status FROM hotels ORDER BY hotel_name")
    elif session.get("user_hotel_id"):
        hotels = query(
            "SELECT id, hotel_name, hotel_code, subscription_status FROM hotels WHERE id=?",
            (session["user_hotel_id"],),
        )
    return dict(
        app_name=APP_NAME,
        app_short_name=APP_SHORT_NAME,
        app_tagline=APP_TAGLINE,
        platform_name=PLATFORM_NAME,
        browser_title=BROWSER_TITLE,
        current_user=session,
        active_page=request.endpoint if request else "",
        roles=ROLES,
        role_labels=ROLE_LABELS,
        room_statuses=ROOM_STATUSES,
        booking_statuses=BOOKING_STATUSES,
        payment_statuses=PAYMENT_STATUSES,
        payment_modes=PAYMENT_MODES,
        departments=DEPARTMENTS,
        hk_statuses=HK_STATUSES,
        hk_priorities=HK_PRIORITIES,
        rs_types=RS_TYPES,
        rs_statuses=RS_STATUSES,
        employee_statuses=EMPLOYEE_STATUSES,
        user_statuses=USER_STATUSES,
        id_proof_types=ID_PROOF_TYPES,
        booking_sources=BOOKING_SOURCES,
        subscription_plans=SUBSCRIPTION_PLANS,
        current_hotel=hotel,
        current_hotel_name=hotel["hotel_name"] if hotel else "Safe Stays Property",
        platform_hotels=hotels,
        is_read_only=is_hotel_read_only(),
        can_write=can_write_hotel_ops(),
        is_platform_admin=is_super_admin_role(),
        normalize_role=normalize_role,
        role_label=role_label,
    )


@app.before_request
def tenant_security():
    blocked = enforce_permissions(query, get_current_hotel_id, api_error)
    if blocked:
        return blocked


@app.before_request
def require_login():
    if request.endpoint in ["login", "static", None]:
        return
    if not is_logged_in():
        return redirect(url_for("login"))


@app.route("/", methods=["GET", "POST"])
def login():
    if is_logged_in():
        if is_super_admin_role():
            return redirect(url_for("platform_dashboard"))
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        user = query(
            "SELECT * FROM users WHERE username=? AND password=?",
            (request.form["username"], request.form["password"]), one=True
        )
        if user and can_login(user["status"]):
            now = datetime.now().strftime("%Y-%m-%d %H:%M")
            query("UPDATE users SET last_login=? WHERE id=?", (now, user["id"]), commit=True)
            query("UPDATE employees SET last_login=? WHERE user_id=?", (now, user["id"]), commit=True)
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            session["full_name"] = user["full_name"] or user["username"]
            session["role"] = user["role"]
            session["user_hotel_id"] = user["hotel_id"]
            if is_super_admin_role(user["role"]):
                session["hotel_id"] = session.get("hotel_id") or DEFAULT_HOTEL_ID
            else:
                session["hotel_id"] = user["hotel_id"] or DEFAULT_HOTEL_ID
            if is_super_admin_role(user["role"]):
                return redirect(url_for("platform_dashboard"))
            return redirect(url_for("dashboard"))
        if user and not can_login(user["status"]):
            flash("Your account is inactive. Contact your administrator.", "danger")
        else:
            flash("Invalid username or password.", "danger")
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/search")
def search():
    q = request.args.get("q", "").strip()
    hid = get_current_hotel_id()
    results = {"rooms": [], "customers": [], "bookings": [], "payments": []}
    if q:
        like = f"%{q}%"
        results["rooms"] = query(
            "SELECT * FROM rooms WHERE hotel_id=? AND (room_no LIKE ? OR room_type LIKE ? OR category LIKE ?) ORDER BY room_no LIMIT 10",
            (hid, like, like, like)
        )
        results["customers"] = query(
            "SELECT * FROM customers WHERE hotel_id=? AND (name LIKE ? OR phone LIKE ? OR email LIKE ?) ORDER BY id DESC LIMIT 10",
            (hid, like, like, like)
        )
        results["bookings"] = query("""
            SELECT b.id, c.name, r.room_no, b.checkin, b.checkout, b.status
            FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
            WHERE b.hotel_id=? AND (c.name LIKE ? OR r.room_no LIKE ? OR CAST(b.id AS TEXT) LIKE ?)
            ORDER BY b.id DESC LIMIT 10
        """, (hid, like, like, like))
        results["payments"] = query("""
            SELECT p.*, c.name, r.room_no FROM payments p
            JOIN bookings b ON p.booking_id=b.id
            JOIN customers c ON b.customer_id=c.id
            JOIN rooms r ON b.room_id=r.id
            WHERE b.hotel_id=? AND (p.receipt_number LIKE ? OR c.name LIKE ? OR r.room_no LIKE ?)
            ORDER BY p.id DESC LIMIT 10
        """, (hid, like, like, like))
    return render_template("search.html", q=q, results=results)


def dashboard_stats(hotel_id=None):
    hotel_id = hotel_id or get_current_hotel_id()
    today = date.today().isoformat()
    revenue = query(
        """SELECT COALESCE(SUM(p.amount),0) t FROM payments p
           JOIN bookings b ON p.booking_id=b.id WHERE b.hotel_id=?""",
        (hotel_id,),
        one=True,
    )["t"]
    total_rooms = query("SELECT COUNT(*) c FROM rooms WHERE hotel_id=?", (hotel_id,), one=True)["c"]
    occupied = query(
        "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Occupied'",
        (hotel_id,),
        one=True,
    )["c"]
    return {
        "total_rooms": total_rooms,
        "available": query(
            "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Available'",
            (hotel_id,),
            one=True,
        )["c"],
        "occupied": occupied,
        "occupancy_rate": round((occupied / total_rooms) * 100) if total_rooms else 0,
        "active_bookings": query(
            "SELECT COUNT(*) c FROM bookings WHERE hotel_id=? AND status IN ('Reserved','Checked-in')",
            (hotel_id,),
            one=True,
        )["c"],
        "employees": query(
            "SELECT COUNT(*) c FROM employees WHERE hotel_id=? AND status='Active'",
            (hotel_id,),
            one=True,
        )["c"],
        "revenue": revenue,
        "today_revenue": query(
            """SELECT COALESCE(SUM(p.amount),0) t FROM payments p
               JOIN bookings b ON p.booking_id=b.id
               WHERE b.hotel_id=? AND date(p.payment_date)=?""",
            (hotel_id, today),
            one=True,
        )["t"],
        "today_checkins": query(
            "SELECT COUNT(*) c FROM bookings WHERE hotel_id=? AND checkin=?",
            (hotel_id, today),
            one=True,
        )["c"],
        "today_checkouts": query(
            "SELECT COUNT(*) c FROM bookings WHERE hotel_id=? AND checkout=?",
            (hotel_id, today),
            one=True,
        )["c"],
        "pending_payments": query(
            "SELECT COUNT(*) c FROM bookings WHERE hotel_id=? AND payment_status IN ('Pending','Partial')",
            (hotel_id,),
            one=True,
        )["c"],
        "maintenance": query(
            "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Maintenance'",
            (hotel_id,),
            one=True,
        )["c"],
        "cleaning": query(
            "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Cleaning'",
            (hotel_id,),
            one=True,
        )["c"],
    }


@app.route("/api/dashboard/charts/revenue-trend")
def api_chart_revenue_trend():
    if not is_logged_in():
        return api_error("Unauthorized", 401)
    hotel_id = get_current_hotel_id()
    data, is_demo = with_fallback(get_revenue_trend(query, hotel_id), DEMO_REVENUE_TREND, "revenue")
    return api_ok(data=data, hotelId=hotel_id, isDemo=is_demo)


@app.route("/api/dashboard/charts/occupancy-status")
def api_chart_occupancy_status():
    if not is_logged_in():
        return api_error("Unauthorized", 401)
    hotel_id = get_current_hotel_id()
    data, is_demo = with_fallback(get_occupancy_status(query, hotel_id), DEMO_OCCUPANCY_STATUS, "value")
    return api_ok(data=data, hotelId=hotel_id, isDemo=is_demo)


@app.route("/api/dashboard/charts/booking-trend")
def api_chart_booking_trend():
    if not is_logged_in():
        return api_error("Unauthorized", 401)
    hotel_id = get_current_hotel_id()
    data, is_demo = with_fallback(get_booking_trend(query, hotel_id), DEMO_BOOKING_TREND, "bookings")
    return api_ok(data=data, hotelId=hotel_id, isDemo=is_demo)


@app.route("/dashboard")
def dashboard():
    hid = get_current_hotel_id()
    stats = dashboard_stats(hid)
    low_stock = query(
        "SELECT * FROM inventory WHERE hotel_id=? AND quantity <= reorder_level ORDER BY quantity ASC LIMIT 6",
        (hid,),
    )
    recent_bookings = query("""
        SELECT b.id, c.name, r.room_no, r.room_type, b.checkin, b.checkout, b.status, b.payment_status
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE b.hotel_id=? ORDER BY b.id DESC LIMIT 8
    """, (hid,))
    recent_payments = query("""
        SELECT p.id, p.amount, p.payment_mode, p.receipt_number, p.payment_date, c.name, r.room_no
        FROM payments p JOIN bookings b ON p.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE b.hotel_id=? ORDER BY p.id DESC LIMIT 8
    """, (hid,))
    upcoming_checkins = query("""
        SELECT b.id, c.name, r.room_no, b.checkin, b.checkout, b.status
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE b.hotel_id=? AND b.checkin >= ? AND b.status IN ('Reserved','Checked-in')
        ORDER BY b.checkin ASC LIMIT 6
    """, (hid, date.today().isoformat()))
    upcoming_checkouts = query("""
        SELECT b.id, c.name, r.room_no, b.checkin, b.checkout, b.status
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE b.hotel_id=? AND b.checkout >= ? AND b.status='Checked-in'
        ORDER BY b.checkout ASC LIMIT 6
    """, (hid, date.today().isoformat()))
    maintenance_rooms = query(
        "SELECT room_no, room_type, status FROM rooms WHERE hotel_id=? AND status IN ('Maintenance','Cleaning') LIMIT 6",
        (hid,),
    )
    return render_template(
        "dashboard.html",
        stats=stats,
        low_stock=low_stock,
        recent_bookings=recent_bookings,
        recent_payments=recent_payments,
        upcoming_checkins=upcoming_checkins,
        upcoming_checkouts=upcoming_checkouts,
        maintenance_rooms=maintenance_rooms,
    )


# ─── Rooms ───────────────────────────────────────────────────────────────────

@app.route("/rooms")
def rooms():
    sql, params, f = rooms_query(get_current_hotel_id())
    all_rooms = query(sql, params)
    page_rows, total, page, size = paginate_rows(all_rooms, f["page"], f["size"])
    types = query("SELECT DISTINCT room_type FROM rooms ORDER BY room_type")
    return render_template(
        "rooms.html", rooms=page_rows, types=types, list_total=total,
        list_showing=len(page_rows), list_page=page, list_size=size,
        sort_by=f["sort_by"], sort_dir=f["sort_dir"],
        filter_status=f["status"], filter_type=f["type"], search_q=f["q"],
        floor=f["floor"], capacity=f["capacity"], price_min=f["price_min"], price_max=f["price_max"],
    )


@app.route("/rooms/add", methods=["POST"])
def add_room():
    try:
        query("""INSERT INTO rooms(room_no,room_type,category,floor,price,capacity,status,amenities,image_url,hotel_id)
                 VALUES(?,?,?,?,?,?,?,?,?,?)""",
              (request.form["room_no"], request.form["room_type"], request.form["room_type"],
               int(request.form.get("floor") or 1), float(request.form["price"]),
               int(request.form.get("capacity") or 2), request.form["status"],
               request.form.get("amenities", ""), request.form.get("image_url", ""), get_current_hotel_id()), commit=True)
        log_audit(f"Created room {request.form['room_no']}", "room")
        flash("Room added successfully.", "success")
    except Exception as e:
        flash(f"Error: {e}", "danger")
    return redirect(url_for("rooms"))


@app.route("/rooms/update/<int:room_id>", methods=["POST"])
def update_room(room_id):
    query("""UPDATE rooms SET room_no=?, room_type=?, category=?, floor=?, price=?, capacity=?,
             status=?, amenities=?, image_url=? WHERE id=? AND hotel_id=?""",
          (request.form["room_no"], request.form["room_type"], request.form["room_type"],
           int(request.form.get("floor") or 1), float(request.form["price"]),
           int(request.form.get("capacity") or 2), request.form["status"],
           request.form.get("amenities", ""), request.form.get("image_url", ""), room_id, get_current_hotel_id()), commit=True)
    flash("Room updated.", "success")
    return redirect(url_for("rooms"))


@app.route("/rooms/delete/<int:room_id>", methods=["POST"])
def delete_room(room_id):
    active = query("SELECT COUNT(*) c FROM bookings WHERE room_id=? AND status IN ('Reserved','Checked-in')",
                   (room_id,), one=True)["c"]
    if active:
        flash("Cannot delete room with active bookings.", "danger")
    else:
        query("DELETE FROM rooms WHERE id=? AND hotel_id=?", (room_id, get_current_hotel_id()), commit=True)
        flash("Room deleted.", "success")
    return redirect(url_for("rooms"))


# ─── Customers ───────────────────────────────────────────────────────────────

@app.route("/customers")
def customers():
    sql, params, f = customers_query(get_current_hotel_id())
    customer_list = []
    for c in query(sql, params):
        cd = dict(c)
        cd["guests"] = query("SELECT * FROM guests WHERE customer_id=? AND booking_id IS NULL", (c["id"],))
        bc = query("SELECT COUNT(*) c FROM bookings WHERE customer_id=?", (c["id"],), one=True)["c"]
        cd["booking_count"] = bc
        if f["guest_type"] == "new" and bc > 1:
            continue
        if f["guest_type"] == "returning" and bc <= 1:
            continue
        customer_list.append(cd)
    page_rows, total, page, size = paginate_rows(customer_list, f["page"], f["size"])
    return render_template(
        "customers.html", customers=page_rows, list_total=total,
        list_showing=len(page_rows), list_page=page, list_size=size,
        sort_by=f["sort_by"], sort_dir=f["sort_dir"],
        search_q=f["q"], guest_type=f["guest_type"], id_proof_type=f["id_proof_type"],
        city=f["city"], email=f["email"], date_from=f["from"], date_to=f["to"],
    )


@app.route("/customers/add", methods=["POST"])
def add_customer():
    cid = query("""INSERT INTO customers(name,phone,email,address,id_proof_type,id_proof_number,gender,age,id_proof,emergency_contact)
                   VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (request.form["name"], request.form["phone"], request.form.get("email"),
                 request.form.get("address"), request.form.get("id_proof_type"),
                 request.form.get("id_proof_number"), request.form.get("gender"),
                 int(request.form["age"]) if request.form.get("age") else None,
                 f"{request.form.get('id_proof_type','')}-{request.form.get('id_proof_number','')}",
                 request.form.get("emergency_contact")), commit=True)
    guest_names = request.form.getlist("guest_name")
    for i, gn in enumerate(guest_names):
        if gn.strip():
            ages = request.form.getlist("guest_age")
            genders = request.form.getlist("guest_gender")
            query("INSERT INTO guests(customer_id,name,age,gender) VALUES(?,?,?,?)",
                  (cid, gn.strip(), int(ages[i]) if i < len(ages) and ages[i] else None,
                   genders[i] if i < len(genders) else None), commit=True)
    flash("Customer added.", "success")
    if request.form.get("redirect_to") == "bookings":
        return redirect(url_for("bookings", new_customer=cid))
    return redirect(url_for("customers"))


@app.route("/customers/update/<int:customer_id>", methods=["POST"])
def update_customer(customer_id):
    query("""UPDATE customers SET name=?, phone=?, email=?, address=?, id_proof_type=?,
             id_proof_number=?, gender=?, age=?, id_proof=? WHERE id=?""",
          (request.form["name"], request.form["phone"], request.form.get("email"),
           request.form.get("address"), request.form.get("id_proof_type"),
           request.form.get("id_proof_number"), request.form.get("gender"),
           int(request.form["age"]) if request.form.get("age") else None,
           f"{request.form.get('id_proof_type','')}-{request.form.get('id_proof_number','')}",
           customer_id), commit=True)
    query("DELETE FROM guests WHERE customer_id=? AND booking_id IS NULL", (customer_id,), commit=True)
    for gn in request.form.getlist("guest_name"):
        if gn.strip():
            query("INSERT INTO guests(customer_id,name) VALUES(?,?)", (customer_id, gn.strip()), commit=True)
    flash("Customer updated.", "success")
    return redirect(url_for("customers"))


@app.route("/customers/delete/<int:customer_id>", methods=["POST"])
def delete_customer(customer_id):
    active = query("SELECT COUNT(*) c FROM bookings WHERE customer_id=? AND status IN ('Reserved','Checked-in')",
                   (customer_id,), one=True)["c"]
    if active:
        flash("Cannot delete customer with active bookings.", "danger")
    else:
        query("DELETE FROM guests WHERE customer_id=?", (customer_id,), commit=True)
        query("DELETE FROM customers WHERE id=?", (customer_id,), commit=True)
        flash("Customer deleted.", "success")
    return redirect(url_for("customers"))


# ─── Booking API (JSON) ───────────────────────────────────────────────────────

@app.route("/api/customers/search")
def api_search_customers():
    q = request.args.get("q", "").strip()
    if not q:
        rows = query("SELECT * FROM customers ORDER BY name LIMIT 20")
    else:
        like = f"%{q}%"
        rows = query(
            "SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY name LIMIT 20",
            (like, like, like),
        )
    return api_ok(customers=[customer_to_dict(r) for r in rows])


@app.route("/api/customers", methods=["POST"])
def api_create_customer():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    if not name or not phone:
        return api_error("Name and phone are required.")

    cid = query(
        """INSERT INTO customers(name,phone,email,address,id_proof_type,id_proof_number,gender,age,id_proof,emergency_contact)
           VALUES(?,?,?,?,?,?,?,?,?,?)""",
        (
            name,
            phone,
            data.get("email"),
            data.get("address"),
            data.get("id_proof_type"),
            data.get("id_proof_number"),
            data.get("gender"),
            int(data["age"]) if data.get("age") else None,
            f"{data.get('id_proof_type', '')}-{data.get('id_proof_number', '')}",
            data.get("emergency_contact"),
        ),
        commit=True,
    )
    customer = customer_to_dict(query("SELECT * FROM customers WHERE id=?", (cid,), one=True))
    return api_ok(customer=customer)


@app.route("/api/rooms/available")
def api_available_rooms():
    checkin = request.args.get("checkin", "").strip()
    checkout = request.args.get("checkout", "").strip()
    num_guests = int(request.args.get("guests") or request.args.get("num_guests") or 1)

    if not checkin or not checkout:
        return api_error("Check-in and check-out dates are required.")
    try:
        if datetime.strptime(checkout, "%Y-%m-%d") <= datetime.strptime(checkin, "%Y-%m-%d"):
            return api_error("Check-out must be after check-in.")
    except ValueError:
        return api_error("Invalid date format.")

    rooms = get_available_rooms(checkin, checkout, num_guests)
    return api_ok(rooms=rooms, nights=nights_between(checkin, checkout))


@app.route("/api/bookings/list")
def api_bookings_list():
    sql, params, f = bookings_query(get_current_hotel_id())
    rows = query(sql, params)
    page_rows, total, page, size = paginate_rows(rows, f["page"], f["size"])
    return api_ok(
        bookings=[booking_row_to_dict(r) for r in page_rows],
        total=total,
        page=page,
        size=size,
        showing=len(page_rows),
    )


@app.route("/api/bookings", methods=["POST"])
def api_create_booking():
    data = request.get_json(silent=True) or {}
    customer_id = data.get("customer_id")
    room_id = data.get("room_id")
    checkin = (data.get("checkin") or "").strip()
    checkout = (data.get("checkout") or "").strip()
    adults = int(data.get("adults") or 1)
    children = int(data.get("children") or 0)
    num_guests = int(data.get("num_guests") or adults + children or 1)
    booking_source = data.get("booking_source") or "Walk-in"
    special_request = data.get("special_request") or ""
    advance_amount = float(data.get("advance_amount") or 0)
    payment_mode = data.get("payment_mode") or "Cash"

    if not all([customer_id, room_id, checkin, checkout]):
        return api_error("Customer, room, check-in, and check-out are required.")

    try:
        if datetime.strptime(checkout, "%Y-%m-%d") <= datetime.strptime(checkin, "%Y-%m-%d"):
            return api_error("Check-out must be after check-in.")
    except ValueError:
        return api_error("Invalid date format.")

    room = query("SELECT * FROM rooms WHERE id=?", (room_id,), one=True)
    if not room:
        return api_error("Room not found.", 404)
    if room["status"] in UNAVAILABLE_ROOM_STATUSES:
        return api_error(f"Room {room['room_no']} is not available ({room['status']}).")
    if room_has_overlap(int(room_id), checkin, checkout):
        return api_error("Room is already booked for overlapping dates.")
    if num_guests > room["capacity"]:
        return api_error(f"Room capacity is {room['capacity']} guests.")

    total = calc_room_charges(room["price"], checkin, checkout)
    payment_status = "Pending"
    if advance_amount >= total:
        payment_status = "Paid"
    elif advance_amount > 0:
        payment_status = "Partial"

    bid = query(
        """INSERT INTO bookings(customer_id,room_id,checkin,checkout,num_guests,adults,children,
           booking_source,special_request,total_amount,status,payment_status,notes)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            customer_id,
            room_id,
            checkin,
            checkout,
            num_guests,
            adults,
            children,
            booking_source,
            special_request,
            total,
            "Reserved",
            payment_status,
            special_request,
        ),
        commit=True,
    )

    if advance_amount > 0:
        query(
            """INSERT INTO payments(booking_id,amount,payment_mode,receipt_number,payment_date,notes)
               VALUES(?,?,?,?,?,?)""",
            (
                bid,
                advance_amount,
                payment_mode,
                receipt_number(),
                datetime.now().strftime("%Y-%m-%d %H:%M"),
                "Advance payment at booking",
            ),
            commit=True,
        )
        update_booking_payment_status(bid)

    query("UPDATE rooms SET status='Reserved' WHERE id=?", (room_id,), commit=True)

    sync_notifications_from_data(get_current_hotel_id())

    booking = query(
        """
        SELECT b.*, c.name customer_name, c.phone, r.room_no, r.room_type, r.price
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE b.id=?
        """,
        (bid,),
        one=True,
    )
    paid = booking_paid_amount(bid)
    return api_ok(
        booking=booking_row_to_dict(booking),
        summary={
            "nights": nights_between(checkin, checkout),
            "total_amount": total,
            "advance_paid": paid,
            "balance": max(total - paid, 0),
        },
    )


# ─── Bookings ────────────────────────────────────────────────────────────────

@app.route("/bookings")
def bookings():
    sql, params, f = bookings_query(get_current_hotel_id())
    all_bookings = query(sql, params)
    page_rows, total, page, size = paginate_rows(all_bookings, f["page"], f["size"])
    all_customers = query("SELECT id, name, phone FROM customers ORDER BY name")
    all_rooms = query("SELECT * FROM rooms ORDER BY room_no")
    new_customer = request.args.get("new_customer", type=int)
    return render_template(
        "bookings.html", bookings=page_rows, customers=all_customers, rooms=all_rooms,
        list_total=total, list_showing=len(page_rows), list_page=page, list_size=size,
        sort_by=f["sort_by"], sort_dir=f["sort_dir"],
        filter_status=f["status"], search_q=f["q"], date_from=f["from"], date_to=f["to"],
        payment_status=f["payment_status"], phone=f["phone"], room_no=f["room_no"],
        booking_source=f["booking_source"], checkin_from=f["checkin_from"], checkin_to=f["checkin_to"],
        checkout_from=f["checkout_from"], checkout_to=f["checkout_to"],
        amount_min=f["amount_min"], amount_max=f["amount_max"],
        new_customer=new_customer,
    )


@app.route("/bookings/add", methods=["POST"])
def add_booking():
    customer_id = request.form.get("customer_id")
    room_id = request.form.get("room_id")
    checkin = request.form.get("checkin")
    checkout = request.form.get("checkout")
    num_guests = int(request.form.get("num_guests") or 1)

    if not all([customer_id, room_id, checkin, checkout]):
        flash("Please fill all required fields.", "danger")
        return redirect(url_for("bookings"))

    if datetime.strptime(checkout, "%Y-%m-%d") <= datetime.strptime(checkin, "%Y-%m-%d"):
        flash("Check-out must be after check-in.", "danger")
        return redirect(url_for("bookings"))

    if room_has_overlap(int(room_id), checkin, checkout):
        flash("Room is already booked for overlapping dates.", "danger")
        return redirect(url_for("bookings"))

    room = query("SELECT * FROM rooms WHERE id=?", (room_id,), one=True)
    if num_guests > room["capacity"]:
        flash(f"Room capacity is {room['capacity']} guests.", "danger")
        return redirect(url_for("bookings"))

    total = calc_room_charges(room["price"], checkin, checkout)
    bid = query("""INSERT INTO bookings(customer_id,room_id,checkin,checkout,num_guests,total_amount,status,payment_status)
                   VALUES(?,?,?,?,?,?,?,?)""",
                (customer_id, room_id, checkin, checkout, num_guests, total, "Reserved", "Pending"), commit=True)

    for gn in request.form.getlist("guest_name"):
        if gn.strip():
            query("INSERT INTO guests(customer_id,booking_id,name) VALUES(?,?,?)",
                  (customer_id, bid, gn.strip()), commit=True)

    query("UPDATE rooms SET status='Reserved' WHERE id=?", (room_id,), commit=True)
    sync_notifications_from_data(get_current_hotel_id())
    flash("Booking created successfully.", "success")
    return redirect(url_for("bookings"))


@app.route("/bookings/update/<int:booking_id>", methods=["POST"])
def update_booking(booking_id):
    checkin = request.form["checkin"]
    checkout = request.form["checkout"]
    room_id = int(request.form["room_id"])

    if room_has_overlap(room_id, checkin, checkout, exclude_booking_id=booking_id):
        flash("Room is already booked for overlapping dates.", "danger")
        return redirect(url_for("bookings"))

    room = query("SELECT price FROM rooms WHERE id=?", (room_id,), one=True)
    total = calc_room_charges(room["price"], checkin, checkout)
    query("""UPDATE bookings SET customer_id=?, room_id=?, checkin=?, checkout=?,
             num_guests=?, status=?, total_amount=? WHERE id=?""",
          (request.form["customer_id"], room_id, checkin, checkout,
           int(request.form.get("num_guests") or 1), request.form["status"], total, booking_id), commit=True)
    update_booking_payment_status(booking_id)
    sync_room_status_from_bookings(room_id)
    flash("Booking updated.", "success")
    return redirect(url_for("bookings"))


@app.route("/bookings/cancel/<int:booking_id>", methods=["POST"])
def cancel_booking(booking_id):
    booking = query("SELECT * FROM bookings WHERE id=?", (booking_id,), one=True)
    if booking and booking["status"] in ("Reserved", "Checked-in"):
        query("UPDATE bookings SET status='Cancelled' WHERE id=?", (booking_id,), commit=True)
        sync_room_status_from_bookings(booking["room_id"])
        flash("Booking cancelled.", "success")
    return redirect(url_for("bookings"))


# ─── Check In / Out ──────────────────────────────────────────────────────────

@app.route("/checkin-out")
def checkin_out():
    today = date.today().isoformat()
    arrivals = query("""
        SELECT b.*, c.name customer_name, c.phone, r.room_no, r.room_type, r.price
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE b.checkin <= ? AND b.status='Reserved' ORDER BY b.checkin
    """, (today,))
    active_stays = query("""
        SELECT b.*, c.name customer_name, c.phone, r.room_no, r.room_type, r.price
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE b.status='Checked-in' ORDER BY b.checkin
    """)
    stays = []
    for b in active_stays:
        bd = dict(b)
        bd["paid"] = booking_paid_amount(b["id"])
        bd["total"] = booking_total_amount(b)
        bd["balance"] = max(bd["total"] - bd["paid"], 0)
        stays.append(bd)
    return render_template("checkin_out.html", arrivals=arrivals, active_stays=stays, today=today)


@app.route("/checkin/<int:booking_id>", methods=["POST"])
def checkin(booking_id):
    booking = query("SELECT * FROM bookings WHERE id=?", (booking_id,), one=True)
    if not booking or booking["status"] != "Reserved":
        flash("Invalid booking for check-in.", "danger")
        return redirect(url_for("checkin_out"))
    query("UPDATE bookings SET status='Checked-in' WHERE id=?", (booking_id,), commit=True)
    query("UPDATE rooms SET status='Occupied' WHERE id=?", (booking["room_id"],), commit=True)
    update_booking_payment_status(booking_id)
    sync_notifications_from_data(get_current_hotel_id())
    flash("Guest checked in successfully.", "success")
    return redirect(url_for("checkin_out"))


@app.route("/checkout/<int:booking_id>", methods=["POST"])
def checkout(booking_id):
    booking = query("""
        SELECT b.*, r.price, r.id room_id FROM bookings b JOIN rooms r ON b.room_id=r.id WHERE b.id=?
    """, (booking_id,), one=True)
    if not booking or booking["status"] != "Checked-in":
        flash("Invalid booking for check-out.", "danger")
        return redirect(url_for("checkin_out"))

    discount = float(request.form.get("discount") or 0)
    payment_amount = float(request.form.get("payment_amount") or 0)
    payment_mode = request.form.get("payment_mode", "Cash")

    room_charges = booking_room_charges(booking)
    service_charges = booking_service_charges(booking_id)
    subtotal = max(room_charges + service_charges - discount, 0)
    tax = subtotal * 0.12
    total = subtotal + tax
    paid = booking_paid_amount(booking_id)

    if payment_amount > 0:
        query("""INSERT INTO payments(booking_id,amount,payment_mode,receipt_number,payment_date,notes)
                 VALUES(?,?,?,?,?,?)""",
              (booking_id, payment_amount, payment_mode, receipt_number(),
               datetime.now().strftime("%Y-%m-%d %H:%M"), "Checkout payment"), commit=True)
        paid += payment_amount

    balance = max(total - paid, 0)
    if balance > 0 and not request.form.get("allow_pending"):
        flash(f"Pending balance of ₹{balance:.2f}. Collect payment or confirm checkout with pending balance.", "danger")
        return redirect(url_for("checkin_out"))

    try:
        query("""INSERT INTO bills(booking_id,room_charges,service_charges,tax,discount,total,payment_status,bill_date)
                 VALUES(?,?,?,?,?,?,?,?)""",
              (booking_id, room_charges, service_charges, tax, discount, total,
               "Paid" if balance <= 0 else "Partial", datetime.now().strftime("%Y-%m-%d %H:%M")), commit=True)
    except Exception:
        pass

    query("UPDATE bookings SET status='Checked-out', total_amount=?, payment_status=? WHERE id=?",
          (total, "Paid" if balance <= 0 else "Partial", booking_id), commit=True)
    query("UPDATE rooms SET status='Cleaning' WHERE id=?", (booking["room_id"],), commit=True)

    hk_staff = query("SELECT id FROM employees WHERE department='Housekeeping' AND status='Active' LIMIT 1", one=True)
    query("""INSERT INTO housekeeping_tasks(room_id,assigned_to,status,priority,notes,created_at)
             VALUES(?,?,?,?,?,?)""",
          (booking["room_id"], hk_staff["id"] if hk_staff else None, "Pending", "High",
           "Post checkout cleaning", datetime.now().strftime("%Y-%m-%d %H:%M")), commit=True)

    sync_notifications_from_data(get_current_hotel_id())
    flash("Checkout completed.", "success")
    return redirect(url_for("invoice", booking_id=booking_id))


# ─── Payments ────────────────────────────────────────────────────────────────

@app.route("/payments")
def payments():
    sql, params, f = payments_query(get_current_hotel_id())
    all_payments = query(sql, params)
    page_rows, total, page, size = paginate_rows(all_payments, f["page"], f["size"])
    pending_bookings = query("""
        SELECT b.id, c.name, r.room_no, b.total_amount, b.payment_status, b.checkin, b.checkout
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE b.payment_status IN ('Pending','Partial') AND b.status IN ('Reserved','Checked-in')
        ORDER BY b.id DESC
    """)
    pending = []
    for pb in pending_bookings:
        pd = dict(pb)
        pd["paid"] = booking_paid_amount(pb["id"])
        pd["balance"] = max(float(pb["total_amount"] or 0) - pd["paid"], 0)
        pending.append(pd)
    total_revenue = query("SELECT COALESCE(SUM(amount),0) t FROM payments", one=True)["t"]
    return render_template(
        "payments.html", payments=page_rows, pending_bookings=pending,
        total_revenue=total_revenue, list_total=total, list_showing=len(page_rows),
        list_page=page, list_size=size, sort_by=f["sort_by"], sort_dir=f["sort_dir"],
        search_q=f["q"], payment_mode=f["payment_mode"], booking_id=f["booking_id"],
        payment_status=f["payment_status"], date_from=f["from"], date_to=f["to"],
        amount_min=f["amount_min"], amount_max=f["amount_max"],
    )


@app.route("/payments/add", methods=["POST"])
def add_payment():
    booking_id = int(request.form["booking_id"])
    amount = float(request.form["amount"])
    if amount <= 0:
        flash("Payment amount must be positive.", "danger")
        return redirect(url_for("payments"))
    query("""INSERT INTO payments(booking_id,amount,payment_mode,receipt_number,payment_date,notes)
             VALUES(?,?,?,?,?,?)""",
          (booking_id, amount, request.form["payment_mode"], receipt_number(),
           datetime.now().strftime("%Y-%m-%d %H:%M"), request.form.get("notes", "")), commit=True)
    update_booking_payment_status(booking_id)
    sync_notifications_from_data(get_current_hotel_id())
    flash("Payment recorded.", "success")
    return redirect(url_for("payments"))


@app.route("/receipt/<int:payment_id>")
def receipt(payment_id):
    payment = query("""
        SELECT p.*, c.name, c.phone, c.email, r.room_no, r.room_type, b.checkin, b.checkout
        FROM payments p JOIN bookings b ON p.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE p.id=?
    """, (payment_id,), one=True)
    if not payment:
        flash("Receipt not found.", "danger")
        return redirect(url_for("payments"))
    return render_template("receipt.html", payment=payment)


# ─── Employees ───────────────────────────────────────────────────────────────

def _employee_list_query():
    sql, params, f = employees_query(get_current_hotel_id())
    return query(sql, params), f


@app.route("/employees")
@role_required(*admin_roles())
def employees():
    employee_list, f = _employee_list_query()
    page_rows, total, page, size = paginate_rows(employee_list, f["page"], f["size"])
    return render_template(
        "employees.html", employees=page_rows, list_total=total, list_showing=len(page_rows),
        list_page=page, list_size=size, sort_by=f["sort_by"], sort_dir=f["sort_dir"],
        search_q=f["q"], status_filter=f["status"], department=f["department"],
        role=f["role"], shift=f["shift"], date_from=f["from"], date_to=f["to"],
    )


@app.route("/employees/add", methods=["POST"])
@role_required(*admin_roles())
def add_employee():
    status = request.form.get("status", "Active")
    if status not in EMPLOYEE_STATUSES:
        status = "Active"
    query("""INSERT INTO employees(name,phone,email,role,designation,department,salary,shift,joining_date,status)
             VALUES(?,?,?,?,?,?,?,?,?,?)""",
          (request.form["name"], request.form.get("phone"), request.form.get("email"),
           request.form["role"], request.form["role"], request.form.get("department"),
           float(request.form.get("salary") or 0), request.form.get("shift"),
           request.form.get("joining_date"), status), commit=True)
    flash("Employee added successfully.", "success")
    return redirect(url_for("employees"))


@app.route("/employees/update/<int:emp_id>", methods=["POST"])
@role_required(*admin_roles())
def update_employee(emp_id):
    status = request.form.get("status", "Active")
    if status not in EMPLOYEE_STATUSES:
        status = "Active"
    archived_at = datetime.now().strftime("%Y-%m-%d %H:%M") if status == "Archived" else None
    query("""UPDATE employees SET name=?, phone=?, email=?, role=?, designation=?, department=?,
             salary=?, shift=?, joining_date=?, status=?, archived_at=? WHERE id=?""",
          (request.form["name"], request.form.get("phone"), request.form.get("email"),
           request.form["role"], request.form["role"], request.form.get("department"),
           float(request.form.get("salary") or 0), request.form.get("shift"),
           request.form.get("joining_date"), status, archived_at, emp_id), commit=True)
    sync_employee_user_status(emp_id, status)
    flash("Employee updated successfully.", "success")
    return redirect(url_for("employees", **request.args))


@app.route("/employees/deactivate/<int:emp_id>", methods=["POST"])
@role_required(*admin_roles())
def deactivate_employee(emp_id):
    query("UPDATE employees SET status='Inactive' WHERE id=?", (emp_id,), commit=True)
    sync_employee_user_status(emp_id, "Inactive")
    flash("Employee deactivated.", "success")
    return redirect(url_for("employees", **request.args))


@app.route("/employees/activate/<int:emp_id>", methods=["POST"])
@role_required(*admin_roles())
def activate_employee(emp_id):
    query("UPDATE employees SET status='Active', archived_at=NULL WHERE id=?", (emp_id,), commit=True)
    sync_employee_user_status(emp_id, "Active")
    flash("Employee activated.", "success")
    return redirect(url_for("employees", **request.args))


@app.route("/employees/archive/<int:emp_id>", methods=["POST"])
@role_required(*admin_roles())
def archive_employee(emp_id):
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    query("UPDATE employees SET status='Archived', archived_at=? WHERE id=?", (now, emp_id), commit=True)
    sync_employee_user_status(emp_id, "Archived")
    flash("Employee archived.", "success")
    return redirect(url_for("employees", **request.args))


@app.route("/employees/delete/<int:emp_id>", methods=["POST"])
@role_required("Super Admin")
def delete_employee(emp_id):
    if employee_has_dependencies(emp_id):
        flash("Cannot delete: employee has assigned housekeeping tasks. Archive instead.", "danger")
        return redirect(url_for("employees", **request.args))
    query("DELETE FROM employees WHERE id=?", (emp_id,), commit=True)
    flash("Employee permanently deleted.", "success")
    return redirect(url_for("employees", **request.args))


@app.route("/employees/bulk", methods=["POST"])
@role_required(*admin_roles())
def employees_bulk():
    ids = request.form.getlist("ids")
    action = request.form.get("action", "")
    if not ids:
        flash("No employees selected.", "danger")
        return redirect(url_for("employees", **request.args))

    if action == "delete" and not is_super_admin():
        flash("Only Super Admin can permanently delete employees.", "danger")
        return redirect(url_for("employees", **request.args))

    count = 0
    for emp_id in ids:
        emp_id = int(emp_id)
        if action == "activate":
            query("UPDATE employees SET status='Active', archived_at=NULL WHERE id=?", (emp_id,), commit=True)
            sync_employee_user_status(emp_id, "Active")
            count += 1
        elif action == "deactivate":
            query("UPDATE employees SET status='Inactive' WHERE id=?", (emp_id,), commit=True)
            sync_employee_user_status(emp_id, "Inactive")
            count += 1
        elif action == "archive":
            now = datetime.now().strftime("%Y-%m-%d %H:%M")
            query("UPDATE employees SET status='Archived', archived_at=? WHERE id=?", (now, emp_id), commit=True)
            sync_employee_user_status(emp_id, "Archived")
            count += 1
        elif action == "delete" and is_super_admin():
            if not employee_has_dependencies(emp_id):
                query("DELETE FROM employees WHERE id=?", (emp_id,), commit=True)
                count += 1

    labels = {"activate": "activated", "deactivate": "deactivated", "archive": "archived", "delete": "deleted"}
    flash(f"{count} employee(s) {labels.get(action, 'updated')}.", "success")
    return redirect(url_for("employees", **request.args))


# ─── Housekeeping ────────────────────────────────────────────────────────────

@app.route("/housekeeping")
def housekeeping():
    sql, params, f = housekeeping_query(get_current_hotel_id())
    all_tasks = query(sql, params)
    page_rows, total, page, size = paginate_rows(all_tasks, f["page"], f["size"])
    hk_staff = query("SELECT id, name FROM employees WHERE department='Housekeeping' AND status='Active'")
    cleaning_rooms = query("SELECT id, room_no FROM rooms WHERE status IN ('Cleaning','Occupied') ORDER BY room_no")
    return render_template(
        "housekeeping.html", tasks=page_rows, hk_staff=hk_staff,
        cleaning_rooms=cleaning_rooms, list_total=total, list_showing=len(page_rows),
        list_page=page, list_size=size, sort_by=f["sort_by"], sort_dir=f["sort_dir"],
        filter_status=f["status"], priority=f["priority"], room_no=f["room_no"],
        assigned_to=f["assigned_to"], date_from=f["from"], date_to=f["to"], search_q=f["q"],
    )


@app.route("/housekeeping/add", methods=["POST"])
def add_housekeeping():
    query("""INSERT INTO housekeeping_tasks(room_id,assigned_to,status,priority,notes,created_at)
             VALUES(?,?,?,?,?,?)""",
          (request.form["room_id"], request.form.get("assigned_to") or None,
           "Pending", request.form.get("priority", "Medium"),
           request.form.get("notes", ""), datetime.now().strftime("%Y-%m-%d %H:%M")), commit=True)
    query("UPDATE rooms SET status='Cleaning' WHERE id=?", (request.form["room_id"],), commit=True)
    flash("Housekeeping task created.", "success")
    return redirect(url_for("housekeeping"))


@app.route("/housekeeping/update/<int:task_id>", methods=["POST"])
def update_housekeeping(task_id):
    status = request.form["status"]
    task = query("SELECT * FROM housekeeping_tasks WHERE id=?", (task_id,), one=True)
    completed_at = datetime.now().strftime("%Y-%m-%d %H:%M") if status == "Completed" else None
    query("""UPDATE housekeeping_tasks SET assigned_to=?, status=?, priority=?, notes=?, completed_at=?
             WHERE id=?""",
          (request.form.get("assigned_to") or None, status, request.form.get("priority"),
           request.form.get("notes", ""), completed_at, task_id), commit=True)
    if status == "Completed" and task:
        query("UPDATE rooms SET status='Available' WHERE id=?", (task["room_id"],), commit=True)
    flash("Task updated.", "success")
    return redirect(url_for("housekeeping"))


# ─── Room Service ────────────────────────────────────────────────────────────

@app.route("/room-service")
def room_service():
    sql, params, f = room_service_query(hotel_id=get_current_hotel_id())
    all_requests = query(sql, params)
    page_rows, total, page, size = paginate_rows(all_requests, f["page"], f["size"])
    active_bookings = query("""
        SELECT b.id, c.name, r.room_no, r.id room_id
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE b.status='Checked-in' ORDER BY r.room_no
    """)
    maint_sql, maint_params, _ = room_service_query(maintenance_only=True, hotel_id=get_current_hotel_id())
    maintenance = query(maint_sql, maint_params)
    return render_template(
        "room_service.html", requests=page_rows, maintenance=maintenance,
        active_bookings=active_bookings, list_total=total, list_showing=len(page_rows),
        list_page=page, list_size=size, sort_by=f["sort_by"], sort_dir=f["sort_dir"],
        filter_status=f["status"], request_type=f["request_type"], room_no=f["room_no"],
        date_from=f["from"], date_to=f["to"], search_q=f["q"],
    )


@app.route("/room-service/add", methods=["POST"])
def add_room_service():
    booking_id = request.form.get("booking_id")
    booking = query("SELECT room_id FROM bookings WHERE id=?", (booking_id,), one=True) if booking_id else None
    room_id = booking["room_id"] if booking else request.form.get("room_id")
    charges = float(request.form.get("charges") or 0)
    add_to_bill = 1 if request.form.get("add_to_bill") else 0
    query("""INSERT INTO room_service_requests(booking_id,room_id,request_type,description,status,charges,add_to_bill,created_at)
             VALUES(?,?,?,?,?,?,?,?)""",
          (booking_id, room_id, request.form["request_type"], request.form.get("description", ""),
           "Pending", charges, add_to_bill, datetime.now().strftime("%Y-%m-%d %H:%M")), commit=True)
    if booking_id and add_to_bill:
        update_booking_payment_status(int(booking_id))
    flash("Service request added.", "success")
    return redirect(url_for("room_service"))


@app.route("/room-service/update/<int:req_id>", methods=["POST"])
def update_room_service(req_id):
    status = request.form["status"]
    charges = float(request.form.get("charges") or 0)
    req = query("SELECT * FROM room_service_requests WHERE id=?", (req_id,), one=True)
    query("UPDATE room_service_requests SET status=?, charges=?, description=? WHERE id=?",
          (status, charges, request.form.get("description", ""), req_id), commit=True)
    if req and req["booking_id"]:
        update_booking_payment_status(req["booking_id"])
    flash("Request updated.", "success")
    return redirect(url_for("room_service"))


# ─── Inventory ───────────────────────────────────────────────────────────────

@app.route("/inventory")
def inventory():
    sql, params, f = inventory_query(get_current_hotel_id())
    all_items = query(sql, params)
    page_rows, total, page, size = paginate_rows(all_items, f["page"], f["size"])
    categories = query("SELECT DISTINCT category FROM inventory WHERE category IS NOT NULL ORDER BY category")
    return render_template(
        "inventory.html", items=page_rows, categories=categories,
        list_total=total, list_showing=len(page_rows), list_page=page, list_size=size,
        sort_by=f["sort_by"], sort_dir=f["sort_dir"],
        search_q=f["q"], low_only=(f["stock_status"] == "low"),
        stock_status=f["stock_status"], category=f["category"], supplier=f["supplier"],
        date_from=f["from"], date_to=f["to"],
    )


@app.route("/inventory/add", methods=["POST"])
def add_inventory():
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        query("""INSERT INTO inventory(item_name,category,quantity,unit,price,reorder_level,supplier_name,last_updated)
                 VALUES(?,?,?,?,?,?,?,?)""",
              (request.form["item_name"], request.form["category"], int(request.form["quantity"]),
               request.form["unit"], float(request.form.get("price") or 0),
               int(request.form.get("reorder_level") or 10), request.form.get("supplier_name", ""),
               today_str), commit=True)
        sync_notifications_from_data(get_current_hotel_id())
        flash("Inventory item added.", "success")
    except Exception as e:
        flash(f"Error: {e}", "danger")
    return redirect(url_for("inventory"))


@app.route("/inventory/update/<int:item_id>", methods=["POST"])
def update_inventory(item_id):
    today_str = datetime.now().strftime("%Y-%m-%d")
    query("""UPDATE inventory SET item_name=?, category=?, quantity=?, unit=?, price=?,
             reorder_level=?, supplier_name=?, last_updated=? WHERE id=?""",
          (request.form["item_name"], request.form["category"], int(request.form["quantity"]),
           request.form["unit"], float(request.form.get("price") or 0),
           int(request.form.get("reorder_level") or 10), request.form.get("supplier_name", ""),
           today_str, item_id), commit=True)
    sync_notifications_from_data(get_current_hotel_id())
    flash("Item updated.", "success")
    return redirect(url_for("inventory"))


@app.route("/inventory/delete/<int:item_id>", methods=["POST"])
def delete_inventory(item_id):
    query("DELETE FROM inventory WHERE id=?", (item_id,), commit=True)
    flash("Item deleted.", "success")
    return redirect(url_for("inventory"))


@app.route("/inventory/restock/<int:item_id>", methods=["POST"])
def restock_inventory(item_id):
    qty = int(request.form["quantity"])
    today_str = datetime.now().strftime("%Y-%m-%d")
    query("UPDATE inventory SET quantity=quantity+?, last_updated=? WHERE id=?",
          (qty, today_str, item_id), commit=True)
    sync_notifications_from_data(get_current_hotel_id())
    flash("Stock updated.", "success")
    return redirect(url_for("inventory"))


# ─── Admin / Users ───────────────────────────────────────────────────────────

def _user_list_query():
    status_filter = request.args.get("status", "all")
    role = request.args.get("role", "")
    search_q = request.args.get("q", "").strip()

    sql = "SELECT id, username, full_name, role, status, last_login, archived_at FROM users WHERE 1=1"
    params = []

    if status_filter == "archived":
        sql += " AND status='Archived'"
    elif status_filter == "active":
        sql += " AND status='Active'"
    elif status_filter == "inactive":
        sql += " AND status='Inactive'"
    elif status_filter == "all":
        sql += " AND status != 'Archived'"

    if role:
        sql += " AND role=?"
        params.append(role)
    if search_q:
        sql += " AND (username LIKE ? OR full_name LIKE ?)"
        params.extend([f"%{search_q}%", f"%{search_q}%"])

    sql += " ORDER BY id"
    return query(sql, params), {
        "search_q": search_q,
        "status_filter": status_filter,
        "role": role,
    }


@app.route("/admin")
@role_required(*admin_roles())
def admin():
    users, filters = _user_list_query()
    return render_template("admin.html", users=users, **filters)


@app.route("/users/add", methods=["POST"])
@role_required(*admin_roles())
def add_user():
    try:
        status = request.form.get("status", "Active")
        if status not in USER_STATUSES:
            status = "Active"
        query("INSERT INTO users(username,password,full_name,role,status) VALUES(?,?,?,?,?)",
              (request.form["username"], request.form["password"],
               request.form.get("full_name", request.form["username"]),
               request.form["role"], status), commit=True)
        flash("User added successfully.", "success")
    except Exception as e:
        flash(f"Error: {e}", "danger")
    return redirect(url_for("admin"))


@app.route("/users/update/<int:user_id>", methods=["POST"])
@role_required(*admin_roles())
def update_user(user_id):
    status = request.form.get("status", "Active")
    if status not in USER_STATUSES:
        status = "Active"
    archived_at = datetime.now().strftime("%Y-%m-%d %H:%M") if status == "Archived" else None
    params = [request.form.get("full_name"), request.form["role"], status, archived_at]
    sql = "UPDATE users SET full_name=?, role=?, status=?, archived_at=?"
    if request.form.get("password"):
        sql += ", password=?"
        params.append(request.form["password"])
    sql += " WHERE id=?"
    params.append(user_id)
    query(sql, tuple(params), commit=True)
    flash("User updated successfully.", "success")
    return redirect(url_for("admin", **request.args))


@app.route("/users/deactivate/<int:user_id>", methods=["POST"])
@role_required(*admin_roles())
def deactivate_user(user_id):
    if query("SELECT role FROM users WHERE id=?", (user_id,), one=True)["role"] == "Super Admin":
        flash("Cannot deactivate the Super Admin account.", "danger")
        return redirect(url_for("admin", **request.args))
    query("UPDATE users SET status='Inactive' WHERE id=?", (user_id,), commit=True)
    flash("User deactivated.", "success")
    return redirect(url_for("admin", **request.args))


@app.route("/users/activate/<int:user_id>", methods=["POST"])
@role_required(*admin_roles())
def activate_user(user_id):
    query("UPDATE users SET status='Active', archived_at=NULL WHERE id=?", (user_id,), commit=True)
    flash("User activated.", "success")
    return redirect(url_for("admin", **request.args))


@app.route("/users/archive/<int:user_id>", methods=["POST"])
@role_required(*admin_roles())
def archive_user(user_id):
    if query("SELECT role FROM users WHERE id=?", (user_id,), one=True)["role"] == "Super Admin":
        flash("Cannot archive the Super Admin account.", "danger")
        return redirect(url_for("admin", **request.args))
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    query("UPDATE users SET status='Archived', archived_at=? WHERE id=?", (now, user_id), commit=True)
    flash("User archived.", "success")
    return redirect(url_for("admin", **request.args))


@app.route("/users/delete/<int:user_id>", methods=["POST"])
@role_required("Super Admin")
def delete_user(user_id):
    user = query("SELECT role FROM users WHERE id=?", (user_id,), one=True)
    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("admin", **request.args))
    if user["role"] == "Super Admin":
        flash("Cannot delete the Super Admin account.", "danger")
        return redirect(url_for("admin", **request.args))
    if user_has_dependencies(user_id):
        flash("Cannot delete: user is linked to an employee record. Archive instead.", "danger")
        return redirect(url_for("admin", **request.args))
    query("DELETE FROM users WHERE id=?", (user_id,), commit=True)
    flash("User permanently deleted.", "success")
    return redirect(url_for("admin", **request.args))


@app.route("/users/bulk", methods=["POST"])
@role_required(*admin_roles())
def users_bulk():
    ids = request.form.getlist("ids")
    action = request.form.get("action", "")
    if not ids:
        flash("No users selected.", "danger")
        return redirect(url_for("admin", **request.args))

    if action == "delete" and not is_super_admin():
        flash("Only Super Admin can permanently delete users.", "danger")
        return redirect(url_for("admin", **request.args))

    count = 0
    for user_id in ids:
        user_id = int(user_id)
        user = query("SELECT role FROM users WHERE id=?", (user_id,), one=True)
        if not user or user["role"] == "Super Admin":
            continue
        if action == "activate":
            query("UPDATE users SET status='Active', archived_at=NULL WHERE id=?", (user_id,), commit=True)
            count += 1
        elif action == "deactivate":
            query("UPDATE users SET status='Inactive' WHERE id=?", (user_id,), commit=True)
            count += 1
        elif action == "archive":
            now = datetime.now().strftime("%Y-%m-%d %H:%M")
            query("UPDATE users SET status='Archived', archived_at=? WHERE id=?", (now, user_id), commit=True)
            count += 1
        elif action == "delete" and is_super_admin() and not user_has_dependencies(user_id):
            query("DELETE FROM users WHERE id=?", (user_id,), commit=True)
            count += 1

    labels = {"activate": "activated", "deactivate": "deactivated", "archive": "archived", "delete": "deleted"}
    flash(f"{count} user(s) {labels.get(action, 'updated')}.", "success")
    return redirect(url_for("admin", **request.args))


# ─── Invoice & Reports ───────────────────────────────────────────────────────

@app.route("/invoices")
def invoices_list():
    sql, params, f = invoices_query(get_current_hotel_id())
    all_invoices = query(sql, params)
    page_rows, total, page, size = paginate_rows(all_invoices, f["page"], f["size"])
    return render_template(
        "invoices.html", invoices=page_rows, list_total=total, list_showing=len(page_rows),
        list_page=page, list_size=size, sort_by=f["sort_by"], sort_dir=f["sort_dir"],
        search_q=f["q"], payment_status=f["payment_status"], booking_id=f["booking_id"],
        date_from=f["from"], date_to=f["to"], amount_min=f["amount_min"], amount_max=f["amount_max"],
    )


@app.route("/invoice/<int:booking_id>")
def invoice(booking_id):
    bill = query("""
        SELECT bills.*, c.name, c.phone, c.email, c.address, r.room_no, r.room_type, b.checkin, b.checkout
        FROM bills JOIN bookings b ON bills.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE bills.booking_id=?
    """, (booking_id,), one=True)
    if not bill:
        booking = query("""
            SELECT b.*, c.name, c.phone, c.email, c.address, r.room_no, r.room_type, r.price
            FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
            WHERE b.id=?
        """, (booking_id,), one=True)
        if booking:
            rc = booking_room_charges(booking)
            sc = booking_service_charges(booking_id)
            sub = rc + sc
            tax = sub * 0.12
            bill = {
                "id": 0, "room_charges": rc, "service_charges": sc, "tax": tax,
                "discount": 0, "total": sub + tax, "payment_status": booking["payment_status"],
                "bill_date": datetime.now().strftime("%Y-%m-%d"), "name": booking["name"],
                "phone": booking["phone"], "email": booking["email"], "address": booking["address"],
                "room_no": booking["room_no"], "room_type": booking["room_type"],
                "checkin": booking["checkin"], "checkout": booking["checkout"],
            }
        else:
            flash("Invoice not found.", "danger")
            return redirect(url_for("dashboard"))
    services = query("""
        SELECT i.item_name, su.quantity, su.amount FROM service_usage su
        JOIN inventory i ON su.item_id=i.id WHERE su.booking_id=?
    """, (booking_id,))
    rs_charges = query("""
        SELECT request_type, description, charges FROM room_service_requests
        WHERE booking_id=? AND add_to_bill=1 AND status != 'Cancelled'
    """, (booking_id,))
    payments = query("SELECT * FROM payments WHERE booking_id=? ORDER BY id", (booking_id,))
    return render_template("invoice.html", bill=bill, services=services, rs_charges=rs_charges, payments=payments)


@app.route("/reports")
@role_required(*admin_roles())
def reports_page():
    stats = dashboard_stats()
    date_from = request.args.get("from", "")
    date_to = request.args.get("to", "")
    payment_sql = """
        SELECT p.id, p.receipt_number, c.name customer_name, r.room_no, p.amount, p.payment_mode, p.payment_date
        FROM payments p JOIN bookings b ON p.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id WHERE 1=1
    """
    params = []
    if date_from:
        payment_sql += " AND date(p.payment_date) >= ?"
        params.append(date_from)
    if date_to:
        payment_sql += " AND date(p.payment_date) <= ?"
        params.append(date_to)
    payment_sql += " ORDER BY p.id DESC LIMIT 100"
    payment_rows = query(payment_sql, params)
    monthly_sql = """
        SELECT strftime('%Y-%m', payment_date) month, SUM(amount) total
        FROM payments WHERE 1=1
    """
    mparams = []
    if date_from:
        monthly_sql += " AND date(payment_date) >= ?"
        mparams.append(date_from)
    if date_to:
        monthly_sql += " AND date(payment_date) <= ?"
        mparams.append(date_to)
    monthly_sql += " GROUP BY month ORDER BY month DESC LIMIT 12"
    monthly_revenue = list(reversed(query(monthly_sql, mparams)))
    booking_status = query("SELECT status, COUNT(*) c FROM bookings GROUP BY status")
    room_types = query("SELECT room_type, COUNT(*) c FROM rooms GROUP BY room_type")
    return render_template(
        "reports.html", stats=stats, monthly_revenue=monthly_revenue,
        booking_status=booking_status, room_types=room_types,
        payment_rows=payment_rows, date_from=date_from, date_to=date_to,
        list_total=len(payment_rows), list_showing=len(payment_rows),
    )


@app.route("/settings")
@role_required(*admin_roles())
def settings_page():
    return render_template("settings.html")


@app.route("/reports/export")
def export_reports():
    date_from = request.args.get("from", "")
    date_to = request.args.get("to", "")
    sql = """
        SELECT p.id, p.receipt_number, c.name, r.room_no, p.amount, p.payment_mode, p.payment_date
        FROM payments p JOIN bookings b ON p.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id WHERE 1=1
    """
    params = []
    if date_from:
        sql += " AND date(p.payment_date) >= ?"
        params.append(date_from)
    if date_to:
        sql += " AND date(p.payment_date) <= ?"
        params.append(date_to)
    sql += " ORDER BY p.id DESC"
    rows = query(sql, params)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Receipt", "Customer", "Room", "Amount", "Mode", "Date"])
    for r in rows:
        writer.writerow([r["receipt_number"], r["name"], r["room_no"], r["amount"], r["payment_mode"], r["payment_date"]])
    mem = BytesIO()
    mem.write(output.getvalue().encode("utf-8"))
    mem.seek(0)
    return send_file(mem, mimetype="text/csv", as_attachment=True, download_name="hms_payments_report.csv")


# ─── Platform (Super Admin) ───────────────────────────────────────────────────

@app.route("/platform")
@app.route("/platform/dashboard")
@platform_admin_required
def platform_dashboard():
    recent_logs = query(
        """SELECT a.*, u.full_name, u.username, h.hotel_name
           FROM audit_logs a
           LEFT JOIN users u ON a.user_id=u.id
           LEFT JOIN hotels h ON a.hotel_id=h.id
           ORDER BY a.id DESC LIMIT 12"""
    )
    return render_template("platform/dashboard.html", recent_logs=recent_logs)


@app.route("/platform/hotels")
@platform_admin_required
def platform_hotels():
    hotels = query("SELECT * FROM hotels ORDER BY hotel_name")
    cards = []
    for h in hotels:
        stats = get_hotel_stats(query, h["id"])
        cards.append({**dict(h), **stats})
    return render_template(
        "platform/hotels.html",
        hotels=cards,
        subscription_plans=SUBSCRIPTION_PLANS,
    )


@app.route("/platform/hotels/add", methods=["POST"])
@platform_admin_required
def platform_add_hotel():
    name = (request.form.get("hotel_name") or "").strip()
    code = (request.form.get("hotel_code") or "").strip().upper()
    if not name or not code:
        flash("Hotel name and code are required.", "danger")
        return redirect(url_for("platform_hotels"))
    if query("SELECT id FROM hotels WHERE hotel_code=?", (code,), one=True):
        flash("Hotel code already exists.", "danger")
        return redirect(url_for("platform_hotels"))

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    owner_email = (request.form.get("owner_email") or "").strip()
    owner_name = (request.form.get("owner_name") or "").strip()
    hid = query(
        """INSERT INTO hotels(hotel_name,hotel_code,address,city,state,country,phone,email,
           gst_number,owner_name,owner_email,subscription_plan,subscription_status,created_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            name,
            code,
            request.form.get("address", ""),
            request.form.get("city", ""),
            request.form.get("state", ""),
            request.form.get("country", "India"),
            request.form.get("phone", ""),
            request.form.get("email", ""),
            request.form.get("gst_number", ""),
            owner_name,
            owner_email,
            request.form.get("subscription_plan", "Starter"),
            "Active",
            now,
        ),
        commit=True,
    )

    admin_username = (request.form.get("admin_username") or f"admin_{code.lower()}").strip()
    admin_password = request.form.get("admin_password") or "admin123"
    if not query("SELECT id FROM users WHERE username=?", (admin_username,), one=True):
        query(
            "INSERT INTO users(username,password,full_name,role,status,hotel_id) VALUES(?,?,?,?,?,?)",
            (admin_username, admin_password, owner_name or f"{name} Admin", "HOTEL_ADMIN", "Active", hid),
            commit=True,
        )

    log_audit(f"Super Admin created hotel {name} ({code})", "hotel", hid, details=f"Plan: {request.form.get('subscription_plan', 'Starter')}", hotel_id=hid)
    flash(f"Hotel {name} created. Hotel Admin login: {admin_username}", "success")
    return redirect(url_for("platform_hotels"))


@app.route("/platform/hotels/<int:hotel_id>/view")
@platform_admin_required
def platform_view_hotel(hotel_id):
    hotel = query("SELECT * FROM hotels WHERE id=?", (hotel_id,), one=True)
    if not hotel:
        flash("Hotel not found.", "danger")
        return redirect(url_for("platform_hotels"))
    set_session_hotel(hotel_id)
    flash(f"Viewing {hotel['hotel_name']} through Safe Stays Platform (read-only).", "success")
    return redirect(url_for("dashboard"))


@app.route("/platform/hotels/<int:hotel_id>/suspend", methods=["POST"])
@platform_admin_required
def platform_suspend_hotel(hotel_id):
    hotel = query("SELECT * FROM hotels WHERE id=?", (hotel_id,), one=True)
    if not hotel:
        flash("Hotel not found.", "danger")
        return redirect(url_for("platform_hotels"))
    query("UPDATE hotels SET subscription_status='Suspended' WHERE id=?", (hotel_id,), commit=True)
    log_audit(f"Super Admin suspended hotel {hotel['hotel_name']}", "hotel", hotel_id, hotel_id=hotel_id)
    flash(f"{hotel['hotel_name']} suspended.", "success")
    return redirect(url_for("platform_hotels"))


@app.route("/platform/hotels/<int:hotel_id>/activate", methods=["POST"])
@platform_admin_required
def platform_activate_hotel(hotel_id):
    hotel = query("SELECT * FROM hotels WHERE id=?", (hotel_id,), one=True)
    if not hotel:
        flash("Hotel not found.", "danger")
        return redirect(url_for("platform_hotels"))
    query("UPDATE hotels SET subscription_status='Active' WHERE id=?", (hotel_id,), commit=True)
    log_audit(f"Super Admin activated hotel {hotel['hotel_name']}", "hotel", hotel_id, hotel_id=hotel_id)
    flash(f"{hotel['hotel_name']} activated.", "success")
    return redirect(url_for("platform_hotels"))


@app.route("/platform/hotels/<int:hotel_id>/archive", methods=["POST"])
@platform_admin_required
def platform_archive_hotel(hotel_id):
    hotel = query("SELECT * FROM hotels WHERE id=?", (hotel_id,), one=True)
    if not hotel:
        flash("Hotel not found.", "danger")
        return redirect(url_for("platform_hotels"))
    if hotel["subscription_status"] == "Active":
        flash("Suspend the hotel before archiving.", "danger")
        return redirect(url_for("platform_hotels"))
    query("UPDATE hotels SET subscription_status='Archived' WHERE id=?", (hotel_id,), commit=True)
    log_audit(f"Super Admin archived hotel {hotel['hotel_name']}", "hotel", hotel_id, hotel_id=hotel_id)
    flash(f"{hotel['hotel_name']} archived.", "success")
    return redirect(url_for("platform_hotels"))


@app.route("/platform/audit-logs")
@platform_admin_required
def platform_audit_logs():
    logs = query(
        """SELECT a.*, u.full_name, u.username, h.hotel_name
           FROM audit_logs a
           LEFT JOIN users u ON a.user_id=u.id
           LEFT JOIN hotels h ON a.hotel_id=h.id
           ORDER BY a.id DESC LIMIT 200"""
    )
    return render_template("platform/audit_logs.html", logs=logs)


@app.route("/platform/subscriptions")
@platform_admin_required
def platform_subscriptions():
    hotels = query("SELECT * FROM hotels ORDER BY subscription_plan, hotel_name")
    return render_template("platform/subscriptions.html", hotels=hotels, plans=SUBSCRIPTION_PLANS)


@app.route("/platform/settings")
@platform_admin_required
def platform_settings():
    return render_template("platform/settings.html")


@app.route("/api/platform/hotels/overview")
@platform_admin_required
def api_platform_hotels_overview():
    overview = get_platform_overview(query)
    return api_ok(**overview)


@app.route("/api/hotels/switch", methods=["POST"])
def api_switch_hotel():
    if not is_logged_in():
        return api_error("Unauthorized", 401)
    data = request.get_json(silent=True) or {}
    hotel_id = int(data.get("hotelId") or data.get("hotel_id") or 0)
    hotel = query("SELECT * FROM hotels WHERE id=?", (hotel_id,), one=True)
    if not hotel:
        return api_error("Hotel not found", 404)
    if not is_super_admin_role():
        user_hotel = session.get("user_hotel_id")
        if user_hotel and int(user_hotel) != hotel_id:
            return api_error("Access denied to this hotel.", 403)
    set_session_hotel(hotel_id)
    return api_ok(hotel=hotel_to_dict(hotel), readOnly=is_hotel_read_only())


@app.route("/api/hotels")
@platform_admin_required
def api_hotels_list():
    hotels = query("SELECT * FROM hotels ORDER BY hotel_name")
    return api_ok(hotels=[hotel_to_dict(h) for h in hotels])


# ─── Notifications API ───────────────────────────────────────────────────────

@app.route("/api/notifications", methods=["GET"])
def api_notifications_list():
    hotel_id = get_current_hotel_id()
    seed_demo_notifications(hotel_id)
    sync_notifications_from_data(hotel_id)
    resolve_demo_conflicts(hotel_id)
    rows = query(
        "SELECT * FROM notifications WHERE hotel_id=? ORDER BY datetime(created_at) DESC, id DESC",
        (hotel_id,),
    )
    notifications = [notification_to_dict(r) for r in rows]
    unread = sum(1 for n in notifications if not n["isRead"])
    return api_ok(notifications=notifications, unreadCount=unread)


@app.route("/api/notifications", methods=["POST"])
def api_notifications_create():
    hotel_id = get_current_hotel_id()
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    message = (data.get("message") or "").strip()
    ntype = (data.get("type") or "BLUE").upper()
    category = (data.get("category") or "HOUSEKEEPING").upper()
    action_url = (data.get("actionUrl") or data.get("action_url") or "").strip()

    if not title or not message:
        return api_error("Title and message are required.")
    if ntype not in NOTIFICATION_TYPES:
        return api_error(f"Invalid type. Use one of: {', '.join(NOTIFICATION_TYPES)}")
    if category not in NOTIFICATION_CATEGORIES:
        return api_error(f"Invalid category. Use one of: {', '.join(NOTIFICATION_CATEGORIES)}")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    nid = query(
        """INSERT INTO notifications(hotel_id,title,message,type,category,is_read,created_at,action_url,source_key,is_demo)
           VALUES(?,?,?,?,?,0,?,?,NULL,0)""",
        (hotel_id, title, message, ntype, category, now, action_url or None),
        commit=True,
    )
    row = query("SELECT * FROM notifications WHERE id=? AND hotel_id=?", (nid, hotel_id), one=True)
    return api_ok(notification=notification_to_dict(row)), 201


@app.route("/api/notifications/read-all", methods=["PATCH"])
def api_notifications_read_all():
    hotel_id = get_current_hotel_id()
    query("UPDATE notifications SET is_read=1 WHERE hotel_id=? AND is_read=0", (hotel_id,), commit=True)
    return api_ok()


@app.route("/api/notifications/<int:notification_id>/read", methods=["PATCH"])
def api_notifications_mark_read(notification_id):
    hotel_id = get_current_hotel_id()
    row = query(
        "SELECT id FROM notifications WHERE id=? AND hotel_id=?",
        (notification_id, hotel_id),
        one=True,
    )
    if not row:
        return api_error("Notification not found.", 404)
    query("UPDATE notifications SET is_read=1 WHERE id=? AND hotel_id=?", (notification_id, hotel_id), commit=True)
    return api_ok()


@app.route("/api/notifications/clear-all", methods=["DELETE"])
def api_notifications_clear_all():
    hotel_id = get_current_hotel_id()
    query("DELETE FROM notifications WHERE hotel_id=?", (hotel_id,), commit=True)
    return api_ok()


@app.route("/api/notifications/<int:notification_id>", methods=["DELETE"])
def api_notifications_delete(notification_id):
    hotel_id = get_current_hotel_id()
    row = query(
        "SELECT id FROM notifications WHERE id=? AND hotel_id=?",
        (notification_id, hotel_id),
        one=True,
    )
    if not row:
        return api_error("Notification not found.", 404)
    query("DELETE FROM notifications WHERE id=? AND hotel_id=?", (notification_id, hotel_id), commit=True)
    return api_ok()


# Legacy redirects
@app.route("/manage")
def manage_redirect():
    return redirect(url_for("rooms"))


@app.route("/operations")
def operations_redirect():
    return redirect(url_for("room_service"))


@app.errorhandler(404)
def not_found(e):
    return render_template("error.html", title="Not Found", message="Page not found."), 404


@app.errorhandler(500)
def server_error(e):
    app.logger.exception("Internal server error")
    return render_template("error.html", title="Server Error", message="Something went wrong. Please try again."), 500


if __name__ == "__main__":
    if sys.platform == "win32":
        os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    ensure_db()
    port = int(os.environ.get("PORT", 5000))
    is_windows = sys.platform == "win32"
    debug = (not is_windows) and os.environ.get("FLASK_DEBUG", "0") == "1"
    print(f"\n  Safe Stays PMS running at http://127.0.0.1:{port}")
    print("  Login: admin / admin123")
    print("  Tip: On Windows use START.bat instead\n")
    app.run(
        host="127.0.0.1",
        port=port,
        debug=debug,
        use_reloader=False,
        threaded=True,
    )
else:
    ensure_db()
