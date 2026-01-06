"""API routes for admin dashboard."""

from routes.auth import router as auth_router
from routes.dashboard import router as dashboard_router
from routes.health import router as health_router
from routes.solutions import router as solutions_router
from routes.public import router as public_router
from routes.admins import router as admins_router

__all__ = [
    "auth_router",
    "dashboard_router",
    "health_router",
    "solutions_router",
    "public_router",
    "admins_router",
]
