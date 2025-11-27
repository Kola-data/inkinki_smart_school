from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from uuid import UUID
from pydantic import BaseModel
from database import get_db
from services.test_mark_service import TestMarkService
from schemas.test_mark_schemas import (
    TestMarkCreate,
    TestMarkUpdate,
    TestMarkResponse,
    TestMarkResponseWithDetails,
    TestMarkFilter
)
from schemas.pagination_schemas import PaginatedResponse
from utils.pagination import calculate_total_pages
from utils.auth_dependencies import get_current_staff
from models.staff import Staff

class BulkPublishRequest(BaseModel):
    test_mark_ids: List[UUID]
    is_published: bool = True

router = APIRouter(prefix="/test-marks", tags=["Test Marks"])

@router.get("/", response_model=PaginatedResponse[dict])
async def get_all_test_marks(
    school_id: UUID, 
    academic_id: Optional[UUID] = Query(None, description="Filter by academic year ID"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Number of items per page (max 100)"),
    db: AsyncSession = Depends(get_db)
):
    """Get paginated test marks for a school"""
    try:
        service = TestMarkService(db)
        rows, total = await service.get_all(
            school_id, 
            academic_id=academic_id,
            page=page,
            page_size=page_size
        )
        return PaginatedResponse(
            items=rows,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=calculate_total_pages(total, page_size)
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{test_mark_id}", response_model=Dict[str, Any])
async def get_test_mark_by_id(test_mark_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Get a test mark by ID"""
    try:
        service = TestMarkService(db)
        row = await service.get_by_id(test_mark_id, school_id, as_dict=True)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test mark not found")
        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_test_mark(payload: TestMarkCreate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Create a new test mark"""
    try:
        service = TestMarkService(db)
        result = await service.create(payload)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{test_mark_id}", response_model=Dict[str, Any])
async def update_test_mark(test_mark_id: UUID, school_id: UUID, payload: TestMarkUpdate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Update a test mark"""
    try:
        service = TestMarkService(db)
        row = await service.update(test_mark_id, school_id, payload)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test mark not found")
        # Service now returns dict with related fields
        return row
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{test_mark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_mark(test_mark_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Delete a test mark (soft delete)"""
    try:
        service = TestMarkService(db)
        ok = await service.delete(test_mark_id, school_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test mark not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/bulk-publish", response_model=Dict[str, Any])
async def bulk_publish_test_marks(
    school_id: UUID,
    payload: BulkPublishRequest = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Publish or unpublish multiple test marks"""
    try:
        service = TestMarkService(db)
        count = await service.publish_bulk(payload.test_mark_ids, school_id, payload.is_published)
        return {
            "message": f"Successfully {'published' if payload.is_published else 'unpublished'} {count} test mark(s)",
            "count": count
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

