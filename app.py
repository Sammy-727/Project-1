from flask import Flask, render_template, request, redirect, url_for, session, flash, send_file, jsonify
import sqlite3
import os
import sys
import csv
from io import StringIO, BytesIO
from datetime import datetime, date, timedelta
from functools import wraps
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
application = app  # WSGI entry for gunicorn / Replit / Render
app.secret_key = os.environ.get("SECRET_KEY", "hms-v2-secret-key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("FORCE_HTTPS", "0") == "1"
APP_NAME = "GrandStay HMS"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "instance", "hotel_v2.db")
_db_ready = False

ROLES = ["Super Admin", "Admin", "Manager", "Receptionist", "Housekeeping", "Staff"]
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

    # Normalize legacy booking statuses
    query("UPDATE bookings SET status='Reserved' WHERE status='Active'", commit=True)
    query("UPDATE bookings SET status='Checked-out' WHERE status='Checked Out'", commit=True)

    # Sync room_type from category
    query("UPDATE rooms SET room_type=category WHERE room_type IS NULL OR room_type=''", commit=True)


def seed_db():
    """Only create the platform Super Admin on first run — no demo hotel data."""
    if query("SELECT COUNT(*) c FROM users", one=True)["c"] == 0:
        query(
            "INSERT INTO users(username,password,full_name,role,status) VALUES(?,?,?,?,?)",
            ("superadmin", "admin123", "Super Admin", "Super Admin", "Active"),
            commit=True,
        )


def is_logged_in():
    return "user_id" in session


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if session.get("role") not in roles and session.get("role") != "Super Admin":
                flash("Access denied.", "danger")
                return redirect(url_for("dashboard"))
            return f(*args, **kwargs)
        return wrapped
    return decorator


def admin_roles():
    return ["Super Admin", "Admin", "Manager"]


def is_super_admin():
    return session.get("role") == "Super Admin"


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
    return dict(
        app_name=APP_NAME,
        current_user=session,
        active_page=request.endpoint if request else "",
        roles=ROLES,
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
    )


@app.before_request
def require_login():
    if request.endpoint in ["login", "static", None]:
        return
    if not is_logged_in():
        return redirect(url_for("login"))


@app.route("/", methods=["GET", "POST"])
def login():
    if is_logged_in():
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
    results = {"rooms": [], "customers": [], "bookings": [], "payments": []}
    if q:
        like = f"%{q}%"
        results["rooms"] = query(
            "SELECT * FROM rooms WHERE room_no LIKE ? OR room_type LIKE ? OR category LIKE ? ORDER BY room_no LIMIT 10",
            (like, like, like)
        )
        results["customers"] = query(
            "SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY id DESC LIMIT 10",
            (like, like, like)
        )
        results["bookings"] = query("""
            SELECT b.id, c.name, r.room_no, b.checkin, b.checkout, b.status
            FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
            WHERE c.name LIKE ? OR r.room_no LIKE ? OR CAST(b.id AS TEXT) LIKE ?
            ORDER BY b.id DESC LIMIT 10
        """, (like, like, like))
        results["payments"] = query("""
            SELECT p.*, c.name, r.room_no FROM payments p
            JOIN bookings b ON p.booking_id=b.id
            JOIN customers c ON b.customer_id=c.id
            JOIN rooms r ON b.room_id=r.id
            WHERE p.receipt_number LIKE ? OR c.name LIKE ? OR r.room_no LIKE ?
            ORDER BY p.id DESC LIMIT 10
        """, (like, like, like))
    return render_template("search.html", q=q, results=results)


def dashboard_stats():
    revenue = query("SELECT COALESCE(SUM(amount),0) t FROM payments", one=True)["t"]
    return {
        "total_rooms": query("SELECT COUNT(*) c FROM rooms", one=True)["c"],
        "available": query("SELECT COUNT(*) c FROM rooms WHERE status='Available'", one=True)["c"],
        "occupied": query("SELECT COUNT(*) c FROM rooms WHERE status='Occupied'", one=True)["c"],
        "active_bookings": query("SELECT COUNT(*) c FROM bookings WHERE status IN ('Reserved','Checked-in')", one=True)["c"],
        "employees": query("SELECT COUNT(*) c FROM employees WHERE status='Active'", one=True)["c"],
        "revenue": revenue,
        "maintenance": query("SELECT COUNT(*) c FROM rooms WHERE status='Maintenance'", one=True)["c"],
        "cleaning": query("SELECT COUNT(*) c FROM rooms WHERE status='Cleaning'", one=True)["c"],
    }


@app.route("/dashboard")
def dashboard():
    stats = dashboard_stats()
    low_stock = query("SELECT * FROM inventory WHERE quantity <= reorder_level ORDER BY quantity ASC LIMIT 6")
    recent_bookings = query("""
        SELECT b.id, c.name, r.room_no, r.room_type, b.checkin, b.checkout, b.status, b.payment_status
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        ORDER BY b.id DESC LIMIT 8
    """)
    recent_payments = query("""
        SELECT p.id, p.amount, p.payment_mode, p.receipt_number, p.payment_date, c.name, r.room_no
        FROM payments p JOIN bookings b ON p.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        ORDER BY p.id DESC LIMIT 8
    """)
    room_summary = query("SELECT status, COUNT(*) c FROM rooms GROUP BY status")
    monthly_revenue = query("""
        SELECT strftime('%Y-%m', payment_date) month, SUM(amount) total
        FROM payments GROUP BY month ORDER BY month DESC LIMIT 6
    """)
    monthly_revenue = list(reversed(monthly_revenue))
    return render_template("dashboard.html", stats=stats, low_stock=low_stock,
                           recent_bookings=recent_bookings, recent_payments=recent_payments,
                           room_summary=room_summary, monthly_revenue=monthly_revenue)


# ─── Rooms ───────────────────────────────────────────────────────────────────

@app.route("/rooms")
def rooms():
    status = request.args.get("status", "")
    room_type = request.args.get("type", "")
    search_q = request.args.get("q", "").strip()
    sql = "SELECT * FROM rooms WHERE 1=1"
    params = []
    if status:
        sql += " AND status=?"
        params.append(status)
    if room_type:
        sql += " AND room_type=?"
        params.append(room_type)
    if search_q:
        sql += " AND (room_no LIKE ? OR room_type LIKE ?)"
        params.extend([f"%{search_q}%", f"%{search_q}%"])
    sql += " ORDER BY CAST(room_no AS INTEGER), room_no"
    room_list = query(sql, params)
    types = query("SELECT DISTINCT room_type FROM rooms ORDER BY room_type")
    return render_template("rooms.html", rooms=room_list, types=types,
                           filter_status=status, filter_type=room_type, search_q=search_q)


@app.route("/rooms/add", methods=["POST"])
def add_room():
    try:
        query("""INSERT INTO rooms(room_no,room_type,category,floor,price,capacity,status,amenities,image_url)
                 VALUES(?,?,?,?,?,?,?,?,?)""",
              (request.form["room_no"], request.form["room_type"], request.form["room_type"],
               int(request.form.get("floor") or 1), float(request.form["price"]),
               int(request.form.get("capacity") or 2), request.form["status"],
               request.form.get("amenities", ""), request.form.get("image_url", "")), commit=True)
        flash("Room added successfully.", "success")
    except Exception as e:
        flash(f"Error: {e}", "danger")
    return redirect(url_for("rooms"))


@app.route("/rooms/update/<int:room_id>", methods=["POST"])
def update_room(room_id):
    query("""UPDATE rooms SET room_no=?, room_type=?, category=?, floor=?, price=?, capacity=?,
             status=?, amenities=?, image_url=? WHERE id=?""",
          (request.form["room_no"], request.form["room_type"], request.form["room_type"],
           int(request.form.get("floor") or 1), float(request.form["price"]),
           int(request.form.get("capacity") or 2), request.form["status"],
           request.form.get("amenities", ""), request.form.get("image_url", ""), room_id), commit=True)
    flash("Room updated.", "success")
    return redirect(url_for("rooms"))


@app.route("/rooms/delete/<int:room_id>", methods=["POST"])
def delete_room(room_id):
    active = query("SELECT COUNT(*) c FROM bookings WHERE room_id=? AND status IN ('Reserved','Checked-in')",
                   (room_id,), one=True)["c"]
    if active:
        flash("Cannot delete room with active bookings.", "danger")
    else:
        query("DELETE FROM rooms WHERE id=?", (room_id,), commit=True)
        flash("Room deleted.", "success")
    return redirect(url_for("rooms"))


# ─── Customers ───────────────────────────────────────────────────────────────

@app.route("/customers")
def customers():
    search_q = request.args.get("q", "").strip()
    sql = "SELECT * FROM customers WHERE 1=1"
    params = []
    if search_q:
        sql += " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)"
        params.extend([f"%{search_q}%"] * 3)
    sql += " ORDER BY id DESC"
    customer_list = []
    for c in query(sql, params):
        cd = dict(c)
        cd["guests"] = query("SELECT * FROM guests WHERE customer_id=? AND booking_id IS NULL", (c["id"],))
        cd["booking_count"] = query("SELECT COUNT(*) c FROM bookings WHERE customer_id=?", (c["id"],), one=True)["c"]
        customer_list.append(cd)
    return render_template("customers.html", customers=customer_list, search_q=search_q)


@app.route("/customers/add", methods=["POST"])
def add_customer():
    cid = query("""INSERT INTO customers(name,phone,email,address,id_proof_type,id_proof_number,gender,age,id_proof)
                   VALUES(?,?,?,?,?,?,?,?,?)""",
                (request.form["name"], request.form["phone"], request.form.get("email"),
                 request.form.get("address"), request.form.get("id_proof_type"),
                 request.form.get("id_proof_number"), request.form.get("gender"),
                 int(request.form["age"]) if request.form.get("age") else None,
                 f"{request.form.get('id_proof_type','')}-{request.form.get('id_proof_number','')}"), commit=True)
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


# ─── Bookings ────────────────────────────────────────────────────────────────

@app.route("/bookings")
def bookings():
    status = request.args.get("status", "")
    search_q = request.args.get("q", "").strip()
    date_from = request.args.get("from", "")
    date_to = request.args.get("to", "")
    sql = """
        SELECT b.*, c.name customer_name, c.phone, r.room_no, r.room_type, r.price
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id WHERE 1=1
    """
    params = []
    if status:
        sql += " AND b.status=?"
        params.append(status)
    if search_q:
        sql += " AND (c.name LIKE ? OR r.room_no LIKE ? OR CAST(b.id AS TEXT) LIKE ?)"
        params.extend([f"%{search_q}%"] * 3)
    if date_from:
        sql += " AND b.checkin >= ?"
        params.append(date_from)
    if date_to:
        sql += " AND b.checkout <= ?"
        params.append(date_to)
    sql += " ORDER BY b.id DESC"
    booking_list = query(sql, params)
    all_customers = query("SELECT id, name, phone FROM customers ORDER BY name")
    all_rooms = query("SELECT * FROM rooms ORDER BY room_no")
    new_customer = request.args.get("new_customer", type=int)
    return render_template("bookings.html", bookings=booking_list, customers=all_customers,
                           rooms=all_rooms, filter_status=status, search_q=search_q,
                           date_from=date_from, date_to=date_to, new_customer=new_customer)


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

    flash("Checkout completed.", "success")
    return redirect(url_for("invoice", booking_id=booking_id))


# ─── Payments ────────────────────────────────────────────────────────────────

@app.route("/payments")
def payments():
    search_q = request.args.get("q", "").strip()
    sql = """
        SELECT p.*, c.name customer_name, r.room_no, b.checkin, b.checkout, b.total_amount
        FROM payments p JOIN bookings b ON p.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id WHERE 1=1
    """
    params = []
    if search_q:
        sql += " AND (p.receipt_number LIKE ? OR c.name LIKE ? OR r.room_no LIKE ?)"
        params.extend([f"%{search_q}%"] * 3)
    sql += " ORDER BY p.id DESC"
    payment_list = query(sql, params)
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
    return render_template("payments.html", payments=payment_list, pending_bookings=pending,
                           total_revenue=total_revenue, search_q=search_q)


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
    search_q = request.args.get("q", "").strip()
    status_filter = request.args.get("status", "all")
    department = request.args.get("department", "")
    role = request.args.get("role", "")

    sql = "SELECT * FROM employees WHERE 1=1"
    params = []

    if status_filter == "archived":
        sql += " AND status='Archived'"
    elif status_filter == "active":
        sql += " AND status='Active'"
    elif status_filter == "inactive":
        sql += " AND status='Inactive'"
    elif status_filter == "all":
        sql += " AND status != 'Archived'"

    if department:
        sql += " AND department=?"
        params.append(department)
    if role:
        sql += " AND role=?"
        params.append(role)
    if search_q:
        sql += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR department LIKE ?)"
        params.extend([f"%{search_q}%"] * 4)

    sql += " ORDER BY id DESC"
    return query(sql, params), {
        "search_q": search_q,
        "status_filter": status_filter,
        "department": department,
        "role": role,
    }


@app.route("/employees")
@role_required(*admin_roles())
def employees():
    employee_list, filters = _employee_list_query()
    return render_template("employees.html", employees=employee_list, **filters)


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
    status = request.args.get("status", "")
    sql = """
        SELECT h.*, r.room_no, r.room_type, e.name staff_name
        FROM housekeeping_tasks h JOIN rooms r ON h.room_id=r.id
        LEFT JOIN employees e ON h.assigned_to=e.id WHERE 1=1
    """
    params = []
    if status:
        sql += " AND h.status=?"
        params.append(status)
    sql += " ORDER BY CASE h.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, h.id DESC"
    tasks = query(sql, params)
    hk_staff = query("SELECT id, name FROM employees WHERE department='Housekeeping' AND status='Active'")
    cleaning_rooms = query("SELECT id, room_no FROM rooms WHERE status IN ('Cleaning','Occupied') ORDER BY room_no")
    return render_template("housekeeping.html", tasks=tasks, hk_staff=hk_staff,
                           cleaning_rooms=cleaning_rooms, filter_status=status)


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
    status = request.args.get("status", "")
    sql = """
        SELECT rs.*, r.room_no, c.name customer_name, b.id booking_ref
        FROM room_service_requests rs JOIN rooms r ON rs.room_id=r.id
        LEFT JOIN bookings b ON rs.booking_id=b.id
        LEFT JOIN customers c ON b.customer_id=c.id WHERE 1=1
    """
    params = []
    if status:
        sql += " AND rs.status=?"
        params.append(status)
    sql += " ORDER BY rs.id DESC"
    requests_list = query(sql, params)
    active_bookings = query("""
        SELECT b.id, c.name, r.room_no, r.id room_id
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE b.status='Checked-in' ORDER BY r.room_no
    """)
    return render_template("room_service.html", requests=requests_list,
                           active_bookings=active_bookings, filter_status=status)


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
    search_q = request.args.get("q", "").strip()
    low_only = request.args.get("low", "")
    sql = "SELECT * FROM inventory WHERE 1=1"
    params = []
    if search_q:
        sql += " AND (item_name LIKE ? OR category LIKE ? OR supplier_name LIKE ?)"
        params.extend([f"%{search_q}%"] * 3)
    if low_only:
        sql += " AND quantity <= reorder_level"
    sql += " ORDER BY item_name"
    items = query(sql, params)
    return render_template("inventory.html", items=items, search_q=search_q, low_only=low_only)


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


@app.route("/reports/export")
def export_reports():
    rows = query("""
        SELECT p.id, p.receipt_number, c.name, r.room_no, p.amount, p.payment_mode, p.payment_date
        FROM payments p JOIN bookings b ON p.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        ORDER BY p.id DESC
    """)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Receipt", "Customer", "Room", "Amount", "Mode", "Date"])
    for r in rows:
        writer.writerow([r["receipt_number"], r["name"], r["room_no"], r["amount"], r["payment_mode"], r["payment_date"]])
    mem = BytesIO()
    mem.write(output.getvalue().encode("utf-8"))
    mem.seek(0)
    return send_file(mem, mimetype="text/csv", as_attachment=True, download_name="hms_payments_report.csv")


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
    print(f"\n  GrandStay HMS running at http://127.0.0.1:{port}")
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
