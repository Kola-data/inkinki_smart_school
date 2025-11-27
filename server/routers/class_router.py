from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.class_service import ClassService
from schemas.class_schemas import (
    ClassCreate, 
    ClassUpdate, 
    ClassResponse, 
    ClassWithManagerResponse,
    ClassSoftDelete
)
from utils.school_utils import verify_school_active
from utils.auth_dependencies import get_current_staff
from models.staff import Staff

router = APIRouter(prefix="/classes", tags=["Classes"])

@router.get("/", response_model=List[ClassWithManagerResponse])
async def get_all_classes_with_manager_info(school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Get all classes with manager information for a specific school"""
    try:
        await verify_school_active(school_id, db)
        class_service = ClassService(db)
        classes = await class_service.get_all_classes_with_manager_info(school_id)
        return classes
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving classes: {str(e)}"
        )

@router.get("/{cls_id}", response_model=ClassWithManagerResponse)
async def get_class_by_id(cls_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Get a class by ID with manager information for a specific school"""
    try:
        await verify_school_active(school_id, db)
        class_service = ClassService(db)
        class_obj = await class_service.get_class_by_id_with_manager_info(cls_id, school_id)
        if not class_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found in this school"
            )
        return class_obj
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving class: {str(e)}"
        )

@router.post("/", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def create_class(class_data: ClassCreate, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Create a new class for a specific school"""
    try:
        await verify_school_active(school_id, db)
        class_service = ClassService(db)
        class_obj = await class_service.create_class(class_data, school_id)
        return class_obj
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating class: {str(e)}"
        )

@router.put("/{cls_id}", response_model=ClassResponse)
async def update_class(cls_id: UUID, class_data: ClassUpdate, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Update a class for a specific school"""
    try:
        await verify_school_active(school_id, db)
        class_service = ClassService(db)
        class_obj = await class_service.update_class(cls_id, class_data, school_id)
        if not class_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found in this school"
            )
        return class_obj
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
            detail=f"Error updating class: {str(e)}"
        )

@router.delete("/{cls_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_class(cls_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Soft delete a class for a specific school"""
    try:
        await verify_school_active(school_id, db)
        class_service = ClassService(db)
        success = await class_service.soft_delete_class(cls_id, school_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found in this school"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting class: {str(e)}"
        )
