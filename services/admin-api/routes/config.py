"""
Configuration management routes.
Only accessible by super_admin users.
"""

import logging
import httpx
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request

from auth.dependencies import require_super_admin
from models.admin import AdminInDB
from models.config import (
    ConfigCreate,
    ConfigUpdate,
    ConfigCategory,
    ConfigResponse,
    ConfigListResponse,
    ConfigAuditResponse,
    ConfigImportRequest,
    ConfigImportResponse,
    ConfigTestRequest,
    ConfigTestResponse,
)
from repositories.config_repository import ConfigRepository, ConfigAuditRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/config", tags=["Configuration"])


def _get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _get_user_agent(request: Request) -> str:
    """Extract user agent from request."""
    return request.headers.get("User-Agent", "unknown")


@router.get("", response_model=ConfigListResponse)
async def list_configs(
    category: Optional[ConfigCategory] = None,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> ConfigListResponse:
    """
    List all configurations.

    Optionally filter by category. Sensitive values are masked.
    Only accessible by super_admin.
    """
    configs = await ConfigRepository.get_all(category=category)
    return ConfigListResponse(
        configs=[ConfigResponse.from_db(c, mask_sensitive=True) for c in configs],
        total=len(configs),
    )


@router.post("", response_model=ConfigResponse, status_code=201)
async def create_config(
    config_data: ConfigCreate,
    request: Request,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> ConfigResponse:
    """
    Create a new configuration entry.

    Only accessible by super_admin.
    """
    # Check if key already exists
    existing = await ConfigRepository.get_by_key(config_data.key)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Configuration with key '{config_data.key}' already exists"
        )

    config = await ConfigRepository.create(config_data, current_admin.admin_id)

    # Update audit with request info
    audits = await ConfigAuditRepository.get_history(config.config_id, limit=1)
    if audits:
        from database.connection import get_config_audit_collection
        collection = get_config_audit_collection()
        await collection.update_one(
            {"audit_id": audits[0].audit_id},
            {"$set": {
                "ip_address": _get_client_ip(request),
                "user_agent": _get_user_agent(request),
            }}
        )

    return ConfigResponse.from_db(config, mask_sensitive=False)


@router.get("/export")
async def export_configs(
    include_sensitive: bool = False,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> dict:
    """
    Export all configurations as JSON.

    If include_sensitive is False, sensitive values are set to null.
    Only accessible by super_admin.
    """
    return await ConfigRepository.export_all(include_sensitive=include_sensitive)


@router.post("/import", response_model=ConfigImportResponse)
async def import_configs(
    import_data: ConfigImportRequest,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> ConfigImportResponse:
    """
    Import configurations from JSON.

    If overwrite is True, existing configs with the same key will be updated.
    Only accessible by super_admin.
    """
    results = await ConfigRepository.import_configs(
        configs=import_data.configs,
        admin_id=current_admin.admin_id,
        overwrite=import_data.overwrite,
    )
    return ConfigImportResponse(
        created=results["created"],
        updated=results["updated"],
        skipped=results["skipped"],
        errors=results.get("errors", []),
    )


@router.get("/{config_id}", response_model=ConfigResponse)
async def get_config(
    config_id: str,
    unmask: bool = False,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> ConfigResponse:
    """
    Get a configuration by ID.

    If unmask is True, sensitive values are shown in plain text.
    Only accessible by super_admin.
    """
    config = await ConfigRepository.get_by_id(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    return ConfigResponse.from_db(config, mask_sensitive=not unmask)


@router.put("/{config_id}", response_model=ConfigResponse)
async def update_config(
    config_id: str,
    update_data: ConfigUpdate,
    request: Request,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> ConfigResponse:
    """
    Update a configuration.

    Only accessible by super_admin.
    """
    config = await ConfigRepository.update(config_id, update_data, current_admin.admin_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    # Update audit with request info
    audits = await ConfigAuditRepository.get_history(config.config_id, limit=1)
    if audits:
        from database.connection import get_config_audit_collection
        collection = get_config_audit_collection()
        await collection.update_one(
            {"audit_id": audits[0].audit_id},
            {"$set": {
                "ip_address": _get_client_ip(request),
                "user_agent": _get_user_agent(request),
            }}
        )

    return ConfigResponse.from_db(config, mask_sensitive=False)


@router.delete("/{config_id}")
async def delete_config(
    config_id: str,
    request: Request,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> dict:
    """
    Delete a configuration.

    Only accessible by super_admin.
    """
    # Get config first for audit
    config = await ConfigRepository.get_by_id(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    deleted = await ConfigRepository.delete(config_id, current_admin.admin_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Configuration not found")

    # Update audit with request info
    audits = await ConfigAuditRepository.get_history(config_id, limit=1)
    if audits:
        from database.connection import get_config_audit_collection
        collection = get_config_audit_collection()
        await collection.update_one(
            {"audit_id": audits[0].audit_id},
            {"$set": {
                "ip_address": _get_client_ip(request),
                "user_agent": _get_user_agent(request),
            }}
        )

    return {"message": f"Configuration '{config.key}' deleted successfully"}


@router.post("/{config_id}/test", response_model=ConfigTestResponse)
async def test_config_connection(
    config_id: str,
    test_data: Optional[ConfigTestRequest] = None,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> ConfigTestResponse:
    """
    Test an API key connection.

    Uses the test_endpoint from metadata or the provided override.
    Only accessible by super_admin.
    """
    config = await ConfigRepository.get_by_id(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    if config.category != ConfigCategory.API_KEYS:
        raise HTTPException(
            status_code=400,
            detail="Connection test is only available for API key configurations"
        )

    # Get test endpoint
    test_endpoint = None
    if test_data and test_data.test_endpoint:
        test_endpoint = test_data.test_endpoint
    elif config.metadata and config.metadata.get("test_endpoint"):
        test_endpoint = config.metadata["test_endpoint"]

    if not test_endpoint:
        raise HTTPException(
            status_code=400,
            detail="No test endpoint configured. Set metadata.test_endpoint or provide test_endpoint in request."
        )

    # Perform test request
    start_time = datetime.utcnow()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try with common API key header patterns
            headers = {
                "Authorization": f"Bearer {config.value}",
                "X-API-Key": config.value,
            }
            response = await client.get(test_endpoint, headers=headers)

        duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

        if response.status_code in [200, 201, 204]:
            return ConfigTestResponse(
                success=True,
                message="Connection successful",
                response_time_ms=round(duration_ms, 2),
                status_code=response.status_code,
            )
        elif response.status_code == 401:
            return ConfigTestResponse(
                success=False,
                message="Authentication failed - API key may be invalid",
                response_time_ms=round(duration_ms, 2),
                status_code=response.status_code,
            )
        elif response.status_code == 403:
            return ConfigTestResponse(
                success=False,
                message="Access forbidden - API key may lack required permissions",
                response_time_ms=round(duration_ms, 2),
                status_code=response.status_code,
            )
        else:
            return ConfigTestResponse(
                success=False,
                message=f"Unexpected response: {response.status_code}",
                response_time_ms=round(duration_ms, 2),
                status_code=response.status_code,
            )

    except httpx.TimeoutException:
        return ConfigTestResponse(
            success=False,
            message="Connection timed out",
            response_time_ms=10000,
            status_code=None,
        )
    except httpx.ConnectError as e:
        return ConfigTestResponse(
            success=False,
            message=f"Connection error: {str(e)}",
            response_time_ms=None,
            status_code=None,
        )
    except Exception as e:
        logger.error(f"Error testing config connection: {e}")
        return ConfigTestResponse(
            success=False,
            message=f"Error: {str(e)}",
            response_time_ms=None,
            status_code=None,
        )


@router.get("/{config_id}/history")
async def get_config_history(
    config_id: str,
    limit: int = 50,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> list:
    """
    Get audit history for a configuration.

    Only accessible by super_admin.
    """
    # Verify config exists
    config = await ConfigRepository.get_by_id(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    audits = await ConfigAuditRepository.get_history(config_id, limit=limit)
    return [
        ConfigAuditResponse(
            audit_id=a.audit_id,
            config_id=a.config_id,
            config_key=a.config_key,
            action=a.action,
            admin_id=a.admin_id,
            timestamp=a.timestamp,
        )
        for a in audits
    ]
