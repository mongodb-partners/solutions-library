"""
JWT token creation and validation.
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple
import uuid
import hashlib

from jose import jwt, JWTError, ExpiredSignatureError
from pydantic import BaseModel

from config import settings


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str  # admin_id
    username: str
    role: str
    type: str  # "access" or "refresh"
    exp: datetime
    iat: datetime
    jti: str  # unique token ID


class TokenPair(BaseModel):
    """Access and refresh token pair."""
    access_token: str
    refresh_token: str
    access_token_hash: str
    refresh_token_hash: str
    expires_at: datetime


def hash_token(token: str) -> str:
    """
    Create a SHA256 hash of a token for storage.

    Args:
        token: JWT token string

    Returns:
        SHA256 hash of the token
    """
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(
    admin_id: str,
    username: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> Tuple[str, str, datetime]:
    """
    Create a new access token.

    Args:
        admin_id: Admin ID
        username: Admin username
        role: Admin role
        expires_delta: Optional custom expiry

    Returns:
        Tuple of (token, token_hash, expiry_datetime)
    """
    if expires_delta is None:
        expires_delta = timedelta(seconds=settings.jwt_access_expiry)

    now = datetime.utcnow()
    expires_at = now + expires_delta

    payload = {
        "sub": admin_id,
        "username": username,
        "role": role,
        "type": "access",
        "exp": expires_at,
        "iat": now,
        "jti": str(uuid.uuid4()),
    }

    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    token_hash = hash_token(token)

    return token, token_hash, expires_at


def create_refresh_token(
    admin_id: str,
    session_id: str,
    expires_delta: Optional[timedelta] = None,
) -> Tuple[str, str, datetime]:
    """
    Create a new refresh token.

    Args:
        admin_id: Admin ID
        session_id: Session ID
        expires_delta: Optional custom expiry

    Returns:
        Tuple of (token, token_hash, expiry_datetime)
    """
    if expires_delta is None:
        expires_delta = timedelta(seconds=settings.jwt_refresh_expiry)

    now = datetime.utcnow()
    expires_at = now + expires_delta

    payload = {
        "sub": admin_id,
        "session_id": session_id,
        "type": "refresh",
        "exp": expires_at,
        "iat": now,
        "jti": str(uuid.uuid4()),
    }

    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    token_hash = hash_token(token)

    return token, token_hash, expires_at


def create_token_pair(
    admin_id: str,
    username: str,
    role: str,
    session_id: str,
) -> TokenPair:
    """
    Create a pair of access and refresh tokens.

    Args:
        admin_id: Admin ID
        username: Admin username
        role: Admin role
        session_id: Session ID

    Returns:
        TokenPair with both tokens and their hashes
    """
    access_token, access_hash, _ = create_access_token(admin_id, username, role)
    refresh_token, refresh_hash, expires_at = create_refresh_token(admin_id, session_id)

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        access_token_hash=access_hash,
        refresh_token_hash=refresh_hash,
        expires_at=expires_at,
    )


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.

    Args:
        token: JWT token string

    Returns:
        Token payload dict if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except ExpiredSignatureError:
        return None
    except JWTError:
        return None


def verify_access_token(token: str) -> Optional[TokenPayload]:
    """
    Verify an access token and return payload.

    Args:
        token: Access token string

    Returns:
        TokenPayload if valid access token, None otherwise
    """
    payload = decode_token(token)

    if payload is None:
        return None

    if payload.get("type") != "access":
        return None

    try:
        return TokenPayload(
            sub=payload["sub"],
            username=payload["username"],
            role=payload["role"],
            type=payload["type"],
            exp=datetime.fromtimestamp(payload["exp"]),
            iat=datetime.fromtimestamp(payload["iat"]),
            jti=payload["jti"],
        )
    except (KeyError, ValueError):
        return None


def verify_refresh_token(token: str) -> Optional[dict]:
    """
    Verify a refresh token and return payload.

    Args:
        token: Refresh token string

    Returns:
        Payload dict if valid refresh token, None otherwise
    """
    payload = decode_token(token)

    if payload is None:
        return None

    if payload.get("type") != "refresh":
        return None

    return payload


def get_token_expiry(token: str) -> Optional[datetime]:
    """
    Get the expiry datetime of a token without full validation.

    Args:
        token: JWT token string

    Returns:
        Expiry datetime if parseable, None otherwise
    """
    try:
        # Decode without verification to get expiry
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": False},
        )
        exp_timestamp = payload.get("exp")
        if exp_timestamp:
            return datetime.fromtimestamp(exp_timestamp)
        return None
    except JWTError:
        return None
