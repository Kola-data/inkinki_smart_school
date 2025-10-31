from fastapi import APIRouter, Depends, HTTPException
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from datetime import datetime
from database import get_db
from services.attendance_service import AttendanceService
from schemas.attendance_schemas import (
    AttendanceCreate, 
    AttendanceUpdate, 
    AttendanceResponse
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.get("/", response_model=List[dict])
async def get_all_attendance(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all attendance records for a specific school with joined names (teacher, student, subject)"""
    try:
        attendance_service = AttendanceService(db)
        attendance_records = await attendance_service.get_all_attendance(school_id)
        return attendance_records
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{attendance_id}", response_model=dict)
async def get_attendance_by_id(
    attendance_id: UUID,
    school_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get an attendance record by ID with joined names (teacher, student, subject)"""
    try:
        attendance_service = AttendanceService(db)
        attendance = await attendance_service.get_attendance_by_id(attendance_id, school_id, as_dict=True)
        if not attendance:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
        return attendance
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Removed student-specific list endpoint to keep only CRUD

# Removed summary endpoint to keep only CRUD

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_attendance(
    attendance_data: AttendanceCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Create a new attendance record with validation"""
    try:
        attendance_service = AttendanceService(db)
        attendance = await attendance_service.create_attendance(attendance_data)
        return attendance
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Removed bulk create endpoint to keep only CRUD

@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: UUID,
    school_id: UUID,
    attendance_data: AttendanceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an attendance record with validation"""
    try:
        attendance_service = AttendanceService(db)
        attendance = await attendance_service.update_attendance(attendance_id, school_id, attendance_data)
        if not attendance:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
        return attendance
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance(
    attendance_id: UUID,
    school_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Soft delete an attendance record"""
    try:
        attendance_service = AttendanceService(db)
        deleted = await attendance_service.delete_attendance(attendance_id, school_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
