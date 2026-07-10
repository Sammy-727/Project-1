"""Booking persistence helpers."""
from datetime import datetime


def get_idempotent_booking(query_fn, idem_key):
    if not idem_key:
        return None
    row = query_fn(
        "SELECT booking_id FROM booking_idempotency WHERE idem_key=?",
        (idem_key,),
        one=True,
    )
    return row["booking_id"] if row else None


def store_idempotent_booking(query_fn, idem_key, booking_id, conn=None):
    if not idem_key:
        return
    sql = "INSERT OR IGNORE INTO booking_idempotency(idem_key, booking_id, created_at) VALUES(?,?,?)"
    params = (idem_key, booking_id, datetime.now().isoformat(timespec="seconds"))
    if conn:
        conn.execute(sql, params)
    else:
        query_fn(sql, params, commit=True)


def fetch_booking_detail(query_fn, booking_id):
    return query_fn(
        """
        SELECT b.*, c.name customer_name, c.phone, r.room_no, r.room_type, r.price
        FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
        WHERE b.id=?
        """,
        (booking_id,),
        one=True,
    )


def create_booking_record(
    conn,
    *,
    customer_id,
    room_id,
    checkin,
    checkout,
    num_guests,
    adults,
    children,
    booking_source,
    special_request,
    total,
    payment_status,
    hid,
):
    cur = conn.execute(
        """INSERT INTO bookings(customer_id,room_id,checkin,checkout,num_guests,adults,children,
           booking_source,special_request,total_amount,status,payment_status,notes,hotel_id)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            customer_id,
            room_id,
            checkin,
            checkout,
            num_guests,
            adults,
            children,
            booking_source,
            special_request,
            total,
            "Reserved",
            payment_status,
            special_request,
            hid,
        ),
    )
    return cur.lastrowid
