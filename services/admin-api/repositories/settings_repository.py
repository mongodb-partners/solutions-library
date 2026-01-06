"""
Repository for application settings.
"""

from datetime import datetime
from typing import Optional
import logging

from database.connection import get_database
from models.settings import AppSettings, GeneralSettings, SecuritySettings, SettingsUpdate

logger = logging.getLogger(__name__)

# Settings document ID (singleton)
SETTINGS_DOC_ID = "app_settings"


class SettingsRepository:
    """Repository for application settings."""

    @staticmethod
    def _get_collection():
        """Get the settings collection."""
        db = get_database()
        return db["settings"]

    @staticmethod
    async def get() -> AppSettings:
        """
        Get current application settings.
        Returns default settings if none exist.
        """
        collection = SettingsRepository._get_collection()
        doc = await collection.find_one({"_id": SETTINGS_DOC_ID})

        if doc is None:
            # Return default settings
            return AppSettings()

        return AppSettings(
            general=GeneralSettings(**doc.get("general", {})),
            security=SecuritySettings(**doc.get("security", {})),
            updated_at=doc.get("updated_at"),
            updated_by=doc.get("updated_by"),
        )

    @staticmethod
    async def update(settings: SettingsUpdate, admin_id: str) -> AppSettings:
        """
        Update application settings.

        Args:
            settings: Settings to update
            admin_id: ID of admin making the change

        Returns:
            Updated settings
        """
        collection = SettingsRepository._get_collection()

        # Get current settings
        current = await SettingsRepository.get()

        # Build update document
        update_doc = {
            "updated_at": datetime.utcnow(),
            "updated_by": admin_id,
        }

        if settings.general:
            update_doc["general"] = settings.general.model_dump()
        else:
            update_doc["general"] = current.general.model_dump()

        if settings.security:
            update_doc["security"] = settings.security.model_dump()
        else:
            update_doc["security"] = current.security.model_dump()

        # Upsert the settings document
        await collection.update_one(
            {"_id": SETTINGS_DOC_ID},
            {"$set": update_doc},
            upsert=True,
        )

        logger.info(f"Settings updated by admin: {admin_id}")

        return AppSettings(
            general=GeneralSettings(**update_doc["general"]),
            security=SecuritySettings(**update_doc["security"]),
            updated_at=update_doc["updated_at"],
            updated_by=update_doc["updated_by"],
        )

    @staticmethod
    async def reset_to_defaults(admin_id: str) -> AppSettings:
        """
        Reset all settings to defaults.

        Args:
            admin_id: ID of admin making the change

        Returns:
            Default settings
        """
        collection = SettingsRepository._get_collection()

        default_settings = AppSettings()
        update_doc = {
            "general": default_settings.general.model_dump(),
            "security": default_settings.security.model_dump(),
            "updated_at": datetime.utcnow(),
            "updated_by": admin_id,
        }

        await collection.update_one(
            {"_id": SETTINGS_DOC_ID},
            {"$set": update_doc},
            upsert=True,
        )

        logger.info(f"Settings reset to defaults by admin: {admin_id}")

        return AppSettings(
            general=GeneralSettings(**update_doc["general"]),
            security=SecuritySettings(**update_doc["security"]),
            updated_at=update_doc["updated_at"],
            updated_by=update_doc["updated_by"],
        )
