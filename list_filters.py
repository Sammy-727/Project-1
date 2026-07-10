"""Shared list filtering, sorting, and pagination helpers for HMS."""
from datetime import date
from flask import request


def arg(name, default=""):
    return (request.args.get(name) or default).strip()


def arg_int(name, default=None):
    raw = arg(name)
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def arg_float(name, default=None):
    raw = arg(name)
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def like(value):
    return f"%{value}%"


def build_order(sort_by, sort_dir, allowed, default_key):
    column = allowed.get(sort_by) or allowed.get(default_key) or next(iter(allowed.values()))
    direction = "DESC" if sort_dir.lower() == "desc" else "ASC"
    return f" ORDER BY {column} {direction}"


def paginate_rows(rows, page=None, size=None):
    page = max(1, page or 1)
    size = min(max(1, size or 50), 200)
    total = len(rows)
    start = (page - 1) * size
    return rows[start:start + size], total, page, size


def filters_dict(**kwargs):
    return {k: v for k, v in kwargs.items() if v not in (None, "", "all")}


def hotel_filter(alias, hotel_id):
    if hotel_id is None:
        return "", []
    prefix = f"{alias}." if alias else ""
    return f" AND {prefix}hotel_id=?", [hotel_id]


def bookings_query(hotel_id=None):
    f = {
        "q": arg("q"),
        "status": arg("status"),
        "payment_status": arg("paymentStatus") or arg("payment_status"),
        "phone": arg("phone"),
        "room_no": arg("roomNo") or arg("room_no"),
        "room_type": arg("roomType") or arg("room_type"),
        "booking_source": arg("bookingSource") or arg("booking_source"),
        "history": arg("history") or "default",
        "from": arg("from"),
        "to": arg("to"),
        "checkin_from": arg("checkinFrom") or arg("checkin_from"),
        "checkin_to": arg("checkinTo") or arg("checkin_to"),
        "checkout_from": arg("checkoutFrom") or arg("checkout_from"),
        "checkout_to": arg("checkoutTo") or arg("checkout_to"),
        "amount_min": arg_float("amountMin") or arg_float("amount_min"),
        "amount_max": arg_float("amountMax") or arg_float("amount_max"),
        "sort_by": arg("sortBy", "id") or "id",
        "sort_dir": arg("sortDir", "desc") or "desc",
        "page": arg_int("page", 1),
        "size": arg_int("size", 50),
    }
    sql = """
        SELECT b.*, c.name customer_name, c.phone, r.room_no, r.room_type, r.price
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE 1=1
    """
    params = []
    clause, hp = hotel_filter("b", hotel_id)
    sql += clause
    params.extend(hp)
    if f["q"]:
        sql += " AND (c.name LIKE ? OR c.phone LIKE ? OR r.room_no LIKE ? OR CAST(b.id AS TEXT) LIKE ?)"
        params.extend([like(f["q"])] * 4)
    if f["phone"]:
        sql += " AND c.phone LIKE ?"
        params.append(like(f["phone"]))
    if f["room_no"]:
        sql += " AND r.room_no LIKE ?"
        params.append(like(f["room_no"]))
    if f["status"]:
        sql += " AND b.status=?"
        params.append(f["status"])
    if f["payment_status"]:
        sql += " AND b.payment_status=?"
        params.append(f["payment_status"])
    if f["booking_source"]:
        sql += " AND b.booking_source=?"
        params.append(f["booking_source"])
    if f["room_type"]:
        sql += " AND r.room_type=?"
        params.append(f["room_type"])
    history = f["history"]
    today = date.today().isoformat()
    if history == "active":
        sql += " AND b.status IN ('Reserved', 'Checked-in')"
    elif history == "upcoming":
        sql += " AND b.status = 'Reserved' AND b.checkin > ?"
        params.append(today)
    elif history == "last_7":
        sql += " AND (b.status IN ('Reserved', 'Checked-in') OR b.checkout >= date(?, '-7 days'))"
        params.append(today)
    elif history == "last_30" or history == "default":
        sql += " AND (b.status IN ('Reserved', 'Checked-in') OR b.checkout >= date(?, '-30 days'))"
        params.append(today)
    elif history == "last_90":
        sql += " AND (b.status IN ('Reserved', 'Checked-in') OR b.checkout >= date(?, '-90 days'))"
        params.append(today)
    elif history == "all":
        pass
    if f["from"]:
        sql += " AND b.checkin >= ?"
        params.append(f["from"])
    if f["to"]:
        sql += " AND b.checkout <= ?"
        params.append(f["to"])
    if f["checkin_from"]:
        sql += " AND b.checkin >= ?"
        params.append(f["checkin_from"])
    if f["checkin_to"]:
        sql += " AND b.checkin <= ?"
        params.append(f["checkin_to"])
    if f["checkout_from"]:
        sql += " AND b.checkout >= ?"
        params.append(f["checkout_from"])
    if f["checkout_to"]:
        sql += " AND b.checkout <= ?"
        params.append(f["checkout_to"])
    if f["amount_min"] is not None:
        sql += " AND b.total_amount >= ?"
        params.append(f["amount_min"])
    if f["amount_max"] is not None:
        sql += " AND b.total_amount <= ?"
        params.append(f["amount_max"])
    allowed = {
        "id": "b.id", "guest": "c.name", "room": "r.room_no",
        "checkin": "b.checkin", "checkout": "b.checkout",
        "amount": "b.total_amount", "status": "b.status",
        "payment": "b.payment_status", "date": "b.checkin",
    }
    sql += build_order(f["sort_by"], f["sort_dir"], allowed, "id")
    return sql, params, f


def customers_query(hotel_id=None):
    f = {
        "q": arg("q"),
        "email": arg("email"),
        "guest_type": arg("guestType") or arg("guest_type"),
        "city": arg("city"),
        "id_proof_type": arg("idProofType") or arg("id_proof_type"),
        "from": arg("from"),
        "to": arg("to"),
        "sort_by": arg("sortBy", "id") or "id",
        "sort_dir": arg("sortDir", "desc") or "desc",
        "page": arg_int("page", 1),
        "size": arg_int("size", 50),
    }
    sql = "SELECT * FROM customers WHERE 1=1"
    params = []
    clause, hp = hotel_filter("", hotel_id)
    sql += clause
    params.extend(hp)
    if f["q"]:
        sql += " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)"
        params.extend([like(f["q"])] * 3)
    if f["email"]:
        sql += " AND email LIKE ?"
        params.append(like(f["email"]))
    if f["city"]:
        sql += " AND address LIKE ?"
        params.append(like(f["city"]))
    if f["id_proof_type"]:
        sql += " AND id_proof_type=?"
        params.append(f["id_proof_type"])
    allowed = {"id": "id", "name": "name", "phone": "phone", "email": "email", "date": "id"}
    sql += build_order(f["sort_by"], f["sort_dir"], allowed, "id")
    return sql, params, f


def rooms_query(hotel_id=None):
    f = {
        "q": arg("q"),
        "status": arg("status"),
        "type": arg("type"),
        "floor": arg_int("floor"),
        "capacity": arg_int("capacity"),
        "price_min": arg_float("priceMin") or arg_float("price_min"),
        "price_max": arg_float("priceMax") or arg_float("price_max"),
        "sort_by": arg("sortBy", "room_no") or "room_no",
        "sort_dir": arg("sortDir", "asc") or "asc",
        "page": arg_int("page", 1),
        "size": arg_int("size", 50),
    }
    sql = "SELECT * FROM rooms WHERE 1=1"
    params = []
    clause, hp = hotel_filter("", hotel_id)
    sql += clause
    params.extend(hp)
    if f["q"]:
        sql += " AND (room_no LIKE ? OR room_type LIKE ? OR category LIKE ?)"
        params.extend([like(f["q"])] * 3)
    if f["status"]:
        sql += " AND status=?"
        params.append(f["status"])
    if f["type"]:
        sql += " AND (room_type=? OR category=?)"
        params.extend([f["type"], f["type"]])
    if f["floor"] is not None:
        sql += " AND floor=?"
        params.append(f["floor"])
    if f["capacity"] is not None:
        sql += " AND capacity=?"
        params.append(f["capacity"])
    if f["price_min"] is not None:
        sql += " AND price >= ?"
        params.append(f["price_min"])
    if f["price_max"] is not None:
        sql += " AND price <= ?"
        params.append(f["price_max"])
    allowed = {
        "room_no": "CAST(room_no AS INTEGER)", "type": "room_type", "floor": "floor",
        "price": "price", "capacity": "capacity", "status": "status",
    }
    sql += build_order(f["sort_by"], f["sort_dir"], allowed, "room_no")
    return sql, params, f


def employees_query(hotel_id=None):
    f = {
        "q": arg("q"),
        "status": arg("status", "all") or "all",
        "department": arg("department"),
        "role": arg("role"),
        "shift": arg("shift"),
        "from": arg("from"),
        "to": arg("to"),
        "sort_by": arg("sortBy", "name") or "name",
        "sort_dir": arg("sortDir", "asc") or "asc",
        "page": arg_int("page", 1),
        "size": arg_int("size", 50),
    }
    sql = "SELECT * FROM employees WHERE 1=1"
    params = []
    clause, hp = hotel_filter("", hotel_id)
    sql += clause
    params.extend(hp)
    if f["status"] == "archived":
        sql += " AND status='Archived'"
    elif f["status"] == "active":
        sql += " AND status='Active'"
    elif f["status"] == "inactive":
        sql += " AND status='Inactive'"
    elif f["status"] == "all":
        sql += " AND status != 'Archived'"
    if f["department"]:
        sql += " AND department=?"
        params.append(f["department"])
    if f["role"]:
        sql += " AND role=?"
        params.append(f["role"])
    if f["shift"]:
        sql += " AND shift LIKE ?"
        params.append(like(f["shift"]))
    if f["from"]:
        sql += " AND joining_date >= ?"
        params.append(f["from"])
    if f["to"]:
        sql += " AND joining_date <= ?"
        params.append(f["to"])
    if f["q"]:
        sql += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR department LIKE ?)"
        params.extend([like(f["q"])] * 4)
    allowed = {"name": "name", "role": "role", "department": "department", "status": "status", "date": "joining_date"}
    sql += build_order(f["sort_by"], f["sort_dir"], allowed, "name")
    return sql, params, f


def inventory_query(hotel_id=None):
    f = {
        "q": arg("q"),
        "category": arg("category"),
        "stock_status": arg("stockStatus") or arg("stock_status"),
        "supplier": arg("supplier"),
        "from": arg("from"),
        "to": arg("to"),
        "sort_by": arg("sortBy", "name") or "name",
        "sort_dir": arg("sortDir", "asc") or "asc",
        "page": arg_int("page", 1),
        "size": arg_int("size", 50),
    }
    sql = "SELECT * FROM inventory WHERE 1=1"
    params = []
    clause, hp = hotel_filter("", hotel_id)
    sql += clause
    params.extend(hp)
    if f["q"]:
        sql += " AND (item_name LIKE ? OR category LIKE ? OR supplier_name LIKE ?)"
        params.extend([like(f["q"])] * 3)
    if f["category"]:
        sql += " AND category=?"
        params.append(f["category"])
    if f["supplier"]:
        sql += " AND supplier_name LIKE ?"
        params.append(like(f["supplier"]))
    if f["stock_status"] == "low":
        sql += " AND quantity <= reorder_level"
    elif f["stock_status"] == "in_stock":
        sql += " AND quantity > reorder_level"
    elif f["stock_status"] == "out":
        sql += " AND quantity = 0"
    if f["from"]:
        sql += " AND date(last_updated) >= ?"
        params.append(f["from"])
    if f["to"]:
        sql += " AND date(last_updated) <= ?"
        params.append(f["to"])
    allowed = {"name": "item_name", "category": "category", "stock": "quantity", "date": "last_updated"}
    sql += build_order(f["sort_by"], f["sort_dir"], allowed, "name")
    return sql, params, f


def payments_query(hotel_id=None):
    f = {
        "q": arg("q"),
        "payment_status": arg("paymentStatus") or arg("payment_status"),
        "payment_mode": arg("paymentMode") or arg("payment_mode"),
        "booking_id": arg_int("bookingId") or arg_int("booking_id"),
        "from": arg("from"),
        "to": arg("to"),
        "amount_min": arg_float("amountMin") or arg_float("amount_min"),
        "amount_max": arg_float("amountMax") or arg_float("amount_max"),
        "sort_by": arg("sortBy", "id") or "id",
        "sort_dir": arg("sortDir", "desc") or "desc",
        "page": arg_int("page", 1),
        "size": arg_int("size", 50),
    }
    sql = """
        SELECT p.*, c.name customer_name, r.room_no, b.checkin, b.checkout, b.total_amount, b.payment_status booking_payment_status
        FROM payments p JOIN bookings b ON p.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id WHERE 1=1
    """
    params = []
    clause, hp = hotel_filter("b", hotel_id)
    sql += clause
    params.extend(hp)
    if f["q"]:
        sql += " AND (p.receipt_number LIKE ? OR c.name LIKE ? OR r.room_no LIKE ? OR CAST(b.id AS TEXT) LIKE ?)"
        params.extend([like(f["q"])] * 4)
    if f["booking_id"]:
        sql += " AND b.id=?"
        params.append(f["booking_id"])
    if f["payment_mode"]:
        sql += " AND p.payment_mode=?"
        params.append(f["payment_mode"])
    if f["payment_status"]:
        sql += " AND b.payment_status=?"
        params.append(f["payment_status"])
    if f["from"]:
        sql += " AND date(p.payment_date) >= ?"
        params.append(f["from"])
    if f["to"]:
        sql += " AND date(p.payment_date) <= ?"
        params.append(f["to"])
    if f["amount_min"] is not None:
        sql += " AND p.amount >= ?"
        params.append(f["amount_min"])
    if f["amount_max"] is not None:
        sql += " AND p.amount <= ?"
        params.append(f["amount_max"])
    allowed = {"id": "p.id", "guest": "c.name", "amount": "p.amount", "date": "p.payment_date", "mode": "p.payment_mode"}
    sql += build_order(f["sort_by"], f["sort_dir"], allowed, "id")
    return sql, params, f


def invoices_query(hotel_id=None):
    f = {
        "q": arg("q"),
        "payment_status": arg("paymentStatus") or arg("payment_status"),
        "booking_id": arg_int("bookingId") or arg_int("booking_id"),
        "from": arg("from"),
        "to": arg("to"),
        "amount_min": arg_float("amountMin") or arg_float("amount_min"),
        "amount_max": arg_float("amountMax") or arg_float("amount_max"),
        "sort_by": arg("sortBy", "bill_date") or "bill_date",
        "sort_dir": arg("sortDir", "desc") or "desc",
        "page": arg_int("page", 1),
        "size": arg_int("size", 50),
    }
    sql = """
        SELECT bills.id invoice_id, bills.booking_id, bills.total, bills.payment_status,
               bills.bill_date, c.name customer_name, r.room_no, b.checkin, b.checkout
        FROM bills JOIN bookings b ON bills.booking_id=b.id
        JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id WHERE 1=1
    """
    params = []
    clause, hp = hotel_filter("b", hotel_id)
    sql += clause
    params.extend(hp)
    if f["q"]:
        sql += " AND (CAST(bills.id AS TEXT) LIKE ? OR c.name LIKE ? OR CAST(bills.booking_id AS TEXT) LIKE ?)"
        params.extend([like(f["q"])] * 3)
    if f["booking_id"]:
        sql += " AND bills.booking_id=?"
        params.append(f["booking_id"])
    if f["payment_status"]:
        sql += " AND bills.payment_status=?"
        params.append(f["payment_status"])
    if f["from"]:
        sql += " AND bills.bill_date >= ?"
        params.append(f["from"])
    if f["to"]:
        sql += " AND bills.bill_date <= ?"
        params.append(f["to"])
    if f["amount_min"] is not None:
        sql += " AND bills.total >= ?"
        params.append(f["amount_min"])
    if f["amount_max"] is not None:
        sql += " AND bills.total <= ?"
        params.append(f["amount_max"])
    allowed = {"id": "bills.id", "guest": "c.name", "amount": "bills.total", "date": "bills.bill_date", "status": "bills.payment_status"}
    sql += build_order(f["sort_by"], f["sort_dir"], allowed, "date")
    return sql, params, f


def housekeeping_query(hotel_id=None):
    f = {
        "q": arg("q"),
        "status": arg("status"),
        "priority": arg("priority"),
        "assigned_to": arg_int("assignedTo") or arg_int("assigned_to"),
        "room_no": arg("roomNo") or arg("room_no"),
        "from": arg("from"),
        "to": arg("to"),
        "sort_by": arg("sortBy", "id") or "id",
        "sort_dir": arg("sortDir", "desc") or "desc",
        "page": arg_int("page", 1),
        "size": arg_int("size", 50),
    }
    sql = """
        SELECT h.*, r.room_no, r.room_type, e.name staff_name
        FROM housekeeping_tasks h JOIN rooms r ON h.room_id=r.id
        LEFT JOIN employees e ON h.assigned_to=e.id WHERE 1=1
    """
    params = []
    clause, hp = hotel_filter("h", hotel_id)
    sql += clause
    params.extend(hp)
    if f["status"]:
        sql += " AND h.status=?"
        params.append(f["status"])
    if f["priority"]:
        sql += " AND h.priority=?"
        params.append(f["priority"])
    if f["assigned_to"]:
        sql += " AND h.assigned_to=?"
        params.append(f["assigned_to"])
    if f["room_no"]:
        sql += " AND r.room_no LIKE ?"
        params.append(like(f["room_no"]))
    if f["from"]:
        sql += " AND date(h.created_at) >= ?"
        params.append(f["from"])
    if f["to"]:
        sql += " AND date(h.created_at) <= ?"
        params.append(f["to"])
    if f["q"]:
        sql += " AND (r.room_no LIKE ? OR e.name LIKE ? OR h.notes LIKE ?)"
        params.extend([like(f["q"])] * 3)
    allowed = {"id": "h.id", "room": "r.room_no", "priority": "h.priority", "status": "h.status", "date": "h.created_at"}
    sql += build_order(f["sort_by"], f["sort_dir"], allowed, "id")
    return sql, params, f


def room_service_query(maintenance_only=False, hotel_id=None):
    f = {
        "q": arg("q"),
        "status": arg("status"),
        "request_type": arg("requestType") or arg("request_type"),
        "room_no": arg("roomNo") or arg("room_no"),
        "from": arg("from"),
        "to": arg("to"),
        "sort_by": arg("sortBy", "id") or "id",
        "sort_dir": arg("sortDir", "desc") or "desc",
        "page": arg_int("page", 1),
        "size": arg_int("size", 50),
    }
    sql = """
        SELECT rs.*, r.room_no, c.name customer_name, b.id booking_ref
        FROM room_service_requests rs JOIN rooms r ON rs.room_id=r.id
        LEFT JOIN bookings b ON rs.booking_id=b.id
        LEFT JOIN customers c ON b.customer_id=c.id WHERE 1=1
    """
    params = []
    clause, hp = hotel_filter("rs", hotel_id)
    sql += clause
    params.extend(hp)
    if maintenance_only:
        sql += " AND rs.request_type='Maintenance'"
    if f["status"]:
        sql += " AND rs.status=?"
        params.append(f["status"])
    if f["request_type"]:
        sql += " AND rs.request_type=?"
        params.append(f["request_type"])
    if f["room_no"]:
        sql += " AND r.room_no LIKE ?"
        params.append(like(f["room_no"]))
    if f["from"]:
        sql += " AND date(rs.created_at) >= ?"
        params.append(f["from"])
    if f["to"]:
        sql += " AND date(rs.created_at) <= ?"
        params.append(f["to"])
    if f["q"]:
        sql += " AND (r.room_no LIKE ? OR rs.description LIKE ? OR c.name LIKE ?)"
        params.extend([like(f["q"])] * 3)
    allowed = {"id": "rs.id", "room": "r.room_no", "type": "rs.request_type", "status": "rs.status", "date": "rs.created_at"}
    sql += build_order(f["sort_by"], f["sort_dir"], allowed, "id")
    return sql, params, f
