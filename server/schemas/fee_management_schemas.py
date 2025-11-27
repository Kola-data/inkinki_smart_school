from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class FeeManagementBase(BaseModel):
    """Base schema for FeeManagement with common fields"""
    school_id: UUID
    std_id: UUID
    fee_type_id: UUID
    academic_id: UUID
    term: str
    amount_paid: float = 0.0
    status: str = "pending"

class FeeManagementCreate(FeeManagementBase):
    """Schema for creating a new fee management record"""
    invoice_img: Optional[str] = None  # Base64 image for invoice

class FeeManagementUpdate(BaseModel):
    """Schema for updating a fee management record"""
    school_id: Optional[UUID] = None
    std_id: Optional[UUID] = None
    fee_type_id: Optional[UUID] = None
    academic_id: Optional[UUID] = None
    term: Optional[str] = None
    amount_paid: Optional[float] = None
    status: Optional[str] = None
    invoice_img: Optional[str] = None  # Base64 image for invoice
    replace_amount: Optional[bool] = False  # If True, replace amount_paid; if False, add to existing

class FeeManagementResponse(FeeManagementBase):
    """Schema for fee management response"""
    fee_id: UUID
    invoice_img: Optional[str] = None
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class FeeManagementBulkCreate(BaseModel):
    """Schema for bulk creating fee management records"""
    school_id: UUID
    fee_records: List[FeeManagementCreate]  # List of fee records to create
