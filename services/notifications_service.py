"""Hotel notification sync, storage, and API helpers."""
from datetime import date, datetime, timedelta

from seed_data import seed_hotel_demo_notifications
from tenant import DEFAULT_HOTEL_ID

NOTIFICATION_TYPES = ("RED", "YELLOW", "GREEN", "BLUE", "ORANGE")
NOTIFICATION_PRIORITY = {
    "RED": "urgent",
    "ORANGE": "urgent",
    "YELLOW": "upcoming",
    "BLUE": "general",
    "GREEN": "general",
}
NOTIFICATION_CATEGORIES = (
    "PENDING_PAYMENTS",
    "LOW_INVENTORY",
    "UPCOMING_CHECKINS",
    "UPCOMING_CHECKOUTS",
    "MAINTENANCE",
    "HOUSEKEEPING",
)


def notification_to_dict(row):
    if not row:
        return None
    ntype = row["type"] or "BLUE"
    return {
        "id": row["id"],
        "hotelId": row["hotel_id"],
        "title": row["title"],
        "message": row["message"],
        "type": ntype,
        "category": row["category"],
        "priority": NOTIFICATION_PRIORITY.get(ntype, "general"),
        "isRead": bool(row["is_read"]),
        "createdAt": row["created_at"],
        "actionUrl": row["action_url"] or "",
        "sourceKey": row["source_key"] or "",
        "isDemo": bool(row["is_demo"]),
    }


def count_unread_notifications(query_fn, hotel_id):
    return query_fn(
        "SELECT COUNT(*) c FROM notifications WHERE hotel_id=? AND is_read=0",
        (hotel_id,),
        one=True,
    )["c"]


def list_notifications(query_fn, hotel_id):
    rows = query_fn(
        "SELECT * FROM notifications WHERE hotel_id=? ORDER BY datetime(created_at) DESC, id DESC",
        (hotel_id,),
    )
    return [notification_to_dict(r) for r in rows]


def upsert_notification(query_fn, hotel_id, title, message, ntype, category, action_url, source_key, is_demo=0):
    existing = query_fn(
        "SELECT id FROM notifications WHERE hotel_id=? AND source_key=?",
        (hotel_id, source_key),
        one=True,
    )
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if existing:
        query_fn(
            """UPDATE notifications SET title=?, message=?, type=?, category=?, action_url=?
               WHERE id=? AND hotel_id=?""",
            (title, message, ntype, category, action_url, existing["id"], hotel_id),
            commit=True,
        )
        return existing["id"]
    return query_fn(
        """INSERT INTO notifications(hotel_id,title,message,type,category,is_read,created_at,action_url,source_key,is_demo)
           VALUES(?,?,?,?,?,0,?,?,?,?)""",
        (hotel_id, title, message, ntype, category, now, action_url, source_key, is_demo),
        commit=True,
    )


def has_demo_notification(query_fn, hotel_id, source_key):
    return bool(
        query_fn(
            "SELECT id FROM notifications WHERE hotel_id=? AND source_key=? AND is_demo=1",
            (hotel_id, source_key),
            one=True,
        )
    )


def resolve_demo_conflicts(query_fn, hotel_id):
    demo_map = {
        "PENDING_PAYMENTS": f"demo_pay_{hotel_id}",
        "LOW_INVENTORY": f"demo_low_stock_{hotel_id}",
        "UPCOMING_CHECKINS": f"demo_checkin_{hotel_id}",
    }
    for category, demo_key in demo_map.items():
        has_real = query_fn(
            """
            SELECT id FROM notifications
            WHERE hotel_id=? AND category=? AND is_demo=0 AND source_key IS NOT NULL
            LIMIT 1
            """,
            (hotel_id, category),
            one=True,
        )
        if has_real and has_demo_notification(query_fn, hotel_id, demo_key):
            query_fn(
                "DELETE FROM notifications WHERE hotel_id=? AND source_key=?",
                (hotel_id, demo_key),
                commit=True,
            )


def sync_notifications_from_data(query_fn, booking_paid_fn, hotel_id):
    today = date.today()
    horizon = today + timedelta(days=7)
    active_keys = set()

    low_items = query_fn(
        "SELECT id, item_name, quantity, reorder_level FROM inventory WHERE hotel_id=? AND quantity <= reorder_level",
        (hotel_id,),
    )
    for item in low_items:
        key = f"LOW_INVENTORY_{item['id']}"
        active_keys.add(key)
        name = item["item_name"]
        upsert_notification(
            query_fn,
            hotel_id,
            "Low Inventory",
            f"{name} stock is below minimum level ({item['quantity']} / {item['reorder_level']}).",
            "RED",
            "LOW_INVENTORY",
            f"/inventory?q={name}",
            key,
        )

    pending_bookings = query_fn(
        """
        SELECT b.id, c.name, b.total_amount, b.payment_status
        FROM bookings b JOIN customers c ON b.customer_id=c.id
        WHERE b.hotel_id=? AND b.payment_status IN ('Pending','Partial')
          AND b.status IN ('Reserved','Checked-in')
        """,
        (hotel_id,),
    )
    for b in pending_bookings:
        paid = booking_paid_fn(b["id"])
        balance = max(float(b["total_amount"] or 0) - paid, 0)
        if balance <= 0:
            continue
        key = f"PENDING_PAYMENT_{b['id']}"
        active_keys.add(key)
        upsert_notification(
            query_fn,
            hotel_id,
            "Payment Pending",
            f"Booking #{b['id']} has ₹{balance:,.0f} pending.",
            "RED",
            "PENDING_PAYMENTS",
            f"/payments?booking_id={b['id']}",
            key,
        )

    checkins = query_fn(
        """
        SELECT b.id, c.name, r.room_no, b.checkin
        FROM bookings b
        JOIN customers c ON b.customer_id=c.id
        JOIN rooms r ON b.room_id=r.id
        WHERE b.hotel_id=? AND b.status='Reserved'
          AND date(b.checkin) BETWEEN date(?) AND date(?)
        """,
        (hotel_id, str(today), str(horizon)),
    )
    for b in checkins:
        key = f"UPCOMING_CHECKIN_{b['id']}"
        active_keys.add(key)
        ci = datetime.strptime(b["checkin"], "%Y-%m-%d").date()
        when = "today" if ci == today else f"on {b['checkin']}"
        upsert_notification(
            query_fn,
            hotel_id,
            "Upcoming Check-in",
            f"{b['name']} arriving {when} for Room {b['room_no']}.",
            "YELLOW",
            "UPCOMING_CHECKINS",
            f"/bookings?q={b['id']}",
            key,
        )

    checkouts = query_fn(
        """
        SELECT b.id, c.name, r.room_no, b.checkout
        FROM bookings b
        JOIN customers c ON b.customer_id=c.id
        JOIN rooms r ON b.room_id=r.id
        WHERE b.hotel_id=? AND b.status='Checked-in'
          AND date(b.checkout) BETWEEN date(?) AND date(?)
        """,
        (hotel_id, str(today), str(horizon)),
    )
    for b in checkouts:
        key = f"UPCOMING_CHECKOUT_{b['id']}"
        active_keys.add(key)
        co = datetime.strptime(b["checkout"], "%Y-%m-%d").date()
        when = "today" if co == today else f"on {b['checkout']}"
        upsert_notification(
            query_fn,
            hotel_id,
            "Upcoming Check-out",
            f"{b['name']} checking out {when} from Room {b['room_no']}.",
            "YELLOW",
            "UPCOMING_CHECKOUTS",
            f"/invoice/{b['id']}",
            key,
        )

    hk_tasks = query_fn(
        """
        SELECT h.id, r.room_no, h.priority
        FROM housekeeping_tasks h
        JOIN rooms r ON h.room_id=r.id
        WHERE r.hotel_id=? AND h.status='Pending'
        """,
        (hotel_id,),
    )
    for t in hk_tasks:
        key = f"HOUSEKEEPING_{t['id']}"
        active_keys.add(key)
        upsert_notification(
            query_fn,
            hotel_id,
            "Housekeeping Pending",
            f"Room {t['room_no']} — {t['priority']} priority cleaning pending.",
            "BLUE",
            "HOUSEKEEPING",
            "/housekeeping",
            key,
        )

    maint_requests = query_fn(
        """
        SELECT rs.id, r.room_no, rs.description, rs.status
        FROM room_service_requests rs
        JOIN rooms r ON rs.room_id=r.id
        WHERE r.hotel_id=? AND rs.request_type='Maintenance'
          AND rs.status IN ('Pending','In Progress')
        """,
        (hotel_id,),
    )
    for req in maint_requests:
        key = f"MAINTENANCE_{req['id']}"
        active_keys.add(key)
        detail = (req["description"] or "Maintenance request").strip()
        upsert_notification(
            query_fn,
            hotel_id,
            "Maintenance Request",
            f"Room {req['room_no']} — {detail} ({req['status']}).",
            "ORANGE",
            "MAINTENANCE",
            f"/room-service?q={req['id']}",
            key,
        )

    maint_rooms = query_fn(
        "SELECT id, room_no FROM rooms WHERE hotel_id=? AND status='Maintenance'",
        (hotel_id,),
    )
    for r in maint_rooms:
        key = f"MAINTENANCE_ROOM_{r['id']}"
        active_keys.add(key)
        upsert_notification(
            query_fn,
            hotel_id,
            "Maintenance Required",
            f"Room {r['room_no']} is under maintenance.",
            "ORANGE",
            "MAINTENANCE",
            "/rooms?q=" + r["room_no"],
            key,
        )

    auto_rows = query_fn(
        "SELECT id, source_key FROM notifications WHERE hotel_id=? AND is_demo=0 AND source_key IS NOT NULL",
        (hotel_id,),
    )
    for row in auto_rows:
        if row["source_key"] not in active_keys:
            query_fn("DELETE FROM notifications WHERE id=?", (row["id"],), commit=True)


def seed_demo_notifications(query_fn, hotel_id=DEFAULT_HOTEL_ID):
    count = query_fn(
        "SELECT COUNT(*) c FROM notifications WHERE hotel_id=?",
        (hotel_id,),
        one=True,
    )["c"]
    if count > 0:
        return
    hotel = query_fn("SELECT hotel_name, city FROM hotels WHERE id=?", (hotel_id,), one=True)
    if not hotel:
        return
    seed_hotel_demo_notifications(query_fn, hotel_id, hotel["hotel_name"], hotel["city"])


def generate_hotel_alerts(query_fn, booking_paid_fn, hotel_id):
    seed_demo_notifications(query_fn, hotel_id)
    sync_notifications_from_data(query_fn, booking_paid_fn, hotel_id)
    resolve_demo_conflicts(query_fn, hotel_id)
