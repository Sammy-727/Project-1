"""Multi-tenant SaaS: roles, hotel context, permissions, audit logging."""
from datetime import datetime
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
    rooms = query_fn("SELECT COUNT(*) c FROM rooms WHERE hotel_id=?", (hotel_id,), one=True)["c"]
    occupied = query_fn(
        "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Occupied'",
        (hotel_id,),
        one=True,
    )["c"]
    employees = query_fn(
        "SELECT COUNT(*) c FROM employees WHERE hotel_id=? AND status='Active'",
        (hotel_id,),
        one=True,
    )["c"]
    revenue = query_fn(
        """SELECT COALESCE(SUM(p.amount),0) t FROM payments p
           JOIN bookings b ON p.booking_id=b.id WHERE b.hotel_id=?""",
        (hotel_id,),
        one=True,
    )["t"]
    occupancy = round((occupied / rooms * 100) if rooms else 0, 1)
    return {
        "rooms": rooms,
        "employees": employees,
        "revenue": float(revenue or 0),
        "occupancy": occupancy,
    }


def is_hotel_write_request():
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return False
    path = request.path or ""
    for prefix in PLATFORM_WRITE_PREFIXES:
        if path.startswith(prefix):
            return False
    if path.startswith("/api/notifications"):
        return request.method != "GET"
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
