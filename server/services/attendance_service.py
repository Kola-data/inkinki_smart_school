from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_, func as sql_func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime, date
from models.attendance import Attendance
from models.student import Student
from models.teacher import Teacher
from models.subject import Subject
from models.class_model import Class
from models.school import School
from models.staff import Staff
from schemas.attendance_schemas import AttendanceCreate, AttendanceUpdate, AttendanceBulkCreate, AttendanceFilter
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs
from utils.cache_utils import get_paginated_cache, set_paginated_cache

class AttendanceService:
    """Service class for Attendance CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _clear_attendance_cache(self, school_id: UUID):
        """Clear cache for attendance operations"""
        await redis_service.delete(f"attendance:school:{school_id}")
        await redis_service.delete(f"attendance:student:*")
        await redis_service.delete(f"attendance:teacher:*")
        await redis_service.delete(f"attendance:subject:*")
    
    async def get_all_attendance(
        self, 
        school_id: UUID, 
        filters: Optional[AttendanceFilter] = None, 
        academic_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Tuple[List[dict], int]:
        """Get paginated attendance records for a specific school with related entity details"""
        base_cache_key = f"attendance:school:{school_id}"
        cache_filters = {}
        if filters:
            cache_filters['filters'] = str(hash(str(filters.dict())))
        if academic_id:
            cache_filters['academic_id'] = str(academic_id)
        
        # Try to get from paginated cache
        cached_result = await get_paginated_cache(base_cache_key, page, page_size, cache_filters)
        if cached_result:
            return cached_result
        
        query = select(Attendance).filter(
            Attendance.school_id == school_id,
            Attendance.is_deleted == False
        ).options(
            selectinload(Attendance.school),
            selectinload(Attendance.teacher).selectinload(Teacher.staff),
            selectinload(Attendance.student),
            selectinload(Attendance.subject),
            selectinload(Attendance.class_obj)
        )
        
        # Note: Attendance doesn't have academic_id field, so we can't filter by it directly
        # If academic_id is provided, we would need to filter by date range based on academic year dates
        # For now, we'll ignore it since attendance doesn't have this field
        
        # Apply filters if provided
        if filters:
            if filters.teacher_id:
                query = query.filter(Attendance.teacher_id == filters.teacher_id)
            if filters.std_id:
                query = query.filter(Attendance.std_id == filters.std_id)
            if filters.subj_id:
                query = query.filter(Attendance.subj_id == filters.subj_id)
            if filters.date_from:
                query = query.filter(Attendance.date >= filters.date_from)
            if filters.date_to:
                query = query.filter(Attendance.date <= filters.date_to)
            if filters.status:
                query = query.filter(Attendance.status == filters.status)
        
        # Get total count
        count_query = select(sql_func.count(Attendance.att_id)).select_from(
            query.subquery()
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Apply pagination
        offset = (page - 1) * page_size
        paginated_query = query.order_by(Attendance.date.desc()).offset(offset).limit(page_size)
        
        result = await self.db.execute(paginated_query)
        attendance_records = result.scalars().all()
        
        # Convert to dict format with related entity details
        attendance_data = []
        for record in attendance_records:
            data = record.to_dict()
            data.update({
                "school_name": record.school.school_name if record.school else None,
                "teacher_name": f"{record.teacher.staff.staff_name}" if record.teacher and record.teacher.staff else None,
                "student_name": record.student.std_name if record.student else None,
                "subject_name": record.subject.subj_name if record.subject else None,
                "class_name": record.class_obj.cls_name if record.class_obj else None
            })
            attendance_data.append(data)
        
        # Cache the result
        await set_paginated_cache(base_cache_key, page, page_size, attendance_data, total, cache_filters)
        
        return attendance_data, total
    
    async def get_attendance_by_id(self, attendance_id: UUID, school_id: UUID, as_dict: bool = False):
        """Get an attendance record by ID with related entity details"""
        query = select(Attendance).filter(
            Attendance.att_id == attendance_id,
            Attendance.school_id == school_id,
            Attendance.is_deleted == False
        ).options(
            selectinload(Attendance.school),
            selectinload(Attendance.teacher).selectinload(Teacher.staff),
            selectinload(Attendance.student),
            selectinload(Attendance.subject),
            selectinload(Attendance.class_obj)
        )
        
        result = await self.db.execute(query)
        attendance = result.scalar_one_or_none()
        
        if attendance and as_dict:
            data = attendance.to_dict()
            data.update({
                "school_name": attendance.school.school_name if attendance.school else None,
                "teacher_name": f"{attendance.teacher.staff.staff_name}" if attendance.teacher and attendance.teacher.staff else None,
                "student_name": attendance.student.std_name if attendance.student else None,
                "subject_name": attendance.subject.subj_name if attendance.subject else None,
                "class_name": attendance.class_obj.cls_name if attendance.class_obj else None
            })
            return data
        
        return attendance
    
    async def get_student_attendance(self, student_id: UUID, school_id: UUID, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None):
        """Get attendance records for a specific student"""
        cache_key = f"attendance:student:{student_id}:school:{school_id}"
        if date_from or date_to:
            cache_key += f":range:{date_from}:{date_to}"
        
        cached_attendance = await redis_service.get(cache_key)
        
        if cached_attendance:
            return cached_attendance
        
        query = select(Attendance).filter(
            Attendance.std_id == student_id,
            Attendance.school_id == school_id,
            Attendance.is_deleted == False
        ).options(
            selectinload(Attendance.teacher).selectinload(Teacher.staff),
            selectinload(Attendance.subject)
        )
        
        if date_from:
            query = query.filter(Attendance.date >= date_from)
        if date_to:
            query = query.filter(Attendance.date <= date_to)
        
        result = await self.db.execute(query)
        attendance_records = result.scalars().all()
        
        attendance_data = []
        for record in attendance_records:
            data = record.to_dict()
            data.update({
                "teacher_name": f"{record.teacher.staff.staff_name}" if record.teacher and record.teacher.staff else None,
                "subject_name": record.subject.subj_name if record.subject else None
            })
            attendance_data.append(data)
        
        await redis_service.set(cache_key, attendance_data, expire=settings.REDIS_CACHE_TTL)
        
        return attendance_data
    
    async def validate_attendance_data(self, attendance_data: AttendanceCreate):
        """Validate attendance data before creation"""
        # Check if school exists
        school_result = await self.db.execute(
            select(School).filter(
                School.school_id == attendance_data.school_id,
                School.is_deleted == False
            )
        )
        if not school_result.scalar_one_or_none():
            raise ValueError(f"School not found with ID {attendance_data.school_id}")
        
        # Check if teacher exists and belongs to school
        teacher_result = await self.db.execute(
            select(Teacher).join(Teacher.staff).filter(
                Teacher.teacher_id == attendance_data.teacher_id,
                Teacher.staff.has(school_id=attendance_data.school_id),
                Teacher.is_deleted == False
            )
        )
        if not teacher_result.scalar_one_or_none():
            raise ValueError(f"Teacher not found in school with ID {attendance_data.school_id}")
        
        # Check if student exists and belongs to school
        student_result = await self.db.execute(
            select(Student).filter(
                Student.std_id == attendance_data.std_id,
                Student.school_id == attendance_data.school_id,
                Student.is_deleted == False
            )
        )
        if not student_result.scalar_one_or_none():
            raise ValueError(f"Student not found in school with ID {attendance_data.school_id}")
        
        # Check if subject exists and belongs to school
        subject_result = await self.db.execute(
            select(Subject).filter(
                Subject.subj_id == attendance_data.subj_id,
                Subject.school_id == attendance_data.school_id,
                Subject.is_deleted == False
            )
        )
        if not subject_result.scalar_one_or_none():
            raise ValueError(f"Subject not found in school with ID {attendance_data.school_id}")

        # If class provided, validate class belongs to school
        # Class doesn't have school_id directly, so we validate through Teacher -> Staff -> School
        if attendance_data.cls_id is not None:
            class_result = await self.db.execute(
                select(Class)
                .join(Teacher, Class.cls_manager == Teacher.teacher_id)
                .join(Staff, Teacher.staff_id == Staff.staff_id)
                .filter(
                    Class.cls_id == attendance_data.cls_id,
                    Staff.school_id == attendance_data.school_id,
                    Class.is_deleted == False,
                    Teacher.is_deleted == False,
                    Staff.is_deleted == False
                )
            )
            if not class_result.scalar_one_or_none():
                raise ValueError(f"Class not found in school with ID {attendance_data.school_id}")
    
    async def create_attendance(self, attendance_data: AttendanceCreate):
        """Create a new attendance record with validation"""
        await self.validate_attendance_data(attendance_data)
        
        # Check for duplicate attendance record
        existing_result = await self.db.execute(
            select(Attendance).filter(
                Attendance.school_id == attendance_data.school_id,
                Attendance.teacher_id == attendance_data.teacher_id,
                Attendance.std_id == attendance_data.std_id,
                Attendance.subj_id == attendance_data.subj_id,
                Attendance.date == attendance_data.date,
                Attendance.is_deleted == False
            )
        )
        if existing_result.scalar_one_or_none():
            raise ValueError("Attendance record already exists for this student, teacher, subject, and date")
        
        attendance = Attendance(**attendance_data.dict())
        self.db.add(attendance)
        await self.db.commit()
        await self.db.refresh(attendance)
        
        # Reload with relationships
        await self.db.refresh(attendance, ["school", "teacher", "student", "subject"])
        
        await self._clear_attendance_cache(attendance_data.school_id)
        return attendance.to_dict()
    
    async def create_bulk_attendance(self, bulk_data: AttendanceBulkCreate):
        """Create multiple attendance records for the same date, teacher, and subject"""
        # Validate teacher and subject exist
        teacher_result = await self.db.execute(
            select(Teacher).join(Teacher.staff).filter(
                Teacher.teacher_id == bulk_data.teacher_id,
                Teacher.staff.has(school_id=bulk_data.school_id),
                Teacher.is_deleted == False
            )
        )
        if not teacher_result.scalar_one_or_none():
            raise ValueError(f"Teacher not found in school with ID {bulk_data.school_id}")
        
        subject_result = await self.db.execute(
            select(Subject).filter(
                Subject.subj_id == bulk_data.subj_id,
                Subject.school_id == bulk_data.school_id,
                Subject.is_deleted == False
            )
        )
        if not subject_result.scalar_one_or_none():
            raise ValueError(f"Subject not found in school with ID {bulk_data.school_id}")
        
        # Validate all students exist
        student_ids = [record["std_id"] for record in bulk_data.attendance_records]
        students_result = await self.db.execute(
            select(Student).filter(
                Student.std_id.in_(student_ids),
                Student.school_id == bulk_data.school_id,
                Student.is_deleted == False
            )
        )
        existing_students = students_result.scalars().all()
        existing_student_ids = {str(student.std_id) for student in existing_students}
        
        for record in bulk_data.attendance_records:
            if str(record["std_id"]) not in existing_student_ids:
                raise ValueError(f"Student not found in school with ID {record['std_id']}")
        
        # Create attendance records
        attendance_records = []
        for record in bulk_data.attendance_records:
            attendance = Attendance(
                school_id=bulk_data.school_id,
                teacher_id=bulk_data.teacher_id,
                std_id=record["std_id"],
                subj_id=bulk_data.subj_id,
                date=bulk_data.date,
                status=record["status"]
            )
            attendance_records.append(attendance)
        
        self.db.add_all(attendance_records)
        await self.db.commit()
        
        for record in attendance_records:
            await self.db.refresh(record)
        
        await self._clear_attendance_cache(bulk_data.school_id)
        return [record.to_dict() for record in attendance_records]
    
    async def update_attendance(self, attendance_id: UUID, school_id: UUID, attendance_data: AttendanceUpdate) -> Optional[Attendance]:
        """Update an attendance record with validation"""
        attendance = await self.get_attendance_by_id(attendance_id, school_id)
        if not attendance:
            return None
        
        update_data = attendance_data.dict(exclude_unset=True)
        
        # Validate foreign keys if they're being updated
        if 'school_id' in update_data:
            school_result = await self.db.execute(
                select(School).filter(
                    School.school_id == update_data['school_id'],
                    School.is_deleted == False
                )
            )
            if not school_result.scalar_one_or_none():
                raise ValueError(f"School not found with ID {update_data['school_id']}")
        
        if 'teacher_id' in update_data:
            teacher_result = await self.db.execute(
                select(Teacher).join(Teacher.staff).filter(
                    Teacher.teacher_id == update_data['teacher_id'],
                    Teacher.staff.has(school_id=update_data.get('school_id', school_id)),
                    Teacher.is_deleted == False
                )
            )
            if not teacher_result.scalar_one_or_none():
                raise ValueError(f"Teacher not found in school")
        
        if 'std_id' in update_data:
            student_result = await self.db.execute(
                select(Student).filter(
                    Student.std_id == update_data['std_id'],
                    Student.school_id == update_data.get('school_id', school_id),
                    Student.is_deleted == False
                )
            )
            if not student_result.scalar_one_or_none():
                raise ValueError(f"Student not found in school")
        
        if 'subj_id' in update_data:
            subject_result = await self.db.execute(
                select(Subject).filter(
                    Subject.subj_id == update_data['subj_id'],
                    Subject.school_id == update_data.get('school_id', school_id),
                    Subject.is_deleted == False
                )
            )
            if not subject_result.scalar_one_or_none():
                raise ValueError(f"Subject not found in school")

        if 'cls_id' in update_data and update_data['cls_id'] is not None:
            # Class doesn't have school_id directly, so we validate through Teacher -> Staff -> School
            class_result = await self.db.execute(
                select(Class)
                .join(Teacher, Class.cls_manager == Teacher.teacher_id)
                .join(Staff, Teacher.staff_id == Staff.staff_id)
                .filter(
                    Class.cls_id == update_data['cls_id'],
                    Staff.school_id == update_data.get('school_id', school_id),
                    Class.is_deleted == False,
                    Teacher.is_deleted == False,
                    Staff.is_deleted == False
                )
            )
            if not class_result.scalar_one_or_none():
                raise ValueError(f"Class not found in school")
        
        await self.db.execute(
            update(Attendance)
            .where(Attendance.att_id == attendance_id)
            .values(**update_data)
        )
        await self.db.commit()
        await self.db.refresh(attendance)
        
        await self._clear_attendance_cache(school_id)
        return attendance
    
    async def delete_attendance(self, attendance_id: UUID, school_id: UUID) -> bool:
        """Soft delete an attendance record"""
        attendance = await self.get_attendance_by_id(attendance_id, school_id)
        if not attendance:
            return False
        
        await self.db.execute(
            update(Attendance)
            .where(Attendance.att_id == attendance_id)
            .values(is_deleted=True)
        )
        await self.db.commit()
        
        await self._clear_attendance_cache(school_id)
        return True
    
    async def get_attendance_summary(self, school_id: UUID, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None):
        """Get attendance summary statistics"""
        query = select(Attendance).filter(
            Attendance.school_id == school_id,
            Attendance.is_deleted == False
        )
        
        if date_from:
            query = query.filter(Attendance.date >= date_from)
        if date_to:
            query = query.filter(Attendance.date <= date_to)
        
        result = await self.db.execute(query)
        attendance_records = result.scalars().all()
        
        total_records = len(attendance_records)
        present_count = sum(1 for record in attendance_records if record.status.lower() == 'present')
        absent_count = sum(1 for record in attendance_records if record.status.lower() == 'absent')
        late_count = sum(1 for record in attendance_records if record.status.lower() == 'late')
        
        return {
            "total_records": total_records,
            "present": present_count,
            "absent": absent_count,
            "late": late_count,
            "attendance_rate": (present_count / total_records * 100) if total_records > 0 else 0
        }
