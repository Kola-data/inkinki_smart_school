from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class TestMarkBase(BaseModel):
    """Base schema for TestMark with common fields"""
    school_id: UUID
    std_id: UUID
    subj_id: UUID
    cls_id: UUID
    academic_id: UUID
    term: str
    test_mark: float
    test_avg_mark: Optional[float] = None
    status: Optional[str] = None
    is_published: Optional[bool] = False

class TestMarkCreate(TestMarkBase):
    """Schema for creating a new test mark record"""
    pass

class TestMarkUpdate(BaseModel):
    """Schema for updating a test mark record"""
    school_id: Optional[UUID] = None
    std_id: Optional[UUID] = None
    subj_id: Optional[UUID] = None
    cls_id: Optional[UUID] = None
    academic_id: Optional[UUID] = None
    term: Optional[str] = None
    test_mark: Optional[float] = None
    test_avg_mark: Optional[float] = None
    status: Optional[str] = None
    is_published: Optional[bool] = None

class TestMarkResponse(TestMarkBase):
    """Schema for test mark response"""
    test_mark_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TestMarkResponseWithDetails(TestMarkResponse):
    """Schema for test mark response with related entity details"""
    school_name: Optional[str] = None
    student_name: Optional[str] = None
    subject_name: Optional[str] = None
    class_name: Optional[str] = None
    academic_year_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class TestMarkBulkCreate(BaseModel):
    """Schema for bulk creating test mark records"""
    school_id: UUID
    subj_id: UUID
    cls_id: UUID
    academic_id: UUID
    term: str
    test_marks: list[dict]  # List of {"std_id": UUID, "test_mark": float, "test_avg_mark": float, "status": str}

class TestMarkFilter(BaseModel):
    """Schema for filtering test mark records"""
    school_id: Optional[UUID] = None
    std_id: Optional[UUID] = None
    subj_id: Optional[UUID] = None
    cls_id: Optional[UUID] = None
    academic_id: Optional[UUID] = None
    term: Optional[str] = None
    status: Optional[str] = None
    is_published: Optional[bool] = None

class TestMarkSummary(BaseModel):
    """Schema for test mark summary statistics"""
    total_records: int
    average_mark: float
    highest_mark: float
    lowest_mark: float
    published_count: int
    unpublished_count: int
    pass_rate: float  # Percentage of students who passed (assuming passing mark is 50)

