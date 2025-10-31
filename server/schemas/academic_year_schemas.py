from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class AcademicYearBase(BaseModel):
    """Base schema for Academic Year with common fields"""
    school_id: UUID
    academic_name: str
    start_date: date
    end_date: date
    is_current: bool = False

class AcademicYearCreate(AcademicYearBase):
    """Schema for creating a new academic year"""
    pass

class AcademicYearUpdate(BaseModel):
    """Schema for updating an academic year"""
    academic_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None

class AcademicYearResponse(AcademicYearBase):
    """Schema for academic year response"""
    academic_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class AcademicYearStatusUpdate(BaseModel):
    """Schema for updating academic year status (set as current)"""
    is_current: bool

class AcademicYearSoftDelete(BaseModel):
    """Schema for soft delete operation"""
    is_deleted: bool = True
