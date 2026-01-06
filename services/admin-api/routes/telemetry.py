"""
Telemetry routes for usage analytics.
Provides access to usage statistics and analytics for admin users.
"""

import logging
from datetime import datetime
from typing import Optional
import json

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from auth.dependencies import require_any_admin
from models.admin import AdminInDB
from models.telemetry import (
    TelemetryEventType,
    TelemetryFilter,
    TelemetryResponse,
    UsageStats,
    PercentileStats,
    TimeSeriesResponse,
    TopEndpointsResponse,
)
from repositories.telemetry_repository import TelemetryRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


class TelemetryListResponse:
    """Response model for paginated telemetry events."""

    def __init__(
        self,
        events: list,
        total: int,
        page: int,
        page_size: int,
        total_pages: int,
    ):
        self.events = events
        self.total = total
        self.page = page
        self.page_size = page_size
        self.total_pages = total_pages


@router.get("/stats")
async def get_usage_stats(
    hours: int = Query(default=24, ge=1, le=720),  # Max 30 days
    current_admin: AdminInDB = Depends(require_any_admin),
) -> UsageStats:
    """
    Get overall usage statistics.

    Returns aggregated usage metrics for the specified time range.
    Available to all admin users.
    """
    return await TelemetryRepository.get_usage_stats(hours=hours)


@router.get("/percentiles")
async def get_percentiles(
    hours: int = Query(default=24, ge=1, le=720),
    current_admin: AdminInDB = Depends(require_any_admin),
) -> PercentileStats:
    """
    Get response time percentiles.

    Returns p50, p75, p90, p95, p99 response time metrics.
    Available to all admin users.
    """
    return await TelemetryRepository.get_percentiles(hours=hours)


@router.get("/usage-over-time")
async def get_usage_over_time(
    hours: int = Query(default=24, ge=1, le=720),
    interval: str = Query(default="hour", regex="^(hour|day|week)$"),
    current_admin: AdminInDB = Depends(require_any_admin),
) -> TimeSeriesResponse:
    """
    Get usage data over time.

    Returns time series data aggregated by the specified interval.
    Available to all admin users.
    """
    data = await TelemetryRepository.get_usage_over_time(hours=hours, interval=interval)

    now = datetime.utcnow()
    start_time = datetime.utcnow()
    if data:
        start_time = min(d.timestamp for d in data)

    return TimeSeriesResponse(
        data=data,
        interval=interval,
        start_time=start_time,
        end_time=now,
        total_count=sum(d.count for d in data),
    )


@router.get("/top-endpoints")
async def get_top_endpoints(
    hours: int = Query(default=24, ge=1, le=720),
    limit: int = Query(default=20, ge=1, le=100),
    current_admin: AdminInDB = Depends(require_any_admin),
) -> TopEndpointsResponse:
    """
    Get top endpoints by request count.

    Returns the most frequently called endpoints with stats.
    Available to all admin users.
    """
    endpoints = await TelemetryRepository.get_top_endpoints(hours=hours, limit=limit)

    return TopEndpointsResponse(
        endpoints=endpoints,
        time_range_hours=hours,
    )


@router.get("/solution-stats")
async def get_solution_stats(
    hours: int = Query(default=24, ge=1, le=720),
    current_admin: AdminInDB = Depends(require_any_admin),
) -> dict:
    """
    Get event counts by solution.

    Returns the number of telemetry events per solution.
    Available to all admin users.
    """
    stats = await TelemetryRepository.get_solution_stats(hours=hours)

    return {
        "hours": hours,
        "solutions": stats,
        "total": sum(stats.values()),
    }


@router.get("")
async def get_events(
    event_type: Optional[TelemetryEventType] = None,
    solution_id: Optional[str] = None,
    partner_demo: Optional[str] = None,
    endpoint: Optional[str] = None,
    method: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    current_admin: AdminInDB = Depends(require_any_admin),
) -> dict:
    """
    Get paginated telemetry events with filtering.

    Available to all admin users.
    """
    filter_params = TelemetryFilter(
        event_type=event_type,
        solution_id=solution_id,
        partner_demo=partner_demo,
        endpoint=endpoint,
        method=method,
        start_time=start_time,
        end_time=end_time,
        page=page,
        page_size=page_size,
    )

    events, total = await TelemetryRepository.get_paginated(filter_params)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return {
        "events": [
            TelemetryResponse(
                event_id=e.event_id,
                timestamp=e.timestamp,
                event_type=e.event_type.value,
                partner_demo=e.partner_demo,
                solution_id=e.solution_id,
                session_id=e.session_id,
                endpoint=e.endpoint,
                method=e.method,
                status_code=e.status_code,
                duration_ms=e.duration_ms,
                tokens_used=e.tokens_used,
                model_used=e.model_used,
            ).model_dump()
            for e in events
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/export/json")
async def export_telemetry_json(
    event_type: Optional[TelemetryEventType] = None,
    solution_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    max_records: int = Query(default=10000, ge=1, le=50000),
    current_admin: AdminInDB = Depends(require_any_admin),
):
    """
    Export telemetry events as JSON file.

    Available to all admin users.
    """
    filter_params = TelemetryFilter(
        event_type=event_type,
        solution_id=solution_id,
        start_time=start_time,
        end_time=end_time,
        page=1,
        page_size=max_records,
    )

    events = await TelemetryRepository.export_events(filter_params, max_records=max_records)

    export_data = {
        "exported_at": datetime.utcnow().isoformat(),
        "total_records": len(events),
        "filters": {
            "event_type": event_type.value if event_type else None,
            "solution_id": solution_id,
            "start_time": start_time.isoformat() if start_time else None,
            "end_time": end_time.isoformat() if end_time else None,
        },
        "events": [
            {
                "event_id": e.event_id,
                "timestamp": e.timestamp.isoformat(),
                "event_type": e.event_type.value,
                "partner_demo": e.partner_demo,
                "solution_id": e.solution_id,
                "session_id": e.session_id,
                "endpoint": e.endpoint,
                "method": e.method,
                "status_code": e.status_code,
                "duration_ms": e.duration_ms,
                "tokens_used": e.tokens_used,
                "ip_address": e.ip_address,
            }
            for e in events
        ],
    }

    filename = f"telemetry_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

    return StreamingResponse(
        iter([json.dumps(export_data, indent=2)]),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.delete("/cleanup")
async def cleanup_telemetry(
    retention_days: int = Query(default=90, ge=1, le=365),
    current_admin: AdminInDB = Depends(require_any_admin),
) -> dict:
    """
    Manually trigger telemetry cleanup.

    Removes telemetry events older than the specified retention period.
    Available to admin users.
    """
    deleted_count = await TelemetryRepository.cleanup_old(retention_days=retention_days)

    return {
        "message": f"Cleaned up {deleted_count} telemetry events",
        "deleted_count": deleted_count,
        "retention_days": retention_days,
    }
