"""
Telemetry models for usage tracking and analytics.
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class TelemetryEventType(str, Enum):
    """Types of telemetry events."""
    DEMO_INTERACTION = "demo_interaction"
    API_CALL = "api_call"
    PAGE_VIEW = "page_view"
    SOLUTION_VIEW = "solution_view"
    DEMO_LAUNCH = "demo_launch"
    SEARCH = "search"
    ERROR = "error"


class TelemetryCreate(BaseModel):
    """Model for creating a telemetry event."""
    event_type: TelemetryEventType
    partner_demo: Optional[str] = None
    solution_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    tokens_used: Optional[int] = None
    model_used: Optional[str] = None
    input_length: Optional[int] = None
    output_length: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TelemetryInDB(BaseModel):
    """Model for telemetry event stored in database."""
    event_id: str
    timestamp: datetime
    event_type: TelemetryEventType
    partner_demo: Optional[str] = None
    solution_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    tokens_used: Optional[int] = None
    model_used: Optional[str] = None
    input_length: Optional[int] = None
    output_length: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    expires_at: datetime


class TelemetryResponse(BaseModel):
    """Response model for a telemetry event."""
    event_id: str
    timestamp: datetime
    event_type: str
    partner_demo: Optional[str] = None
    solution_id: Optional[str] = None
    session_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    tokens_used: Optional[int] = None
    model_used: Optional[str] = None


class TelemetryFilter(BaseModel):
    """Filter parameters for telemetry queries."""
    event_type: Optional[TelemetryEventType] = None
    solution_id: Optional[str] = None
    partner_demo: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)


class UsageStats(BaseModel):
    """Overall usage statistics."""
    total_events: int
    total_api_calls: int
    total_demo_interactions: int
    total_page_views: int
    total_tokens_used: int
    unique_sessions: int
    avg_response_time_ms: float
    error_count: int
    error_rate: float


class PercentileStats(BaseModel):
    """Response time percentile statistics."""
    p50: float
    p75: float
    p90: float
    p95: float
    p99: float
    avg: float
    min: float
    max: float
    count: int


class TimeSeriesDataPoint(BaseModel):
    """Single data point in time series."""
    timestamp: datetime
    count: int
    avg_duration_ms: Optional[float] = None
    tokens_used: Optional[int] = None


class TimeSeriesResponse(BaseModel):
    """Time series data response."""
    data: List[TimeSeriesDataPoint]
    interval: str  # hour, day, week
    start_time: datetime
    end_time: datetime
    total_count: int


class TopEndpointStats(BaseModel):
    """Statistics for a single endpoint."""
    endpoint: str
    method: str
    count: int
    avg_duration_ms: float
    error_count: int
    error_rate: float


class TopEndpointsResponse(BaseModel):
    """Response for top endpoints."""
    endpoints: List[TopEndpointStats]
    time_range_hours: int
