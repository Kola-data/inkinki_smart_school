from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class ClassBase(BaseModel):
    """Base schema for Class with common fields"""
    cls_name: str
    cls_type: str
    cls_manager: UUID

class ClassCreate(ClassBase):
    """Schema for creating a new class"""
    pass

class ClassUpdate(BaseModel):
    """Schema for updating a class"""
    cls_name: Optional[str] = None
    cls_type: Optional[str] = None
    cls_manager: Optional[UUID] = None

class ClassResponse(ClassBase):
    """Schema for class response"""
    cls_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ClassWithManagerResponse(ClassResponse):
    """Schema for class response with manager information"""
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    manager_specialized: Optional[str] = None

class ClassSoftDelete(BaseModel):
    """Schema for soft delete operation"""
    is_deleted: bool = True
