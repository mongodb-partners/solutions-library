"""
Solution models for admin dashboard.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class PartnerInfo(BaseModel):
    """Partner information."""
    name: str
    logo: str
    website: Optional[str] = ""


class PortMapping(BaseModel):
    """Port configuration for a solution."""
    api: Optional[int] = None
    ui: Optional[int] = None


class Solution(BaseModel):
    """Solution model matching solution.json structure."""
    id: str
    name: str
    partner: PartnerInfo
    description: str
    long_description: Optional[str] = Field(None, alias="longDescription")
    value_proposition: List[str] = Field(default_factory=list, alias="valueProposition")
    technologies: List[str] = Field(default_factory=list)
    category: str
    demo_url: str = Field(default="", alias="demoUrl")
    source_url: str = Field(default="", alias="sourceUrl")
    documentation: Optional[str] = None
    ports: Optional[PortMapping] = None
    status: str = "active"
    featured: bool = False
    reference: Optional[str] = None

    class Config:
        populate_by_name = True


class SolutionCreate(BaseModel):
    """Model for creating a new solution."""
    id: str = Field(..., min_length=1, max_length=100, pattern="^[a-z0-9-]+$")
    name: str = Field(..., min_length=1, max_length=200)
    partner_name: str = Field(..., min_length=1, max_length=100)
    partner_logo: str = Field(default="/logos/placeholder.svg")
    partner_website: Optional[str] = ""
    description: str = Field(..., min_length=1, max_length=500)
    long_description: Optional[str] = Field(default=None, max_length=2000)
    value_proposition: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)
    category: str = Field(..., min_length=1, max_length=100)
    demo_url: Optional[str] = ""
    source_url: Optional[str] = ""
    documentation: Optional[str] = None
    port_api: Optional[int] = None
    port_ui: Optional[int] = None
    status: str = Field(default="coming-soon", pattern="^(active|inactive|coming-soon)$")
    featured: bool = False


class SolutionUpdate(BaseModel):
    """Model for updating a solution."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    partner_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    partner_logo: Optional[str] = None
    partner_website: Optional[str] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=500)
    long_description: Optional[str] = Field(default=None, max_length=2000)
    value_proposition: Optional[List[str]] = None
    technologies: Optional[List[str]] = None
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    demo_url: Optional[str] = None
    source_url: Optional[str] = None
    documentation: Optional[str] = None
    port_api: Optional[int] = None
    port_ui: Optional[int] = None
    status: Optional[str] = Field(default=None, pattern="^(active|inactive|coming-soon)$")
    featured: Optional[bool] = None


class SolutionInDB(BaseModel):
    """Solution as stored in MongoDB."""
    solution_id: str
    name: str
    partner: PartnerInfo
    description: str
    long_description: Optional[str] = None
    value_proposition: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)
    category: str
    demo_url: str = ""
    source_url: str = ""
    documentation: Optional[str] = None
    ports: Optional[PortMapping] = None
    status: str = "active"
    featured: bool = False
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    is_from_file: bool = False  # True if migrated from solution.json


class SolutionListItem(BaseModel):
    """Solution summary for list views."""
    id: str
    name: str
    partner_name: str
    partner_logo: str
    description: str
    category: str
    status: str
    featured: bool
    demo_url: str
    source_url: str
    technologies: List[str]


class SolutionDetail(Solution):
    """Solution with additional runtime info."""
    container_status: Optional[str] = None  # running, stopped, not_configured
    last_checked: Optional[datetime] = None


class SolutionStatusUpdate(BaseModel):
    """Request model for updating solution status."""
    status: str = Field(..., pattern="^(active|inactive|maintenance)$")


class SolutionsListResponse(BaseModel):
    """Response model for solutions list."""
    solutions: List[SolutionListItem]
    total: int
    categories: List[str]


class CategoryCount(BaseModel):
    """Category with solution count."""
    name: str
    count: int
