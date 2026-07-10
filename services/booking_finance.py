"""Booking charges, payments, and receipt helpers."""
from datetime import datetime


def nights_between(checkin, checkout):
    d1 = datetime.strptime(checkin, "%Y-%m-%d").date()
    d2 = datetime.strptime(checkout, "%Y-%m-%d").date()
    return max((d2 - d1).days, 1)


def calc_room_charges(price, checkin, checkout):
    return nights_between(checkin, checkout) * float(price)


def receipt_number(query_fn):
    count = query_fn("SELECT COUNT(*) c FROM payments", one=True)["c"]
    return f"RCP-{datetime.now().strftime('%Y%m%d')}-{count + 1:04d}"


def receipt_number_conn(conn):
    count = conn.execute("SELECT COUNT(*) c FROM payments").fetchone()["c"]
    return f"RCP-{datetime.now().strftime('%Y%m%d')}-{count + 1:04d}"


def booking_service_charges(query_fn, booking_id):
    inv = query_fn(
        "SELECT COALESCE(SUM(amount),0) s FROM service_usage WHERE booking_id=?",
        (booking_id,),
        one=True,
    )["s"]
    rs = query_fn(
        "SELECT COALESCE(SUM(charges),0) s FROM room_service_requests WHERE booking_id=? AND status != 'Cancelled'",
        (booking_id,),
        one=True,
    )["s"]
    return float(inv) + float(rs)


def booking_room_charges(booking):
    return calc_room_charges(booking["price"], booking["checkin"], booking["checkout"])


def booking_total_amount(query_fn, booking):
    return booking_room_charges(booking) + booking_service_charges(query_fn, booking["id"])


def booking_paid_amount(query_fn, booking_id):
    return float(
        query_fn(
            "SELECT COALESCE(SUM(amount),0) s FROM payments WHERE booking_id=?",
            (booking_id,),
            one=True,
        )["s"]
    )


def update_booking_payment_status(query_fn, booking_id):
    booking = query_fn(
        """
        SELECT b.*, r.price FROM bookings b JOIN rooms r ON b.room_id=r.id WHERE b.id=?
        """,
        (booking_id,),
        one=True,
    )
    if not booking:
        return
    total = booking_total_amount(query_fn, booking)
    paid = booking_paid_amount(query_fn, booking_id)
    if paid <= 0:
        status = "Pending"
    elif paid >= total:
        status = "Paid"
    else:
        status = "Partial"
    query_fn(
        "UPDATE bookings SET total_amount=?, payment_status=? WHERE id=?",
        (total, status, booking_id),
        commit=True,
    )


def booking_balance(query_fn, booking_row):
    """Outstanding balance for a booking row with total_amount."""
    row = dict(booking_row) if not isinstance(booking_row, dict) else booking_row
    paid = booking_paid_amount(query_fn, row["id"])
    return max(float(row.get("total_amount") or 0) - paid, 0)
