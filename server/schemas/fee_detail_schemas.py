from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class FeeDetailBase(BaseModel):
    """Base schema for FeeDetail with common fields"""
    school_id: UUID
    fee_id: UUID
    amount: float = 0.0
    invoice_img: Optional[str] = None
    status: str = "pending"

class FeeDetailCreate(FeeDetailBase):
    """Schema for creating a new fee detail record"""
    pass

class FeeDetailUpdate(BaseModel):
    """Schema for updating a fee detail record"""
    school_id: Optional[UUID] = None
    fee_id: Optional[UUID] = None
    amount: Optional[float] = None
    invoice_img: Optional[str] = None
    status: Optional[str] = None

class FeeDetailResponse(FeeDetailBase):
    """Schema for fee detail response"""
    fee_detail_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

