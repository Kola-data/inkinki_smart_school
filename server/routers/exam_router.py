from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from uuid import UUID
from database import get_db
from services.exam_service import ExamService
from schemas.exam_schemas import ExamMarkCreate, ExamMarkUpdate, ExamMarkResponse

router = APIRouter(prefix="/exam-marks", tags=["Exam Marks"])

@router.get("/", response_model=List[Dict[str, Any]])
async def get_all_exam_marks(school_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        service = ExamService(db)
        rows = await service.get_all(school_id)
        return rows
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{exam_mark_id}", response_model=Dict[str, Any])
async def get_exam_mark_by_id(exam_mark_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
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
async def create_exam_mark(payload: ExamMarkCreate, db: AsyncSession = Depends(get_db)):
    try:
        service = ExamService(db)
        row = await service.create(payload)
        return row
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{exam_mark_id}", response_model=ExamMarkResponse)
async def update_exam_mark(exam_mark_id: UUID, school_id: UUID, payload: ExamMarkUpdate, db: AsyncSession = Depends(get_db)):
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
async def delete_exam_mark(exam_mark_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        service = ExamService(db)
        ok = await service.delete(exam_mark_id, school_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam mark not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
