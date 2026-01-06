"""
Repository for password reset token management.
"""

import logging
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional
import uuid

from database.connection import get_password_reset_tokens_collection
from models.password_reset import PasswordResetTokenInDB
from config import settings

logger = logging.getLogger(__name__)


def _generate_token_id() -> str:
    """Generate a unique token ID."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_part = uuid.uuid4().hex[:8]
    return f"PWRST_{timestamp}_{unique_part}"


def _hash_token(token: str) -> str:
    """Hash a token using SHA256."""
    return hashlib.sha256(token.encode()).hexdigest()


class PasswordResetRepository:
    """Repository for password reset token CRUD operations."""

    @classmethod
    def generate_token(cls) -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(32)

    @classmethod
    async def create_token(
        cls,
        admin_id: str,
        email: str,
    ) -> str:
        """
        Create a new password reset token.

        Args:
            admin_id: Admin ID to create token for
            email: Admin's email address

        Returns:
            The raw token (to be sent via email)
        """
        collection = get_password_reset_tokens_collection()

        # Invalidate any existing unused tokens for this admin
        await cls.invalidate_all(admin_id)

        # Generate new token
        raw_token = cls.generate_token()
        token_hash = _hash_token(raw_token)

        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=settings.password_reset_expiry)

        doc = {
            "token_id": _generate_token_id(),
            "token_hash": token_hash,
            "admin_id": admin_id,
            "email": email,
            "created_at": now,
            "expires_at": expires_at,
            "used_at": None,
            "is_used": False,
        }

        await collection.insert_one(doc)
        logger.info(f"Password reset token created for admin {admin_id}")

        return raw_token

    @classmethod
    async def verify_token(cls, token: str) -> Optional[PasswordResetTokenInDB]:
        """
        Verify a password reset token.

        Args:
            token: The raw token to verify

        Returns:
            Token data if valid, None otherwise
        """
        collection = get_password_reset_tokens_collection()
        token_hash = _hash_token(token)

        doc = await collection.find_one({
            "token_hash": token_hash,
            "is_used": False,
            "expires_at": {"$gt": datetime.utcnow()},
        })

        if doc:
            return PasswordResetTokenInDB(
                token_id=doc["token_id"],
                token_hash=doc["token_hash"],
                admin_id=doc["admin_id"],
                email=doc["email"],
                created_at=doc["created_at"],
                expires_at=doc["expires_at"],
                used_at=doc.get("used_at"),
                is_used=doc["is_used"],
            )

        return None

    @classmethod
    async def mark_used(cls, token: str) -> bool:
        """
        Mark a token as used.

        Args:
            token: The raw token to mark as used

        Returns:
            True if token was marked as used, False otherwise
        """
        collection = get_password_reset_tokens_collection()
        token_hash = _hash_token(token)

        result = await collection.update_one(
            {
                "token_hash": token_hash,
                "is_used": False,
            },
            {
                "$set": {
                    "is_used": True,
                    "used_at": datetime.utcnow(),
                }
            }
        )

        if result.modified_count > 0:
            logger.info(f"Password reset token marked as used")
            return True

        return False

    @classmethod
    async def invalidate_all(cls, admin_id: str) -> int:
        """
        Invalidate all unused tokens for an admin.

        Args:
            admin_id: Admin ID to invalidate tokens for

        Returns:
            Number of tokens invalidated
        """
        collection = get_password_reset_tokens_collection()

        result = await collection.update_many(
            {
                "admin_id": admin_id,
                "is_used": False,
            },
            {
                "$set": {
                    "is_used": True,
                    "used_at": datetime.utcnow(),
                }
            }
        )

        if result.modified_count > 0:
            logger.info(f"Invalidated {result.modified_count} tokens for admin {admin_id}")

        return result.modified_count

    @classmethod
    async def cleanup_expired(cls) -> int:
        """
        Remove expired tokens.

        Returns:
            Number of tokens removed
        """
        collection = get_password_reset_tokens_collection()

        result = await collection.delete_many({
            "expires_at": {"$lt": datetime.utcnow()},
        })

        if result.deleted_count > 0:
            logger.info(f"Cleaned up {result.deleted_count} expired password reset tokens")

        return result.deleted_count
