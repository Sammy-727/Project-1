"""Dashboard statistics and shared booking list queries."""
from datetime import date

from analytics import hotel_analytics
from tenant import get_hotel_overview_stats

from services.booking_finance import booking_balance, booking_paid_amount


def pending_payment_summary(query_fn, hotel_id):
    rows = query_fn(
        """
        SELECT b.id, COALESCE(b.total_amount, 0) total_amount
        FROM bookings b
        WHERE b.hotel_id=? AND b.payment_status IN ('Pending','Partial')
          AND b.status IN ('Reserved','Checked-in')
        """,
        (hotel_id,),
    )
    count = 0
    amount = 0.0
    for row in rows:
        balance = booking_balance(query_fn, row)
        if balance > 0:
            count += 1
            amount += balance
    return count, round(amount, 2)


def pending_bookings_with_balance(query_fn, hotel_id, limit=None):
    """Active bookings with outstanding balance — used by payments and dashboard."""
    sql = """
        SELECT b.id, c.name, r.room_no, b.total_amount, b.payment_status, b.checkin, b.checkout
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN rooms r ON b.room_id = r.id
        WHERE b.hotel_id = ? AND b.payment_status IN ('Pending', 'Partial')
          AND b.status IN ('Reserved', 'Checked-in')
        ORDER BY b.checkin ASC
    """
    params = [hotel_id]
    if limit:
        sql += " LIMIT ?"
        params.append(limit)
    pending = []
    for row in query_fn(sql, params):
        pd = dict(row)
        balance = booking_balance(query_fn, row)
        if balance <= 0:
            continue
        pd["paid"] = booking_paid_amount(query_fn, row["id"])
        pd["balance"] = balance
        pending.append(pd)
    return pending


def dashboard_stats(query_fn, hotel_id=None, get_hotel_id_fn=None):
    hotel_id = hotel_id or get_hotel_id_fn()
    today = date.today().isoformat()
    overview = get_hotel_overview_stats(query_fn, hotel_id)
    pending_count, pending_amount = pending_payment_summary(query_fn, hotel_id)
    maintenance = query_fn(
        "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Maintenance'",
        (hotel_id,),
        one=True,
    )["c"]
    cleaning = query_fn(
        "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Cleaning'",
        (hotel_id,),
        one=True,
    )["c"]
    active_bookings = query_fn(
        "SELECT COUNT(*) c FROM bookings WHERE hotel_id=? AND status IN ('Reserved','Checked-in')",
        (hotel_id,),
        one=True,
    )["c"]
    today_revenue = query_fn(
        """SELECT COALESCE(SUM(p.amount),0) t FROM payments p
           JOIN bookings b ON p.booking_id=b.id
           WHERE b.hotel_id=? AND date(p.payment_date)=?""",
        (hotel_id, today),
        one=True,
    )["t"]
    analytics = hotel_analytics(query_fn, hotel_id, days=30)
    return {
        "total_rooms": overview["totalRooms"],
        "available": overview["availableRooms"],
        "occupied": overview["occupiedRooms"],
        "occupancy_rate": int(overview["occupancyRate"]),
        "active_bookings": active_bookings,
        "employees": overview["totalStaff"],
        "revenue": overview["totalRevenue"],
        "today_revenue": today_revenue,
        "today_checkins": overview["todayCheckIns"],
        "today_checkouts": overview["todayCheckOuts"],
        "pending_payments": pending_count,
        "pending_payment_amount": pending_amount,
        "maintenance": maintenance,
        "cleaning": cleaning,
        "adr": analytics["adr"],
        "revpar": analytics["revpar"],
        "avg_room_rate": analytics["avgRoomRate"],
    }
