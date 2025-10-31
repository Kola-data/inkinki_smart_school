from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class SchoolBase(BaseModel):
    """Base schema for School with common fields"""
    school_name: str
    school_address: Optional[str] = None
    school_ownership: Optional[str] = None
    school_phone: Optional[str] = None
    school_email: Optional[str] = None
    school_logo: Optional[str] = None

class SchoolCreate(SchoolBase):
    """Schema for creating a new school"""
    is_active: bool = False
    pass

class SchoolUpdate(BaseModel):
    """Schema for updating a school"""
    school_name: Optional[str] = None
    school_address: Optional[str] = None
    school_ownership: Optional[str] = None
    school_phone: Optional[str] = None
    school_email: Optional[str] = None
    school_logo: Optional[str] = None

class SchoolResponse(SchoolBase):
    """Schema for school response"""
    school_id: UUID
    is_active: bool
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class SchoolStatusUpdate(BaseModel):
    """Schema for updating school status (activate/deactivate)"""
    is_active: bool

class SchoolSoftDelete(BaseModel):
    """Schema for soft delete operation"""
    is_deleted: bool = True
