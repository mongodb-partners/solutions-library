"""
Dashboard routes for admin dashboard.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth.dependencies import get_current_admin, require_any_admin
from models.admin import AdminInDB, AdminRole
from repositories.solutions_repository import get_solutions_repository, SolutionsRepository
from repositories.solution_overrides_repository import SolutionOverridesRepository
from repositories.audit_repository import AuditRepository

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# Response Models
class DashboardStats(BaseModel):
    """Dashboard statistics."""
    total_solutions: int
    active_solutions: int
    total_partners: int
    total_categories: int
    last_updated: datetime


class NavItem(BaseModel):
    """Navigation item."""
    id: str
    label: str
    path: str
    icon: str
    enabled: bool


class NavResponse(BaseModel):
    """Navigation response."""
    items: List[NavItem]


def get_repo() -> SolutionsRepository:
    """Dependency to get solutions repository."""
    return get_solutions_repository()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    admin: AdminInDB = Depends(require_any_admin),
    repo: SolutionsRepository = Depends(get_repo),
) -> DashboardStats:
    """
    Get dashboard statistics.

    Returns real-time statistics from the solutions repository.
    Applies any admin overrides to status counts.
    """
    # Get all overrides from MongoDB
    overrides = await SolutionOverridesRepository.get_all_as_dict()

    stats = await repo.get_stats(overrides)

    return DashboardStats(
        total_solutions=stats["total_solutions"],
        active_solutions=stats["active_solutions"],
        total_partners=stats["total_partners"],
        total_categories=stats["total_categories"],
        last_updated=datetime.utcnow(),
    )


@router.get("/nav", response_model=NavResponse)
async def get_navigation(
    admin: AdminInDB = Depends(require_any_admin),
) -> NavResponse:
    """
    Get navigation items based on admin role.

    Returns different navigation items based on the admin's role and permissions.
    """
    items = []

    # Dashboard - available to all
    items.append(NavItem(
        id="dashboard",
        label="Dashboard",
        path="/admin/dashboard",
        icon="dashboard",
        enabled=True,
    ))

    # Solutions Management - admin and super_admin only
    if admin.role in [AdminRole.SUPER_ADMIN, AdminRole.ADMIN]:
        items.append(NavItem(
            id="solutions",
            label="Solutions",
            path="/admin/solutions",
            icon="apps",
            enabled=True,  # Enabled in Phase 2
        ))

    # Analytics - admin and super_admin
    if admin.role in [AdminRole.SUPER_ADMIN, AdminRole.ADMIN]:
        items.append(NavItem(
            id="analytics",
            label="Analytics",
            path="/admin/analytics",
            icon="analytics",
            enabled=True,
        ))

    # System Logs - admin and super_admin
    if admin.role in [AdminRole.SUPER_ADMIN, AdminRole.ADMIN]:
        items.append(NavItem(
            id="logs",
            label="System Logs",
            path="/admin/logs",
            icon="logs",
            enabled=True,
        ))

    # Telemetry - admin and super_admin
    if admin.role in [AdminRole.SUPER_ADMIN, AdminRole.ADMIN]:
        items.append(NavItem(
            id="telemetry",
            label="Telemetry",
            path="/admin/telemetry",
            icon="telemetry",
            enabled=True,
        ))

    # Admin Users - super_admin only
    if admin.role == AdminRole.SUPER_ADMIN:
        items.append(NavItem(
            id="admins",
            label="Admin Users",
            path="/admin/users",
            icon="people",
            enabled=True,
        ))

    # Configuration - super_admin only
    if admin.role == AdminRole.SUPER_ADMIN:
        items.append(NavItem(
            id="configuration",
            label="Configuration",
            path="/admin/configuration",
            icon="config",
            enabled=True,
        ))

    # Housekeeping - super_admin only
    if admin.role == AdminRole.SUPER_ADMIN:
        items.append(NavItem(
            id="housekeeping",
            label="Housekeeping",
            path="/admin/housekeeping",
            icon="housekeeping",
            enabled=True,
        ))

    # Settings - super_admin only
    if admin.role == AdminRole.SUPER_ADMIN:
        items.append(NavItem(
            id="settings",
            label="Settings",
            path="/admin/settings",
            icon="settings",
            enabled=True,
        ))

    return NavResponse(items=items)


# Analytics Models
class CategoryStats(BaseModel):
    """Statistics for a category."""
    category: str
    count: int


class StatusStats(BaseModel):
    """Statistics for a status."""
    status: str
    count: int


class PartnerStats(BaseModel):
    """Statistics for a partner."""
    partner: str
    count: int


class AuthEventStats(BaseModel):
    """Statistics for auth events."""
    event_type: str
    count: int


class AnalyticsResponse(BaseModel):
    """Analytics data response."""
    solutions_by_category: List[CategoryStats]
    solutions_by_status: List[StatusStats]
    solutions_by_partner: List[PartnerStats]
    auth_events_24h: List[AuthEventStats]
    total_logins_24h: int
    failed_logins_24h: int
    generated_at: datetime


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    admin: AdminInDB = Depends(require_any_admin),
    repo: SolutionsRepository = Depends(get_repo),
) -> AnalyticsResponse:
    """
    Get detailed analytics data.

    Returns statistics about solutions and authentication events.
    """
    # Get all overrides from MongoDB
    overrides = await SolutionOverridesRepository.get_all_as_dict()

    # Get solutions data
    solutions_list = await repo.get_all()

    # Convert to dicts and apply overrides
    all_solutions = []
    for sol in solutions_list:
        sol_dict = {
            "id": sol.solution_id,
            "category": sol.category,
            "status": sol.status,
            "partner": {"name": sol.partner.name} if sol.partner else {"name": "Unknown"},
        }
        # Apply status override if exists
        if sol.solution_id in overrides:
            override = overrides[sol.solution_id]
            sol_dict['status'] = override.status if override.status else sol_dict.get('status', 'active')
        all_solutions.append(sol_dict)

    # Calculate solutions by category
    category_counts: Dict[str, int] = {}
    for sol in all_solutions:
        cat = sol.get("category", "Unknown")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    solutions_by_category = [
        CategoryStats(category=cat, count=count)
        for cat, count in sorted(category_counts.items(), key=lambda x: -x[1])
    ]

    # Calculate solutions by status
    status_counts: Dict[str, int] = {}
    for sol in all_solutions:
        status = sol.get("status", "active")
        status_counts[status] = status_counts.get(status, 0) + 1

    solutions_by_status = [
        StatusStats(status=status, count=count)
        for status, count in sorted(status_counts.items(), key=lambda x: -x[1])
    ]

    # Calculate solutions by partner
    partner_counts: Dict[str, int] = {}
    for sol in all_solutions:
        partner = sol.get("partner", {}).get("name", "Unknown")
        partner_counts[partner] = partner_counts.get(partner, 0) + 1

    solutions_by_partner = [
        PartnerStats(partner=partner, count=count)
        for partner, count in sorted(partner_counts.items(), key=lambda x: -x[1])
    ]

    # Get auth events from last 24 hours
    since = datetime.utcnow() - timedelta(hours=24)
    auth_events = await AuditRepository.get_events_since(since)

    # Count auth events by type
    event_type_counts: Dict[str, int] = {}
    total_logins = 0
    failed_logins = 0

    for event in auth_events:
        event_type = event.get("event_type", "unknown")
        event_type_counts[event_type] = event_type_counts.get(event_type, 0) + 1

        if event_type == "login_success":
            total_logins += 1
        elif event_type == "login_failed":
            failed_logins += 1

    auth_events_24h = [
        AuthEventStats(event_type=event_type, count=count)
        for event_type, count in sorted(event_type_counts.items(), key=lambda x: -x[1])
    ]

    return AnalyticsResponse(
        solutions_by_category=solutions_by_category,
        solutions_by_status=solutions_by_status,
        solutions_by_partner=solutions_by_partner,
        auth_events_24h=auth_events_24h,
        total_logins_24h=total_logins,
        failed_logins_24h=failed_logins,
        generated_at=datetime.utcnow(),
    )


# Logs Models
class LogEntry(BaseModel):
    """Single log entry."""
    event_id: str
    event_type: str
    username: str
    admin_id: Optional[str] = None
    ip_address: str
    user_agent: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None


class LogsResponse(BaseModel):
    """Paginated logs response."""
    logs: List[LogEntry]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/logs", response_model=LogsResponse)
async def get_logs(
    admin: AdminInDB = Depends(require_any_admin),
    event_type: Optional[str] = None,
    username: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> LogsResponse:
    """
    Get paginated authentication logs.

    Args:
        event_type: Filter by event type (login_success, login_failed, logout, etc.)
        username: Filter by username
        page: Page number (1-indexed)
        page_size: Number of items per page (max 100)
    """
    from models.audit import AuditEventFilter, AuthEventType

    # Validate page_size
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    # Build filter
    filter_params = AuditEventFilter(
        event_type=AuthEventType(event_type) if event_type else None,
        offset=offset,
        limit=page_size,
    )

    # Get logs and total count
    events = await AuditRepository.get_events(filter_params)
    total = await AuditRepository.count_events(filter_params)

    # Filter by username if provided (case-insensitive)
    if username:
        events = [e for e in events if username.lower() in e.username_attempted.lower()]
        # Re-count for username filter
        total = len(events)

    # Convert to response format
    logs = [
        LogEntry(
            event_id=e.event_id,
            event_type=e.event_type.value,
            username=e.username_attempted,
            admin_id=e.admin_id,
            ip_address=e.ip_address,
            user_agent=e.user_agent,
            timestamp=e.timestamp,
            details=e.details.model_dump() if e.details else None,
        )
        for e in events
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return LogsResponse(
        logs=logs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
