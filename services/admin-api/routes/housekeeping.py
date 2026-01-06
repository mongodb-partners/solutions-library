"""
Housekeeping routes for maintenance task management.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import require_super_admin
from models.admin import AdminInDB
from models.housekeeping import (
    TaskUpdate,
    TaskResponse,
    TaskListResponse,
    TaskRunResult,
    DatabaseStatsResponse,
)
from repositories.housekeeping_repository import HousekeepingRepository
from services.housekeeping_service import HousekeepingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/housekeeping", tags=["Housekeeping"])


@router.get("/tasks", response_model=TaskListResponse)
async def list_tasks(
    current_admin: AdminInDB = Depends(require_super_admin),
) -> TaskListResponse:
    """
    List all housekeeping tasks.

    Super admin only.
    """
    # Ensure default tasks exist
    await HousekeepingRepository.initialize_tasks()

    tasks = await HousekeepingRepository.get_all()

    return TaskListResponse(
        tasks=[
            TaskResponse(
                task_id=t.task_id,
                name=t.name,
                description=t.description,
                task_type=t.task_type.value,
                schedule=t.schedule.value,
                config=t.config,
                is_enabled=t.is_enabled,
                last_run=t.last_run,
                last_status=t.last_status.value,
                last_duration_ms=t.last_duration_ms,
                last_result=t.last_result,
                next_run=t.next_run,
            )
            for t in tasks
        ]
    )


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> TaskResponse:
    """
    Get a housekeeping task by ID.

    Super admin only.
    """
    task = await HousekeepingRepository.get_by_id(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return TaskResponse(
        task_id=task.task_id,
        name=task.name,
        description=task.description,
        task_type=task.task_type.value,
        schedule=task.schedule.value,
        config=task.config,
        is_enabled=task.is_enabled,
        last_run=task.last_run,
        last_status=task.last_status.value,
        last_duration_ms=task.last_duration_ms,
        last_result=task.last_result,
        next_run=task.next_run,
    )


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> TaskResponse:
    """
    Update a housekeeping task configuration.

    Super admin only.
    """
    existing = await HousekeepingRepository.get_by_id(task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")

    updated = await HousekeepingRepository.update(task_id, data)

    if not updated:
        raise HTTPException(status_code=400, detail="Failed to update task")

    return TaskResponse(
        task_id=updated.task_id,
        name=updated.name,
        description=updated.description,
        task_type=updated.task_type.value,
        schedule=updated.schedule.value,
        config=updated.config,
        is_enabled=updated.is_enabled,
        last_run=updated.last_run,
        last_status=updated.last_status.value,
        last_duration_ms=updated.last_duration_ms,
        last_result=updated.last_result,
        next_run=updated.next_run,
    )


@router.post("/tasks/{task_id}/run")
async def run_task(
    task_id: str,
    current_admin: AdminInDB = Depends(require_super_admin),
) -> TaskRunResult:
    """
    Manually trigger a housekeeping task.

    Super admin only.
    """
    task = await HousekeepingRepository.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    logger.info(f"Manual task run triggered: {task_id} by {current_admin.admin_id}")

    result = await HousekeepingService.run_task(task_id)

    return result


@router.get("/db-stats", response_model=DatabaseStatsResponse)
async def get_database_stats(
    current_admin: AdminInDB = Depends(require_super_admin),
) -> DatabaseStatsResponse:
    """
    Get database statistics.

    Returns storage and document counts for all collections.
    Super admin only.
    """
    stats = await HousekeepingRepository.get_database_stats()

    return DatabaseStatsResponse(**stats)
