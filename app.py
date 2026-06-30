
from flask import Flask, render_template, request, redirect, url_for, session, flash, send_file
import sqlite3
import os
import csv
from io import StringIO, BytesIO
from datetime import datetime

app = Flask(__name__)
app.secret_key = "hms-v2-secret-key"
APP_NAME = "HMS"
DB_PATH = os.path.join("instance", "hotel_v2.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
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


def init_db():
    os.makedirs("instance", exist_ok=True)
    conn = get_db()
    c = conn.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        status TEXT DEFAULT 'Active'
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS rooms(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_no TEXT UNIQUE,
        category TEXT,
        price REAL,
        status TEXT DEFAULT 'Available'
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS customers(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        email TEXT,
        id_proof TEXT,
        address TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS bookings(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        room_id INTEGER,
        checkin TEXT,
        checkout TEXT,
        status TEXT DEFAULT 'Active'
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS inventory(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT UNIQUE,
        category TEXT,
        quantity INTEGER,
        unit TEXT,
        price REAL,
        reorder_level INTEGER
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
        designation TEXT,
        salary REAL,
        shift TEXT,
        status TEXT DEFAULT 'Active'
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

    if c.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        c.executemany("INSERT INTO users(username,password,role,status) VALUES(?,?,?,?)", [
            ("admin", "admin123", "Admin", "Active"),
            ("manager", "manager123", "Manager", "Active"),
            ("reception", "rec123", "Receptionist", "Active")
        ])

    if c.execute("SELECT COUNT(*) FROM rooms").fetchone()[0] == 0:
        rooms = []
        for i in range(101, 111):
            rooms.append((str(i), "Standard", 1500, "Available"))
        for i in range(201, 211):
            rooms.append((str(i), "Deluxe", 3000, "Available"))
        for i in range(301, 309):
            rooms.append((str(i), "Super Deluxe", 5000, "Available"))
        for i in range(401, 407):
            rooms.append((str(i), "Luxury", 8000, "Available"))
        for i in range(501, 504):
            rooms.append((str(i), "Presidential Suite", 15000, "Available"))

        c.executemany("INSERT INTO rooms(room_no,category,price,status) VALUES(?,?,?,?)", rooms)

    if c.execute("SELECT COUNT(*) FROM customers").fetchone()[0] == 0:
        customers = [
            ("Ayush Sharma", "9876543210", "ayush.sharma@example.com", "AADHAR-1001", "Dehradun"),
            ("Priya Mehta", "9876543211", "priya.mehta@example.com", "AADHAR-1002", "Delhi"),
            ("Rohan Verma", "9876543212", "rohan.verma@example.com", "AADHAR-1003", "Jaipur"),
            ("Sneha Kapoor", "9876543213", "sneha.kapoor@example.com", "AADHAR-1004", "Mumbai"),
            ("Karan Singh", "9876543214", "karan.singh@example.com", "AADHAR-1005", "Lucknow"),
            ("Neha Joshi", "9876543215", "neha.joshi@example.com", "AADHAR-1006", "Pune"),
            ("Rahul Gupta", "9876543216", "rahul.gupta@example.com", "AADHAR-1007", "Noida"),
            ("Aditi Sharma", "9876543217", "aditi.sharma@example.com", "AADHAR-1008", "Chandigarh"),
            ("Vivek Kumar", "9876543218", "vivek.kumar@example.com", "AADHAR-1009", "Patna"),
            ("Anjali Jain", "9876543219", "anjali.jain@example.com", "AADHAR-1010", "Indore"),
            ("Mohit Agarwal", "9876543220", "mohit.agarwal@example.com", "AADHAR-1011", "Bhopal"),
            ("Pooja Singh", "9876543221", "pooja.singh@example.com", "AADHAR-1012", "Kanpur"),
            ("Arjun Malhotra", "9876543222", "arjun.malhotra@example.com", "AADHAR-1013", "Gurgaon"),
            ("Ishita Arora", "9876543223", "ishita.arora@example.com", "AADHAR-1014", "Faridabad"),
            ("Yash Raj", "9876543224", "yash.raj@example.com", "AADHAR-1015", "Ranchi"),
        ]
        c.executemany(
            "INSERT INTO customers(name,phone,email,id_proof,address) VALUES(?,?,?,?,?)",
            customers
        )

    if c.execute("SELECT COUNT(*) FROM bookings").fetchone()[0] == 0:
        bookings = [
            (1, 1, "2026-06-10", "2026-06-15", "Active"),
            (2, 2, "2026-06-11", "2026-06-16", "Active"),
            (3, 3, "2026-06-12", "2026-06-14", "Checked Out"),
            (4, 4, "2026-06-13", "2026-06-18", "Active"),
            (5, 5, "2026-06-14", "2026-06-17", "Active"),
            (6, 6, "2026-06-10", "2026-06-12", "Checked Out"),
            (7, 11, "2026-06-13", "2026-06-16", "Active"),
            (8, 12, "2026-06-14", "2026-06-18", "Active"),
            (9, 13, "2026-06-12", "2026-06-15", "Active"),
            (10, 14, "2026-06-11", "2026-06-17", "Active"),
            (11, 21, "2026-06-10", "2026-06-14", "Checked Out"),
            (12, 22, "2026-06-14", "2026-06-19", "Active"),
            (13, 23, "2026-06-12", "2026-06-16", "Active"),
            (14, 31, "2026-06-13", "2026-06-18", "Active"),
            (15, 32, "2026-06-14", "2026-06-20", "Active"),
        ]
        c.executemany(
            "INSERT INTO bookings(customer_id,room_id,checkin,checkout,status) VALUES(?,?,?,?,?)",
            bookings
        )

        occupied_rooms = [1, 2, 4, 5, 11, 12, 13, 14, 22, 23, 31, 32]
        for room_id in occupied_rooms:
            c.execute("UPDATE rooms SET status='Occupied' WHERE id=?", (room_id,))

        cleaning_rooms = [3, 6, 21]
        for room_id in cleaning_rooms:
            c.execute("UPDATE rooms SET status='Cleaning' WHERE id=?", (room_id,))


    if c.execute("SELECT COUNT(*) FROM inventory").fetchone()[0] == 0:
        items = [
            ("Water Bottle", "Room Service", 100, "pcs", 30, 20),
            ("Soap", "Housekeeping", 100, "pcs", 15, 20),
            ("Shampoo", "Housekeeping", 100, "pcs", 20, 20),
            ("Towel", "Housekeeping", 60, "pcs", 150, 10),
            ("Bedsheet", "Housekeeping", 50, "pcs", 350, 10),
            ("Tea Kit", "Room Service", 100, "pcs", 50, 20),
            ("Coffee Kit", "Room Service", 100, "pcs", 70, 20),
            ("Sandwich", "Restaurant", 50, "pcs", 120, 10),
            ("Dinner Thali", "Restaurant", 50, "plate", 350, 10),
            ("Laundry Service", "Service", 9999, "service", 250, 1),
        ]
        c.executemany(
            "INSERT INTO inventory(item_name,category,quantity,unit,price,reorder_level) VALUES(?,?,?,?,?,?)",
            items
        )

    if c.execute("SELECT COUNT(*) FROM employees").fetchone()[0] == 0:
        employees = [
            ("Rohit Sharma", "9876543210", "rohit@hotel.com", "Manager", 45000, "Morning", "Active"),
            ("Anita Verma", "9876500001", "anita@hotel.com", "Receptionist", 25000, "Morning", "Active"),
            ("Rahul Meena", "9876500002", "rahul@hotel.com", "Housekeeping", 18000, "Evening", "Active"),
            ("Pooja Singh", "9876500003", "pooja@hotel.com", "Chef", 30000, "Night", "Active"),
        ]
        c.executemany(
            "INSERT INTO employees(name,phone,email,designation,salary,shift,status) VALUES(?,?,?,?,?,?,?)",
            employees
        )

    conn.commit()
    conn.close()


def is_logged_in():
    return "user_id" in session


@app.context_processor
def inject_user():
    return dict(
        app_name=APP_NAME,
        current_user=session,
        today=datetime.now().strftime("%a, %d %b, %Y"),
    )


@app.before_request
def require_login():
    if request.endpoint in ["login", "static"]:
        return
    if not is_logged_in():
        return redirect(url_for("login"))


@app.route("/", methods=["GET", "POST"])
def login():
    if is_logged_in():
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        user = query(
            "SELECT * FROM users WHERE username=? AND password=? AND status='Active'",
            (request.form["username"], request.form["password"]),
            one=True
        )
        if user:
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            session["role"] = user["role"]
            return redirect(url_for("dashboard"))
        flash("Invalid username or password.", "danger")

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/dashboard")
def dashboard():
    stats = {
        "total_rooms": query("SELECT COUNT(*) c FROM rooms", one=True)["c"],
        "available": query("SELECT COUNT(*) c FROM rooms WHERE status='Available'", one=True)["c"],
        "occupied": query("SELECT COUNT(*) c FROM rooms WHERE status='Occupied'", one=True)["c"],
        "active_bookings": query("SELECT COUNT(*) c FROM bookings WHERE status='Active'", one=True)["c"],
        "employees": query("SELECT COUNT(*) c FROM employees WHERE status='Active'", one=True)["c"],
        "revenue": query("SELECT COALESCE(SUM(total),0) t FROM bills", one=True)["t"],
    }

    low_stock = query("SELECT * FROM inventory WHERE quantity <= reorder_level ORDER BY quantity ASC LIMIT 6")
    recent_bookings = query("""
        SELECT b.id, c.name, r.room_no, r.category, b.checkin, b.checkout, b.status
        FROM bookings b
        JOIN customers c ON b.customer_id=c.id
        JOIN rooms r ON b.room_id=r.id
        ORDER BY b.id DESC LIMIT 6
    """)

    monthly_revenue = [0] * 12
    year = str(datetime.now().year)
    for row in query("""
        SELECT CAST(strftime('%m', bill_date) AS INTEGER) AS month,
               COALESCE(SUM(total), 0) AS revenue
        FROM bills
        WHERE strftime('%Y', bill_date) = ?
        GROUP BY month
    """, (year,)):
        monthly_revenue[row["month"] - 1] = row["revenue"]

    return render_template(
        "dashboard.html",
        stats=stats,
        low_stock=low_stock,
        recent_bookings=recent_bookings,
        monthly_revenue=monthly_revenue,
    )


@app.route("/manage")
def manage():
    rooms = query("SELECT * FROM rooms ORDER BY room_no")
    customers = query("SELECT * FROM customers ORDER BY id DESC")
    bookings = query("""
        SELECT b.id, c.name, r.room_no, r.category, r.price, b.checkin, b.checkout, b.status
        FROM bookings b
        JOIN customers c ON b.customer_id=c.id
        JOIN rooms r ON b.room_id=r.id
        ORDER BY b.id DESC
    """)
    available_rooms = query("SELECT * FROM rooms WHERE status='Available' ORDER BY room_no")
    inventory = query("SELECT * FROM inventory ORDER BY item_name")

    return render_template(
        "manage.html",
        rooms=rooms,
        customers=customers,
        bookings=bookings,
        available_rooms=available_rooms,
        inventory=inventory
    )


@app.route("/rooms/add", methods=["POST"])
def add_room():
    try:
        query(
            "INSERT INTO rooms(room_no,category,price,status) VALUES(?,?,?,?)",
            (request.form["room_no"], request.form["category"], float(request.form["price"]), request.form["status"]),
            commit=True
        )
        flash("Room added successfully.", "success")
    except Exception as e:
        flash(str(e), "danger")
    return redirect(url_for("manage") + "#rooms")


@app.route("/rooms/update/<int:room_id>", methods=["POST"])
def update_room(room_id):
    query(
        "UPDATE rooms SET room_no=?, category=?, price=?, status=? WHERE id=?",
        (request.form["room_no"], request.form["category"], float(request.form["price"]), request.form["status"], room_id),
        commit=True
    )
    flash("Room updated.", "success")
    return redirect(url_for("manage") + "#rooms")


@app.route("/customers/add", methods=["POST"])
def add_customer():
    query(
        "INSERT INTO customers(name,phone,email,id_proof,address) VALUES(?,?,?,?,?)",
        (request.form["name"], request.form["phone"], request.form.get("email"), request.form.get("id_proof"), request.form.get("address")),
        commit=True
    )
    flash("Customer added.", "success")
    return redirect(url_for("manage") + "#customers")


@app.route("/customers/update/<int:customer_id>", methods=["POST"])
def update_customer(customer_id):
    query(
        "UPDATE customers SET name=?, phone=?, email=?, id_proof=?, address=? WHERE id=?",
        (request.form["name"], request.form["phone"], request.form.get("email"), request.form.get("id_proof"), request.form.get("address"), customer_id),
        commit=True
    )
    flash("Customer updated.", "success")
    return redirect(url_for("manage") + "#customers")


@app.route("/bookings/add", methods=["POST"])
def add_booking():
    customer_id = request.form.get("customer_id")
    room_id = request.form.get("room_id")
    checkin = request.form.get("checkin")
    checkout = request.form.get("checkout")

    if not customer_id or not room_id or not checkin or not checkout:
        flash("Please select customer, room and dates.", "danger")
        return redirect(url_for("manage") + "#bookings")

    if datetime.strptime(checkout, "%Y-%m-%d") < datetime.strptime(checkin, "%Y-%m-%d"):
        flash("Checkout cannot be before check-in.", "danger")
        return redirect(url_for("manage") + "#bookings")

    query(
        "INSERT INTO bookings(customer_id,room_id,checkin,checkout,status) VALUES(?,?,?,?,?)",
        (customer_id, room_id, checkin, checkout, "Active"),
        commit=True
    )
    query("UPDATE rooms SET status='Occupied' WHERE id=?", (room_id,), commit=True)
    flash("Booking created successfully.", "success")
    return redirect(url_for("manage") + "#bookings")


@app.route("/bookings/cancel/<int:booking_id>")
def cancel_booking(booking_id):
    booking = query("SELECT * FROM bookings WHERE id=?", (booking_id,), one=True)
    if booking and booking["status"] == "Active":
        query("UPDATE bookings SET status='Cancelled' WHERE id=?", (booking_id,), commit=True)
        query("UPDATE rooms SET status='Available' WHERE id=?", (booking["room_id"],), commit=True)
        flash("Booking cancelled.", "success")
    return redirect(url_for("manage") + "#bookings")


@app.route("/inventory/add", methods=["POST"])
def add_inventory():
    try:
        query(
            "INSERT INTO inventory(item_name,category,quantity,unit,price,reorder_level) VALUES(?,?,?,?,?,?)",
            (
                request.form["item_name"], request.form["category"], int(request.form["quantity"]),
                request.form["unit"], float(request.form["price"]), int(request.form["reorder_level"])
            ),
            commit=True
        )
        flash("Inventory item added.", "success")
    except Exception as e:
        flash(str(e), "danger")
    return redirect(url_for("manage") + "#inventory")


@app.route("/inventory/restock/<int:item_id>", methods=["POST"])
def restock_inventory(item_id):
    quantity = int(request.form["quantity"])
    query("UPDATE inventory SET quantity = quantity + ? WHERE id=?", (quantity, item_id), commit=True)
    flash("Stock updated.", "success")
    return redirect(url_for("manage") + "#inventory")


@app.route("/operations")
def operations():
    active_bookings = query("""
        SELECT b.id, c.name, r.room_no
        FROM bookings b
        JOIN customers c ON b.customer_id=c.id
        JOIN rooms r ON b.room_id=r.id
        WHERE b.status='Active'
        ORDER BY b.id DESC
    """)

    items = query("SELECT * FROM inventory ORDER BY item_name")

    usage = query("""
        SELECT su.id, su.booking_id, i.item_name, su.quantity, su.amount, su.usage_date
        FROM service_usage su
        JOIN inventory i ON su.item_id=i.id
        ORDER BY su.id DESC
    """)

    billing_bookings = query("""
        SELECT b.id, c.name, c.phone, r.room_no, r.category, r.price, b.checkin, b.checkout
        FROM bookings b
        JOIN customers c ON b.customer_id=c.id
        JOIN rooms r ON b.room_id=r.id
        WHERE b.status='Active'
        ORDER BY b.id DESC
    """)

    bills = query("""
        SELECT bills.*, c.name, r.room_no
        FROM bills
        JOIN bookings b ON bills.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id
        JOIN rooms r ON b.room_id=r.id
        ORDER BY bills.id DESC
    """)

    revenue = query("SELECT COALESCE(SUM(total),0) total FROM bills", one=True)["total"]

    return render_template(
        "operations.html",
        bookings=active_bookings,
        items=items,
        usage=usage,
        billing_bookings=billing_bookings,
        bills=bills,
        revenue=revenue
    )


@app.route("/service/add", methods=["POST"])
def add_service():
    booking_id = request.form.get("booking_id")
    item_id = request.form.get("item_id")
    quantity = request.form.get("quantity")

    if not booking_id or not item_id or not quantity or int(quantity) <= 0:
        flash("Please select booking, item and valid quantity.", "danger")
        return redirect(url_for("operations") + "#service")

    item = query("SELECT * FROM inventory WHERE id=?", (item_id,), one=True)
    quantity = int(quantity)

    if quantity > item["quantity"]:
        flash("Not enough stock available.", "danger")
        return redirect(url_for("operations") + "#service")

    amount = quantity * item["price"]

    query(
        "INSERT INTO service_usage(booking_id,item_id,quantity,amount,usage_date) VALUES(?,?,?,?,?)",
        (booking_id, item_id, quantity, amount, datetime.now().strftime("%Y-%m-%d %H:%M")),
        commit=True
    )
    query("UPDATE inventory SET quantity = quantity - ? WHERE id=?", (quantity, item_id), commit=True)
    flash(f"Service added. Amount ₹{amount:.2f}", "success")
    return redirect(url_for("operations") + "#service")


@app.route("/checkout/<int:booking_id>", methods=["POST"])
def checkout(booking_id):
    discount = float(request.form.get("discount") or 0)

    booking = query("""
        SELECT b.*, r.price, r.id room_id
        FROM bookings b
        JOIN rooms r ON b.room_id=r.id
        WHERE b.id=?
    """, (booking_id,), one=True)

    if not booking:
        flash("Booking not found.", "danger")
        return redirect(url_for("operations") + "#billing")

    d1 = datetime.strptime(booking["checkin"], "%Y-%m-%d")
    d2 = datetime.strptime(booking["checkout"], "%Y-%m-%d")
    days = max((d2 - d1).days, 1)

    room_charges = days * booking["price"]
    service_charges = query(
        "SELECT COALESCE(SUM(amount),0) s FROM service_usage WHERE booking_id=?",
        (booking_id,),
        one=True
    )["s"]

    subtotal = max(room_charges + service_charges - discount, 0)
    tax = subtotal * 0.12
    total = subtotal + tax

    try:
        query(
            "INSERT INTO bills(booking_id,room_charges,service_charges,tax,discount,total,payment_status,bill_date) VALUES(?,?,?,?,?,?,?,?)",
            (booking_id, room_charges, service_charges, tax, discount, total, "Paid", datetime.now().strftime("%Y-%m-%d %H:%M")),
            commit=True
        )
    except Exception:
        flash("Bill already exists for this booking.", "danger")
        return redirect(url_for("operations") + "#billing")

    query("UPDATE bookings SET status='Checked Out' WHERE id=?", (booking_id,), commit=True)
    query("UPDATE rooms SET status='Cleaning' WHERE id=?", (booking["room_id"],), commit=True)

    flash("Checkout completed.", "success")
    return redirect(url_for("invoice", booking_id=booking_id))


@app.route("/invoice/<int:booking_id>")
def invoice(booking_id):
    bill = query("""
        SELECT bills.*, c.name, c.phone, c.email, c.address, r.room_no, r.category, b.checkin, b.checkout
        FROM bills
        JOIN bookings b ON bills.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id
        JOIN rooms r ON b.room_id=r.id
        WHERE bills.booking_id=?
    """, (booking_id,), one=True)

    services = query("""
        SELECT i.item_name, su.quantity, su.amount
        FROM service_usage su
        JOIN inventory i ON su.item_id=i.id
        WHERE su.booking_id=?
    """, (booking_id,))

    return render_template("invoice.html", bill=bill, services=services)


@app.route("/reports/export")
def export_reports():
    rows = query("""
        SELECT bills.id, c.name, r.room_no, bills.room_charges, bills.service_charges,
               bills.tax, bills.discount, bills.total, bills.bill_date
        FROM bills
        JOIN bookings b ON bills.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id
        JOIN rooms r ON b.room_id=r.id
        ORDER BY bills.id DESC
    """)

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Bill ID", "Customer", "Room", "Room Charges", "Service Charges", "Tax", "Discount", "Total", "Date"])

    for r in rows:
        writer.writerow([r["id"], r["name"], r["room_no"], r["room_charges"], r["service_charges"], r["tax"], r["discount"], r["total"], r["bill_date"]])

    mem = BytesIO()
    mem.write(output.getvalue().encode("utf-8"))
    mem.seek(0)

    return send_file(mem, mimetype="text/csv", as_attachment=True, download_name="hms_report.csv")


@app.route("/admin")
def admin():
    if session.get("role") not in ["Admin", "Manager"]:
        flash("Access denied.", "danger")
        return redirect(url_for("dashboard"))

    employees = query("SELECT * FROM employees ORDER BY id DESC")
    users = query("SELECT id, username, role, status FROM users ORDER BY id")

    return render_template("admin.html", employees=employees, users=users)


@app.route("/employees/add", methods=["POST"])
def add_employee():
    if session.get("role") not in ["Admin", "Manager"]:
        flash("Access denied.", "danger")
        return redirect(url_for("dashboard"))

    query(
        "INSERT INTO employees(name,phone,email,designation,salary,shift,status) VALUES(?,?,?,?,?,?,?)",
        (
            request.form["name"], request.form.get("phone"), request.form.get("email"),
            request.form.get("designation"), float(request.form.get("salary") or 0),
            request.form.get("shift"), request.form.get("status")
        ),
        commit=True
    )
    flash("Employee added.", "success")
    return redirect(url_for("admin") + "#employees")


@app.route("/users/add", methods=["POST"])
def add_user():
    if session.get("role") not in ["Admin", "Manager"]:
        flash("Access denied.", "danger")
        return redirect(url_for("dashboard"))

    try:
        query(
            "INSERT INTO users(username,password,role,status) VALUES(?,?,?,?)",
            (request.form["username"], request.form["password"], request.form["role"], request.form["status"]),
            commit=True
        )
        flash("User added.", "success")
    except Exception as e:
        flash(str(e), "danger")

    return redirect(url_for("admin") + "#users")


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
