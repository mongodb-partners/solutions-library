"""
Public routes - no authentication required.
These endpoints are consumed by the public-facing UI.
"""

from typing import Dict
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from repositories.solutions_repository import get_solutions_repository, SolutionsRepository
from repositories.solution_overrides_repository import SolutionOverridesRepository
from repositories.settings_repository import SettingsRepository
from repositories.usage_enquiry_repository import UsageEnquiryRepository
from models.usage_enquiry import UsageEnquiryCreate, UsageEnquiryResponse

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


def _get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _get_user_agent(request: Request) -> str:
    """Extract user agent from request."""
    return request.headers.get("user-agent", "unknown")


@router.post("/usage-enquiry", response_model=UsageEnquiryResponse)
async def submit_usage_enquiry(
    request: Request,
    body: UsageEnquiryCreate,
) -> UsageEnquiryResponse:
    """
    Submit a usage enquiry for a demo.

    This is a public endpoint (no auth required) that captures
    user information before launching a demo.
    """
    ip_address = _get_client_ip(request)
    user_agent = _get_user_agent(request)

    enquiry = await UsageEnquiryRepository.create(
        enquiry_data=body,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return UsageEnquiryResponse(
        enquiry_id=enquiry.enquiry_id,
        message="Thank you for your interest! The demo will now launch.",
    )
