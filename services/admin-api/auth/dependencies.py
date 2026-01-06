"""
FastAPI authentication dependencies.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from auth.jwt_handler import verify_access_token, TokenPayload, hash_token
from repositories.admin_repository import AdminRepository
from repositories.session_repository import SessionRepository
from models.admin import AdminInDB, AdminRole

# HTTP Bearer token scheme
bearer_scheme = HTTPBearer(auto_error=False)


async def get_token_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> TokenPayload:
    """
    Extract and validate the JWT token from the request.

    Args:
        credentials: HTTP Bearer credentials

    Returns:
        Validated token payload

    Raises:
        HTTPException: If token is missing or invalid
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = verify_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify session is still active
    token_hash = hash_token(token)
    session = await SessionRepository.get_by_access_token_hash(token_hash)

    if session is None or not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


async def get_current_admin(
    payload: TokenPayload = Depends(get_token_payload),
) -> AdminInDB:
    """
    Get the current authenticated admin.

    Args:
        payload: Validated token payload

    Returns:
        Current admin

    Raises:
        HTTPException: If admin not found or inactive
    """
    admin = await AdminRepository.get_by_id(payload.sub)

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if admin.status.value != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {admin.status.value}",
        )

    return admin


async def get_current_active_admin(
    admin: AdminInDB = Depends(get_current_admin),
) -> AdminInDB:
    """
    Get the current active admin (convenience alias).
    """
    return admin


def require_role(*allowed_roles: AdminRole):
    """
    Dependency factory for role-based access control.

    Args:
        allowed_roles: Roles allowed to access the endpoint

    Returns:
        Dependency function
    """
    async def role_checker(
        admin: AdminInDB = Depends(get_current_admin),
    ) -> AdminInDB:
        if admin.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {[r.value for r in allowed_roles]}",
            )
        return admin

    return role_checker


# Pre-configured role dependencies
require_super_admin = require_role(AdminRole.SUPER_ADMIN)
require_admin = require_role(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
require_any_admin = require_role(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)


def get_client_ip(request: Request) -> str:
    """
    Get the client IP address from the request.

    Args:
        request: FastAPI request object

    Returns:
        Client IP address
    """
    # Check for forwarded IP (behind proxy/load balancer)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs; the first is the client
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Fallback to direct connection IP
    if request.client:
        return request.client.host

    return "unknown"


def get_user_agent(request: Request) -> str:
    """
    Get the user agent from the request.

    Args:
        request: FastAPI request object

    Returns:
        User agent string
    """
    return request.headers.get("User-Agent", "unknown")


async def get_optional_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[AdminInDB]:
    """
    Get the current admin if authenticated, otherwise None.
    Useful for endpoints that work both authenticated and unauthenticated.

    Args:
        credentials: HTTP Bearer credentials

    Returns:
        Current admin or None
    """
    if credentials is None:
        return None

    token = credentials.credentials
    payload = verify_access_token(token)

    if payload is None:
        return None

    # Verify session
    token_hash = hash_token(token)
    session = await SessionRepository.get_by_access_token_hash(token_hash)

    if session is None or not session.is_active:
        return None

    admin = await AdminRepository.get_by_id(payload.sub)

    if admin is None or admin.status.value != "active":
        return None

    return admin
