"""
Middleware package for admin-api.
"""

from .logging_middleware import RequestLoggingMiddleware

__all__ = ["RequestLoggingMiddleware"]
