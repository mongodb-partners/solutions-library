"""
Solutions repository for MongoDB-based CRUD operations.
Supports migration from file-based solutions and full CRUD.
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

from database.connection import MongoDB
from models.solution import (
    Solution,
    SolutionCreate,
    SolutionUpdate,
    SolutionInDB,
    SolutionListItem,
    SolutionDetail,
    CategoryCount,
    PartnerInfo,
    PortMapping,
)
from models.solution_override import SolutionOverrideInDB

logger = logging.getLogger(__name__)


class SolutionsRepository:
    """
    Repository for managing solution data in MongoDB.

    Supports:
    - Full CRUD operations
    - Migration from file-based solutions
    - Backward compatibility with solution overrides
    """

    @staticmethod
    def _get_collection():
        """Get the solutions collection."""
        return MongoDB.get_database()["solutions"]

    @staticmethod
    async def seed_from_files(solutions_dir: str = "/app/solutions") -> int:
        """
        Seed solutions from solution.json files into MongoDB.
        Only seeds solutions that don't already exist.

        Returns the number of solutions seeded.
        """
        collection = SolutionsRepository._get_collection()
        solutions_path = Path(solutions_dir)
        seeded = 0

        if not solutions_path.exists():
            logger.warning(f"Solutions directory not found: {solutions_dir}")
            return 0

        for solution_dir in solutions_path.iterdir():
            if not solution_dir.is_dir():
                continue

            solution_file = solution_dir / "solution.json"
            if not solution_file.exists():
                continue

            try:
                with open(solution_file, "r") as f:
                    data = json.load(f)

                solution_id = data.get("id")
                if not solution_id:
                    continue

                # Check if already exists
                existing = await collection.find_one({"solution_id": solution_id})
                if existing:
                    continue

                # Parse and create solution
                now = datetime.utcnow()
                solution_doc = {
                    "solution_id": solution_id,
                    "name": data.get("name", ""),
                    "partner": {
                        "name": data.get("partner", {}).get("name", ""),
                        "logo": data.get("partner", {}).get("logo", "/logos/placeholder.svg"),
                        "website": data.get("partner", {}).get("website", ""),
                    },
                    "description": data.get("description", ""),
                    "long_description": data.get("longDescription"),
                    "value_proposition": data.get("valueProposition", []),
                    "technologies": data.get("technologies", []),
                    "category": data.get("category", "Uncategorized"),
                    "demo_url": data.get("demoUrl", ""),
                    "source_url": data.get("sourceUrl", ""),
                    "documentation": data.get("documentation"),
                    "ports": data.get("ports"),
                    "status": data.get("status", "active"),
                    "featured": data.get("featured", False),
                    "created_at": now,
                    "updated_at": now,
                    "created_by": None,
                    "updated_by": None,
                    "is_from_file": True,
                }

                await collection.insert_one(solution_doc)
                seeded += 1
                logger.info(f"Seeded solution: {solution_id}")

            except Exception as e:
                logger.error(f"Error seeding solution from {solution_file}: {e}")
                continue

        return seeded

    @staticmethod
    async def create(data: SolutionCreate, created_by: str) -> SolutionInDB:
        """Create a new solution."""
        collection = SolutionsRepository._get_collection()

        # Check if ID already exists
        existing = await collection.find_one({"solution_id": data.id})
        if existing:
            raise ValueError(f"Solution with ID '{data.id}' already exists")

        now = datetime.utcnow()

        ports = None
        if data.port_api or data.port_ui:
            ports = {"api": data.port_api, "ui": data.port_ui}

        solution_doc = {
            "solution_id": data.id,
            "name": data.name,
            "partner": {
                "name": data.partner_name,
                "logo": data.partner_logo,
                "website": data.partner_website or "",
            },
            "description": data.description,
            "long_description": data.long_description,
            "value_proposition": data.value_proposition,
            "technologies": data.technologies,
            "category": data.category,
            "demo_url": data.demo_url or "",
            "source_url": data.source_url or "",
            "documentation": data.documentation,
            "ports": ports,
            "status": data.status,
            "featured": data.featured,
            "created_at": now,
            "updated_at": now,
            "created_by": created_by,
            "updated_by": created_by,
            "is_from_file": False,
        }

        await collection.insert_one(solution_doc)
        logger.info(f"Created solution: {data.id} by {created_by}")

        solution_doc.pop("_id", None)
        return SolutionInDB(**solution_doc)

    @staticmethod
    async def update(
        solution_id: str,
        data: SolutionUpdate,
        updated_by: str,
    ) -> Optional[SolutionInDB]:
        """Update an existing solution."""
        collection = SolutionsRepository._get_collection()

        # Build update dict with only provided fields
        update_fields = {"updated_at": datetime.utcnow(), "updated_by": updated_by}

        if data.name is not None:
            update_fields["name"] = data.name
        if data.description is not None:
            update_fields["description"] = data.description
        if data.long_description is not None:
            update_fields["long_description"] = data.long_description
        if data.value_proposition is not None:
            update_fields["value_proposition"] = data.value_proposition
        if data.technologies is not None:
            update_fields["technologies"] = data.technologies
        if data.category is not None:
            update_fields["category"] = data.category
        if data.demo_url is not None:
            update_fields["demo_url"] = data.demo_url
        if data.source_url is not None:
            update_fields["source_url"] = data.source_url
        if data.documentation is not None:
            update_fields["documentation"] = data.documentation
        if data.status is not None:
            update_fields["status"] = data.status
        if data.featured is not None:
            update_fields["featured"] = data.featured

        # Handle partner fields
        if data.partner_name is not None:
            update_fields["partner.name"] = data.partner_name
        if data.partner_logo is not None:
            update_fields["partner.logo"] = data.partner_logo
        if data.partner_website is not None:
            update_fields["partner.website"] = data.partner_website

        # Handle ports
        if data.port_api is not None:
            update_fields["ports.api"] = data.port_api
        if data.port_ui is not None:
            update_fields["ports.ui"] = data.port_ui

        result = await collection.find_one_and_update(
            {"solution_id": solution_id},
            {"$set": update_fields},
            return_document=True,
        )

        if not result:
            return None

        result.pop("_id", None)
        logger.info(f"Updated solution: {solution_id} by {updated_by}")
        return SolutionInDB(**result)

    @staticmethod
    async def delete(solution_id: str) -> bool:
        """Delete a solution."""
        collection = SolutionsRepository._get_collection()
        result = await collection.delete_one({"solution_id": solution_id})

        if result.deleted_count > 0:
            logger.info(f"Deleted solution: {solution_id}")
            return True
        return False

    @staticmethod
    async def get_by_id(solution_id: str) -> Optional[SolutionInDB]:
        """Get a solution by ID."""
        collection = SolutionsRepository._get_collection()
        doc = await collection.find_one({"solution_id": solution_id})

        if not doc:
            return None

        doc.pop("_id", None)
        return SolutionInDB(**doc)

    @staticmethod
    async def get_all() -> List[SolutionInDB]:
        """Get all solutions."""
        collection = SolutionsRepository._get_collection()
        cursor = collection.find({}).sort([("featured", -1), ("name", 1)])

        solutions = []
        async for doc in cursor:
            doc.pop("_id", None)
            solutions.append(SolutionInDB(**doc))

        return solutions

    @staticmethod
    async def get_list_items(
        overrides: Optional[Dict[str, SolutionOverrideInDB]] = None,
    ) -> List[SolutionListItem]:
        """Get solution list items (summary view) with optional overrides applied."""
        collection = SolutionsRepository._get_collection()
        cursor = collection.find({}).sort([("featured", -1), ("name", 1)])

        items = []
        async for doc in cursor:
            # Apply overrides if available
            status = doc.get("status", "active")
            featured = doc.get("featured", False)
            solution_id = doc.get("solution_id")

            if overrides and solution_id in overrides:
                override = overrides[solution_id]
                if override.status is not None:
                    status = override.status
                if override.featured is not None:
                    featured = override.featured

            partner = doc.get("partner", {})
            ports = doc.get("ports") or {}

            items.append(SolutionListItem(
                id=solution_id,
                name=doc.get("name", ""),
                partner_name=partner.get("name", ""),
                partner_logo=partner.get("logo", "/logos/placeholder.svg"),
                description=doc.get("description", ""),
                category=doc.get("category", ""),
                status=status,
                featured=featured,
                demo_url=doc.get("demo_url", ""),
                source_url=doc.get("source_url", ""),
                technologies=doc.get("technologies", []),
            ))

        # Sort by featured first, then by name
        items.sort(key=lambda x: (not x.featured, x.name))
        return items

    @staticmethod
    async def get_detail(
        solution_id: str,
        override: Optional[SolutionOverrideInDB] = None,
    ) -> Optional[SolutionDetail]:
        """Get solution detail with runtime info and optional override applied."""
        solution = await SolutionsRepository.get_by_id(solution_id)
        if not solution:
            return None

        # Build base data
        status = solution.status
        featured = solution.featured

        # Apply override if available
        if override:
            if override.status is not None:
                status = override.status
            if override.featured is not None:
                featured = override.featured

        return SolutionDetail(
            id=solution.solution_id,
            name=solution.name,
            partner=solution.partner,
            description=solution.description,
            longDescription=solution.long_description,
            valueProposition=solution.value_proposition,
            technologies=solution.technologies,
            category=solution.category,
            demoUrl=solution.demo_url,
            sourceUrl=solution.source_url,
            documentation=solution.documentation,
            ports=solution.ports,
            status=status,
            featured=featured,
            container_status=None,
            last_checked=datetime.utcnow(),
        )

    @staticmethod
    async def get_categories() -> List[CategoryCount]:
        """Get all categories with solution counts."""
        collection = SolutionsRepository._get_collection()

        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]

        categories = []
        async for doc in collection.aggregate(pipeline):
            categories.append(CategoryCount(
                name=doc["_id"] or "Uncategorized",
                count=doc["count"],
            ))

        return categories

    @staticmethod
    async def get_stats(
        overrides: Optional[Dict[str, SolutionOverrideInDB]] = None,
    ) -> dict:
        """Get solution statistics for dashboard with optional overrides applied."""
        collection = SolutionsRepository._get_collection()

        # Get total count
        total = await collection.count_documents({})

        # Get unique categories
        categories = await collection.distinct("category")

        # Get unique partners
        partners = await collection.distinct("partner.name")

        # Count active solutions (considering overrides)
        active_count = 0
        async for doc in collection.find({}):
            solution_id = doc.get("solution_id")
            status = doc.get("status", "active")

            if overrides and solution_id in overrides:
                override = overrides[solution_id]
                if override.status is not None:
                    status = override.status

            if status == "active":
                active_count += 1

        return {
            "total_solutions": total,
            "active_solutions": active_count,
            "total_partners": len(partners),
            "total_categories": len(categories),
        }

    @staticmethod
    async def get_by_category(
        category: str,
        overrides: Optional[Dict[str, SolutionOverrideInDB]] = None,
    ) -> List[SolutionListItem]:
        """Get solutions filtered by category."""
        items = await SolutionsRepository.get_list_items(overrides)
        return [item for item in items if item.category.lower() == category.lower()]

    @staticmethod
    async def search(
        query: str,
        overrides: Optional[Dict[str, SolutionOverrideInDB]] = None,
    ) -> List[SolutionListItem]:
        """Search solutions by name, description, or technologies."""
        items = await SolutionsRepository.get_list_items(overrides)
        query_lower = query.lower()

        results = []
        for item in items:
            if (query_lower in item.name.lower() or
                query_lower in item.description.lower() or
                query_lower in item.partner_name.lower() or
                any(query_lower in tech.lower() for tech in item.technologies)):
                results.append(item)

        return results

    @staticmethod
    async def count() -> int:
        """Get total solution count."""
        collection = SolutionsRepository._get_collection()
        return await collection.count_documents({})


# Legacy compatibility - keep the old singleton pattern but use new static methods
_solutions_repo: Optional["LegacySolutionsRepository"] = None


class LegacySolutionsRepository:
    """Legacy wrapper for backward compatibility."""

    def __init__(self, solutions_dir: str = "/app/solutions"):
        self.solutions_dir = solutions_dir

    def invalidate_cache(self) -> None:
        """No-op for backward compatibility."""
        pass

    async def get_all(self) -> List[SolutionInDB]:
        return await SolutionsRepository.get_all()

    async def get_by_id(self, solution_id: str) -> Optional[SolutionInDB]:
        return await SolutionsRepository.get_by_id(solution_id)

    async def get_list_items(self, overrides=None) -> List[SolutionListItem]:
        return await SolutionsRepository.get_list_items(overrides)

    async def get_detail(self, solution_id: str, override=None) -> Optional[SolutionDetail]:
        return await SolutionsRepository.get_detail(solution_id, override)

    async def get_categories(self) -> List[CategoryCount]:
        return await SolutionsRepository.get_categories()

    async def get_stats(self, overrides=None) -> dict:
        return await SolutionsRepository.get_stats(overrides)

    async def get_by_category(self, category: str, overrides=None) -> List[SolutionListItem]:
        return await SolutionsRepository.get_by_category(category, overrides)

    async def search(self, query: str, overrides=None) -> List[SolutionListItem]:
        return await SolutionsRepository.search(query, overrides)


def get_solutions_repository() -> LegacySolutionsRepository:
    """Get or create the solutions repository singleton."""
    global _solutions_repo
    if _solutions_repo is None:
        solutions_path = os.getenv("SOLUTIONS_DIR", "/app/solutions")
        _solutions_repo = LegacySolutionsRepository(solutions_path)
    return _solutions_repo
