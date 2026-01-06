"""
Account lockout logic for failed login attempts.
"""

from datetime import datetime
from typing import Tuple, Optional
import logging

from models.admin import AdminInDB
from repositories.admin_repository import AdminRepository
from repositories.audit_repository import AuditRepository
from config import settings

logger = logging.getLogger(__name__)


class LockoutService:
    """Service for handling account lockout logic."""

    @staticmethod
    def is_locked(admin: AdminInDB) -> bool:
        """
        Check if an admin account is currently locked.

        Args:
            admin: Admin to check

        Returns:
            True if account is locked, False otherwise
        """
        if admin.locked_until is None:
            return False

        if admin.locked_until > datetime.utcnow():
            return True

        # Lock has expired - will be cleared on next successful login
        return False

    @staticmethod
    def get_remaining_lockout_seconds(admin: AdminInDB) -> int:
        """
        Get remaining lockout time in seconds.

        Args:
            admin: Admin to check

        Returns:
            Seconds remaining, 0 if not locked
        """
        if admin.locked_until is None:
            return 0

        remaining = (admin.locked_until - datetime.utcnow()).total_seconds()
        return max(0, int(remaining))

    @staticmethod
    def get_remaining_attempts(admin: AdminInDB) -> int:
        """
        Get remaining login attempts before lockout.

        Args:
            admin: Admin to check

        Returns:
            Number of attempts remaining
        """
        return max(0, settings.lockout_threshold - admin.failed_login_attempts)

    @staticmethod
    async def handle_failed_login(
        admin: AdminInDB,
        ip_address: str,
        user_agent: str,
    ) -> Tuple[bool, int]:
        """
        Handle a failed login attempt.

        Args:
            admin: Admin who failed login
            ip_address: IP address of the attempt
            user_agent: User agent string

        Returns:
            Tuple of (is_now_locked, remaining_attempts)
        """
        # Increment failed attempts
        new_count = await AdminRepository.increment_failed_attempts(admin.admin_id)

        if new_count >= settings.lockout_threshold:
            # Lock the account
            await AdminRepository.lock_account(
                admin.admin_id,
                settings.lockout_duration,
            )

            # Log lockout event
            await AuditRepository.log_lockout(
                admin_id=admin.admin_id,
                username=admin.username,
                ip_address=ip_address,
                user_agent=user_agent,
                failed_attempts=new_count,
            )

            logger.warning(
                f"Account locked: {admin.username} after {new_count} failed attempts"
            )

            return True, 0

        remaining = settings.lockout_threshold - new_count
        return False, remaining

    @staticmethod
    async def handle_successful_login(admin: AdminInDB) -> None:
        """
        Handle a successful login - reset counters.

        Args:
            admin: Admin who logged in successfully
        """
        # Update last login and reset failed attempts
        await AdminRepository.update_last_login(admin.admin_id)

    @staticmethod
    async def unlock_account(admin_id: str) -> None:
        """
        Manually unlock an account.

        Args:
            admin_id: Admin ID to unlock
        """
        await AdminRepository.unlock_account(admin_id)
        logger.info(f"Account manually unlocked: {admin_id}")


async def check_lockout_status(
    admin: Optional[AdminInDB],
    username: str,
    ip_address: str,
    user_agent: str,
) -> Tuple[bool, Optional[str], int]:
    """
    Check if login should be blocked due to lockout.

    Args:
        admin: Admin (may be None if username not found)
        username: Username attempted
        ip_address: IP address
        user_agent: User agent

    Returns:
        Tuple of (is_blocked, reason, seconds_remaining)
    """
    if admin is None:
        return False, None, 0

    if LockoutService.is_locked(admin):
        remaining = LockoutService.get_remaining_lockout_seconds(admin)
        return True, f"Account locked. Try again in {remaining} seconds.", remaining

    return False, None, 0
