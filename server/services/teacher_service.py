from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, join, func as sql_func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Tuple
from uuid import UUID
from models.teacher import Teacher
from models.staff import Staff
from models.school import School
from schemas.teacher_schemas import TeacherCreate, TeacherUpdate, TeacherWithStaffResponse
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs
from utils.cache_utils import get_paginated_cache, set_paginated_cache

class TeacherService:
    """Service class for Teacher CRUD operations with joins"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_teachers(self) -> List[Teacher]:
        """Get all teachers that are not deleted"""
        # Try to get from cache first
        cache_key = "teachers:all"
        cached_teachers = await redis_service.get(cache_key)
        
        if cached_teachers:
            # Log cache hit
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            return cached_teachers
        
        # Log cache miss
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        # If not in cache, get from database
        result = await self.db.execute(
            select(Teacher).filter(Teacher.is_deleted == False)
        )
        teachers = result.scalars().all()
        
        # Log database operation
        await logging_service.log_database_operation("SELECT", "teachers", data={"count": len(teachers)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "teachers",
            "data": {"count": len(teachers)}
        })
        
        # Cache the result
        teachers_data = [teacher.to_dict() for teacher in teachers]
        await redis_service.set(cache_key, teachers_data, expire=settings.REDIS_CACHE_TTL)
        
        return teachers
    
    async def get_all_teachers_with_staff_info(self, school_id: UUID) -> List[dict]:
        """Get all teachers with staff and school information using joins for a specific school"""
        cache_key = f"teachers:school:{school_id}:with_staff"
        cached_teachers = await redis_service.get(cache_key)
        
        if cached_teachers:
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            return cached_teachers
        
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        # Join teachers with staff table for specific school (no school join)
        query = select(
            Teacher.teacher_id,
            Teacher.staff_id,
            Teacher.specialized,
            Teacher.is_active,
            Teacher.is_deleted,
            Teacher.created_at,
            Teacher.updated_at,
            Staff.staff_name,
            Staff.email,
            Staff.staff_role,
            Staff.staff_profile
        ).select_from(
            join(Teacher, Staff, Teacher.staff_id == Staff.staff_id)
        ).where(
            Staff.school_id == school_id,
            Teacher.is_deleted == False,
            Staff.is_deleted == False
        )
        
        result = await self.db.execute(query)
        teachers_data = result.fetchall()
        
        # Convert to list of dictionaries
        teachers_list = []
        for row in teachers_data:
            teacher_dict = {
                "teacher_id": str(row.teacher_id),
                "staff_id": str(row.staff_id) if row.staff_id else None,
                "specialized": row.specialized,
                "is_active": row.is_active,
                "is_deleted": row.is_deleted,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "staff_name": row.staff_name,
                "staff_email": row.email,
                "staff_role": row.staff_role,
                "staff_profile": row.staff_profile  # This should be included now
            }
            teachers_list.append(teacher_dict)
        
        # Log database operation
        await logging_service.log_database_operation("SELECT", "teachers_with_staff", data={"count": len(teachers_list), "school_id": str(school_id)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "teachers_with_staff",
            "data": {"count": len(teachers_list), "school_id": str(school_id)}
        })
        
        # Cache the result
        await redis_service.set(cache_key, teachers_list, expire=settings.REDIS_CACHE_TTL)
        
        return teachers_list
    
    async def get_all_teachers_with_staff_info_paginated(
        self, 
        school_id: UUID, 
        page: int = 1, 
        page_size: int = 50
    ) -> Tuple[List[dict], int]:
        """Get paginated teachers with staff and school information using joins for a specific school"""
        base_cache_key = f"teachers:school:{school_id}:with_staff"
        
        # Try to get from cache
        cached_result = await get_paginated_cache(base_cache_key, page, page_size)
        if cached_result:
            return cached_result
        
        # Build base query with join
        base_query = select(
            Teacher.teacher_id,
            Teacher.staff_id,
            Teacher.specialized,
            Teacher.is_active,
            Teacher.is_deleted,
            Teacher.created_at,
            Teacher.updated_at,
            Staff.staff_name,
            Staff.email,
            Staff.staff_role,
            Staff.staff_profile
        ).select_from(
            join(Teacher, Staff, Teacher.staff_id == Staff.staff_id)
        ).where(
            Staff.school_id == school_id,
            Teacher.is_deleted == False,
            Staff.is_deleted == False
        )
        
        # Get total count
        count_query = select(sql_func.count(Teacher.teacher_id)).select_from(
            join(Teacher, Staff, Teacher.staff_id == Staff.staff_id)
        ).where(
            Staff.school_id == school_id,
            Teacher.is_deleted == False,
            Staff.is_deleted == False
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Apply pagination
        offset = (page - 1) * page_size
        paginated_query = base_query.offset(offset).limit(page_size)
        
        result = await self.db.execute(paginated_query)
        teachers_data = result.fetchall()
        
        # Convert to list of dictionaries
        teachers_list = []
        for row in teachers_data:
            teacher_dict = {
                "teacher_id": str(row.teacher_id),
                "staff_id": str(row.staff_id) if row.staff_id else None,
                "specialized": row.specialized,
                "is_active": row.is_active,
                "is_deleted": row.is_deleted,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "staff_name": row.staff_name,
                "staff_email": row.email,
                "staff_role": row.staff_role,
                "staff_profile": row.staff_profile
            }
            teachers_list.append(teacher_dict)
        
        # Cache the result
        await set_paginated_cache(base_cache_key, page, page_size, teachers_list, total)
        
        return teachers_list, total
    
    async def get_teacher_by_id(self, teacher_id: UUID, school_id: UUID) -> Optional[Teacher]:
        """Get a teacher by ID for a specific school"""
        cache_key = f"teacher:{teacher_id}:school:{school_id}"
        cached_teacher = await redis_service.get(cache_key)
        
        if cached_teacher:
            # Create Teacher object from cached data
            teacher = Teacher()
            for key, value in cached_teacher.items():
                if hasattr(teacher, key):
                    setattr(teacher, key, value)
            return teacher
        
        # If not in cache, get from database with school validation
        result = await self.db.execute(
            select(Teacher)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .filter(
                Teacher.teacher_id == teacher_id,
                Staff.school_id == school_id,
                Teacher.is_deleted == False,
                Staff.is_deleted == False
            )
        )
        teacher = result.scalar_one_or_none()
        
        if teacher:
            # Cache the result
            await redis_service.set(cache_key, teacher.to_dict(), expire=settings.REDIS_CACHE_TTL)
        
        return teacher
    
    async def get_teacher_by_id_with_staff_info(self, teacher_id: UUID, school_id: UUID) -> Optional[dict]:
        """Get a teacher by ID with staff and school information using joins for a specific school"""
        cache_key = f"teacher:{teacher_id}:school:{school_id}:with_staff"
        cached_teacher = await redis_service.get(cache_key)
        
        if cached_teacher:
            return cached_teacher
        
        # Join teachers with staff table for specific school (no school join)
        query = select(
            Teacher.teacher_id,
            Teacher.staff_id,
            Teacher.specialized,
            Teacher.is_active,
            Teacher.is_deleted,
            Teacher.created_at,
            Teacher.updated_at,
            Staff.staff_name,
            Staff.email,
            Staff.staff_role,
            Staff.staff_profile
        ).select_from(
            join(Teacher, Staff, Teacher.staff_id == Staff.staff_id)
        ).where(
            Teacher.teacher_id == teacher_id,
            Staff.school_id == school_id,
            Teacher.is_deleted == False,
            Staff.is_deleted == False
        )
        
        result = await self.db.execute(query)
        row = result.fetchone()
        
        if row:
            teacher_data = {
                "teacher_id": str(row.teacher_id),
                "staff_id": str(row.staff_id) if row.staff_id else None,
                "specialized": row.specialized,
                "is_active": row.is_active,
                "is_deleted": row.is_deleted,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "staff_name": row.staff_name,
                "staff_email": row.email,
                "staff_role": row.staff_role,
                "staff_profile": row.staff_profile  # This should be included now
            }
            
            # Cache the result
            await redis_service.set(cache_key, teacher_data, expire=settings.REDIS_CACHE_TTL)
            
            return teacher_data
        
        return None
    
    
    async def create_teacher(self, teacher_data: TeacherCreate, school_id: UUID) -> Teacher:
        """Create a new teacher for a specific school"""
        # First verify that the staff belongs to the specified school
        staff_result = await self.db.execute(
            select(Staff).filter(
                Staff.staff_id == teacher_data.staff_id,
                Staff.school_id == school_id,
                Staff.is_deleted == False
            )
        )
        staff = staff_result.scalar_one_or_none()
        
        if not staff:
            raise ValueError(f"Staff member not found in school {school_id}")
        
        # Check if this staff member already has a teacher record
        existing_teacher_result = await self.db.execute(
            select(Teacher).filter(
                Teacher.staff_id == teacher_data.staff_id,
                Teacher.is_deleted == False
            )
        )
        existing_teacher = existing_teacher_result.scalar_one_or_none()
        
        if existing_teacher:
            raise ValueError(f"Staff member {teacher_data.staff_id} already has a teacher record. One staff member can only have one teacher record.")
        
        teacher = Teacher(
            staff_id=teacher_data.staff_id,
            specialized=teacher_data.specialized,
            is_active=teacher_data.is_active
        )
        
        self.db.add(teacher)
        await self.db.commit()
        await self.db.refresh(teacher)
        
        # Clear cache
        await self._clear_teacher_cache(school_id)
        
        return teacher
    
    async def check_staff_has_teacher(self, staff_id: UUID) -> bool:
        """Check if a staff member already has a teacher record"""
        result = await self.db.execute(
            select(Teacher).filter(
                Teacher.staff_id == staff_id,
                Teacher.is_deleted == False
            )
        )
        existing_teacher = result.scalar_one_or_none()
        return existing_teacher is not None
    
    async def update_teacher(self, teacher_id: UUID, teacher_data: TeacherUpdate, school_id: UUID) -> Optional[Teacher]:
        """Update a teacher for a specific school"""
        # Get the teacher from database with school validation
        result = await self.db.execute(
            select(Teacher)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .filter(
                Teacher.teacher_id == teacher_id,
                Staff.school_id == school_id,
                Teacher.is_deleted == False,
                Staff.is_deleted == False
            )
        )
        teacher = result.scalar_one_or_none()
        
        if not teacher:
            return None
        
        # Update fields that are provided
        update_data = teacher_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(teacher, field, value)
        
        await self.db.commit()
        await self.db.refresh(teacher)
        
        # Clear cache
        await self._clear_teacher_cache(school_id)
        await redis_service.delete(f"teacher:{teacher_id}:school:{school_id}")
        await redis_service.delete(f"teacher:{teacher_id}:school:{school_id}:with_staff")
        
        return teacher
    
    async def soft_delete_teacher(self, teacher_id: UUID, school_id: UUID) -> bool:
        """Soft delete a teacher for a specific school"""
        # First get the teacher to verify it belongs to the school
        teacher = await self.get_teacher_by_id(teacher_id, school_id)
        if not teacher:
            return False
            
        result = await self.db.execute(
            update(Teacher)
            .where(Teacher.teacher_id == teacher_id)
            .values(is_deleted=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_teacher_cache(school_id)
            await redis_service.delete(f"teacher:{teacher_id}:school:{school_id}")
            await redis_service.delete(f"teacher:{teacher_id}:school:{school_id}:with_staff")
            return True
        
        return False
    
    async def activate_teacher(self, teacher_id: UUID, school_id: UUID) -> bool:
        """Activate a teacher for a specific school"""
        # First get the teacher to verify it belongs to the school
        teacher = await self.get_teacher_by_id(teacher_id, school_id)
        if not teacher:
            return False
            
        result = await self.db.execute(
            update(Teacher)
            .where(Teacher.teacher_id == teacher_id)
            .values(is_active=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_teacher_cache(school_id)
            await redis_service.delete(f"teacher:{teacher_id}:school:{school_id}")
            await redis_service.delete(f"teacher:{teacher_id}:school:{school_id}:with_staff")
            return True
        
        return False
    
    async def deactivate_teacher(self, teacher_id: UUID, school_id: UUID) -> bool:
        """Deactivate a teacher for a specific school"""
        # First get the teacher to verify it belongs to the school
        teacher = await self.get_teacher_by_id(teacher_id, school_id)
        if not teacher:
            return False
            
        result = await self.db.execute(
            update(Teacher)
            .where(Teacher.teacher_id == teacher_id)
            .values(is_active=False)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_teacher_cache(school_id)
            await redis_service.delete(f"teacher:{teacher_id}:school:{school_id}")
            await redis_service.delete(f"teacher:{teacher_id}:school:{school_id}:with_staff")
            return True
        
        return False

    async def _clear_teacher_cache(self, school_id: UUID = None):
        """Clear teacher-related cache including paginated entries"""
        from utils.clear_cache import clear_cache_by_pattern
        
        await redis_service.delete("teachers:all")
        await redis_service.delete("teachers:all:with_staff")
        # Clear school-specific cache if school_id is provided
        if school_id:
            await redis_service.delete(f"teachers:school:{school_id}:with_staff")
            # Clear all paginated cache entries for this school
            pattern = f"teachers:school:{school_id}*"
            await clear_cache_by_pattern(pattern)
