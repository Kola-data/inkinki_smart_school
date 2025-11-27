from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from database import get_db
from services.payment_season_service import PaymentSeasonService
from schemas.payment_season_schemas import (
    PaymentSeasonCreate,
    PaymentSeasonUpdate,
    PaymentSeasonResponse,
    PaymentSeasonStatusUpdate
)
from utils.auth_dependencies import get_current_system_user
from models.system_user import SystemUser

router = APIRouter(prefix="/payment-seasons", tags=["Payment Seasons"])

@router.get("/", response_model=List[PaymentSeasonResponse])
async def get_all_payment_seasons(
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all payment seasons"""
    try:
        payment_season_service = PaymentSeasonService(db)
        payment_seasons = await payment_season_service.get_all_payment_seasons()
        return [PaymentSeasonResponse.model_validate(season) for season in payment_seasons]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving payment seasons: {str(e)}"
        )

@router.get("/{pay_id}", response_model=PaymentSeasonResponse)
async def get_payment_season_by_id(
    pay_id: UUID,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a payment season by ID"""
    try:
        payment_season_service = PaymentSeasonService(db)
        payment_season = await payment_season_service.get_payment_season_by_id(pay_id)
        
        if not payment_season:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment season not found"
            )
        
        return PaymentSeasonResponse.model_validate(payment_season)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving payment season: {str(e)}"
        )

@router.post("/", response_model=PaymentSeasonResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_season(
    season_data: PaymentSeasonCreate,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new payment season"""
    try:
        payment_season_service = PaymentSeasonService(db)
        payment_season = await payment_season_service.create_payment_season(season_data)
        return PaymentSeasonResponse.model_validate(payment_season)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating payment season: {str(e)}"
        )

@router.put("/{pay_id}", response_model=PaymentSeasonResponse)
async def update_payment_season(
    pay_id: UUID,
    season_data: PaymentSeasonUpdate,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a payment season"""
    try:
        payment_season_service = PaymentSeasonService(db)
        payment_season = await payment_season_service.update_payment_season(pay_id, season_data)
        
        if not payment_season:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment season not found"
            )
        
        return PaymentSeasonResponse.model_validate(payment_season)
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
            detail=f"Error updating payment season: {str(e)}"
        )

@router.delete("/{pay_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_season(
    pay_id: UUID,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a payment season"""
    try:
        payment_season_service = PaymentSeasonService(db)
        deleted = await payment_season_service.soft_delete_payment_season(pay_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment season not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting payment season: {str(e)}"
        )

@router.patch("/{pay_id}/status", response_model=PaymentSeasonResponse)
async def update_payment_season_status(
    pay_id: UUID,
    status_data: PaymentSeasonStatusUpdate,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Update payment season status"""
    try:
        payment_season_service = PaymentSeasonService(db)
        update_data = PaymentSeasonUpdate(status=status_data.status)
        payment_season = await payment_season_service.update_payment_season(pay_id, update_data)
        
        if not payment_season:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment season not found"
            )
        
        return PaymentSeasonResponse.model_validate(payment_season)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating payment season status: {str(e)}"
        )

