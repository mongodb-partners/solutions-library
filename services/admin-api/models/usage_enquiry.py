"""
Usage enquiry models for tracking demo usage requests.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UsageEnquiryCreate(BaseModel):
    """Model for creating a usage enquiry."""
    name: str
    email: EmailStr
    company: str
    role: str
    solution_id: str
    solution_name: str


class UsageEnquiryInDB(BaseModel):
    """Model for usage enquiry stored in database."""
    enquiry_id: str
    name: str
    email: str
    company: str
    role: str
    solution_id: str
    solution_name: str
    created_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class UsageEnquiryResponse(BaseModel):
    """Response model for a usage enquiry."""
    enquiry_id: str
    message: str
