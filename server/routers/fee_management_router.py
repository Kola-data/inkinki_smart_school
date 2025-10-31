from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from uuid import UUID
from database import get_db
from services.fee_management_service import FeeManagementService
from schemas.fee_management_schemas import FeeManagementCreate, FeeManagementUpdate, FeeManagementResponse

router = APIRouter(prefix="/fee-management", tags=["Fee Management"])

@router.get("/", response_model=List[Dict[str, Any]])
async def get_all_fees(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all fee management records for a specific school with joined tables (student, fee_type, academic_year)"""
    try:
        fee_service = FeeManagementService(db)
        fees = await fee_service.get_all_fees(school_id, as_dict=True)
        return fees
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{fee_id}", response_model=Dict[str, Any])
async def get_fee_by_id(fee_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a fee management record by ID with joined tables (student, fee_type, academic_year)"""
    try:
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
async def create_fee(fee_data: FeeManagementCreate, db: AsyncSession = Depends(get_db)):
    """Create a new fee management record with validation"""
    try:
        fee_service = FeeManagementService(db)
        fee = await fee_service.create_fee(fee_data)
        return fee
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{fee_id}", response_model=FeeManagementResponse)
async def update_fee(fee_id: UUID, school_id: UUID, fee_data: FeeManagementUpdate, db: AsyncSession = Depends(get_db)):
    """Update a fee management record"""
    try:
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
async def delete_fee(fee_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a fee management record"""
    try:
        fee_service = FeeManagementService(db)
        deleted = await fee_service.delete_fee(fee_id, school_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

