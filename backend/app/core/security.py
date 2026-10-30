import os
import time
import json
import base64
import hmac
import hashlib
import secrets
from typing import Optional, Dict, Any
from app.core.config import settings

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and 16 bytes salt.
    Format: salt_hex$hash_hex
    """
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """
    Verifies a plaintext password against a stored PBKDF2-HMAC-SHA256 hash.
    """
    try:
        parts = hashed.split("$")
        if len(parts) != 2:
            return False
        salt_hex, key_hex = parts
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(key, expected_key)
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_in_days: int = 7) -> str:
    """
    Creates an HMAC-SHA256 signed JSON Web Token (standard JWT structure).
    """
    now = int(time.time())
    exp = now + (expires_in_days * 86400)
    payload = {
        **data,
        "iat": now,
        "exp": exp
    }
    encoded_payload = base64.urlsafe_b64encode(json.dumps(payload, separators=(',', ':')).encode("utf-8")).decode("utf-8").rstrip("=")
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), encoded_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{encoded_payload}.{signature}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Validates signature and expiration of an access token, returning the payload if valid.
    """
    try:
        parts = token.strip().split(".")
        if len(parts) != 2:
            return None
        encoded_payload, sig = parts
        expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), encoded_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        
        # Add back base64 padding if needed
        padding = (4 - len(encoded_payload) % 4) % 4
        payload_bytes = base64.urlsafe_b64decode(encoded_payload + ("=" * padding))
        payload = json.loads(payload_bytes.decode("utf-8"))
        
        if payload.get("exp", 0) < time.time():
            return None # Expired
        
        return payload
    except Exception:
        return None

def generate_reset_token() -> str:
    """Generates a secure 6-digit alphanumeric recovery code."""
    return secrets.token_hex(4).upper()

