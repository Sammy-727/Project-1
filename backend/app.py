"""Hyrlo API server — serves React frontend + REST API."""
import os
import uuid
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from database import get_db, init_db, rows_to_list, row_to_dict, now_iso
from seed import seed_platform_data

DIST = os.path.join(os.path.dirname(__file__), "..", "dist")

app = Flask(__name__, static_folder=DIST, static_url_path="")
CORS(app)


def worker_row(r):
    d = dict(r)
    d["fullName"] = d.pop("full_name")
    d["expectedPay"] = d.pop("expected_pay")
    d["needWork"] = bool(d.pop("need_work"))
    d["trustScore"] = d.pop("trust_score")
    d["jobsCompleted"] = d.pop("jobs_completed")
    d["profilePhoto"] = None
    d["location"] = {"lat": d.pop("lat"), "lng": d.pop("lng"), "locality": d.pop("locality"), "address": d.pop("address")}
    d["verified"] = bool(d.pop("verified"))
    d["registeredBy"] = d.pop("registered_by")
    d["createdAt"] = d.pop("created_at")
    return d


def business_row(r):
    d = dict(r)
    d["ownerName"] = d.pop("owner_name")
    d["businessName"] = d.pop("business_name")
    d["needWorker"] = bool(d.pop("need_worker"))
    d["totalHires"] = d.pop("total_hires")
    d["location"] = {"lat": d.pop("lat"), "lng": d.pop("lng"), "locality": d.pop("locality"), "address": d.pop("address")}
    d["verified"] = bool(d.pop("verified"))
    d["registeredBy"] = d.pop("registered_by")
    d["createdAt"] = d.pop("created_at")
    return d


def job_row(r):
    d = dict(r)
    d["businessId"] = d.pop("business_id")
    d["jobType"] = d.pop("job_type")
    d["requiredSkills"] = d.pop("required_skills")
    d["urgent"] = bool(d.pop("urgent"))
    d["location"] = {"lat": d.pop("lat"), "lng": d.pop("lng"), "locality": d.pop("locality")}
    d["createdAt"] = d.pop("created_at")
    return d


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "app": "Hyrlo"})


@app.route("/api/seed", methods=["POST"])
def api_seed():
    return jsonify(seed_platform_data())


@app.route("/api/workers", methods=["GET", "POST"])
def api_workers():
    if request.method == "GET":
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM workers ORDER BY created_at DESC").fetchall()
        return jsonify([worker_row(r) for r in rows])

    data = request.json or {}
    wid = f"w_{uuid.uuid4().hex[:8]}"
    ts = now_iso()
    loc = data.get("location", {})
    with get_db() as conn:
        conn.execute(
            """INSERT INTO workers
               (id, full_name, phone, email, gender, age, category, specialization, skills,
                experience, expected_pay, need_work, availability, bio, locality, lat, lng, address,
                registered_by, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (wid, data["fullName"], data["phone"], data.get("email"), data.get("gender"),
             data.get("age"), data["category"], data["specialization"], data.get("skills"),
             data.get("experience", 0), data.get("expectedPay"), 1 if data.get("needWork", True) else 0,
             "available", data.get("bio"), loc.get("locality"), loc.get("lat"), loc.get("lng"),
             loc.get("address"), "user", ts),
        )
    return jsonify({"id": wid, "role": "worker"}), 201


@app.route("/api/workers/<wid>", methods=["GET", "PATCH"])
def api_worker(wid):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM workers WHERE id = ?", (wid,)).fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404
        if request.method == "PATCH":
            data = request.json or {}
            mapping = {
                "fullName": ("full_name", lambda v: v),
                "expectedPay": ("expected_pay", lambda v: v),
                "needWork": ("need_work", lambda v: 1 if v else 0),
                "skills": ("skills", lambda v: v),
                "category": ("category", lambda v: v),
                "specialization": ("specialization", lambda v: v),
            }
            fields, vals = [], []
            for k, (col, fn) in mapping.items():
                if k in data:
                    fields.append(f"{col} = ?")
                    vals.append(fn(data[k]))
            if fields:
                vals.append(wid)
                conn.execute(f"UPDATE workers SET {', '.join(fields)} WHERE id = ?", vals)
                row = conn.execute("SELECT * FROM workers WHERE id = ?", (wid,)).fetchone()
        return jsonify(worker_row(row))


@app.route("/api/businesses", methods=["GET", "POST"])
def api_businesses():
    if request.method == "GET":
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM businesses ORDER BY created_at DESC").fetchall()
        return jsonify([business_row(r) for r in rows])

    data = request.json or {}
    bid = f"b_{uuid.uuid4().hex[:8]}"
    ts = now_iso()
    loc = data.get("location", {})
    with get_db() as conn:
        conn.execute(
            """INSERT INTO businesses
               (id, owner_name, business_name, phone, email, category, specialization, requirement,
                need_worker, locality, lat, lng, address, registered_by, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (bid, data["ownerName"], data["businessName"], data["phone"], data.get("email"),
             data["category"], data["specialization"], data.get("requirement"),
             1 if data.get("needWorker", True) else 0,
             loc.get("locality"), loc.get("lat"), loc.get("lng"), loc.get("address"), "user", ts),
        )
    return jsonify({"id": bid, "role": "employer"}), 201


@app.route("/api/businesses/<bid>", methods=["GET", "PATCH"])
def api_business(bid):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM businesses WHERE id = ?", (bid,)).fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404
        if request.method == "PATCH":
            data = request.json or {}
            mapping = {
                "businessName": ("business_name", lambda v: v),
                "needWorker": ("need_worker", lambda v: 1 if v else 0),
                "requirement": ("requirement", lambda v: v),
                "category": ("category", lambda v: v),
                "specialization": ("specialization", lambda v: v),
            }
            fields, vals = [], []
            for k, (col, fn) in mapping.items():
                if k in data:
                    fields.append(f"{col} = ?")
                    vals.append(fn(data[k]))
            if fields:
                vals.append(bid)
                conn.execute(f"UPDATE businesses SET {', '.join(fields)} WHERE id = ?", vals)
                row = conn.execute("SELECT * FROM businesses WHERE id = ?", (bid,)).fetchone()
        return jsonify(business_row(row))


@app.route("/api/jobs", methods=["GET"])
def api_jobs():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM jobs WHERE status = 'active' ORDER BY created_at DESC").fetchall()
    return jsonify([job_row(r) for r in rows])


@app.route("/api/requests", methods=["GET", "POST"])
def api_requests():
    def req_row(r):
        d = dict(r)
        return {
            "id": d["id"], "type": d["type"], "status": d["status"], "message": d["message"],
            "createdAt": d["created_at"],
            "senderId": d["sender_id"], "receiverId": d["receiver_id"],
            "workerId": d["worker_id"], "businessId": d["business_id"], "jobId": d["job_id"],
        }

    if request.method == "GET":
        user_id = request.args.get("user_id")
        with get_db() as conn:
            if user_id:
                rows = conn.execute(
                    """SELECT * FROM requests WHERE worker_id = ? OR business_id = ?
                       OR sender_id = ? OR receiver_id = ? ORDER BY created_at DESC""",
                    (user_id, user_id, user_id, user_id),
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM requests ORDER BY created_at DESC").fetchall()
        return jsonify([req_row(r) for r in rows])

    data = request.json or {}
    rid = f"r_{uuid.uuid4().hex[:8]}"
    ts = now_iso()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO requests (id, type, sender_id, receiver_id, worker_id, business_id, job_id, status, message, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (rid, data["type"], data["senderId"], data["receiverId"], data["workerId"],
             data["businessId"], data.get("jobId"), "pending", data.get("message", ""), ts),
        )
    return jsonify({"id": rid, "status": "pending"}), 201


@app.route("/api/requests/<rid>", methods=["PATCH"])
def api_request_update(rid):
    status = (request.json or {}).get("status")
    if status not in ("accepted", "rejected", "pending"):
        return jsonify({"error": "Invalid status"}), 400
    with get_db() as conn:
        conn.execute("UPDATE requests SET status = ? WHERE id = ?", (status, rid))
        if status == "accepted":
            req = conn.execute("SELECT * FROM requests WHERE id = ?", (rid,)).fetchone()
            if req:
                conn.execute("UPDATE businesses SET total_hires = total_hires + 1 WHERE id = ?", (req["business_id"],))
                conn.execute("UPDATE workers SET jobs_completed = jobs_completed + 1 WHERE id = ?", (req["worker_id"],))
        row = conn.execute("SELECT * FROM requests WHERE id = ?", (rid,)).fetchone()
    return jsonify(dict(row) if row else {})


@app.route("/api/login", methods=["POST"])
def api_login():
    phone = (request.json or {}).get("phone", "").replace(" ", "")
    with get_db() as conn:
        w = conn.execute("SELECT id FROM workers WHERE phone = ?", (phone,)).fetchone()
        if w:
            return jsonify({"id": w["id"], "role": "worker"})
        b = conn.execute("SELECT id FROM businesses WHERE phone = ?", (phone,)).fetchone()
        if b:
            return jsonify({"id": b["id"], "role": "employer"})
    return jsonify({"error": "No account found"}), 404


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    if path and os.path.exists(os.path.join(DIST, path)):
        return send_from_directory(DIST, path)
    return send_from_directory(DIST, "index.html")


def create_app():
    init_db()
    seed_platform_data()
    return app


application = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    create_app().run(host="0.0.0.0", port=port, debug=True)
