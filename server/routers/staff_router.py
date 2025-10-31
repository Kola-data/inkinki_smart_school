from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.staff_service import StaffService
from schemas.staff_schemas import StaffCreate, StaffUpdate, StaffResponse, StaffStatusUpdate, StaffSoftDelete

router = APIRouter(prefix="/staff", tags=["Staff"])

@router.get("/", response_model=List[StaffResponse])
async def get_all_staff(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all staff members for a specific school"""
    try:
        staff_service = StaffService(db)
        staff = await staff_service.get_staff_by_school(school_id)
        return staff
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving staff: {str(e)}"
        )

@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff_by_id(staff_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a staff member by ID for a specific school"""
    try:
        staff_service = StaffService(db)
        staff = await staff_service.get_staff_by_id_and_school(staff_id, school_id)
        if not staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found in this school"
            )
        return staff
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving staff member: {str(e)}"
        )

@router.post("/", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(staff_data: StaffCreate, db: AsyncSession = Depends(get_db)):
    """Create a new staff member"""
    try:
        staff_service = StaffService(db)
        staff = await staff_service.create_staff(staff_data)
        return staff
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating staff member: {str(e)}"
        )

@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(staff_id: UUID, staff_data: StaffUpdate, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Update a staff member for a specific school"""
    try:
        staff_service = StaffService(db)
        # First verify the staff exists and belongs to the school
        existing_staff = await staff_service.get_staff_by_id(staff_id)
        if not existing_staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
        if str(existing_staff.school_id) != str(school_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Staff member not found in this school. Staff school_id: {existing_staff.school_id}, Requested school_id: {school_id}"
            )
        
        # Remove school_id from update data if it's provided, as staff cannot change schools
        if hasattr(staff_data, 'school_id') and staff_data.school_id is not None:
            # Don't allow changing school_id through update
            staff_data.school_id = None
        
        staff = await staff_service.update_staff(staff_id, staff_data)
        if not staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
        return staff
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating staff member: {str(e)}"
        )

@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_staff(staff_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Soft delete a staff member for a specific school"""
    try:
        staff_service = StaffService(db)
        # First verify the staff exists and belongs to the school
        existing_staff = await staff_service.get_staff_by_id(staff_id)
        if not existing_staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
        if existing_staff.school_id != school_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found in this school"
            )
        
        success = await staff_service.soft_delete_staff(staff_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting staff member: {str(e)}"
        )

@router.patch("/{staff_id}/activate", status_code=status.HTTP_200_OK)
async def activate_staff(staff_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Activate a staff member for a specific school"""
    try:
        staff_service = StaffService(db)
        # First verify the staff exists and belongs to the school
        existing_staff = await staff_service.get_staff_by_id(staff_id)
        if not existing_staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
        if existing_staff.school_id != school_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found in this school"
            )
        
        success = await staff_service.activate_staff(staff_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
        return {"message": "Staff member activated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error activating staff member: {str(e)}"
        )

@router.patch("/{staff_id}/deactivate", status_code=status.HTTP_200_OK)
async def deactivate_staff(staff_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Deactivate a staff member for a specific school"""
    try:
        staff_service = StaffService(db)
        # First verify the staff exists and belongs to the school
        existing_staff = await staff_service.get_staff_by_id(staff_id)
        if not existing_staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
        if existing_staff.school_id != school_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found in this school"
            )
        
        success = await staff_service.deactivate_staff(staff_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
        return {"message": "Staff member deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deactivating staff member: {str(e)}"
        )

