from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.fee_type_service import FeeTypeService
from schemas.fee_type_schemas import FeeTypeCreate, FeeTypeUpdate, FeeTypeResponse
from utils.school_utils import verify_school_active
from utils.auth_dependencies import get_current_staff
from models.staff import Staff

router = APIRouter(prefix="/fee-types", tags=["Fee Types"])

@router.get("/", response_model=List[FeeTypeResponse])
async def get_all_fee_types(school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Get all fee types for a specific school"""
    try:
        await verify_school_active(school_id, db)
        fee_type_service = FeeTypeService(db)
        fee_types = await fee_type_service.get_all_fee_types(school_id)
        return fee_types
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{fee_type_id}", response_model=FeeTypeResponse)
async def get_fee_type_by_id(fee_type_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Get a fee type by ID"""
    try:
        await verify_school_active(school_id, db)
        fee_type_service = FeeTypeService(db)
        fee_type = await fee_type_service.get_fee_type_by_id(fee_type_id, school_id)
        if not fee_type:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee type not found")
        return fee_type
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/", response_model=FeeTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_fee_type(fee_type_data: FeeTypeCreate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Create a new fee type"""
    try:
        await verify_school_active(fee_type_data.school_id, db)
        fee_type_service = FeeTypeService(db)
        fee_type = await fee_type_service.create_fee_type(fee_type_data)
        return fee_type
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{fee_type_id}", response_model=FeeTypeResponse)
async def update_fee_type(fee_type_id: UUID, school_id: UUID, fee_type_data: FeeTypeUpdate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Update a fee type"""
    try:
        await verify_school_active(school_id, db)
        # Verify school_id matches if provided in update data
        if fee_type_data.school_id and fee_type_data.school_id != school_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="School ID mismatch")
        fee_type_service = FeeTypeService(db)
        fee_type = await fee_type_service.update_fee_type(fee_type_id, school_id, fee_type_data)
        if not fee_type:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee type not found")
        return fee_type
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{fee_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fee_type(fee_type_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Delete a fee type"""
    try:
        await verify_school_active(school_id, db)
        fee_type_service = FeeTypeService(db)
        deleted = await fee_type_service.delete_fee_type(fee_type_id, school_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee type not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

