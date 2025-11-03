from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.class_teacher_service import ClassTeacherService
from schemas.class_teacher_schemas import (
    ClassTeacherCreate, 
    ClassTeacherUpdate, 
    ClassTeacherResponse, 
    ClassTeacherWithDetailsResponse,
    ClassTeacherSoftDelete
)
from utils.school_utils import verify_school_active

router = APIRouter(prefix="/class-teachers", tags=["Class Teachers"])

@router.get("/", response_model=List[ClassTeacherWithDetailsResponse])
async def get_all_class_teachers_with_details(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all class teacher assignments with detailed information for a specific school"""
    try:
        await verify_school_active(school_id, db)
        class_teacher_service = ClassTeacherService(db)
        assignments = await class_teacher_service.get_all_class_teachers_with_details(school_id)
        return assignments
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving class teacher assignments: {str(e)}"
        )

@router.get("/{assignment_id}", response_model=ClassTeacherWithDetailsResponse)
async def get_class_teacher_by_id(assignment_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a class teacher assignment by ID with detailed information for a specific school"""
    try:
        await verify_school_active(school_id, db)
        class_teacher_service = ClassTeacherService(db)
        assignment = await class_teacher_service.get_class_teacher_by_id_with_details(assignment_id, school_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class teacher assignment not found in this school"
            )
        return assignment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving class teacher assignment: {str(e)}"
        )

@router.post("/", response_model=ClassTeacherResponse, status_code=status.HTTP_201_CREATED)
async def create_class_teacher(assignment_data: ClassTeacherCreate, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Create a new class teacher assignment for a specific school"""
    try:
        await verify_school_active(school_id, db)
        class_teacher_service = ClassTeacherService(db)
        assignment = await class_teacher_service.create_class_teacher(assignment_data, school_id)
        return assignment
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating class teacher assignment: {str(e)}"
        )

@router.put("/{assignment_id}", response_model=ClassTeacherResponse)
async def update_class_teacher(assignment_id: UUID, assignment_data: ClassTeacherUpdate, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Update a class teacher assignment for a specific school"""
    try:
        await verify_school_active(school_id, db)
        class_teacher_service = ClassTeacherService(db)
        assignment = await class_teacher_service.update_class_teacher(assignment_id, assignment_data, school_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class teacher assignment not found in this school"
            )
        return assignment
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
            detail=f"Error updating class teacher assignment: {str(e)}"
        )

@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_class_teacher(assignment_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Soft delete a class teacher assignment for a specific school"""
    try:
        await verify_school_active(school_id, db)
        class_teacher_service = ClassTeacherService(db)
        success = await class_teacher_service.soft_delete_class_teacher(assignment_id, school_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class teacher assignment not found in this school"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting class teacher assignment: {str(e)}"
        )
