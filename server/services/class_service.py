from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, join
from typing import List, Optional
from uuid import UUID
from models.class_model import Class
from models.teacher import Teacher
from models.staff import Staff
from schemas.class_schemas import ClassCreate, ClassUpdate
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs

class ClassService:
    """Service class for Class CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_classes(self, school_id: UUID) -> List[Class]:
        """Get all classes for a specific school"""
        cache_key = f"classes:school:{school_id}"
        cached_classes = await redis_service.get(cache_key)
        
        if cached_classes:
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            return cached_classes
        
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        # Get classes with manager information for the school
        result = await self.db.execute(
            select(Class)
            .join(Teacher, Class.cls_manager == Teacher.teacher_id)
            .filter(
                Teacher.staff_id.in_(
                    select(Staff.staff_id).where(Staff.school_id == school_id)
                ),
                Class.is_deleted == False,
                Teacher.is_deleted == False
            )
        )
        classes = result.scalars().all()
        
        # Log database operation
        await logging_service.log_database_operation("SELECT", "classes", data={"count": len(classes), "school_id": str(school_id)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "classes",
            "data": {"count": len(classes), "school_id": str(school_id)}
        })
        
        # Cache the result
        classes_data = [cls.to_dict() for cls in classes]
        await redis_service.set(cache_key, classes_data, expire=settings.REDIS_CACHE_TTL)
        
        return classes
    
    async def get_all_classes_with_manager_info(self, school_id: UUID) -> List[dict]:
        """Get all classes with manager information for a specific school"""
        cache_key = f"classes:school:{school_id}:with_manager"
        cached_classes = await redis_service.get(cache_key)
        
        if cached_classes:
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            return cached_classes
        
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        # Join classes with teachers and staff for school filtering
        query = select(
            Class.cls_id,
            Class.cls_name,
            Class.cls_type,
            Class.cls_manager,
            Class.is_deleted,
            Class.created_at,
            Class.updated_at,
            Staff.staff_name,
            Staff.email,
            Teacher.specialized
        ).select_from(
            join(Class, Teacher, Class.cls_manager == Teacher.teacher_id)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
        ).where(
            Staff.school_id == school_id,
            Class.is_deleted == False,
            Teacher.is_deleted == False,
            Staff.is_deleted == False
        )
        
        result = await self.db.execute(query)
        classes_data = result.fetchall()
        
        # Convert to list of dictionaries
        classes_list = []
        for row in classes_data:
            classes_list.append({
                "cls_id": str(row.cls_id),
                "cls_name": row.cls_name,
                "cls_type": row.cls_type,
                "cls_manager": str(row.cls_manager),
                "is_deleted": row.is_deleted,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "manager_name": row.staff_name,
                "manager_email": row.email,
                "manager_specialized": row.specialized
            })
        
        # Log database operation
        await logging_service.log_database_operation("SELECT", "classes_with_manager", data={"count": len(classes_list), "school_id": str(school_id)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "classes_with_manager",
            "data": {"count": len(classes_list), "school_id": str(school_id)}
        })
        
        # Cache the result
        await redis_service.set(cache_key, classes_list, expire=settings.REDIS_CACHE_TTL)
        
        return classes_list
    
    async def get_class_by_id(self, cls_id: UUID, school_id: UUID) -> Optional[Class]:
        """Get a class by ID for a specific school"""
        cache_key = f"class:{cls_id}:school:{school_id}"
        cached_class = await redis_service.get(cache_key)
        
        if cached_class:
            # Create Class object from cached data
            cls = Class()
            for key, value in cached_class.items():
                if hasattr(cls, key):
                    setattr(cls, key, value)
            return cls
        
        # Get class with school validation
        result = await self.db.execute(
            select(Class)
            .join(Teacher, Class.cls_manager == Teacher.teacher_id)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .filter(
                Class.cls_id == cls_id,
                Staff.school_id == school_id,
                Class.is_deleted == False,
                Teacher.is_deleted == False,
                Staff.is_deleted == False
            )
        )
        class_obj = result.scalar_one_or_none()
        
        if class_obj:
            # Cache the result
            await redis_service.set(cache_key, class_obj.to_dict(), expire=settings.REDIS_CACHE_TTL)
        
        return class_obj
    
    async def get_class_by_id_with_manager_info(self, cls_id: UUID, school_id: UUID) -> Optional[dict]:
        """Get a class by ID with manager information for a specific school"""
        cache_key = f"class:{cls_id}:school:{school_id}:with_manager"
        cached_class = await redis_service.get(cache_key)
        
        if cached_class:
            return cached_class
        
        # Join classes with teachers and staff for school filtering
        query = select(
            Class.cls_id,
            Class.cls_name,
            Class.cls_type,
            Class.cls_manager,
            Class.is_deleted,
            Class.created_at,
            Class.updated_at,
            Staff.staff_name,
            Staff.email,
            Teacher.specialized
        ).select_from(
            join(Class, Teacher, Class.cls_manager == Teacher.teacher_id)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
        ).where(
            Class.cls_id == cls_id,
            Staff.school_id == school_id,
            Class.is_deleted == False,
            Teacher.is_deleted == False,
            Staff.is_deleted == False
        )
        
        result = await self.db.execute(query)
        row = result.fetchone()
        
        if row:
            class_data = {
                "cls_id": str(row.cls_id),
                "cls_name": row.cls_name,
                "cls_type": row.cls_type,
                "cls_manager": str(row.cls_manager),
                "is_deleted": row.is_deleted,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "manager_name": row.staff_name,
                "manager_email": row.email,
                "manager_specialized": row.specialized
            }
            
            # Cache the result
            await redis_service.set(cache_key, class_data, expire=settings.REDIS_CACHE_TTL)
            
            return class_data
        
        return None
    
    async def create_class(self, class_data: ClassCreate, school_id: UUID) -> Class:
        """Create a new class for a specific school"""
        # First verify that the teacher belongs to the specified school
        teacher_result = await self.db.execute(
            select(Teacher)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .filter(
                Teacher.teacher_id == class_data.cls_manager,
                Staff.school_id == school_id,
                Teacher.is_deleted == False,
                Staff.is_deleted == False
            )
        )
        teacher = teacher_result.scalar_one_or_none()
        
        if not teacher:
            raise ValueError(f"Teacher not found in school {school_id}")
        
        class_obj = Class(
            cls_name=class_data.cls_name,
            cls_type=class_data.cls_type,
            cls_manager=class_data.cls_manager
        )
        
        self.db.add(class_obj)
        await self.db.commit()
        await self.db.refresh(class_obj)
        
        # Clear cache
        await self._clear_class_cache(school_id)
        
        return class_obj
    
    async def update_class(self, cls_id: UUID, class_data: ClassUpdate, school_id: UUID) -> Optional[Class]:
        """Update a class for a specific school"""
        # Get the class with school validation
        result = await self.db.execute(
            select(Class)
            .join(Teacher, Class.cls_manager == Teacher.teacher_id)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .filter(
                Class.cls_id == cls_id,
                Staff.school_id == school_id,
                Class.is_deleted == False,
                Teacher.is_deleted == False,
                Staff.is_deleted == False
            )
        )
        class_obj = result.scalar_one_or_none()
        
        if not class_obj:
            return None
        
        # If updating manager, verify the new teacher belongs to the school
        if class_data.cls_manager is not None:
            teacher_result = await self.db.execute(
                select(Teacher)
                .join(Staff, Teacher.staff_id == Staff.staff_id)
                .filter(
                    Teacher.teacher_id == class_data.cls_manager,
                    Staff.school_id == school_id,
                    Teacher.is_deleted == False,
                    Staff.is_deleted == False
                )
            )
            teacher = teacher_result.scalar_one_or_none()
            
            if not teacher:
                raise ValueError(f"Teacher not found in school {school_id}")
        
        # Update fields that are provided
        update_data = class_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(class_obj, field, value)
        
        await self.db.commit()
        await self.db.refresh(class_obj)
        
        # Clear cache
        await self._clear_class_cache(school_id)
        await redis_service.delete(f"class:{cls_id}:school:{school_id}")
        await redis_service.delete(f"class:{cls_id}:school:{school_id}:with_manager")
        
        return class_obj
    
    async def soft_delete_class(self, cls_id: UUID, school_id: UUID) -> bool:
        """Soft delete a class for a specific school"""
        # First get the class to verify it belongs to the school
        class_obj = await self.get_class_by_id(cls_id, school_id)
        if not class_obj:
            return False
            
        result = await self.db.execute(
            update(Class)
            .where(Class.cls_id == cls_id)
            .values(is_deleted=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_class_cache(school_id)
            await redis_service.delete(f"class:{cls_id}:school:{school_id}")
            await redis_service.delete(f"class:{cls_id}:school:{school_id}:with_manager")
            return True
        
        return False

    async def _clear_class_cache(self, school_id: UUID = None):
        """Clear class-related cache including paginated entries"""
        from utils.clear_cache import clear_cache_by_pattern
        
        await redis_service.delete("classes:all")
        # Clear school-specific cache if school_id is provided
        if school_id:
            await redis_service.delete(f"classes:school:{school_id}")
            await redis_service.delete(f"classes:school:{school_id}:with_manager")
            # Clear all paginated cache entries for this school
            pattern = f"classes:school:{school_id}*"
            await clear_cache_by_pattern(pattern)
