"""
Health check routes for admin dashboard.
"""

from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel

from database.connection import MongoDB

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: datetime
    database: str
    version: str = "1.0.0"


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns the status of the service and database connection.
    """
    db_status = "connected"

    try:
        # Check database connection
        db = MongoDB.get_database()
        await db.command("ping")
    except Exception:
        db_status = "disconnected"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "unhealthy",
        timestamp=datetime.utcnow(),
        database=db_status,
    )
