from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class ClassTeacherBase(BaseModel):
    """Base schema for ClassTeacher with common fields"""
    teacher_id: UUID
    subj_id: UUID
    cls_id: UUID
    start_date: date
    end_date: date

class ClassTeacherCreate(ClassTeacherBase):
    """Schema for creating a new class teacher assignment"""
    pass

class ClassTeacherUpdate(BaseModel):
    """Schema for updating a class teacher assignment"""
    teacher_id: Optional[UUID] = None
    subj_id: Optional[UUID] = None
    cls_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ClassTeacherResponse(ClassTeacherBase):
    """Schema for class teacher response"""
    id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ClassTeacherWithDetailsResponse(ClassTeacherResponse):
    """Schema for class teacher response with detailed information"""
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None
    teacher_specialized: Optional[str] = None
    subject_name: Optional[str] = None
    class_name: Optional[str] = None
    class_type: Optional[str] = None

class ClassTeacherSoftDelete(BaseModel):
    """Schema for soft delete operation"""
    is_deleted: bool = True
