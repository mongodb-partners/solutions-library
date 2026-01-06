"""
Pydantic models for application settings.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SecuritySettings(BaseModel):
    """Security-related settings."""
    session_timeout_minutes: int = Field(default=60, ge=5, le=1440)
    max_failed_login_attempts: int = Field(default=5, ge=3, le=20)
    lockout_duration_minutes: int = Field(default=15, ge=5, le=1440)
    require_strong_passwords: bool = Field(default=True)


class GeneralSettings(BaseModel):
    """General application settings."""
    app_name: str = Field(default="MongoDB Solutions Library")
    maintenance_mode: bool = Field(default=False)
    maintenance_message: str = Field(default="System is under maintenance. Please try again later.")


class AppSettings(BaseModel):
    """Complete application settings."""
    general: GeneralSettings = Field(default_factory=GeneralSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class SettingsUpdate(BaseModel):
    """Model for updating settings."""
    general: Optional[GeneralSettings] = None
    security: Optional[SecuritySettings] = None
