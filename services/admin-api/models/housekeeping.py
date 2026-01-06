"""
Housekeeping task models for scheduled maintenance operations.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    """Status of a housekeeping task."""
    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class TaskType(str, Enum):
    """Types of housekeeping tasks."""
    CLEANUP_LOGS = "cleanup_logs"
    CLEANUP_TELEMETRY = "cleanup_telemetry"
    CLEANUP_SESSIONS = "cleanup_sessions"
    CLEANUP_RESET_TOKENS = "cleanup_reset_tokens"
    CLEANUP_API_KEY_USAGE = "cleanup_api_key_usage"
    AGGREGATE_STATS = "aggregate_stats"


class TaskSchedule(str, Enum):
    """Schedule frequency for tasks."""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"


class HousekeepingTaskConfig(BaseModel):
    """Configuration for a housekeeping task."""
    retention_days: Optional[int] = None
    max_items: Optional[int] = None
    custom_params: Optional[Dict[str, Any]] = None


class HousekeepingTask(BaseModel):
    """Definition of a housekeeping task."""
    task_id: str
    name: str
    description: str
    task_type: TaskType
    schedule: TaskSchedule
    config: HousekeepingTaskConfig = Field(default_factory=HousekeepingTaskConfig)
    is_enabled: bool = True
    last_run: Optional[datetime] = None
    last_status: TaskStatus = TaskStatus.IDLE
    last_duration_ms: Optional[float] = None
    last_result: Optional[str] = None
    next_run: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class TaskRunResult(BaseModel):
    """Result of running a housekeeping task."""
    task_id: str
    task_type: str
    status: TaskStatus
    started_at: datetime
    completed_at: datetime
    duration_ms: float
    items_processed: int = 0
    items_deleted: int = 0
    error_message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class TaskUpdate(BaseModel):
    """Model for updating a housekeeping task."""
    is_enabled: Optional[bool] = None
    config: Optional[HousekeepingTaskConfig] = None


class TaskResponse(BaseModel):
    """Response model for a housekeeping task."""
    task_id: str
    name: str
    description: str
    task_type: str
    schedule: str
    config: HousekeepingTaskConfig
    is_enabled: bool
    last_run: Optional[datetime] = None
    last_status: str
    last_duration_ms: Optional[float] = None
    last_result: Optional[str] = None
    next_run: Optional[datetime] = None


class TaskListResponse(BaseModel):
    """Response model for listing tasks."""
    tasks: List[TaskResponse]


class DatabaseStats(BaseModel):
    """Database statistics."""
    collection_name: str
    document_count: int
    storage_size_mb: float
    avg_document_size_bytes: float
    index_count: int
    index_size_mb: float


class DatabaseStatsResponse(BaseModel):
    """Response model for database statistics."""
    database_name: str
    total_collections: int
    total_documents: int
    total_storage_mb: float
    collections: List[DatabaseStats]
    generated_at: datetime
