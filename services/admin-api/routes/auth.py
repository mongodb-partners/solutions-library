"""
Authentication routes for admin dashboard.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Request, Depends
from pydantic import BaseModel, Field

from auth.password import verify_password, hash_password
from auth.jwt_handler import (
    create_token_pair,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    hash_token,
)
from auth.lockout import LockoutService, check_lockout_status
from auth.dependencies import (
    get_current_admin,
    get_client_ip,
    get_user_agent,
)
from repositories.admin_repository import AdminRepository
from repositories.session_repository import SessionRepository, generate_session_id
from repositories.audit_repository import AuditRepository
from repositories.password_reset_repository import PasswordResetRepository
from models.admin import AdminInDB, AdminProfileResponse
from models.session import SessionCreate
from models.password_reset import (
    PasswordResetRequest,
    PasswordResetVerify,
    PasswordResetConfirm,
    PasswordResetTokenResponse,
)
from services.email_service import EmailService
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Request/Response Models
class LoginRequest(BaseModel):
    """Login request body."""
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    """Login response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    admin: AdminProfileResponse


class RefreshRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str


class RefreshResponse(BaseModel):
    """Token refresh response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class PasswordChangeRequest(BaseModel):
    """Password change request."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    body: LoginRequest,
) -> LoginResponse:
    """
    Authenticate admin and create session.

    Returns access and refresh tokens on success.
    """
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    # Find admin by username
    admin = await AdminRepository.get_by_username(body.username)

    # Check lockout status
    is_locked, reason, _ = await check_lockout_status(
        admin, body.username, ip_address, user_agent
    )

    if is_locked:
        await AuditRepository.log_login_failed(
            username=body.username,
            ip_address=ip_address,
            user_agent=user_agent,
            reason=reason or "Account locked",
            admin_id=admin.admin_id if admin else None,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=reason,
        )

    # Check if admin exists
    if admin is None:
        await AuditRepository.log_login_failed(
            username=body.username,
            ip_address=ip_address,
            user_agent=user_agent,
            reason="User not found",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Verify password
    if not verify_password(body.password, admin.password_hash):
        # Handle failed attempt
        is_now_locked, remaining = await LockoutService.handle_failed_login(
            admin, ip_address, user_agent
        )

        await AuditRepository.log_login_failed(
            username=body.username,
            ip_address=ip_address,
            user_agent=user_agent,
            reason="Invalid password",
            admin_id=admin.admin_id,
            failed_attempts=admin.failed_login_attempts + 1,
        )

        if is_now_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account locked due to too many failed attempts. Try again in {settings.lockout_duration} seconds.",
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid username or password. {remaining} attempts remaining.",
        )

    # Check account status
    if admin.status.value != "active":
        await AuditRepository.log_login_failed(
            username=body.username,
            ip_address=ip_address,
            user_agent=user_agent,
            reason=f"Account {admin.status.value}",
            admin_id=admin.admin_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {admin.status.value}",
        )

    # Generate session ID and tokens
    session_id = generate_session_id()
    tokens = create_token_pair(
        admin_id=admin.admin_id,
        username=admin.username,
        role=admin.role.value,
        session_id=session_id,
    )

    # Create session
    await SessionRepository.create(
        SessionCreate(
            admin_id=admin.admin_id,
            access_token_hash=tokens.access_token_hash,
            refresh_token_hash=tokens.refresh_token_hash,
            expires_at=tokens.expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )

    # Update last login and reset failed attempts
    await LockoutService.handle_successful_login(admin)

    # Log successful login
    await AuditRepository.log_login_success(
        admin_id=admin.admin_id,
        username=admin.username,
        session_id=session_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return LoginResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type="bearer",
        expires_in=settings.jwt_access_expiry,
        admin=AdminProfileResponse.from_admin(admin),
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    admin: AdminInDB = Depends(get_current_admin),
) -> MessageResponse:
    """
    Logout current session.
    """
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    # Get token from request
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""

    if token:
        token_hash = hash_token(token)
        session = await SessionRepository.get_by_access_token_hash(token_hash)

        if session:
            await SessionRepository.deactivate(session.session_id)

            await AuditRepository.log_logout(
                admin_id=admin.admin_id,
                username=admin.username,
                session_id=session.session_id,
                ip_address=ip_address,
                user_agent=user_agent,
            )

    return MessageResponse(message="Logged out successfully")


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(
    request: Request,
    body: RefreshRequest,
) -> RefreshResponse:
    """
    Refresh access token using refresh token.
    """
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    # Verify refresh token
    payload = verify_refresh_token(body.refresh_token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Find session by refresh token hash
    token_hash = hash_token(body.refresh_token)
    session = await SessionRepository.get_by_refresh_token_hash(token_hash)

    if session is None or not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found or expired",
        )

    # Get admin
    admin = await AdminRepository.get_by_id(session.admin_id)

    if admin is None or admin.status.value != "active":
        await SessionRepository.deactivate(session.session_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin not found or inactive",
        )

    # Generate new tokens
    new_session_id = generate_session_id()
    new_access_token, new_access_hash, _ = create_access_token(
        admin_id=admin.admin_id,
        username=admin.username,
        role=admin.role.value,
    )
    new_refresh_token, new_refresh_hash, new_expires_at = create_refresh_token(
        admin_id=admin.admin_id,
        session_id=new_session_id,
    )

    # Update session with new tokens
    await SessionRepository.refresh_tokens(
        session_id=session.session_id,
        new_access_token_hash=new_access_hash,
        new_refresh_token_hash=new_refresh_hash,
        new_expires_at=new_expires_at,
    )

    # Log refresh event
    await AuditRepository.log_token_refresh(
        admin_id=admin.admin_id,
        username=admin.username,
        session_id=session.session_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return RefreshResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.jwt_access_expiry,
    )


@router.get("/me", response_model=AdminProfileResponse)
async def get_current_user(
    admin: AdminInDB = Depends(get_current_admin),
) -> AdminProfileResponse:
    """
    Get current authenticated admin profile.
    """
    return AdminProfileResponse.from_admin(admin)


@router.put("/password", response_model=MessageResponse)
async def change_password(
    request: Request,
    body: PasswordChangeRequest,
    admin: AdminInDB = Depends(get_current_admin),
) -> MessageResponse:
    """
    Change current admin's password.
    """
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    # Verify current password
    if not verify_password(body.current_password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Hash new password
    new_hash = hash_password(body.new_password)

    # Update password
    success = await AdminRepository.update_password(admin.admin_id, new_hash)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password",
        )

    # Invalidate all other sessions (security measure)
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""

    if token:
        token_hash = hash_token(token)
        session = await SessionRepository.get_by_access_token_hash(token_hash)
        current_session_id = session.session_id if session else None
    else:
        current_session_id = None

    await SessionRepository.deactivate_all_for_admin(
        admin.admin_id,
        except_session_id=current_session_id,
    )

    # Log password change
    await AuditRepository.log_password_change(
        admin_id=admin.admin_id,
        username=admin.username,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return MessageResponse(message="Password changed successfully")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    request: Request,
    body: PasswordResetRequest,
) -> MessageResponse:
    """
    Request a password reset.

    Sends an email with a reset link if the email exists.
    Always returns success to prevent email enumeration.
    """
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    # Find admin by email
    admin = await AdminRepository.get_by_email(body.email)

    if admin:
        # Create reset token
        reset_token = await PasswordResetRepository.create_token(
            admin_id=admin.admin_id,
            email=admin.email,
        )

        # Send email
        email_sent = EmailService.send_password_reset_email(
            to_email=admin.email,
            username=admin.username,
            reset_token=reset_token,
        )

        if email_sent:
            # Log the password reset request
            await AuditRepository.log_password_reset_request(
                admin_id=admin.admin_id,
                username=admin.username,
                email=admin.email,
                ip_address=ip_address,
                user_agent=user_agent,
            )

    # Always return success to prevent email enumeration
    return MessageResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )


@router.get("/verify-reset-token/{token}", response_model=PasswordResetTokenResponse)
async def verify_reset_token(
    token: str,
) -> PasswordResetTokenResponse:
    """
    Verify a password reset token is valid.
    """
    token_data = await PasswordResetRepository.verify_token(token)

    if token_data is None:
        return PasswordResetTokenResponse(
            valid=False,
            email=None,
            message="Invalid or expired reset token",
        )

    # Mask email
    email_parts = token_data.email.split("@")
    if len(email_parts) == 2:
        username = email_parts[0]
        domain = email_parts[1]
        if len(username) > 2:
            masked_username = username[0] + "*" * (len(username) - 2) + username[-1]
        else:
            masked_username = "*" * len(username)
        masked_email = f"{masked_username}@{domain}"
    else:
        masked_email = "****"

    return PasswordResetTokenResponse(
        valid=True,
        email=masked_email,
        message="Token is valid",
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    request: Request,
    body: PasswordResetConfirm,
) -> MessageResponse:
    """
    Reset password using a valid reset token.
    """
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    # Verify token
    token_data = await PasswordResetRepository.verify_token(body.token)

    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Get admin
    admin = await AdminRepository.get_by_id(token_data.admin_id)

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account not found",
        )

    # Hash new password
    new_hash = hash_password(body.new_password)

    # Update password
    success = await AdminRepository.update_password(admin.admin_id, new_hash)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password",
        )

    # Mark token as used
    await PasswordResetRepository.mark_used(body.token)

    # Invalidate all sessions for security
    await SessionRepository.deactivate_all_for_admin(admin.admin_id)

    # Send confirmation email
    EmailService.send_password_changed_email(
        to_email=admin.email,
        username=admin.username,
    )

    # Log the password reset
    await AuditRepository.log_password_reset(
        admin_id=admin.admin_id,
        username=admin.username,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return MessageResponse(message="Password has been reset successfully")
