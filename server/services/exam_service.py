from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func as sql_func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Tuple
from uuid import UUID
from models.exam import ExamMark
from models.student import Student
from models.subject import Subject
from models.class_model import Class
from models.academic_year import AcademicYear
from models.school import School
from schemas.exam_schemas import ExamMarkCreate, ExamMarkUpdate
from redis_client import redis_service
from config import settings
from utils.cache_utils import get_paginated_cache, set_paginated_cache

class ExamService:
    """Service class for Exam marks CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _clear_cache(self, school_id: UUID):
        """Clear exam marks cache including paginated entries"""
        from utils.clear_cache import clear_cache_by_pattern
        
        # Clear the base cache key
        await redis_service.delete(f"exam:school:{school_id}")
        
        # Clear all paginated cache entries for this school
        pattern = f"exam:school:{school_id}*"
        await clear_cache_by_pattern(pattern)
    
    async def get_all(
        self, 
        school_id: UUID, 
        academic_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Tuple[List[dict], int]:
        base_cache_key = f"exam:school:{school_id}"
        cache_filters = {}
        if academic_id:
            cache_filters['academic_id'] = str(academic_id)
        
        # Try to get from paginated cache
        cached_result = await get_paginated_cache(base_cache_key, page, page_size, cache_filters)
        if cached_result:
            return cached_result
        
        filters = [
            ExamMark.school_id == school_id,
            ExamMark.is_deleted == False
        ]
        
        if academic_id:
            filters.append(ExamMark.academic_id == academic_id)
        
        # Get total count
        count_query = select(sql_func.count(ExamMark.exam_mark_id)).filter(*filters)
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Build query with pagination
        query = (
            select(ExamMark)
            .filter(*filters)
            .options(
                selectinload(ExamMark.student),
                selectinload(ExamMark.subject),
                selectinload(ExamMark.class_obj),
                selectinload(ExamMark.academic_year)
            )
            .order_by(ExamMark.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(query)
        rows = result.scalars().all()
        print(f"ExamService.get_all: Found {len(rows)} exam marks for school {school_id}, page {page}, page_size {page_size}, total {total}")
        data = []
        for r in rows:
            try:
                d = r.to_dict()
                # Safely access relationships
                student_name = None
                subject_name = None
                class_name = None
                academic_name = None
                
                if hasattr(r, 'student') and r.student:
                    student_name = r.student.std_name
                if hasattr(r, 'subject') and r.subject:
                    subject_name = r.subject.subj_name
                if hasattr(r, 'class_obj') and r.class_obj:
                    class_name = r.class_obj.cls_name
                if hasattr(r, 'academic_year') and r.academic_year:
                    academic_name = r.academic_year.academic_name
                
                d.update({
                    "student_name": student_name,
                    "subject_name": subject_name,
                    "class_name": class_name,
                    "academic_name": academic_name,
                    "academic_year_name": academic_name,  # Add both for compatibility
                })
                data.append(d)
            except Exception as e:
                # Log error but continue processing other records
                print(f"Error processing exam mark {r.exam_mark_id}: {str(e)}")
                # Still add the record without relationship data
                d = r.to_dict()
                d.update({
                    "student_name": None,
                    "subject_name": None,
                    "class_name": None,
                    "academic_name": None,
                    "academic_year_name": None,  # Add both for compatibility
                })
                data.append(d)
        
        # Cache the result
        await set_paginated_cache(base_cache_key, page, page_size, data, total, cache_filters)
        return data, total
    
    async def get_by_id(self, exam_mark_id: UUID, school_id: UUID, as_dict: bool = False):
        query = (
            select(ExamMark)
            .filter(
                ExamMark.exam_mark_id == exam_mark_id,
                ExamMark.school_id == school_id,
                ExamMark.is_deleted == False
            )
            .options(
                selectinload(ExamMark.student),
                selectinload(ExamMark.subject),
                selectinload(ExamMark.class_obj),
                selectinload(ExamMark.academic_year)
            )
        )
        result = await self.db.execute(query)
        row = result.scalar_one_or_none()
        if row and as_dict:
            d = row.to_dict()
            # Safely access relationships
            student_name = None
            subject_name = None
            class_name = None
            academic_name = None
            
            if hasattr(row, 'student') and row.student:
                student_name = row.student.std_name
            if hasattr(row, 'subject') and row.subject:
                subject_name = row.subject.subj_name
            if hasattr(row, 'class_obj') and row.class_obj:
                class_name = row.class_obj.cls_name
            if hasattr(row, 'academic_year') and row.academic_year:
                academic_name = row.academic_year.academic_name
            
            d.update({
                "student_name": student_name,
                "subject_name": subject_name,
                "class_name": class_name,
                "academic_name": academic_name,
                "academic_year_name": academic_name,  # Add both for compatibility
            })
            return d
        return row
    
    async def create(self, data: ExamMarkCreate) -> ExamMark:
        # Validate FKs
        for model, field, value in [
            (School, School.school_id, data.school_id),
            (Student, Student.std_id, data.std_id),
            (Subject, Subject.subj_id, data.subj_id),
            (Class, Class.cls_id, data.cls_id),
            (AcademicYear, AcademicYear.academic_id, data.academic_id),
        ]:
            result = await self.db.execute(select(model).filter(field == value))
            if result.scalar_one_or_none() is None:
                raise ValueError(f"Related record not found for {field.key}")
        
        # Check for duplicate exam mark (same student, subject, class, academic year, term)
        dup_q = select(ExamMark).filter(
            ExamMark.school_id == data.school_id,
            ExamMark.std_id == data.std_id,
            ExamMark.subj_id == data.subj_id,
            ExamMark.cls_id == data.cls_id,
            ExamMark.academic_id == data.academic_id,
            ExamMark.term == data.term,
            ExamMark.is_deleted == False,
        )
        exists = (await self.db.execute(dup_q)).scalar_one_or_none()
        if exists:
            # Get student name for better error message
            student_res = await self.db.execute(
                select(Student).filter(Student.std_id == data.std_id)
            )
            student = student_res.scalar_one_or_none()
            student_name = student.std_name if student else "Unknown"
            raise ValueError(
                f"An exam mark already exists for {student_name} in this subject/class/academic year/term combination"
            )
        
        row = ExamMark(**data.dict())
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        await self._clear_cache(data.school_id)
        return row
    
    async def update(self, exam_mark_id: UUID, school_id: UUID, data: ExamMarkUpdate) -> Optional[ExamMark]:
        row = await self.get_by_id(exam_mark_id, school_id)
        if not row:
            return None
        update_data = data.dict(exclude_unset=True)
        
        # Check for duplicate if any key fields are being updated
        # Determine the values that will be used after update
        final_std_id = update_data.get("std_id", row.std_id)
        final_subj_id = update_data.get("subj_id", row.subj_id)
        final_cls_id = update_data.get("cls_id", row.cls_id)
        final_academic_id = update_data.get("academic_id", row.academic_id)
        final_term = update_data.get("term", row.term)

        # Check if another record exists with the same combination (excluding current record)
        dup_q = select(ExamMark).filter(
            ExamMark.school_id == school_id,
            ExamMark.std_id == final_std_id,
            ExamMark.subj_id == final_subj_id,
            ExamMark.cls_id == final_cls_id,
            ExamMark.academic_id == final_academic_id,
            ExamMark.term == final_term,
            ExamMark.exam_mark_id != exam_mark_id,  # Exclude current record
            ExamMark.is_deleted == False,
        )
        exists = (await self.db.execute(dup_q)).scalar_one_or_none()
        if exists:
            # Get student name for better error message
            student_res = await self.db.execute(
                select(Student).filter(Student.std_id == final_std_id)
            )
            student = student_res.scalar_one_or_none()
            student_name = student.std_name if student else "Unknown"
            raise ValueError(
                f"An exam mark already exists for {student_name} in this subject/class/academic year/term combination"
            )
        
        await self.db.execute(
            update(ExamMark)
            .where(ExamMark.exam_mark_id == exam_mark_id)
            .values(**update_data)
        )
        await self.db.commit()
        await self.db.refresh(row)
        await self._clear_cache(school_id)
        return row
    
    async def delete(self, exam_mark_id: UUID, school_id: UUID) -> bool:
        row = await self.get_by_id(exam_mark_id, school_id)
        if not row:
            return False
        await self.db.execute(
            update(ExamMark)
            .where(ExamMark.exam_mark_id == exam_mark_id)
            .values(is_deleted=True)
        )
        await self.db.commit()
        await self._clear_cache(school_id)
        return True

    async def publish_bulk(self, exam_mark_ids: List[UUID], school_id: UUID, is_published: bool = True) -> int:
        """Publish or unpublish multiple exam marks"""
        if not exam_mark_ids:
            return 0
        
        # Verify all marks belong to the school
        query = select(ExamMark).filter(
            ExamMark.exam_mark_id.in_(exam_mark_ids),
            ExamMark.school_id == school_id,
            ExamMark.is_deleted == False
        )
        result = await self.db.execute(query)
        rows = result.scalars().all()
        
        if len(rows) != len(exam_mark_ids):
            raise ValueError("Some exam marks were not found or do not belong to this school")
        
        # Update all marks
        await self.db.execute(
            update(ExamMark)
            .where(ExamMark.exam_mark_id.in_(exam_mark_ids))
            .values(is_published=is_published)
        )
        await self.db.commit()
        
        await self._clear_cache(school_id)
        return len(rows)
