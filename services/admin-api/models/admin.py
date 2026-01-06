"""
Pydantic models for admin users.
"""

from datetime import datetime
from typing import Optional, Dict
from enum import Enum
from pydantic import BaseModel, Field, EmailStr, field_validator
import re


class AdminRole(str, Enum):
    """Admin role types with different permission levels."""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    VIEWER = "viewer"


class AdminStatus(str, Enum):
    """Admin account status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    LOCKED = "locked"


class AdminProfile(BaseModel):
    """Admin profile information."""
    display_name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = None


class AdminPermissions(BaseModel):
    """Admin permissions based on role."""
    can_manage_admins: bool = False
    can_manage_solutions: bool = False
    can_view_analytics: bool = False
    can_manage_settings: bool = False

    @classmethod
    def for_role(cls, role: AdminRole) -> "AdminPermissions":
        """Get default permissions for a role."""
        if role == AdminRole.SUPER_ADMIN:
            return cls(
                can_manage_admins=True,
                can_manage_solutions=True,
                can_view_analytics=True,
                can_manage_settings=True,
            )
        elif role == AdminRole.ADMIN:
            return cls(
                can_manage_admins=False,
                can_manage_solutions=True,
                can_view_analytics=True,
                can_manage_settings=False,
            )
        else:  # VIEWER
            return cls(
                can_manage_admins=False,
                can_manage_solutions=False,
                can_view_analytics=True,
                can_manage_settings=False,
            )


class AdminBase(BaseModel):
    """Base admin model with common fields."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Username must be alphanumeric with underscores."""
        if not re.match(r"^[a-zA-Z][a-zA-Z0-9_]*$", v):
            raise ValueError(
                "Username must start with a letter and contain only letters, numbers, and underscores"
            )
        return v.lower()


class AdminCreate(AdminBase):
    """Model for creating a new admin."""
    password: str = Field(..., min_length=8, max_length=128)
    role: AdminRole = Field(default=AdminRole.VIEWER)
    display_name: str = Field(..., min_length=1, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Password must meet complexity requirements."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class AdminUpdate(BaseModel):
    """Model for updating an admin."""
    email: Optional[EmailStr] = None
    role: Optional[AdminRole] = None
    status: Optional[AdminStatus] = None
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)


class AdminInDB(AdminBase):
    """Admin model as stored in MongoDB."""
    model_config = {"from_attributes": True}

    admin_id: str
    password_hash: str
    role: AdminRole
    status: AdminStatus = AdminStatus.ACTIVE
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    last_login: Optional[datetime] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    profile: AdminProfile
    permissions: AdminPermissions


class AdminResponse(BaseModel):
    """Admin response model (excludes sensitive data)."""
    admin_id: str
    username: str
    email: EmailStr
    role: AdminRole
    status: AdminStatus
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    profile: AdminProfile
    permissions: AdminPermissions


class AdminProfileResponse(BaseModel):
    """Simplified admin profile for auth responses."""
    admin_id: str
    username: str
    email: EmailStr
    role: AdminRole
    display_name: str
    permissions: Dict[str, bool]

    @classmethod
    def from_admin(cls, admin: AdminInDB) -> "AdminProfileResponse":
        """Create from AdminInDB."""
        return cls(
            admin_id=admin.admin_id,
            username=admin.username,
            email=admin.email,
            role=admin.role,
            display_name=admin.profile.display_name,
            permissions=admin.permissions.model_dump(),
        )
