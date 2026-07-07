"""Multi-tenant SaaS: roles, hotel context, permissions, audit logging."""
from datetime import date, datetime
from functools import wraps

from flask import session, request, redirect, url_for, flash, jsonify

ROLES = [
    "SUPER_ADMIN",
    "HOTEL_ADMIN",
    "MANAGER",
    "RECEPTIONIST",
    "HOUSEKEEPING",
    "MAINTENANCE",
    "ACCOUNTANT",
]

ROLE_ALIASES = {
    "Super Admin": "SUPER_ADMIN",
    "Admin": "HOTEL_ADMIN",
    "Manager": "MANAGER",
    "Receptionist": "RECEPTIONIST",
    "Housekeeping": "HOUSEKEEPING",
    "Staff": "RECEPTIONIST",
    "Maintenance": "MAINTENANCE",
    "Accountant": "ACCOUNTANT",
}

ROLE_LABELS = {
    "SUPER_ADMIN": "Super Admin",
    "HOTEL_ADMIN": "Hotel Admin",
    "MANAGER": "Manager",
    "RECEPTIONIST": "Receptionist",
    "HOUSEKEEPING": "Housekeeping",
    "MAINTENANCE": "Maintenance",
    "ACCOUNTANT": "Accountant",
}

SUBSCRIPTION_PLANS = ["Starter", "Professional", "Enterprise"]
SUBSCRIPTION_STATUSES = ["Active", "Suspended", "Archived", "Trial"]

DEFAULT_HOTEL_ID = 1

PLATFORM_WRITE_PREFIXES = ("/platform", "/api/hotels", "/logout")

HOTEL_SCOPED_TABLES = (
    "users",
    "rooms",
    "customers",
    "guests",
    "bookings",
    "payments",
    "inventory",
    "employees",
    "housekeeping_tasks",
    "room_service_requests",
    "bills",
    "service_usage",
)


def normalize_role(role):
    if not role:
        return ""
    r = str(role).strip()
    return ROLE_ALIASES.get(r, r.upper().replace(" ", "_"))


def role_label(role):
    key = normalize_role(role)
    return ROLE_LABELS.get(key, key.replace("_", " ").title())


def is_super_admin_role(role=None):
    return normalize_role(role or session.get("role")) == "SUPER_ADMIN"


def is_hotel_admin_role(role=None):
    return normalize_role(role or session.get("role")) == "HOTEL_ADMIN"


def hotel_admin_roles():
    return ["HOTEL_ADMIN", "Admin"]


def admin_roles():
    return ["SUPER_ADMIN", "HOTEL_ADMIN", "Super Admin", "Admin", "Manager"]


def finance_roles():
    return ["HOTEL_ADMIN", "MANAGER", "ACCOUNTANT", "Admin", "Manager"]


def front_desk_roles():
    return ["HOTEL_ADMIN", "MANAGER", "RECEPTIONIST", "Admin", "Manager", "Receptionist", "Staff"]


def operations_roles():
    return ["HOTEL_ADMIN", "MANAGER", "HOUSEKEEPING", "MAINTENANCE", "Admin", "Manager", "Housekeeping", "Staff"]


def can_write_hotel_ops(role=None):
    role = normalize_role(role or session.get("role"))
    return role != "SUPER_ADMIN"


def is_hotel_read_only(role=None):
    return is_super_admin_role(role)


def hotel_clause(alias="", hotel_id=None):
    if hotel_id is None:
        return "", []
    prefix = f"{alias}." if alias else ""
    return f" AND {prefix}hotel_id=?", [hotel_id]


def audit_log(query_fn, action, entity_type=None, entity_id=None, details=None, hotel_id=None, user_id=None):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query_fn(
        """INSERT INTO audit_logs(hotel_id,user_id,action,entity_type,entity_id,details,created_at)
           VALUES(?,?,?,?,?,?,?)""",
        (
            hotel_id,
            user_id,
            action,
            entity_type,
            entity_id,
            details,
            now,
        ),
        commit=True,
    )


def hotel_to_dict(row):
    if not row:
        return None
    d = dict(row)
    return {
        "id": d["id"],
        "hotelId": d["id"],
        "hotelName": d.get("hotel_name") or d.get("name"),
        "hotelCode": d.get("hotel_code"),
        "logo": d.get("logo"),
        "address": d.get("address"),
        "city": d.get("city"),
        "state": d.get("state"),
        "country": d.get("country"),
        "phone": d.get("phone"),
        "email": d.get("email"),
        "gstNumber": d.get("gst_number"),
        "ownerName": d.get("owner_name"),
        "ownerEmail": d.get("owner_email"),
        "subscriptionPlan": d.get("subscription_plan"),
        "subscriptionStatus": d.get("subscription_status"),
        "createdAt": d.get("created_at"),
    }


def get_hotel_stats(query_fn, hotel_id):
    overview = get_hotel_overview_stats(query_fn, hotel_id)
    return {
        "rooms": overview["totalRooms"],
        "employees": overview["totalStaff"],
        "revenue": overview["totalRevenue"],
        "occupancy": overview["occupancyRate"],
    }


def get_hotel_overview_stats(query_fn, hotel_id, hotel_row=None):
    """Per-hotel metrics scoped strictly by hotel_id."""
    if hotel_row is None:
        hotel_row = query_fn("SELECT * FROM hotels WHERE id=?", (hotel_id,), one=True)
    if not hotel_row:
        return None

    hotel = dict(hotel_row)
    today = date.today().isoformat()
    hid = int(hotel_id)

    total_rooms = query_fn("SELECT COUNT(*) c FROM rooms WHERE hotel_id=?", (hid,), one=True)["c"]
    occupied_rooms = query_fn(
        "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Occupied'",
        (hid,),
        one=True,
    )["c"]
    available_rooms = query_fn(
        "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Available'",
        (hid,),
        one=True,
    )["c"]
    total_staff = query_fn(
        "SELECT COUNT(*) c FROM employees WHERE hotel_id=? AND status='Active'",
        (hid,),
        one=True,
    )["c"]

    total_revenue = float(
        query_fn(
            """SELECT COALESCE(SUM(p.amount),0) t FROM payments p
               JOIN bookings b ON p.booking_id=b.id WHERE b.hotel_id=?""",
            (hid,),
            one=True,
        )["t"]
        or 0
    )

    pending_payments = float(
        query_fn(
            """SELECT COALESCE(SUM(b.total_amount - COALESCE(paid.paid, 0)), 0) t
               FROM bookings b
               LEFT JOIN (
                 SELECT booking_id, SUM(amount) paid FROM payments GROUP BY booking_id
               ) paid ON paid.booking_id=b.id
               WHERE b.hotel_id=? AND b.payment_status IN ('Pending','Partial')""",
            (hid,),
            one=True,
        )["t"]
        or 0
    )

    today_checkins = query_fn(
        "SELECT COUNT(*) c FROM bookings WHERE hotel_id=? AND checkin=?",
        (hid, today),
        one=True,
    )["c"]
    today_checkouts = query_fn(
        "SELECT COUNT(*) c FROM bookings WHERE hotel_id=? AND checkout=?",
        (hid, today),
        one=True,
    )["c"]

    occupancy_rate = round((occupied_rooms / total_rooms * 100) if total_rooms else 0, 1)

    return {
        "hotelId": hid,
        "hotelName": hotel["hotel_name"],
        "hotelCode": hotel["hotel_code"],
        "city": hotel.get("city") or "",
        "state": hotel.get("state") or "",
        "ownerName": hotel.get("owner_name") or "",
        "subscriptionPlan": hotel.get("subscription_plan") or "",
        "status": hotel.get("subscription_status") or "Active",
        "totalRooms": total_rooms,
        "totalStaff": total_staff,
        "occupiedRooms": occupied_rooms,
        "availableRooms": available_rooms,
        "occupancyRate": occupancy_rate,
        "totalRevenue": total_revenue,
        "pendingPayments": pending_payments,
        "todayCheckIns": today_checkins,
        "todayCheckOuts": today_checkouts,
    }


def get_platform_overview(query_fn):
    """Platform-level totals and per-hotel overview cards."""
    hotels = query_fn("SELECT * FROM hotels ORDER BY hotel_name")
    hotel_overviews = []
    for hotel in hotels:
        overview = get_hotel_overview_stats(query_fn, hotel["id"], hotel_row=hotel)
        if overview:
            hotel_overviews.append(overview)

    return {
        "totals": {
            "totalHotels": len(hotels),
            "activeHotels": sum(1 for h in hotels if h["subscription_status"] == "Active"),
            "totalRooms": sum(h["totalRooms"] for h in hotel_overviews),
            "platformRevenue": sum(h["totalRevenue"] for h in hotel_overviews),
        },
        "hotels": hotel_overviews,
    }


def is_hotel_write_request():
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return False
    path = request.path or ""
    for prefix in PLATFORM_WRITE_PREFIXES:
        if path.startswith(prefix):
            return False
    if path.startswith("/api/notifications"):
        return False
    if path.startswith("/api/"):
        return request.method in ("POST", "PUT", "PATCH", "DELETE")
    return request.method == "POST"


def enforce_permissions(query_fn, get_hotel_id_fn, api_error_fn):
    """Flask before_request handler factory."""
    if not session.get("user_id"):
        return None

    role = normalize_role(session.get("role"))

    if role == "SUPER_ADMIN" and is_hotel_write_request():
        if request.path.startswith("/api/"):
            return api_error_fn("Super Admin cannot modify hotel operations.", 403)
        flash("Super Admin is in read-only mode for hotel operations.", "danger")
        return redirect(request.referrer or url_for("platform_hotels"))

    if role != "SUPER_ADMIN":
        user_hotel = session.get("user_hotel_id")
        if user_hotel:
            current = get_hotel_id_fn()
            if current != int(user_hotel):
                session["hotel_id"] = int(user_hotel)

        hotel = query_fn("SELECT subscription_status FROM hotels WHERE id=?", (get_hotel_id_fn(),), one=True)
        if hotel and hotel["subscription_status"] in ("Suspended", "Archived"):
            if not request.path.startswith("/logout") and request.endpoint != "login":
                flash("This hotel account is suspended. Contact platform support.", "danger")
                if role != "SUPER_ADMIN":
                    return redirect(url_for("logout"))

    return None


def role_required(*roles):
    normalized = {normalize_role(r) for r in roles}
    normalized.update(roles)

    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            user_role = normalize_role(session.get("role"))
            if user_role not in normalized and not (
                user_role == "SUPER_ADMIN" and "SUPER_ADMIN" in normalized
            ):
                flash("Access denied.", "danger")
                return redirect(url_for("dashboard"))
            return f(*args, **kwargs)

        return wrapped

    return decorator


def platform_admin_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not is_super_admin_role():
            flash("Platform access requires Super Admin role.", "danger")
            return redirect(url_for("dashboard"))
        return f(*args, **kwargs)

    return wrapped
