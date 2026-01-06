"""Authentication utilities and dependencies."""

from auth.password import hash_password, verify_password
from auth.jwt_handler import (
    hash_token,
    create_access_token,
    create_refresh_token,
    create_token_pair,
    decode_token,
    verify_access_token,
    verify_refresh_token,
    get_token_expiry,
    TokenPayload,
    TokenPair,
)
from auth.lockout import LockoutService, check_lockout_status
from auth.dependencies import (
    get_token_payload,
    get_current_admin,
    get_current_active_admin,
    require_role,
    require_super_admin,
    require_admin,
    require_any_admin,
    get_client_ip,
    get_user_agent,
    get_optional_admin,
)

__all__ = [
    # Password utilities
    "hash_password",
    "verify_password",
    # JWT utilities
    "hash_token",
    "create_access_token",
    "create_refresh_token",
    "create_token_pair",
    "decode_token",
    "verify_access_token",
    "verify_refresh_token",
    "get_token_expiry",
    "TokenPayload",
    "TokenPair",
    # Lockout utilities
    "LockoutService",
    "check_lockout_status",
    # Dependencies
    "get_token_payload",
    "get_current_admin",
    "get_current_active_admin",
    "require_role",
    "require_super_admin",
    "require_admin",
    "require_any_admin",
    "get_client_ip",
    "get_user_agent",
    "get_optional_admin",
]
