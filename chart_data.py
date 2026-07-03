"""Hotel-scoped dashboard chart data helpers."""
from calendar import month_abbr
from datetime import date, timedelta


MONTH_NAMES = [month_abbr[i] for i in range(1, 13)]


def _last_month_keys(count=6):
    """Return list of (yyyy_mm, display_label) for the last N calendar months."""
    today = date.today()
    y, m = today.year, today.month
    keys = []
    for _ in range(count):
        keys.append((f"{y:04d}-{m:02d}", MONTH_NAMES[m]))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(keys))


def _status_label(status):
    if status == "Cleaning":
        return "Dirty"
    return status or "Unknown"


def get_revenue_trend(query_fn, hotel_id):
    keys = _last_month_keys(6)
    rows = query_fn(
        """
        SELECT strftime('%Y-%m', p.payment_date) month_key, COALESCE(SUM(p.amount), 0) total
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        WHERE b.hotel_id = ?
        GROUP BY month_key
        """,
        (hotel_id,),
    )
    by_month = {r["month_key"]: float(r["total"] or 0) for r in rows}
    return [{"month": label, "revenue": round(by_month.get(key, 0), 2)} for key, label in keys]


def get_occupancy_status(query_fn, hotel_id):
    rows = query_fn(
        "SELECT status, COUNT(*) c FROM rooms WHERE hotel_id=? GROUP BY status",
        (hotel_id,),
    )
    data = [{"name": _status_label(r["status"]), "value": int(r["c"])} for r in rows]
    order = ["Available", "Occupied", "Reserved", "Maintenance", "Dirty"]
    data.sort(key=lambda x: order.index(x["name"]) if x["name"] in order else 99)
    return data


def get_revenue_daily_7d(query_fn, hotel_id):
    """Daily revenue for the last 7 calendar days (including today)."""
    today = date.today()
    start = today - timedelta(days=6)
    rows = query_fn(
        """
        SELECT date(p.payment_date) day_key, COALESCE(SUM(p.amount), 0) total
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        WHERE b.hotel_id = ? AND date(p.payment_date) BETWEEN date(?) AND date(?)
        GROUP BY day_key
        """,
        (hotel_id, start.isoformat(), today.isoformat()),
    )
    by_day = {r["day_key"]: float(r["total"] or 0) for r in rows}
    result = []
    for offset in range(7):
        d = start + timedelta(days=offset)
        key = d.isoformat()
        result.append({
            "date": key,
            "label": d.strftime("%a"),
            "revenue": round(by_day.get(key, 0), 2),
            "isToday": d == today,
        })
    return result


def get_booking_trend(query_fn, hotel_id):
    keys = _last_month_keys(6)
    rows = query_fn(
        """
        SELECT strftime('%Y-%m', checkin) month_key, COUNT(*) c
        FROM bookings
        WHERE hotel_id = ?
        GROUP BY month_key
        """,
        (hotel_id,),
    )
    by_month = {r["month_key"]: int(r["c"]) for r in rows}
    return [{"month": label, "bookings": by_month.get(key, 0)} for key, label in keys]


DEMO_REVENUE_TREND = [
    {"month": "Jan", "revenue": 45000},
    {"month": "Feb", "revenue": 52000},
    {"month": "Mar", "revenue": 61000},
    {"month": "Apr", "revenue": 58000},
    {"month": "May", "revenue": 67000},
    {"month": "Jun", "revenue": 72000},
]

DEMO_OCCUPANCY_STATUS = [
    {"name": "Available", "value": 12},
    {"name": "Occupied", "value": 8},
    {"name": "Maintenance", "value": 2},
    {"name": "Dirty", "value": 3},
]

DEMO_BOOKING_TREND = [
    {"month": "Jan", "bookings": 24},
    {"month": "Feb", "bookings": 31},
    {"month": "Mar", "bookings": 28},
    {"month": "Apr", "bookings": 35},
    {"month": "May", "bookings": 42},
    {"month": "Jun", "bookings": 38},
]


def with_fallback(data, demo, value_key):
    if not data:
        return demo, True
    if sum(item.get(value_key, 0) for item in data) <= 0:
        return demo, True
    return data, False
