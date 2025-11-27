from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func as sql_func
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime

from models.test_mark import TestMark
from models.school import School
from models.student import Student
from models.subject import Subject
from models.class_model import Class
from models.academic_year import AcademicYear

from schemas.test_mark_schemas import (
    TestMarkCreate,
    TestMarkUpdate,
    TestMarkFilter,
    TestMarkBulkCreate,
)

from utils.cache_utils import get_paginated_cache, set_paginated_cache

from redis_client import redis_service
from config import settings


class TestMarkService:
    """Service class for TestMark CRUD operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _clear_cache(self, school_id: UUID):
        """Clear test marks cache including paginated entries"""
        from utils.clear_cache import clear_cache_by_pattern
        
        # Clear the base cache key
        await redis_service.delete(f"testmarks:school:{school_id}")
        
        # Clear all paginated cache entries for this school
        pattern = f"testmarks:school:{school_id}*"
        await clear_cache_by_pattern(pattern)
        
        # Clear other related cache patterns
        await redis_service.delete(f"testmarks:student:*")
        await redis_service.delete(f"testmarks:subject:*")
        await redis_service.delete(f"testmarks:class:*")
        await redis_service.delete(f"testmarks:academic:*")

    async def _validate_fk(self, data: TestMarkCreate | TestMarkUpdate, school_id_fallback: Optional[UUID] = None):
        payload = data.dict(exclude_unset=True)
        school_id = payload.get("school_id", school_id_fallback)

        if not school_id:
            raise ValueError("school_id is required")

        # School
        res = await self.db.execute(select(School).filter(School.school_id == school_id, School.is_deleted == False))
        if not res.scalar_one_or_none():
            raise ValueError("School not found")

        # Student in school when provided
        if payload.get("std_id") is not None:
            res = await self.db.execute(
                select(Student).filter(
                    Student.std_id == payload["std_id"],
                    Student.school_id == school_id,
                    Student.is_deleted == False,
                )
            )
            if not res.scalar_one_or_none():
                raise ValueError("Student not found in school")

        # Subject in school when provided
        if payload.get("subj_id") is not None:
            res = await self.db.execute(
                select(Subject).filter(
                    Subject.subj_id == payload["subj_id"],
                    Subject.school_id == school_id,
                    Subject.is_deleted == False,
                )
            )
            if not res.scalar_one_or_none():
                raise ValueError("Subject not found in school")

        # Class when provided (class has no school_id directly, but we accept existence)
        if payload.get("cls_id") is not None:
            res = await self.db.execute(select(Class).filter(Class.cls_id == payload["cls_id"], Class.is_deleted == False))
            if not res.scalar_one_or_none():
                raise ValueError("Class not found")

        # Academic year in school when provided
        if payload.get("academic_id") is not None:
            res = await self.db.execute(
                select(AcademicYear).filter(
                    AcademicYear.academic_id == payload["academic_id"],
                    AcademicYear.school_id == school_id,
                    AcademicYear.is_deleted == False,
                )
            )
            if not res.scalar_one_or_none():
                raise ValueError("Academic year not found in school")

    async def get_all(
        self, 
        school_id: UUID, 
        filters: Optional[TestMarkFilter] = None, 
        academic_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Tuple[List[dict], int]:
        base_cache_key = f"testmarks:school:{school_id}"
        cache_filters = {}
        if academic_id:
            cache_filters['academic_id'] = str(academic_id)
        if filters:
            cache_filters['filters'] = str(hash(str(filters.dict())))
        
        # Try to get from paginated cache
        cached_result = await get_paginated_cache(base_cache_key, page, page_size, cache_filters)
        if cached_result:
            return cached_result

        # Build base query
        query = (
            select(TestMark)
            .filter(TestMark.school_id == school_id, TestMark.is_deleted == False)
            .options(
                selectinload(TestMark.student),
                selectinload(TestMark.subject),
                selectinload(TestMark.class_obj),
                selectinload(TestMark.academic_year),
            )
        )

        # Apply academic_id filter if provided directly (takes precedence over filters.academic_id)
        if academic_id:
            query = query.filter(TestMark.academic_id == academic_id)
        elif filters and filters.academic_id:
            query = query.filter(TestMark.academic_id == filters.academic_id)

        if filters:
            if filters.std_id:
                query = query.filter(TestMark.std_id == filters.std_id)
            if filters.subj_id:
                query = query.filter(TestMark.subj_id == filters.subj_id)
            if filters.cls_id:
                query = query.filter(TestMark.cls_id == filters.cls_id)
            if filters.term:
                query = query.filter(TestMark.term == filters.term)
            if filters.status is not None:
                query = query.filter(TestMark.status == filters.status)
            if filters.is_published is not None:
                query = query.filter(TestMark.is_published == filters.is_published)

        # Get total count
        count_query = select(sql_func.count(TestMark.test_mark_id)).select_from(
            query.subquery()
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Apply pagination
        offset = (page - 1) * page_size
        paginated_query = query.offset(offset).limit(page_size)

        result = await self.db.execute(paginated_query)
        rows = result.scalars().all()

        data = []
        for row in rows:
            d = row.to_dict()
            d.update(
                {
                    "student_name": row.student.std_name if row.student else None,
                    "subject_name": row.subject.subj_name if row.subject else None,
                    "class_name": row.class_obj.cls_name if row.class_obj else None,
                    "academic_year_name": row.academic_year.academic_name if row.academic_year else None,
                }
            )
            data.append(d)

        # Cache the result
        await set_paginated_cache(base_cache_key, page, page_size, data, total, cache_filters)
        return data, total

    async def get_by_id(self, test_mark_id: UUID, school_id: UUID, as_dict: bool = False):
        query = (
            select(TestMark)
            .filter(
                TestMark.test_mark_id == test_mark_id,
                TestMark.school_id == school_id,
                TestMark.is_deleted == False,
            )
            .options(
                selectinload(TestMark.student),
                selectinload(TestMark.subject),
                selectinload(TestMark.class_obj),
                selectinload(TestMark.academic_year),
            )
        )
        result = await self.db.execute(query)
        row = result.scalar_one_or_none()
        if row and as_dict:
            d = row.to_dict()
            d.update(
                {
                    "student_name": row.student.std_name if row.student else None,
                    "subject_name": row.subject.subj_name if row.subject else None,
                    "class_name": row.class_obj.cls_name if row.class_obj else None,
                    "academic_year_name": row.academic_year.academic_name if row.academic_year else None,
                }
            )
            return d
        return row

    async def create(self, payload: TestMarkCreate) -> dict:
        await self._validate_fk(payload)

        # Optional uniqueness check per (school, student, subject, class, academic, term)
        dup_q = select(TestMark).filter(
            TestMark.school_id == payload.school_id,
            TestMark.std_id == payload.std_id,
            TestMark.subj_id == payload.subj_id,
            TestMark.cls_id == payload.cls_id,
            TestMark.academic_id == payload.academic_id,
            TestMark.term == payload.term,
            TestMark.is_deleted == False,
        )
        exists = (await self.db.execute(dup_q)).scalar_one_or_none()
        if exists:
            # Get student name for better error message
            student_res = await self.db.execute(
                select(Student).filter(Student.std_id == payload.std_id)
            )
            student = student_res.scalar_one_or_none()
            student_name = student.std_name if student else "Unknown"
            raise ValueError(
                f"A test mark already exists for {student_name} in this subject/class/academic year/term combination"
            )

        row = TestMark(**payload.dict())
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        await self._clear_cache(payload.school_id)
        return row.to_dict()

    async def create_bulk(self, payload: TestMarkBulkCreate) -> List[dict]:
        # Validate common FKs
        await self._validate_fk(
            TestMarkCreate(
                school_id=payload.school_id,
                std_id=payload.test_marks[0]["std_id"] if payload.test_marks else payload.school_id,  # temporary std just to reuse validator, will validate each below
                subj_id=payload.subj_id,
                cls_id=payload.cls_id,
                academic_id=payload.academic_id,
                term=payload.term,
                test_mark=payload.test_marks[0]["test_mark"] if payload.test_marks else 0.0,
                test_avg_mark=payload.test_marks[0].get("test_avg_mark") if payload.test_marks else None,
                status=payload.test_marks[0].get("status"),
                is_published=False,
            )
        )

        records: List[TestMark] = []
        duplicate_students = []
        
        for item in payload.test_marks:
            # Validate each student
            await self._validate_fk(
                TestMarkUpdate(
                    school_id=payload.school_id,
                    std_id=item["std_id"],
                    subj_id=payload.subj_id,
                    cls_id=payload.cls_id,
                    academic_id=payload.academic_id,
                ),
                school_id_fallback=payload.school_id,
            )

            # Check for duplicate test mark (same student, subject, class, academic year, term)
            dup_q = select(TestMark).filter(
                TestMark.school_id == payload.school_id,
                TestMark.std_id == item["std_id"],
                TestMark.subj_id == payload.subj_id,
                TestMark.cls_id == payload.cls_id,
                TestMark.academic_id == payload.academic_id,
                TestMark.term == payload.term,
                TestMark.is_deleted == False,
            )
            exists = (await self.db.execute(dup_q)).scalar_one_or_none()
            if exists:
                # Get student name for better error message
                student_res = await self.db.execute(
                    select(Student).filter(Student.std_id == item["std_id"])
                )
                student = student_res.scalar_one_or_none()
                student_name = student.std_name if student else "Unknown"
                duplicate_students.append(student_name)
                continue  # Skip this record

            rec = TestMark(
                school_id=payload.school_id,
                std_id=item["std_id"],
                subj_id=payload.subj_id,
                cls_id=payload.cls_id,
                academic_id=payload.academic_id,
                term=payload.term,
                test_mark=item["test_mark"],
                test_avg_mark=item.get("test_avg_mark"),
                status=item.get("status"),
                is_published=False,
            )
            records.append(rec)

        if duplicate_students:
            raise ValueError(
                f"Test marks already exist for the following students in this subject/class/academic year/term: {', '.join(duplicate_students)}"
            )

        if not records:
            raise ValueError("No valid test marks to create (all duplicates)")

        self.db.add_all(records)
        await self.db.commit()
        for r in records:
            await self.db.refresh(r)

        await self._clear_cache(payload.school_id)
        return [r.to_dict() for r in records]

    async def update(self, test_mark_id: UUID, school_id: UUID, payload: TestMarkUpdate):
        row = await self.get_by_id(test_mark_id, school_id)
        if not row:
            return None

        update_data = payload.dict(exclude_unset=True)

        # Validate any FK changes
        if update_data:
            await self._validate_fk(payload, school_id_fallback=school_id)

        # Check for duplicate if any key fields are being updated
        # Determine the values that will be used after update
        final_std_id = update_data.get("std_id", row.std_id)
        final_subj_id = update_data.get("subj_id", row.subj_id)
        final_cls_id = update_data.get("cls_id", row.cls_id)
        final_academic_id = update_data.get("academic_id", row.academic_id)
        final_term = update_data.get("term", row.term)

        # Check if another record exists with the same combination (excluding current record)
        dup_q = select(TestMark).filter(
            TestMark.school_id == school_id,
            TestMark.std_id == final_std_id,
            TestMark.subj_id == final_subj_id,
            TestMark.cls_id == final_cls_id,
            TestMark.academic_id == final_academic_id,
            TestMark.term == final_term,
            TestMark.test_mark_id != test_mark_id,  # Exclude current record
            TestMark.is_deleted == False,
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
                f"A test mark already exists for {student_name} in this subject/class/academic year/term combination"
            )

        await self.db.execute(
            update(TestMark).where(TestMark.test_mark_id == test_mark_id).values(**update_data)
        )
        await self.db.commit()
        await self.db.refresh(row)

        await self._clear_cache(school_id)
        # Return as dict with related fields
        result = row.to_dict()
        if row.student:
            result['student_name'] = row.student.std_name
        if row.subject:
            result['subject_name'] = row.subject.subj_name
        if row.class_obj:
            result['class_name'] = row.class_obj.cls_name
        if row.academic_year:
            result['academic_year_name'] = row.academic_year.academic_name
        return result

    async def delete(self, test_mark_id: UUID, school_id: UUID) -> bool:
        row = await self.get_by_id(test_mark_id, school_id)
        if not row:
            return False

        await self.db.execute(
            update(TestMark).where(TestMark.test_mark_id == test_mark_id).values(is_deleted=True, updated_at=datetime.utcnow())
        )
        await self.db.commit()

        await self._clear_cache(school_id)
        return True

    async def publish_bulk(self, test_mark_ids: List[UUID], school_id: UUID, is_published: bool = True) -> int:
        """Publish or unpublish multiple test marks"""
        if not test_mark_ids:
            return 0
        
        # Verify all marks belong to the school
        query = select(TestMark).filter(
            TestMark.test_mark_id.in_(test_mark_ids),
            TestMark.school_id == school_id,
            TestMark.is_deleted == False
        )
        result = await self.db.execute(query)
        rows = result.scalars().all()
        
        if len(rows) != len(test_mark_ids):
            raise ValueError("Some test marks were not found or do not belong to this school")
        
        # Update all marks
        await self.db.execute(
            update(TestMark)
            .where(TestMark.test_mark_id.in_(test_mark_ids))
            .values(is_published=is_published, updated_at=datetime.utcnow())
        )
        await self.db.commit()
        
        await self._clear_cache(school_id)
        return len(rows)

    async def summary(self, school_id: UUID, filters: Optional[TestMarkFilter] = None) -> dict:
        records = await self.get_all(school_id, filters)
        total = len(records)
        if total == 0:
            return {
                "total_records": 0,
                "average_mark": 0,
                "highest_mark": 0,
                "lowest_mark": 0,
                "published_count": 0,
                "unpublished_count": 0,
                "pass_rate": 0,
            }

        marks = [r.get("test_mark", 0) or 0 for r in records]
        avg = sum(marks) / total if total else 0
        hi = max(marks)
        lo = min(marks)
        pub = sum(1 for r in records if r.get("is_published"))
        unpub = total - pub
        pass_count = sum(1 for m in marks if m >= 50)

        return {
            "total_records": total,
            "average_mark": avg,
            "highest_mark": hi,
            "lowest_mark": lo,
            "published_count": pub,
            "unpublished_count": unpub,
            "pass_rate": (pass_count / total * 100) if total else 0,
        }
