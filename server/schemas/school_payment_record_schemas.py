from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class SchoolPaymentRecordBase(BaseModel):
    school_id: UUID
    payment_id: UUID
    status: str = "pending"
    date: date

class SchoolPaymentRecordCreate(SchoolPaymentRecordBase):
    pass

class SchoolPaymentRecordUpdate(BaseModel):
    school_id: Optional[UUID] = None
    payment_id: Optional[UUID] = None
    status: Optional[str] = None
    date: Optional[date] = None

class SchoolPaymentRecordResponse(SchoolPaymentRecordBase):
    record_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SchoolPaymentRecordStatusUpdate(BaseModel):
    status: str


