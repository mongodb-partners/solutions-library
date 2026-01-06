"""
Housekeeping repository for managing maintenance tasks.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from database.connection import MongoDB
from models.housekeeping import (
    HousekeepingTask,
    TaskStatus,
    TaskType,
    TaskSchedule,
    TaskUpdate,
    TaskRunResult,
    HousekeepingTaskConfig,
    DatabaseStats,
)

logger = logging.getLogger(__name__)

# Default task definitions
DEFAULT_TASKS = [
    {
        "task_id": "cleanup_logs",
        "name": "Cleanup Old Logs",
        "description": "Remove system logs older than retention period",
        "task_type": TaskType.CLEANUP_LOGS,
        "schedule": TaskSchedule.DAILY,
        "config": {"retention_days": 30},
    },
    {
        "task_id": "cleanup_telemetry",
        "name": "Cleanup Old Telemetry",
        "description": "Remove telemetry events older than retention period",
        "task_type": TaskType.CLEANUP_TELEMETRY,
        "schedule": TaskSchedule.DAILY,
        "config": {"retention_days": 90},
    },
    {
        "task_id": "cleanup_sessions",
        "name": "Cleanup Expired Sessions",
        "description": "Remove expired admin sessions",
        "task_type": TaskType.CLEANUP_SESSIONS,
        "schedule": TaskSchedule.HOURLY,
        "config": {},
    },
    {
        "task_id": "cleanup_reset_tokens",
        "name": "Cleanup Reset Tokens",
        "description": "Remove expired password reset tokens",
        "task_type": TaskType.CLEANUP_RESET_TOKENS,
        "schedule": TaskSchedule.HOURLY,
        "config": {},
    },
    {
        "task_id": "cleanup_api_key_usage",
        "name": "Cleanup API Key Usage",
        "description": "Remove old API key usage records",
        "task_type": TaskType.CLEANUP_API_KEY_USAGE,
        "schedule": TaskSchedule.DAILY,
        "config": {"retention_days": 30},
    },
]


class HousekeepingRepository:
    """Repository for housekeeping task operations."""

    @staticmethod
    def _get_collection():
        """Get the housekeeping_tasks collection."""
        return MongoDB.get_database()["housekeeping_tasks"]

    @staticmethod
    async def initialize_tasks() -> None:
        """Initialize default housekeeping tasks if they don't exist."""
        collection = HousekeepingRepository._get_collection()

        for task_def in DEFAULT_TASKS:
            existing = await collection.find_one({"task_id": task_def["task_id"]})
            if not existing:
                now = datetime.utcnow()
                task = HousekeepingTask(
                    task_id=task_def["task_id"],
                    name=task_def["name"],
                    description=task_def["description"],
                    task_type=task_def["task_type"],
                    schedule=task_def["schedule"],
                    config=HousekeepingTaskConfig(**task_def["config"]),
                    is_enabled=True,
                    last_status=TaskStatus.IDLE,
                    created_at=now,
                )
                await collection.insert_one(task.model_dump())
                logger.info(f"Initialized housekeeping task: {task_def['task_id']}")

    @staticmethod
    async def get_all() -> List[HousekeepingTask]:
        """Get all housekeeping tasks."""
        collection = HousekeepingRepository._get_collection()

        cursor = collection.find({}).sort("task_id", 1)
        tasks = []

        async for doc in cursor:
            doc.pop("_id", None)
            tasks.append(HousekeepingTask(**doc))

        return tasks

    @staticmethod
    async def get_by_id(task_id: str) -> Optional[HousekeepingTask]:
        """Get a housekeeping task by ID."""
        collection = HousekeepingRepository._get_collection()

        doc = await collection.find_one({"task_id": task_id})
        if not doc:
            return None

        doc.pop("_id", None)
        return HousekeepingTask(**doc)

    @staticmethod
    async def update(task_id: str, data: TaskUpdate) -> Optional[HousekeepingTask]:
        """Update a housekeeping task."""
        collection = HousekeepingRepository._get_collection()

        update_data = {}

        if data.is_enabled is not None:
            update_data["is_enabled"] = data.is_enabled

        if data.config is not None:
            update_data["config"] = data.config.model_dump()

        update_data["updated_at"] = datetime.utcnow()

        result = await collection.update_one(
            {"task_id": task_id},
            {"$set": update_data},
        )

        if result.modified_count == 0:
            return None

        return await HousekeepingRepository.get_by_id(task_id)

    @staticmethod
    async def record_run(
        task_id: str,
        result: TaskRunResult,
    ) -> None:
        """Record the result of a task run."""
        collection = HousekeepingRepository._get_collection()

        # Calculate next run time
        task = await HousekeepingRepository.get_by_id(task_id)
        next_run = None
        if task:
            if task.schedule == TaskSchedule.HOURLY:
                next_run = datetime.utcnow() + timedelta(hours=1)
            elif task.schedule == TaskSchedule.DAILY:
                next_run = datetime.utcnow() + timedelta(days=1)
            elif task.schedule == TaskSchedule.WEEKLY:
                next_run = datetime.utcnow() + timedelta(weeks=1)

        await collection.update_one(
            {"task_id": task_id},
            {
                "$set": {
                    "last_run": result.completed_at,
                    "last_status": result.status.value,
                    "last_duration_ms": result.duration_ms,
                    "last_result": f"Processed: {result.items_processed}, Deleted: {result.items_deleted}"
                    if result.status == TaskStatus.SUCCESS
                    else result.error_message,
                    "next_run": next_run,
                    "updated_at": datetime.utcnow(),
                },
            },
        )

    @staticmethod
    async def get_database_stats() -> Dict[str, Any]:
        """Get database statistics for all collections."""
        db = MongoDB.get_database()

        # Get list of collections
        collection_names = await db.list_collection_names()

        stats_list = []
        total_docs = 0
        total_storage = 0

        for coll_name in collection_names:
            try:
                stats = await db.command("collStats", coll_name)

                doc_count = stats.get("count", 0)
                storage_size = stats.get("storageSize", 0)
                avg_doc_size = stats.get("avgObjSize", 0)
                index_count = stats.get("nindexes", 0)
                index_size = stats.get("totalIndexSize", 0)

                stats_list.append(
                    DatabaseStats(
                        collection_name=coll_name,
                        document_count=doc_count,
                        storage_size_mb=round(storage_size / (1024 * 1024), 2),
                        avg_document_size_bytes=round(avg_doc_size, 2),
                        index_count=index_count,
                        index_size_mb=round(index_size / (1024 * 1024), 2),
                    )
                )

                total_docs += doc_count
                total_storage += storage_size

            except Exception as e:
                logger.warning(f"Could not get stats for collection {coll_name}: {e}")

        # Sort by document count descending
        stats_list.sort(key=lambda x: x.document_count, reverse=True)

        return {
            "database_name": db.name,
            "total_collections": len(collection_names),
            "total_documents": total_docs,
            "total_storage_mb": round(total_storage / (1024 * 1024), 2),
            "collections": stats_list,
            "generated_at": datetime.utcnow(),
        }
