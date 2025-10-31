from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.school_service import SchoolService
from schemas.school_schemas import SchoolCreate, SchoolUpdate, SchoolResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

router = APIRouter(prefix="/school", tags=["School"])

# Configure rate limiting - DISABLED FOR TESTING
# limiter = Limiter(
#     key_func=get_remote_address,
#     storage_uri="redis://localhost:6379/0",
#     default_limits=["1000 per hour", "100 per minute"]
# )

@router.get("/", response_model=List[SchoolResponse])
async def get_all_schools(request: Request, db: AsyncSession = Depends(get_db)):
    """Get all schools"""
    try:
        service = SchoolService(db)
        schools = await service.get_all_schools()
        return schools
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving schools: {str(e)}"
        )

@router.get("/{school_id}", response_model=SchoolResponse)
async def get_school_by_id(request: Request, school_id: str, db: AsyncSession = Depends(get_db)):
    """Get a school by ID"""
    try:
        school_uuid = UUID(school_id)
        service = SchoolService(db)
        school = await service.get_school_by_id(school_uuid)
        
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        return school
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid school ID format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving school: {str(e)}")

@router.post("/", response_model=SchoolResponse, status_code=201)
async def create_school(request: Request, school_data: SchoolCreate, db: AsyncSession = Depends(get_db)):
    """Create a new school"""
    try:
        service = SchoolService(db)
        school = await service.create_school(school_data)
        return school
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating school: {str(e)}")

@router.put("/{school_id}", response_model=SchoolResponse)
async def update_school(request: Request, school_id: str, school_data: SchoolUpdate, db: AsyncSession = Depends(get_db)):
    """Update a school"""
    try:
        school_uuid = UUID(school_id)
        service = SchoolService(db)
        school = await service.update_school(school_uuid, school_data)
        
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        return school
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid school ID format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating school: {str(e)}")

@router.delete("/{school_id}", status_code=204)
async def soft_delete_school(request: Request, school_id: str, db: AsyncSession = Depends(get_db)):
    """Soft delete a school"""
    try:
        school_uuid = UUID(school_id)
        service = SchoolService(db)
        success = await service.soft_delete_school(school_uuid)
        
        if not success:
            raise HTTPException(status_code=404, detail="School not found")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid school ID format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting school: {str(e)}")

@router.patch("/{school_id}/activate", response_model=SchoolResponse)
async def activate_school(request: Request, school_id: str, db: AsyncSession = Depends(get_db)):
    """Activate a school"""
    try:
        school_uuid = UUID(school_id)
        service = SchoolService(db)
        success = await service.activate_school(school_uuid)
        
        if not success:
            raise HTTPException(status_code=404, detail="School not found")
        
        school = await service.get_school_by_id(school_uuid)
        return school
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid school ID format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error activating school: {str(e)}")

@router.patch("/{school_id}/deactivate", response_model=SchoolResponse)
async def deactivate_school(request: Request, school_id: str, db: AsyncSession = Depends(get_db)):
    """Deactivate a school"""
    try:
        school_uuid = UUID(school_id)
        service = SchoolService(db)
        success = await service.deactivate_school(school_uuid)
        
        if not success:
            raise HTTPException(status_code=404, detail="School not found")
        
        school = await service.get_school_by_id(school_uuid)
        return school
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid school ID format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deactivating school: {str(e)}")
