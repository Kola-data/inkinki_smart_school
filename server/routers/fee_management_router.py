from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from uuid import UUID
from database import get_db
from services.fee_management_service import FeeManagementService
from schemas.fee_management_schemas import FeeManagementCreate, FeeManagementUpdate, FeeManagementResponse, FeeManagementBulkCreate
from utils.school_utils import verify_school_active
from utils.pagination import calculate_total_pages
from pydantic import BaseModel
import math
from utils.auth_dependencies import get_current_staff
from models.staff import Staff

class PaginatedFeeResponse(BaseModel):
    """Paginated fee response"""
    items: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    total_pages: int

router = APIRouter(prefix="/fee-management", tags=["Fee Management"])

@router.get("/", response_model=PaginatedFeeResponse)
async def get_all_fees(
    school_id: UUID, 
    academic_id: Optional[UUID] = Query(None, description="Filter by academic year ID"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Number of items per page (max 100)"),
    db: AsyncSession = Depends(get_db)
):
    """Get paginated fee management records for a specific school with joined tables (student, fee_type, academic_year)"""
    try:
        await verify_school_active(school_id, db)
        fee_service = FeeManagementService(db)
        fees, total = await fee_service.get_all_fees_paginated(
            school_id, 
            academic_id=academic_id,
            page=page,
            page_size=page_size,
            as_dict=True
        )
        
        return PaginatedFeeResponse(
            items=fees,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=calculate_total_pages(total, page_size)
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{fee_id}", response_model=Dict[str, Any])
async def get_fee_by_id(fee_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Get a fee management record by ID with joined tables (student, fee_type, academic_year)"""
    try:
        await verify_school_active(school_id, db)
        fee_service = FeeManagementService(db)
        fee = await fee_service.get_fee_by_id(fee_id, school_id, as_dict=True)
        if not fee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found")
        return fee
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/", response_model=FeeManagementResponse, status_code=status.HTTP_201_CREATED)
async def create_fee(fee_data: FeeManagementCreate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Create a new fee management record with validation"""
    try:
        await verify_school_active(fee_data.school_id, db)
        fee_service = FeeManagementService(db)
        fee = await fee_service.create_fee(fee_data)
        return fee
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/bulk", response_model=List[FeeManagementResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_fees(bulk_data: FeeManagementBulkCreate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Create multiple fee management records"""
    try:
        await verify_school_active(bulk_data.school_id, db)
        fee_service = FeeManagementService(db)
        fees = await fee_service.create_bulk_fees(bulk_data.fee_records)
        return [FeeManagementResponse(
            fee_id=fee.fee_id,
            school_id=fee.school_id,
            std_id=fee.std_id,
            fee_type_id=fee.fee_type_id,
            academic_id=fee.academic_id,
            term=fee.term,
            amount_paid=fee.amount_paid,
            status=fee.status,
            invoice_img=fee.invoice_img,
            is_deleted=fee.is_deleted,
            created_at=fee.created_at,
            updated_at=fee.updated_at
        ) for fee in fees]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{fee_id}", response_model=FeeManagementResponse)
async def update_fee(fee_id: UUID, school_id: UUID, fee_data: FeeManagementUpdate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Update a fee management record"""
    try:
        await verify_school_active(school_id, db)
        fee_service = FeeManagementService(db)
        fee = await fee_service.update_fee(fee_id, school_id, fee_data)
        if not fee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found")
        return fee
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{fee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fee(fee_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Delete a fee management record"""
    try:
        await verify_school_active(school_id, db)
        fee_service = FeeManagementService(db)
        deleted = await fee_service.delete_fee(fee_id, school_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

