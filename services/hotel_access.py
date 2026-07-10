"""Hotel tenant context and scoped entity lookups."""
from flask import session

from tenant import DEFAULT_HOTEL_ID, normalize_role


def get_current_hotel_id():
    role = normalize_role(session.get("role"))
    if role == "SUPER_ADMIN":
        return int(session.get("hotel_id") or DEFAULT_HOTEL_ID)
    user_hotel = session.get("user_hotel_id")
    if user_hotel:
        return int(user_hotel)
    return int(session.get("hotel_id") or DEFAULT_HOTEL_ID)


def get_current_hotel(query_fn):
    hid = get_current_hotel_id()
    return query_fn("SELECT * FROM hotels WHERE id=?", (hid,), one=True)


def set_session_hotel(hotel_id):
    session["hotel_id"] = int(hotel_id)


def ensure_entity_hotel(row, hotel_id=None):
    hid = hotel_id or get_current_hotel_id()
    if not row:
        return False
    if "hotel_id" in row.keys() and row["hotel_id"] is not None:
        return int(row["hotel_id"]) == int(hid)
    return True


def scoped_entity(query_fn, table, entity_id, hotel_id=None):
    hid = hotel_id or get_current_hotel_id()
    return query_fn(f"SELECT * FROM {table} WHERE id=? AND hotel_id=?", (entity_id, hid), one=True)


def scoped_customer(query_fn, customer_id, hotel_id=None):
    return scoped_entity(query_fn, "customers", customer_id, hotel_id)


def scoped_room(query_fn, room_id, hotel_id=None):
    return scoped_entity(query_fn, "rooms", room_id, hotel_id)


def scoped_booking(query_fn, booking_id, hotel_id=None):
    return scoped_entity(query_fn, "bookings", booking_id, hotel_id)
