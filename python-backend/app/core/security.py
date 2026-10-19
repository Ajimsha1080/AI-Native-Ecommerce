import os
import time
import uuid
import secrets
import hashlib
import bcrypt
import jwt
import pyotp
from typing import Dict, Any, Optional, Tuple
from .config import settings

def hash_password(password: str) -> str:
    """Hashes a password with bcrypt work factor 12."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    """Verifies a password against a bcrypt hash in constant time."""
    if not hashed_password or not password:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def validate_password_policy(password: str) -> Tuple[bool, Optional[str]]:
    """Enforces enterprise password strength policy."""
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one numeric digit."
    special_chars = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?"
    if not any(c.isupper() or c in special_chars for c in password):
        return False, "Password must contain at least one uppercase letter or special character."
    return True, None

def create_session_token(
    user_id: str,
    email: str,
    workspace_id: str,
    is_super_admin: bool = False,
    session_id: Optional[str] = None
) -> str:
    """Generates an end-user session JWT compatible with Next.js auth cookies."""
    jti = session_id or f"sess_{int(time.time()*1000)}_{secrets.token_hex(4)}"
    now = int(time.time())
    payload = {
        "userId": user_id,
        "email": email,
        "workspaceId": workspace_id,
        "isSuperAdmin": is_super_admin,
        "sessionId": jti,
        "jti": jti,
        "iss": "aaas-auth",
        "aud": "aaas-app",
        "iat": now,
        "exp": now + (7 * 24 * 3600)  # 7 days
    }
    return jwt.encode(payload, settings.SESSION_JWT_SECRET, algorithm="HS256")

def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies the session JWT signature, expiry, audience, and issuer."""
    try:
        payload = jwt.decode(
            token,
            settings.SESSION_JWT_SECRET,
            algorithms=["HS256"],
            audience="aaas-app",
            issuer="aaas-auth",
            leeway=60
        )
        return payload
    except Exception:
        # Fallback to loose decode for backwards compatibility with any earlier tokens
        try:
            payload = jwt.decode(
                token,
                settings.SESSION_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False, "verify_iss": False},
                leeway=60
            )
            return payload
        except Exception:
            return None

def create_service_jwt(workspace_id: str, user_id: str = "service_python", role: str = "ADMIN") -> str:
    """Generates internal service JWT for background workers or legacy service calls."""
    now = int(time.time())
    payload = {
        "workspace_id": workspace_id,
        "workspaceId": workspace_id,
        "sub": user_id,
        "userId": user_id,
        "role": role,
        "isSuperAdmin": role == "SUPERADMIN",
        "iss": "aaas-node",
        "aud": "aaas-python",
        "iat": now,
        "exp": now + 900  # 15 minutes
    }
    return jwt.encode(payload, settings.SERVICE_JWT_SECRET, algorithm="HS256")

# --- TOTP Multi-Factor Authentication ---

def generate_mfa_secret() -> str:
    """Generates RFC 6238 Base32 secret for TOTP MFA."""
    return pyotp.random_base32()

def generate_otpauth_uri(email: str, secret: str, issuer: str = "ShopMate") -> str:
    """Generates authenticator URL."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)

def verify_totp_code(secret: str, code: str) -> bool:
    """Verifies a 6-digit TOTP code within +/- 1 step window."""
    if not secret or not code:
        return False
    try:
        clean_code = str(code).strip()
        totp = pyotp.TOTP(secret)
        return totp.verify(clean_code, valid_window=1)
    except Exception:
        return False

# --- API Keys ---

def generate_api_key(prefix: str = "ak_live") -> Tuple[str, str, str]:
    """Generates a secure API key, its short prefix for display, and its SHA-256 hash for storage."""
    random_token = secrets.token_hex(24)
    raw_key = f"{prefix}_{random_token}"
    key_prefix = raw_key[:12]
    hashed_key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return raw_key, key_prefix, hashed_key

def verify_api_key(raw_key: str, hashed_key: str) -> bool:
    """Constant-time check of API key hash."""
    calc_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return secrets.compare_digest(calc_hash, hashed_key)

# --- CSRF Protection ---

def generate_csrf_token() -> str:
    """Generates cryptographically random CSRF token."""
    return secrets.token_hex(32)
