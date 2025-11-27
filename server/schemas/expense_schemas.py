from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID

class ExpenseBase(BaseModel):
    """Base schema for Expense with common fields"""
    school_id: UUID
    academic_id: Optional[UUID] = None
    category: str
    title: str
    description: Optional[str] = None
    amount: float
    payment_method: Optional[str] = None  # CASH, BANK_TRANSFER, MOBILE_MONEY, CHEQUE, ONLINE_PAYMENT
    status: str = "PENDING"  # PENDING, APPROVED, PAID, REJECTED, ARCHIVED
    expense_date: Optional[date] = None
    invoice_image: Optional[List[str]] = None  # Array of image URLs/paths
    added_by: Optional[UUID] = None
    approved_by: Optional[UUID] = None

class ExpenseCreate(ExpenseBase):
    """Schema for creating a new expense record"""
    pass

class ExpenseUpdate(BaseModel):
    """Schema for updating an expense record"""
    school_id: Optional[UUID] = None
    academic_id: Optional[UUID] = None
    category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    expense_date: Optional[date] = None
    invoice_image: Optional[List[str]] = None
    added_by: Optional[UUID] = None
    approved_by: Optional[UUID] = None

class ExpenseResponse(ExpenseBase):
    """Schema for expense response"""
    expense_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    academic_year: Optional[dict] = None  # Will contain academic_year details from relationship
    
    class Config:
        from_attributes = True

class PaginatedExpenseResponse(BaseModel):
    """Schema for paginated expense response"""
    items: List[ExpenseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

