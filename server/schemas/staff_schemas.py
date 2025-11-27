from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Union
from datetime import datetime, date
from uuid import UUID

class StaffBase(BaseModel):
    """Base schema for Staff with common fields"""
    staff_profile: Optional[str] = None
    staff_dob: Optional[date] = None
    staff_gender: Optional[str] = None
    staff_nid_photo: Optional[str] = None
    staff_title: Optional[str] = None
    staff_role: Optional[str] = None
    employment_type: Optional[str] = None
    qualifications: Optional[str] = None
    experience: Optional[str] = None
    phone: Optional[str] = None

class StaffCreate(StaffBase):
    """Schema for creating a new staff member - only staff_name, email, password, and school_id are required"""
    school_id: UUID
    staff_name: str
    email: EmailStr
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
    email: Optional[Union[EmailStr, str]] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    
    @validator('email', pre=True)
    def validate_email(cls, v):
        """Convert empty strings to None for email fields"""
        if v == '' or v is None:
            return None
        if isinstance(v, str) and v.strip() == '':
            return None
        return v

class StaffResponse(StaffBase):
    """Schema for staff response"""
    staff_id: UUID
    school_id: Optional[UUID] = None
    staff_name: str
    email: EmailStr
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
