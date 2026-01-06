"""
System logs routes.
Provides access to HTTP request logs for admin users.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, AsyncGenerator
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from auth.dependencies import require_any_admin
from models.admin import AdminInDB
from models.log import (
    LogLevel,
    LogFilter,
    LogResponse,
    LogsListResponse,
    ErrorAggregationResponse,
)
from repositories.log_repository import LogRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/logs", tags=["System Logs"])


@router.get("", response_model=LogsListResponse)
async def get_logs(
    level: Optional[LogLevel] = None,
    endpoint: Optional[str] = None,
    method: Optional[str] = None,
    status_code: Optional[int] = None,
    admin_id: Optional[str] = None,
    request_id: Optional[str] = None,
    search: Optional[str] = None,
    has_error: Optional[bool] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    current_admin: AdminInDB = Depends(require_any_admin),
) -> LogsListResponse:
    """
    Get paginated system logs with filtering.

    Available to all admin users.
    """
    filter_params = LogFilter(
        level=level,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        admin_id=admin_id,
        request_id=request_id,
        search=search,
        has_error=has_error,
        start_time=start_time,
        end_time=end_time,
        page=page,
        page_size=page_size,
    )

    logs, total = await LogRepository.get_paginated(filter_params)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return LogsListResponse(
        logs=[
            LogResponse(
                log_id=log.log_id,
                timestamp=log.timestamp,
                level=log.level.value,
                message=log.message,
                service=log.service,
                request_id=log.request_id,
                endpoint=log.endpoint,
                method=log.method,
                status_code=log.status_code,
                duration_ms=log.duration_ms,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                admin_id=log.admin_id,
                error_type=log.error_type,
                error_message=log.error_message,
                extra=log.extra,
            )
            for log in logs
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/stream")
async def stream_logs(
    level: Optional[LogLevel] = None,
    current_admin: AdminInDB = Depends(require_any_admin),
):
    """
    Stream logs in real-time using Server-Sent Events (SSE).

    Available to all admin users.
    """
    async def event_generator() -> AsyncGenerator[dict, None]:
        last_id = None

        while True:
            try:
                # Get recent logs
                logs = await LogRepository.get_recent(limit=10)

                for log in reversed(logs):  # Send oldest first
                    # Skip logs we've already sent
                    if last_id and log.log_id <= last_id:
                        continue

                    # Filter by level if specified
                    if level and log.level != level:
                        continue

                    last_id = log.log_id

                    yield {
                        "event": "log",
                        "id": log.log_id,
                        "data": json.dumps({
                            "log_id": log.log_id,
                            "timestamp": log.timestamp.isoformat(),
                            "level": log.level.value,
                            "message": log.message,
                            "endpoint": log.endpoint,
                            "method": log.method,
                            "status_code": log.status_code,
                            "duration_ms": log.duration_ms,
                        }),
                    }

                # Wait before polling again
                import asyncio
                await asyncio.sleep(2)

            except Exception as e:
                logger.error(f"Error streaming logs: {e}")
                yield {"event": "error", "data": str(e)}
                break

    return EventSourceResponse(event_generator())


@router.get("/{log_id}", response_model=LogResponse)
async def get_log(
    log_id: str,
    current_admin: AdminInDB = Depends(require_any_admin),
) -> LogResponse:
    """
    Get a single log entry by ID.

    Available to all admin users.
    """
    log = await LogRepository.get_by_id(log_id)

    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    return LogResponse(
        log_id=log.log_id,
        timestamp=log.timestamp,
        level=log.level.value,
        message=log.message,
        service=log.service,
        request_id=log.request_id,
        endpoint=log.endpoint,
        method=log.method,
        status_code=log.status_code,
        duration_ms=log.duration_ms,
        ip_address=log.ip_address,
        user_agent=log.user_agent,
        admin_id=log.admin_id,
        error_type=log.error_type,
        error_message=log.error_message,
        extra=log.extra,
    )


@router.get("/errors/aggregate", response_model=ErrorAggregationResponse)
async def get_error_aggregation(
    hours: int = Query(default=24, ge=1, le=168),
    limit: int = Query(default=20, ge=1, le=100),
    current_admin: AdminInDB = Depends(require_any_admin),
) -> ErrorAggregationResponse:
    """
    Get aggregated error statistics.

    Groups errors by type and shows count and last occurrence.
    Available to all admin users.
    """
    errors = await LogRepository.aggregate_errors(hours=hours, limit=limit)

    total_errors = sum(e.count for e in errors)

    return ErrorAggregationResponse(
        errors=errors,
        total_errors=total_errors,
        time_range_hours=hours,
    )


@router.get("/stats/levels")
async def get_level_stats(
    hours: int = Query(default=24, ge=1, le=168),
    current_admin: AdminInDB = Depends(require_any_admin),
) -> dict:
    """
    Get log count by level.

    Returns count of logs for each level in the specified time range.
    Available to all admin users.
    """
    counts = await LogRepository.count_by_level(hours=hours)

    return {
        "hours": hours,
        "counts": counts,
        "total": sum(counts.values()),
    }


@router.get("/export/json")
async def export_logs_json(
    level: Optional[LogLevel] = None,
    endpoint: Optional[str] = None,
    method: Optional[str] = None,
    status_code: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    max_records: int = Query(default=1000, ge=1, le=10000),
    current_admin: AdminInDB = Depends(require_any_admin),
):
    """
    Export logs as JSON file.

    Available to all admin users.
    """
    filter_params = LogFilter(
        level=level,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        start_time=start_time,
        end_time=end_time,
        page=1,
        page_size=max_records,
    )

    logs = await LogRepository.export_logs(filter_params, max_records=max_records)

    export_data = {
        "exported_at": datetime.utcnow().isoformat(),
        "total_records": len(logs),
        "filters": {
            "level": level.value if level else None,
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "start_time": start_time.isoformat() if start_time else None,
            "end_time": end_time.isoformat() if end_time else None,
        },
        "logs": [
            {
                "log_id": log.log_id,
                "timestamp": log.timestamp.isoformat(),
                "level": log.level.value,
                "message": log.message,
                "service": log.service,
                "request_id": log.request_id,
                "endpoint": log.endpoint,
                "method": log.method,
                "status_code": log.status_code,
                "duration_ms": log.duration_ms,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "admin_id": log.admin_id,
                "error_type": log.error_type,
                "error_message": log.error_message,
            }
            for log in logs
        ],
    }

    filename = f"logs_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

    return StreamingResponse(
        iter([json.dumps(export_data, indent=2)]),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.delete("/cleanup")
async def cleanup_logs(
    retention_days: int = Query(default=30, ge=1, le=365),
    current_admin: AdminInDB = Depends(require_any_admin),
) -> dict:
    """
    Manually trigger log cleanup.

    Removes logs older than the specified retention period.
    Available to admin users.
    """
    deleted_count = await LogRepository.cleanup_old(retention_days=retention_days)

    return {
        "message": f"Cleaned up {deleted_count} log entries",
        "deleted_count": deleted_count,
        "retention_days": retention_days,
    }
