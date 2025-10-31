from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, join
from typing import List, Optional
from uuid import UUID
from models.class_teacher import ClassTeacher
from models.class_model import Class
from models.teacher import Teacher
from models.staff import Staff
from models.subject import Subject
from schemas.class_teacher_schemas import ClassTeacherCreate, ClassTeacherUpdate
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs

class ClassTeacherService:
    """Service class for ClassTeacher CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_class_teachers(self, school_id: UUID) -> List[ClassTeacher]:
        """Get all class teacher assignments for a specific school"""
        cache_key = f"class_teachers:school:{school_id}"
        cached_assignments = await redis_service.get(cache_key)
        
        if cached_assignments:
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            return cached_assignments
        
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        # Get class teacher assignments with school filtering
        result = await self.db.execute(
            select(ClassTeacher)
            .join(Class, ClassTeacher.cls_id == Class.cls_id)
            .join(Teacher, ClassTeacher.teacher_id == Teacher.teacher_id)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .filter(
                Staff.school_id == school_id,
                ClassTeacher.is_deleted == False,
                Class.is_deleted == False,
                Teacher.is_deleted == False,
                Staff.is_deleted == False
            )
        )
        assignments = result.scalars().all()
        
        # Log database operation
        await logging_service.log_database_operation("SELECT", "class_teachers", data={"count": len(assignments), "school_id": str(school_id)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "class_teachers",
            "data": {"count": len(assignments), "school_id": str(school_id)}
        })
        
        # Cache the result
        assignments_data = [assignment.to_dict() for assignment in assignments]
        await redis_service.set(cache_key, assignments_data, expire=settings.REDIS_CACHE_TTL)
        
        return assignments
    
    async def get_all_class_teachers_with_details(self, school_id: UUID) -> List[dict]:
        """Get all class teacher assignments with detailed information for a specific school"""
        cache_key = f"class_teachers:school:{school_id}:with_details"
        cached_assignments = await redis_service.get(cache_key)
        
        if cached_assignments:
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            return cached_assignments
        
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        # Join class teachers with all related tables
        query = select(
            ClassTeacher.id,
            ClassTeacher.teacher_id,
            ClassTeacher.subj_id,
            ClassTeacher.cls_id,
            ClassTeacher.start_date,
            ClassTeacher.end_date,
            ClassTeacher.is_deleted,
            ClassTeacher.created_at,
            ClassTeacher.updated_at,
            Staff.staff_name,
            Staff.email,
            Teacher.specialized,
            Subject.subj_name,
            Class.cls_name,
            Class.cls_type
        ).select_from(
            join(ClassTeacher, Class, ClassTeacher.cls_id == Class.cls_id)
            .join(Teacher, ClassTeacher.teacher_id == Teacher.teacher_id)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .join(Subject, ClassTeacher.subj_id == Subject.subj_id)
        ).where(
            Staff.school_id == school_id,
            ClassTeacher.is_deleted == False,
            Class.is_deleted == False,
            Teacher.is_deleted == False,
            Staff.is_deleted == False,
            Subject.is_deleted == False
        )
        
        result = await self.db.execute(query)
        assignments_data = result.fetchall()
        
        # Convert to list of dictionaries
        assignments_list = []
        for row in assignments_data:
            assignments_list.append({
                "id": str(row.id),
                "teacher_id": str(row.teacher_id),
                "subj_id": str(row.subj_id),
                "cls_id": str(row.cls_id),
                "start_date": row.start_date.isoformat() if row.start_date else None,
                "end_date": row.end_date.isoformat() if row.end_date else None,
                "is_deleted": row.is_deleted,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "teacher_name": row.staff_name,
                "teacher_email": row.email,
                "teacher_specialized": row.specialized,
                "subject_name": row.subj_name,
                "class_name": row.cls_name,
                "class_type": row.cls_type
            })
        
        # Log database operation
        await logging_service.log_database_operation("SELECT", "class_teachers_with_details", data={"count": len(assignments_list), "school_id": str(school_id)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "class_teachers_with_details",
            "data": {"count": len(assignments_list), "school_id": str(school_id)}
        })
        
        # Cache the result
        await redis_service.set(cache_key, assignments_list, expire=settings.REDIS_CACHE_TTL)
        
        return assignments_list
    
    async def get_class_teacher_by_id(self, assignment_id: UUID, school_id: UUID) -> Optional[ClassTeacher]:
        """Get a class teacher assignment by ID for a specific school"""
        cache_key = f"class_teacher:{assignment_id}:school:{school_id}"
        cached_assignment = await redis_service.get(cache_key)
        
        if cached_assignment:
            # Create ClassTeacher object from cached data
            assignment = ClassTeacher()
            for key, value in cached_assignment.items():
                if hasattr(assignment, key):
                    setattr(assignment, key, value)
            return assignment
        
        # Get assignment with school validation
        result = await self.db.execute(
            select(ClassTeacher)
            .join(Class, ClassTeacher.cls_id == Class.cls_id)
            .join(Teacher, ClassTeacher.teacher_id == Teacher.teacher_id)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .filter(
                ClassTeacher.id == assignment_id,
                Staff.school_id == school_id,
                ClassTeacher.is_deleted == False,
                Class.is_deleted == False,
                Teacher.is_deleted == False,
                Staff.is_deleted == False
            )
        )
        assignment = result.scalar_one_or_none()
        
        if assignment:
            # Cache the result
            await redis_service.set(cache_key, assignment.to_dict(), expire=settings.REDIS_CACHE_TTL)
        
        return assignment
    
    async def get_class_teacher_by_id_with_details(self, assignment_id: UUID, school_id: UUID) -> Optional[dict]:
        """Get a class teacher assignment by ID with detailed information for a specific school"""
        cache_key = f"class_teacher:{assignment_id}:school:{school_id}:with_details"
        cached_assignment = await redis_service.get(cache_key)
        
        if cached_assignment:
            return cached_assignment
        
        # Join class teachers with all related tables
        query = select(
            ClassTeacher.id,
            ClassTeacher.teacher_id,
            ClassTeacher.subj_id,
            ClassTeacher.cls_id,
            ClassTeacher.start_date,
            ClassTeacher.end_date,
            ClassTeacher.is_deleted,
            ClassTeacher.created_at,
            ClassTeacher.updated_at,
            Staff.staff_name,
            Staff.email,
            Teacher.specialized,
            Subject.subj_name,
            Class.cls_name,
            Class.cls_type
        ).select_from(
            join(ClassTeacher, Class, ClassTeacher.cls_id == Class.cls_id)
            .join(Teacher, ClassTeacher.teacher_id == Teacher.teacher_id)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .join(Subject, ClassTeacher.subj_id == Subject.subj_id)
        ).where(
            ClassTeacher.id == assignment_id,
            Staff.school_id == school_id,
            ClassTeacher.is_deleted == False,
            Class.is_deleted == False,
            Teacher.is_deleted == False,
            Staff.is_deleted == False,
            Subject.is_deleted == False
        )
        
        result = await self.db.execute(query)
        row = result.fetchone()
        
        if row:
            assignment_data = {
                "id": str(row.id),
                "teacher_id": str(row.teacher_id),
                "subj_id": str(row.subj_id),
                "cls_id": str(row.cls_id),
                "start_date": row.start_date.isoformat() if row.start_date else None,
                "end_date": row.end_date.isoformat() if row.end_date else None,
                "is_deleted": row.is_deleted,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "teacher_name": row.staff_name,
                "teacher_email": row.email,
                "teacher_specialized": row.specialized,
                "subject_name": row.subj_name,
                "class_name": row.cls_name,
                "class_type": row.cls_type
            }
            
            # Cache the result
            await redis_service.set(cache_key, assignment_data, expire=settings.REDIS_CACHE_TTL)
            
            return assignment_data
        
        return None
    
    async def create_class_teacher(self, assignment_data: ClassTeacherCreate, school_id: UUID) -> ClassTeacher:
        """Create a new class teacher assignment for a specific school"""
        # Verify that the teacher belongs to the school
        teacher_result = await self.db.execute(
            select(Teacher)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .filter(
                Teacher.teacher_id == assignment_data.teacher_id,
                Staff.school_id == school_id,
                Teacher.is_deleted == False,
                Staff.is_deleted == False
            )
        )
        teacher = teacher_result.scalar_one_or_none()
        
        if not teacher:
            raise ValueError(f"Teacher not found in school {school_id}")
        
        # Verify that the class belongs to the school
        class_result = await self.db.execute(
            select(Class)
            .join(Teacher, Class.cls_manager == Teacher.teacher_id)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .filter(
                Class.cls_id == assignment_data.cls_id,
                Staff.school_id == school_id,
                Class.is_deleted == False,
                Teacher.is_deleted == False,
                Staff.is_deleted == False
            )
        )
        class_obj = class_result.scalar_one_or_none()
        
        if not class_obj:
            raise ValueError(f"Class not found in school {school_id}")
        
        # Check for existing assignment (same teacher, subject, and class)
        existing_assignment = await self.db.execute(
            select(ClassTeacher)
            .filter(
                ClassTeacher.teacher_id == assignment_data.teacher_id,
                ClassTeacher.subj_id == assignment_data.subj_id,
                ClassTeacher.cls_id == assignment_data.cls_id,
                ClassTeacher.is_deleted == False
            )
        )
        
        if existing_assignment.scalar_one_or_none():
            raise ValueError(f"Assignment already exists: Teacher {assignment_data.teacher_id} is already assigned to subject {assignment_data.subj_id} in class {assignment_data.cls_id}")
        
        # Check if subject is already assigned to another teacher in the same class
        existing_subject_assignment = await self.db.execute(
            select(ClassTeacher)
            .filter(
                ClassTeacher.subj_id == assignment_data.subj_id,
                ClassTeacher.cls_id == assignment_data.cls_id,
                ClassTeacher.teacher_id != assignment_data.teacher_id,
                ClassTeacher.is_deleted == False
            )
        )
        
        if existing_subject_assignment.scalar_one_or_none():
            raise ValueError(f"Subject {assignment_data.subj_id} is already assigned to another teacher in class {assignment_data.cls_id}")
        
        assignment = ClassTeacher(
            teacher_id=assignment_data.teacher_id,
            subj_id=assignment_data.subj_id,
            cls_id=assignment_data.cls_id,
            start_date=assignment_data.start_date,
            end_date=assignment_data.end_date
        )
        
        self.db.add(assignment)
        await self.db.commit()
        await self.db.refresh(assignment)
        
        # Clear cache
        await self._clear_class_teacher_cache(school_id)
        
        return assignment
    
    async def update_class_teacher(self, assignment_id: UUID, assignment_data: ClassTeacherUpdate, school_id: UUID) -> Optional[ClassTeacher]:
        """Update a class teacher assignment for a specific school"""
        # Get the assignment with school validation
        result = await self.db.execute(
            select(ClassTeacher)
            .join(Class, ClassTeacher.cls_id == Class.cls_id)
            .join(Teacher, ClassTeacher.teacher_id == Teacher.teacher_id)
            .join(Staff, Teacher.staff_id == Staff.staff_id)
            .filter(
                ClassTeacher.id == assignment_id,
                Staff.school_id == school_id,
                ClassTeacher.is_deleted == False,
                Class.is_deleted == False,
                Teacher.is_deleted == False,
                Staff.is_deleted == False
            )
        )
        assignment = result.scalar_one_or_none()
        
        if not assignment:
            return None
        
        # If updating teacher, verify the new teacher belongs to the school
        if assignment_data.teacher_id is not None:
            teacher_result = await self.db.execute(
                select(Teacher)
                .join(Staff, Teacher.staff_id == Staff.staff_id)
                .filter(
                    Teacher.teacher_id == assignment_data.teacher_id,
                    Staff.school_id == school_id,
                    Teacher.is_deleted == False,
                    Staff.is_deleted == False
                )
            )
            teacher = teacher_result.scalar_one_or_none()
            
            if not teacher:
                raise ValueError(f"Teacher not found in school {school_id}")
        
        # If updating class, verify the new class belongs to the school
        if assignment_data.cls_id is not None:
            class_result = await self.db.execute(
                select(Class)
                .join(Teacher, Class.cls_manager == Teacher.teacher_id)
                .join(Staff, Teacher.staff_id == Staff.staff_id)
                .filter(
                    Class.cls_id == assignment_data.cls_id,
                    Staff.school_id == school_id,
                    Class.is_deleted == False,
                    Teacher.is_deleted == False,
                    Staff.is_deleted == False
                )
            )
            class_obj = class_result.scalar_one_or_none()
            
            if not class_obj:
                raise ValueError(f"Class not found in school {school_id}")
        
        # Update fields that are provided
        update_data = assignment_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(assignment, field, value)
        
        await self.db.commit()
        await self.db.refresh(assignment)
        
        # Clear cache
        await self._clear_class_teacher_cache(school_id)
        await redis_service.delete(f"class_teacher:{assignment_id}:school:{school_id}")
        await redis_service.delete(f"class_teacher:{assignment_id}:school:{school_id}:with_details")
        
        return assignment
    
    async def soft_delete_class_teacher(self, assignment_id: UUID, school_id: UUID) -> bool:
        """Soft delete a class teacher assignment for a specific school"""
        # First get the assignment to verify it belongs to the school
        assignment = await self.get_class_teacher_by_id(assignment_id, school_id)
        if not assignment:
            return False
            
        result = await self.db.execute(
            update(ClassTeacher)
            .where(ClassTeacher.id == assignment_id)
            .values(is_deleted=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_class_teacher_cache(school_id)
            await redis_service.delete(f"class_teacher:{assignment_id}:school:{school_id}")
            await redis_service.delete(f"class_teacher:{assignment_id}:school:{school_id}:with_details")
            return True
        
        return False

    async def _clear_class_teacher_cache(self, school_id: UUID = None):
        """Clear class teacher-related cache"""
        await redis_service.delete("class_teachers:all")
        # Clear school-specific cache if school_id is provided
        if school_id:
            await redis_service.delete(f"class_teachers:school:{school_id}")
            await redis_service.delete(f"class_teachers:school:{school_id}:with_details")
