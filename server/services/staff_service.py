from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func as sql_func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Tuple
from uuid import UUID
from models.staff import Staff
from schemas.staff_schemas import StaffCreate, StaffUpdate, StaffStatusUpdate, StaffSoftDelete
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs
from utils.password_utils import hash_password
from utils.cache_utils import get_paginated_cache, set_paginated_cache

class StaffService:
    """Service class for Staff CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_staff(self) -> List[Staff]:
        """Get all staff members that are not deleted"""
        # Try to get from cache first
        cache_key = "staff:all"
        cached_staff = await redis_service.get(cache_key)
        
        if cached_staff:
            # Log cache hit
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            return cached_staff
        
        # Log cache miss
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        # If not in cache, get from database
        result = await self.db.execute(
            select(Staff).filter(Staff.is_deleted == False)
        )
        staff = result.scalars().all()
        
        # Log database operation
        await logging_service.log_database_operation("SELECT", "staff", data={"count": len(staff)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "staff",
            "data": {"count": len(staff)}
        })
        
        # Cache the result
        staff_data = [member.to_dict() for member in staff]
        await redis_service.set(cache_key, staff_data, expire=settings.REDIS_CACHE_TTL)
        
        return staff
    
    async def get_staff_by_id(self, staff_id: UUID) -> Optional[Staff]:
        """Get a staff member by ID"""
        # Try to get from cache first
        cache_key = f"staff:{staff_id}"
        cached_staff = await redis_service.get(cache_key)
        
        if cached_staff:
            # Create Staff object from cached data
            staff = Staff()
            for key, value in cached_staff.items():
                if hasattr(staff, key):
                    setattr(staff, key, value)
            return staff
        
        # If not in cache, get from database
        result = await self.db.execute(
            select(Staff).filter(
                Staff.staff_id == staff_id,
                Staff.is_deleted == False
            )
        )
        staff = result.scalar_one_or_none()
        
        if staff:
            # Cache the result
            await redis_service.set(cache_key, staff.to_dict(), expire=settings.REDIS_CACHE_TTL)
        
        return staff

    async def get_staff_by_id_and_school(self, staff_id: UUID, school_id: UUID) -> Optional[Staff]:
        """Get a staff member by ID and school ID"""
        # Try to get from cache first
        cache_key = f"staff:{staff_id}:school:{school_id}"
        cached_staff = await redis_service.get(cache_key)
        
        if cached_staff:
            # Create Staff object from cached data
            staff = Staff()
            for key, value in cached_staff.items():
                if hasattr(staff, key):
                    setattr(staff, key, value)
            return staff
        
        # If not in cache, get from database with both conditions
        result = await self.db.execute(
            select(Staff).filter(
                Staff.staff_id == staff_id,
                Staff.school_id == school_id,
                Staff.is_deleted == False
            )
        )
        staff = result.scalar_one_or_none()
        
        if staff:
            # Cache the result
            await redis_service.set(cache_key, staff.to_dict(), expire=settings.REDIS_CACHE_TTL)
        
        return staff
    
    async def create_staff(self, staff_data: StaffCreate) -> Staff:
        """Create a new staff member"""
        # Hash the password before storing
        hashed_password = hash_password(staff_data.password)
        
        staff = Staff(
            school_id=staff_data.school_id,
            staff_profile=staff_data.staff_profile,
            staff_name=staff_data.staff_name,
            staff_dob=staff_data.staff_dob,
            staff_gender=staff_data.staff_gender,
            staff_nid_photo=staff_data.staff_nid_photo,
            staff_title=staff_data.staff_title,
            staff_role=staff_data.staff_role,
            employment_type=staff_data.employment_type,
            qualifications=staff_data.qualifications,
            experience=staff_data.experience,
            email=staff_data.email,
            phone=staff_data.phone,
            password=hashed_password,
            is_active=staff_data.is_active
        )
        
        self.db.add(staff)
        await self.db.commit()
        await self.db.refresh(staff)
        
        # Clear cache
        await self._clear_staff_cache(staff.school_id)
        
        return staff
    
    async def update_staff(self, staff_id: UUID, staff_data: StaffUpdate) -> Optional[Staff]:
        """Update a staff member"""
        # Get the staff from database directly (not from cache) to ensure it's attached to session
        result = await self.db.execute(
            select(Staff).filter(
                Staff.staff_id == staff_id,
                Staff.is_deleted == False
            )
        )
        staff = result.scalar_one_or_none()
        
        if not staff:
            return None
        
        # Update fields that are provided, but exclude school_id to prevent changing schools
        update_data = staff_data.model_dump(exclude_unset=True)
        # Remove school_id from update data to prevent changing schools
        update_data.pop('school_id', None)
        
        # Handle password hashing if password is being updated (only if provided and not empty)
        if 'password' in update_data:
            if update_data['password'] and update_data['password'].strip():
                update_data['password'] = hash_password(update_data['password'])
            else:
                # If password is empty/None, don't update it
                update_data.pop('password', None)
        
        # Log update data for debugging
        print(f"Updating staff {staff_id} with data: {update_data}")
        
        for field, value in update_data.items():
            setattr(staff, field, value)
        
        await self.db.commit()
        await self.db.refresh(staff)
        
        # Log updated staff status
        print(f"Staff {staff_id} updated. New is_active status: {staff.is_active}")
        
        # Clear cache
        await self._clear_staff_cache(staff.school_id)
        await redis_service.delete(f"staff:{staff_id}")
        await redis_service.delete(f"staff:{staff_id}:school:{staff.school_id}")
        
        return staff
    
    async def soft_delete_staff(self, staff_id: UUID) -> bool:
        """Soft delete a staff member"""
        # First get the staff to know which school cache to clear
        staff = await self.get_staff_by_id(staff_id)
        if not staff:
            return False
            
        result = await self.db.execute(
            update(Staff)
            .where(Staff.staff_id == staff_id)
            .values(is_deleted=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_staff_cache(staff.school_id)
            await redis_service.delete(f"staff:{staff_id}")
            await redis_service.delete(f"staff:{staff_id}:school:{staff.school_id}")
            return True
        
        return False
    
    async def activate_staff(self, staff_id: UUID) -> bool:
        """Activate a staff member"""
        # First get the staff to know which school cache to clear
        staff = await self.get_staff_by_id(staff_id)
        if not staff:
            return False
            
        result = await self.db.execute(
            update(Staff)
            .where(Staff.staff_id == staff_id)
            .values(is_active=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_staff_cache(staff.school_id)
            await redis_service.delete(f"staff:{staff_id}")
            await redis_service.delete(f"staff:{staff_id}:school:{staff.school_id}")
            return True
        
        return False
    
    async def deactivate_staff(self, staff_id: UUID) -> bool:
        """Deactivate a staff member"""
        # First get the staff to know which school cache to clear
        staff = await self.get_staff_by_id(staff_id)
        if not staff:
            return False
            
        result = await self.db.execute(
            update(Staff)
            .where(Staff.staff_id == staff_id)
            .values(is_active=False)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_staff_cache(staff.school_id)
            await redis_service.delete(f"staff:{staff_id}")
            await redis_service.delete(f"staff:{staff_id}:school:{staff.school_id}")
            return True
        
        return False
    
    async def get_staff_by_school(self, school_id: UUID) -> List[Staff]:
        """Get all staff members for a specific school (non-paginated, for backward compatibility)"""
        # Try to get from cache first
        cache_key = f"staff:school:{school_id}"
        cached_staff = await redis_service.get(cache_key)
        
        if cached_staff:
            return cached_staff
        
        # If not in cache, get from database
        result = await self.db.execute(
            select(Staff).filter(
                Staff.school_id == school_id,
                Staff.is_deleted == False
            )
        )
        staff = result.scalars().all()
        
        # Cache the result
        staff_data = [member.to_dict() for member in staff]
        await redis_service.set(cache_key, staff_data, expire=settings.REDIS_CACHE_TTL)
        
        return staff
    
    async def get_staff_by_school_paginated(
        self, 
        school_id: UUID, 
        page: int = 1, 
        page_size: int = 50
    ) -> Tuple[List[dict], int]:
        """Get paginated staff members for a specific school"""
        base_cache_key = f"staff:school:{school_id}"
        
        # Try to get from cache
        cached_result = await get_paginated_cache(base_cache_key, page, page_size)
        if cached_result:
            return cached_result
        
        # Build query
        base_query = select(Staff).filter(
            Staff.school_id == school_id,
            Staff.is_deleted == False
        )
        
        # Get total count
        count_query = select(sql_func.count(Staff.staff_id)).filter(
            Staff.school_id == school_id,
            Staff.is_deleted == False
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Apply pagination
        offset = (page - 1) * page_size
        paginated_query = base_query.offset(offset).limit(page_size)
        
        result = await self.db.execute(paginated_query)
        staff = result.scalars().all()
        
        # Convert to dict
        staff_data = [member.to_dict() for member in staff]
        
        # Cache the result
        await set_paginated_cache(base_cache_key, page, page_size, staff_data, total)
        
        return staff_data, total

    async def _clear_staff_cache(self, school_id: UUID = None):
        """Clear staff-related cache including paginated entries"""
        from utils.clear_cache import clear_cache_by_pattern
        
        # Clear all staff cache
        await redis_service.delete("staff:all")
        
        # Clear school-specific staff cache if school_id is provided
        if school_id:
            # Clear the base cache key
            await redis_service.delete(f"staff:school:{school_id}")
            
            # Clear all paginated cache entries for this school
            # Pattern matches: staff:school:{school_id}:page:*:size:*
            pattern = f"staff:school:{school_id}*"
            await clear_cache_by_pattern(pattern)
            
            # Also clear individual staff cache entries
            # We'll clear by pattern since we don't know all staff IDs
            await clear_cache_by_pattern(f"staff:*:school:{school_id}")
