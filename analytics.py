"""Hotel analytics helpers — ADR, RevPAR, booking sources, payment modes."""
from datetime import date, timedelta


def hotel_analytics(query_fn, hotel_id, days=30):
    """Compute hospitality KPIs for the selected hotel."""
    today = date.today()
    start = (today - timedelta(days=days - 1)).isoformat()
    end = today.isoformat()

    total_rooms = query_fn(
        "SELECT COUNT(*) c FROM rooms WHERE hotel_id=?",
        (hotel_id,),
        one=True,
    )["c"]
    occupied = query_fn(
        "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Occupied'",
        (hotel_id,),
        one=True,
    )["c"]

    period_revenue = float(
        query_fn(
            """
            SELECT COALESCE(SUM(p.amount), 0) t FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            WHERE b.hotel_id = ? AND date(p.payment_date) BETWEEN date(?) AND date(?)
            """,
            (hotel_id, start, end),
            one=True,
        )["t"]
        or 0
    )

    today_revenue = float(
        query_fn(
            """
            SELECT COALESCE(SUM(p.amount), 0) t FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            WHERE b.hotel_id = ? AND date(p.payment_date) = date(?)
            """,
            (hotel_id, end),
            one=True,
        )["t"]
        or 0
    )

    sold_nights = query_fn(
        """
        SELECT COUNT(*) c FROM bookings
        WHERE hotel_id = ? AND status IN ('Checked-in', 'Checked-out')
          AND checkin <= ? AND checkout > ?
        """,
        (hotel_id, end, start),
        one=True,
    )["c"]
    sold_nights = max(sold_nights, occupied, 1)

    available_nights = max(total_rooms * days, 1)
    adr = round(period_revenue / sold_nights, 2) if sold_nights else 0
    revpar = round(period_revenue / available_nights, 2) if total_rooms else 0
    occupancy_rate = round((occupied / total_rooms) * 100) if total_rooms else 0

    avg_room_rate = float(
        query_fn(
            "SELECT COALESCE(AVG(price), 0) a FROM rooms WHERE hotel_id=?",
            (hotel_id,),
            one=True,
        )["a"]
        or 0
    )

    booking_sources = query_fn(
        """
        SELECT COALESCE(booking_source, 'Walk-in') src, COUNT(*) c
        FROM bookings WHERE hotel_id = ?
          AND date(checkin) BETWEEN date(?) AND date(?)
        GROUP BY src ORDER BY c DESC LIMIT 8
        """,
        (hotel_id, start, end),
    )

    payment_modes = query_fn(
        """
        SELECT p.payment_mode mode, COALESCE(SUM(p.amount), 0) total, COUNT(*) c
        FROM payments p JOIN bookings b ON p.booking_id = b.id
        WHERE b.hotel_id = ? AND date(p.payment_date) BETWEEN date(?) AND date(?)
        GROUP BY p.payment_mode ORDER BY total DESC
        """,
        (hotel_id, start, end),
    )

    cancelled = query_fn(
        """
        SELECT COUNT(*) c FROM bookings
        WHERE hotel_id = ? AND status = 'Cancelled'
          AND date(checkin) BETWEEN date(?) AND date(?)
        """,
        (hotel_id, start, end),
        one=True,
    )["c"]
    total_bookings = query_fn(
        """
        SELECT COUNT(*) c FROM bookings
        WHERE hotel_id = ? AND date(checkin) BETWEEN date(?) AND date(?)
        """,
        (hotel_id, start, end),
        one=True,
    )["c"]
    cancellation_rate = round((cancelled / total_bookings) * 100, 1) if total_bookings else 0

    top_rooms = query_fn(
        """
        SELECT r.room_no, r.room_type, COUNT(b.id) bookings, COALESCE(SUM(b.total_amount), 0) revenue
        FROM bookings b JOIN rooms r ON b.room_id = r.id
        WHERE b.hotel_id = ? AND date(b.checkin) BETWEEN date(?) AND date(?)
        GROUP BY r.id ORDER BY bookings DESC LIMIT 5
        """,
        (hotel_id, start, end),
    )

    top_guests = query_fn(
        """
        SELECT c.id, c.name, COUNT(b.id) stays, COALESCE(SUM(p.paid), 0) spend
        FROM customers c
        JOIN bookings b ON b.customer_id = c.id
        LEFT JOIN (
            SELECT booking_id, SUM(amount) paid FROM payments GROUP BY booking_id
        ) p ON p.booking_id = b.id
        WHERE b.hotel_id = ? AND date(b.checkin) BETWEEN date(?) AND date(?)
        GROUP BY c.id ORDER BY spend DESC LIMIT 5
        """,
        (hotel_id, start, end),
    )

    return {
        "periodDays": days,
        "periodRevenue": round(period_revenue, 2),
        "todayRevenue": round(today_revenue, 2),
        "adr": adr,
        "revpar": revpar,
        "avgRoomRate": round(avg_room_rate, 2),
        "occupancyRate": occupancy_rate,
        "availableRooms": query_fn(
            "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Available'",
            (hotel_id,),
            one=True,
        )["c"],
        "cancellationRate": cancellation_rate,
        "bookingSources": [{"source": r["src"], "count": r["c"]} for r in booking_sources],
        "paymentModes": [
            {"mode": r["mode"], "total": round(float(r["total"] or 0), 2), "count": r["c"]}
            for r in payment_modes
        ],
        "topRooms": [
            {
                "roomNo": r["room_no"],
                "roomType": r["room_type"],
                "bookings": r["bookings"],
                "revenue": round(float(r["revenue"] or 0), 2),
            }
            for r in top_rooms
        ],
        "topGuests": [
            {
                "id": g["id"],
                "name": g["name"],
                "stays": g["stays"],
                "lifetimeSpend": round(float(g["spend"] or 0), 2),
            }
            for g in top_guests
        ],
    }
