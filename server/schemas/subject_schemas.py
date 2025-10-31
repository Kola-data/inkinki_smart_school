from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class SubjectBase(BaseModel):
    """Base schema for Subject with common fields"""
    school_id: UUID
    subj_name: str
    subj_desc: Optional[str] = None

class SubjectCreate(SubjectBase):
    """Schema for creating a new subject"""
    pass

class SubjectUpdate(BaseModel):
    """Schema for updating a subject"""
    subj_name: Optional[str] = None
    subj_desc: Optional[str] = None

class SubjectResponse(SubjectBase):
    """Schema for subject response"""
    subj_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class SubjectSoftDelete(BaseModel):
    """Schema for soft delete operation"""
    is_deleted: bool = True
