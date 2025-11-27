from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from models.assessment import AssessmentMark
from models.student import Student
from models.subject import Subject
from models.class_model import Class
from models.academic_year import AcademicYear
from models.school import School
from schemas.assessment_schemas import AssessmentMarkCreate, AssessmentMarkUpdate
from redis_client import redis_service
from config import settings

class AssessmentService:
    """Service class for Assessment (test) marks CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _clear_cache(self, school_id: UUID):
        await redis_service.delete(f"assessment:school:{school_id}")
    
    async def get_all(self, school_id: UUID):
        # Bump cache version to invalidate older entries that lacked joined fields
        cache_key = f"assessment:school:{school_id}:v2"
        cached = await redis_service.get(cache_key)
        if cached:
            return cached
        query = (
            select(AssessmentMark)
            .filter(
                AssessmentMark.school_id == school_id,
                AssessmentMark.is_deleted == False
            )
            .options(
                selectinload(AssessmentMark.student),
                selectinload(AssessmentMark.subject),
                selectinload(AssessmentMark.class_obj),
                selectinload(AssessmentMark.academic_year)
            )
        )
        result = await self.db.execute(query)
        rows = result.scalars().all()
        data = []
        for r in rows:
            d = r.to_dict()
            d.update({
                "student_name": r.student.std_name if getattr(r, 'student', None) else None,
                "subject_name": r.subject.subj_name if getattr(r, 'subject', None) else None,
                "class_name": r.class_obj.cls_name if getattr(r, 'class_obj', None) else None,
                "academic_name": r.academic_year.academic_name if getattr(r, 'academic_year', None) else None,
            })
            data.append(d)
        await redis_service.set(cache_key, data, expire=settings.REDIS_CACHE_TTL)
        return data
    
    async def get_by_id(self, ass_mark_id: UUID, school_id: UUID, as_dict: bool = False):
        # First, check if record exists at all (without filters)
        check_query = select(AssessmentMark).filter(AssessmentMark.ass_mark_id == ass_mark_id)
        check_result = await self.db.execute(check_query)
        check_row = check_result.scalar_one_or_none()
        
        if not check_row:
            print(f"DEBUG: Record with ass_mark_id {ass_mark_id} does not exist in database")
            return None
        
        # Check if it's deleted
        if check_row.is_deleted:
            print(f"DEBUG: Record {ass_mark_id} exists but is_deleted = True")
            return None
        
        # Check if school_id matches
        if str(check_row.school_id) != str(school_id):
            print(f"DEBUG: Record {ass_mark_id} exists but school_id mismatch: DB={check_row.school_id}, Requested={school_id}")
            return None
        
        # Now get with all relationships
        query = (
            select(AssessmentMark)
            .filter(
                AssessmentMark.ass_mark_id == ass_mark_id,
                AssessmentMark.school_id == school_id,
                AssessmentMark.is_deleted == False
            )
            .options(
                selectinload(AssessmentMark.student),
                selectinload(AssessmentMark.subject),
                selectinload(AssessmentMark.class_obj),
                selectinload(AssessmentMark.academic_year)
            )
        )
        result = await self.db.execute(query)
        row = result.scalar_one_or_none()
        
        if row and as_dict:
            d = row.to_dict()
            d.update({
                "student_name": row.student.std_name if getattr(row, 'student', None) else None,
                "subject_name": row.subject.subj_name if getattr(row, 'subject', None) else None,
                "class_name": row.class_obj.cls_name if getattr(row, 'class_obj', None) else None,
                "academic_name": row.academic_year.academic_name if getattr(row, 'academic_year', None) else None,
            })
            return d
        return row
    
    async def create(self, data: AssessmentMarkCreate) -> AssessmentMark:
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
        row = AssessmentMark(**data.dict())
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        await self._clear_cache(data.school_id)
        return row
    
    async def update(self, ass_mark_id: UUID, school_id: UUID, data: AssessmentMarkUpdate) -> Optional[AssessmentMark]:
        print(f"DEBUG UPDATE: ass_mark_id={ass_mark_id}, school_id={school_id}")
        print(f"DEBUG UPDATE: payload={data.dict(exclude_unset=True)}")
        
        row = await self.get_by_id(ass_mark_id, school_id)
        if not row:
            print(f"DEBUG UPDATE: Record not found by get_by_id")
            return None
        
        print(f"DEBUG UPDATE: Record found, proceeding with update")
        update_data = data.dict(exclude_unset=True)
        print(f"DEBUG UPDATE: update_data={update_data}")
        
        await self.db.execute(
            update(AssessmentMark)
            .where(AssessmentMark.ass_mark_id == ass_mark_id)
            .values(**update_data)
        )
        await self.db.commit()
        await self.db.refresh(row)
        await self._clear_cache(school_id)
        print(f"DEBUG UPDATE: Update successful")
        return row
    
    async def delete(self, ass_mark_id: UUID, school_id: UUID) -> bool:
        print(f"DEBUG DELETE: ass_mark_id={ass_mark_id}, school_id={school_id}")
        
        # First, check if record exists at all (without filters)
        check_query = select(AssessmentMark).filter(AssessmentMark.ass_mark_id == ass_mark_id)
        check_result = await self.db.execute(check_query)
        check_row = check_result.scalar_one_or_none()
        
        if not check_row:
            print(f"DEBUG DELETE: Record with ass_mark_id {ass_mark_id} does not exist in database")
            return False
        
        # Check if it's already deleted
        if check_row.is_deleted:
            print(f"DEBUG DELETE: Record {ass_mark_id} is already deleted (is_deleted = True)")
            return False
        
        # Check if school_id matches
        if str(check_row.school_id) != str(school_id):
            print(f"DEBUG DELETE: Record {ass_mark_id} exists but school_id mismatch: DB={check_row.school_id}, Requested={school_id}")
            return False
        
        print(f"DEBUG DELETE: Record found, proceeding with soft delete")
        row = await self.get_by_id(ass_mark_id, school_id)
        if not row:
            print(f"DEBUG DELETE: Record not found by get_by_id (should not happen)")
            return False
        
        await self.db.execute(
            update(AssessmentMark)
            .where(AssessmentMark.ass_mark_id == ass_mark_id)
            .values(is_deleted=True)
        )
        await self.db.commit()
        await self._clear_cache(school_id)
        print(f"DEBUG DELETE: Delete successful")
        return True
