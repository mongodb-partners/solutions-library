"""
Usage enquiry repository for storing demo usage requests.
"""

import logging
import uuid
from datetime import datetime
from typing import List, Optional

from database.connection import MongoDB
from models.usage_enquiry import UsageEnquiryCreate, UsageEnquiryInDB

logger = logging.getLogger(__name__)

# Collection name
COLLECTION_NAME = "usage_enquiries"


class UsageEnquiryRepository:
    """Repository for usage enquiry operations."""

    @staticmethod
    def _get_collection():
        """Get the usage_enquiries collection."""
        return MongoDB.get_database()[COLLECTION_NAME]

    @staticmethod
    def _generate_enquiry_id() -> str:
        """Generate a unique enquiry ID."""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        return f"ENQ_{timestamp}_{unique_id}"

    @staticmethod
    async def create(
        enquiry_data: UsageEnquiryCreate,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> UsageEnquiryInDB:
        """Create a new usage enquiry."""
        collection = UsageEnquiryRepository._get_collection()

        now = datetime.utcnow()
        enquiry_id = UsageEnquiryRepository._generate_enquiry_id()

        enquiry = UsageEnquiryInDB(
            enquiry_id=enquiry_id,
            name=enquiry_data.name,
            email=enquiry_data.email,
            company=enquiry_data.company,
            role=enquiry_data.role,
            solution_id=enquiry_data.solution_id,
            solution_name=enquiry_data.solution_name,
            skipped=enquiry_data.skipped,
            created_at=now,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Exclude None, empty strings, and False skipped from MongoDB document
        doc = {
            k: v for k, v in enquiry.model_dump().items()
            if v not in (None, "") and not (k == "skipped" and v is False)
        }
        await collection.insert_one(doc)
        logger.info(f"Created usage enquiry: {enquiry_id} for solution {enquiry_data.solution_id}")

        return enquiry

    @staticmethod
    async def get_all(limit: int = 100, skip: int = 0) -> List[UsageEnquiryInDB]:
        """Get all usage enquiries with pagination."""
        collection = UsageEnquiryRepository._get_collection()

        cursor = collection.find().sort("created_at", -1).skip(skip).limit(limit)

        enquiries = []
        async for doc in cursor:
            doc.pop("_id", None)
            enquiries.append(UsageEnquiryInDB(**doc))

        return enquiries

    @staticmethod
    async def get_by_solution(solution_id: str, limit: int = 100) -> List[UsageEnquiryInDB]:
        """Get usage enquiries for a specific solution."""
        collection = UsageEnquiryRepository._get_collection()

        cursor = collection.find({"solution_id": solution_id}).sort("created_at", -1).limit(limit)

        enquiries = []
        async for doc in cursor:
            doc.pop("_id", None)
            enquiries.append(UsageEnquiryInDB(**doc))

        return enquiries

    @staticmethod
    async def count() -> int:
        """Get total count of usage enquiries."""
        collection = UsageEnquiryRepository._get_collection()
        return await collection.count_documents({})

    @staticmethod
    async def count_by_solution(solution_id: str) -> int:
        """Get count of usage enquiries for a specific solution."""
        collection = UsageEnquiryRepository._get_collection()
        return await collection.count_documents({"solution_id": solution_id})
