from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.parent_service import ParentService
from schemas.parent_schemas import ParentCreate, ParentUpdate, ParentResponse

router = APIRouter(prefix="/parents", tags=["Parents"])

@router.get("/", response_model=List[ParentResponse])
async def get_all_parents(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all parents for a specific school"""
    try:
        parent_service = ParentService(db)
        parents = await parent_service.get_all_parents(school_id)
        return parents
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving parents: {str(e)}"
        )

@router.get("/{parent_id}", response_model=ParentResponse)
async def get_parent_by_id(parent_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a parent by ID for a specific school"""
    try:
        parent_service = ParentService(db)
        parent = await parent_service.get_parent_by_id(parent_id, school_id)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent not found in this school"
            )
        return parent
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving parent: {str(e)}"
        )

@router.post("/", response_model=ParentResponse, status_code=status.HTTP_201_CREATED)
async def create_parent(parent_data: ParentCreate, db: AsyncSession = Depends(get_db)):
    """Create a new parent"""
    try:
        parent_service = ParentService(db)
        parent = await parent_service.create_parent(parent_data)
        return parent
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating parent: {str(e)}"
        )

@router.put("/{parent_id}", response_model=ParentResponse)
async def update_parent(parent_id: UUID, school_id: UUID, parent_data: ParentUpdate, db: AsyncSession = Depends(get_db)):
    """Update a parent"""
    try:
        parent_service = ParentService(db)
        parent = await parent_service.update_parent(parent_id, school_id, parent_data)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent not found in this school"
            )
        return parent
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating parent: {str(e)}"
        )

@router.delete("/{parent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_parent(parent_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a parent (soft delete)"""
    try:
        parent_service = ParentService(db)
        deleted = await parent_service.delete_parent(parent_id, school_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent not found in this school"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting parent: {str(e)}"
        )

