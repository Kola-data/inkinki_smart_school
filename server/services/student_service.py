from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
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
        """Clear cache for student operations"""
        await redis_service.delete(f"students:school:{school_id}")
    
    async def get_all_students(self, school_id: UUID):
        """Get all students for a specific school with parent and class details"""
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
    
    async def get_student_by_id(self, student_id: UUID, school_id: UUID, as_dict: bool = False):
        """Get a student by ID with parent and class details"""
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
        result = await self.db.execute(
            select(Student).filter(
                Student.std_code == std_code,
                Student.school_id == school_id,
                Student.is_deleted == False
            )
        )
        return result.scalar_one_or_none() is not None
    
    async def create_student(self, student_data: StudentCreate):
        """Create a new student with validation"""
        # Check if std_code already exists
        if student_data.std_code:
            exists = await self.check_std_code_exists(student_data.std_code, student_data.school_id)
            if exists:
                raise ValueError(f"Student code '{student_data.std_code}' already exists in this school")
        
        # Check if parent exists in the school
        parent_result = await self.db.execute(
            select(Parent).filter(
                Parent.par_id == student_data.par_id,
                Parent.school_id == student_data.school_id,
                Parent.is_deleted == False
            )
        )
        parent = parent_result.scalar_one_or_none()
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
        
        student = Student(**student_data.dict())
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
