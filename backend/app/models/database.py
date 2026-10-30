import sqlite3
from pathlib import Path
from datetime import datetime
from contextlib import contextmanager
from app.core.config import settings

_db_initialized = False

def init_db_tables(conn: sqlite3.Connection):
    cursor = conn.cursor()

    # 1. users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")

    # 2. password_resets
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pw_reset_tok ON password_resets(token)")

    # 3. user_documents (My_Doc Personal Document Storage)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_docs_uid ON user_documents(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_docs_hash ON user_documents(file_hash)")

    # 4. verification_records
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
        user_id INTEGER,
        source_document_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(source_document_id) REFERENCES user_documents(id) ON DELETE SET NULL
    )
    """)
    # Safely migrate existing databases if columns user_id / source_document_id are missing
    cursor.execute("PRAGMA table_info(verification_records)")
    columns = [row[1] for row in cursor.fetchall()]
    if "user_id" not in columns:
        try:
            cursor.execute("ALTER TABLE verification_records ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE")
        except Exception:
            pass
    if "source_document_id" not in columns:
        try:
            cursor.execute("ALTER TABLE verification_records ADD COLUMN source_document_id INTEGER REFERENCES user_documents(id) ON DELETE SET NULL")
        except Exception:
            pass

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ver_ref_id ON verification_records(reference_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ver_status ON verification_records(final_status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ver_created ON verification_records(created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ver_doctype ON verification_records(document_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ver_uid ON verification_records(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ver_hash ON verification_records(file_hash)")

    # 5. verification_checks
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

    # 6. extracted_fields
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

    # 7. processing_events
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
    conn.commit()

def get_db_connection():
    global _db_initialized
    try:
        Path(settings.DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    conn = sqlite3.connect(str(settings.DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    if not _db_initialized:
        _db_initialized = True
        try:
            init_db_tables(conn)
        except Exception:
            pass
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
        init_db_tables(conn)

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully with authentication and My_Doc tables.")
