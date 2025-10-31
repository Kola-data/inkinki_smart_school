from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class AttendanceBase(BaseModel):
    """Base schema for Attendance with common fields"""
    school_id: UUID
    teacher_id: UUID
    std_id: UUID
    subj_id: UUID
    cls_id: Optional[UUID] = None
    date: datetime
    status: str

class AttendanceCreate(AttendanceBase):
    """Schema for creating a new attendance record"""
    pass

class AttendanceUpdate(BaseModel):
    """Schema for updating an attendance record"""
    school_id: Optional[UUID] = None
    teacher_id: Optional[UUID] = None
    std_id: Optional[UUID] = None
    subj_id: Optional[UUID] = None
    cls_id: Optional[UUID] = None
    date: Optional[datetime] = None
    status: Optional[str] = None

class AttendanceResponse(AttendanceBase):
    """Schema for attendance response"""
    att_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class AttendanceResponseWithDetails(AttendanceResponse):
    """Schema for attendance response with related entity details"""
    school_name: Optional[str] = None
    teacher_name: Optional[str] = None
    student_name: Optional[str] = None
    subject_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class AttendanceBulkCreate(BaseModel):
    """Schema for bulk creating attendance records"""
    school_id: UUID
    teacher_id: UUID
    subj_id: UUID
    date: datetime
    attendance_records: list[dict]  # List of {"std_id": UUID, "status": str}

class AttendanceFilter(BaseModel):
    """Schema for filtering attendance records"""
    school_id: Optional[UUID] = None
    teacher_id: Optional[UUID] = None
    std_id: Optional[UUID] = None
    subj_id: Optional[UUID] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    status: Optional[str] = None


