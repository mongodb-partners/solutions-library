"""
Admin users management routes.
Only accessible by super_admin users.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field

from auth.dependencies import require_super_admin
from auth.password import hash_password
from models.admin import (
    AdminInDB,
    AdminCreate,
    AdminUpdate,
    AdminRole,
    AdminStatus,
)
from repositories.admin_repository import AdminRepository

router = APIRouter(prefix="/admins", tags=["Admin Users"])


# Response models
class AdminListItem(BaseModel):
    """Admin user summary for list view."""
    admin_id: str
    username: str
    email: str
    role: str
    status: str
    display_name: Optional[str] = None
    created_at: str
    last_login: Optional[str] = None


class AdminListResponse(BaseModel):
    """Response for admin users list."""
    admins: List[AdminListItem]
    total: int


class AdminDetailResponse(BaseModel):
    """Response for admin user detail."""
    admin_id: str
    username: str
    email: str
    role: str
    status: str
    display_name: Optional[str] = None
    created_at: str
    updated_at: str
    created_by: Optional[str] = None
    last_login: Optional[str] = None
    failed_login_attempts: int


class CreateAdminRequest(BaseModel):
    """Request to create a new admin."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    role: str = Field(..., pattern="^(super_admin|admin|viewer)$")
    display_name: Optional[str] = Field(None, max_length=100)


class UpdateAdminRequest(BaseModel):
    """Request to update an admin."""
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, pattern="^(super_admin|admin|viewer)$")
    status: Optional[str] = Field(None, pattern="^(active|inactive|locked)$")
    display_name: Optional[str] = Field(None, max_length=100)


class ResetPasswordRequest(BaseModel):
    """Request to reset admin password."""
    new_password: str = Field(..., min_length=8, max_length=100)


def _format_admin_list_item(admin: AdminInDB) -> AdminListItem:
    """Format admin for list view."""
    return AdminListItem(
        admin_id=admin.admin_id,
        username=admin.username,
        email=admin.email,
        role=admin.role.value,
        status=admin.status.value,
        display_name=admin.profile.display_name if admin.profile else None,
        created_at=admin.created_at.isoformat(),
        last_login=admin.last_login.isoformat() if admin.last_login else None,
    )


def _format_admin_detail(admin: AdminInDB) -> AdminDetailResponse:
    """Format admin for detail view."""
    return AdminDetailResponse(
        admin_id=admin.admin_id,
        username=admin.username,
        email=admin.email,
        role=admin.role.value,
        status=admin.status.value,
        display_name=admin.profile.display_name if admin.profile else None,
        created_at=admin.created_at.isoformat(),
        updated_at=admin.updated_at.isoformat(),
        created_by=admin.created_by,
        last_login=admin.last_login.isoformat() if admin.last_login else None,
        failed_login_attempts=admin.failed_login_attempts,
    )


@router.get("", response_model=AdminListResponse)
async def list_admins(
    role: Optional[str] = Query(None, description="Filter by role"),
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_admin: AdminInDB = Depends(require_super_admin),
) -> AdminListResponse:
    """
    List all admin users.

    Only accessible by super_admin.
    """
    role_filter = AdminRole(role) if role else None
    status_filter = AdminStatus(status) if status else None

    admins = await AdminRepository.list_all(
        skip=skip,
        limit=limit,
        role=role_filter,
        status=status_filter,
    )
    total = await AdminRepository.count(role=role_filter, status=status_filter)

    return AdminListResponse(
        admins=[_format_admin_list_item(admin) for admin in admins],
        total=total,
    )


@router.post("", response_model=AdminDetailResponse, status_code=201)
async def create_admin(
    request: CreateAdminRequest,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> AdminDetailResponse:
    """
    Create a new admin user.

    Only accessible by super_admin.
    """
    # Check if username already exists
    existing = await AdminRepository.get_by_username(request.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Check if email already exists
    existing = await AdminRepository.get_by_email(request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Validate and create admin data
    from pydantic import ValidationError
    try:
        admin_data = AdminCreate(
            username=request.username,
            email=request.email,
            password=request.password,
            role=AdminRole(request.role),
            display_name=request.display_name or request.username,
        )
    except ValidationError as e:
        # Extract clean error message from Pydantic validation
        errors = e.errors()
        if errors:
            field = errors[0].get('loc', ['unknown'])[-1]
            msg = errors[0].get('msg', 'Invalid value')
            if 'Password must' in msg or 'password' in str(field).lower():
                raise HTTPException(
                    status_code=400,
                    detail="Password must be at least 8 characters with uppercase, lowercase, and a digit"
                )
            raise HTTPException(status_code=400, detail=f"{field}: {msg}")
        raise HTTPException(status_code=400, detail="Invalid data")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Hash password
    password_hash = hash_password(request.password)

    admin = await AdminRepository.create(
        admin_data=admin_data,
        password_hash=password_hash,
        created_by=current_admin.admin_id,
    )

    return _format_admin_detail(admin)


@router.get("/{admin_id}", response_model=AdminDetailResponse)
async def get_admin(
    admin_id: str,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> AdminDetailResponse:
    """
    Get admin user details.

    Only accessible by super_admin.
    """
    admin = await AdminRepository.get_by_id(admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    return _format_admin_detail(admin)


@router.put("/{admin_id}", response_model=AdminDetailResponse)
async def update_admin(
    admin_id: str,
    request: UpdateAdminRequest,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> AdminDetailResponse:
    """
    Update an admin user.

    Only accessible by super_admin.
    Cannot demote yourself from super_admin.
    """
    # Verify admin exists
    admin = await AdminRepository.get_by_id(admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    # Prevent self-demotion
    if admin_id == current_admin.admin_id and request.role and request.role != "super_admin":
        raise HTTPException(
            status_code=400,
            detail="Cannot demote yourself from super_admin"
        )

    # Prevent deactivating yourself
    if admin_id == current_admin.admin_id and request.status == "inactive":
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate your own account"
        )

    # Build update
    update_data = AdminUpdate(
        email=request.email,
        role=AdminRole(request.role) if request.role else None,
        status=AdminStatus(request.status) if request.status else None,
        display_name=request.display_name,
    )

    updated = await AdminRepository.update(admin_id, update_data)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update admin")

    return _format_admin_detail(updated)


@router.post("/{admin_id}/reset-password", response_model=dict)
async def reset_admin_password(
    admin_id: str,
    request: ResetPasswordRequest,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> dict:
    """
    Reset an admin's password.

    Only accessible by super_admin.
    """
    # Verify admin exists
    admin = await AdminRepository.get_by_id(admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    # Hash and update password
    password_hash = hash_password(request.new_password)
    success = await AdminRepository.update_password(admin_id, password_hash)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to reset password")

    return {"message": "Password reset successfully"}


@router.post("/{admin_id}/unlock", response_model=dict)
async def unlock_admin(
    admin_id: str,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> dict:
    """
    Unlock a locked admin account.

    Only accessible by super_admin.
    """
    admin = await AdminRepository.get_by_id(admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    if admin.status != AdminStatus.LOCKED:
        raise HTTPException(status_code=400, detail="Admin is not locked")

    await AdminRepository.unlock_account(admin_id)

    return {"message": "Admin account unlocked"}


@router.delete("/{admin_id}", response_model=dict)
async def delete_admin(
    admin_id: str,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> dict:
    """
    Delete an admin user.

    Only accessible by super_admin.
    Cannot delete yourself.
    """
    # Cannot delete yourself
    if admin_id == current_admin.admin_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Verify admin exists
    admin = await AdminRepository.get_by_id(admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    success = await AdminRepository.delete(admin_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete admin")

    return {"message": "Admin deleted successfully"}
