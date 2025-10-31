from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.fee_detail_service import FeeDetailService
from schemas.fee_detail_schemas import FeeDetailCreate, FeeDetailUpdate, FeeDetailResponse

router = APIRouter(prefix="/fee-details", tags=["Fee Details"])

@router.get("/", response_model=List[FeeDetailResponse])
async def get_all_fee_details(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all fee detail records for a specific school"""
    try:
        fee_detail_service = FeeDetailService(db)
        fee_details = await fee_detail_service.get_all_fee_details(school_id)
        return fee_details
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{fee_detail_id}", response_model=FeeDetailResponse)
async def get_fee_detail_by_id(fee_detail_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a fee detail record by ID"""
    try:
        fee_detail_service = FeeDetailService(db)
        fee_detail = await fee_detail_service.get_fee_detail_by_id(fee_detail_id, school_id)
        if not fee_detail:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee detail record not found")
        return fee_detail
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/", response_model=FeeDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_fee_detail(fee_detail_data: FeeDetailCreate, db: AsyncSession = Depends(get_db)):
    """Create a new fee detail record"""
    try:
        fee_detail_service = FeeDetailService(db)
        fee_detail = await fee_detail_service.create_fee_detail(fee_detail_data)
        return fee_detail
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{fee_detail_id}", response_model=FeeDetailResponse)
async def update_fee_detail(fee_detail_id: UUID, school_id: UUID, fee_detail_data: FeeDetailUpdate, db: AsyncSession = Depends(get_db)):
    """Update a fee detail record"""
    try:
        fee_detail_service = FeeDetailService(db)
        fee_detail = await fee_detail_service.update_fee_detail(fee_detail_id, school_id, fee_detail_data)
        if not fee_detail:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee detail record not found")
        return fee_detail
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{fee_detail_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fee_detail(fee_detail_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a fee detail record"""
    try:
        fee_detail_service = FeeDetailService(db)
        deleted = await fee_detail_service.delete_fee_detail(fee_detail_id, school_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee detail record not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

