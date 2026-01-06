"""
Repository for admin session management.
"""

from datetime import datetime, timedelta
from typing import Optional, List
import uuid
import logging

from database.connection import get_sessions_collection
from models.session import SessionCreate, SessionInDB, SessionUpdate
from config import settings

logger = logging.getLogger(__name__)


def generate_session_id() -> str:
    """Generate a unique session ID."""
    return str(uuid.uuid4())


class SessionRepository:
    """Repository for admin session operations."""

    @staticmethod
    async def create(session_data: SessionCreate) -> SessionInDB:
        """
        Create a new session.

        Args:
            session_data: Session creation data

        Returns:
            Created session
        """
        collection = get_sessions_collection()
        now = datetime.utcnow()

        session_doc = {
            "session_id": generate_session_id(),
            "admin_id": session_data.admin_id,
            "access_token_hash": session_data.access_token_hash,
            "refresh_token_hash": session_data.refresh_token_hash,
            "created_at": now,
            "expires_at": session_data.expires_at,
            "last_activity": now,
            "ip_address": session_data.ip_address,
            "user_agent": session_data.user_agent,
            "is_active": True,
        }

        await collection.insert_one(session_doc)
        logger.info(f"Created session: {session_doc['session_id']} for admin: {session_data.admin_id}")

        return SessionInDB(**session_doc)

    @staticmethod
    async def get_by_id(session_id: str) -> Optional[SessionInDB]:
        """Get session by ID."""
        collection = get_sessions_collection()
        doc = await collection.find_one({"session_id": session_id})

        if doc is None:
            return None

        return SessionInDB(**doc)

    @staticmethod
    async def get_by_access_token_hash(token_hash: str) -> Optional[SessionInDB]:
        """Get session by access token hash."""
        collection = get_sessions_collection()
        doc = await collection.find_one({
            "access_token_hash": token_hash,
            "is_active": True,
        })

        if doc is None:
            return None

        return SessionInDB(**doc)

    @staticmethod
    async def get_by_refresh_token_hash(token_hash: str) -> Optional[SessionInDB]:
        """Get session by refresh token hash."""
        collection = get_sessions_collection()
        doc = await collection.find_one({
            "refresh_token_hash": token_hash,
            "is_active": True,
        })

        if doc is None:
            return None

        return SessionInDB(**doc)

    @staticmethod
    async def update(session_id: str, update_data: SessionUpdate) -> Optional[SessionInDB]:
        """Update a session."""
        collection = get_sessions_collection()

        update_dict = update_data.model_dump(exclude_unset=True)
        if not update_dict:
            return await SessionRepository.get_by_id(session_id)

        result = await collection.find_one_and_update(
            {"session_id": session_id},
            {"$set": update_dict},
            return_document=True,
        )

        if result is None:
            return None

        return SessionInDB(**result)

    @staticmethod
    async def update_activity(session_id: str) -> None:
        """Update the last activity timestamp."""
        collection = get_sessions_collection()

        await collection.update_one(
            {"session_id": session_id},
            {"$set": {"last_activity": datetime.utcnow()}},
        )

    @staticmethod
    async def refresh_tokens(
        session_id: str,
        new_access_token_hash: str,
        new_refresh_token_hash: str,
        new_expires_at: datetime,
    ) -> Optional[SessionInDB]:
        """Refresh session tokens."""
        collection = get_sessions_collection()

        result = await collection.find_one_and_update(
            {"session_id": session_id, "is_active": True},
            {
                "$set": {
                    "access_token_hash": new_access_token_hash,
                    "refresh_token_hash": new_refresh_token_hash,
                    "expires_at": new_expires_at,
                    "last_activity": datetime.utcnow(),
                }
            },
            return_document=True,
        )

        if result is None:
            return None

        return SessionInDB(**result)

    @staticmethod
    async def deactivate(session_id: str) -> bool:
        """Deactivate a session (logout)."""
        collection = get_sessions_collection()

        result = await collection.update_one(
            {"session_id": session_id},
            {"$set": {"is_active": False}},
        )

        if result.modified_count > 0:
            logger.info(f"Deactivated session: {session_id}")
            return True

        return False

    @staticmethod
    async def deactivate_all_for_admin(admin_id: str, except_session_id: Optional[str] = None) -> int:
        """
        Deactivate all sessions for an admin.

        Args:
            admin_id: Admin ID
            except_session_id: Optional session ID to keep active

        Returns:
            Number of sessions deactivated
        """
        collection = get_sessions_collection()

        query = {"admin_id": admin_id, "is_active": True}
        if except_session_id:
            query["session_id"] = {"$ne": except_session_id}

        result = await collection.update_many(
            query,
            {"$set": {"is_active": False}},
        )

        if result.modified_count > 0:
            logger.info(f"Deactivated {result.modified_count} sessions for admin: {admin_id}")

        return result.modified_count

    @staticmethod
    async def get_active_sessions_for_admin(admin_id: str) -> List[SessionInDB]:
        """Get all active sessions for an admin."""
        collection = get_sessions_collection()

        cursor = collection.find({
            "admin_id": admin_id,
            "is_active": True,
        }).sort("last_activity", -1)

        docs = await cursor.to_list(length=100)
        return [SessionInDB(**doc) for doc in docs]

    @staticmethod
    async def count_active_sessions(admin_id: str) -> int:
        """Count active sessions for an admin."""
        collection = get_sessions_collection()

        return await collection.count_documents({
            "admin_id": admin_id,
            "is_active": True,
        })

    @staticmethod
    async def cleanup_expired() -> int:
        """
        Clean up expired sessions.
        Note: TTL index handles this automatically, but this can be used for immediate cleanup.

        Returns:
            Number of sessions cleaned up
        """
        collection = get_sessions_collection()

        result = await collection.delete_many({
            "expires_at": {"$lt": datetime.utcnow()},
        })

        if result.deleted_count > 0:
            logger.info(f"Cleaned up {result.deleted_count} expired sessions")

        return result.deleted_count
