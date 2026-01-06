"""
Repository for admin user CRUD operations.
"""

from datetime import datetime, timedelta
from typing import Optional, List
import uuid
import logging

from database.connection import get_admins_collection
from models.admin import (
    AdminCreate,
    AdminUpdate,
    AdminInDB,
    AdminProfile,
    AdminPermissions,
    AdminRole,
    AdminStatus,
)
from config import settings

logger = logging.getLogger(__name__)


def generate_admin_id() -> str:
    """Generate a unique admin ID."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_part = uuid.uuid4().hex[:8]
    return f"ADM_{timestamp}_{unique_part}"


class AdminRepository:
    """Repository for admin user operations."""

    @staticmethod
    async def create(admin_data: AdminCreate, password_hash: str, created_by: Optional[str] = None) -> AdminInDB:
        """
        Create a new admin user.

        Args:
            admin_data: Admin creation data
            password_hash: Hashed password
            created_by: Admin ID of the creator

        Returns:
            Created admin
        """
        collection = get_admins_collection()
        now = datetime.utcnow()

        admin_doc = {
            "admin_id": generate_admin_id(),
            "username": admin_data.username.lower(),
            "email": admin_data.email.lower(),
            "password_hash": password_hash,
            "role": admin_data.role.value,
            "status": AdminStatus.ACTIVE.value,
            "created_at": now,
            "updated_at": now,
            "created_by": created_by,
            "last_login": None,
            "failed_login_attempts": 0,
            "locked_until": None,
            "profile": {
                "display_name": admin_data.display_name,
                "avatar_url": None,
            },
            "permissions": AdminPermissions.for_role(admin_data.role).model_dump(),
        }

        await collection.insert_one(admin_doc)
        logger.info(f"Created admin: {admin_doc['admin_id']}")

        return AdminInDB(
            admin_id=admin_doc["admin_id"],
            username=admin_doc["username"],
            email=admin_doc["email"],
            password_hash=admin_doc["password_hash"],
            role=AdminRole(admin_doc["role"]),
            status=AdminStatus(admin_doc["status"]),
            created_at=admin_doc["created_at"],
            updated_at=admin_doc["updated_at"],
            created_by=admin_doc["created_by"],
            last_login=admin_doc["last_login"],
            failed_login_attempts=admin_doc["failed_login_attempts"],
            locked_until=admin_doc["locked_until"],
            profile=AdminProfile(**admin_doc["profile"]),
            permissions=AdminPermissions(**admin_doc["permissions"]),
        )

    @staticmethod
    async def get_by_id(admin_id: str) -> Optional[AdminInDB]:
        """Get admin by ID."""
        collection = get_admins_collection()
        doc = await collection.find_one({"admin_id": admin_id})

        if doc is None:
            return None

        return AdminRepository._doc_to_model(doc)

    @staticmethod
    async def get_by_username(username: str) -> Optional[AdminInDB]:
        """Get admin by username."""
        collection = get_admins_collection()
        doc = await collection.find_one({"username": username.lower()})

        if doc is None:
            return None

        return AdminRepository._doc_to_model(doc)

    @staticmethod
    async def get_by_email(email: str) -> Optional[AdminInDB]:
        """Get admin by email."""
        collection = get_admins_collection()
        doc = await collection.find_one({"email": email.lower()})

        if doc is None:
            return None

        return AdminRepository._doc_to_model(doc)

    @staticmethod
    async def update(admin_id: str, update_data: AdminUpdate) -> Optional[AdminInDB]:
        """Update an admin user."""
        collection = get_admins_collection()

        update_dict = update_data.model_dump(exclude_unset=True, exclude_none=True)
        if not update_dict:
            return await AdminRepository.get_by_id(admin_id)

        update_dict["updated_at"] = datetime.utcnow()

        # Handle enum values
        if "role" in update_dict and update_dict["role"]:
            update_dict["role"] = update_dict["role"].value
            # Update permissions when role changes
            update_dict["permissions"] = AdminPermissions.for_role(
                AdminRole(update_dict["role"])
            ).model_dump()
        if "status" in update_dict and update_dict["status"]:
            update_dict["status"] = update_dict["status"].value
        if "display_name" in update_dict:
            update_dict["profile.display_name"] = update_dict.pop("display_name")

        result = await collection.find_one_and_update(
            {"admin_id": admin_id},
            {"$set": update_dict},
            return_document=True,
        )

        if result is None:
            return None

        return AdminRepository._doc_to_model(result)

    @staticmethod
    async def update_password(admin_id: str, password_hash: str) -> bool:
        """Update admin password."""
        collection = get_admins_collection()

        result = await collection.update_one(
            {"admin_id": admin_id},
            {
                "$set": {
                    "password_hash": password_hash,
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        return result.modified_count > 0

    @staticmethod
    async def update_last_login(admin_id: str) -> None:
        """Update the last login timestamp."""
        collection = get_admins_collection()

        await collection.update_one(
            {"admin_id": admin_id},
            {
                "$set": {
                    "last_login": datetime.utcnow(),
                    "failed_login_attempts": 0,
                    "locked_until": None,
                }
            },
        )

    @staticmethod
    async def increment_failed_attempts(admin_id: str) -> int:
        """
        Increment failed login attempts.

        Returns:
            New count of failed attempts
        """
        collection = get_admins_collection()

        result = await collection.find_one_and_update(
            {"admin_id": admin_id},
            {"$inc": {"failed_login_attempts": 1}},
            return_document=True,
        )

        return result["failed_login_attempts"] if result else 0

    @staticmethod
    async def lock_account(admin_id: str, duration_seconds: int) -> None:
        """Lock an admin account for a specified duration."""
        collection = get_admins_collection()
        locked_until = datetime.utcnow() + timedelta(seconds=duration_seconds)

        await collection.update_one(
            {"admin_id": admin_id},
            {
                "$set": {
                    "status": AdminStatus.LOCKED.value,
                    "locked_until": locked_until,
                }
            },
        )

        logger.warning(f"Account locked: {admin_id} until {locked_until}")

    @staticmethod
    async def unlock_account(admin_id: str) -> None:
        """Unlock an admin account."""
        collection = get_admins_collection()

        await collection.update_one(
            {"admin_id": admin_id},
            {
                "$set": {
                    "status": AdminStatus.ACTIVE.value,
                    "locked_until": None,
                    "failed_login_attempts": 0,
                }
            },
        )

        logger.info(f"Account unlocked: {admin_id}")

    @staticmethod
    async def reset_failed_attempts(admin_id: str) -> None:
        """Reset failed login attempts counter."""
        collection = get_admins_collection()

        await collection.update_one(
            {"admin_id": admin_id},
            {"$set": {"failed_login_attempts": 0}},
        )

    @staticmethod
    async def list_all(
        skip: int = 0,
        limit: int = 100,
        role: Optional[AdminRole] = None,
        status: Optional[AdminStatus] = None,
    ) -> List[AdminInDB]:
        """List all admins with optional filtering."""
        collection = get_admins_collection()

        query = {}
        if role:
            query["role"] = role.value
        if status:
            query["status"] = status.value

        cursor = collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        docs = await cursor.to_list(length=limit)

        return [AdminRepository._doc_to_model(doc) for doc in docs]

    @staticmethod
    async def count(
        role: Optional[AdminRole] = None,
        status: Optional[AdminStatus] = None,
    ) -> int:
        """Count admins with optional filtering."""
        collection = get_admins_collection()

        query = {}
        if role:
            query["role"] = role.value
        if status:
            query["status"] = status.value

        return await collection.count_documents(query)

    @staticmethod
    async def delete(admin_id: str) -> bool:
        """Delete an admin (use with caution)."""
        collection = get_admins_collection()
        result = await collection.delete_one({"admin_id": admin_id})
        return result.deleted_count > 0

    @staticmethod
    def _doc_to_model(doc: dict) -> AdminInDB:
        """Convert MongoDB document to Pydantic model."""
        return AdminInDB(
            admin_id=doc["admin_id"],
            username=doc["username"],
            email=doc["email"],
            password_hash=doc["password_hash"],
            role=AdminRole(doc["role"]),
            status=AdminStatus(doc["status"]),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            created_by=doc.get("created_by"),
            last_login=doc.get("last_login"),
            failed_login_attempts=doc.get("failed_login_attempts", 0),
            locked_until=doc.get("locked_until"),
            profile=AdminProfile(**doc["profile"]),
            permissions=AdminPermissions(**doc["permissions"]),
        )
