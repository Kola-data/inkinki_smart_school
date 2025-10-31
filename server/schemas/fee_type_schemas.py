from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class FeeTypeBase(BaseModel):
    """Base schema for FeeType with common fields"""
    school_id: UUID
    fee_type_name: str
    description: Optional[str] = None
    amount_to_pay: float = 0.0
    is_active: str = "true"

class FeeTypeCreate(FeeTypeBase):
    """Schema for creating a new fee type"""
    pass

class FeeTypeUpdate(BaseModel):
    """Schema for updating a fee type"""
    school_id: Optional[UUID] = None
    fee_type_name: Optional[str] = None
    description: Optional[str] = None
    amount_to_pay: Optional[float] = None
    is_active: Optional[str] = None

class FeeTypeResponse(FeeTypeBase):
    """Schema for fee type response"""
    fee_type_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

