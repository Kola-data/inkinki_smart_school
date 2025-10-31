from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class StudentBase(BaseModel):
    """Base schema for Student with common fields"""
    school_id: UUID
    par_id: UUID
    std_name: str
    std_code: Optional[str] = None
    std_dob: Optional[str] = None
    std_gender: Optional[str] = None
    previous_school: Optional[str] = None
    started_class: Optional[UUID] = None
    current_class: Optional[UUID] = None
    status: Optional[str] = None

class StudentCreate(StudentBase):
    """Schema for creating a new student"""
    pass

class StudentUpdate(BaseModel):
    """Schema for updating a student"""
    school_id: Optional[UUID] = None
    par_id: Optional[UUID] = None
    std_name: Optional[str] = None
    std_code: Optional[str] = None
    std_dob: Optional[str] = None
    std_gender: Optional[str] = None
    previous_school: Optional[str] = None
    started_class: Optional[UUID] = None
    current_class: Optional[UUID] = None
    status: Optional[str] = None

class StudentResponse(StudentBase):
    """Schema for student response"""
    std_id: UUID
    std_code: Optional[str] = None
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class StudentResponseWithDetails(StudentResponse):
    """Schema for student response with parent and class details"""
    parent: Optional[dict] = None
    started_class_name: Optional[str] = None
    current_class_name: Optional[str] = None
    
    class Config:
        from_attributes = True

