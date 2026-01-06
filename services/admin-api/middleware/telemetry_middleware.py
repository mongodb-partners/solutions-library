"""
Telemetry middleware for recording API usage.
"""

import logging
import time
import uuid
from typing import Callable, Set

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from models.telemetry import TelemetryCreate, TelemetryEventType
from repositories.telemetry_repository import TelemetryRepository

logger = logging.getLogger(__name__)


class TelemetryMiddleware(BaseHTTPMiddleware):
    """
    Middleware that records telemetry for public API endpoints.

    Records:
    - Demo interactions
    - API calls
    - Page views
    - Solution views
    """

    # Admin paths - don't record telemetry for admin endpoints
    ADMIN_PATHS: Set[str] = {
        "/api/admin/",
    }

    # Paths to exclude completely
    EXCLUDED_PATHS: Set[str] = {
        "/health",
        "/favicon.ico",
        "/robots.txt",
    }

    # Static asset patterns
    STATIC_PATTERNS: Set[str] = {
        ".js",
        ".css",
        ".png",
        ".jpg",
        ".svg",
        ".ico",
        ".woff",
        ".woff2",
        ".ttf",
    }

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        """Process the request and record telemetry."""
        path = request.url.path

        # Skip excluded paths
        if path in self.EXCLUDED_PATHS:
            return await call_next(request)

        # Skip admin paths
        if any(path.startswith(admin_path) for admin_path in self.ADMIN_PATHS):
            return await call_next(request)

        # Skip static assets
        if any(path.endswith(ext) for ext in self.STATIC_PATTERNS):
            return await call_next(request)

        # Start timing
        start_time = time.time()

        # Generate session ID from cookie or create new
        session_id = request.cookies.get("session_id") or str(uuid.uuid4().hex[:16])

        # Get request details
        method = request.method
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "")[:500]

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Determine event type
        event_type = self._determine_event_type(path, method)

        # Extract solution ID if applicable
        solution_id = self._extract_solution_id(path)

        # Record telemetry (fire and forget)
        try:
            telemetry_data = TelemetryCreate(
                event_type=event_type,
                solution_id=solution_id,
                session_id=session_id,
                request_id=str(uuid.uuid4().hex[:16]),
                endpoint=path,
                method=method,
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2),
                ip_address=ip_address,
                user_agent=user_agent,
            )

            await TelemetryRepository.create(telemetry_data)

        except Exception as e:
            # Don't fail the request if telemetry fails
            logger.error(f"Failed to record telemetry: {e}")

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request headers or connection."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        if request.client:
            return request.client.host

        return "unknown"

    def _determine_event_type(self, path: str, method: str) -> TelemetryEventType:
        """Determine the telemetry event type based on path and method."""
        # Solution views
        if "/solutions/" in path:
            return TelemetryEventType.SOLUTION_VIEW

        # Demo launches (typically via specific endpoints)
        if "/demo" in path.lower() or "/launch" in path.lower():
            return TelemetryEventType.DEMO_LAUNCH

        # Search
        if "/search" in path.lower() or "q=" in path.lower():
            return TelemetryEventType.SEARCH

        # API calls
        if path.startswith("/api/"):
            return TelemetryEventType.API_CALL

        # Default to page view for GET requests, API call for others
        if method == "GET":
            return TelemetryEventType.PAGE_VIEW

        return TelemetryEventType.API_CALL

    def _extract_solution_id(self, path: str) -> str | None:
        """Extract solution ID from path if present."""
        if "/solutions/" in path:
            parts = path.split("/solutions/")
            if len(parts) > 1:
                solution_part = parts[1].split("/")[0]
                if solution_part:
                    return solution_part

        return None
