"""Idempotent multi-hotel demo seed data for GrandStay HMS."""
from datetime import date, datetime, timedelta


HOTEL_DEFINITIONS = [
    {
        "code": "GRANDSTAY",
        "name": "GrandStay Hotel",
        "address": "15 Rajpur Road, Near Clock Tower",
        "city": "Dehradun",
        "state": "Uttarakhand",
        "phone": "01352745001",
        "email": "info@grandstay.com",
        "gst": "GSTIN-05AAAAA0000A1Z5",
        "owner_name": "Ayush Sharma",
        "owner_email": "owner@grandstay.com",
        "plan": "Professional",
        "room_prefix": "1",
        "price_factor": 1.0,
        "target_rooms": 18,
        "target_staff": 11,
        "target_revenue": 45000,
        "target_occupied": 11,
    },
    {
        "code": "ROYALVISTA",
        "name": "Royal Vista Inn",
        "address": "22 MI Road, Near Hawa Mahal",
        "city": "Jaipur",
        "state": "Rajasthan",
        "phone": "01412345002",
        "email": "stay@royalvista.in",
        "gst": "GSTIN-08BBBBB0000B2Z6",
        "owner_name": "Vikram Rathore",
        "owner_email": "vikram@royalvista.in",
        "plan": "Enterprise",
        "room_prefix": "2",
        "price_factor": 1.15,
        "target_rooms": 12,
        "target_staff": 8,
        "target_revenue": 30000,
        "target_occupied": 5,
    },
    {
        "code": "OCEANPEARL",
        "name": "Ocean Pearl Suites",
        "address": "8 Calangute Beach Road, Bardez",
        "city": "Goa",
        "state": "Goa",
        "phone": "08322245003",
        "email": "hello@oceanpearlsuites.com",
        "gst": "GSTIN-30CCCCC0000C3Z7",
        "owner_name": "Maria D'Souza",
        "owner_email": "maria@oceanpearlsuites.com",
        "plan": "Starter",
        "room_prefix": "3",
        "price_factor": 1.25,
        "target_rooms": 25,
        "target_staff": 16,
        "target_revenue": 80000,
        "target_occupied": 17,
    },
]


def _hotel_seeded(query, hotel_id, definition):
    rooms = query("SELECT COUNT(*) c FROM rooms WHERE hotel_id=?", (hotel_id,), one=True)["c"]
    users = query("SELECT COUNT(*) c FROM users WHERE hotel_id=?", (hotel_id,), one=True)["c"]
    target_rooms = definition.get("target_rooms", 10)
    return rooms >= target_rooms and users >= 5


def ensure_super_admin(query):
    users = [
        ("superadmin", "admin123", "Super Admin User", "SUPER_ADMIN", "Active", None),
    ]
    for u in users:
        if not query("SELECT id FROM users WHERE username=?", (u[0],), one=True):
            query(
                "INSERT INTO users(username,password,full_name,role,status,hotel_id) VALUES(?,?,?,?,?,?)",
                u,
                commit=True,
            )
        else:
            query(
                "UPDATE users SET role='SUPER_ADMIN', hotel_id=NULL, status='Active' WHERE username=?",
                (u[0],),
                commit=True,
            )


def ensure_hotel(query, definition):
    row = query("SELECT id FROM hotels WHERE hotel_code=?", (definition["code"],), one=True)
    if row:
        return row["id"]
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return query(
        """INSERT INTO hotels(hotel_name,hotel_code,address,city,state,country,phone,email,
           gst_number,owner_name,owner_email,subscription_plan,subscription_status,created_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            definition["name"],
            definition["code"],
            definition["address"],
            definition["city"],
            definition["state"],
            "India",
            definition["phone"],
            definition["email"],
            definition["gst"],
            definition["owner_name"],
            definition["owner_email"],
            definition["plan"],
            "Active",
            now,
        ),
        commit=True,
    )


def seed_hotel_users(query, hotel_id, code):
    slug = code.lower().replace("stay", "stay").replace("vista", "vista")
    if code == "GRANDSTAY":
        prefix = "grandstay"
    elif code == "ROYALVISTA":
        prefix = "royal"
    else:
        prefix = "ocean"

    users = [
        (f"{prefix}_admin", "admin123", f"{prefix.title()} Hotel Admin", "HOTEL_ADMIN"),
        (f"{prefix}_manager", "manager123", f"{prefix.title()} Operations Manager", "MANAGER"),
        (f"{prefix}_rec1", "rec123", f"{prefix.title()} Receptionist One", "RECEPTIONIST"),
        (f"{prefix}_rec2", "rec123", f"{prefix.title()} Receptionist Two", "RECEPTIONIST"),
        (f"{prefix}_hk1", "hk123", f"{prefix.title()} Housekeeping Lead", "HOUSEKEEPING"),
        (f"{prefix}_hk2", "hk123", f"{prefix.title()} Housekeeping Staff", "HOUSEKEEPING"),
        (f"{prefix}_accountant", "acc123", f"{prefix.title()} Accountant", "ACCOUNTANT"),
        (f"{prefix}_maint", "maint123", f"{prefix.title()} Maintenance Tech", "MAINTENANCE"),
    ]
    if code == "GRANDSTAY":
        users.append(("admin", "admin123", "GrandStay Hotel Admin", "HOTEL_ADMIN"))

    for username, password, full_name, role in users:
        if query("SELECT id FROM users WHERE username=?", (username,), one=True):
            continue
        query(
            "INSERT INTO users(username,password,full_name,role,status,hotel_id) VALUES(?,?,?,?,?,?)",
            (username, password, full_name, role, "Active", hotel_id),
            commit=True,
        )


def seed_hotel_employees(query, hotel_id, city, definition):
    target_staff = definition.get("target_staff", 9)
    existing = query("SELECT COUNT(*) c FROM employees WHERE hotel_id=?", (hotel_id,), one=True)["c"]
    if existing >= target_staff:
        return [r["id"] for r in query("SELECT id FROM employees WHERE hotel_id=?", (hotel_id,))]

    extra_staff_by_code = {
        "GRANDSTAY": [
            ("Rohit Sharma", "Manager", "Management", 52000, "Morning"),
            ("Anita Verma", "Receptionist", "Front Desk", 28000, "Morning"),
            ("Neha Kapoor", "Receptionist", "Front Desk", 26500, "Evening"),
            ("Rahul Meena", "Housekeeping", "Housekeeping", 20500, "Morning"),
            ("Vikram Das", "Housekeeping", "Housekeeping", 19500, "Evening"),
            ("Pooja Singh", "Chef", "Kitchen", 35000, "Night"),
            ("Suresh Kumar", "Maintenance", "Maintenance", 22500, "Day"),
            ("Kavita Nair", "Accountant", "Management", 38000, "Morning"),
            ("Aman Joshi", "Bellboy", "Front Desk", 18000, "Rotational"),
            ("Divya Chauhan", "Concierge", "Front Desk", 24000, "Morning"),
            ("Harsh Singh", "Security", "Operations", 20000, "Night"),
        ],
        "ROYALVISTA": [
            ("Vikram Rathore Jr", "Manager", "Management", 48000, "Morning"),
            ("Anjali Jain", "Receptionist", "Front Desk", 26000, "Morning"),
            ("Mohit Agarwal", "Housekeeping", "Housekeeping", 19000, "Morning"),
            ("Pooja Singh", "Chef", "Kitchen", 32000, "Night"),
            ("Sanjay Patel", "Maintenance", "Maintenance", 21000, "Day"),
            ("Meera Iyer", "Accountant", "Management", 36000, "Morning"),
            ("Arjun Malhotra", "Bellboy", "Front Desk", 17500, "Rotational"),
            ("Nidhi Sharma", "Housekeeping", "Housekeeping", 18500, "Evening"),
        ],
        "OCEANPEARL": [
            ("Francis Fernandes", "Manager", "Management", 55000, "Morning"),
            ("Maria D'Souza Jr", "Receptionist", "Front Desk", 30000, "Morning"),
            ("Sunita Naik", "Receptionist", "Front Desk", 28500, "Evening"),
            ("Ravi Kulkarni", "Housekeeping", "Housekeeping", 22000, "Morning"),
            ("Elena Rodrigues", "Housekeeping", "Housekeeping", 21000, "Evening"),
            ("Jason D'Silva", "Chef", "Kitchen", 40000, "Night"),
            ("Ananya Desai", "Maintenance", "Maintenance", 24000, "Day"),
            ("Pranav Kamat", "Accountant", "Management", 42000, "Morning"),
            ("Sofia Mendes", "Bellboy", "Front Desk", 19000, "Rotational"),
            ("Nikhil Borkar", "Concierge", "Front Desk", 26000, "Morning"),
            ("Leena Pereira", "Housekeeping", "Housekeeping", 20500, "Night"),
            ("Carlos Alvares", "Security", "Operations", 21500, "Night"),
            ("Rina D'Souza", "Spa Therapist", "Wellness", 28000, "Morning"),
            ("Amit Naik", "Pool Attendant", "Operations", 19500, "Day"),
            ("Priya Kamat", "Laundry", "Housekeeping", 18000, "Morning"),
            ("Vivek Desai", "Bar Staff", "Kitchen", 23000, "Evening"),
        ],
    }
    staff = extra_staff_by_code.get(definition["code"], extra_staff_by_code["GRANDSTAY"])[:target_staff]
    phone_base = 9876500000 + hotel_id * 100
    ids = [r["id"] for r in query("SELECT id FROM employees WHERE hotel_id=?", (hotel_id,))]
    for i, (name, role, dept, salary, shift) in enumerate(staff):
        if query("SELECT id FROM employees WHERE hotel_id=? AND name=?", (hotel_id, name), one=True):
            continue
        phone = str(phone_base + i)
        email = f"{name.split()[0].lower()}.{city.lower().replace(' ', '')}@hotel.local"
        eid = query(
            """INSERT INTO employees(name,phone,email,role,designation,department,salary,shift,joining_date,status,hotel_id)
               VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            (name, phone, email, role, role, dept, salary, shift, "2024-01-15", "Active", hotel_id),
            commit=True,
        )
        ids.append(eid)
    return ids


def _room_type_for_index(index, pf):
    tiers = [
        ("Standard", 1, int(1500 * pf), 2),
        ("Deluxe", 2, int(2800 * pf), 2),
        ("Super Deluxe", 3, int(4500 * pf), 3),
        ("Luxury", 4, int(7500 * pf), 4),
        ("Suite", 5, int(12000 * pf), 4),
    ]
    tier = tiers[min(index // 4, len(tiers) - 1)]
    return tier[0], tier[1], tier[2], tier[3]


def seed_hotel_rooms(query, hotel_id, definition):
    pf = definition["price_factor"]
    prefix = definition["room_prefix"]
    target_rooms = definition.get("target_rooms", 14)
    target_occupied = definition.get("target_occupied", 3)
    amenities = "WiFi, TV, AC, Mini Bar"
    room_ids = []

    for index in range(target_rooms):
        num = f"{index + 1:02d}"
        room_no = f"{prefix}{num}"
        if query("SELECT id FROM rooms WHERE room_no=? AND hotel_id=?", (room_no, hotel_id), one=True):
            continue
        rtype, floor, price, cap = _room_type_for_index(index, pf)
        status = "Occupied" if index < target_occupied else "Available"
        if index == target_rooms - 1:
            status = "Maintenance"
        elif index == target_rooms - 2:
            status = "Cleaning"
        rid = query(
            """INSERT INTO rooms(room_no,room_type,category,floor,price,capacity,status,amenities,hotel_id)
               VALUES(?,?,?,?,?,?,?,?,?)""",
            (room_no, rtype, rtype, floor, price, cap, status, amenities, hotel_id),
            commit=True,
        )
        room_ids.append(rid)

    _sync_room_occupancy(query, hotel_id, target_occupied)
    return room_ids


def _sync_room_occupancy(query, hotel_id, target_occupied):
    occupied = query(
        "SELECT COUNT(*) c FROM rooms WHERE hotel_id=? AND status='Occupied'",
        (hotel_id,),
        one=True,
    )["c"]
    if occupied == target_occupied:
        return
    if occupied < target_occupied:
        need = target_occupied - occupied
        available = query(
            """SELECT id FROM rooms WHERE hotel_id=? AND status='Available'
               ORDER BY id LIMIT ?""",
            (hotel_id, need),
        )
        for room in available:
            query(
                "UPDATE rooms SET status='Occupied' WHERE id=? AND hotel_id=?",
                (room["id"], hotel_id),
                commit=True,
            )
    else:
        excess = occupied - target_occupied
        occupied_rooms = query(
            """SELECT id FROM rooms WHERE hotel_id=? AND status='Occupied'
               ORDER BY id DESC LIMIT ?""",
            (hotel_id, excess),
        )
        for room in occupied_rooms:
            query(
                "UPDATE rooms SET status='Available' WHERE id=? AND hotel_id=?",
                (room["id"], hotel_id),
                commit=True,
            )


def seed_hotel_customers(query, hotel_id, city):
    guests_by_city = {
        "Dehradun": [
            ("Ayush Sharma", "9876543210", "ayush.sharma@gmail.com", "Male", 28),
            ("Priya Mehta", "9876543211", "priya.mehta@gmail.com", "Female", 32),
            ("Rohan Verma", "9876543212", "rohan.v@gmail.com", "Male", 35),
            ("Sneha Kapoor", "9876543213", "sneha.k@gmail.com", "Female", 29),
            ("Karan Singh", "9876543214", "karan.singh@gmail.com", "Male", 41),
            ("Neha Joshi", "9876543215", "neha.joshi@gmail.com", "Female", 27),
            ("Rahul Gupta", "9876543216", "rahul.gupta@gmail.com", "Male", 33),
            ("Aditi Sharma", "9876543217", "aditi.sharma@gmail.com", "Female", 30),
            ("Ishita Arora", "9876543223", "ishita.arora@gmail.com", "Female", 24),
            ("Yash Raj", "9876543224", "yash.raj@gmail.com", "Male", 29),
            ("Deepak Nair", "9876543225", "deepak.nair@gmail.com", "Male", 42),
            ("Kavita Reddy", "9876543226", "kavita.reddy@gmail.com", "Female", 28),
        ],
        "Jaipur": [
            ("Vikram Rathore", "9829012345", "vikram.rathore@gmail.com", "Male", 38),
            ("Anjali Jain", "9829012346", "anjali.jain@gmail.com", "Female", 26),
            ("Mohit Agarwal", "9829012347", "mohit.agarwal@gmail.com", "Male", 34),
            ("Pooja Singh", "9829012348", "pooja.singh@gmail.com", "Female", 31),
            ("Arjun Malhotra", "9829012349", "arjun.m@gmail.com", "Male", 36),
            ("Meera Iyer", "9829012350", "meera.iyer@gmail.com", "Female", 33),
            ("Sanjay Patel", "9829012351", "sanjay.patel@gmail.com", "Male", 45),
            ("Amit Bose", "9829012352", "amit.bose@gmail.com", "Male", 37),
            ("Divya Chauhan", "9829012353", "divya.chauhan@gmail.com", "Female", 27),
            ("Harshvardhan Singh", "9829012354", "harsh.singh@gmail.com", "Male", 40),
            ("Nidhi Sharma", "9829012355", "nidhi.sharma@gmail.com", "Female", 25),
            ("Rakesh Meena", "9829012356", "rakesh.meena@gmail.com", "Male", 32),
        ],
        "Goa": [
            ("Maria D'Souza", "9832012345", "maria.dsouza@gmail.com", "Female", 35),
            ("Francis Fernandes", "9832012346", "francis.f@gmail.com", "Male", 39),
            ("Sunita Naik", "9832012347", "sunita.naik@gmail.com", "Female", 28),
            ("Ravi Kulkarni", "9832012348", "ravi.kulkarni@gmail.com", "Male", 31),
            ("Elena Rodrigues", "9832012349", "elena.r@gmail.com", "Female", 26),
            ("Jason D'Silva", "9832012350", "jason.dsilva@gmail.com", "Male", 33),
            ("Ananya Desai", "9832012351", "ananya.desai@gmail.com", "Female", 24),
            ("Pranav Kamat", "9832012352", "pranav.kamat@gmail.com", "Male", 29),
            ("Sofia Mendes", "9832012353", "sofia.mendes@gmail.com", "Female", 30),
            ("Nikhil Borkar", "9832012354", "nikhil.borkar@gmail.com", "Male", 36),
            ("Leena Pereira", "9832012355", "leena.pereira@gmail.com", "Female", 27),
            ("Carlos Alvares", "9832012356", "carlos.a@gmail.com", "Male", 41),
        ],
    }
    guests = guests_by_city.get(city, guests_by_city["Dehradun"])
    ids = []
    for i, (name, phone, email, gender, age) in enumerate(guests):
        existing = query(
            "SELECT id FROM customers WHERE hotel_id=? AND phone=?",
            (hotel_id, phone),
            one=True,
        )
        if existing:
            ids.append(existing["id"])
            continue
        cid = query(
            """INSERT INTO customers(name,phone,email,address,id_proof_type,id_proof_number,gender,age,id_proof,hotel_id)
               VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (
                name,
                phone,
                email,
                city,
                "Aadhar",
                f"AADHAR-{hotel_id}{i:04d}",
                gender,
                age,
                f"AADHAR-{hotel_id}{i:04d}",
                hotel_id,
            ),
            commit=True,
        )
        ids.append(cid)
    return ids


def seed_hotel_inventory(query, hotel_id, code):
    today = datetime.now().strftime("%Y-%m-%d")
    tag = code[:3]
    items = [
        (f"Bath Towels [{tag}]", "Linens", 45, "pcs", 180, 50, "Linen World"),
        (f"Hand Towels [{tag}]", "Linens", 6, "pcs", 90, 20, "Linen World"),
        (f"Shampoo Bottles [{tag}]", "Toiletries", 80, "pcs", 25, 30, "CleanCo"),
        (f"Soap Bars [{tag}]", "Toiletries", 5, "pcs", 15, 25, "CleanCo"),
        (f"Water Bottles [{tag}]", "Beverages", 120, "pcs", 30, 40, "Aqua Supplies"),
        (f"Tea Kits [{tag}]", "Room Service", 90, "pcs", 50, 25, "FoodMart"),
        (f"Coffee Sachets [{tag}]", "Room Service", 70, "pcs", 60, 20, "FoodMart"),
        (f"Laundry Detergent [{tag}]", "Housekeeping", 18, "L", 250, 15, "CleanCo"),
        (f"Light Bulbs [{tag}]", "Maintenance", 35, "pcs", 80, 12, "ElectroHub"),
        (f"Toilet Paper [{tag}]", "Toiletries", 8, "rolls", 45, 15, "CleanCo"),
    ]
    for item in items:
        if query(
            "SELECT id FROM inventory WHERE hotel_id=? AND item_name=?",
            (hotel_id, item[0]),
            one=True,
        ):
            continue
        query(
            """INSERT INTO inventory(item_name,category,quantity,unit,price,reorder_level,supplier_name,last_updated,hotel_id)
               VALUES(?,?,?,?,?,?,?,?,?)""",
            (*item, today, hotel_id),
            commit=True,
        )


def seed_hotel_bookings(query, hotel_id, customer_ids, room_ids, calc_room_charges):
    existing = query("SELECT COUNT(*) c FROM bookings WHERE hotel_id=?", (hotel_id,), one=True)["c"]
    if existing >= 5:
        return [r["id"] for r in query("SELECT id FROM bookings WHERE hotel_id=?", (hotel_id,))]

    today = date.today()

    def d(offset):
        return str(today + timedelta(days=offset))

    rooms = query(
        "SELECT id, price, status FROM rooms WHERE hotel_id=? ORDER BY id",
        (hotel_id,),
    )
    if len(rooms) < 8 or len(customer_ids) < 8:
        return []

    booking_specs = [
        (0, 0, -3, 2, 2, "Checked-in", "Partial"),
        (1, 1, -5, -1, 1, "Checked-out", "Paid"),
        (2, 2, 0, 3, 2, "Reserved", "Pending"),
        (3, 3, 1, 5, 3, "Reserved", "Pending"),
        (4, 4, -2, 1, 2, "Checked-in", "Pending"),
        (5, 5, 2, 6, 2, "Reserved", "Partial"),
        (6, 6, -10, -8, 2, "Checked-out", "Paid"),
        (7, 7, 0, 2, 1, "Cancelled", "Pending"),
    ]

    booking_ids = []
    for ci, ri, cin_off, cout_off, guests, status, pay_status in booking_specs:
        cust_id = customer_ids[ci % len(customer_ids)]
        room = rooms[ri % len(rooms)]
        checkin, checkout = d(cin_off), d(cout_off)
        if datetime.strptime(checkout, "%Y-%m-%d") <= datetime.strptime(checkin, "%Y-%m-%d"):
            checkout = d(cin_off + 2)
        total = calc_room_charges(room["price"], checkin, checkout)
        bid = query(
            """INSERT INTO bookings(customer_id,room_id,checkin,checkout,num_guests,status,payment_status,total_amount,hotel_id)
               VALUES(?,?,?,?,?,?,?,?,?)""",
            (cust_id, room["id"], checkin, checkout, guests, status, pay_status, total, hotel_id),
            commit=True,
        )
        booking_ids.append(bid)
        if status == "Checked-in":
            query("UPDATE rooms SET status='Occupied' WHERE id=? AND hotel_id=?", (room["id"], hotel_id), commit=True)
        elif status == "Reserved":
            query("UPDATE rooms SET status='Reserved' WHERE id=? AND hotel_id=?", (room["id"], hotel_id), commit=True)
        elif status == "Checked-out":
            query("UPDATE rooms SET status='Cleaning' WHERE id=? AND hotel_id=?", (room["id"], hotel_id), commit=True)

    return booking_ids


def seed_hotel_payments(query, hotel_id, receipt_number_fn, target_revenue=None):
    bookings = query(
        """SELECT id, total_amount, payment_status FROM bookings
           WHERE hotel_id=? AND payment_status IN ('Paid','Partial')""",
        (hotel_id,),
    )
    for b in bookings:
        if query("SELECT id FROM payments WHERE booking_id=?", (b["id"],), one=True):
            continue
        amt = b["total_amount"] if b["payment_status"] == "Paid" else float(b["total_amount"]) * 0.45
        query(
            """INSERT INTO payments(booking_id,amount,payment_mode,receipt_number,payment_date)
               VALUES(?,?,?,?,?)""",
            (
                b["id"],
                amt,
                "UPI",
                receipt_number_fn(),
                datetime.now().strftime("%Y-%m-%d %H:%M"),
            ),
            commit=True,
        )

    if target_revenue is None:
        return

    current = float(
        query(
            """SELECT COALESCE(SUM(p.amount),0) t FROM payments p
               JOIN bookings b ON p.booking_id=b.id WHERE b.hotel_id=?""",
            (hotel_id,),
            one=True,
        )["t"]
        or 0
    )
    if current >= target_revenue:
        return

    gap = target_revenue - current
    booking = query(
        "SELECT id FROM bookings WHERE hotel_id=? ORDER BY id LIMIT 1",
        (hotel_id,),
        one=True,
    )
    if not booking:
        return

    source_key = f"seed_revenue_topup_{hotel_id}"
    if query(
        "SELECT id FROM payments WHERE receipt_number=?",
        (source_key,),
        one=True,
    ):
        return

    query(
        """INSERT INTO payments(booking_id,amount,payment_mode,receipt_number,payment_date)
           VALUES(?,?,?,?,?)""",
        (
            booking["id"],
            gap,
            "Bank Transfer",
            source_key,
            datetime.now().strftime("%Y-%m-%d %H:%M"),
        ),
        commit=True,
    )


def supplement_hotel_demo_scale(query, hotel_id, definition, receipt_number_fn):
    """Bring existing hotels up to per-property demo targets without duplicating core seed."""
    target_rooms = definition.get("target_rooms", 14)
    target_staff = definition.get("target_staff", 9)
    target_occupied = definition.get("target_occupied", 3)
    target_revenue = definition.get("target_revenue")

    current_rooms = query("SELECT COUNT(*) c FROM rooms WHERE hotel_id=?", (hotel_id,), one=True)["c"]
    if current_rooms < target_rooms:
        seed_hotel_rooms(query, hotel_id, definition)
    else:
        _sync_room_occupancy(query, hotel_id, target_occupied)

    current_staff = query("SELECT COUNT(*) c FROM employees WHERE hotel_id=?", (hotel_id,), one=True)["c"]
    if current_staff < target_staff:
        seed_hotel_employees(query, hotel_id, definition["city"], definition)

    if target_revenue:
        seed_hotel_payments(query, hotel_id, receipt_number_fn, target_revenue=target_revenue)


def seed_hotel_housekeeping(query, hotel_id, employee_ids):
    rooms = query(
        "SELECT id FROM rooms WHERE hotel_id=? AND status IN ('Cleaning','Maintenance') LIMIT 2",
        (hotel_id,),
    )
    if not rooms:
        rooms = query("SELECT id FROM rooms WHERE hotel_id=? LIMIT 2", (hotel_id,))
    hk_staff = [e for e in employee_ids if e][:2]
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    notes = ["Post checkout deep cleaning", "Turndown service pending"]
    for i, room in enumerate(rooms[:2]):
        if query(
            "SELECT id FROM housekeeping_tasks WHERE hotel_id=? AND room_id=? AND status!='Completed'",
            (hotel_id, room["id"]),
            one=True,
        ):
            continue
        query(
            """INSERT INTO housekeeping_tasks(room_id,assigned_to,status,priority,notes,created_at,hotel_id)
               VALUES(?,?,?,?,?,?,?)""",
            (
                room["id"],
                hk_staff[i % len(hk_staff)] if hk_staff else None,
                "Pending" if i == 0 else "In Progress",
                "High" if i == 0 else "Medium",
                notes[i],
                now,
                hotel_id,
            ),
            commit=True,
        )


def seed_hotel_maintenance_request(query, hotel_id):
    maint_room = query(
        "SELECT id FROM rooms WHERE hotel_id=? AND status='Maintenance' LIMIT 1",
        (hotel_id,),
        one=True,
    )
    if not maint_room:
        maint_room = query("SELECT id FROM rooms WHERE hotel_id=? LIMIT 1", (hotel_id,), one=True)
    if not maint_room:
        return
    booking = query(
        "SELECT id FROM bookings WHERE hotel_id=? AND status='Checked-in' LIMIT 1",
        (hotel_id,),
        one=True,
    )
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    if query(
        "SELECT id FROM room_service_requests WHERE hotel_id=? AND request_type='Maintenance' LIMIT 1",
        (hotel_id,),
        one=True,
    ):
        return
    query(
        """INSERT INTO room_service_requests(booking_id,room_id,request_type,description,status,charges,add_to_bill,created_at,hotel_id)
           VALUES(?,?,?,?,?,?,?,?,?)""",
        (
            booking["id"] if booking else None,
            maint_room["id"],
            "Maintenance",
            "AC unit not cooling — guest reported issue",
            "Pending",
            0,
            0,
            now,
            hotel_id,
        ),
        commit=True,
    )


def seed_hotel_demo_notifications(query, hotel_id, hotel_name, city):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    demos = [
        (
            f"demo_pay_{hotel_id}",
            "Payment Pending",
            f"Outstanding guest balance pending at {hotel_name}.",
            "RED",
            "PENDING_PAYMENTS",
            "/payments",
        ),
        (
            f"demo_low_stock_{hotel_id}",
            "Low Inventory",
            f"Linens stock is below minimum level at {city} property.",
            "RED",
            "LOW_INVENTORY",
            "/inventory?stockStatus=low",
        ),
        (
            f"demo_checkin_{hotel_id}",
            "Upcoming Check-in",
            f"Guest arriving today at {hotel_name}.",
            "YELLOW",
            "UPCOMING_CHECKINS",
            "/bookings",
        ),
    ]
    for source_key, title, message, ntype, category, action_url in demos:
        if query(
            "SELECT id FROM notifications WHERE hotel_id=? AND source_key=?",
            (hotel_id, source_key),
            one=True,
        ):
            continue
        query(
            """INSERT INTO notifications(hotel_id,title,message,type,category,is_read,created_at,action_url,source_key,is_demo)
               VALUES(?,?,?,?,?,0,?,?,?,1)""",
            (hotel_id, title, message, ntype, category, now, action_url, source_key),
            commit=True,
        )


def seed_hotel_notifications(query, hotel_id, city, hotel_name, sync_fn):
    seed_hotel_demo_notifications(query, hotel_id, hotel_name, city)
    sync_fn(hotel_id)


def seed_single_hotel(query, definition, calc_room_charges, receipt_number_fn, sync_notifications_fn):
    hotel_id = ensure_hotel(query, definition)
    if not _hotel_seeded(query, hotel_id, definition):
        employee_ids = seed_hotel_employees(query, hotel_id, definition["city"], definition)
        seed_hotel_users(query, hotel_id, definition["code"])
        seed_hotel_rooms(query, hotel_id, definition)
        customer_ids = seed_hotel_customers(query, hotel_id, definition["city"])
        seed_hotel_inventory(query, hotel_id, definition["code"])
        seed_hotel_bookings(query, hotel_id, customer_ids, [], calc_room_charges)
        seed_hotel_payments(
            query,
            hotel_id,
            receipt_number_fn,
            target_revenue=definition.get("target_revenue"),
        )
        seed_hotel_housekeeping(query, hotel_id, employee_ids)
        seed_hotel_maintenance_request(query, hotel_id)
        seed_hotel_notifications(
            query, hotel_id, definition["city"], definition["name"], sync_notifications_fn
        )
    supplement_hotel_demo_scale(query, hotel_id, definition, receipt_number_fn)
    return hotel_id


def seed_multi_hotel_demo(query, calc_room_charges, receipt_number_fn, sync_notifications_fn):
    """Seed 3 hotels with isolated demo data. Idempotent — skips hotels already seeded."""
    ensure_super_admin(query)
    for definition in HOTEL_DEFINITIONS:
        seed_single_hotel(
            query,
            definition,
            calc_room_charges,
            receipt_number_fn,
            sync_notifications_fn,
        )
