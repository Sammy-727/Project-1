"""Centralized room overlap and availability checks."""
from datetime import datetime

BLOCKING_BOOKING_STATUSES = ("Reserved", "Checked-in")
OVERLAP_CONFLICT_MESSAGE = "This room is already booked for the selected dates."


class BookingConflictError(Exception):
    """Raised when a room is already booked for overlapping dates."""


def validate_booking_dates(checkin, checkout):
    try:
        ci = datetime.strptime(checkin, "%Y-%m-%d").date()
        co = datetime.strptime(checkout, "%Y-%m-%d").date()
    except ValueError:
        return False, "Invalid date format."
    if co <= ci:
        return False, "Check-out must be after check-in."
    return True, None


def room_has_overlap(query_fn, room_id, checkin, checkout, exclude_booking_id=None, conn=None):
    """True if an active booking overlaps [checkin, checkout) for the room."""
    placeholders = ", ".join("?" for _ in BLOCKING_BOOKING_STATUSES)
    sql = f"""
        SELECT COUNT(*) c FROM bookings
        WHERE room_id=?
          AND status IN ({placeholders})
          AND checkin < ? AND checkout > ?
    """
    params = [room_id, *BLOCKING_BOOKING_STATUSES, checkout, checkin]
    if exclude_booking_id:
        sql += " AND id != ?"
        params.append(exclude_booking_id)
    if conn:
        row = conn.execute(sql, params).fetchone()
        return row["c"] > 0
    return query_fn(sql, params, one=True)["c"] > 0


def get_available_rooms(
    query_fn,
    checkin,
    checkout,
    *,
    num_guests=1,
    hotel_id,
    unavailable_statuses,
    room_to_dict,
):
    rooms = query_fn(
        "SELECT * FROM rooms WHERE hotel_id=? ORDER BY CAST(room_no AS INTEGER), room_no",
        (hotel_id,),
    )
    available = []
    for room in rooms:
        if room["status"] in unavailable_statuses:
            continue
        if room_has_overlap(query_fn, room["id"], checkin, checkout):
            continue
        if num_guests and room["capacity"] < num_guests:
            continue
        available.append(room_to_dict(room))
    return available
