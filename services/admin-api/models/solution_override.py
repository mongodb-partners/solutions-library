"""
Solution override models for persisting admin changes to MongoDB.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SolutionOverrideBase(BaseModel):
    """Base model for solution overrides."""
    solution_id: str
    status: Optional[str] = Field(None, pattern="^(active|inactive|coming-soon)$")
    featured: Optional[bool] = None
    notes: Optional[str] = None


class SolutionOverrideCreate(SolutionOverrideBase):
    """Model for creating a solution override."""
    pass


class SolutionOverrideUpdate(BaseModel):
    """Model for updating a solution override."""
    status: Optional[str] = Field(None, pattern="^(active|inactive|coming-soon)$")
    featured: Optional[bool] = None
    notes: Optional[str] = None


class SolutionOverrideInDB(SolutionOverrideBase):
    """Solution override as stored in MongoDB."""
    created_at: datetime
    updated_at: datetime
    created_by: str  # admin_id
    updated_by: str  # admin_id


class SolutionOverrideResponse(SolutionOverrideBase):
    """Response model for solution override."""
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: str
