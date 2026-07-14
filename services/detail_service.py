"""Detail payloads for dashboard and drawer API endpoints."""


def booking_detail_dict(row, paid_amount, balance):
    if not row:
        return None
    d = dict(row)
    total = float(d.get("total_amount") or 0)
    paid = float(paid_amount or 0)
    return {
        "id": d["id"],
        "bookingId": d["id"],
        "customerId": d.get("customer_id"),
        "roomId": d.get("room_id"),
        "hotelId": d.get("hotel_id"),
        "customerName": d.get("customer_name"),
        "phone": d.get("phone"),
        "email": d.get("email"),
        "roomNo": d.get("room_no"),
        "roomType": d.get("room_type"),
        "checkin": d.get("checkin"),
        "checkout": d.get("checkout"),
        "numGuests": d.get("num_guests") or 1,
        "adults": d.get("adults") or d.get("num_guests") or 1,
        "children": d.get("children") or 0,
        "status": d.get("status"),
        "paymentStatus": d.get("payment_status"),
        "totalAmount": total,
        "paidAmount": paid,
        "balance": float(balance or 0),
        "bookingSource": d.get("booking_source") or "Walk-in",
        "specialRequest": d.get("special_request") or d.get("notes") or "",
        "createdAt": d.get("created_at"),
    }


def fetch_booking_detail_row(query_fn, booking_id, hotel_id):
    return query_fn(
        """
        SELECT b.*, c.name AS customer_name, c.phone, c.email, c.address,
               r.room_no, r.room_type, r.id AS room_id, c.id AS customer_id
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN rooms r ON b.room_id = r.id
        WHERE b.id = ? AND b.hotel_id = ?
        """,
        (booking_id, hotel_id),
        one=True,
    )


def payment_detail_dict(row, booking_total, paid_total, balance):
    if not row:
        return None
    d = dict(row)
    return {
        "id": d["id"],
        "paymentId": d["id"],
        "bookingId": d.get("booking_id"),
        "customerId": d.get("customer_id"),
        "roomId": d.get("room_id"),
        "hotelId": d.get("hotel_id"),
        "amount": float(d.get("amount") or 0),
        "paymentMode": d.get("payment_mode"),
        "receiptNumber": d.get("receipt_number"),
        "paymentDate": d.get("payment_date"),
        "notes": d.get("notes") or "",
        "customerName": d.get("customer_name"),
        "roomNo": d.get("room_no"),
        "bookingTotal": float(booking_total or 0),
        "paidTotal": float(paid_total or 0),
        "balance": float(balance or 0),
        "paymentStatus": d.get("payment_status"),
    }


def fetch_payment_detail_row(query_fn, payment_id, hotel_id):
    return query_fn(
        """
        SELECT p.*, b.id AS booking_id, b.total_amount, b.payment_status,
               b.hotel_id, c.id AS customer_id, c.name AS customer_name,
               r.id AS room_id, r.room_no
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN customers c ON b.customer_id = c.id
        JOIN rooms r ON b.room_id = r.id
        WHERE p.id = ? AND b.hotel_id = ?
        """,
        (payment_id, hotel_id),
        one=True,
    )


def inventory_detail_dict(row):
    if not row:
        return None
    d = dict(row)
    qty = int(d.get("quantity") or 0)
    reorder = int(d.get("reorder_level") or 0)
    return {
        "id": d["id"],
        "itemName": d.get("item_name"),
        "category": d.get("category"),
        "quantity": qty,
        "unit": d.get("unit"),
        "price": float(d.get("price") or 0),
        "reorderLevel": reorder,
        "supplierName": d.get("supplier_name"),
        "lastUpdated": d.get("last_updated"),
        "stockStatus": "out" if qty == 0 else ("low" if qty <= reorder else "in_stock"),
        "hotelId": d.get("hotel_id"),
    }


def housekeeping_detail_dict(row):
    if not row:
        return None
    d = dict(row)
    return {
        "id": d["id"],
        "taskId": d["id"],
        "roomId": d.get("room_id"),
        "roomNo": d.get("room_no"),
        "roomType": d.get("room_type"),
        "status": d.get("status"),
        "priority": d.get("priority"),
        "notes": d.get("notes") or "",
        "staffName": d.get("staff_name"),
        "createdAt": d.get("created_at"),
        "completedAt": d.get("completed_at"),
        "hotelId": d.get("hotel_id"),
    }


def fetch_housekeeping_detail_row(query_fn, task_id, hotel_id):
    return query_fn(
        """
        SELECT h.*, r.room_no, r.room_type, r.id AS room_id, r.hotel_id, e.name AS staff_name
        FROM housekeeping_tasks h
        JOIN rooms r ON h.room_id = r.id
        LEFT JOIN employees e ON h.assigned_to = e.id
        WHERE h.id = ? AND r.hotel_id = ?
        """,
        (task_id, hotel_id),
        one=True,
    )


def maintenance_detail_dict(row):
    if not row:
        return None
    d = dict(row)
    return {
        "id": d["id"],
        "requestId": d["id"],
        "roomId": d.get("room_id"),
        "roomNo": d.get("room_no"),
        "roomType": d.get("room_type"),
        "status": d.get("status"),
        "description": d.get("description") or "",
        "requestType": d.get("request_type"),
        "charges": float(d.get("charges") or 0),
        "createdAt": d.get("created_at"),
        "bookingId": d.get("booking_id"),
        "customerName": d.get("customer_name"),
        "hotelId": d.get("hotel_id"),
    }


def fetch_maintenance_detail_row(query_fn, req_id, hotel_id):
    return query_fn(
        """
        SELECT rs.*, r.room_no, r.room_type, r.id AS room_id, r.hotel_id,
               b.id AS booking_id, c.name AS customer_name
        FROM room_service_requests rs
        JOIN rooms r ON rs.room_id = r.id
        LEFT JOIN bookings b ON rs.booking_id = b.id
        LEFT JOIN customers c ON b.customer_id = c.id
        WHERE rs.id = ? AND r.hotel_id = ? AND rs.request_type = 'Maintenance'
        """,
        (req_id, hotel_id),
        one=True,
    )
