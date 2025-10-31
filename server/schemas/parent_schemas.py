from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID

class ParentBase(BaseModel):
    """Base schema for Parent with common fields"""
    school_id: UUID
    mother_name: Optional[str] = None
    father_name: Optional[str] = None
    mother_phone: Optional[str] = None
    father_phone: Optional[str] = None
    mother_email: Optional[EmailStr] = None
    father_email: Optional[EmailStr] = None
    par_address: Optional[str] = None
    par_type: Optional[str] = None

class ParentCreate(ParentBase):
    """Schema for creating a new parent"""
    pass

class ParentUpdate(BaseModel):
    """Schema for updating a parent"""
    school_id: Optional[UUID] = None
    mother_name: Optional[str] = None
    father_name: Optional[str] = None
    mother_phone: Optional[str] = None
    father_phone: Optional[str] = None
    mother_email: Optional[EmailStr] = None
    father_email: Optional[EmailStr] = None
    par_address: Optional[str] = None
    par_type: Optional[str] = None

class ParentResponse(ParentBase):
    """Schema for parent response"""
    par_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

