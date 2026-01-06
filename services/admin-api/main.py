"""
Admin Dashboard API - FastAPI Application Entry Point.

This service provides authentication and dashboard functionality
for the MongoDB Partner Solutions Library admin interface.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database.connection import MongoDB
from database.indexes import create_indexes
from repositories.solutions_repository import SolutionsRepository
from routes.auth import router as auth_router
from routes.dashboard import router as dashboard_router
from routes.health import router as health_router
from routes.solutions import router as solutions_router
from routes.public import router as public_router
from routes.admins import router as admins_router
from routes.settings import router as settings_router
from routes.config import router as config_router
from routes.logs import router as logs_router
from routes.telemetry import router as telemetry_router
from routes.housekeeping import router as housekeeping_router
from middleware.logging_middleware import RequestLoggingMiddleware

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting Admin Dashboard API...")

    try:
        # Connect to MongoDB
        await MongoDB.connect()
        logger.info("MongoDB connected")

        # Create indexes
        await create_indexes()
        logger.info("Database indexes created")

        # Seed solutions from files if needed
        seeded = await SolutionsRepository.seed_from_files()
        if seeded > 0:
            logger.info(f"Seeded {seeded} solutions from files")

    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise

    logger.info("Admin Dashboard API started successfully")

    yield  # Application is running

    # Shutdown
    logger.info("Shutting down Admin Dashboard API...")

    try:
        await MongoDB.disconnect()
        logger.info("MongoDB disconnected")
    except Exception as e:
        logger.error(f"Shutdown error: {e}")

    logger.info("Admin Dashboard API shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="Admin Dashboard API",
    description="API for MongoDB Partner Solutions Library admin dashboard",
    version="1.0.0",
    docs_url="/api/admin/docs" if settings.debug else None,
    redoc_url="/api/admin/redoc" if settings.debug else None,
    openapi_url="/api/admin/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

# CORS configuration
# Note: In production, this is internal-only so CORS is less critical
# But we configure it for development and future flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else [
        "http://localhost:3100",
        "http://localhost:3000",
        "http://web:3100",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware (logs ALL HTTP requests)
app.add_middleware(RequestLoggingMiddleware)


# Include routers
app.include_router(auth_router, prefix="/api/admin")
app.include_router(dashboard_router, prefix="/api/admin")
app.include_router(health_router, prefix="/api/admin")
app.include_router(solutions_router, prefix="/api/admin")
app.include_router(public_router, prefix="/api/admin")
app.include_router(admins_router, prefix="/api/admin")
app.include_router(settings_router, prefix="/api/admin")
app.include_router(config_router, prefix="/api/admin")
app.include_router(logs_router, prefix="/api/admin")
app.include_router(telemetry_router, prefix="/api/admin")
app.include_router(housekeeping_router, prefix="/api/admin")


@app.get("/")
async def root():
    """Root endpoint - redirects to health check."""
    return {"message": "Admin Dashboard API", "health": "/api/admin/health"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
