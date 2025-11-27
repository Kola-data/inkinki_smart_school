from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, String, func as sql_func
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from typing import List, Optional, Tuple
from uuid import UUID
import random
from models.student import Student
from models.parent import Parent
from models.class_model import Class
from schemas.student_schemas import StudentCreate, StudentUpdate
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs

class StudentService:
    """Service class for Student CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _clear_student_cache(self, school_id: UUID):
        """Clear cache for student operations including paginated entries"""
        from utils.clear_cache import clear_cache_by_pattern
        
        # Clear the base cache key
        await redis_service.delete(f"students:school:{school_id}")
        
        # Clear all paginated cache entries for this school
        pattern = f"students:school:{school_id}*"
        await clear_cache_by_pattern(pattern)
    
    async def get_all_students(self, school_id: UUID):
        """Get all students for a specific school with parent and class details"""
        # Ensure UUID is properly typed
        if isinstance(school_id, str):
            school_id = UUID(school_id)
        
        cache_key = f"students:school:{school_id}"
        cached_students = await redis_service.get(cache_key)
        
        if cached_students:
            return cached_students
        
        query = select(Student).filter(
            Student.school_id == school_id,
            Student.is_deleted == False
        ).options(
            selectinload(Student.parent),
            selectinload(Student.started_class_obj),
            selectinload(Student.current_class_obj)
        )
        
        result = await self.db.execute(query)
        students = result.scalars().all()
        
        # Convert to dict format with parent and class details
        student_data = [student.to_dict(include_parent=True, include_classes=True) for student in students]
        
        await redis_service.set(cache_key, student_data, expire=settings.REDIS_CACHE_TTL)
        
        return student_data
    
    async def get_all_students_paginated(self, school_id: UUID, page: int = 1, page_size: int = 50) -> Tuple[List[dict], int]:
        """Get paginated students for a specific school with parent and class details"""
        # Ensure UUID is properly typed
        if isinstance(school_id, str):
            school_id = UUID(school_id)
        
        cache_key = f"students:school:{school_id}:page:{page}:size:{page_size}"
        cached_data = await redis_service.get(cache_key)
        
        if cached_data and isinstance(cached_data, dict):
            return cached_data.get('items', []), cached_data.get('total', 0)
        
        # Build base query
        base_query = select(Student).filter(
            Student.school_id == school_id,
            Student.is_deleted == False
        ).options(
            selectinload(Student.parent),
            selectinload(Student.started_class_obj),
            selectinload(Student.current_class_obj)
        )
        
        # Get total count
        count_query = select(sql_func.count(Student.std_id)).filter(
            Student.school_id == school_id,
            Student.is_deleted == False
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Apply pagination
        offset = (page - 1) * page_size
        paginated_query = base_query.offset(offset).limit(page_size)
        
        result = await self.db.execute(paginated_query)
        students = result.scalars().all()
        
        # Convert to dict format
        student_data = [student.to_dict(include_parent=True, include_classes=True) for student in students]
        
        # Cache the result
        cache_data = {'items': student_data, 'total': total}
        await redis_service.set(cache_key, cache_data, expire=settings.REDIS_CACHE_TTL)
        
        return student_data, total
    
    async def get_student_by_id(self, student_id: UUID, school_id: UUID, as_dict: bool = False):
        """Get a student by ID with parent and class details"""
        # Ensure UUIDs are properly typed
        if isinstance(student_id, str):
            student_id = UUID(student_id)
        if isinstance(school_id, str):
            school_id = UUID(school_id)
        
        query = select(Student).filter(
            Student.std_id == student_id,
            Student.school_id == school_id,
            Student.is_deleted == False
        ).options(
            selectinload(Student.parent),
            selectinload(Student.started_class_obj),
            selectinload(Student.current_class_obj)
        )
        
        result = await self.db.execute(query)
        student = result.scalar_one_or_none()
        
        if student and as_dict:
            return student.to_dict(include_parent=True, include_classes=True)
        
        return student
    
    async def check_std_code_exists(self, std_code: str, school_id: UUID) -> bool:
        """Check if student code already exists in the school"""
        # Ensure UUID is properly typed as UUID object
        if isinstance(school_id, str):
            school_id = UUID(school_id)
        elif not isinstance(school_id, UUID):
            raise ValueError(f"Invalid school_id type: {type(school_id)}")
        
        # Query ALL non-deleted students and filter in Python to completely avoid UUID comparison in SQL
        # This is a workaround for persistent asyncpg UUID parameter binding issues with PostgreSQL
        # Note: This is less efficient but necessary due to asyncpg/PostgreSQL UUID type handling
        result = await self.db.execute(
            select(Student).filter(
                Student.is_deleted == False
            )
        )
        all_students = result.scalars().all()
        
        # Filter by both std_code and school_id in Python
        school_id_str = str(school_id)
        for student in all_students:
            if student.std_code == std_code and str(student.school_id) == school_id_str:
                return True
        
        return False
    
    async def generate_unique_std_code(self, school_id: UUID) -> str:
        """Generate a unique student code starting with STD- followed by 6-8 random numbers"""
        max_attempts = 100
        for _ in range(max_attempts):
            # Generate 6-8 random digits
            num_digits = random.randint(6, 8)
            random_number = random.randint(10**(num_digits-1), 10**num_digits - 1)
            std_code = f"STD-{random_number}"
            
            # Check if code already exists
            exists = await self.check_std_code_exists(std_code, school_id)
            if not exists:
                return std_code
        
        raise ValueError("Failed to generate unique student code after multiple attempts")
    
    async def create_student(self, student_data: StudentCreate):
        """Create a new student with validation"""
        # Auto-generate student code if not provided
        std_code = student_data.std_code
        if not std_code or std_code.strip() == '':
            std_code = await self.generate_unique_std_code(student_data.school_id)
        else:
            # Check if provided std_code already exists
            exists = await self.check_std_code_exists(std_code, student_data.school_id)
            if exists:
                raise ValueError(f"Student code '{std_code}' already exists in this school")
        
        # Check if parent exists in the school
        # Ensure UUIDs are properly typed - Pydantic should handle this, but ensure it
        par_id = student_data.par_id
        school_id_uuid = student_data.school_id
        
        # Convert to UUID objects if they're strings
        if isinstance(par_id, str):
            par_id = UUID(par_id)
        if isinstance(school_id_uuid, str):
            school_id_uuid = UUID(school_id_uuid)
        
        # Query by par_id first, then filter by school_id in Python to avoid UUID comparison issues
        parent_result = await self.db.execute(
            select(Parent).filter(
                Parent.par_id == par_id,
                Parent.is_deleted == False
            )
        )
        parents = parent_result.scalars().all()
        
        # Filter by school_id in Python
        school_id_str = str(school_id_uuid)
        parent = None
        for p in parents:
            if str(p.school_id) == school_id_str:
                parent = p
                break
        
        if not parent:
            raise ValueError(f"Parent not found in school with ID {student_data.school_id}")
        
        # Validate class IDs if provided
        if student_data.started_class:
            class_result = await self.db.execute(
                select(Class).filter(
                    Class.cls_id == student_data.started_class,
                    Class.is_deleted == False
                )
            )
            if not class_result.scalar_one_or_none():
                raise ValueError(f"Started class not found")
        
        if student_data.current_class:
            class_result = await self.db.execute(
                select(Class).filter(
                    Class.cls_id == student_data.current_class,
                    Class.is_deleted == False
                )
            )
            if not class_result.scalar_one_or_none():
                raise ValueError(f"Current class not found")
        
        # Convert Pydantic model to dict and ensure UUID fields are properly handled
        # Use model_dump() for Pydantic v2 or dict() for v1, ensuring Python mode (not JSON)
        try:
            # Try Pydantic v2 method first (mode='python' keeps UUID as UUID object)
            if hasattr(student_data, 'model_dump'):
                student_dict = student_data.model_dump(mode='python')
            else:
                # Pydantic v1 - dict() should keep UUIDs as UUID objects unless json_encoders is used
                student_dict = student_data.dict()
        except:
            student_dict = student_data.dict()
        
        # Set the generated student code
        student_dict['std_code'] = std_code
        
        # Ensure UUID fields are UUID objects, not strings
        # This is a safety check - Pydantic should already handle this
        uuid_fields = ['par_id', 'school_id', 'started_class', 'current_class']
        for field in uuid_fields:
            if field in student_dict and student_dict[field] is not None:
                if isinstance(student_dict[field], str):
                    student_dict[field] = UUID(student_dict[field])
                elif not isinstance(student_dict[field], UUID):
                    # If it's not a UUID and not None, log warning but try to convert
                    try:
                        student_dict[field] = UUID(str(student_dict[field]))
                    except:
                        pass  # Will fail on Student creation
        
        student = Student(**student_dict)
        self.db.add(student)
        await self.db.commit()
        await self.db.refresh(student)
        
        # Reload with relationships
        await self.db.refresh(student, ["parent", "started_class_obj", "current_class_obj"])
        
        await self._clear_student_cache(student_data.school_id)
        return student.to_dict(include_parent=True, include_classes=True)
    
    async def update_student(self, student_id: UUID, school_id: UUID, student_data: StudentUpdate) -> Optional[Student]:
        """Update a student with validation"""
        student = await self.get_student_by_id(student_id, school_id)
        if not student:
            return None
        
        update_data = student_data.dict(exclude_unset=True)
        
        # Check if new std_code conflicts with existing one
        if 'std_code' in update_data and update_data['std_code']:
            exists = await self.check_std_code_exists(update_data['std_code'], school_id)
            if exists and student.std_code != update_data['std_code']:
                raise ValueError(f"Student code '{update_data['std_code']}' already exists in this school")
        
        await self.db.execute(
            update(Student)
            .where(Student.std_id == student_id)
            .values(**update_data)
        )
        await self.db.commit()
        await self.db.refresh(student)
        
        await self._clear_student_cache(school_id)
        return student
    
    async def delete_student(self, student_id: UUID, school_id: UUID) -> bool:
        """Soft delete a student"""
        student = await self.get_student_by_id(student_id, school_id)
        if not student:
            return False
        
        await self.db.execute(
            update(Student)
            .where(Student.std_id == student_id)
            .values(is_deleted=True)
        )
        await self.db.commit()
        
        await self._clear_student_cache(school_id)
        return True
