from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from database import get_db
from services.school_payment_record_service import SchoolPaymentRecordService
from schemas.school_payment_record_schemas import (
    SchoolPaymentRecordCreate,
    SchoolPaymentRecordUpdate,
    SchoolPaymentRecordResponse,
    SchoolPaymentRecordStatusUpdate
)
from utils.auth_dependencies import get_current_system_user
from models.system_user import SystemUser

router = APIRouter(prefix="/school-payment-records", tags=["School Payment Records"])

@router.get("/", response_model=List[SchoolPaymentRecordResponse])
async def get_all_school_payment_records(
    school_id: Optional[UUID] = Query(None, description="Filter by school ID"),
    payment_id: Optional[UUID] = Query(None, description="Filter by payment season ID"),
    status: Optional[str] = Query(None, description="Filter by status (e.g., 'pending', 'paid', 'overdue')"),
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all school payment records with optional filters"""
    try:
        service = SchoolPaymentRecordService(db)
        records = await service.get_all_school_payment_records(
            school_id=school_id,
            payment_id=payment_id,
            status=status
        )
        return [SchoolPaymentRecordResponse.model_validate(record) for record in records]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving school payment records: {str(e)}"
        )

@router.get("/{record_id}", response_model=SchoolPaymentRecordResponse)
async def get_school_payment_record_by_id(
    record_id: UUID,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a school payment record by ID"""
    try:
        service = SchoolPaymentRecordService(db)
        record = await service.get_school_payment_record_by_id(record_id)
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School payment record not found"
            )
        
        return SchoolPaymentRecordResponse.model_validate(record)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving school payment record: {str(e)}"
        )

@router.post("/", response_model=SchoolPaymentRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_school_payment_record(
    record_data: SchoolPaymentRecordCreate,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new school payment record"""
    try:
        service = SchoolPaymentRecordService(db)
        record = await service.create_school_payment_record(record_data)
        return SchoolPaymentRecordResponse.model_validate(record)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating school payment record: {str(e)}"
        )

@router.put("/{record_id}", response_model=SchoolPaymentRecordResponse)
async def update_school_payment_record(
    record_id: UUID,
    record_data: SchoolPaymentRecordUpdate,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a school payment record"""
    try:
        service = SchoolPaymentRecordService(db)
        record = await service.update_school_payment_record(record_id, record_data)
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School payment record not found"
            )
        
        return SchoolPaymentRecordResponse.model_validate(record)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating school payment record: {str(e)}"
        )

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_school_payment_record(
    record_id: UUID,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a school payment record"""
    try:
        service = SchoolPaymentRecordService(db)
        deleted = await service.soft_delete_school_payment_record(record_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School payment record not found"
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting school payment record: {str(e)}"
        )

@router.patch("/{record_id}/status", response_model=SchoolPaymentRecordResponse)
async def update_school_payment_record_status(
    record_id: UUID,
    status_update: SchoolPaymentRecordStatusUpdate,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Update the status of a school payment record"""
    try:
        service = SchoolPaymentRecordService(db)
        record = await service.update_school_payment_record_status(record_id, status_update.status)
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School payment record not found"
            )
        
        return SchoolPaymentRecordResponse.model_validate(record)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating school payment record status: {str(e)}"
        )


