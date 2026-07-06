"""Hyrlo SQLite database."""
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "instance", "hyrlo.db")


def get_db_path():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return DB_PATH


@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def row_to_dict(row):
    return dict(row) if row else None


def rows_to_list(rows):
    return [dict(r) for r in rows]


def now_iso():
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS workers (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                phone TEXT UNIQUE NOT NULL,
                email TEXT,
                gender TEXT,
                age INTEGER,
                category TEXT NOT NULL,
                specialization TEXT NOT NULL,
                skills TEXT,
                experience INTEGER DEFAULT 0,
                expected_pay TEXT,
                need_work INTEGER DEFAULT 1,
                availability TEXT DEFAULT 'available',
                verified INTEGER DEFAULT 0,
                trust_score REAL DEFAULT 0,
                jobs_completed INTEGER DEFAULT 0,
                bio TEXT,
                locality TEXT,
                lat REAL,
                lng REAL,
                address TEXT,
                registered_by TEXT DEFAULT 'user',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS businesses (
                id TEXT PRIMARY KEY,
                owner_name TEXT NOT NULL,
                business_name TEXT NOT NULL,
                phone TEXT UNIQUE NOT NULL,
                email TEXT,
                category TEXT NOT NULL,
                specialization TEXT NOT NULL,
                requirement TEXT,
                need_worker INTEGER DEFAULT 1,
                total_hires INTEGER DEFAULT 0,
                verified INTEGER DEFAULT 0,
                locality TEXT,
                lat REAL,
                lng REAL,
                address TEXT,
                registered_by TEXT DEFAULT 'user',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                business_id TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                specialization TEXT,
                pay TEXT,
                job_type TEXT,
                urgent INTEGER DEFAULT 0,
                required_skills TEXT,
                description TEXT,
                status TEXT DEFAULT 'active',
                locality TEXT,
                lat REAL,
                lng REAL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (business_id) REFERENCES businesses(id)
            );

            CREATE TABLE IF NOT EXISTS requests (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                worker_id TEXT NOT NULL,
                business_id TEXT NOT NULL,
                job_id TEXT,
                status TEXT DEFAULT 'pending',
                message TEXT,
                created_at TEXT NOT NULL
            );
        """)
