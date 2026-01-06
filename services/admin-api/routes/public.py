"""
Public routes - no authentication required.
These endpoints are consumed by the public-facing UI.
"""

from typing import Dict
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from repositories.solutions_repository import get_solutions_repository, SolutionsRepository
from repositories.solution_overrides_repository import SolutionOverridesRepository
from repositories.settings_repository import SettingsRepository

router = APIRouter(prefix="/public", tags=["Public"])


class MaintenanceStatusResponse(BaseModel):
    """Response model for maintenance status."""
    maintenance_mode: bool
    maintenance_message: str


@router.get("/maintenance", response_model=MaintenanceStatusResponse)
async def get_maintenance_status() -> MaintenanceStatusResponse:
    """
    Get maintenance mode status.

    This is a public endpoint (no auth required) that returns
    whether maintenance mode is enabled and the message to display.
    """
    settings = await SettingsRepository.get()
    return MaintenanceStatusResponse(
        maintenance_mode=settings.general.maintenance_mode,
        maintenance_message=settings.general.maintenance_message,
    )


class SolutionStatusResponse(BaseModel):
    """Response model for solution status."""
    statuses: Dict[str, str]  # solution_id -> status


@router.get("/solutions/status", response_model=SolutionStatusResponse)
async def get_solution_statuses(
    repo: SolutionsRepository = Depends(lambda: get_solutions_repository()),
) -> SolutionStatusResponse:
    """
    Get all solution statuses.

    This is a public endpoint (no auth required) that returns
    the current status of all solutions, including any admin overrides.

    Status values:
    - active: Solution is enabled and can be launched
    - inactive: Solution is hidden from public UI
    - coming-soon: Solution is visible but cannot be launched
    """
    # Get base solutions
    solutions = await repo.get_all()

    # Get all overrides from MongoDB
    overrides = await SolutionOverridesRepository.get_all_as_dict()

    # Build status map
    statuses = {}
    for solution in solutions:
        # Use override status if available, otherwise use base status
        if solution.solution_id in overrides and overrides[solution.solution_id].status:
            statuses[solution.solution_id] = overrides[solution.solution_id].status
        else:
            statuses[solution.solution_id] = solution.status

    return SolutionStatusResponse(statuses=statuses)
