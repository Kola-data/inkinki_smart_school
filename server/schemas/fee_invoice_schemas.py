from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class FeeInvoiceBase(BaseModel):
    """Base schema for FeeInvoice with common fields"""
    fee_id: UUID
    school_id: UUID
    amount: float = 0.0
    invoice_img: Optional[str] = None  # Base64 image for invoice

class FeeInvoiceCreate(FeeInvoiceBase):
    """Schema for creating a new fee invoice record"""
    pass

class FeeInvoiceUpdate(BaseModel):
    """Schema for updating a fee invoice record"""
    amount: Optional[float] = None
    invoice_img: Optional[str] = None  # Base64 image for invoice

class FeeInvoiceResponse(FeeInvoiceBase):
    """Schema for fee invoice response"""
    invoice_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FeeInvoiceBulkCreate(BaseModel):
    """Schema for bulk creating fee invoice records"""
    school_id: UUID
    fee_id: UUID
    invoices: List[FeeInvoiceCreate]  # List of invoice records to create



