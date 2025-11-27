from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional
from uuid import UUID
from models.academic_year import AcademicYear
from schemas.academic_year_schemas import AcademicYearCreate, AcademicYearUpdate
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs

class AcademicYearService:
    """Service class for Academic Year CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_academic_years(self, school_id: UUID) -> List[AcademicYear]:
        """Get all academic years that are not deleted for a specific school"""
        # Try to get from cache first
        cache_key = f"academic_years:school:{school_id}"
        cached_years = await redis_service.get(cache_key)
        
        if cached_years:
            # Log cache hit
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            return cached_years
        
        # Log cache miss
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        # If not in cache, get from database
        result = await self.db.execute(
            select(AcademicYear).filter(
                AcademicYear.school_id == school_id,
                AcademicYear.is_deleted == False
            )
        )
        academic_years = result.scalars().all()
        
        # Log database operation
        await logging_service.log_database_operation("SELECT", "academic_years", data={"count": len(academic_years), "school_id": str(school_id)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "academic_years",
            "data": {"count": len(academic_years), "school_id": str(school_id)}
        })
        
        # Cache the result
        years_data = [year.to_dict() for year in academic_years]
        await redis_service.set(cache_key, years_data, expire=settings.REDIS_CACHE_TTL)
        
        return academic_years
    
    async def get_all_academic_years_for_school(self, school_id: UUID) -> List[dict]:
        """Get all academic years for a specific school with school information"""
        cache_key = f"academic_years:school:{school_id}:all"
        cached_years = await redis_service.get(cache_key)
        
        if cached_years:
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            return cached_years
        
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        # Get all academic years for the school
        result = await self.db.execute(
            select(AcademicYear).filter(
                AcademicYear.school_id == school_id,
                AcademicYear.is_deleted == False
            ).order_by(AcademicYear.start_date.desc())
        )
        academic_years = result.scalars().all()
        
        # Convert to list of dictionaries
        years_list = []
        for year in academic_years:
            years_list.append({
                "academic_id": str(year.academic_id),
                "school_id": str(year.school_id),
                "academic_name": year.academic_name,
                "start_date": year.start_date.isoformat() if year.start_date else None,
                "end_date": year.end_date.isoformat() if year.end_date else None,
                "is_current": year.is_current,
                "is_deleted": year.is_deleted,
                "created_at": year.created_at.isoformat() if year.created_at else None,
                "updated_at": year.updated_at.isoformat() if year.updated_at else None
            })
        
        # Log database operation
        await logging_service.log_database_operation("SELECT", "academic_years_all", data={"count": len(years_list), "school_id": str(school_id)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "academic_years_all",
            "data": {"count": len(years_list), "school_id": str(school_id)}
        })
        
        # Cache the result
        await redis_service.set(cache_key, years_list, expire=settings.REDIS_CACHE_TTL)
        
        return years_list
    
    async def get_academic_year_by_id(self, academic_id: UUID, school_id: UUID) -> Optional[AcademicYear]:
        """Get an academic year by ID for a specific school"""
        cache_key = f"academic_year:{academic_id}:school:{school_id}"
        cached_year = await redis_service.get(cache_key)
        
        if cached_year:
            # Create AcademicYear object from cached data
            year = AcademicYear()
            for key, value in cached_year.items():
                if hasattr(year, key):
                    setattr(year, key, value)
            return year
        
        # If not in cache, get from database
        result = await self.db.execute(
            select(AcademicYear).filter(
                AcademicYear.academic_id == academic_id,
                AcademicYear.school_id == school_id,
                AcademicYear.is_deleted == False
            )
        )
        academic_year = result.scalar_one_or_none()
        
        if academic_year:
            # Cache the result
            await redis_service.set(cache_key, academic_year.to_dict(), expire=settings.REDIS_CACHE_TTL)
        
        return academic_year
    
    async def get_current_academic_year(self, school_id: UUID) -> Optional[AcademicYear]:
        """Get the current academic year for a specific school"""
        cache_key = f"academic_year:current:school:{school_id}"
        cached_year = await redis_service.get(cache_key)
        
        if cached_year:
            # Create AcademicYear object from cached data
            year = AcademicYear()
            for key, value in cached_year.items():
                if hasattr(year, key):
                    setattr(year, key, value)
            return year
        
        # If not in cache, get from database
        result = await self.db.execute(
            select(AcademicYear).filter(
                AcademicYear.school_id == school_id,
                AcademicYear.is_current == True,
                AcademicYear.is_deleted == False
            )
        )
        academic_year = result.scalar_one_or_none()
        
        if academic_year:
            # Cache the result
            await redis_service.set(cache_key, academic_year.to_dict(), expire=settings.REDIS_CACHE_TTL)
        
        return academic_year
    
    async def create_academic_year(self, year_data: AcademicYearCreate, school_id: UUID) -> AcademicYear:
        """Create a new academic year for a specific school"""
        # If this is being set as current, deactivate all other current years for this school
        if year_data.is_current:
            await self._deactivate_all_current_years_for_school(school_id)
        
        academic_year = AcademicYear(
            school_id=school_id,
            academic_name=year_data.academic_name,
            start_date=year_data.start_date,
            end_date=year_data.end_date,
            is_current=year_data.is_current
        )
        
        self.db.add(academic_year)
        await self.db.commit()
        await self.db.refresh(academic_year)
        
        # Clear cache
        await self._clear_academic_year_cache(school_id)
        
        return academic_year
    
    async def update_academic_year(self, academic_id: UUID, year_data: AcademicYearUpdate, school_id: UUID) -> Optional[AcademicYear]:
        """Update an academic year for a specific school"""
        # Get the academic year from database directly
        result = await self.db.execute(
            select(AcademicYear).filter(
                AcademicYear.academic_id == academic_id,
                AcademicYear.school_id == school_id,
                AcademicYear.is_deleted == False
            )
        )
        academic_year = result.scalar_one_or_none()
        
        if not academic_year:
            return None
        
        # If this is being set as current, deactivate all other current years for this school
        update_data = year_data.model_dump(exclude_unset=True)
        if update_data.get('is_current') == True:
            await self._deactivate_all_current_years_for_school(school_id)
        
        for field, value in update_data.items():
            setattr(academic_year, field, value)
        
        await self.db.commit()
        await self.db.refresh(academic_year)
        
        # Clear cache
        await self._clear_academic_year_cache(school_id)
        await redis_service.delete(f"academic_year:{academic_id}:school:{school_id}")
        await redis_service.delete(f"academic_year:current:school:{school_id}")
        
        return academic_year
    
    async def soft_delete_academic_year(self, academic_id: UUID, school_id: UUID) -> bool:
        """Soft delete an academic year for a specific school"""
        # First get the academic year to verify it belongs to the school
        academic_year = await self.get_academic_year_by_id(academic_id, school_id)
        if not academic_year:
            return False
            
        result = await self.db.execute(
            update(AcademicYear)
            .where(AcademicYear.academic_id == academic_id)
            .values(is_deleted=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_academic_year_cache(school_id)
            await redis_service.delete(f"academic_year:{academic_id}:school:{school_id}")
            await redis_service.delete(f"academic_year:current:school:{school_id}")
            return True
        
        return False
    
    async def set_current_academic_year(self, academic_id: UUID, school_id: UUID) -> bool:
        """Set an academic year as current for a specific school (deactivates all others for that school)"""
        # First verify the academic year belongs to the school
        academic_year = await self.get_academic_year_by_id(academic_id, school_id)
        if not academic_year:
            return False
            
        # First deactivate all current years for this school
        await self._deactivate_all_current_years_for_school(school_id)
        
        # Set the specified year as current
        result = await self.db.execute(
            update(AcademicYear)
            .where(AcademicYear.academic_id == academic_id)
            .values(is_current=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_academic_year_cache(school_id)
            await redis_service.delete(f"academic_year:{academic_id}:school:{school_id}")
            await redis_service.delete(f"academic_year:current:school:{school_id}")
            return True
        
        return False
    
    async def _deactivate_all_current_years_for_school(self, school_id: UUID):
        """Deactivate all current academic years for a specific school"""
        await self.db.execute(
            update(AcademicYear)
            .where(
                AcademicYear.school_id == school_id,
                AcademicYear.is_current == True
            )
            .values(is_current=False)
        )
        await self.db.commit()
    
    async def _clear_academic_year_cache(self, school_id: UUID = None):
        """Clear academic year-related cache including paginated entries"""
        from utils.clear_cache import clear_cache_by_pattern
        
        await redis_service.delete("academic_years:all")
        await redis_service.delete("academic_year:current")
        # Clear school-specific cache if school_id is provided
        if school_id:
            await redis_service.delete(f"academic_years:school:{school_id}")
            await redis_service.delete(f"academic_years:school:{school_id}:all")
            await redis_service.delete(f"academic_year:current:school:{school_id}")
            # Clear all paginated cache entries for this school
            pattern = f"academic_years:school:{school_id}*"
            await clear_cache_by_pattern(pattern)
