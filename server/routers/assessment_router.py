from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from uuid import UUID
from database import get_db
from services.assessment_service import AssessmentService
from schemas.assessment_schemas import AssessmentMarkCreate, AssessmentMarkUpdate, AssessmentMarkResponse

router = APIRouter(prefix="/test-marks", tags=["Test Marks"])

@router.get("/", response_model=List[Dict[str, Any]])
async def get_all_assessment_marks(school_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        service = AssessmentService(db)
        rows = await service.get_all(school_id)
        return rows
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{ass_mark_id}", response_model=Dict[str, Any])
async def get_assessment_mark_by_id(ass_mark_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        service = AssessmentService(db)
        row = await service.get_by_id(ass_mark_id, school_id, as_dict=True)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment mark not found")
        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/", response_model=AssessmentMarkResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment_mark(payload: AssessmentMarkCreate, db: AsyncSession = Depends(get_db)):
    try:
        service = AssessmentService(db)
        row = await service.create(payload)
        return row
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{ass_mark_id}", response_model=AssessmentMarkResponse)
async def update_assessment_mark(ass_mark_id: UUID, school_id: UUID, payload: AssessmentMarkUpdate, db: AsyncSession = Depends(get_db)):
    try:
        service = AssessmentService(db)
        row = await service.update(ass_mark_id, school_id, payload)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment mark not found")
        return row
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{ass_mark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assessment_mark(ass_mark_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        service = AssessmentService(db)
        ok = await service.delete(ass_mark_id, school_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment mark not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
