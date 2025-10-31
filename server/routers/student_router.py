from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.student_service import StudentService
from schemas.student_schemas import StudentCreate, StudentUpdate, StudentResponse

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/", response_model=List[dict])
async def get_all_students(
    school_id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    """Get all students for a specific school with parent and class details"""
    try:
        student_service = StudentService(db)
        students = await student_service.get_all_students(school_id)
        return students
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{student_id}", response_model=dict)
async def get_student_by_id(
    student_id: UUID, 
    school_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a student by ID with parent and class details"""
    try:
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
async def create_student(student_data: StudentCreate, db: AsyncSession = Depends(get_db)):
    """Create a new student with validation"""
    try:
        student_service = StudentService(db)
        student = await student_service.create_student(student_data)
        return student
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{student_id}", response_model=dict)
async def update_student(student_id: UUID, school_id: UUID, student_data: StudentUpdate, db: AsyncSession = Depends(get_db)):
    """Update a student with validation"""
    try:
        student_service = StudentService(db)
        student = await student_service.update_student(student_id, school_id, student_data)
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        
        # Return dict with relationships
        return student.to_dict(include_parent=True, include_classes=True)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(student_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a student"""
    try:
        student_service = StudentService(db)
        deleted = await student_service.delete_student(student_id, school_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
