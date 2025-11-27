from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from database import get_db
from services.student_service import StudentService
from schemas.student_schemas import StudentCreate, StudentUpdate, StudentResponse
from utils.school_utils import verify_school_active
from utils.pagination import paginate_query, calculate_total_pages
from utils.auth_dependencies import get_current_staff
from models.staff import Staff
from pydantic import BaseModel

class PaginatedResponse(BaseModel):
    """Generic paginated response"""
    items: List[dict]
    total: int
    page: int
    page_size: int
    total_pages: int

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/", response_model=PaginatedResponse)
async def get_all_students(
    school_id: UUID,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Number of items per page (max 100)"),
    current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get paginated students for a specific school with parent and class details"""
    try:
        # Verify school is active and not deleted
        await verify_school_active(school_id, db)
        
        student_service = StudentService(db)
        students, total = await student_service.get_all_students_paginated(school_id, page=page, page_size=page_size)
        
        return PaginatedResponse(
            items=students,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=calculate_total_pages(total, page_size)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{student_id}", response_model=dict)
async def get_student_by_id(
    student_id: UUID, 
    school_id: UUID,
    current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get a student by ID with parent and class details"""
    try:
        # Verify school is active and not deleted
        await verify_school_active(school_id, db)
        
        student_service = StudentService(db)
        student = await student_service.get_student_by_id(student_id, school_id, as_dict=True)
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        return student
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_data: StudentCreate,
    current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """Create a new student with validation"""
    try:
        # Verify school is active and not deleted
        await verify_school_active(student_data.school_id, db)
        
        student_service = StudentService(db)
        student = await student_service.create_student(student_data)
        return student
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{student_id}", response_model=dict)
async def update_student(
    student_id: UUID,
    school_id: UUID,
    student_data: StudentUpdate,
    current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """Update a student with validation"""
    try:
        # Verify school is active and not deleted
        await verify_school_active(school_id, db)
        
        # If student_data has school_id, verify it matches
        if student_data.school_id and student_data.school_id != school_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="School ID mismatch")
        
        student_service = StudentService(db)
        student = await student_service.update_student(student_id, school_id, student_data)
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        
        # Return dict with relationships
        return student.to_dict(include_parent=True, include_classes=True)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: UUID,
    school_id: UUID,
    current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """Delete a student"""
    try:
        # Verify school is active and not deleted
        await verify_school_active(school_id, db)
        
        student_service = StudentService(db)
        deleted = await student_service.delete_student(student_id, school_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
