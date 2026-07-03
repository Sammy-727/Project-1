"""Public online booking APIs — guest-facing hotel reservations."""
from datetime import datetime, timedelta
from functools import wraps
from time import time

from flask import jsonify, request

ONLINE_PAYMENT_MODES = ("UPI", "CARD", "NET_BANKING", "WALLET")
ONLINE_PAYMENT_GATEWAYS = ("razorpay", "stripe", "mock")
BLOCKING_BOOKING_STATUSES = ("Reserved", "Checked-in", "Confirmed", "Pending")
PUBLIC_RATE_LIMIT = 40
PUBLIC_RATE_WINDOW = 60

_rate_buckets = {}


def api_error(message, status=400):
    return jsonify({"ok": False, "error": message}), status


def api_ok(**payload):
    return jsonify({"ok": True, **payload})


def public_rate_limit(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
        key = f"{ip}:{request.path}"
        now = time()
        bucket = _rate_buckets.setdefault(key, [])
        bucket[:] = [t for t in bucket if now - t < PUBLIC_RATE_WINDOW]
        if len(bucket) >= PUBLIC_RATE_LIMIT:
            return api_error("Too many requests. Please try again shortly.", 429)
        bucket.append(now)
        return f(*args, **kwargs)

    return wrapped


def generate_booking_number(query_fn):
    count = query_fn(
        "SELECT COUNT(*) c FROM bookings WHERE booking_number IS NOT NULL",
        one=True,
    )["c"]
    return f"OBK-{datetime.now().strftime('%Y%m%d')}-{count + 1:05d}"


def room_has_overlap_public(query_fn, room_id, checkin, checkout, exclude_booking_id=None):
    sql = f"""
        SELECT COUNT(*) c FROM bookings
        WHERE room_id=? AND status IN ({",".join("?" * len(BLOCKING_BOOKING_STATUSES))})
        AND checkin < ? AND checkout > ?
    """
    params = [room_id, *BLOCKING_BOOKING_STATUSES, checkout, checkin]
    if exclude_booking_id:
        sql += " AND id != ?"
        params.append(exclude_booking_id)
    return query_fn(sql, params, one=True)["c"] > 0


def public_hotel_to_dict(row):
    return {
        "hotelId": row["id"],
        "hotelName": row["hotel_name"],
        "hotelCode": row["hotel_code"],
        "city": row["city"],
        "state": row["state"],
        "address": row["address"],
        "phone": row["phone"],
        "email": row["email"],
    }


def public_room_to_dict(row, checkin, checkout, calc_room_charges_fn, nights_fn):
    nights = nights_fn(checkin, checkout)
    nightly = float(row["price"])
    total = calc_room_charges_fn(nightly, checkin, checkout)
    return {
        "roomId": row["id"],
        "roomNo": row["room_no"],
        "roomType": row["room_type"],
        "category": row["category"],
        "floor": row["floor"],
        "pricePerNight": nightly,
        "totalPrice": total,
        "nights": nights,
        "capacity": row["capacity"],
        "amenities": row["amenities"],
        "status": row["status"],
    }


def public_booking_to_dict(row):
    return {
        "bookingId": row["id"],
        "bookingNumber": row["booking_number"],
        "hotelId": row["hotel_id"],
        "hotelName": row.get("hotel_name"),
        "roomNo": row.get("room_no"),
        "roomType": row.get("room_type"),
        "guestName": row.get("customer_name"),
        "guestPhone": row.get("phone"),
        "guestEmail": row.get("email"),
        "checkIn": row["checkin"],
        "checkOut": row["checkout"],
        "numGuests": row["num_guests"] or 1,
        "adults": row.get("adults") or 1,
        "children": row.get("children") or 0,
        "totalAmount": float(row["total_amount"] or 0),
        "paidAmount": float(row.get("paid_amount") or 0),
        "status": row["status"],
        "paymentStatus": row["payment_status"],
        "bookingSource": row.get("booking_source") or "Website",
        "specialRequest": row.get("special_request") or "",
        "createdAt": row.get("created_at"),
    }


def find_or_create_guest(query_fn, hotel_id, guest):
    name = (guest.get("name") or "").strip()
    phone = (guest.get("phone") or "").strip()
    email = (guest.get("email") or "").strip()

    if not name or not phone:
        raise ValueError("Guest name and phone are required.")

    if phone:
        existing = query_fn(
            "SELECT id FROM customers WHERE hotel_id=? AND phone=?",
            (hotel_id, phone),
            one=True,
        )
        if existing:
            return existing["id"]

    if email:
        existing = query_fn(
            "SELECT id FROM customers WHERE hotel_id=? AND email=?",
            (hotel_id, email),
            one=True,
        )
        if existing:
            query_fn(
                """UPDATE customers SET name=?, phone=?, email=?, address=?, gender=?, age=?
                   WHERE id=? AND hotel_id=?""",
                (
                    name,
                    phone,
                    email or None,
                    guest.get("address"),
                    guest.get("gender"),
                    int(guest["age"]) if guest.get("age") else None,
                    existing["id"],
                    hotel_id,
                ),
                commit=True,
            )
            return existing["id"]

    return query_fn(
        """INSERT INTO customers(name,phone,email,address,id_proof_type,id_proof_number,gender,age,id_proof,hotel_id)
           VALUES(?,?,?,?,?,?,?,?,?,?)""",
        (
            name,
            phone,
            email or None,
            guest.get("address"),
            guest.get("idProofType") or guest.get("id_proof_type") or "Aadhar",
            guest.get("idProofNumber") or guest.get("id_proof_number") or "",
            guest.get("gender"),
            int(guest["age"]) if guest.get("age") else None,
            guest.get("idProofNumber") or guest.get("id_proof_number") or "",
            hotel_id,
        ),
        commit=True,
    )


def get_available_rooms_for_hotel(query_fn, hotel_id, checkin, checkout, num_guests, calc_room_charges_fn, nights_fn):
    rooms = query_fn(
        """SELECT * FROM rooms WHERE hotel_id=?
           AND status NOT IN ('Maintenance','Cleaning')
           ORDER BY price ASC, room_no ASC""",
        (hotel_id,),
    )
    available = []
    for room in rooms:
        if room_has_overlap_public(query_fn, room["id"], checkin, checkout):
            continue
        if num_guests and room["capacity"] < num_guests:
            continue
        available.append(public_room_to_dict(room, checkin, checkout, calc_room_charges_fn, nights_fn))
    return available


def create_online_payment_intent(query_fn, booking_id, hotel_id, amount, payment_mode, gateway="mock", metadata=None):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    gateway_order_id = f"order_{booking_id}_{int(time())}"
    return query_fn(
        """INSERT INTO online_payment_intents(
               booking_id,hotel_id,amount,currency,payment_mode,gateway,gateway_order_id,status,metadata,created_at,updated_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
        (
            booking_id,
            hotel_id,
            amount,
            "INR",
            payment_mode,
            gateway,
            gateway_order_id,
            "created",
            metadata or "",
            now,
            now,
        ),
        commit=True,
    )


def notify_online_booking(query_fn, hotel_id, room_no, booking_number):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    source_key = f"online_booking_{booking_number}"
    if query_fn(
        "SELECT id FROM notifications WHERE hotel_id=? AND source_key=?",
        (hotel_id, source_key),
        one=True,
    ):
        return
    query_fn(
        """INSERT INTO notifications(hotel_id,title,message,type,category,is_read,created_at,action_url,source_key,is_demo)
           VALUES(?,?,?,?,?,0,?,?,?,0)""",
        (
            hotel_id,
            "New Online Booking",
            f"New online booking received for Room {room_no}",
            "GREEN",
            "ONLINE_BOOKING",
            now,
            f"/bookings?q={booking_number}",
            source_key,
        ),
        commit=True,
    )


def register_public_booking_routes(app, query, deps):
    calc_room_charges = deps["calc_room_charges"]
    nights_between = deps["nights_between"]
    receipt_number = deps["receipt_number"]
    update_booking_payment_status = deps["update_booking_payment_status"]
    booking_paid_amount = deps["booking_paid_amount"]
    unavailable_statuses = deps["unavailable_room_statuses"]

    def validate_hotel(hotel_id):
        hotel = query(
            "SELECT * FROM hotels WHERE id=? AND subscription_status='Active'",
            (hotel_id,),
            one=True,
        )
        if not hotel:
            return None, api_error("Hotel not found or not accepting bookings.", 404)
        return hotel, None

    def validate_dates(checkin, checkout):
        if not checkin or not checkout:
            return api_error("Check-in and check-out dates are required.")
        try:
            if datetime.strptime(checkout, "%Y-%m-%d") <= datetime.strptime(checkin, "%Y-%m-%d"):
                return api_error("Check-out must be after check-in.")
        except ValueError:
            return api_error("Invalid date format. Use YYYY-MM-DD.")
        return None

    @app.route("/api/public/hotels")
    @public_rate_limit
    def api_public_hotels():
        rows = query(
            """SELECT id, hotel_name, hotel_code, city, state, address, phone, email
               FROM hotels WHERE subscription_status='Active' ORDER BY hotel_name"""
        )
        return api_ok(hotels=[public_hotel_to_dict(r) for r in rows])

    @app.route("/api/public/hotels/<int:hotel_id>/rooms/available")
    @public_rate_limit
    def api_public_available_rooms(hotel_id):
        hotel, err = validate_hotel(hotel_id)
        if err:
            return err
        checkin = (request.args.get("checkIn") or request.args.get("checkin") or "").strip()
        checkout = (request.args.get("checkOut") or request.args.get("checkout") or "").strip()
        num_guests = int(request.args.get("guests") or request.args.get("numGuests") or 1)
        date_err = validate_dates(checkin, checkout)
        if date_err:
            return date_err
        rooms = get_available_rooms_for_hotel(
            query, hotel_id, checkin, checkout, num_guests, calc_room_charges, nights_between
        )
        return api_ok(
            hotel=public_hotel_to_dict(hotel),
            checkIn=checkin,
            checkOut=checkout,
            nights=nights_between(checkin, checkout),
            rooms=rooms,
        )

    @app.route("/api/public/bookings", methods=["POST"])
    @public_rate_limit
    def api_public_create_booking():
        data = request.get_json(silent=True) or {}
        hotel_id = int(data.get("hotelId") or data.get("hotel_id") or 0)
        hotel, err = validate_hotel(hotel_id)
        if err:
            return err

        room_id = int(data.get("roomId") or data.get("room_id") or 0)
        checkin = (data.get("checkIn") or data.get("checkin") or "").strip()
        checkout = (data.get("checkOut") or data.get("checkout") or "").strip()
        adults = int(data.get("adults") or 1)
        children = int(data.get("children") or 0)
        num_guests = int(data.get("numGuests") or data.get("num_guests") or adults + children or 1)
        special_request = (data.get("specialRequest") or data.get("special_request") or "").strip()
        guest = data.get("guest") or data

        date_err = validate_dates(checkin, checkout)
        if date_err:
            return date_err

        if not room_id:
            return api_error("Room selection is required.")

        room = query(
            "SELECT * FROM rooms WHERE id=? AND hotel_id=?",
            (room_id, hotel_id),
            one=True,
        )
        if not room:
            return api_error("Room not found for this hotel.", 404)
        if room["status"] in unavailable_statuses:
            return api_error(f"Room {room['room_no']} is not available.")
        if room_has_overlap_public(query, room_id, checkin, checkout):
            return api_error("Room is no longer available for the selected dates.", 409)
        if num_guests > room["capacity"]:
            return api_error(f"Room capacity is {room['capacity']} guests.")

        try:
            customer_id = find_or_create_guest(query, hotel_id, guest)
        except ValueError as exc:
            return api_error(str(exc))

        total = calc_room_charges(float(room["price"]), checkin, checkout)
        booking_number = generate_booking_number(query)
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        bid = query(
            """INSERT INTO bookings(
                   customer_id,room_id,checkin,checkout,num_guests,adults,children,
                   booking_source,special_request,total_amount,status,payment_status,notes,hotel_id,booking_number,created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                customer_id,
                room_id,
                checkin,
                checkout,
                num_guests,
                adults,
                children,
                "Website",
                special_request,
                total,
                "Pending",
                "Pending",
                special_request,
                hotel_id,
                booking_number,
                now,
            ),
            commit=True,
        )

        booking = query(
            """
            SELECT b.*, c.name customer_name, c.phone, c.email, r.room_no, r.room_type, h.hotel_name
            FROM bookings b
            JOIN customers c ON b.customer_id=c.id
            JOIN rooms r ON b.room_id=r.id
            JOIN hotels h ON b.hotel_id=h.id
            WHERE b.id=?
            """,
            (bid,),
            one=True,
        )
        booking = dict(booking)
        booking["paid_amount"] = 0
        return api_ok(booking=public_booking_to_dict(booking)), 201

    @app.route("/api/public/bookings/<int:booking_id>/payment", methods=["POST"])
    @public_rate_limit
    def api_public_booking_payment(booking_id):
        data = request.get_json(silent=True) or {}
        booking = query(
            """
            SELECT b.*, c.name customer_name, c.phone, c.email, r.room_no, r.room_type, r.hotel_id room_hotel_id
            FROM bookings b
            JOIN customers c ON b.customer_id=c.id
            JOIN rooms r ON b.room_id=r.id
            WHERE b.id=? AND b.booking_source='Website'
            """,
            (booking_id,),
            one=True,
        )
        if not booking:
            return api_error("Online booking not found.", 404)
        if booking["status"] == "Confirmed":
            return api_error("Booking is already confirmed.", 400)
        if booking["status"] in ("Cancelled", "Checked-out"):
            return api_error("Booking cannot accept payment.", 400)

        amount = float(data.get("amount") or 0)
        payment_mode = (data.get("paymentMode") or data.get("payment_mode") or "UPI").upper()
        payment_type = (data.get("paymentType") or data.get("payment_type") or "ADVANCE").upper()
        gateway = (data.get("gateway") or "mock").lower()
        mock_success = data.get("mockSuccess", True)

        if payment_mode not in ONLINE_PAYMENT_MODES:
            return api_error(f"Invalid payment mode. Use: {', '.join(ONLINE_PAYMENT_MODES)}")
        if gateway not in ONLINE_PAYMENT_GATEWAYS:
            return api_error(f"Invalid gateway. Use: {', '.join(ONLINE_PAYMENT_GATEWAYS)}")
        if amount <= 0:
            return api_error("Payment amount must be greater than zero.")

        total = float(booking["total_amount"] or 0)
        already_paid = booking_paid_amount(booking_id)
        outstanding = max(total - already_paid, 0)
        if amount > outstanding + 0.01:
            return api_error(f"Payment amount exceeds outstanding balance (₹{outstanding:,.0f}).")

        min_advance = round(total * 0.3, 2)
        if payment_type == "ADVANCE" and already_paid <= 0 and amount < min_advance:
            return api_error(f"Minimum advance payment is ₹{min_advance:,.0f} (30% of total).")

        if not mock_success and gateway == "mock":
            intent_id = create_online_payment_intent(
                query,
                booking_id,
                booking["hotel_id"],
                amount,
                payment_mode,
                gateway=gateway,
                metadata="mock_failed",
            )
            query(
                "UPDATE online_payment_intents SET status='failed', updated_at=? WHERE id=?",
                (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), intent_id),
                commit=True,
            )
            return api_error("Payment failed. Please try again.", 402)

        intent_id = create_online_payment_intent(
            query,
            booking_id,
            booking["hotel_id"],
            amount,
            payment_mode,
            gateway=gateway,
            metadata=f"type={payment_type}",
        )
        gateway_payment_id = f"pay_{booking_id}_{int(time())}"
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        query(
            """UPDATE online_payment_intents
               SET status='succeeded', gateway_payment_id=?, updated_at=?
               WHERE id=?""",
            (gateway_payment_id, now, intent_id),
            commit=True,
        )

        query(
            """INSERT INTO payments(booking_id,amount,payment_mode,receipt_number,payment_date,notes)
               VALUES(?,?,?,?,?,?)""",
            (
                booking_id,
                amount,
                payment_mode.replace("_", " ").title(),
                receipt_number(),
                now,
                f"Online {payment_type.lower()} via {gateway}",
            ),
            commit=True,
        )
        update_booking_payment_status(booking_id)

        paid = booking_paid_amount(booking_id)
        booking_status = "Confirmed" if paid > 0 else "Pending"
        query(
            "UPDATE bookings SET status=? WHERE id=?",
            (booking_status, booking_id),
            commit=True,
        )
        if booking_status == "Confirmed":
            query(
                "UPDATE rooms SET status='Reserved' WHERE id=? AND hotel_id=?",
                (booking["room_id"], booking["hotel_id"]),
                commit=True,
            )
            notify_online_booking(
                query,
                booking["hotel_id"],
                booking["room_no"],
                booking["booking_number"],
            )

        refreshed = query(
            """
            SELECT b.*, c.name customer_name, c.phone, c.email, r.room_no, r.room_type, h.hotel_name
            FROM bookings b
            JOIN customers c ON b.customer_id=c.id
            JOIN rooms r ON b.room_id=r.id
            JOIN hotels h ON b.hotel_id=h.id
            WHERE b.id=?
            """,
            (booking_id,),
            one=True,
        )
        refreshed = dict(refreshed)
        refreshed["paid_amount"] = paid
        return api_ok(
            booking=public_booking_to_dict(refreshed),
            payment={
                "intentId": intent_id,
                "gateway": gateway,
                "gatewayOrderId": f"order_{booking_id}_{intent_id}",
                "gatewayPaymentId": gateway_payment_id,
                "amount": amount,
                "paymentMode": payment_mode,
                "status": "succeeded",
            },
        )

    @app.route("/api/public/bookings/<booking_number>")
    @public_rate_limit
    def api_public_get_booking(booking_number):
        booking = query(
            """
            SELECT b.*, c.name customer_name, c.phone, c.email, r.room_no, r.room_type, h.hotel_name
            FROM bookings b
            JOIN customers c ON b.customer_id=c.id
            JOIN rooms r ON b.room_id=r.id
            JOIN hotels h ON b.hotel_id=h.id
            WHERE b.booking_number=? AND b.booking_source='Website'
            """,
            (booking_number,),
            one=True,
        )
        if not booking:
            return api_error("Booking not found.", 404)
        booking = dict(booking)
        booking["paid_amount"] = booking_paid_amount(booking["id"])
        return api_ok(booking=public_booking_to_dict(booking))
