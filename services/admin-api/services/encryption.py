"""
Encryption service for sensitive configuration values.
Uses Fernet symmetric encryption from cryptography library.
"""

import base64
import hashlib
import logging
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken

from config import settings

logger = logging.getLogger(__name__)


class EncryptionService:
    """Service for encrypting and decrypting sensitive values."""

    _fernet: Optional[Fernet] = None

    @classmethod
    def _get_fernet(cls) -> Fernet:
        """Get or create Fernet instance using JWT secret as key."""
        if cls._fernet is None:
            # Derive a 32-byte key from JWT secret using SHA256
            key_bytes = hashlib.sha256(settings.jwt_secret.encode()).digest()
            # Fernet requires base64-encoded 32-byte key
            fernet_key = base64.urlsafe_b64encode(key_bytes)
            cls._fernet = Fernet(fernet_key)
        return cls._fernet

    @classmethod
    def encrypt(cls, plaintext: str) -> str:
        """
        Encrypt a plaintext string.

        Args:
            plaintext: The string to encrypt

        Returns:
            Base64-encoded encrypted string
        """
        try:
            fernet = cls._get_fernet()
            encrypted = fernet.encrypt(plaintext.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise ValueError("Failed to encrypt value")

    @classmethod
    def decrypt(cls, ciphertext: str) -> str:
        """
        Decrypt a ciphertext string.

        Args:
            ciphertext: The base64-encoded encrypted string

        Returns:
            Decrypted plaintext string
        """
        try:
            fernet = cls._get_fernet()
            decrypted = fernet.decrypt(ciphertext.encode())
            return decrypted.decode()
        except InvalidToken:
            logger.error("Invalid token during decryption - data may be corrupted or key changed")
            raise ValueError("Failed to decrypt value - invalid token")
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise ValueError("Failed to decrypt value")

    @classmethod
    def hash_value(cls, value: str) -> str:
        """
        Create a SHA256 hash of a value (for audit logging).

        Args:
            value: The string to hash

        Returns:
            Hex-encoded SHA256 hash
        """
        return hashlib.sha256(value.encode()).hexdigest()

    @classmethod
    def reset(cls) -> None:
        """Reset the Fernet instance (useful for testing)."""
        cls._fernet = None
