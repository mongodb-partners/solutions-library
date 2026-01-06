"""
Solution overrides repository for persisting admin changes to MongoDB.
"""

from datetime import datetime
from typing import Dict, List, Optional

from database.connection import MongoDB
from models.solution_override import (
    SolutionOverrideCreate,
    SolutionOverrideUpdate,
    SolutionOverrideInDB,
)


class SolutionOverridesRepository:
    """Repository for managing solution overrides in MongoDB."""

    COLLECTION_NAME = "solution_overrides"

    @classmethod
    def _get_collection(cls):
        """Get the MongoDB collection."""
        return MongoDB.get_database()[cls.COLLECTION_NAME]

    @classmethod
    async def get_by_solution_id(cls, solution_id: str) -> Optional[SolutionOverrideInDB]:
        """Get override for a specific solution."""
        collection = cls._get_collection()
        doc = await collection.find_one({"solution_id": solution_id})
        if doc:
            doc.pop("_id", None)
            return SolutionOverrideInDB(**doc)
        return None

    @classmethod
    async def get_all(cls) -> List[SolutionOverrideInDB]:
        """Get all solution overrides."""
        collection = cls._get_collection()
        overrides = []
        async for doc in collection.find():
            doc.pop("_id", None)
            overrides.append(SolutionOverrideInDB(**doc))
        return overrides

    @classmethod
    async def get_all_as_dict(cls) -> Dict[str, SolutionOverrideInDB]:
        """Get all overrides as a dict keyed by solution_id."""
        overrides = await cls.get_all()
        return {o.solution_id: o for o in overrides}

    @classmethod
    async def create(
        cls,
        override: SolutionOverrideCreate,
        admin_id: str,
    ) -> SolutionOverrideInDB:
        """Create a new solution override."""
        collection = cls._get_collection()
        now = datetime.utcnow()

        doc = {
            **override.model_dump(),
            "created_at": now,
            "updated_at": now,
            "created_by": admin_id,
            "updated_by": admin_id,
        }

        await collection.insert_one(doc)
        doc.pop("_id", None)
        return SolutionOverrideInDB(**doc)

    @classmethod
    async def update(
        cls,
        solution_id: str,
        update: SolutionOverrideUpdate,
        admin_id: str,
    ) -> Optional[SolutionOverrideInDB]:
        """Update an existing solution override."""
        collection = cls._get_collection()

        # Build update dict with only non-None values
        update_data = {
            k: v for k, v in update.model_dump().items() if v is not None
        }
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = admin_id

        result = await collection.find_one_and_update(
            {"solution_id": solution_id},
            {"$set": update_data},
            return_document=True,
        )

        if result:
            result.pop("_id", None)
            return SolutionOverrideInDB(**result)
        return None

    @classmethod
    async def upsert(
        cls,
        solution_id: str,
        update: SolutionOverrideUpdate,
        admin_id: str,
    ) -> SolutionOverrideInDB:
        """Create or update a solution override."""
        existing = await cls.get_by_solution_id(solution_id)

        if existing:
            result = await cls.update(solution_id, update, admin_id)
            if result:
                return result

        # Create new
        create_data = SolutionOverrideCreate(
            solution_id=solution_id,
            status=update.status,
            featured=update.featured,
            notes=update.notes,
        )
        return await cls.create(create_data, admin_id)

    @classmethod
    async def delete(cls, solution_id: str) -> bool:
        """Delete a solution override."""
        collection = cls._get_collection()
        result = await collection.delete_one({"solution_id": solution_id})
        return result.deleted_count > 0

    @classmethod
    async def ensure_indexes(cls) -> None:
        """Create indexes for the collection."""
        collection = cls._get_collection()
        await collection.create_index("solution_id", unique=True)
