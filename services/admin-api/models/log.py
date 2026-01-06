"""
Models for HTTP request logging.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel, Field


class LogLevel(str, Enum):
    """Log levels."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogCreate(BaseModel):
    """Model for creating a log entry."""
    level: LogLevel = LogLevel.INFO
    message: str
    service: str = "admin-api"
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    admin_id: Optional[str] = None
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


class LogInDB(BaseModel):
    """Log entry as stored in MongoDB."""
    model_config = {"from_attributes": True}

    log_id: str
    timestamp: datetime
    level: LogLevel
    message: str
    service: str
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    admin_id: Optional[str] = None
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None
    expires_at: datetime


class LogResponse(BaseModel):
    """Log entry response."""
    log_id: str
    timestamp: datetime
    level: str
    message: str
    service: str
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    admin_id: Optional[str] = None
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


class LogFilter(BaseModel):
    """Filter criteria for querying logs."""
    level: Optional[LogLevel] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    admin_id: Optional[str] = None
    request_id: Optional[str] = None
    search: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    has_error: Optional[bool] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)


class LogsListResponse(BaseModel):
    """Paginated logs response."""
    logs: List[LogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorAggregation(BaseModel):
    """Error aggregation result."""
    error_type: str
    count: int
    last_occurrence: datetime
    sample_message: Optional[str] = None
    sample_endpoint: Optional[str] = None


class ErrorAggregationResponse(BaseModel):
    """Error aggregation response."""
    errors: List[ErrorAggregation]
    total_errors: int
    time_range_hours: int
