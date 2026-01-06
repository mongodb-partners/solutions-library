"""
Pydantic models for admin sessions.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    """Model for creating a new session."""
    admin_id: str
    access_token_hash: str
    refresh_token_hash: str
    expires_at: datetime
    ip_address: str
    user_agent: str


class SessionInDB(BaseModel):
    """Session model as stored in MongoDB."""
    model_config = {"from_attributes": True}

    session_id: str
    admin_id: str
    access_token_hash: str
    refresh_token_hash: str
    created_at: datetime
    expires_at: datetime
    last_activity: datetime
    ip_address: str
    user_agent: str
    is_active: bool = True


class SessionUpdate(BaseModel):
    """Model for updating a session."""
    last_activity: Optional[datetime] = None
    is_active: Optional[bool] = None
    access_token_hash: Optional[str] = None
    refresh_token_hash: Optional[str] = None
    expires_at: Optional[datetime] = None


class SessionResponse(BaseModel):
    """Session response model."""
    session_id: str
    admin_id: str
    created_at: datetime
    expires_at: datetime
    last_activity: datetime
    ip_address: str
    is_active: bool
