from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Union
from datetime import datetime
from uuid import UUID

class ParentBase(BaseModel):
    """Base schema for Parent with common fields"""
    school_id: UUID
    mother_name: Optional[str] = None
    father_name: Optional[str] = None
    mother_phone: Optional[str] = None
    father_phone: Optional[str] = None
    mother_email: Optional[Union[EmailStr, str]] = None
    father_email: Optional[Union[EmailStr, str]] = None
    par_address: Optional[str] = None
    par_type: Optional[str] = None
    
    @validator('mother_email', 'father_email', pre=True)
    def validate_email(cls, v):
        """Convert empty strings to None for email fields"""
        if v == '' or v is None:
            return None
        if isinstance(v, str) and v.strip() == '':
            return None
        return v

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
    mother_email: Optional[Union[EmailStr, str]] = None
    father_email: Optional[Union[EmailStr, str]] = None
    par_address: Optional[str] = None
    par_type: Optional[str] = None
    
    @validator('mother_email', 'father_email', pre=True)
    def validate_email(cls, v):
        """Convert empty strings to None for email fields"""
        if v == '' or v is None:
            return None
        if isinstance(v, str) and v.strip() == '':
            return None
        return v

class ParentResponse(ParentBase):
    """Schema for parent response"""
    par_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

