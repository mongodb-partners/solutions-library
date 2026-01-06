"""
Repository for authentication audit logging.
"""

from datetime import datetime, timedelta
from typing import Optional, List
import uuid
import logging

from database.connection import get_audit_collection
from models.audit import (
    AuthEventType,
    AuditEventDetails,
    AuditEventCreate,
    AuditEventInDB,
    AuditEventFilter,
)
from config import settings

logger = logging.getLogger(__name__)


def generate_event_id() -> str:
    """Generate a unique event ID."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_part = uuid.uuid4().hex[:8]
    return f"AUTH_{timestamp}_{unique_part}"


class AuditRepository:
    """Repository for authentication audit logging."""

    @staticmethod
    async def log_event(event_data: AuditEventCreate) -> AuditEventInDB:
        """
        Log an authentication event.

        Args:
            event_data: Event data to log

        Returns:
            Created audit event
        """
        collection = get_audit_collection()
        now = datetime.utcnow()

        # Calculate expiry based on retention setting
        expires_at = now + timedelta(days=settings.audit_log_retention_days)

        event_doc = {
            "event_id": generate_event_id(),
            "event_type": event_data.event_type.value,
            "admin_id": event_data.admin_id,
            "username_attempted": event_data.username_attempted,
            "timestamp": now,
            "ip_address": event_data.ip_address,
            "user_agent": event_data.user_agent,
            "details": (event_data.details or AuditEventDetails()).model_dump(),
            "expires_at": expires_at,
        }

        await collection.insert_one(event_doc)

        # Log to application logger as well
        log_msg = f"Auth event: {event_data.event_type.value} for user '{event_data.username_attempted}' from {event_data.ip_address}"
        if event_data.event_type in [AuthEventType.LOGIN_FAILED, AuthEventType.LOCKOUT]:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)

        return AuditEventInDB(
            event_id=event_doc["event_id"],
            event_type=AuthEventType(event_doc["event_type"]),
            admin_id=event_doc["admin_id"],
            username_attempted=event_doc["username_attempted"],
            timestamp=event_doc["timestamp"],
            ip_address=event_doc["ip_address"],
            user_agent=event_doc["user_agent"],
            details=AuditEventDetails(**event_doc["details"]),
            expires_at=event_doc["expires_at"],
        )

    @staticmethod
    async def log_login_success(
        admin_id: str,
        username: str,
        session_id: str,
        ip_address: str,
        user_agent: str,
    ) -> AuditEventInDB:
        """Log a successful login."""
        return await AuditRepository.log_event(
            AuditEventCreate(
                event_type=AuthEventType.LOGIN_SUCCESS,
                admin_id=admin_id,
                username_attempted=username,
                ip_address=ip_address,
                user_agent=user_agent,
                details=AuditEventDetails(session_id=session_id),
            )
        )

    @staticmethod
    async def log_login_failed(
        username: str,
        ip_address: str,
        user_agent: str,
        reason: str,
        admin_id: Optional[str] = None,
        failed_attempts: Optional[int] = None,
    ) -> AuditEventInDB:
        """Log a failed login attempt."""
        return await AuditRepository.log_event(
            AuditEventCreate(
                event_type=AuthEventType.LOGIN_FAILED,
                admin_id=admin_id,
                username_attempted=username,
                ip_address=ip_address,
                user_agent=user_agent,
                details=AuditEventDetails(
                    reason=reason,
                    previous_failed_attempts=failed_attempts,
                ),
            )
        )

    @staticmethod
    async def log_logout(
        admin_id: str,
        username: str,
        session_id: str,
        ip_address: str,
        user_agent: str,
    ) -> AuditEventInDB:
        """Log a logout event."""
        return await AuditRepository.log_event(
            AuditEventCreate(
                event_type=AuthEventType.LOGOUT,
                admin_id=admin_id,
                username_attempted=username,
                ip_address=ip_address,
                user_agent=user_agent,
                details=AuditEventDetails(session_id=session_id),
            )
        )

    @staticmethod
    async def log_token_refresh(
        admin_id: str,
        username: str,
        session_id: str,
        ip_address: str,
        user_agent: str,
    ) -> AuditEventInDB:
        """Log a token refresh event."""
        return await AuditRepository.log_event(
            AuditEventCreate(
                event_type=AuthEventType.TOKEN_REFRESH,
                admin_id=admin_id,
                username_attempted=username,
                ip_address=ip_address,
                user_agent=user_agent,
                details=AuditEventDetails(session_id=session_id),
            )
        )

    @staticmethod
    async def log_password_change(
        admin_id: str,
        username: str,
        ip_address: str,
        user_agent: str,
    ) -> AuditEventInDB:
        """Log a password change event."""
        return await AuditRepository.log_event(
            AuditEventCreate(
                event_type=AuthEventType.PASSWORD_CHANGE,
                admin_id=admin_id,
                username_attempted=username,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        )

    @staticmethod
    async def log_lockout(
        admin_id: str,
        username: str,
        ip_address: str,
        user_agent: str,
        failed_attempts: int,
    ) -> AuditEventInDB:
        """Log an account lockout event."""
        return await AuditRepository.log_event(
            AuditEventCreate(
                event_type=AuthEventType.LOCKOUT,
                admin_id=admin_id,
                username_attempted=username,
                ip_address=ip_address,
                user_agent=user_agent,
                details=AuditEventDetails(
                    reason="Too many failed login attempts",
                    previous_failed_attempts=failed_attempts,
                ),
            )
        )

    @staticmethod
    async def log_password_reset_request(
        admin_id: str,
        username: str,
        email: str,
        ip_address: str,
        user_agent: str,
    ) -> AuditEventInDB:
        """Log a password reset request event."""
        return await AuditRepository.log_event(
            AuditEventCreate(
                event_type=AuthEventType.PASSWORD_RESET_REQUEST,
                admin_id=admin_id,
                username_attempted=username,
                ip_address=ip_address,
                user_agent=user_agent,
                details=AuditEventDetails(
                    extra={"email": email},
                ),
            )
        )

    @staticmethod
    async def log_password_reset(
        admin_id: str,
        username: str,
        ip_address: str,
        user_agent: str,
    ) -> AuditEventInDB:
        """Log a password reset completion event."""
        return await AuditRepository.log_event(
            AuditEventCreate(
                event_type=AuthEventType.PASSWORD_RESET,
                admin_id=admin_id,
                username_attempted=username,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        )

    @staticmethod
    async def get_events(filter_params: AuditEventFilter) -> List[AuditEventInDB]:
        """
        Get audit events with filtering.

        Args:
            filter_params: Filter criteria

        Returns:
            List of matching audit events
        """
        collection = get_audit_collection()

        query = {}

        if filter_params.event_type:
            query["event_type"] = filter_params.event_type.value
        if filter_params.admin_id:
            query["admin_id"] = filter_params.admin_id
        if filter_params.ip_address:
            query["ip_address"] = filter_params.ip_address

        # Time range filtering
        if filter_params.start_time or filter_params.end_time:
            query["timestamp"] = {}
            if filter_params.start_time:
                query["timestamp"]["$gte"] = filter_params.start_time
            if filter_params.end_time:
                query["timestamp"]["$lte"] = filter_params.end_time

        cursor = (
            collection.find(query)
            .sort("timestamp", -1)
            .skip(filter_params.offset)
            .limit(filter_params.limit)
        )

        docs = await cursor.to_list(length=filter_params.limit)

        return [
            AuditEventInDB(
                event_id=doc["event_id"],
                event_type=AuthEventType(doc["event_type"]),
                admin_id=doc.get("admin_id"),
                username_attempted=doc["username_attempted"],
                timestamp=doc["timestamp"],
                ip_address=doc["ip_address"],
                user_agent=doc["user_agent"],
                details=AuditEventDetails(**doc["details"]),
                expires_at=doc["expires_at"],
            )
            for doc in docs
        ]

    @staticmethod
    async def get_recent_failed_attempts(
        username: str,
        ip_address: Optional[str] = None,
        hours: int = 24,
    ) -> int:
        """
        Count recent failed login attempts.

        Args:
            username: Username to check
            ip_address: Optional IP address filter
            hours: Number of hours to look back

        Returns:
            Count of failed attempts
        """
        collection = get_audit_collection()

        query = {
            "event_type": AuthEventType.LOGIN_FAILED.value,
            "username_attempted": username,
            "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=hours)},
        }

        if ip_address:
            query["ip_address"] = ip_address

        return await collection.count_documents(query)

    @staticmethod
    async def count_events(filter_params: AuditEventFilter) -> int:
        """Count audit events with filtering."""
        collection = get_audit_collection()

        query = {}

        if filter_params.event_type:
            query["event_type"] = filter_params.event_type.value
        if filter_params.admin_id:
            query["admin_id"] = filter_params.admin_id
        if filter_params.ip_address:
            query["ip_address"] = filter_params.ip_address

        if filter_params.start_time or filter_params.end_time:
            query["timestamp"] = {}
            if filter_params.start_time:
                query["timestamp"]["$gte"] = filter_params.start_time
            if filter_params.end_time:
                query["timestamp"]["$lte"] = filter_params.end_time

        return await collection.count_documents(query)

    @staticmethod
    async def get_events_since(since: datetime, limit: int = 1000) -> List[dict]:
        """
        Get all audit events since a given time.

        Args:
            since: Start time for events
            limit: Maximum number of events to return

        Returns:
            List of event documents
        """
        collection = get_audit_collection()

        query = {"timestamp": {"$gte": since}}

        cursor = collection.find(query).sort("timestamp", -1).limit(limit)
        return await cursor.to_list(length=limit)
