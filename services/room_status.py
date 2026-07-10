"""Room status sync from bookings and housekeeping."""


def sync_room_status_from_bookings(query_fn, room_id):
    active = query_fn(
        "SELECT status FROM bookings WHERE room_id=? AND status IN ('Reserved','Checked-in') ORDER BY id DESC LIMIT 1",
        (room_id,),
        one=True,
    )
    maint = query_fn("SELECT status FROM rooms WHERE id=?", (room_id,), one=True)
    if maint and maint["status"] == "Maintenance":
        return
    hk = query_fn(
        "SELECT status FROM housekeeping_tasks WHERE room_id=? AND status != 'Completed' ORDER BY id DESC LIMIT 1",
        (room_id,),
        one=True,
    )
    if hk:
        query_fn("UPDATE rooms SET status='Cleaning' WHERE id=?", (room_id,), commit=True)
        return
    if active:
        status = "Occupied" if active["status"] == "Checked-in" else "Reserved"
        query_fn("UPDATE rooms SET status=? WHERE id=?", (status, room_id), commit=True)
    else:
        query_fn(
            "UPDATE rooms SET status='Available' WHERE id=? AND status NOT IN ('Maintenance')",
            (room_id,),
            commit=True,
        )
