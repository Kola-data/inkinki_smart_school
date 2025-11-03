from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.academic_year_service import AcademicYearService
from schemas.academic_year_schemas import (
    AcademicYearCreate, 
    AcademicYearUpdate, 
    AcademicYearResponse,
    AcademicYearStatusUpdate, 
    AcademicYearSoftDelete
)
from utils.school_utils import verify_school_active

router = APIRouter(prefix="/academic-years", tags=["Academic Years"])

@router.get("/", response_model=List[AcademicYearResponse])
async def get_all_academic_years(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all academic years for a specific school"""
    try:
        await verify_school_active(school_id, db)
        academic_year_service = AcademicYearService(db)
        academic_years = await academic_year_service.get_all_academic_years(school_id)
        return academic_years
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving academic years: {str(e)}"
        )

@router.get("/all", response_model=List[dict])
async def get_all_academic_years_for_school(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all academic years (current or not) for a specific school"""
    try:
        await verify_school_active(school_id, db)
        academic_year_service = AcademicYearService(db)
        academic_years = await academic_year_service.get_all_academic_years_for_school(school_id)
        return academic_years
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving all academic years: {str(e)}"
        )

@router.get("/current", response_model=AcademicYearResponse)
async def get_current_academic_year(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get the current academic year for a specific school"""
    try:
        await verify_school_active(school_id, db)
        academic_year_service = AcademicYearService(db)
        academic_year = await academic_year_service.get_current_academic_year(school_id)
        if not academic_year:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No current academic year found for this school"
            )
        return academic_year
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving current academic year: {str(e)}"
        )

@router.get("/{academic_id}", response_model=AcademicYearResponse)
async def get_academic_year_by_id(academic_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get an academic year by ID for a specific school"""
    try:
        await verify_school_active(school_id, db)
        academic_year_service = AcademicYearService(db)
        academic_year = await academic_year_service.get_academic_year_by_id(academic_id, school_id)
        if not academic_year:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Academic year not found in this school"
            )
        return academic_year
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving academic year: {str(e)}"
        )

@router.post("/", response_model=AcademicYearResponse, status_code=status.HTTP_201_CREATED)
async def create_academic_year(academic_year_data: AcademicYearCreate, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Create a new academic year for a specific school"""
    try:
        await verify_school_active(school_id, db)
        academic_year_service = AcademicYearService(db)
        academic_year = await academic_year_service.create_academic_year(academic_year_data, school_id)
        return academic_year
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating academic year: {str(e)}"
        )

@router.put("/{academic_id}", response_model=AcademicYearResponse)
async def update_academic_year(academic_id: UUID, academic_year_data: AcademicYearUpdate, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Update an academic year for a specific school"""
    try:
        await verify_school_active(school_id, db)
        academic_year_service = AcademicYearService(db)
        academic_year = await academic_year_service.update_academic_year(academic_id, academic_year_data, school_id)
        if not academic_year:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Academic year not found in this school"
            )
        return academic_year
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating academic year: {str(e)}"
        )

@router.delete("/{academic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_academic_year(academic_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Soft delete an academic year for a specific school"""
    try:
        await verify_school_active(school_id, db)
        academic_year_service = AcademicYearService(db)
        success = await academic_year_service.soft_delete_academic_year(academic_id, school_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Academic year not found in this school"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting academic year: {str(e)}"
        )

@router.patch("/{academic_id}/set-current", status_code=status.HTTP_200_OK)
async def set_current_academic_year(academic_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Set an academic year as current for a specific school (deactivates all others for that school)"""
    try:
        await verify_school_active(school_id, db)
        academic_year_service = AcademicYearService(db)
        success = await academic_year_service.set_current_academic_year(academic_id, school_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Academic year not found in this school"
            )
        return {"message": "Academic year set as current successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error setting academic year as current: {str(e)}"
        )
