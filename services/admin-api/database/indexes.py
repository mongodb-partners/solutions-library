"""
MongoDB index creation for admin dashboard collections.
Indexes are created on application startup.
"""

import logging
from datetime import timedelta
from pymongo import IndexModel, ASCENDING, DESCENDING

from config import settings
from database.connection import MongoDB, Collections

logger = logging.getLogger(__name__)


async def create_indexes() -> None:
    """
    Create all required indexes for admin dashboard collections.
    Should be called during application startup after MongoDB connection.
    """
    db = MongoDB.get_database()

    # Phase 1 collections
    await _create_admins_indexes(db)
    await _create_sessions_indexes(db)
    await _create_audit_indexes(db)
    await _create_solution_overrides_indexes(db)

    # Solutions collection
    await _create_solutions_indexes(db)

    # Phase 2-5 collections
    await _create_app_config_indexes(db)
    await _create_config_audit_indexes(db)
    await _create_password_reset_tokens_indexes(db)
    await _create_logs_indexes(db)
    await _create_telemetry_indexes(db)
    await _create_api_keys_indexes(db)
    await _create_housekeeping_tasks_indexes(db)

    logger.info("All indexes created successfully")


async def _create_admins_indexes(db) -> None:
    """Create indexes for the admins collection."""
    collection = db[Collections.ADMINS]

    indexes = [
        IndexModel([("username", ASCENDING)], unique=True, name="username_unique"),
        IndexModel([("email", ASCENDING)], unique=True, name="email_unique"),
        IndexModel([("admin_id", ASCENDING)], unique=True, name="admin_id_unique"),
        IndexModel(
            [("role", ASCENDING), ("status", ASCENDING)],
            name="role_status"
        ),
        IndexModel([("created_at", DESCENDING)], name="created_at_desc"),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info(f"Created indexes for {Collections.ADMINS}")
    except Exception as e:
        logger.error(f"Error creating indexes for {Collections.ADMINS}: {e}")
        raise


async def _create_sessions_indexes(db) -> None:
    """Create indexes for the admin_sessions collection with TTL."""
    collection = db[Collections.ADMIN_SESSIONS]

    indexes = [
        IndexModel([("session_id", ASCENDING)], unique=True, name="session_id_unique"),
        IndexModel(
            [("admin_id", ASCENDING), ("is_active", ASCENDING)],
            name="admin_active_sessions"
        ),
        IndexModel([("access_token_hash", ASCENDING)], name="access_token_lookup"),
        IndexModel([("refresh_token_hash", ASCENDING)], name="refresh_token_lookup"),
        # TTL index - documents expire based on expires_at field
        IndexModel(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0,
            name="session_ttl"
        ),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info(f"Created indexes for {Collections.ADMIN_SESSIONS}")
    except Exception as e:
        logger.error(f"Error creating indexes for {Collections.ADMIN_SESSIONS}: {e}")
        raise


async def _create_audit_indexes(db) -> None:
    """Create indexes for the auth_audit collection with TTL."""
    collection = db[Collections.AUTH_AUDIT]

    # Calculate TTL in seconds
    audit_ttl_seconds = settings.audit_log_retention_days * 24 * 60 * 60

    indexes = [
        IndexModel([("event_id", ASCENDING)], unique=True, name="event_id_unique"),
        IndexModel(
            [("admin_id", ASCENDING), ("timestamp", DESCENDING)],
            name="admin_events"
        ),
        IndexModel(
            [("event_type", ASCENDING), ("timestamp", DESCENDING)],
            name="event_type_time"
        ),
        IndexModel(
            [("ip_address", ASCENDING), ("timestamp", DESCENDING)],
            name="ip_events"
        ),
        IndexModel([("timestamp", DESCENDING)], name="timestamp_desc"),
        # TTL index - documents expire based on expires_at field
        IndexModel(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0,
            name="audit_ttl"
        ),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info(f"Created indexes for {Collections.AUTH_AUDIT}")
    except Exception as e:
        logger.error(f"Error creating indexes for {Collections.AUTH_AUDIT}: {e}")
        raise


async def _create_solution_overrides_indexes(db) -> None:
    """Create indexes for the solution_overrides collection."""
    collection = db["solution_overrides"]

    indexes = [
        IndexModel([("solution_id", ASCENDING)], unique=True, name="solution_id_unique"),
        IndexModel([("updated_at", DESCENDING)], name="updated_at_desc"),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info("Created indexes for solution_overrides")
    except Exception as e:
        logger.error(f"Error creating indexes for solution_overrides: {e}")
        raise


async def _create_solutions_indexes(db) -> None:
    """Create indexes for the solutions collection."""
    collection = db["solutions"]

    indexes = [
        IndexModel([("solution_id", ASCENDING)], unique=True, name="solution_id_unique"),
        IndexModel([("category", ASCENDING)], name="category_idx"),
        IndexModel([("partner.name", ASCENDING)], name="partner_name_idx"),
        IndexModel([("status", ASCENDING)], name="status_idx"),
        IndexModel([("featured", DESCENDING), ("name", ASCENDING)], name="featured_name"),
        IndexModel([("created_at", DESCENDING)], name="created_at_desc"),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info("Created indexes for solutions")
    except Exception as e:
        logger.error(f"Error creating indexes for solutions: {e}")
        raise


# ============================================
# Phase 2-5 Index Creation Functions
# ============================================

async def _create_app_config_indexes(db) -> None:
    """Create indexes for the app_config collection."""
    collection = db[Collections.APP_CONFIG]

    indexes = [
        IndexModel([("config_id", ASCENDING)], unique=True, name="config_id_unique"),
        IndexModel([("key", ASCENDING)], unique=True, name="key_unique"),
        IndexModel([("category", ASCENDING)], name="category_idx"),
        IndexModel([("updated_at", DESCENDING)], name="updated_at_desc"),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info(f"Created indexes for {Collections.APP_CONFIG}")
    except Exception as e:
        logger.error(f"Error creating indexes for {Collections.APP_CONFIG}: {e}")
        raise


async def _create_config_audit_indexes(db) -> None:
    """Create indexes for the config_audit collection with TTL (365 days)."""
    collection = db[Collections.CONFIG_AUDIT]

    indexes = [
        IndexModel([("audit_id", ASCENDING)], unique=True, name="audit_id_unique"),
        IndexModel(
            [("config_id", ASCENDING), ("timestamp", DESCENDING)],
            name="config_history"
        ),
        IndexModel([("timestamp", DESCENDING)], name="timestamp_desc"),
        # TTL index - 365 days
        IndexModel(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0,
            name="config_audit_ttl"
        ),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info(f"Created indexes for {Collections.CONFIG_AUDIT}")
    except Exception as e:
        logger.error(f"Error creating indexes for {Collections.CONFIG_AUDIT}: {e}")
        raise


async def _create_password_reset_tokens_indexes(db) -> None:
    """Create indexes for the password_reset_tokens collection with TTL (1 hour)."""
    collection = db[Collections.PASSWORD_RESET_TOKENS]

    indexes = [
        IndexModel([("token_id", ASCENDING)], unique=True, name="token_id_unique"),
        IndexModel([("token_hash", ASCENDING)], name="token_hash_idx"),
        IndexModel([("admin_id", ASCENDING)], name="admin_id_idx"),
        # TTL index - tokens expire based on expires_at field
        IndexModel(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0,
            name="reset_token_ttl"
        ),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info(f"Created indexes for {Collections.PASSWORD_RESET_TOKENS}")
    except Exception as e:
        logger.error(f"Error creating indexes for {Collections.PASSWORD_RESET_TOKENS}: {e}")
        raise


async def _create_logs_indexes(db) -> None:
    """Create indexes for the logs collection with TTL (30 days default)."""
    collection = db[Collections.LOGS]

    indexes = [
        IndexModel([("log_id", ASCENDING)], unique=True, name="log_id_unique"),
        IndexModel([("timestamp", DESCENDING)], name="timestamp_desc"),
        IndexModel(
            [("level", ASCENDING), ("timestamp", DESCENDING)],
            name="level_time"
        ),
        IndexModel(
            [("endpoint", ASCENDING), ("timestamp", DESCENDING)],
            name="endpoint_time"
        ),
        IndexModel([("request_id", ASCENDING)], name="request_id_idx"),
        IndexModel(
            [("admin_id", ASCENDING), ("timestamp", DESCENDING)],
            name="admin_logs"
        ),
        IndexModel(
            [("status_code", ASCENDING), ("timestamp", DESCENDING)],
            name="status_time"
        ),
        # TTL index - logs expire based on expires_at field
        IndexModel(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0,
            name="logs_ttl"
        ),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info(f"Created indexes for {Collections.LOGS}")
    except Exception as e:
        logger.error(f"Error creating indexes for {Collections.LOGS}: {e}")
        raise


async def _create_telemetry_indexes(db) -> None:
    """Create indexes for the telemetry collection with TTL (90 days default)."""
    collection = db[Collections.TELEMETRY]

    indexes = [
        IndexModel([("event_id", ASCENDING)], unique=True, name="event_id_unique"),
        IndexModel([("timestamp", DESCENDING)], name="timestamp_desc"),
        IndexModel(
            [("partner_demo", ASCENDING), ("timestamp", DESCENDING)],
            name="partner_time"
        ),
        IndexModel(
            [("event_type", ASCENDING), ("timestamp", DESCENDING)],
            name="event_type_time"
        ),
        IndexModel([("session_id", ASCENDING)], name="session_idx"),
        IndexModel([("solution_id", ASCENDING)], name="solution_idx"),
        # TTL index - telemetry expires based on expires_at field
        IndexModel(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0,
            name="telemetry_ttl"
        ),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info(f"Created indexes for {Collections.TELEMETRY}")
    except Exception as e:
        logger.error(f"Error creating indexes for {Collections.TELEMETRY}: {e}")
        raise


async def _create_api_keys_indexes(db) -> None:
    """Create indexes for the api_keys collection."""
    collection = db[Collections.API_KEYS]

    indexes = [
        IndexModel([("key_id", ASCENDING)], unique=True, name="key_id_unique"),
        IndexModel([("key_hash", ASCENDING)], unique=True, name="key_hash_unique"),
        IndexModel([("key_prefix", ASCENDING)], name="key_prefix_idx"),
        IndexModel([("is_active", ASCENDING)], name="active_keys"),
        IndexModel([("created_at", DESCENDING)], name="created_at_desc"),
        IndexModel([("expires_at", ASCENDING)], name="expires_at_idx"),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info(f"Created indexes for {Collections.API_KEYS}")
    except Exception as e:
        logger.error(f"Error creating indexes for {Collections.API_KEYS}: {e}")
        raise


async def _create_housekeeping_tasks_indexes(db) -> None:
    """Create indexes for the housekeeping_tasks collection."""
    collection = db[Collections.HOUSEKEEPING_TASKS]

    indexes = [
        IndexModel([("task_id", ASCENDING)], unique=True, name="task_id_unique"),
        IndexModel([("is_enabled", ASCENDING)], name="enabled_tasks"),
        IndexModel([("next_run", ASCENDING)], name="next_run_idx"),
    ]

    try:
        await collection.create_indexes(indexes)
        logger.info(f"Created indexes for {Collections.HOUSEKEEPING_TASKS}")
    except Exception as e:
        logger.error(f"Error creating indexes for {Collections.HOUSEKEEPING_TASKS}: {e}")
        raise
