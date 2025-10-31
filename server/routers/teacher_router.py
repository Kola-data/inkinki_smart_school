from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.teacher_service import TeacherService
from schemas.teacher_schemas import (
    TeacherCreate, 
    TeacherUpdate, 
    TeacherResponse, 
    TeacherWithStaffResponse,
    TeacherStatusUpdate, 
    TeacherSoftDelete
)

router = APIRouter(prefix="/teachers", tags=["Teachers"])

@router.get("/", response_model=List[TeacherWithStaffResponse])
async def get_all_teachers_with_staff_info(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all teachers with staff and school information for a specific school"""
    try:
        teacher_service = TeacherService(db)
        teachers = await teacher_service.get_all_teachers_with_staff_info(school_id)
        return teachers
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving teachers: {str(e)}"
        )


@router.get("/{teacher_id}", response_model=TeacherWithStaffResponse)
async def get_teacher_by_id(teacher_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a teacher by ID with staff and school information for a specific school"""
    try:
        teacher_service = TeacherService(db)
        teacher = await teacher_service.get_teacher_by_id_with_staff_info(teacher_id, school_id)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found in this school"
            )
        return teacher
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving teacher: {str(e)}"
        )

@router.post("/", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
async def create_teacher(teacher_data: TeacherCreate, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Create a new teacher for a specific school"""
    try:
        teacher_service = TeacherService(db)
        teacher = await teacher_service.create_teacher(teacher_data, school_id)
        return teacher
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating teacher: {str(e)}"
        )

@router.put("/{teacher_id}", response_model=TeacherResponse)
async def update_teacher(teacher_id: UUID, teacher_data: TeacherUpdate, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Update a teacher for a specific school"""
    try:
        teacher_service = TeacherService(db)
        teacher = await teacher_service.update_teacher(teacher_id, teacher_data, school_id)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found in this school"
            )
        return teacher
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating teacher: {str(e)}"
        )

@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_teacher(teacher_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Soft delete a teacher for a specific school"""
    try:
        teacher_service = TeacherService(db)
        success = await teacher_service.soft_delete_teacher(teacher_id, school_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found in this school"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting teacher: {str(e)}"
        )

@router.patch("/{teacher_id}/activate", status_code=status.HTTP_200_OK)
async def activate_teacher(teacher_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Activate a teacher for a specific school"""
    try:
        teacher_service = TeacherService(db)
        success = await teacher_service.activate_teacher(teacher_id, school_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found in this school"
            )
        return {"message": "Teacher activated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error activating teacher: {str(e)}"
        )

@router.patch("/{teacher_id}/deactivate", status_code=status.HTTP_200_OK)
async def deactivate_teacher(teacher_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Deactivate a teacher for a specific school"""
    try:
        teacher_service = TeacherService(db)
        success = await teacher_service.deactivate_teacher(teacher_id, school_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found in this school"
            )
        return {"message": "Teacher deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deactivating teacher: {str(e)}"
        )
