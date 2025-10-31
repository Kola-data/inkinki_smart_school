from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class InventoryBase(BaseModel):
    """Base schema for Inventory with common fields"""
    school_id: UUID
    inv_name: str
    inv_service: Optional[str] = None
    inv_desc: Optional[str] = None
    inv_date: Optional[date] = None
    inv_price: Optional[float] = None
    inv_status: Optional[str] = None

class InventoryCreate(InventoryBase):
    """Schema for creating a new inventory record"""
    pass

class InventoryUpdate(BaseModel):
    """Schema for updating an inventory record"""
    school_id: Optional[UUID] = None
    inv_name: Optional[str] = None
    inv_service: Optional[str] = None
    inv_desc: Optional[str] = None
    inv_date: Optional[date] = None
    inv_price: Optional[float] = None
    inv_status: Optional[str] = None

class InventoryResponse(InventoryBase):
    """Schema for inventory response"""
    inv_id: UUID
    is_deleted: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

