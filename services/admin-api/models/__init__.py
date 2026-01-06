"""Pydantic models for admin dashboard."""

from models.admin import (
    AdminRole,
    AdminStatus,
    AdminProfile,
    AdminPermissions,
    AdminBase,
    AdminCreate,
    AdminUpdate,
    AdminInDB,
    AdminResponse,
    AdminProfileResponse,
)
from models.session import (
    SessionCreate,
    SessionInDB,
    SessionUpdate,
    SessionResponse,
)
from models.audit import (
    AuthEventType,
    AuditEventDetails,
    AuditEventCreate,
    AuditEventInDB,
    AuditEventResponse,
    AuditEventFilter,
)
from models.solution import (
    PartnerInfo,
    PortMapping,
    Solution,
    SolutionListItem,
    SolutionDetail,
    SolutionStatusUpdate,
    SolutionsListResponse,
    CategoryCount,
)
from models.solution_override import (
    SolutionOverrideBase,
    SolutionOverrideCreate,
    SolutionOverrideUpdate,
    SolutionOverrideInDB,
    SolutionOverrideResponse,
)

__all__ = [
    # Admin models
    "AdminRole",
    "AdminStatus",
    "AdminProfile",
    "AdminPermissions",
    "AdminBase",
    "AdminCreate",
    "AdminUpdate",
    "AdminInDB",
    "AdminResponse",
    "AdminProfileResponse",
    # Session models
    "SessionCreate",
    "SessionInDB",
    "SessionUpdate",
    "SessionResponse",
    # Audit models
    "AuthEventType",
    "AuditEventDetails",
    "AuditEventCreate",
    "AuditEventInDB",
    "AuditEventResponse",
    "AuditEventFilter",
    # Solution models
    "PartnerInfo",
    "PortMapping",
    "Solution",
    "SolutionListItem",
    "SolutionDetail",
    "SolutionStatusUpdate",
    "SolutionsListResponse",
    "CategoryCount",
    # Solution override models
    "SolutionOverrideBase",
    "SolutionOverrideCreate",
    "SolutionOverrideUpdate",
    "SolutionOverrideInDB",
    "SolutionOverrideResponse",
]
