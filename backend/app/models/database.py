import sqlite3
from pathlib import Path
from datetime import datetime
from contextlib import contextmanager
from app.core.config import settings

def get_db_connection():
    conn = sqlite3.connect(settings.DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

@contextmanager
def db_session():
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with db_session() as conn:
        cursor = conn.cursor()
        
        # 1. verification_records
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS verification_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference_id TEXT UNIQUE NOT NULL,
            document_type TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            file_hash TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            mime_type TEXT NOT NULL,
            processing_status TEXT NOT NULL,
            final_status TEXT,
            summary TEXT,
            error_code TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ver_ref_id ON verification_records(reference_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ver_status ON verification_records(final_status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ver_created ON verification_records(created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ver_doctype ON verification_records(document_type)")

        # 2. verification_checks
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS verification_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            verification_id INTEGER NOT NULL,
            check_name TEXT NOT NULL,
            result TEXT NOT NULL,
            severity TEXT NOT NULL,
            explanation TEXT NOT NULL,
            evidence_reference TEXT,
            FOREIGN KEY(verification_id) REFERENCES verification_records(id) ON DELETE CASCADE
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_check_ver_id ON verification_checks(verification_id)")

        # 3. extracted_fields
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS extracted_fields (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            verification_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            normalized_value TEXT,
            raw_value TEXT,
            extraction_confidence REAL DEFAULT 1.0,
            is_sensitive BOOLEAN DEFAULT 0,
            FOREIGN KEY(verification_id) REFERENCES verification_records(id) ON DELETE CASCADE
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_field_ver_id ON extracted_fields(verification_id)")

        # 4. processing_events
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS processing_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            verification_id INTEGER NOT NULL,
            stage TEXT NOT NULL,
            event_status TEXT NOT NULL,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(verification_id) REFERENCES verification_records(id) ON DELETE CASCADE
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_event_ver_id ON processing_events(verification_id)")

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
