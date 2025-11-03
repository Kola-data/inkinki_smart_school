from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from uuid import UUID
from typing import Optional
from models.school import School


async def verify_school_active(school_id: UUID, db: AsyncSession) -> School:
    """
    Verify that a school exists, is active, and is not deleted.
    Raises HTTPException if school is invalid.
    
    Args:
        school_id: UUID of the school to verify
        db: Database session
    
    Returns:
        School object if valid
    
    Raises:
        HTTPException: If school doesn't exist, is deleted, or is inactive
    """
    # Get school from database
    result = await db.execute(
        select(School).filter(
            School.school_id == school_id
        )
    )
    school = result.scalar_one_or_none()
    
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"School not found"
        )
    
    if school.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"School has been deleted and operations are not allowed"
        )
    
    if not school.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"School is inactive and operations are not allowed"
        )
    
    return school


async def check_school_status(school_id: UUID, db: AsyncSession) -> bool:
    """
    Check if school is active and not deleted (returns boolean).
    Does not raise exceptions.
    
    Args:
        school_id: UUID of the school to check
        db: Database session
    
    Returns:
        True if school exists, is active, and not deleted; False otherwise
    """
    try:
        result = await db.execute(
            select(School).filter(
                School.school_id == school_id
            )
        )
        school = result.scalar_one_or_none()
        
        if not school:
            return False
        
        if school.is_deleted or not school.is_active:
            return False
        
        return True
    except Exception:
        return False

