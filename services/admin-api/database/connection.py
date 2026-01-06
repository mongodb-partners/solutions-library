"""
MongoDB async connection management using Motor.
Follows patterns from reference/maap-temporal-ai-agent-qs/database/connection.py
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging

from config import settings

logger = logging.getLogger(__name__)


class MongoDB:
    """MongoDB connection manager with async support."""

    client: Optional[AsyncIOMotorClient] = None
    database: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect(cls) -> None:
        """
        Establish connection to MongoDB Atlas.
        Should be called during application startup.
        """
        if cls.client is not None:
            logger.warning("MongoDB client already connected")
            return

        try:
            logger.info(f"Connecting to MongoDB database: {settings.admin_db_name}")
            cls.client = AsyncIOMotorClient(
                settings.mongodb_uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
            )
            cls.database = cls.client[settings.admin_db_name]

            # Verify connection
            await cls.client.admin.command("ping")
            logger.info("Successfully connected to MongoDB")

        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            cls.client = None
            cls.database = None
            raise

    @classmethod
    async def disconnect(cls) -> None:
        """
        Close MongoDB connection.
        Should be called during application shutdown.
        """
        if cls.client is not None:
            logger.info("Closing MongoDB connection")
            cls.client.close()
            cls.client = None
            cls.database = None
            logger.info("MongoDB connection closed")

    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        """
        Get the database instance.
        Raises RuntimeError if not connected.
        """
        if cls.database is None:
            raise RuntimeError("MongoDB not connected. Call connect() first.")
        return cls.database

    @classmethod
    def get_collection(cls, collection_name: str):
        """
        Get a collection from the database.
        Raises RuntimeError if not connected.
        """
        db = cls.get_database()
        return db[collection_name]


# Collection name constants
class Collections:
    """MongoDB collection names."""
    ADMINS = "admins"
    ADMIN_SESSIONS = "admin_sessions"
    AUTH_AUDIT = "auth_audit"
    SOLUTION_OVERRIDES = "solution_overrides"
    APP_SETTINGS = "app_settings"
    # Phase 2-5 collections
    APP_CONFIG = "app_config"
    CONFIG_AUDIT = "config_audit"
    PASSWORD_RESET_TOKENS = "password_reset_tokens"
    LOGS = "logs"
    TELEMETRY = "telemetry"
    API_KEYS = "api_keys"
    HOUSEKEEPING_TASKS = "housekeeping_tasks"
    USAGE_ENQUIRIES = "usage_enquiries"


# Convenience functions
def get_database() -> AsyncIOMotorDatabase:
    """Get the database instance."""
    return MongoDB.get_database()


def get_admins_collection():
    """Get the admins collection."""
    return MongoDB.get_collection(Collections.ADMINS)


def get_sessions_collection():
    """Get the admin_sessions collection."""
    return MongoDB.get_collection(Collections.ADMIN_SESSIONS)


def get_audit_collection():
    """Get the auth_audit collection."""
    return MongoDB.get_collection(Collections.AUTH_AUDIT)


def get_solution_overrides_collection():
    """Get the solution_overrides collection."""
    return MongoDB.get_collection(Collections.SOLUTION_OVERRIDES)


def get_app_settings_collection():
    """Get the app_settings collection."""
    return MongoDB.get_collection(Collections.APP_SETTINGS)


def get_app_config_collection():
    """Get the app_config collection."""
    return MongoDB.get_collection(Collections.APP_CONFIG)


def get_config_audit_collection():
    """Get the config_audit collection."""
    return MongoDB.get_collection(Collections.CONFIG_AUDIT)


def get_password_reset_tokens_collection():
    """Get the password_reset_tokens collection."""
    return MongoDB.get_collection(Collections.PASSWORD_RESET_TOKENS)


def get_logs_collection():
    """Get the logs collection."""
    return MongoDB.get_collection(Collections.LOGS)


def get_telemetry_collection():
    """Get the telemetry collection."""
    return MongoDB.get_collection(Collections.TELEMETRY)


def get_api_keys_collection():
    """Get the api_keys collection."""
    return MongoDB.get_collection(Collections.API_KEYS)


def get_housekeeping_tasks_collection():
    """Get the housekeeping_tasks collection."""
    return MongoDB.get_collection(Collections.HOUSEKEEPING_TASKS)


def get_usage_enquiries_collection():
    """Get the usage_enquiries collection."""
    return MongoDB.get_collection(Collections.USAGE_ENQUIRIES)
