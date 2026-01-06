"""
Telemetry repository for usage tracking and analytics.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any

from database.connection import MongoDB
from models.telemetry import (
    TelemetryCreate,
    TelemetryInDB,
    TelemetryFilter,
    TelemetryEventType,
    UsageStats,
    PercentileStats,
    TimeSeriesDataPoint,
    TopEndpointStats,
)

logger = logging.getLogger(__name__)

# Default retention period in days
DEFAULT_RETENTION_DAYS = 90


class TelemetryRepository:
    """Repository for telemetry operations."""

    @staticmethod
    def _get_collection():
        """Get the telemetry collection."""
        return MongoDB.get_database()["telemetry"]

    @staticmethod
    def _generate_event_id() -> str:
        """Generate a unique event ID."""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        return f"TEL_{timestamp}_{unique_id}"

    @staticmethod
    async def create(
        event_data: TelemetryCreate,
        retention_days: int = DEFAULT_RETENTION_DAYS,
    ) -> TelemetryInDB:
        """Create a new telemetry event."""
        collection = TelemetryRepository._get_collection()

        now = datetime.utcnow()
        event_id = TelemetryRepository._generate_event_id()
        expires_at = now + timedelta(days=retention_days)

        event = TelemetryInDB(
            event_id=event_id,
            timestamp=now,
            event_type=event_data.event_type,
            partner_demo=event_data.partner_demo,
            solution_id=event_data.solution_id,
            session_id=event_data.session_id,
            request_id=event_data.request_id,
            endpoint=event_data.endpoint,
            method=event_data.method,
            status_code=event_data.status_code,
            duration_ms=event_data.duration_ms,
            tokens_used=event_data.tokens_used,
            model_used=event_data.model_used,
            input_length=event_data.input_length,
            output_length=event_data.output_length,
            ip_address=event_data.ip_address,
            user_agent=event_data.user_agent,
            metadata=event_data.metadata,
            expires_at=expires_at,
        )

        await collection.insert_one(event.model_dump())
        logger.debug(f"Created telemetry event: {event_id}")

        return event

    @staticmethod
    async def get_paginated(
        filter_params: TelemetryFilter,
    ) -> Tuple[List[TelemetryInDB], int]:
        """Get paginated telemetry events with filtering."""
        collection = TelemetryRepository._get_collection()

        # Build query
        query: Dict[str, Any] = {}

        if filter_params.event_type:
            query["event_type"] = filter_params.event_type.value

        if filter_params.solution_id:
            query["solution_id"] = filter_params.solution_id

        if filter_params.partner_demo:
            query["partner_demo"] = filter_params.partner_demo

        if filter_params.endpoint:
            query["endpoint"] = {"$regex": filter_params.endpoint, "$options": "i"}

        if filter_params.method:
            query["method"] = filter_params.method.upper()

        # Time range
        if filter_params.start_time or filter_params.end_time:
            query["timestamp"] = {}
            if filter_params.start_time:
                query["timestamp"]["$gte"] = filter_params.start_time
            if filter_params.end_time:
                query["timestamp"]["$lte"] = filter_params.end_time

        # Get total count
        total = await collection.count_documents(query)

        # Get paginated results
        skip = (filter_params.page - 1) * filter_params.page_size
        cursor = collection.find(query).sort("timestamp", -1).skip(skip).limit(filter_params.page_size)

        events = []
        async for doc in cursor:
            doc.pop("_id", None)
            events.append(TelemetryInDB(**doc))

        return events, total

    @staticmethod
    async def get_usage_stats(hours: int = 24) -> UsageStats:
        """Get overall usage statistics for the specified time range."""
        collection = TelemetryRepository._get_collection()

        since = datetime.utcnow() - timedelta(hours=hours)
        query = {"timestamp": {"$gte": since}}

        # Aggregation pipeline for stats
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": None,
                    "total_events": {"$sum": 1},
                    "total_tokens": {"$sum": {"$ifNull": ["$tokens_used", 0]}},
                    "avg_duration": {"$avg": {"$ifNull": ["$duration_ms", 0]}},
                    "unique_sessions": {"$addToSet": "$session_id"},
                    "api_calls": {
                        "$sum": {"$cond": [{"$eq": ["$event_type", "api_call"]}, 1, 0]}
                    },
                    "demo_interactions": {
                        "$sum": {"$cond": [{"$eq": ["$event_type", "demo_interaction"]}, 1, 0]}
                    },
                    "page_views": {
                        "$sum": {"$cond": [{"$eq": ["$event_type", "page_view"]}, 1, 0]}
                    },
                    "errors": {
                        "$sum": {"$cond": [{"$gte": ["$status_code", 400]}, 1, 0]}
                    },
                }
            },
        ]

        result = await collection.aggregate(pipeline).to_list(1)

        if not result:
            return UsageStats(
                total_events=0,
                total_api_calls=0,
                total_demo_interactions=0,
                total_page_views=0,
                total_tokens_used=0,
                unique_sessions=0,
                avg_response_time_ms=0.0,
                error_count=0,
                error_rate=0.0,
            )

        stats = result[0]
        total = stats["total_events"]
        errors = stats["errors"]

        return UsageStats(
            total_events=total,
            total_api_calls=stats["api_calls"],
            total_demo_interactions=stats["demo_interactions"],
            total_page_views=stats["page_views"],
            total_tokens_used=stats["total_tokens"],
            unique_sessions=len([s for s in stats["unique_sessions"] if s]),
            avg_response_time_ms=round(stats["avg_duration"], 2) if stats["avg_duration"] else 0.0,
            error_count=errors,
            error_rate=round((errors / total) * 100, 2) if total > 0 else 0.0,
        )

    @staticmethod
    async def get_percentiles(hours: int = 24) -> PercentileStats:
        """Get response time percentile statistics."""
        collection = TelemetryRepository._get_collection()

        since = datetime.utcnow() - timedelta(hours=hours)
        query = {
            "timestamp": {"$gte": since},
            "duration_ms": {"$exists": True, "$ne": None},
        }

        # Get all durations for percentile calculation
        cursor = collection.find(query, {"duration_ms": 1}).sort("duration_ms", 1)
        durations = []
        async for doc in cursor:
            if doc.get("duration_ms") is not None:
                durations.append(doc["duration_ms"])

        if not durations:
            return PercentileStats(
                p50=0.0,
                p75=0.0,
                p90=0.0,
                p95=0.0,
                p99=0.0,
                avg=0.0,
                min=0.0,
                max=0.0,
                count=0,
            )

        count = len(durations)

        def percentile(data: List[float], p: float) -> float:
            """Calculate percentile from sorted list."""
            idx = int(len(data) * p / 100)
            return data[min(idx, len(data) - 1)]

        return PercentileStats(
            p50=round(percentile(durations, 50), 2),
            p75=round(percentile(durations, 75), 2),
            p90=round(percentile(durations, 90), 2),
            p95=round(percentile(durations, 95), 2),
            p99=round(percentile(durations, 99), 2),
            avg=round(sum(durations) / count, 2),
            min=round(min(durations), 2),
            max=round(max(durations), 2),
            count=count,
        )

    @staticmethod
    async def get_usage_over_time(
        hours: int = 24,
        interval: str = "hour",
    ) -> List[TimeSeriesDataPoint]:
        """Get usage data aggregated over time intervals."""
        collection = TelemetryRepository._get_collection()

        since = datetime.utcnow() - timedelta(hours=hours)

        # Determine grouping format based on interval
        if interval == "hour":
            date_format = {
                "year": {"$year": "$timestamp"},
                "month": {"$month": "$timestamp"},
                "day": {"$dayOfMonth": "$timestamp"},
                "hour": {"$hour": "$timestamp"},
            }
        elif interval == "day":
            date_format = {
                "year": {"$year": "$timestamp"},
                "month": {"$month": "$timestamp"},
                "day": {"$dayOfMonth": "$timestamp"},
            }
        else:  # week
            date_format = {
                "year": {"$year": "$timestamp"},
                "week": {"$week": "$timestamp"},
            }

        pipeline = [
            {"$match": {"timestamp": {"$gte": since}}},
            {
                "$group": {
                    "_id": date_format,
                    "count": {"$sum": 1},
                    "avg_duration_ms": {"$avg": "$duration_ms"},
                    "tokens_used": {"$sum": {"$ifNull": ["$tokens_used", 0]}},
                    "min_timestamp": {"$min": "$timestamp"},
                }
            },
            {"$sort": {"min_timestamp": 1}},
        ]

        cursor = collection.aggregate(pipeline)
        data_points = []

        async for doc in cursor:
            data_points.append(
                TimeSeriesDataPoint(
                    timestamp=doc["min_timestamp"],
                    count=doc["count"],
                    avg_duration_ms=round(doc["avg_duration_ms"], 2) if doc["avg_duration_ms"] else None,
                    tokens_used=doc["tokens_used"],
                )
            )

        return data_points

    @staticmethod
    async def get_top_endpoints(
        hours: int = 24,
        limit: int = 20,
    ) -> List[TopEndpointStats]:
        """Get top endpoints by request count."""
        collection = TelemetryRepository._get_collection()

        since = datetime.utcnow() - timedelta(hours=hours)

        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": since},
                    "endpoint": {"$exists": True, "$ne": None},
                }
            },
            {
                "$group": {
                    "_id": {"endpoint": "$endpoint", "method": "$method"},
                    "count": {"$sum": 1},
                    "avg_duration_ms": {"$avg": "$duration_ms"},
                    "errors": {
                        "$sum": {"$cond": [{"$gte": ["$status_code", 400]}, 1, 0]}
                    },
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]

        cursor = collection.aggregate(pipeline)
        endpoints = []

        async for doc in cursor:
            count = doc["count"]
            errors = doc["errors"]
            endpoints.append(
                TopEndpointStats(
                    endpoint=doc["_id"]["endpoint"] or "unknown",
                    method=doc["_id"]["method"] or "unknown",
                    count=count,
                    avg_duration_ms=round(doc["avg_duration_ms"], 2) if doc["avg_duration_ms"] else 0.0,
                    error_count=errors,
                    error_rate=round((errors / count) * 100, 2) if count > 0 else 0.0,
                )
            )

        return endpoints

    @staticmethod
    async def get_solution_stats(
        hours: int = 24,
    ) -> Dict[str, int]:
        """Get event counts by solution."""
        collection = TelemetryRepository._get_collection()

        since = datetime.utcnow() - timedelta(hours=hours)

        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": since},
                    "solution_id": {"$exists": True, "$ne": None},
                }
            },
            {
                "$group": {
                    "_id": "$solution_id",
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
        ]

        cursor = collection.aggregate(pipeline)
        result = {}

        async for doc in cursor:
            result[doc["_id"]] = doc["count"]

        return result

    @staticmethod
    async def export_events(
        filter_params: TelemetryFilter,
        max_records: int = 10000,
    ) -> List[TelemetryInDB]:
        """Export telemetry events for download."""
        collection = TelemetryRepository._get_collection()

        # Build query
        query: Dict[str, Any] = {}

        if filter_params.event_type:
            query["event_type"] = filter_params.event_type.value

        if filter_params.solution_id:
            query["solution_id"] = filter_params.solution_id

        if filter_params.start_time or filter_params.end_time:
            query["timestamp"] = {}
            if filter_params.start_time:
                query["timestamp"]["$gte"] = filter_params.start_time
            if filter_params.end_time:
                query["timestamp"]["$lte"] = filter_params.end_time

        cursor = collection.find(query).sort("timestamp", -1).limit(max_records)

        events = []
        async for doc in cursor:
            doc.pop("_id", None)
            events.append(TelemetryInDB(**doc))

        return events

    @staticmethod
    async def cleanup_old(retention_days: int = DEFAULT_RETENTION_DAYS) -> int:
        """Remove telemetry events older than retention period."""
        collection = TelemetryRepository._get_collection()

        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        result = await collection.delete_many({"timestamp": {"$lt": cutoff}})

        logger.info(f"Cleaned up {result.deleted_count} telemetry events older than {retention_days} days")
        return result.deleted_count
