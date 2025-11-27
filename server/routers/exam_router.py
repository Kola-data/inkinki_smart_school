from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from uuid import UUID
from pydantic import BaseModel
from database import get_db
from services.exam_service import ExamService
from schemas.exam_schemas import ExamMarkCreate, ExamMarkUpdate, ExamMarkResponse
from schemas.pagination_schemas import PaginatedResponse
from utils.pagination import calculate_total_pages
from utils.auth_dependencies import get_current_staff
from models.staff import Staff

class BulkPublishRequest(BaseModel):
    exam_mark_ids: List[UUID]
    is_published: bool = True

router = APIRouter(prefix="/exam-marks", tags=["Exam Marks"])

@router.get("/", response_model=PaginatedResponse[dict])
async def get_all_exam_marks(
    school_id: UUID, 
    academic_id: Optional[UUID] = Query(None, description="Filter by academic year ID"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Number of items per page (max 100)"),
    db: AsyncSession = Depends(get_db)
):
    try:
        service = ExamService(db)
        rows, total = await service.get_all(
            school_id, 
            academic_id=academic_id,
            page=page,
            page_size=page_size
        )
        print(f"Exam router: Returning {len(rows)} exam marks, total: {total}")
        return PaginatedResponse(
            items=rows,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=calculate_total_pages(total, page_size)
        )
    except Exception as e:
        print(f"Exam router error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{exam_mark_id}", response_model=Dict[str, Any])
async def get_exam_mark_by_id(exam_mark_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    try:
        service = ExamService(db)
        row = await service.get_by_id(exam_mark_id, school_id, as_dict=True)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam mark not found")
        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/", response_model=ExamMarkResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_mark(payload: ExamMarkCreate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    try:
        service = ExamService(db)
        row = await service.create(payload)
        return row
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{exam_mark_id}", response_model=ExamMarkResponse)
async def update_exam_mark(exam_mark_id: UUID, school_id: UUID, payload: ExamMarkUpdate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    try:
        service = ExamService(db)
        row = await service.update(exam_mark_id, school_id, payload)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam mark not found")
        return row
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{exam_mark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam_mark(exam_mark_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    try:
        service = ExamService(db)
        ok = await service.delete(exam_mark_id, school_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam mark not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/bulk-publish", response_model=Dict[str, Any])
async def bulk_publish_exam_marks(
    school_id: UUID,
    payload: BulkPublishRequest = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Publish or unpublish multiple exam marks"""
    try:
        service = ExamService(db)
        count = await service.publish_bulk(payload.exam_mark_ids, school_id, payload.is_published)
        return {
            "message": f"Successfully {'published' if payload.is_published else 'unpublished'} {count} exam mark(s)",
            "count": count
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
