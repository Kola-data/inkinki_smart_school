from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.system_user_service import SystemUserService
from schemas.system_user_schemas import (
    SystemUserCreate,
    SystemUserUpdate,
    SystemUserResponse
)
from utils.auth_dependencies import get_current_system_user
from models.system_user import SystemUser

router = APIRouter(prefix="/system-users", tags=["System Users"])

@router.get("/", response_model=List[SystemUserResponse])
async def get_all_system_users(current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)):
    """Get all system users"""
    try:
        system_user_service = SystemUserService(db)
        users = await system_user_service.get_all_system_users_simple()
        return [SystemUserResponse.model_validate(user) for user in users]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving system users: {str(e)}"
        )

@router.get("/{user_id}", response_model=SystemUserResponse)
async def get_system_user_by_id(
    user_id: UUID,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a system user by ID"""
    try:
        system_user_service = SystemUserService(db)
        user = await system_user_service.get_system_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="System user not found"
            )
        
        return SystemUserResponse.model_validate(user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving system user: {str(e)}"
        )


@router.post("/", response_model=SystemUserResponse, status_code=status.HTTP_201_CREATED)
async def create_system_user(
    user_data: SystemUserCreate,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new system user"""
    try:
        system_user_service = SystemUserService(db)
        user = await system_user_service.create_system_user(user_data)
        return SystemUserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating system user: {str(e)}"
        )

@router.put("/{user_id}", response_model=SystemUserResponse)
async def update_system_user(
    user_id: UUID,
    user_data: SystemUserUpdate,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a system user"""
    try:
        system_user_service = SystemUserService(db)
        user = await system_user_service.update_system_user(user_id, user_data)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="System user not found"
            )
        
        return SystemUserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating system user: {str(e)}"
        )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_system_user(
    user_id: UUID,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete a system user (archives the account)"""
    try:
        system_user_service = SystemUserService(db)
        deleted = await system_user_service.delete_system_user(user_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="System user not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting system user: {str(e)}"
        )


