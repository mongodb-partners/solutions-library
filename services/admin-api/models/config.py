"""
Configuration models for dynamic app configuration management.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel, Field


class ConfigCategory(str, Enum):
    """Configuration categories."""
    API_KEYS = "api_keys"
    SECRETS = "secrets"
    FEATURES = "features"
    SETTINGS = "settings"


class ValidationType(str, Enum):
    """Validation types for configuration values."""
    NONE = "none"
    API_KEY = "api_key"
    URL = "url"
    BOOLEAN = "boolean"
    NUMBER = "number"
    JSON = "json"


class ConfigCreate(BaseModel):
    """Request model for creating a configuration entry."""
    key: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern="^[A-Z][A-Z0-9_]*$",
        description="Configuration key (uppercase with underscores)"
    )
    value: str = Field(..., description="Configuration value")
    category: ConfigCategory = Field(..., description="Configuration category")
    description: Optional[str] = Field(None, max_length=500)
    is_sensitive: bool = Field(default=False, description="Whether to mask value in UI")
    validation_type: ValidationType = Field(default=ValidationType.NONE)
    default_value: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional metadata (e.g., test_endpoint for API keys)"
    )


class ConfigUpdate(BaseModel):
    """Request model for updating a configuration entry."""
    value: Optional[str] = None
    description: Optional[str] = Field(None, max_length=500)
    is_sensitive: Optional[bool] = None
    validation_type: Optional[ValidationType] = None
    default_value: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ConfigInDB(BaseModel):
    """Configuration entry as stored in database."""
    config_id: str
    key: str
    value: str  # Encrypted if is_sensitive
    category: ConfigCategory
    description: Optional[str] = None
    is_sensitive: bool = False
    is_encrypted: bool = False
    validation_type: ValidationType = ValidationType.NONE
    default_value: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: str


class ConfigResponse(BaseModel):
    """Response model for configuration entry (masks sensitive values)."""
    config_id: str
    key: str
    value: str  # Masked if sensitive (shows "********")
    category: ConfigCategory
    description: Optional[str] = None
    is_sensitive: bool = False
    validation_type: ValidationType = ValidationType.NONE
    default_value: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_db(cls, config: ConfigInDB, mask_sensitive: bool = True) -> "ConfigResponse":
        """Create response from database model, optionally masking sensitive values."""
        value = config.value
        if mask_sensitive and config.is_sensitive:
            value = "********"

        return cls(
            config_id=config.config_id,
            key=config.key,
            value=value,
            category=config.category,
            description=config.description,
            is_sensitive=config.is_sensitive,
            validation_type=config.validation_type,
            default_value=config.default_value,
            metadata=config.metadata,
            created_at=config.created_at,
            updated_at=config.updated_at,
        )


class ConfigListResponse(BaseModel):
    """Response model for listing configurations."""
    configs: List[ConfigResponse]
    total: int


class ConfigAuditAction(str, Enum):
    """Audit action types."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class ConfigAuditInDB(BaseModel):
    """Configuration audit entry as stored in database."""
    audit_id: str
    config_id: str
    config_key: str
    action: ConfigAuditAction
    previous_value_hash: Optional[str] = None  # SHA256 hash for audit (not actual value)
    new_value_hash: Optional[str] = None
    admin_id: str
    ip_address: str
    user_agent: str
    timestamp: datetime
    expires_at: datetime  # TTL: 365 days


class ConfigAuditResponse(BaseModel):
    """Response model for configuration audit entry."""
    audit_id: str
    config_id: str
    config_key: str
    action: ConfigAuditAction
    admin_id: str
    timestamp: datetime


class ConfigImportRequest(BaseModel):
    """Request model for importing configurations."""
    configs: List[Dict[str, Any]]
    overwrite: bool = Field(
        default=False,
        description="Whether to overwrite existing configs with same key"
    )


class ConfigImportResponse(BaseModel):
    """Response model for configuration import."""
    created: int
    updated: int
    skipped: int
    errors: List[str]


class ConfigTestRequest(BaseModel):
    """Request model for testing API key connection."""
    test_endpoint: Optional[str] = Field(
        None,
        description="Override endpoint to test (uses metadata.test_endpoint if not provided)"
    )


class ConfigTestResponse(BaseModel):
    """Response model for API key connection test."""
    success: bool
    message: str
    response_time_ms: Optional[float] = None
    status_code: Optional[int] = None
