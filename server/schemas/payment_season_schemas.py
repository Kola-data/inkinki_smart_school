from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class PaymentSeasonBase(BaseModel):
    """Base schema for Payment Season with common fields"""
    season_pay_name: str
    from_date: date
    end_date: date
    amount: float = 0.0
    coupon_number: Optional[str] = None
    status: str = "active"

class PaymentSeasonCreate(PaymentSeasonBase):
    """Schema for creating a new payment season"""
    pass

class PaymentSeasonUpdate(BaseModel):
    """Schema for updating a payment season"""
    season_pay_name: Optional[str] = None
    from_date: Optional[date] = None
    end_date: Optional[date] = None
    amount: Optional[float] = None
    coupon_number: Optional[str] = None
    status: Optional[str] = None

class PaymentSeasonResponse(PaymentSeasonBase):
    """Schema for payment season response"""
    pay_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PaymentSeasonStatusUpdate(BaseModel):
    """Schema for updating payment season status"""
    status: str


