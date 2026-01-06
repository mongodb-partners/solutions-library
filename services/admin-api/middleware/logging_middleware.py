"""
HTTP request logging middleware.
Captures ALL requests with timing, status, and user context.
"""

import logging
import time
import traceback
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from models.log import LogCreate, LogLevel
from repositories.log_repository import LogRepository

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs all HTTP requests.

    Captures:
    - Request method, path, query params
    - Response status code
    - Request duration
    - Client IP and user agent
    - Admin ID (if authenticated)
    - Error details (if any)
    """

    # Paths to exclude from logging (health checks, etc.)
    EXCLUDED_PATHS = {
        "/api/admin/health",
        "/health",
        "/favicon.ico",
    }

    # Paths to mask sensitive data
    SENSITIVE_PATHS = {
        "/api/admin/auth/login",
        "/api/admin/auth/forgot-password",
        "/api/admin/auth/reset-password",
    }

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        """Process the request and log details."""
        # Skip excluded paths
        if request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)

        # Generate request ID
        request_id = str(uuid.uuid4().hex[:16])

        # Extract request details
        method = request.method
        endpoint = request.url.path
        query_string = str(request.query_params) if request.query_params else None

        # Get client info
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "")[:500]  # Limit length

        # Get admin ID from token if authenticated
        admin_id = await self._extract_admin_id(request)

        # Start timing
        start_time = time.time()

        # Initialize error tracking
        error_type = None
        error_message = None
        stack_trace = None
        status_code = 500

        try:
            # Process request
            response = await call_next(request)
            status_code = response.status_code

            return response

        except Exception as e:
            # Capture error details
            error_type = type(e).__name__
            error_message = str(e)[:1000]  # Limit length
            stack_trace = traceback.format_exc()[:5000]  # Limit length

            logger.error(f"Request error: {error_type} - {error_message}")

            # Re-raise to let FastAPI handle it
            raise

        finally:
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Determine log level based on status code
            if status_code >= 500:
                level = LogLevel.ERROR
            elif status_code >= 400:
                level = LogLevel.WARNING
            else:
                level = LogLevel.INFO

            # Build message
            message = f"{method} {endpoint}"
            if query_string:
                message += f"?{query_string}"
            message += f" - {status_code}"

            # Create log entry (fire and forget, don't block request)
            try:
                log_data = LogCreate(
                    level=level,
                    message=message,
                    service="admin-api",
                    request_id=request_id,
                    endpoint=endpoint,
                    method=method,
                    status_code=status_code,
                    duration_ms=round(duration_ms, 2),
                    ip_address=ip_address,
                    user_agent=user_agent,
                    admin_id=admin_id,
                    error_type=error_type,
                    error_message=error_message,
                    stack_trace=stack_trace if error_type else None,
                    extra={"query_params": query_string} if query_string else None,
                )

                # Log asynchronously
                await LogRepository.create(log_data)

            except Exception as log_error:
                # Don't fail the request if logging fails
                logger.error(f"Failed to create log entry: {log_error}")

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request headers or connection."""
        # Check for proxy headers
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct connection
        if request.client:
            return request.client.host

        return "unknown"

    async def _extract_admin_id(self, request: Request) -> str | None:
        """Extract admin ID from JWT token if present."""
        try:
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return None

            token = auth_header.replace("Bearer ", "")
            if not token:
                return None

            # Decode token without full verification to extract admin_id
            # This is safe since we just want the claim, not authentication
            from auth.jwt_handler import decode_token

            payload = decode_token(token)
            if payload:
                return payload.get("sub")

        except Exception:
            # Silently fail - not critical for logging
            pass

        return None
