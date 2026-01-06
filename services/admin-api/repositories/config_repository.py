"""
Repository for configuration management with caching and encryption.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
import uuid

from database.connection import get_app_config_collection, get_config_audit_collection
from models.config import (
    ConfigCreate,
    ConfigUpdate,
    ConfigInDB,
    ConfigCategory,
    ConfigAuditInDB,
    ConfigAuditAction,
)
from services.encryption import EncryptionService

logger = logging.getLogger(__name__)


def _generate_config_id() -> str:
    """Generate a unique configuration ID."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_part = uuid.uuid4().hex[:8]
    return f"CFG_{timestamp}_{unique_part}"


def _generate_audit_id() -> str:
    """Generate a unique audit ID."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_part = uuid.uuid4().hex[:8]
    return f"CFGAUD_{timestamp}_{unique_part}"


class ConfigRepository:
    """Repository for configuration CRUD operations with caching."""

    # In-memory cache
    _cache: Dict[str, ConfigInDB] = {}
    _cache_time: Optional[datetime] = None
    _cache_ttl_seconds: int = 60

    @classmethod
    def _is_cache_valid(cls) -> bool:
        """Check if cache is still valid."""
        if cls._cache_time is None:
            return False
        return (datetime.utcnow() - cls._cache_time).total_seconds() < cls._cache_ttl_seconds

    @classmethod
    def invalidate_cache(cls) -> None:
        """Invalidate the configuration cache."""
        cls._cache = {}
        cls._cache_time = None
        logger.debug("Configuration cache invalidated")

    @classmethod
    async def _load_cache(cls) -> None:
        """Load all configurations into cache."""
        collection = get_app_config_collection()
        cursor = collection.find({})
        cls._cache = {}
        async for doc in cursor:
            config = cls._doc_to_model(doc)
            cls._cache[config.key] = config
        cls._cache_time = datetime.utcnow()
        logger.debug(f"Configuration cache loaded with {len(cls._cache)} entries")

    @classmethod
    def _doc_to_model(cls, doc: dict) -> ConfigInDB:
        """Convert MongoDB document to ConfigInDB model."""
        # Decrypt value if encrypted
        value = doc.get("value", "")
        if doc.get("is_encrypted", False):
            try:
                value = EncryptionService.decrypt(value)
            except Exception as e:
                logger.error(f"Failed to decrypt config {doc.get('key')}: {e}")
                value = "[DECRYPTION_FAILED]"

        return ConfigInDB(
            config_id=doc["config_id"],
            key=doc["key"],
            value=value,
            category=ConfigCategory(doc["category"]),
            description=doc.get("description"),
            is_sensitive=doc.get("is_sensitive", False),
            is_encrypted=doc.get("is_encrypted", False),
            validation_type=doc.get("validation_type", "none"),
            default_value=doc.get("default_value"),
            metadata=doc.get("metadata"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            created_by=doc["created_by"],
            updated_by=doc["updated_by"],
        )

    @classmethod
    async def create(cls, config_data: ConfigCreate, admin_id: str) -> ConfigInDB:
        """Create a new configuration entry."""
        collection = get_app_config_collection()
        now = datetime.utcnow()

        # Encrypt value if sensitive
        value = config_data.value
        is_encrypted = False
        if config_data.is_sensitive:
            value = EncryptionService.encrypt(config_data.value)
            is_encrypted = True

        doc = {
            "config_id": _generate_config_id(),
            "key": config_data.key,
            "value": value,
            "category": config_data.category.value,
            "description": config_data.description,
            "is_sensitive": config_data.is_sensitive,
            "is_encrypted": is_encrypted,
            "validation_type": config_data.validation_type.value,
            "default_value": config_data.default_value,
            "metadata": config_data.metadata,
            "created_at": now,
            "updated_at": now,
            "created_by": admin_id,
            "updated_by": admin_id,
        }

        await collection.insert_one(doc)

        # Log audit
        await ConfigAuditRepository.log_change(
            config_id=doc["config_id"],
            config_key=config_data.key,
            action=ConfigAuditAction.CREATE,
            previous_value=None,
            new_value=config_data.value,
            admin_id=admin_id,
            ip_address="",  # Will be set by route
            user_agent="",
        )

        # Invalidate cache
        cls.invalidate_cache()

        # Return with decrypted value
        doc["value"] = config_data.value
        return cls._doc_to_model(doc)

    @classmethod
    async def get_by_id(cls, config_id: str) -> Optional[ConfigInDB]:
        """Get a configuration by ID."""
        collection = get_app_config_collection()
        doc = await collection.find_one({"config_id": config_id})
        if doc:
            return cls._doc_to_model(doc)
        return None

    @classmethod
    async def get_by_key(cls, key: str) -> Optional[ConfigInDB]:
        """Get a configuration by key."""
        # Check cache first
        if cls._is_cache_valid() and key in cls._cache:
            return cls._cache[key]

        collection = get_app_config_collection()
        doc = await collection.find_one({"key": key})
        if doc:
            return cls._doc_to_model(doc)
        return None

    @classmethod
    async def get_all(cls, category: Optional[ConfigCategory] = None) -> List[ConfigInDB]:
        """Get all configurations, optionally filtered by category."""
        # Refresh cache if needed
        if not cls._is_cache_valid():
            await cls._load_cache()

        configs = list(cls._cache.values())

        if category:
            configs = [c for c in configs if c.category == category]

        # Sort by key
        configs.sort(key=lambda c: c.key)
        return configs

    @classmethod
    async def update(
        cls, config_id: str, update_data: ConfigUpdate, admin_id: str
    ) -> Optional[ConfigInDB]:
        """Update a configuration entry."""
        collection = get_app_config_collection()

        # Get existing config
        existing = await cls.get_by_id(config_id)
        if not existing:
            return None

        # Build update document
        update_doc = {"updated_at": datetime.utcnow(), "updated_by": admin_id}

        new_value = existing.value
        if update_data.value is not None:
            new_value = update_data.value
            # Check if we need to encrypt
            is_sensitive = update_data.is_sensitive if update_data.is_sensitive is not None else existing.is_sensitive
            if is_sensitive:
                update_doc["value"] = EncryptionService.encrypt(update_data.value)
                update_doc["is_encrypted"] = True
            else:
                update_doc["value"] = update_data.value
                update_doc["is_encrypted"] = False

        if update_data.description is not None:
            update_doc["description"] = update_data.description
        if update_data.is_sensitive is not None:
            update_doc["is_sensitive"] = update_data.is_sensitive
        if update_data.validation_type is not None:
            update_doc["validation_type"] = update_data.validation_type.value
        if update_data.default_value is not None:
            update_doc["default_value"] = update_data.default_value
        if update_data.metadata is not None:
            update_doc["metadata"] = update_data.metadata

        await collection.update_one(
            {"config_id": config_id},
            {"$set": update_doc}
        )

        # Log audit
        await ConfigAuditRepository.log_change(
            config_id=config_id,
            config_key=existing.key,
            action=ConfigAuditAction.UPDATE,
            previous_value=existing.value,
            new_value=new_value,
            admin_id=admin_id,
            ip_address="",
            user_agent="",
        )

        # Invalidate cache
        cls.invalidate_cache()

        return await cls.get_by_id(config_id)

    @classmethod
    async def delete(cls, config_id: str, admin_id: str) -> bool:
        """Delete a configuration entry."""
        collection = get_app_config_collection()

        # Get existing for audit
        existing = await cls.get_by_id(config_id)
        if not existing:
            return False

        result = await collection.delete_one({"config_id": config_id})

        if result.deleted_count > 0:
            # Log audit
            await ConfigAuditRepository.log_change(
                config_id=config_id,
                config_key=existing.key,
                action=ConfigAuditAction.DELETE,
                previous_value=existing.value,
                new_value=None,
                admin_id=admin_id,
                ip_address="",
                user_agent="",
            )

            # Invalidate cache
            cls.invalidate_cache()
            return True

        return False

    @classmethod
    async def get_value(cls, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get a configuration value by key.
        Convenience method for quick value lookups.
        """
        config = await cls.get_by_key(key)
        if config:
            return config.value
        return default

    @classmethod
    async def export_all(cls, include_sensitive: bool = False) -> Dict[str, Any]:
        """Export all configurations as a dictionary."""
        configs = await cls.get_all()
        export_data = {
            "exported_at": datetime.utcnow().isoformat(),
            "configs": []
        }

        for config in configs:
            config_dict = {
                "key": config.key,
                "value": config.value if (include_sensitive or not config.is_sensitive) else None,
                "category": config.category.value,
                "description": config.description,
                "is_sensitive": config.is_sensitive,
                "validation_type": config.validation_type.value,
                "default_value": config.default_value,
                "metadata": config.metadata,
            }
            export_data["configs"].append(config_dict)

        return export_data

    @classmethod
    async def import_configs(
        cls,
        configs: List[Dict[str, Any]],
        admin_id: str,
        overwrite: bool = False
    ) -> Dict[str, int]:
        """Import configurations from a list of dictionaries."""
        results = {"created": 0, "updated": 0, "skipped": 0, "errors": []}

        for config_dict in configs:
            try:
                key = config_dict.get("key")
                if not key:
                    results["errors"].append("Missing key in config")
                    continue

                existing = await cls.get_by_key(key)

                if existing:
                    if overwrite:
                        # Update existing
                        update_data = ConfigUpdate(
                            value=config_dict.get("value"),
                            description=config_dict.get("description"),
                            is_sensitive=config_dict.get("is_sensitive"),
                            metadata=config_dict.get("metadata"),
                        )
                        await cls.update(existing.config_id, update_data, admin_id)
                        results["updated"] += 1
                    else:
                        results["skipped"] += 1
                else:
                    # Create new
                    create_data = ConfigCreate(
                        key=key,
                        value=config_dict.get("value", ""),
                        category=ConfigCategory(config_dict.get("category", "settings")),
                        description=config_dict.get("description"),
                        is_sensitive=config_dict.get("is_sensitive", False),
                        validation_type=config_dict.get("validation_type", "none"),
                        default_value=config_dict.get("default_value"),
                        metadata=config_dict.get("metadata"),
                    )
                    await cls.create(create_data, admin_id)
                    results["created"] += 1

            except Exception as e:
                results["errors"].append(f"Error importing {config_dict.get('key', 'unknown')}: {str(e)}")

        return results


class ConfigAuditRepository:
    """Repository for configuration audit logging."""

    @classmethod
    async def log_change(
        cls,
        config_id: str,
        config_key: str,
        action: ConfigAuditAction,
        previous_value: Optional[str],
        new_value: Optional[str],
        admin_id: str,
        ip_address: str,
        user_agent: str,
    ) -> None:
        """Log a configuration change."""
        collection = get_config_audit_collection()
        now = datetime.utcnow()

        doc = {
            "audit_id": _generate_audit_id(),
            "config_id": config_id,
            "config_key": config_key,
            "action": action.value,
            "previous_value_hash": EncryptionService.hash_value(previous_value) if previous_value else None,
            "new_value_hash": EncryptionService.hash_value(new_value) if new_value else None,
            "admin_id": admin_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": now,
            "expires_at": now + timedelta(days=365),  # TTL: 365 days
        }

        try:
            await collection.insert_one(doc)
        except Exception as e:
            logger.error(f"Failed to log config audit: {e}")

    @classmethod
    async def get_history(
        cls, config_id: str, limit: int = 50
    ) -> List[ConfigAuditInDB]:
        """Get audit history for a configuration."""
        collection = get_config_audit_collection()
        cursor = collection.find(
            {"config_id": config_id}
        ).sort("timestamp", -1).limit(limit)

        audits = []
        async for doc in cursor:
            audits.append(ConfigAuditInDB(
                audit_id=doc["audit_id"],
                config_id=doc["config_id"],
                config_key=doc["config_key"],
                action=ConfigAuditAction(doc["action"]),
                previous_value_hash=doc.get("previous_value_hash"),
                new_value_hash=doc.get("new_value_hash"),
                admin_id=doc["admin_id"],
                ip_address=doc.get("ip_address", ""),
                user_agent=doc.get("user_agent", ""),
                timestamp=doc["timestamp"],
                expires_at=doc["expires_at"],
            ))

        return audits
