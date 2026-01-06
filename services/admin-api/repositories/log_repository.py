"""
Repository for HTTP request log management.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
import uuid

from database.connection import get_logs_collection
from models.log import (
    LogCreate,
    LogInDB,
    LogLevel,
    LogFilter,
    ErrorAggregation,
)

logger = logging.getLogger(__name__)

# Default log retention in days
DEFAULT_LOG_RETENTION_DAYS = 30


def _generate_log_id() -> str:
    """Generate a unique log ID."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_part = uuid.uuid4().hex[:8]
    return f"LOG_{timestamp}_{unique_part}"


def _generate_request_id() -> str:
    """Generate a unique request ID."""
    return uuid.uuid4().hex[:16]


class LogRepository:
    """Repository for log CRUD operations."""

    @classmethod
    async def create(
        cls,
        log_data: LogCreate,
        retention_days: int = DEFAULT_LOG_RETENTION_DAYS,
    ) -> LogInDB:
        """
        Create a new log entry.

        Args:
            log_data: Log data to create
            retention_days: Number of days to retain the log

        Returns:
            Created log entry
        """
        collection = get_logs_collection()
        now = datetime.utcnow()
        expires_at = now + timedelta(days=retention_days)

        doc = {
            "log_id": _generate_log_id(),
            "timestamp": now,
            "level": log_data.level.value,
            "message": log_data.message,
            "service": log_data.service,
            "request_id": log_data.request_id or _generate_request_id(),
            "endpoint": log_data.endpoint,
            "method": log_data.method,
            "status_code": log_data.status_code,
            "duration_ms": log_data.duration_ms,
            "ip_address": log_data.ip_address,
            "user_agent": log_data.user_agent,
            "admin_id": log_data.admin_id,
            "error_type": log_data.error_type,
            "error_message": log_data.error_message,
            "stack_trace": log_data.stack_trace,
            "extra": log_data.extra,
            "expires_at": expires_at,
        }

        try:
            await collection.insert_one(doc)
        except Exception as e:
            logger.error(f"Failed to create log entry: {e}")
            raise

        return LogInDB(
            log_id=doc["log_id"],
            timestamp=doc["timestamp"],
            level=LogLevel(doc["level"]),
            message=doc["message"],
            service=doc["service"],
            request_id=doc["request_id"],
            endpoint=doc["endpoint"],
            method=doc["method"],
            status_code=doc["status_code"],
            duration_ms=doc["duration_ms"],
            ip_address=doc["ip_address"],
            user_agent=doc["user_agent"],
            admin_id=doc["admin_id"],
            error_type=doc["error_type"],
            error_message=doc["error_message"],
            stack_trace=doc["stack_trace"],
            extra=doc["extra"],
            expires_at=doc["expires_at"],
        )

    @classmethod
    def _doc_to_model(cls, doc: dict) -> LogInDB:
        """Convert MongoDB document to LogInDB model."""
        return LogInDB(
            log_id=doc["log_id"],
            timestamp=doc["timestamp"],
            level=LogLevel(doc["level"]),
            message=doc["message"],
            service=doc["service"],
            request_id=doc.get("request_id"),
            endpoint=doc.get("endpoint"),
            method=doc.get("method"),
            status_code=doc.get("status_code"),
            duration_ms=doc.get("duration_ms"),
            ip_address=doc.get("ip_address"),
            user_agent=doc.get("user_agent"),
            admin_id=doc.get("admin_id"),
            error_type=doc.get("error_type"),
            error_message=doc.get("error_message"),
            stack_trace=doc.get("stack_trace"),
            extra=doc.get("extra"),
            expires_at=doc["expires_at"],
        )

    @classmethod
    async def get_by_id(cls, log_id: str) -> Optional[LogInDB]:
        """Get a log entry by ID."""
        collection = get_logs_collection()
        doc = await collection.find_one({"log_id": log_id})
        if doc:
            return cls._doc_to_model(doc)
        return None

    @classmethod
    async def get_paginated(
        cls,
        filter_params: LogFilter,
    ) -> Tuple[List[LogInDB], int]:
        """
        Get paginated log entries with filtering.

        Args:
            filter_params: Filter criteria

        Returns:
            Tuple of (list of logs, total count)
        """
        collection = get_logs_collection()

        # Build query
        query = {}

        if filter_params.level:
            query["level"] = filter_params.level.value
        if filter_params.endpoint:
            query["endpoint"] = {"$regex": filter_params.endpoint, "$options": "i"}
        if filter_params.method:
            query["method"] = filter_params.method.upper()
        if filter_params.status_code:
            query["status_code"] = filter_params.status_code
        if filter_params.admin_id:
            query["admin_id"] = filter_params.admin_id
        if filter_params.request_id:
            query["request_id"] = filter_params.request_id
        if filter_params.has_error is not None:
            if filter_params.has_error:
                query["error_type"] = {"$ne": None}
            else:
                query["error_type"] = None

        # Time range filtering
        if filter_params.start_time or filter_params.end_time:
            query["timestamp"] = {}
            if filter_params.start_time:
                query["timestamp"]["$gte"] = filter_params.start_time
            if filter_params.end_time:
                query["timestamp"]["$lte"] = filter_params.end_time

        # Full-text search on message
        if filter_params.search:
            query["$or"] = [
                {"message": {"$regex": filter_params.search, "$options": "i"}},
                {"endpoint": {"$regex": filter_params.search, "$options": "i"}},
                {"error_message": {"$regex": filter_params.search, "$options": "i"}},
            ]

        # Calculate pagination
        skip = (filter_params.page - 1) * filter_params.page_size

        # Execute query
        cursor = (
            collection.find(query)
            .sort("timestamp", -1)
            .skip(skip)
            .limit(filter_params.page_size)
        )

        docs = await cursor.to_list(length=filter_params.page_size)
        total = await collection.count_documents(query)

        logs = [cls._doc_to_model(doc) for doc in docs]

        return logs, total

    @classmethod
    async def get_recent(cls, limit: int = 100) -> List[LogInDB]:
        """Get most recent log entries."""
        collection = get_logs_collection()

        cursor = collection.find({}).sort("timestamp", -1).limit(limit)
        docs = await cursor.to_list(length=limit)

        return [cls._doc_to_model(doc) for doc in docs]

    @classmethod
    async def aggregate_errors(
        cls,
        hours: int = 24,
        limit: int = 20,
    ) -> List[ErrorAggregation]:
        """
        Aggregate errors by type.

        Args:
            hours: Number of hours to look back
            limit: Maximum number of error types to return

        Returns:
            List of error aggregations
        """
        collection = get_logs_collection()
        since = datetime.utcnow() - timedelta(hours=hours)

        pipeline = [
            {
                "$match": {
                    "error_type": {"$ne": None},
                    "timestamp": {"$gte": since},
                }
            },
            {
                "$group": {
                    "_id": "$error_type",
                    "count": {"$sum": 1},
                    "last_occurrence": {"$max": "$timestamp"},
                    "sample_message": {"$first": "$error_message"},
                    "sample_endpoint": {"$first": "$endpoint"},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]

        results = []
        async for doc in collection.aggregate(pipeline):
            results.append(ErrorAggregation(
                error_type=doc["_id"],
                count=doc["count"],
                last_occurrence=doc["last_occurrence"],
                sample_message=doc.get("sample_message"),
                sample_endpoint=doc.get("sample_endpoint"),
            ))

        return results

    @classmethod
    async def count_by_level(
        cls,
        hours: int = 24,
    ) -> dict:
        """
        Count logs by level.

        Args:
            hours: Number of hours to look back

        Returns:
            Dictionary of level -> count
        """
        collection = get_logs_collection()
        since = datetime.utcnow() - timedelta(hours=hours)

        pipeline = [
            {"$match": {"timestamp": {"$gte": since}}},
            {"$group": {"_id": "$level", "count": {"$sum": 1}}},
        ]

        result = {}
        async for doc in collection.aggregate(pipeline):
            result[doc["_id"]] = doc["count"]

        return result

    @classmethod
    async def cleanup_old(cls, retention_days: int = DEFAULT_LOG_RETENTION_DAYS) -> int:
        """
        Remove logs older than retention period.

        Args:
            retention_days: Number of days to retain logs

        Returns:
            Number of logs deleted
        """
        collection = get_logs_collection()
        cutoff = datetime.utcnow() - timedelta(days=retention_days)

        result = await collection.delete_many({"timestamp": {"$lt": cutoff}})

        if result.deleted_count > 0:
            logger.info(f"Cleaned up {result.deleted_count} old log entries")

        return result.deleted_count

    @classmethod
    async def export_logs(
        cls,
        filter_params: LogFilter,
        max_records: int = 10000,
    ) -> List[LogInDB]:
        """
        Export logs for download.

        Args:
            filter_params: Filter criteria
            max_records: Maximum records to export

        Returns:
            List of log entries
        """
        collection = get_logs_collection()

        # Build query (same as get_paginated)
        query = {}

        if filter_params.level:
            query["level"] = filter_params.level.value
        if filter_params.endpoint:
            query["endpoint"] = {"$regex": filter_params.endpoint, "$options": "i"}
        if filter_params.method:
            query["method"] = filter_params.method.upper()
        if filter_params.status_code:
            query["status_code"] = filter_params.status_code
        if filter_params.start_time or filter_params.end_time:
            query["timestamp"] = {}
            if filter_params.start_time:
                query["timestamp"]["$gte"] = filter_params.start_time
            if filter_params.end_time:
                query["timestamp"]["$lte"] = filter_params.end_time

        cursor = collection.find(query).sort("timestamp", -1).limit(max_records)
        docs = await cursor.to_list(length=max_records)

        return [cls._doc_to_model(doc) for doc in docs]
