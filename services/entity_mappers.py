"""Row-to-response mapping for API and list views."""


def customer_to_dict(row):
    if not row:
        return None
    d = dict(row)
    return {
        "id": d["id"],
        "name": d["name"],
        "phone": d["phone"],
        "email": d["email"],
        "address": d["address"],
        "gender": d["gender"],
        "age": d["age"],
        "id_proof_type": d["id_proof_type"],
        "id_proof_number": d["id_proof_number"],
        "emergency_contact": d.get("emergency_contact"),
    }


def customer_list_row_to_dict(row, booking_count=0):
    d = dict(row)
    bc = booking_count if booking_count is not None else d.get("booking_count", 0)
    loyalty = "Gold" if bc >= 5 else ("Silver" if bc >= 2 else "New")
    return {
        "id": d["id"],
        "name": d["name"],
        "phone": d["phone"],
        "email": d.get("email"),
        "address": d.get("address"),
        "booking_count": bc,
        "loyalty": loyalty,
        "guest_type": "Returning" if bc > 1 else "New",
        "image_url": d.get("image_url"),
        "id_proof_type": d.get("id_proof_type"),
        "gender": d.get("gender"),
        "age": d.get("age"),
    }


def room_to_dict(row):
    d = dict(row)
    return {
        "id": d["id"],
        "room_no": d["room_no"],
        "room_type": d.get("room_type") or d.get("category"),
        "category": d.get("category") or d.get("room_type"),
        "floor": d.get("floor") or 1,
        "price": float(d.get("price") or 0),
        "capacity": d.get("capacity") or 2,
        "status": d.get("status"),
        "amenities": d.get("amenities"),
        "image_url": d.get("image_url"),
    }


def room_list_row_to_dict(row):
    return room_to_dict(row)


def booking_row_to_dict(row):
    return {
        "id": row["id"],
        "customer_name": row["customer_name"],
        "phone": row["phone"],
        "room_no": row["room_no"],
        "room_type": row["room_type"],
        "checkin": row["checkin"],
        "checkout": row["checkout"],
        "num_guests": row["num_guests"] or 1,
        "total_amount": float(row["total_amount"] or 0),
        "status": row["status"],
        "payment_status": row["payment_status"],
    }


def employee_list_row_to_dict(row):
    d = dict(row)
    return {
        "id": d["id"],
        "name": d["name"],
        "phone": d.get("phone"),
        "email": d.get("email"),
        "role": d.get("role") or d.get("designation"),
        "department": d.get("department"),
        "status": d.get("status"),
        "shift": d.get("shift"),
        "joining_date": d.get("joining_date"),
        "salary": float(d.get("salary") or 0),
        "image_url": d.get("image_url"),
    }


def inventory_list_row_to_dict(row):
    d = dict(row)
    qty = int(d.get("quantity") or 0)
    reorder = int(d.get("reorder_level") or 0)
    stock = "out" if qty == 0 else ("low" if qty <= reorder else "in_stock")
    return {
        "id": d["id"],
        "item_name": d["item_name"],
        "category": d.get("category"),
        "quantity": qty,
        "unit": d.get("unit"),
        "price": float(d.get("price") or 0),
        "reorder_level": reorder,
        "supplier_name": d.get("supplier_name"),
        "last_updated": d.get("last_updated"),
        "stock_status": stock,
    }


def housekeeping_list_row_to_dict(row):
    d = dict(row)
    return {
        "id": d["id"],
        "room_no": d.get("room_no"),
        "room_type": d.get("room_type"),
        "staff_name": d.get("staff_name"),
        "status": d.get("status"),
        "priority": d.get("priority"),
        "notes": d.get("notes"),
        "created_at": d.get("created_at"),
        "completed_at": d.get("completed_at"),
    }
