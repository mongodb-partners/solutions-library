"""
Models for password reset functionality.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class PasswordResetRequest(BaseModel):
    """Request model for initiating password reset."""
    email: EmailStr = Field(..., description="Email address of the admin account")


class PasswordResetVerify(BaseModel):
    """Request model for verifying a reset token."""
    token: str = Field(..., description="Password reset token")


class PasswordResetConfirm(BaseModel):
    """Request model for confirming password reset with new password."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")


class PasswordResetTokenInDB(BaseModel):
    """Password reset token stored in database."""
    token_id: str = Field(..., description="Unique token identifier")
    token_hash: str = Field(..., description="SHA256 hash of the token")
    admin_id: str = Field(..., description="Admin ID this token is for")
    email: str = Field(..., description="Email address")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(..., description="Token expiration time")
    used_at: Optional[datetime] = Field(default=None, description="When the token was used")
    is_used: bool = Field(default=False, description="Whether token has been used")


class PasswordResetTokenResponse(BaseModel):
    """Response for password reset token verification."""
    valid: bool = Field(..., description="Whether the token is valid")
    email: Optional[str] = Field(default=None, description="Email address (masked) if valid")
    message: str = Field(..., description="Status message")
