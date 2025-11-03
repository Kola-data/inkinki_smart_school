from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.subject_service import SubjectService
from schemas.subject_schemas import (
    SubjectCreate, 
    SubjectUpdate, 
    SubjectResponse, 
    SubjectSoftDelete
)
from utils.school_utils import verify_school_active

router = APIRouter(prefix="/subjects", tags=["Subjects"])

@router.get("/", response_model=List[SubjectResponse])
async def get_all_subjects(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all subjects for a specific school"""
    try:
        await verify_school_active(school_id, db)
        subject_service = SubjectService(db)
        subjects = await subject_service.get_all_subjects(school_id)
        return subjects
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving subjects: {str(e)}"
        )

@router.get("/{subj_id}", response_model=SubjectResponse)
async def get_subject_by_id(subj_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a subject by ID for a specific school"""
    try:
        await verify_school_active(school_id, db)
        subject_service = SubjectService(db)
        subject = await subject_service.get_subject_by_id(subj_id, school_id)
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found in this school"
            )
        return subject
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving subject: {str(e)}"
        )

@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(subject_data: SubjectCreate, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Create a new subject for a specific school"""
    try:
        await verify_school_active(school_id, db)
        subject_service = SubjectService(db)
        subject = await subject_service.create_subject(subject_data, school_id)
        return subject
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating subject: {str(e)}"
        )

@router.put("/{subj_id}", response_model=SubjectResponse)
async def update_subject(subj_id: UUID, subject_data: SubjectUpdate, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Update a subject for a specific school"""
    try:
        await verify_school_active(school_id, db)
        subject_service = SubjectService(db)
        subject = await subject_service.update_subject(subj_id, subject_data, school_id)
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found in this school"
            )
        return subject
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating subject: {str(e)}"
        )

@router.delete("/{subj_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_subject(subj_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Soft delete a subject for a specific school"""
    try:
        await verify_school_active(school_id, db)
        subject_service = SubjectService(db)
        success = await subject_service.soft_delete_subject(subj_id, school_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found in this school"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting subject: {str(e)}"
        )
