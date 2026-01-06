"""
Settings routes for admin dashboard.
Only accessible by super_admin users.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.dependencies import require_super_admin
from models.admin import AdminInDB
from models.settings import AppSettings, GeneralSettings, SecuritySettings, SettingsUpdate
from repositories.settings_repository import SettingsRepository

router = APIRouter(prefix="/settings", tags=["Settings"])


# Response Models
class SettingsResponse(BaseModel):
    """Settings response."""
    general: GeneralSettings
    security: SecuritySettings
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class GeneralSettingsUpdate(BaseModel):
    """Request to update general settings."""
    app_name: Optional[str] = Field(None, min_length=1, max_length=100)
    maintenance_mode: Optional[bool] = None
    maintenance_message: Optional[str] = Field(None, max_length=500)


class SecuritySettingsUpdate(BaseModel):
    """Request to update security settings."""
    session_timeout_minutes: Optional[int] = Field(None, ge=5, le=1440)
    max_failed_login_attempts: Optional[int] = Field(None, ge=3, le=20)
    lockout_duration_minutes: Optional[int] = Field(None, ge=5, le=1440)
    require_strong_passwords: Optional[bool] = None


class UpdateSettingsRequest(BaseModel):
    """Request to update settings."""
    general: Optional[GeneralSettingsUpdate] = None
    security: Optional[SecuritySettingsUpdate] = None


def _format_settings(settings: AppSettings) -> SettingsResponse:
    """Format settings for response."""
    return SettingsResponse(
        general=settings.general,
        security=settings.security,
        updated_at=settings.updated_at,
        updated_by=settings.updated_by,
    )


@router.get("", response_model=SettingsResponse)
async def get_settings(
    current_admin: AdminInDB = Depends(require_super_admin),
) -> SettingsResponse:
    """
    Get current application settings.

    Only accessible by super_admin.
    """
    settings = await SettingsRepository.get()
    return _format_settings(settings)


@router.put("", response_model=SettingsResponse)
async def update_settings(
    request: UpdateSettingsRequest,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> SettingsResponse:
    """
    Update application settings.

    Only accessible by super_admin.
    """
    # Get current settings to merge with updates
    current = await SettingsRepository.get()

    # Build update models
    general_update = None
    if request.general:
        general_dict = current.general.model_dump()
        for key, value in request.general.model_dump(exclude_unset=True).items():
            if value is not None:
                general_dict[key] = value
        general_update = GeneralSettings(**general_dict)

    security_update = None
    if request.security:
        security_dict = current.security.model_dump()
        for key, value in request.security.model_dump(exclude_unset=True).items():
            if value is not None:
                security_dict[key] = value
        security_update = SecuritySettings(**security_dict)

    # Update settings
    settings_update = SettingsUpdate(
        general=general_update,
        security=security_update,
    )

    updated = await SettingsRepository.update(settings_update, current_admin.admin_id)
    return _format_settings(updated)


@router.post("/reset", response_model=SettingsResponse)
async def reset_settings(
    current_admin: AdminInDB = Depends(require_super_admin),
) -> SettingsResponse:
    """
    Reset all settings to defaults.

    Only accessible by super_admin.
    """
    settings = await SettingsRepository.reset_to_defaults(current_admin.admin_id)
    return _format_settings(settings)


@router.get("/system-info")
async def get_system_info(
    current_admin: AdminInDB = Depends(require_super_admin),
) -> dict:
    """
    Get system information.

    Only accessible by super_admin.
    """
    import platform
    import sys
    from config import settings as app_config

    return {
        "app_version": "1.0.0",
        "python_version": sys.version,
        "platform": platform.platform(),
        "environment": "development" if app_config.debug else "production",
        "database": {
            "name": app_config.admin_db_name,
            "connected": True,
        },
        "features": {
            "solutions_management": True,
            "admin_users": True,
            "analytics": True,
            "logs": True,
            "settings": True,
        },
    }
