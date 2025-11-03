from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from pathlib import Path
from database import get_db
from services.staff_service import StaffService
from schemas.staff_schemas import StaffCreate, StaffUpdate, StaffResponse, StaffStatusUpdate, StaffSoftDelete
from utils.file_utils import save_base64_file, delete_file
from utils.school_utils import verify_school_active

router = APIRouter(prefix="/staff", tags=["Staff"])

@router.get("/", response_model=List[StaffResponse])
async def get_all_staff(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all staff members for a specific school"""
    try:
        # Verify school is active and not deleted
        await verify_school_active(school_id, db)
        
        staff_service = StaffService(db)
        staff = await staff_service.get_staff_by_school(school_id)
        return staff
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving staff: {str(e)}"
        )

@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff_by_id(staff_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a staff member by ID for a specific school"""
    try:
        # Verify school is active and not deleted
        await verify_school_active(school_id, db)
        
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
        # Verify school is active and not deleted
        await verify_school_active(staff_data.school_id, db)
        # Handle staff_profile if it's a base64 string
        profile_path = None
        if staff_data.staff_profile:
            if isinstance(staff_data.staff_profile, str) and (staff_data.staff_profile.startswith("data:") or len(staff_data.staff_profile) > 1000):
                filename = f"staff_profile_{staff_data.staff_name.replace(' ', '_')}.png"
                profile_path = save_base64_file(staff_data.staff_profile, filename, "staff", "profiles")
                if not profile_path:
                    raise HTTPException(status_code=400, detail="Failed to save staff profile")
            else:
                profile_path = staff_data.staff_profile
        
        # Handle staff_nid_photo if it's a base64 string
        nid_path = None
        if staff_data.staff_nid_photo:
            if isinstance(staff_data.staff_nid_photo, str) and (staff_data.staff_nid_photo.startswith("data:") or len(staff_data.staff_nid_photo) > 1000):
                filename = f"staff_nid_{staff_data.staff_name.replace(' ', '_')}.png"
                nid_path = save_base64_file(staff_data.staff_nid_photo, filename, "staff", "nid")
                if not nid_path:
                    raise HTTPException(status_code=400, detail="Failed to save NID photo")
            else:
                nid_path = staff_data.staff_nid_photo
        
        # Update staff_data with file paths instead of base64
        staff_data_dict = staff_data.model_dump(exclude={"staff_profile", "staff_nid_photo"})
        staff_data_dict["staff_profile"] = profile_path
        staff_data_dict["staff_nid_photo"] = nid_path
        
        # Create new StaffCreate object with file paths
        staff_data = StaffCreate(**staff_data_dict)
        
        staff_service = StaffService(db)
        staff = await staff_service.create_staff(staff_data)
        return staff
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating staff member: {str(e)}"
        )

@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(staff_id: UUID, staff_data: StaffUpdate, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Update a staff member for a specific school"""
    try:
        # Verify school is active and not deleted
        await verify_school_active(school_id, db)
        
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
        
        # Handle staff_profile if it's a base64 string
        profile_path = None
        if staff_data.staff_profile is not None:
            if isinstance(staff_data.staff_profile, str) and (staff_data.staff_profile.startswith("data:") or len(staff_data.staff_profile) > 1000):
                # Delete old profile image if it exists
                if existing_staff.staff_profile:
                    delete_file(existing_staff.staff_profile)
                
                filename = f"staff_profile_{existing_staff.staff_name.replace(' ', '_')}_{staff_id}.png"
                profile_path = save_base64_file(staff_data.staff_profile, filename, "staff", "profiles")
                if not profile_path:
                    raise HTTPException(status_code=400, detail="Failed to save staff profile")
            else:
                # If it's already a path or None, use it as is
                profile_path = staff_data.staff_profile
        
        # Handle staff_nid_photo if it's a base64 string
        nid_path = None
        if staff_data.staff_nid_photo is not None:
            if isinstance(staff_data.staff_nid_photo, str) and (staff_data.staff_nid_photo.startswith("data:") or len(staff_data.staff_nid_photo) > 1000):
                # Delete old NID photo if it exists
                if existing_staff.staff_nid_photo:
                    delete_file(existing_staff.staff_nid_photo)
                
                filename = f"staff_nid_{existing_staff.staff_name.replace(' ', '_')}_{staff_id}.png"
                nid_path = save_base64_file(staff_data.staff_nid_photo, filename, "staff", "nid")
                if not nid_path:
                    raise HTTPException(status_code=400, detail="Failed to save NID photo")
            else:
                # If it's already a path or None, use it as is
                nid_path = staff_data.staff_nid_photo
        
        # Update staff_data with file paths instead of base64
        staff_data_dict = staff_data.model_dump(exclude_unset=True, exclude={"staff_profile", "staff_nid_photo"})
        
        # Only update profile/nid if they were provided
        if profile_path is not None:
            staff_data_dict["staff_profile"] = profile_path
        if nid_path is not None:
            staff_data_dict["staff_nid_photo"] = nid_path
        
        # Remove school_id from update data if it's provided, as staff cannot change schools
        if 'school_id' in staff_data_dict and staff_data_dict['school_id'] is not None:
            staff_data_dict.pop('school_id', None)
        
        # Create new StaffUpdate object with file paths
        staff_data = StaffUpdate(**staff_data_dict)
        
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
        # Verify school is active and not deleted
        await verify_school_active(school_id, db)
        
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
        # Verify school is active and not deleted
        await verify_school_active(school_id, db)
        
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
        # Verify school is active and not deleted
        await verify_school_active(school_id, db)
        
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

@router.get("/{staff_id}/profile", response_class=FileResponse, tags=["Staff"])
async def get_staff_profile(staff_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get staff profile image by staff ID"""
    try:
        staff_service = StaffService(db)
        staff = await staff_service.get_staff_by_id(staff_id)
        
        if not staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )
        
        if not staff.staff_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile image not found for this staff member"
            )
        
        # Construct file path
        profile_path = Path(staff.staff_profile)
        
        # If it's a relative path starting with uploads/, use it directly
        if not profile_path.is_absolute():
            profile_path = Path(".") / profile_path
        
        # Check if file exists
        if not profile_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile image file not found on server"
            )
        
        # Determine media type based on file extension
        media_type = "image/jpeg"
        if profile_path.suffix.lower() in [".png"]:
            media_type = "image/png"
        elif profile_path.suffix.lower() in [".gif"]:
            media_type = "image/gif"
        elif profile_path.suffix.lower() in [".webp"]:
            media_type = "image/webp"
        
        return FileResponse(
            path=profile_path,
            media_type=media_type,
            filename=profile_path.name
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving profile image: {str(e)}"
        )

