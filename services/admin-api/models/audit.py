"""
Pydantic models for authentication audit logs.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class AuthEventType(str, Enum):
    """Types of authentication events."""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    TOKEN_REFRESH = "token_refresh"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET = "password_reset"
    LOCKOUT = "lockout"
    UNLOCK = "unlock"
    SESSION_EXPIRED = "session_expired"


class AuditEventDetails(BaseModel):
    """Additional details for an audit event."""
    reason: Optional[str] = None
    session_id: Optional[str] = None
    previous_failed_attempts: Optional[int] = None
    extra: Optional[Dict[str, Any]] = None


class AuditEventCreate(BaseModel):
    """Model for creating an audit event."""
    event_type: AuthEventType
    admin_id: Optional[str] = None
    username_attempted: str
    ip_address: str
    user_agent: str
    details: Optional[AuditEventDetails] = None


class AuditEventInDB(BaseModel):
    """Audit event model as stored in MongoDB."""
    model_config = {"from_attributes": True}

    event_id: str
    event_type: AuthEventType
    admin_id: Optional[str] = None
    username_attempted: str
    timestamp: datetime
    ip_address: str
    user_agent: str
    details: AuditEventDetails
    expires_at: datetime


class AuditEventResponse(BaseModel):
    """Audit event response model."""
    event_id: str
    event_type: AuthEventType
    admin_id: Optional[str] = None
    username_attempted: str
    timestamp: datetime
    ip_address: str
    user_agent: str
    details: Optional[AuditEventDetails] = None


class AuditEventFilter(BaseModel):
    """Filter criteria for querying audit events."""
    event_type: Optional[AuthEventType] = None
    admin_id: Optional[str] = None
    ip_address: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)
