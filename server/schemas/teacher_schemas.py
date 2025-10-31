from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class TeacherBase(BaseModel):
    """Base schema for Teacher with common fields"""
    staff_id: UUID
    specialized: Optional[str] = None
    is_active: bool = True

class TeacherCreate(TeacherBase):
    """Schema for creating a new teacher"""
    pass

class TeacherUpdate(BaseModel):
    """Schema for updating a teacher"""
    specialized: Optional[str] = None
    is_active: Optional[bool] = None

class TeacherResponse(BaseModel):
    """Schema for teacher response"""
    teacher_id: UUID
    specialized: Optional[str] = None
    is_active: bool
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TeacherWithStaffResponse(BaseModel):
    """Schema for teacher response with staff information"""
    teacher_id: UUID
    specialized: Optional[str] = None
    is_active: bool
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    staff_name: Optional[str] = None
    staff_email: Optional[str] = None
    staff_role: Optional[str] = None
    
    class Config:
        from_attributes = True

class TeacherStatusUpdate(BaseModel):
    """Schema for updating teacher status (activate/deactivate)"""
    is_active: bool

class TeacherSoftDelete(BaseModel):
    """Schema for soft delete operation"""
    is_deleted: bool = True
