from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class ExamMarkBase(BaseModel):
    school_id: UUID
    std_id: UUID
    subj_id: UUID
    cls_id: UUID
    academic_id: UUID
    term: str
    exam_avg_mark: Optional[float] = None
    exam_mark: Optional[float] = None
    status: Optional[str] = None
    is_published: bool = False

class ExamMarkCreate(ExamMarkBase):
    pass

class ExamMarkUpdate(BaseModel):
    school_id: Optional[UUID] = None
    std_id: Optional[UUID] = None
    subj_id: Optional[UUID] = None
    cls_id: Optional[UUID] = None
    academic_id: Optional[UUID] = None
    term: Optional[str] = None
    exam_avg_mark: Optional[float] = None
    exam_mark: Optional[float] = None
    status: Optional[str] = None
    is_published: Optional[bool] = None

class ExamMarkResponse(ExamMarkBase):
    exam_mark_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
