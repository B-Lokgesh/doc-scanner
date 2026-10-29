import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Detect serverless environment reliably (Vercel, AWS Lambda, or read-only filesystem)
is_serverless = (
    os.getenv("VERCEL") is not None
    or os.getenv("VERCEL_ENV") is not None
    or not os.access(str(BASE_DIR), os.W_OK)
)

if is_serverless:
    STORAGE_DIR = Path("/tmp/storage")
    DATABASE_PATH = Path("/tmp/veridoc.db")
else:
    STORAGE_DIR = BASE_DIR / "storage"
    DATABASE_PATH = BASE_DIR / "veridoc.db"

UPLOAD_DIR = STORAGE_DIR / "uploads"
REPORT_DIR = STORAGE_DIR / "reports"
PREVIEW_DIR = STORAGE_DIR / "previews"
FIXTURES_DIR = BASE_DIR / "test_fixtures"

# Ensure directories exist safely without throwing on read-only filesystems
for folder in [STORAGE_DIR, UPLOAD_DIR, REPORT_DIR, PREVIEW_DIR]:
    try:
        folder.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

class Settings:
    PROJECT_NAME: str = "VeriDoc AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    MAX_FILE_SIZE_BYTES: int = int(os.getenv("MAX_FILE_SIZE_BYTES", str(10 * 1024 * 1024))) # 10MB default
    ALLOWED_EXTENSIONS: set = {".pdf", ".jpg", ".jpeg", ".png"}
    ALLOWED_MIME_TYPES: set = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/pjpeg"
    }
    
    # Document Retention
    RETENTION_HOURS: int = int(os.getenv("RETENTION_HOURS", "24"))
    
    # SQLite
    DB_PATH: Path = DATABASE_PATH
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
