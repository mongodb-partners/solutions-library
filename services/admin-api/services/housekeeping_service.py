"""
Housekeeping service for executing maintenance tasks.
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any

from database.connection import MongoDB
from models.housekeeping import (
    TaskType,
    TaskStatus,
    TaskRunResult,
    HousekeepingTaskConfig,
)
from repositories.housekeeping_repository import HousekeepingRepository

logger = logging.getLogger(__name__)


class HousekeepingService:
    """Service for executing housekeeping tasks."""

    @staticmethod
    async def run_task(task_id: str) -> TaskRunResult:
        """
        Run a housekeeping task by ID.

        Returns the result of the task execution.
        """
        task = await HousekeepingRepository.get_by_id(task_id)
        if not task:
            raise ValueError(f"Task not found: {task_id}")

        start_time = time.time()
        started_at = datetime.utcnow()

        try:
            # Execute the appropriate task
            if task.task_type == TaskType.CLEANUP_LOGS:
                items_processed, items_deleted = await HousekeepingService._cleanup_logs(task.config)
            elif task.task_type == TaskType.CLEANUP_TELEMETRY:
                items_processed, items_deleted = await HousekeepingService._cleanup_telemetry(task.config)
            elif task.task_type == TaskType.CLEANUP_SESSIONS:
                items_processed, items_deleted = await HousekeepingService._cleanup_sessions(task.config)
            elif task.task_type == TaskType.CLEANUP_RESET_TOKENS:
                items_processed, items_deleted = await HousekeepingService._cleanup_reset_tokens(task.config)
            elif task.task_type == TaskType.CLEANUP_API_KEY_USAGE:
                items_processed, items_deleted = await HousekeepingService._cleanup_api_key_usage(task.config)
            elif task.task_type == TaskType.AGGREGATE_STATS:
                items_processed, items_deleted = await HousekeepingService._aggregate_stats(task.config)
            else:
                raise ValueError(f"Unknown task type: {task.task_type}")

            completed_at = datetime.utcnow()
            duration_ms = (time.time() - start_time) * 1000

            result = TaskRunResult(
                task_id=task_id,
                task_type=task.task_type.value,
                status=TaskStatus.SUCCESS,
                started_at=started_at,
                completed_at=completed_at,
                duration_ms=round(duration_ms, 2),
                items_processed=items_processed,
                items_deleted=items_deleted,
            )

            logger.info(
                f"Task {task_id} completed: processed={items_processed}, deleted={items_deleted}, "
                f"duration={duration_ms:.2f}ms"
            )

        except Exception as e:
            completed_at = datetime.utcnow()
            duration_ms = (time.time() - start_time) * 1000

            result = TaskRunResult(
                task_id=task_id,
                task_type=task.task_type.value,
                status=TaskStatus.FAILED,
                started_at=started_at,
                completed_at=completed_at,
                duration_ms=round(duration_ms, 2),
                error_message=str(e),
            )

            logger.error(f"Task {task_id} failed: {e}")

        # Record the run result
        await HousekeepingRepository.record_run(task_id, result)

        return result

    @staticmethod
    async def _cleanup_logs(config: HousekeepingTaskConfig) -> tuple[int, int]:
        """Cleanup old system logs."""
        collection = MongoDB.get_database()["logs"]

        retention_days = config.retention_days or 30
        cutoff = datetime.utcnow() - timedelta(days=retention_days)

        # Count before
        count_before = await collection.count_documents({})

        # Delete old logs
        result = await collection.delete_many({"timestamp": {"$lt": cutoff}})

        deleted = result.deleted_count
        return count_before, deleted

    @staticmethod
    async def _cleanup_telemetry(config: HousekeepingTaskConfig) -> tuple[int, int]:
        """Cleanup old telemetry events."""
        collection = MongoDB.get_database()["telemetry"]

        retention_days = config.retention_days or 90
        cutoff = datetime.utcnow() - timedelta(days=retention_days)

        # Count before
        count_before = await collection.count_documents({})

        # Delete old telemetry
        result = await collection.delete_many({"timestamp": {"$lt": cutoff}})

        deleted = result.deleted_count
        return count_before, deleted

    @staticmethod
    async def _cleanup_sessions(config: HousekeepingTaskConfig) -> tuple[int, int]:
        """Cleanup expired sessions."""
        collection = MongoDB.get_database()["admin_sessions"]

        now = datetime.utcnow()

        # Count before
        count_before = await collection.count_documents({})

        # Delete expired sessions
        result = await collection.delete_many({
            "$or": [
                {"expires_at": {"$lt": now}},
                {"is_active": False},
            ]
        })

        deleted = result.deleted_count
        return count_before, deleted

    @staticmethod
    async def _cleanup_reset_tokens(config: HousekeepingTaskConfig) -> tuple[int, int]:
        """Cleanup expired password reset tokens."""
        collection = MongoDB.get_database()["password_reset_tokens"]

        now = datetime.utcnow()

        # Count before
        count_before = await collection.count_documents({})

        # Delete expired or used tokens
        result = await collection.delete_many({
            "$or": [
                {"expires_at": {"$lt": now}},
                {"is_used": True},
            ]
        })

        deleted = result.deleted_count
        return count_before, deleted

    @staticmethod
    async def _cleanup_api_key_usage(config: HousekeepingTaskConfig) -> tuple[int, int]:
        """Cleanup old API key usage records."""
        collection = MongoDB.get_database()["api_key_usage"]

        retention_days = config.retention_days or 30
        cutoff = datetime.utcnow() - timedelta(days=retention_days)

        # Count before
        count_before = await collection.count_documents({})

        # Delete old usage records
        result = await collection.delete_many({"timestamp": {"$lt": cutoff}})

        deleted = result.deleted_count
        return count_before, deleted

    @staticmethod
    async def _aggregate_stats(config: HousekeepingTaskConfig) -> tuple[int, int]:
        """Aggregate daily statistics (placeholder for future implementation)."""
        # This could aggregate daily stats from various collections
        # For now, just return 0,0 as a placeholder
        return 0, 0
