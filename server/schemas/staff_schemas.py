from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class StaffBase(BaseModel):
    """Base schema for Staff with common fields"""
    school_id: UUID
    staff_profile: Optional[str] = None
    staff_name: str
    staff_dob: Optional[date] = None
    staff_gender: Optional[str] = None
    staff_nid_photo: Optional[str] = None
    staff_title: Optional[str] = None
    staff_role: Optional[str] = None
    employment_type: Optional[str] = None
    qualifications: Optional[str] = None
    experience: Optional[str] = None
    email: EmailStr

class StaffCreate(StaffBase):
    """Schema for creating a new staff member"""
    password: str
    is_active: bool = True

class StaffUpdate(BaseModel):
    """Schema for updating a staff member"""
    school_id: Optional[UUID] = None
    staff_profile: Optional[str] = None
    staff_name: Optional[str] = None
    staff_dob: Optional[date] = None
    staff_gender: Optional[str] = None
    staff_nid_photo: Optional[str] = None
    staff_title: Optional[str] = None
    staff_role: Optional[str] = None
    employment_type: Optional[str] = None
    qualifications: Optional[str] = None
    experience: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class StaffResponse(StaffBase):
    """Schema for staff response"""
    staff_id: UUID
    is_active: bool
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class StaffStatusUpdate(BaseModel):
    """Schema for updating staff status (activate/deactivate)"""
    is_active: bool

class StaffSoftDelete(BaseModel):
    """Schema for soft delete operation"""
    is_deleted: bool = True
