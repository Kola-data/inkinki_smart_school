"""Cache management router for clearing caches"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from database import get_db
from utils.clear_cache import clear_all_cache, clear_cache_by_pattern
from utils.school_utils import verify_school_active
from utils.auth_dependencies import get_current_system_user, get_current_staff
from models.system_user import SystemUser
from models.staff import Staff
from uuid import UUID

router = APIRouter(prefix="/cache", tags=["Cache Management"])

@router.delete("/clear")
async def clear_all_caches(
    pattern: Optional[str] = Query(None, description="Optional pattern to clear specific cache keys (e.g., 'staff:*')"),
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear all caches or caches matching a pattern"""
    try:
        if pattern:
            deleted = await clear_cache_by_pattern(pattern)
            return {"message": f"Cleared {deleted} cache entries", "pattern": pattern}
        else:
            deleted = await clear_all_cache()
            return {"message": f"Cleared {deleted} cache entries", "pattern": "all"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing cache: {str(e)}"
        )

@router.delete("/clear/school/{school_id}")
async def clear_school_caches(
    school_id: UUID,
    current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """Clear all caches for a specific school"""
    try:
        await verify_school_active(school_id, db)
        
        patterns = [
            f"staff:school:{school_id}*",
            f"students:school:{school_id}*",
            f"teachers:school:{school_id}*",
            f"parents:school:{school_id}*",
            f"expense:school:{school_id}*",
            f"fees:school:{school_id}*",
            f"testmarks:school:{school_id}*",
            f"exam:school:{school_id}*",
            f"attendance:school:{school_id}*",
            f"classes:school:{school_id}*",
            f"subjects:school:{school_id}*",
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = await clear_cache_by_pattern(pattern)
            total_deleted += deleted
        
        return {
            "message": f"Cleared {total_deleted} cache entries for school",
            "school_id": str(school_id)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing school cache: {str(e)}"
        )

