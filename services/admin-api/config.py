"""
Configuration management using pydantic-settings.
Environment variables are loaded from .env file and can be overridden.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # MongoDB Configuration
    mongodb_uri: str = Field(
        default="mongodb://localhost:27017",
        alias="MONGODB_URI",
        description="MongoDB connection URI"
    )
    admin_db_name: str = Field(
        default="admin_dashboard",
        alias="ADMIN_DB_NAME",
        description="Database name for admin dashboard"
    )

    # JWT Configuration
    jwt_secret: str = Field(
        default="change-this-secret-in-production-min-32-chars",
        alias="ADMIN_JWT_SECRET",
        description="Secret key for JWT signing"
    )
    jwt_algorithm: str = Field(
        default="HS256",
        description="JWT signing algorithm"
    )
    jwt_access_expiry: int = Field(
        default=3600,
        alias="JWT_ACCESS_EXPIRY",
        description="Access token expiry in seconds (default 1 hour)"
    )
    jwt_refresh_expiry: int = Field(
        default=604800,
        alias="JWT_REFRESH_EXPIRY",
        description="Refresh token expiry in seconds (default 7 days)"
    )

    # Account Lockout Configuration
    lockout_threshold: int = Field(
        default=5,
        alias="ADMIN_LOCKOUT_THRESHOLD",
        description="Number of failed attempts before lockout"
    )
    lockout_duration: int = Field(
        default=900,
        alias="ADMIN_LOCKOUT_DURATION",
        description="Lockout duration in seconds (default 15 minutes)"
    )

    # Audit Log Configuration
    audit_log_retention_days: int = Field(
        default=90,
        description="Days to retain auth audit logs"
    )

    # Session Configuration
    session_ttl_days: int = Field(
        default=7,
        description="Days before session expires"
    )

    # Application Configuration
    app_name: str = Field(
        default="Admin Dashboard API",
        description="Application name"
    )
    debug: bool = Field(
        default=False,
        alias="DEBUG",
        description="Debug mode"
    )

    # SMTP Email Configuration
    smtp_host: str = Field(
        default="smtp.mailersend.net",
        alias="SMTP_HOST",
        description="SMTP server hostname"
    )
    smtp_port: int = Field(
        default=587,
        alias="SMTP_PORT",
        description="SMTP server port"
    )
    smtp_username: str = Field(
        default="",
        alias="SMTP_USERNAME",
        description="SMTP username"
    )
    smtp_password: str = Field(
        default="",
        alias="SMTP_PASSWORD",
        description="SMTP password"
    )
    smtp_from_email: str = Field(
        default="noreply@test-r6ke4n1890ygon12.mlsender.net",
        alias="SMTP_FROM_EMAIL",
        description="From email address for sent emails"
    )
    smtp_from_name: str = Field(
        default="MongoDB Solutions Library",
        alias="SMTP_FROM_NAME",
        description="From name for sent emails"
    )

    # Password Reset Configuration
    password_reset_expiry: int = Field(
        default=3600,
        alias="PASSWORD_RESET_EXPIRY",
        description="Password reset token expiry in seconds (default 1 hour)"
    )
    base_url: str = Field(
        default="http://localhost:3100",
        alias="BASE_URL",
        description="Base URL for password reset links"
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
        "populate_by_name": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience instance
settings = get_settings()
