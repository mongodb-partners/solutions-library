"""
Solutions management routes for admin dashboard.
Supports full CRUD operations.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth.dependencies import require_any_admin, require_admin, require_super_admin
from models.admin import AdminInDB
from models.solution import (
    SolutionCreate,
    SolutionUpdate,
    SolutionInDB,
    SolutionListItem,
    SolutionDetail,
    SolutionsListResponse,
    CategoryCount,
)
from models.solution_override import SolutionOverrideUpdate, SolutionOverrideResponse
from repositories.solutions_repository import SolutionsRepository
from repositories.solution_overrides_repository import SolutionOverridesRepository

router = APIRouter(prefix="/solutions", tags=["Solutions"])


class StatusUpdateRequest(BaseModel):
    """Request model for updating solution status."""
    status: str = Field(..., pattern="^(active|inactive|coming-soon)$")


class ToggleResponse(BaseModel):
    """Response model for status toggle."""
    solution_id: str
    status: str
    message: str


class SolutionCreateResponse(BaseModel):
    """Response model for solution creation."""
    solution_id: str
    name: str
    message: str


class SolutionDeleteResponse(BaseModel):
    """Response model for solution deletion."""
    solution_id: str
    message: str


class SeedResponse(BaseModel):
    """Response model for seeding solutions."""
    seeded: int
    message: str


@router.get("", response_model=SolutionsListResponse)
async def list_solutions(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search query"),
    admin: AdminInDB = Depends(require_any_admin),
) -> SolutionsListResponse:
    """
    List all solutions with optional filtering.

    - Filter by category
    - Search by name, description, or technologies
    - Applies any admin overrides (status, featured)
    """
    # Get all overrides from MongoDB
    overrides = await SolutionOverridesRepository.get_all_as_dict()

    if search:
        solutions = await SolutionsRepository.search(search, overrides)
    elif category:
        solutions = await SolutionsRepository.get_by_category(category, overrides)
    else:
        solutions = await SolutionsRepository.get_list_items(overrides)

    # Get categories for filter dropdown
    categories = await SolutionsRepository.get_categories()

    return SolutionsListResponse(
        solutions=solutions,
        total=len(solutions),
        categories=[c.name for c in categories],
    )


@router.get("/categories", response_model=List[CategoryCount])
async def list_categories(
    admin: AdminInDB = Depends(require_any_admin),
) -> List[CategoryCount]:
    """Get all categories with solution counts."""
    return await SolutionsRepository.get_categories()


@router.post("", response_model=SolutionCreateResponse)
async def create_solution(
    data: SolutionCreate,
    admin: AdminInDB = Depends(require_admin),
) -> SolutionCreateResponse:
    """
    Create a new solution.

    Requires admin role.
    """
    try:
        solution = await SolutionsRepository.create(data, admin.admin_id)
        return SolutionCreateResponse(
            solution_id=solution.solution_id,
            name=solution.name,
            message=f"Solution '{solution.name}' created successfully",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{solution_id}", response_model=SolutionDetail)
async def get_solution(
    solution_id: str,
    admin: AdminInDB = Depends(require_any_admin),
) -> SolutionDetail:
    """
    Get detailed information about a specific solution.

    Includes:
    - Full solution metadata
    - Admin overrides applied
    - Container status (future)
    - Last checked timestamp
    """
    # Get override if exists
    override = await SolutionOverridesRepository.get_by_solution_id(solution_id)

    solution = await SolutionsRepository.get_detail(solution_id, override)
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    return solution


@router.put("/{solution_id}", response_model=SolutionDetail)
async def update_solution(
    solution_id: str,
    data: SolutionUpdate,
    admin: AdminInDB = Depends(require_admin),
) -> SolutionDetail:
    """
    Update an existing solution.

    Requires admin role.
    """
    # Check if solution exists
    existing = await SolutionsRepository.get_by_id(solution_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Solution not found")

    # Update solution
    updated = await SolutionsRepository.update(solution_id, data, admin.admin_id)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update solution")

    # Return detail view
    override = await SolutionOverridesRepository.get_by_solution_id(solution_id)
    detail = await SolutionsRepository.get_detail(solution_id, override)
    return detail


@router.delete("/{solution_id}", response_model=SolutionDeleteResponse)
async def delete_solution(
    solution_id: str,
    admin: AdminInDB = Depends(require_super_admin),
) -> SolutionDeleteResponse:
    """
    Delete a solution.

    Requires super_admin role.
    """
    # Check if solution exists
    existing = await SolutionsRepository.get_by_id(solution_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Solution not found")

    # Delete solution
    deleted = await SolutionsRepository.delete(solution_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete solution")

    # Also delete any overrides
    await SolutionOverridesRepository.delete(solution_id)

    return SolutionDeleteResponse(
        solution_id=solution_id,
        message=f"Solution '{existing.name}' deleted successfully",
    )


@router.patch("/{solution_id}/status", response_model=ToggleResponse)
async def update_solution_status(
    solution_id: str,
    request: StatusUpdateRequest,
    admin: AdminInDB = Depends(require_admin),
) -> ToggleResponse:
    """
    Update the status of a solution.

    This updates the solution directly in MongoDB.

    Status values:
    - active: Solution is enabled and can be launched
    - inactive: Solution is hidden from public UI
    - coming-soon: Solution is visible but cannot be launched
    """
    # Verify solution exists
    solution = await SolutionsRepository.get_by_id(solution_id)
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")

    # Update status directly on solution
    update_data = SolutionUpdate(status=request.status)
    await SolutionsRepository.update(solution_id, update_data, admin.admin_id)

    # Also update/clear any override to keep them in sync
    existing_override = await SolutionOverridesRepository.get_by_solution_id(solution_id)
    if existing_override:
        # Update the override status to match
        override_update = SolutionOverrideUpdate(
            status=request.status,
            featured=existing_override.featured,
        )
        await SolutionOverridesRepository.upsert(
            solution_id=solution_id,
            update=override_update,
            admin_id=admin.admin_id,
        )

    return ToggleResponse(
        solution_id=solution_id,
        status=request.status,
        message=f"Solution status updated to {request.status}",
    )


@router.post("/seed", response_model=SeedResponse)
async def seed_solutions(
    admin: AdminInDB = Depends(require_super_admin),
) -> SeedResponse:
    """
    Seed solutions from solution.json files.

    Only seeds solutions that don't already exist in MongoDB.
    Requires super_admin role.
    """
    seeded = await SolutionsRepository.seed_from_files()
    return SeedResponse(
        seeded=seeded,
        message=f"Seeded {seeded} new solutions from files",
    )


@router.post("/{solution_id}/refresh")
async def refresh_solution_cache(
    solution_id: str,
    admin: AdminInDB = Depends(require_admin),
) -> dict:
    """
    Refresh a specific solution (no-op with MongoDB backend).
    Kept for backward compatibility.
    """
    solution = await SolutionsRepository.get_by_id(solution_id)
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")

    return {"message": "Solution refreshed", "solution_id": solution_id}


@router.post("/refresh-all")
async def refresh_all_solutions(
    admin: AdminInDB = Depends(require_admin),
) -> dict:
    """
    Refresh all solutions (no-op with MongoDB backend).
    Kept for backward compatibility.
    """
    count = await SolutionsRepository.count()
    return {
        "message": "All solutions refreshed",
        "total": count,
    }
