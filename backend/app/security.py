"""
security.py — Password hashing and JWT token utilities.

Uses:
  - passlib[bcrypt] with cost factor 12 for password hashing
  - python-jose[cryptography] for JWT (HS256, 8-hour expiry)
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt
from passlib.context import CryptContext

from app.config import settings

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain* (cost factor 12)."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*."""
    return _pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

_TOKEN_EXPIRE_HOURS = 8


def create_access_token(
    user_id: int,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT containing ``sub`` (user_id) and ``role``.
    Default expiry is 8 hours.
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta is not None
        else timedelta(hours=_TOKEN_EXPIRE_HOURS)
    )
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT.  Returns the raw payload dict.
    Raises ``jose.JWTError`` on any validation failure.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
