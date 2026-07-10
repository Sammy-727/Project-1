"""Room detail payload for drawer API."""


def room_edit_roles():
    return {"HOTEL_ADMIN", "MANAGER", "RECEPTIONIST"}


def can_edit_room(role, can_write):
    from tenant import normalize_role

    if not can_write:
        return False
    return normalize_role(role) in room_edit_roles()


def active_booking_for_room(query_fn, room_id, hotel_id):
    return query_fn(
        """
        SELECT b.id, b.checkin, b.checkout, b.status, b.payment_status,
               b.total_amount, b.num_guests, b.room_id, r.price,
               c.name AS customer_name, c.phone
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN rooms r ON b.room_id = r.id
        WHERE b.room_id = ? AND b.hotel_id = ?
          AND b.status IN ('Reserved', 'Checked-in')
        ORDER BY b.checkin DESC
        LIMIT 1
        """,
        (room_id, hotel_id),
        one=True,
    )


def booking_summary_dict(booking, paid_fn, total_fn):
    if not booking:
        return None
    paid = paid_fn(booking["id"])
    total = total_fn(booking)
    balance = max(float(total or 0) - float(paid or 0), 0)
    return {
        "id": booking["id"],
        "customer_name": booking["customer_name"],
        "phone": booking.get("phone"),
        "checkin": booking["checkin"],
        "checkout": booking["checkout"],
        "status": booking["status"],
        "payment_status": booking["payment_status"],
        "num_guests": booking.get("num_guests") or 1,
        "total_amount": float(total or 0),
        "paid_amount": float(paid or 0),
        "balance": balance,
    }


def build_room_detail(query_fn, room_id, hotel_id, role, can_write, paid_fn, total_fn):
    room = query_fn(
        "SELECT * FROM rooms WHERE id=? AND hotel_id=?",
        (room_id, hotel_id),
        one=True,
    )
    if not room:
        return None

    from services.entity_mappers import room_to_dict

    booking = active_booking_for_room(query_fn, room_id, hotel_id)
    return {
        "room": room_to_dict(room),
        "booking": booking_summary_dict(booking, paid_fn, total_fn),
        "can_edit": can_edit_room(role, can_write),
    }
