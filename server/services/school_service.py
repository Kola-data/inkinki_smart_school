from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from models.school import School
from schemas.school_schemas import SchoolCreate, SchoolUpdate, SchoolStatusUpdate, SchoolSoftDelete
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs

class SchoolService:
    """Service class for School CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_schools(self) -> List[School]:
        """Get all schools that are not deleted"""
        # Try to get from cache first
        cache_key = "schools:all"
        cached_schools = await redis_service.get(cache_key)
        
        if cached_schools:
            # Log cache hit
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            return cached_schools
        
        # Log cache miss
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        # If not in cache, get from database
        result = await self.db.execute(
            select(School).filter(School.is_deleted == False)
        )
        schools = result.scalars().all()
        
        # Log database operation
        await logging_service.log_database_operation("SELECT", "schools", data={"count": len(schools)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "schools",
            "data": {"count": len(schools)}
        })
        
        # Cache the result
        school_data = [school.to_dict() for school in schools]
        await redis_service.set(cache_key, school_data, expire=settings.REDIS_CACHE_TTL)
        
        return schools
    
    async def get_school_by_id(self, school_id: UUID) -> Optional[School]:
        """Get a school by ID"""
        # Try to get from cache first
        cache_key = f"school:{school_id}"
        cached_school = await redis_service.get(cache_key)
        
        if cached_school:
            # Create School object from cached data
            school = School()
            for key, value in cached_school.items():
                if hasattr(school, key):
                    setattr(school, key, value)
            return school
        
        # If not in cache, get from database
        result = await self.db.execute(
            select(School).filter(
                School.school_id == school_id,
                School.is_deleted == False
            )
        )
        school = result.scalar_one_or_none()
        
        if school:
            # Cache the result
            await redis_service.set(cache_key, school.to_dict(), expire=settings.REDIS_CACHE_TTL)
        
        return school
    
    async def create_school(self, school_data: SchoolCreate) -> School:
        """Create a new school"""
        school = School(
            school_name=school_data.school_name,
            school_address=school_data.school_address,
            school_ownership=school_data.school_ownership,
            school_phone=school_data.school_phone,
            school_email=school_data.school_email,
            school_logo=school_data.school_logo
        )
        
        self.db.add(school)
        await self.db.commit()
        await self.db.refresh(school)
        
        # Clear cache
        await self._clear_schools_cache()
        
        return school
    
    async def update_school(self, school_id: UUID, school_data: SchoolUpdate) -> Optional[School]:
        """Update a school"""
        # Get the school from database directly (not from cache) to ensure it's attached to session
        result = await self.db.execute(
            select(School).filter(
                School.school_id == school_id,
                School.is_deleted == False
            )
        )
        school = result.scalar_one_or_none()
        
        if not school:
            return None
        
        # Update fields that are provided
        update_data = school_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(school, field, value)
        
        await self.db.commit()
        await self.db.refresh(school)
        
        # Clear cache
        await self._clear_schools_cache()
        await redis_service.delete(f"school:{school_id}")
        
        return school
    
    async def soft_delete_school(self, school_id: UUID) -> bool:
        """Soft delete a school"""
        result = await self.db.execute(
            update(School)
            .where(School.school_id == school_id)
            .values(is_deleted=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_schools_cache()
            await redis_service.delete(f"school:{school_id}")
            return True
        
        return False
    
    async def activate_school(self, school_id: UUID) -> bool:
        """Activate a school"""
        result = await self.db.execute(
            update(School)
            .where(School.school_id == school_id)
            .values(is_active=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_schools_cache()
            await redis_service.delete(f"school:{school_id}")
            return True
        
        return False
    
    async def deactivate_school(self, school_id: UUID) -> bool:
        """Deactivate a school"""
        result = await self.db.execute(
            update(School)
            .where(School.school_id == school_id)
            .values(is_active=False)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_schools_cache()
            await redis_service.delete(f"school:{school_id}")
            return True
        
        return False
    
    async def _clear_schools_cache(self):
        """Clear schools-related cache"""
        await redis_service.delete("schools:all")
