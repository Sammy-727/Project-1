"""Pre-register demo workers and businesses on server startup."""
import json
from database import get_db, init_db, now_iso

BASE_LAT, BASE_LNG = 12.9716, 77.5946


def loc(km, locality="Central Bangalore"):
    import random
    lat = BASE_LAT + (km / 111) * (random.random() - 0.5)
    lng = BASE_LNG + (km / (111 * 0.998)) * (random.random() - 0.5)
    return {"lat": lat, "lng": lng, "locality": locality, "address": f"{km} km from MG Road"}


PLATFORM_WORKERS = [
    {
        "id": "w1", "full_name": "Rajesh Kumar", "phone": "9876543210", "email": "rajesh@hyrlo.com",
        "gender": "Male", "age": 32, "category": "Home Services", "specialization": "Electrician",
        "skills": "Wiring, AC Repair, Switch Installation", "experience": 8, "expected_pay": "₹800/day",
        "bio": "Licensed electrician, 8 years experience.", "km": 0.3,
    },
    {
        "id": "w2", "full_name": "Priya Sharma", "phone": "9876543211", "email": "priya@hyrlo.com",
        "gender": "Female", "age": 28, "category": "Salon", "specialization": "Hair Stylist",
        "skills": "Haircut, Coloring, Styling", "experience": 5, "expected_pay": "₹18,000/month",
        "bio": "Professional hair stylist for home and salon.", "km": 1.2,
    },
    {
        "id": "w3", "full_name": "Amit Desai", "phone": "9876543212", "email": "amit@hyrlo.com",
        "gender": "Male", "age": 35, "category": "Mechanic", "specialization": "Two-Wheeler Mechanic",
        "skills": "Bike Repair, Engine Tuning", "experience": 10, "expected_pay": "₹700/day",
        "bio": "Expert two-wheeler mechanic.", "km": 2.1,
    },
    {
        "id": "w4", "full_name": "Suresh Reddy", "phone": "9876543213", "email": "suresh@hyrlo.com",
        "gender": "Male", "age": 40, "category": "Driver", "specialization": "Delivery Driver",
        "skills": "Food Delivery, Navigation", "experience": 12, "expected_pay": "₹16,000/month",
        "bio": "Reliable delivery driver with own bike.", "km": 0.8,
    },
    {
        "id": "w5", "full_name": "Meena Venkat", "phone": "9876543214", "email": "meena@hyrlo.com",
        "gender": "Female", "age": 30, "category": "Cafe", "specialization": "Cook",
        "skills": "South Indian, North Indian", "experience": 7, "expected_pay": "₹15,000/month",
        "bio": "Home cook and cafe cook.", "km": 1.5,
    },
    {
        "id": "w6", "full_name": "Lakshmi Nair", "phone": "9876543216", "email": "lakshmi@hyrlo.com",
        "gender": "Female", "age": 24, "category": "Medical Shop", "specialization": "Pharmacist",
        "skills": "Medicine Dispensing, Billing", "experience": 3, "expected_pay": "₹14,000/month",
        "bio": "Licensed pharmacist.", "km": 0.5,
    },
    {
        "id": "w9", "full_name": "Arjun Menon", "phone": "9876543218", "email": "arjun@hyrlo.com",
        "gender": "Male", "age": 27, "category": "Technology", "specialization": "Mobile Repair",
        "skills": "Screen Repair, Software Fix", "experience": 5, "expected_pay": "₹650/day",
        "bio": "Mobile and tablet repair specialist.", "km": 1.1,
    },
    {
        "id": "w10", "full_name": "Kavitha Rao", "phone": "9876543219", "email": "kavitha@hyrlo.com",
        "gender": "Female", "age": 33, "category": "Home Services", "specialization": "Cleaner",
        "skills": "Deep Cleaning, Housekeeping", "experience": 6, "expected_pay": "₹500/day",
        "bio": "Professional home cleaner.", "km": 0.6,
    },
]

PLATFORM_BUSINESSES = [
    {"id": "b1", "owner_name": "Dr. Anil Mehta", "business_name": "City Medical Store", "phone": "9988776655",
     "category": "Medical Shop", "specialization": "Pharmacist", "requirement": "Evening pharmacist needed", "km": 0.4},
    {"id": "b2", "owner_name": "Sunita Rao", "business_name": "Fresh Mart Grocery", "phone": "9988776656",
     "category": "Grocery Shop", "specialization": "Stock Handler", "requirement": "Stock and billing staff", "km": 1.0},
    {"id": "b3", "owner_name": "Karan Malhotra", "business_name": "Brew & Bite Cafe", "phone": "9988776657",
     "category": "Cafe", "specialization": "Cook", "requirement": "Part-time cook", "km": 1.8},
    {"id": "b4", "owner_name": "Neha Gupta", "business_name": "Glamour Salon", "phone": "9988776658",
     "category": "Salon", "specialization": "Hair Stylist", "requirement": "Weekend stylist", "km": 2.5},
    {"id": "b5", "owner_name": "Mohit Sharma", "business_name": "QuickFix Auto", "phone": "9988776659",
     "category": "Mechanic", "specialization": "Two-Wheeler Mechanic", "requirement": "Urgent bike mechanic", "km": 3.0},
]


def seed_platform_data():
    init_db()
    with get_db() as conn:
        if conn.execute("SELECT COUNT(*) FROM workers WHERE registered_by = 'platform'").fetchone()[0] > 0:
            return {"message": "Platform data already seeded"}

        ts = now_iso()
        for w in PLATFORM_WORKERS:
            l = loc(w["km"])
            conn.execute(
                """INSERT OR IGNORE INTO workers
                   (id, full_name, phone, email, gender, age, category, specialization, skills,
                    experience, expected_pay, need_work, availability, verified, trust_score,
                    jobs_completed, bio, locality, lat, lng, address, registered_by, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (w["id"], w["full_name"], w["phone"], w["email"], w["gender"], w["age"],
                 w["category"], w["specialization"], w["skills"], w["experience"], w["expected_pay"],
                 1, "available", 1, 4.5 + (hash(w["id"]) % 5) / 10, 20 + hash(w["id"]) % 50,
                 w["bio"], l["locality"], l["lat"], l["lng"], l["address"], "platform", ts),
            )

        for b in PLATFORM_BUSINESSES:
            l = loc(b["km"])
            conn.execute(
                """INSERT OR IGNORE INTO businesses
                   (id, owner_name, business_name, phone, category, specialization, requirement,
                    need_worker, total_hires, verified, locality, lat, lng, address, registered_by, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (b["id"], b["owner_name"], b["business_name"], b["phone"], b["category"],
                 b["specialization"], b["requirement"], 1, 2, 1,
                 l["locality"], l["lat"], l["lng"], l["address"], "platform", ts),
            )

        jobs = [
            ("j1", "b1", "Pharmacist - Evening Shift", "Medical Shop", "Pharmacist", "₹16,000/month", "part-time", 0, "Medicine, Billing", "Evening pharmacist at medical store.", 0.4),
            ("j2", "b2", "Stock Handler", "Grocery Shop", "Stock Handler", "₹14,000/month", "full-time", 0, "Stock, Billing", "Full-time stock handler.", 1.0),
            ("j3", "b3", "Cafe Cook", "Cafe", "Cook", "₹12,000/month", "part-time", 0, "Cooking", "Morning shift cook.", 1.8),
            ("j4", "b4", "Hair Stylist - Urgent", "Salon", "Hair Stylist", "₹800/day", "urgent", 1, "Haircut", "Weekend stylist urgently needed.", 2.5),
            ("j5", "b5", "Bike Mechanic", "Mechanic", "Two-Wheeler Mechanic", "₹900/day", "urgent", 1, "Bike Repair", "Immediate mechanic opening.", 3.0),
            ("j6", "b2", "Electrician for Store", "Home Services", "Electrician", "₹850/day", "one-time", 1, "Wiring", "Electrical renovation work.", 1.0),
        ]
        for j in jobs:
            l = loc(j[10])
            conn.execute(
                """INSERT OR IGNORE INTO jobs
                   (id, business_id, title, category, specialization, pay, job_type, urgent,
                    required_skills, description, status, locality, lat, lng, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (j[0], j[1], j[2], j[3], j[4], j[5], j[6], j[7], j[8], j[9], "active",
                 l["locality"], l["lat"], l["lng"], ts),
            )

        requests = [
            ("r1", "worker_applied", "w1", "b2", "w1", "b2", "j2", "pending", "8 years electrical experience."),
            ("r2", "employer_invited", "b4", "w2", "w2", "b4", "j4", "pending", "Join us for weekend shifts!"),
            ("r3", "worker_applied", "w5", "b3", "w5", "b3", "j3", "accepted", "South Indian cooking expert."),
            ("r4", "employer_invited", "b5", "w3", "w3", "b5", "j5", "accepted", "Perfect match for our shop."),
            ("r5", "worker_applied", "w6", "b1", "w6", "b1", "j1", "rejected", "Licensed pharmacist."),
        ]
        for r in requests:
            conn.execute(
                """INSERT OR IGNORE INTO requests
                   (id, type, sender_id, receiver_id, worker_id, business_id, job_id, status, message, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (*r, ts),
            )

    return {"message": "Platform workers and businesses registered", "workers": len(PLATFORM_WORKERS)}
